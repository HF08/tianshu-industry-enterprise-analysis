import {sectorFor} from './sector-data.mjs';
import {calculate,sectors} from './metrics.mjs';
import {supplement} from './disclosures.mjs';
import {setTimeout as wait} from 'node:timers/promises';

const tables={
 GINCOME:{收入:'OPERATE_INCOME',营业成本:'OPERATE_COST',归母利润:'PARENT_NETPROFIT',净利润:'NETPROFIT',营业利润:'OPERATE_PROFIT',扣非归母:'DEDUCT_PARENT_NETPROFIT',税前利润:'TOTAL_PROFIT',所得税:'INCOME_TAX',利息费用:'FE_INTEREST_EXPENSE',研发费用:'RESEARCH_EXPENSE',销售费用:'SALE_EXPENSE',管理费用:'MANAGE_EXPENSE',审计意见:'OPINION_TYPE'},
 GBALANCE:{总资产:'TOTAL_ASSETS',总负债:'TOTAL_LIABILITIES',归母权益:'TOTAL_PARENT_EQUITY',净资产:'TOTAL_EQUITY',合同负债:'CONTRACT_LIAB',合同资产:'CONTRACT_ASSET',应收账款:'ACCOUNTS_RECE',应付账款:'ACCOUNTS_PAYABLE',存货:'INVENTORY',商誉:'GOODWILL',租赁负债:'LEASE_LIAB',流动资产:'TOTAL_CURRENT_ASSETS',流动负债:'TOTAL_CURRENT_LIAB'},
 GCASHFLOW:{经营净现金:'NETCASH_OPERATE',销售收现:'SALES_SERVICES',资本开支:'CONSTRUCT_LONG_ASSET',现金等价物:'END_CCE'}
};
async function get(url,ctx,label){
 ctx.progress('正在获取'+label);
 const r=await fetch(url,{signal:AbortSignal.any([ctx.signal,AbortSignal.timeout(18000)])});
 if(!r.ok){const error=Error('HTTP '+r.status);error.status=r.status;error.retryAfter=r.headers.get('retry-after');throw error;}
 const data=await r.json();
 ctx.progress('正在提取'+label+'中的字段');return data;
}
const date=s=>String(s||'').slice(0,10);
async function company(ctx){
 const code=ctx.target.match(/(?<!\d)\d{6}(?!\d)/)?.[0];
 const name=ctx.target.replace(/[（(].*$/,'').trim();
 if(!code&&!/^[\p{L}\p{N}*· -]{1,40}$/u.test(name))throw Error('请输入单一 A 股代码或准确证券简称');
 const filter=code?'(SECURITY_CODE="'+code+'")':'(SECURITY_NAME_ABBR="'+name+'")';
 await Promise.all(Object.entries(tables).map(async([table,mapping])=>{
  try{
   const reportName='RPT_F10_FINANCE_'+table;
   const query=new URLSearchParams({reportName,columns:['SECURITY_CODE','SECURITY_NAME_ABBR','REPORT_DATE','REPORT_TYPE','ORG_TYPE','NOTICE_DATE','UPDATE_DATE','CURRENCY',...Object.values(mapping)].join(','),filter,pageSize:'80',sortColumns:'REPORT_DATE',sortTypes:'-1'});
   const url='https://datacenter-web.eastmoney.com/api/data/v1/get?'+query;
   const payload=await get(url,ctx,({GINCOME:'利润表',GBALANCE:'资产负债表',GCASHFLOW:'现金流量表'})[table]);
   if(!payload.result?.data?.length)throw Error('没有匹配记录');
   for(const r of payload.result.data){
    const period=date(r.REPORT_DATE),year=Number(period.slice(0,4));
    if(year<ctx.first-3||year>ctx.last+1||!r.NOTICE_DATE||date(r.NOTICE_DATE)>ctx.cutoff||date(r.UPDATE_DATE)>ctx.cutoff||!['CNY','人民币'].includes(r.CURRENCY))continue;
    if(r.ORG_TYPE?.includes('银行'))ctx.sector='银行';
    if(r.ORG_TYPE?.includes('保险'))ctx.sector='保险';
    const annual=period.endsWith('-12-31')&&r.REPORT_TYPE==='年报';
    if(!annual && !(period.endsWith('-09-30')&&year>=ctx.last))continue;
    const sid=table+'-'+period;
    ctx.sources[sid]={publisher:'东方财富数据中心（财报转录，须核对年报）',url,table:reportName,company:r.SECURITY_NAME_ABBR,code:r.SECURITY_CODE,published:date(r.NOTICE_DATE),updated:date(r.UPDATE_DATE),period};
    for(const [field,key] of Object.entries(mapping)){
     const value=r[key];if(value===null||value===undefined||value==='')continue;
     const o={id:sid+'-'+key,year,field,value,unit:field==='审计意见'?'文本':'元',source:sid,period};
     if(annual&&year<=ctx.last)ctx.obs.push(o);else if(!annual)ctx.interim.push(o);
    }
   }
  }catch(e){ctx.issues.push(table+'：'+e.message);}
 }));
 if(!Object.keys(ctx.sources).length)return;
 const q=new URLSearchParams({reportName:'RPT_F10_FN_MAINOP',columns:'REPORT_DATE,ITEM_NAME,MAINOP_TYPE,MAIN_BUSINESS_INCOME,MAIN_BUSINESS_COST',filter:filter+'(MAINOP_TYPE="2")(REPORT_DATE>=\''+(ctx.first-1)+'-01-01\')',pageSize:'500'});
 const url='https://datacenter-web.eastmoney.com/api/data/v1/get?'+q;
 try{
  const pack=await get(url,ctx,'按产品主营构成表');
  if(pack.result?.pages>1)throw Error('产品记录超出单页容量，需补充分部披露');
  for(const r of pack.result?.data||[]){
   const period=date(r.REPORT_DATE),parent=ctx.sources['GINCOME-'+period];
   if(!period.endsWith('-12-31')||!parent||!r.ITEM_NAME)continue;
   const sid='PRODUCT-'+period;
   ctx.sources[sid]={url,period,publisher:'东方财富财报转录',table:'按产品主营构成',published:parent.published,version:'查询时现值，发布日期按对应年报'};
   for(const [field,key] of [['分部收入','MAIN_BUSINESS_INCOME'],['分部成本','MAIN_BUSINESS_COST']])
    if(Number.isFinite(r[key]))ctx.obs.push({id:sid+'-'+r.ITEM_NAME+'-'+key,field,value:r[key],unit:'元',year:+period.slice(0,4),source:sid,dimension:r.ITEM_NAME});
  }
 }catch(e){ctx.issues.push('分部表：'+e.message);}
 try{
  const urlFor=(filter,columns,pageSize)=>'https://datacenter-web.eastmoney.com/api/data/v1/get?'+new URLSearchParams({reportName:'RPT_DMSK_FN_INCOME',filter,columns,pageSize});
  const period=ctx.last+'-12-31',annual="(REPORT_DATE='"+period+"')";
  const classification=urlFor(filter+annual,'SECURITY_CODE,INDUSTRY_NAME,NOTICE_DATE','2');
  const meta=(await get(classification,ctx,'企业行业分类')).result?.data;
  if(meta?.length!==1||!meta[0].NOTICE_DATE||date(meta[0].NOTICE_DATE)>ctx.cutoff)return;
  const industry=meta[0].INDUSTRY_NAME;
  if(!industry||/["()]/.test(industry))return;
  const url=urlFor('(INDUSTRY_NAME="'+industry+'")'+annual,'SECURITY_CODE,SECURITY_NAME_ABBR,TOTAL_OPERATE_INCOME,NOTICE_DATE','500');
  const sample=(await get(url,ctx,'同业候选公司的年度营收')).result;
  if(!sample?.data||sample.pages!==1){ctx.issues.push('同业候选样本不完整');return;}
  const rows=sample.data.filter(r=>r.NOTICE_DATE&&date(r.NOTICE_DATE)<=ctx.cutoff&&Number.isFinite(r.TOTAL_OPERATE_INCOME)&&r.TOTAL_OPERATE_INCOME>0);
  if(new Set(rows.map(r=>r.SECURITY_CODE)).size!==rows.length){ctx.issues.push('同业样本存在重复代码');return;}
  ctx.sources.PEERS={url,classification,industry,table:'同分类上市公司合并营业总收入',target_code:meta[0].SECURITY_CODE,publisher:'东方财富财报转录',period,limits:'行业分类与规模相近仅供筛选，产品及地域可比性待核实'};
  ctx.obs.push({id:'PEERS-'+ctx.last,year:ctx.last,source:'PEERS',field:'同业候选',value:rows.map(r=>({code:r.SECURITY_CODE,name:r.SECURITY_NAME_ABBR,revenue:r.TOTAL_OPERATE_INCOME})),unit:'元'});
 }catch(e){ctx.issues.push('同业候选：'+e.message);}
}
async function industry(ctx){
 const sector=sectorFor(ctx.target);const label=sector==='pv'?'光伏设备':sector==='li'?'电池':ctx.target.replace(/^(中国|国内)/,'').replace(/行业$/,'');
 if(/^[\p{L}]{2,16}$/u.test(label)){
  for(let year=ctx.last;year>=ctx.first;year--){
   const filter='(INDUSTRY_NAME="'+label+'")(REPORT_DATE=\''+year+'-12-31\')';
   const query=new URLSearchParams({reportName:'RPT_DMSK_FN_INCOME',filter,columns:'SECURITY_CODE,SECURITY_NAME_ABBR,NOTICE_DATE,TOTAL_OPERATE_INCOME',pageSize:'500'});
   const url='https://datacenter-web.eastmoney.com/api/data/v1/get?'+query;
   try{
    const p=await get(url,ctx,year+' 年上市公司行业样本');
    if(!p.result?.data?.length){ctx.issues.push('行业分类“'+label+'”在 '+year+' 年未匹配到上市样本');break;}
    const all=p.result.data;
    const rows=all.filter(r=>r.NOTICE_DATE&&date(r.NOTICE_DATE)<=ctx.cutoff&&Number.isFinite(r.TOTAL_OPERATE_INCOME)&&r.TOTAL_OPERATE_INCOME>=0);
    if(p.result.pages!==1||new Set(rows.map(r=>r.SECURITY_CODE)).size!==rows.length){ctx.issues.push(year+' 上市样本分页或代码重复，跳过集中度计算');continue;}
    const total=rows.reduce((a,b)=>a+b.TOTAL_OPERATE_INCOME,0);if(!total)continue;
    const id='Ashare-'+year,dimension='A股“'+label+'”分类样本 · 合并营业总收入（含跨行业业务）';
    ctx.sources[id]={url,table:'RPT_DMSK_FN_INCOME',publisher:'东方财富财报转录',scope:dimension,period:year,count:rows.length,excluded:all.filter(r=>!rows.includes(r)).map(r=>r.SECURITY_CODE),limits:'仅含有可用非负营收及有效公告日期的样本，各年样本及分类可能变化，样本集中度不能外推全市场'};
    ctx.obs.push({id,year,field:'样本营收明细',unit:'元',dimension,source:id,value:rows.map(r=>[r.SECURITY_CODE,r.TOTAL_OPERATE_INCOME,r.SECURITY_NAME_ABBR])},
      {id:id+'-shares',year,field:'完整市场份额',unit:'%',dimension,source:id,value:rows.map(r=>100*r.TOTAL_OPERATE_INCOME/total),formula:'各样本合并营收/本样本营收总和×100',inputs:[id]});
   }catch(e){ctx.issues.push('上市样本接口：'+e.message);break;}
  }
 }
 const macro='https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_ECONOMY_PMI&columns=REPORT_DATE,MAKE_INDEX,NMAKE_INDEX&pageSize=36&sortColumns=REPORT_DATE&sortTypes=-1';
 try{
  const pack=await get(macro,ctx,'月度 PMI');
  ctx.sources.PMI={url:macro,publisher:'东方财富转录，原发布为国家统计局',table:'全国制造业PMI与非制造业商务活动指数',scope:'全国宏观背景，不代表目标行业'};
  for(const r of (pack.result?.data||[]).filter(r=>date(r.REPORT_DATE).slice(0,7)<ctx.cutoff.slice(0,7)).slice(0,12)){
   for(const [field,key] of [['全国制造业PMI','MAKE_INDEX'],['全国非制造业商务活动指数','NMAKE_INDEX']]){
    if(Number.isFinite(r[key]))ctx.interim.push({id:key+'-'+date(r.REPORT_DATE),field,period:date(r.REPORT_DATE).slice(0,7),value:r[key],unit:'指数点',source:'PMI'});
   }
  }
 }catch(e){ctx.issues.push('PMI：'+e.message);}
 if(/汽车|乘用车/.test(ctx.target)){
  const url='https://data.cpcadata.com/api/chartlist?charttype=1';
  try{
   const [block]=await get(url,ctx,'乘用车产销数据');
   ctx.sources.CPCA={url,publisher:'乘联分会',table:'总体市场，狭义乘用车月度',scope:'中国狭义乘用车整体，含各动力类型，销量为零售；单位万辆'};
   for(const year of [ctx.last,ctx.last+1]){
    for(const [field,index] of [['产量',0],['销量',2],['出口量',3]]){
     const months=new Map();
     for(const row of block.dataList){
      const m=Number.parseInt(row.month),v=row[year+'年']?.[index];
      const period=year+'-'+String(m).padStart(2,'0');
      if(m<1||m>12||!Number.isFinite(v)||period>=ctx.cutoff.slice(0,7))continue;
      months.set(m,v);ctx.interim.push({id:'CPCA-'+field+period,field,value:v,period,unit:'万辆',source:'CPCA'});
     }
     if(months.size===12)ctx.obs.push({id:'CPCA-'+field+year,year,field,value:[...months.values()].reduce((a,b)=>a+b,0),unit:'万辆',source:'CPCA',dimension:'中国狭义乘用车'});
    }
   }
  }catch(e){ctx.issues.push('乘联分会：'+e.message);}
 }
 if(/制造业/.test(ctx.target)){
  const url='https://api.worldbank.org/v2/country/CHN/indicator/NV.IND.MANF.CN?format=json&date='+(ctx.first-1)+':'+ctx.last;
  try{
   const [meta,rows]=await get(url,ctx,'制造业增加值');
   if(!meta.lastupdated||meta.lastupdated>ctx.cutoff)throw Error('该数据版本超出快照或缺少版本日期');
   ctx.sources.WDI={url,publisher:'世界银行 WDI',table:'NV.IND.MANF.CN',updated:meta.lastupdated,scope:'中国制造业整体，当年价增加值'};
   for(const r of rows)if(Number.isFinite(r.value))ctx.obs.push({id:'WDI-'+r.date,year:+r.date,field:'制造业增加值',value:r.value,unit:'元',source:'WDI'});
  }catch(e){ctx.issues.push('WDI：'+e.message);}
 }
 const hs=ctx.target.match(/HS\s*(\d{6})/i)?.[1]||(sector==='li'?'850760':null);
 if(!hs)return;
 for(let year=ctx.last;year>=ctx.first;year--){
  ctx.signal.throwIfAborted();
  const query=new URLSearchParams({period:String(year),reporterCode:'156',cmdCode:hs,flowCode:'M,X',partnerCode:'0',partner2Code:'0',customsCode:'C00',motCode:'0',maxRecords:'10'});
  const url='https://comtradeapi.un.org/public/v1/preview/C/A/HS?'+query;
  try{
   let pack;
   try{pack=await get(url,ctx,year+' 年海关进出口净重');}
   catch(e){
    if(e.status!==429)throw e;
    const seconds=e.retryAfter===null?3:Number(e.retryAfter);
    if(!Number.isFinite(seconds)||seconds>10)throw e;
    ctx.progress('海关接口限流，等待后重试 '+year+' 年数据');
    await wait(Math.max(2,seconds)*1000,null,{signal:ctx.signal});
    pack=await get(url,ctx,year+' 年海关进出口净重（重试）');
   }
   for(const r of pack.data||[]){
    if(!['M','X'].includes(r.flowCode)||String(r.cmdCode)!==hs||+r.period!==year||!Number.isFinite(r.netWgt))continue;
    const id='HS'+hs+'-'+year+'-'+r.flowCode;
    ctx.sources[id]={url,publisher:'UN Comtrade',table:'中国对世界年度贸易',hs,scope:'商品口径；不等同于行业终端需求',estimated:r.isNetWgtEstimated,published:null,version:'查询时数据库现值，历史发布日期未提供'};
    ctx.obs.push({id,year,field:r.flowCode==='M'?'进口量':'出口量',value:r.netWgt,unit:'千克（净重）',source:id,dimension:'HS'+hs});
   }
   }catch(e){ctx.issues.push('Comtrade '+year+'：'+e.message+'；更早年份未继续请求');break;}
 }
}
export async function runKernel({role,target,as_of,sector,records=[]},signal,progress=()=>{}){
 if(!['FIN','IND'].includes(role)||typeof target!=='string'||!Array.isArray(records)||records.length>12000)throw Error('内核输入无效');
 const cutoff=new Date(as_of).toISOString().slice(0,10);
 const last=Number(cutoff.slice(0,4))-1,years=Array.from({length:5},(_,i)=>last-4+i);
 const ctx={target,sector:sectors.includes(sector)?sector:'',first:years[0],last,cutoff,obs:[],sources:{},issues:[],interim:[],signal,progress};
 try{await (role==='FIN'?company:industry)(ctx);}catch(e){ctx.issues.push(e.message);}
 ctx.signal.throwIfAborted();ctx.progress('核验统计公报、行业原始报告和公司披露');
 await supplement(role,ctx);
 signal.throwIfAborted();
 progress('正在校验资料期间、单位及来源');
 for(const [i,r] of records.entries()){
  if(r.target!==target||!(role==='FIN'?['FIN','BIZ','COMP','RC']:['IND','CHAIN','DEM','RI']).includes(r.role))continue;
  if(!Number.isInteger(r.year)||r.year<ctx.first-3||r.year>last||!r.field||!r.unit||!r.source||!r.locator||!/^\d{4}-\d{2}-\d{2}$/.test(r.published)||r.published>cutoff||r.value==null){ctx.issues.push('补录第'+(i+1)+'行期间、来源或字段无效');continue;}
  if(sectors.includes(r.sector)&&!ctx.sector)ctx.sector=r.sector;
  const id='DOC-'+(i+1);
  ctx.sources[id]={publisher:r.publisher||'用户提供，待复核',url_or_document:r.source,locator:r.locator,published:r.published,scope:r.dimension||target,excerpt:r.excerpt,method:r.method};
  const factor=({'万元':1e4,'亿元':1e8})[r.unit];
  if(factor&&!Number.isFinite(r.value)){ctx.issues.push(id+'：金额必须是数值');continue;}
  ctx.obs.push({id,source:id,year:r.year,field:r.field,unit:factor?'元':r.unit,dimension:r.dimension||'',value:factor?r.value*factor:r.value});
 }
 // Only derive components if all inputs were reported. Competing values are retained for the conflict check.
 const derive=(year,field,keys,formula,fn)=>{
  const inputs=keys.map(key=>ctx.obs.filter(o=>o.year===year&&!o.dimension&&o.field===key));
  if(inputs.some(rows=>!rows.length||rows.some(o=>o.unit!=='元'||!Number.isFinite(o.value)||o.value!==rows[0].value)))return;
  const value=fn(...inputs.map(rows=>rows[0].value));
  if(Number.isFinite(value))ctx.obs.push({id:'DER-'+year+'-'+field,year,field,unit:'元',value,formula,inputs:inputs.map(rows=>rows[0].id)});
 };
 if(role==='FIN'&&!['银行','保险'].includes(ctx.sector)){
  for(let year=ctx.first-1;year<=last;year++){
   derive(year,'资本化研发投入',['研发总投入','费用化研发支出'],'当期研发投入合计－同表费用化研发支出',(total,expensed)=>total>=expensed?total-expensed:NaN);
   derive(year,'税后经营利润',['税前利润','所得税','利息费用'],'(税前利润+利息费用)*(1-所得税/税前利润)，有效税率代理',(p,t,i)=>p>0&&t>=0&&t<=p?(p+i)*(1-t/p):NaN);
   derive(year,'投入资本',['净资产','有息负债','现金等价物'],'净资产+有息负债-现金等价物',(e,d,c)=>e+d-c);
   derive(year,'息税折旧摊销前利润',['税前利润','利息费用','折旧摊销'],'税前利润+利息费用+折旧摊销',(p,i,a)=>p+i+a);
   derive(year,'经营营运资本',['应收账款','合同资产','存货','应付账款','合同负债'],'交易性经营营运资本代理：应收账款+合同资产+存货-应付账款-合同负债',(a,b,c,d,e)=>a+b+c-d-e);
  }
 }
 const output={role,target,sector:ctx.sector,years,retrieved_at:new Date().toISOString(),sources:ctx.sources,observations:ctx.obs,interim:ctx.interim,metrics:[],missing:[],conflicts:[],issues:ctx.issues};
 progress(role==='FIN'?'正在计算五年财务指标与分部趋势':'正在计算行业增速与集中度');
 for(const dimension of new Set(['',...ctx.obs.map(o=>o.dimension||'')])){
  // Within product-level calculations the only group-wide denominator inherited is consolidated revenue.
  let obs=ctx.obs;
  if(dimension&&role==='FIN')obs=obs.concat(obs.filter(o=>!o.dimension&&o.field==='收入').map(o=>({...o,dimension})));
  const part=calculate({role,sector:ctx.sector,observations:obs,years,dimension});
  output.metrics.push(...part.metrics);
  output.missing.push(...part.missing.map(m=>({...m,dimension})));
  output.conflicts.push(...part.conflicts.map(key=>({dimension,key})));
 }
 return output;
}
