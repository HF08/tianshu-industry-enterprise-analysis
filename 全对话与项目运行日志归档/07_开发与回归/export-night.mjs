import fs from 'node:fs/promises';
const root='work/night-industry',app=root+'/天枢工作台/app/';
const template=await fs.readFile(app+'index.html','utf8');
const base=template.match(/<style>([\s\S]*?)<\/style>/)[1];
const dialogs=template.slice(template.indexOf('<dialog id="research-report"'),template.indexOf('<div class="toast"'));
const css=(await fs.readFile(app+'team.css','utf8'))+'\n'+await fs.readFile(app+'research-report.css','utf8');
const js=await fs.readFile(app+'research-report.js','utf8');
const graph=(await fs.readFile(app+'chain-map.js','utf8'))+'\n'+await fs.readFile(app+'supply-network.js','utf8');
for(const type of ['BAT','PV']){
 const s=JSON.parse(await fs.readFile('work/verified-night-'+type+'.json','utf8'));
 const data={type:s.plan.type,target:s.plan.target,scope:s.plan.scope,question:s.question,asOf:s.asOf,snapshot:s.snapshot,written:s.reportEdition,ledger:s.verifiedLedger,chainStudy:s.agentOutput.SUPPLY?.report?.chainStudy,competition:s.visuals[type==='FIN'?'COMP':'CHAIN'],graph:s.agentOutput[type==='FIN'?'COMP':'CHAIN']?.report?.chainGraph};
 const html='<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+s.plan.target+' · DeepSeek 实跑报告</title><style>'+base+css+'body{display:block;padding:20px;background:#18191b;color:#eee}#research-report{margin:auto}#report-update,#report-version{display:none}.composer-dock{padding:10px;background:#222}#reftext{white-space:pre-wrap;max-height:110px;overflow:auto;user-select:all}.send{display:none}</style><h1>'+s.plan.target+'研究报告</h1><p>DeepSeek 实跑留档。可悬停或右击文中数值。继续调查或更新资料，请启动同包工作台。</p><button id="report-toggle"><span id="report-toggle-label">打开研究报告</span></button>'+dialogs+'<div class="composer-dock"><div id="composer-attach" hidden></div><button id="offline-copy">查看已引用资料（可复制）</button><div id="reftext"></div><input hidden id="composer-input"><form hidden><button type="button" class="send"></button></form></div><script>'+graph+'\n'+js+'\nconst saved='+JSON.stringify(data).replace(/</g,'\\u003c')+';saved.rows=researchReport.catalogue(saved.ledger,saved.competition);saved.failures=[];const local={reports:[saved],phase:"done",citations:[]};researchReport.bind(()=>local,()=>{}).sync();document.getElementById("offline-copy").onclick=()=>{document.getElementById("reftext").textContent=local.citations.map(c=>c.text).join("\\n")||"请先右击报告中的数值并选择引用。"};document.getElementById("report-toggle").click();</script></html>';
 await fs.writeFile(root+'/'+s.plan.target+'-实跑报告.html',html);await fs.writeFile('outputs/'+s.plan.target+'-黑夜版研究报告.html',html);
}
