export function sectorFor(target){
 const name=String(target).replace(/\s|^(中国|国内|我国)|(?:行业|产业|市场)$/g,'');
 if(/^(光伏|太阳能光伏|光伏发电|光伏设备|光伏组件|光伏制造)$/.test(name))return 'pv';
 if(/^(锂电|锂电池|锂离子电池|动力电池|动力锂电池|汽车动力电池|锂电新能源)$/.test(name))return 'li';
 return '';
}
const nea=[
 [2024,'2025-01-27','https://www.nea.gov.cn/20250221/e10f363cabe3458aaf78ba4558970054/c.html'],
 [2025,'2026-02-12','https://www.nea.gov.cn/20260212/742b8c6a078347b0b39de676c05c5d58/c.html'],
 [2026,'2026-10-30','https://www.nea.gov.cn/20261030/dd2b15f04b92441aa59f839a1a3413ba/c.html','2026-09-30']
];
const gw=(v,u)=>Number((Number(v)*(u==='亿千瓦'?100:u==='万千瓦'?.01:1)).toFixed(6));
function solar(text,year,period){
 const out=[],section='光伏发电建设和运行情况';
 const add=(field,value,unit,scope)=>out.push([year,field,value,unit,scope,section,period]);
 const start=text.indexOf('全国光伏新增');if(start<0)return out;const subsection=text.slice(start);
 const additions=subsection.match(/全国光伏新增(?:装机|并网)([\d.]+)(亿千瓦|万千瓦)/);
 if(additions)add('新增并网装机',gw(additions[1],additions[2]),'GW','中国光伏发电 · 全部');
 const newParts=subsection.split('。')[0].match(/集中式光伏(?:新增)?([\d.]+)(亿千瓦|万千瓦)，分布式光伏(?:新增)?([\d.]+)(亿千瓦|万千瓦)/);
 if(newParts)for(const [label,i] of [['集中式',1],['分布式',3]])add('新增并网装机',gw(newParts[i],newParts[i+1]),'GW','中国光伏发电 · '+label);
 const stock=subsection.match(/全国光伏发电装机容量(?:达到|达|约|为)*([\d.]+)(亿千瓦|万千瓦)/);
 if(stock)add('期末累计装机',gw(stock[1],stock[2]),'GW','中国光伏发电 · 全部');
 const generation=subsection.match(/全国光伏(?:累计)?发电量(?:达到|达|为)?([\d.]+)(万亿千瓦时|亿千瓦时)/);
 if(generation)add('发电量',Number(generation[1])*(generation[2]==='万亿千瓦时'?1000:.1),'TWh','中国光伏发电 · 全部');
 const use=subsection.match(/全国光伏发电利用率(?:达到|达|为)?([\d.]+)%/);
 if(use)add('光伏发电利用率',+use[1],'%','全国光伏消纳口径');
 return out;
}
const pvFactory='https://app.www.gov.cn/govdata/gov/202506/28/531806/article.html';
const liFactory='https://www.miit.gov.cn/gxsj/tjfx/dzxx/art/2025/art_f59c26cfa29d41e299f875c46f66aaff.html';
export async function fetchSectorDisclosures(ctx,sector,ingest){
 const sources=sector==='pv'?nea.map(([y,p,u,end])=>({y,p,u,end,publisher:'国家能源局',parse:t=>solar(t,y,end)})):[];
 if(sector==='pv')sources.push({y:2024,p:'2025-06-28',publisher:'中国政府网转载 · 制造端统计',u:pvFactory,parse:t=>{
 const m=t.match(/中国多晶硅、硅片、电池片、组件各环节产量分别达到([\d.]+)万吨、([\d.]+)GW、([\d.]+)GW、([\d.]+)GW/);
 return m?['多晶硅','硅片','电池片','组件'].map((n,i)=>[2024,'产量',+m[i+1],i?'GW':'万吨','中国光伏制造 · '+n,'制造端分环节统计']):[];
 }});
 if(sector==='li')sources.push({y:2024,p:'2025-02-27',publisher:'工业和信息化部电子信息司',u:liFactory,parse:t=>{
 const total=t.match(/锂电池总产量([\d.]+)GWh/),parts=t.match(/消费型、储能型和动力型锂电池产量分别为([\d.]+)GWh、([\d.]+)GWh、([\d.]+)GWh/);
 const rows=total?[[2024,'产量',+total[1],'GWh','中国锂离子电池全用途','行业运行情况 / 总产量']]:[];
 if(parts)['消费型','储能型','动力型'].forEach((n,i)=>rows.push([2024,'产量',+parts[i+1],'GWh','中国'+n+'锂电池','电池环节 / 分用途产量']));return rows;
 }});
 await Promise.all(sources.filter(s=>s.p<=ctx.cutoff).map(async s=>{
 try{
 ctx.progress('读取'+s.publisher+' '+s.y+'年行业公报');
 const r=await fetch(s.u,{signal:AbortSignal.any([ctx.signal,AbortSignal.timeout(14000)])});if(!r.ok)throw Error('HTTP '+r.status);
 const t=(await r.text()).replace(/<[^>]*>/g,' ').replace(/&emsp;|&nbsp;|\s+/g,' ');
 const rows=s.parse(t);if(!rows.length)throw Error('原表未匹配');
 ingest(ctx,{id:'SECTOR-'+sector+'-'+s.y+'-'+s.p,publisher:s.publisher,url:s.u,published:s.p,title:(t.match(/<title>(.*?)<\/title>/)||[])[1]||s.y+'年'+s.publisher+'行业资料',table:rows[0][5]},rows);
 }catch(e){ctx.issues.push(s.publisher+' '+s.y+'：'+e.message);}
 }));
}
