import fs from 'node:fs/promises';import {runInNewContext} from 'node:vm';
const dir='work/editorial/',app=dir+'天枢工作台/',src=await fs.readFile(app+'app/research-report.js','utf8'),ctx={window:{}};
runInNewContext(src,ctx);const {catalogue,valid}=ctx.window.researchReport;
const instructions=await fs.readFile(app+'report-writing.md','utf8');
await Promise.all((await fs.readdir(dir)).filter(x=>x.endsWith('-实跑报告.html')).map(async file=>{
 let h=await fs.readFile(dir+file,'utf8');const a=h.indexOf('const saved=')+12,b=h.indexOf(';saved.rows=',a);
 const r=JSON.parse(h.slice(a,b));const rows=catalogue(r.ledger,r.competition);
 const observations=new Map([...r.ledger.observations,...r.ledger.interim].map(o=>[o.id,o]));
 const input={question:r.question,scope:r.scope,catalogue:rows.map(({id,name,value,year,unit,dimension,inputs})=>({id,name,value,year,unit,dimension,sources:inputs.map(i=>observations.get(i)?.source).filter(Boolean)})),candidate_findings:r.written,sources:Object.fromEntries(Object.entries(r.ledger.sources).map(([i,s])=>[i,[s.publisher,s.title||s.table,s.locator].filter(Boolean)]))};
 let w;for(let i=0;i<3;i++){
 const response=await fetch('https://api.deepseek.com/responses',{method:'POST',headers:{Authorization:'Bearer '+process.env.TIANSHU_TEST_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({model:'deepseek-flash',store:false,reasoning:{effort:'low'},instructions,input:JSON.stringify(input)}),signal:AbortSignal.timeout(180000)});if(!response.ok)throw Error('HTTP '+response.status);
 const data=await response.json(),text=data.output.flatMap(x=>x.content||[]).filter(c=>c.type==='output_text').map(c=>c.text).join('');
 try{w=JSON.parse(text.trim().replace(/^`{3}json\s*/i,'').replace(/\s*`{3}$/,''));if(valid(w,rows)&&w.conclusions.length===4&&w.risks.length)break;}catch{}w=null;input.repair='补齐四个不同的section与risk；每条都需judgment及1—5个有效编号。';
 }if(!w)throw Error('合同未通过 '+file);r.written=w;
 let oldstart=h.indexOf('window.researchReport=');h=h.slice(0,oldstart)+src+'\nconst saved='+JSON.stringify(r).replace(/</g,'\\u003c')+h.slice(b);
 // Standalone readers have no live chat shell; retain the original modal reading geometry.
 h=h.replace('draw();dialog.show();showReplies();toggleLabel(true);position();','draw();dialog.showModal();showReplies();toggleLabel(true);').replace("if(!dialog.open)return;\n      const rect=dock","if(!dialog.open||!document.querySelector('.topbar'))return;\n      const rect=dock");
 await fs.writeFile(dir+file,h);console.log(file,w.conclusions.map(x=>x.judgment),w.risks.length);
}));
