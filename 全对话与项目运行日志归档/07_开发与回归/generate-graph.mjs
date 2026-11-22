import fs from 'node:fs/promises';
globalThis.window={};
await import('../outputs/天枢工作台/app/chain-map.js');
const ind=JSON.parse(await fs.readFile('work/final-IND.json')), fin=JSON.parse(await fs.readFile('work/final-FIN.json'));
const fact=(title,row)=>{
 const id=row.inputs?.[0]||row.source,source=ind.sources[id]||fin.sources[id];
 return [title,row.value+' '+row.unit,source?.url];
};
const metric=(name,year,dimension)=>ind.metrics.find(x=>x.name===name&&x.year===year&&x.dimension.includes(dimension));
const latest=n=>ind.interim.find(x=>x.field===n);
const cab=ind.sources[latest('国内累计装车量').source].url,cat=fin.sources.CN1225002214.url;
const routes=(await fs.readFile('work/cabia.txt','utf8')).split('\f')[19];
const ternary=Number(routes.match(/三元材料\s+10\.7[^\n]*?\s(25\.8)\s/)[1]);
const mat=Number((await fs.readFile('work/catl.txt','utf8')).match(/直接材料\s+221,152,510\s+([\d.]+)%/)[1]);
const graph={industry:'中国动力锂电池产业链',dataNote:'2023–2025 年行业披露及 2026 年一季度装车数据。价值分布采用宁德时代披露的企业样本。',views:{chain:true,value:true,tech:true},
 stages:[{id:'up',name:'上游',sub:'电池材料',accent:'series-2'},{id:'mid',name:'中游',sub:'电池系统',accent:'series-3'},{id:'down',name:'下游',sub:'整车应用',accent:'series-4'}],
 supports:[{id:'std',name:'标准',target:'动力蓄电池安全验证',accent:'series-5'}],
 nodes:[
 {id:'li',name:'电池级碳酸锂',sub:'年度原料均价',group:'up',facts:[2023,2024].map(y=>fact(y+' 年均价',metric('原料价格',y,'碳酸锂'))),desc:'工信部锂电行业运行公报披露了电池级碳酸锂年度均价。',risk:'由原料均价推算电池成本还需要相同规格的单位耗料。'},
 {id:'pack',name:'动力电池系统',sub:'动力型锂电池产销',group:'mid',desc:'行业销量采用生产商统计，包含出口。企业产品毛利率见价值分布。',facts:[fact('2024 年产量',metric('产量',2024,'动力型')),fact('2024 年销量',metric('销量',2024,'含出口')),fact('2025 年销量',metric('销量',2025,'含出口'))],companies:[{name:'宁德时代',url:cat}],links:[{label:'产业创新联盟月报',url:cab}],trend:'2025 年动力电池企业销量高于 2024 年。'},
 {id:'car',name:'新能源汽车装车',sub:'国内终端应用',group:'down',facts:[fact('2025 年装车量',metric('装车量',2025,'动力电池装车')),fact('2026 Q1 装车量',latest('国内累计装车量')),fact('2026 Q1 装车 CR5',latest('装车CR5'))],links:[{label:'车型与化学体系分布',url:cab}]},
 {id:'safety',name:'动力蓄电池安全要求',group:'std',sub:'GB 38031-2025',desc:metric('标准变化',2025,'电动汽车').value,links:[{label:'标准发布页',url:ind.sources[metric('标准变化',2025,'电动汽车').inputs[0]].url}]}],
 valueView:{costTitle:'宁德时代 2025 年主营业务营业成本构成',cost:[{label:'直接材料',value:mat},{label:'其余成本（差额）',value:+(100-mat).toFixed(2)}],marginTitle:'宁德时代分产品毛利率 · 2024–2025 年两年观测区间',margins:['电池矿产资源','电池材料及回收','动力电池系统'].map(name=>{const a=fin.metrics.filter(r=>r.name==='分部毛利率'&&r.dimension===name&&r.year>=2024).map(r=>r.value);return {name,min:+Math.min(...a).toFixed(2),max:+Math.max(...a).toFixed(2)}}),insight:'两个端点取自企业年度分产品数据，仅代表该公司及所列年份。'},
 techView:{title:'2026 年一季度国内动力电池装车路线',columns:['化学体系','装车量','统计范围'],rows:[['磷酸铁锂',latest('磷酸铁锂国内装车量').value+' GWh','国内装车'],['三元材料',ternary+' GWh','国内装车']],insight:'来源为产业创新联盟 2026 年 3 月月报第 20 页，按材料类型分组。'}};
await fs.writeFile('outputs/锂电产业链图谱.html',window.chainMap.fragment(graph));
await fs.writeFile('work/lithium-graph.json',JSON.stringify(graph));
