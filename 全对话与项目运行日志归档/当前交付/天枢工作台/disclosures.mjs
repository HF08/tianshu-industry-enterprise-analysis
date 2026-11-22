import {sectorFor,fetchSectorDisclosures} from './sector-data.mjs';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';

const archive=JSON.parse(await readFile(new URL('./source-snapshot.json',import.meta.url),'utf8'));
const editions=[
 [2024,'2025-01-27','https://www.stats.gov.cn/sj/zxfb/202501/t20250127_1958485.html'],
 [2025,'2026-01-27','https://www.stats.gov.cn/sj/zxfb/202601/t20260127_1962382.html'],
 [2026,'2026-10-27','https://www.stats.gov.cn/sj/zxfbhjd/202610/t20261027_1965697.html','2026-09-30']
];
const cached=new Map();
const normalize=s=>s.replace(/\s/g,'');
const isBattery=s=>/^(中国|国内|我国)?(汽车|新能源汽车用)?动力(锂离子|锂)?电池(行业|产业|市场)?$/.test(normalize(s));
function ingest(ctx,doc,rows){
 for(const [year,field,value,unit,dimension,locator,period] of rows){
  if(doc.published>ctx.cutoff||year<ctx.first-1||(!period&&year>ctx.last)||period&&period>ctx.cutoff)continue;
  const id=[doc.id,year,field,dimension,period].filter(Boolean).join('-');
  ctx.sources[id]={...doc,locator,scope:dimension||ctx.target,period:period||String(year)};
  const entry={id,year,field,value,unit,dimension:dimension||'',source:id};
  if(period)ctx.interim.push({...entry,period});else ctx.obs.push(entry);
 }
}
async function response(url,ctx,options={}){
 const r=await fetch(url,{...options,signal:AbortSignal.any([ctx.signal,AbortSignal.timeout(14000)])});
 if(!r.ok)throw Error('HTTP '+r.status);
 return r;
}
async function nationalTable(ctx,[year,published,nbs,period]){
 if(ctx.cutoff<published||ctx.first>year)return;
 const target=normalize(ctx.target).replace(/^(中国|国内)/,'').replace(/行业$/,'');
 const name=sectorFor(ctx.target)?'电气机械和器材制造业':target;
 const clean=s=>s.replace(/<[^>]*>/g,'').replace(/&(?:nbsp|ensp|emsp);|\s/g,'');
 ctx.progress('读取国家统计局 '+(period?'2026年前三季度':year+'年度')+' 分行业统计表');
 const html=await (await response(nbs,ctx)).text();
 const table=[...html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)].map(m=>m[0]).find(t=>clean(t).includes('煤炭开采和洗选业')&&clean(t).includes('营业收入')&&clean(t).includes('利润总额'));
 if(!table)throw Error('国家统计局表3表头未匹配');
 for(const tr of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
  const cells=[...tr[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>clean(m[1]));
  if(cells[0]!==name||cells.length!==7)continue;
  const fields=['规上企业营业收入','规上企业营收同比','规上企业营业成本','规上企业成本同比','规上企业利润总额','规上企业利润同比'];
  const rows=fields.flatMap((f,i)=>/^-?\d+(\.\d+)?$/.test(cells[i+1])?[[year,f,Number(cells[i+1]),i%2?'%':'亿元','全国规上'+name,'表3 / '+name,period]]:[]);
  ingest(ctx,{id:'NBS'+year,url:nbs,publisher:'国家统计局',published,title:(period?'2026年1—9月':year+'年')+'规上工业企业分行业财务指标',limits:'按国民经济行业大类，动力电池研究仅作上位行业参照'},rows);
  break;
 }
}
async function nationalStats(ctx){
 for(const ed of editions){
  ctx.signal.throwIfAborted();
  try{await nationalTable(ctx,ed);}catch(e){ctx.issues.push('国家统计局 '+ed[0]+'：'+e.message);}
 }
}
async function pdfText(bytes,signal){
 return new Promise((resolve,reject)=>{
  const proc=spawn('pdftotext',['-enc','UTF-8','-layout','-','-'],{windowsHide:true,signal:AbortSignal.any([signal,AbortSignal.timeout(20000)])});
  let size=0;const chunks=[];
  proc.on('error',reject);proc.stderr.resume();proc.stdin.on('error',()=>{});
  proc.stdout.on('data',buf=>{size+=buf.length;if(size>12e6)proc.kill();else chunks.push(buf);});
  proc.on('close',code=>code===0?resolve(Buffer.concat(chunks).toString('utf8')):reject(Error('PDF文字层提取失败')));
  proc.stdin.end(bytes);
 });
}
async function annualReports(ctx){
 const listed=Object.values(ctx.sources).find(s=>s.code&&s.company);
 const key=listed?.code||ctx.target;
 const post=async(path,data)=>(await response('https://www.cninfo.com.cn/new/'+path,ctx,{method:'POST',body:new URLSearchParams(data)})).json();
 const stocks=await post('information/topSearch/query',{keyWord:key,maxNum:'8'});
 const stock=stocks.find(r=>r.category==='A股'&&(r.code===key||r.zwjc===key));
 if(!stock)throw Error('巨潮主体未匹配');
 const disclosures=await post('hisAnnouncement/query',{pageNum:'1',pageSize:'60',column:/^[569]/.test(stock.code)?'sse':'szse',tabName:'fulltext',stock:stock.code+','+stock.orgId,category:'category_ndbg_szsh;',seDate:ctx.first+'-01-01~'+ctx.cutoff});
 const seen=new Set();
 for(const a of disclosures.announcements||[]){
  const title=a.announcementTitle.replace(/<[^>]+>/g,''),year=Number(title.match(/(20\d\d)\s*年?年度报告/)?.[1]);
  if(!year||year<ctx.first||year>ctx.last||seen.has(year)||a.secCode!==stock.code||/摘要|英文|取消/.test(title)||!/^finalpage\/\d{4}-\d{2}-\d{2}\/\d+\.pdf$/i.test(a.adjunctUrl))continue;
  const doc={id:'CN'+a.announcementId,title,publisher:a.secName,code:stock.code,published:a.adjunctUrl.split('/')[1],url:'https://static.cninfo.com.cn/'+a.adjunctUrl};
  if(doc.published>ctx.cutoff)continue;
  seen.add(year);ctx.sources[doc.id]=doc;
  ctx.progress('读取巨潮 '+year+' 年年报客户与供应商披露');
  try{
   let rows=cached.get(doc.url);
   if(!rows){
    if(a.adjunctSize>25000)throw Error('PDF 超过 25 MB');
    const bytes=Buffer.from(await(await response(doc.url,ctx)).arrayBuffer());
    const pages=(await pdfText(bytes,ctx.signal)).split('\f');rows=[];
    for(const [i,page] of pages.entries()){
     for(const [field,pattern] of [
      ['前五客户销售额',/前五名客户合计销售金额\s*[（(](千元|万元|元)[）)]\s+([\d,]+(?:\.\d+)?)/],
      ['前五供应商采购占比',/前五名供应商合计采购金额占年度采购总额比例\s+([\d.]+)%/],
      ['前五客户销售占比（披露）',/前五名客户合计销售金额占年度销售总额比例\s+([\d.]+)%/]
     ]){
      const m=page.match(pattern);if(!m)continue;
      const amount=m.length===3,val=amount?Number(m[2].replaceAll(',',''))*({千元:1000,万元:10000,元:1}[m[1]]):Number(m[1]);
      if(Number.isFinite(val))rows.push([year,field,val,amount?'元':'%','','PDF 第'+(i+1)+'页 / '+field]);
     }
    }
    if(cached.size>=60)cached.delete(cached.keys().next().value);
    cached.set(doc.url,rows);
   }
   ingest(ctx,doc,rows);
   if(!rows.length)ctx.issues.push(year+' 年年报已定位；客户及供应商表头未匹配');
  }catch(e){ctx.issues.push(year+' 年年报原文：'+e.message);if(e.code==='ENOENT')break;}
 }
}
export async function supplement(role,ctx){
 const sector=sectorFor(ctx.target),battery=sector==='li';
 const catl=/^(?:宁德时代(?:新能源科技股份有限公司)?|300750(?:\.SZ)?)$/i.test(ctx.target)||Object.values(ctx.sources).some(s=>s.code==='300750');
 for(const {key,doc,rows} of archive){
  if(role==='FIN'?key==='300750'&&catl:key==='动力电池'&&battery)ingest(ctx,doc,rows);
 }
 if(role==='IND'&&sector)await fetchSectorDisclosures(ctx,sector,ingest);
 try{await(role==='FIN'?annualReports:nationalStats)(ctx);}catch(e){ctx.issues.push('原始披露补查：'+e.message);}
}
