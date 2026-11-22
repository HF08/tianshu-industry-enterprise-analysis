import {spawn} from 'node:child_process';import {once} from 'node:events';import {mkdtemp,writeFile} from 'node:fs/promises';import {resolve} from 'node:path';import {tmpdir} from 'node:os';import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
const calls=[];
const model=http.createServer(async(req,res)=>{
 let raw='';for await(const c of req)raw+=c;const body=JSON.parse(raw),d=JSON.parse(body.input);let result;
 if(body.instructions.includes('仅填写 type,target,scope,question')){const ind=body.input.includes('动力电池');result={type:ind?'industry':'company',target:ind?'中国动力电池行业':'美的集团',scope:'2021—2025',question:''};}
 else if(d.role==='SUPPLY'){
  calls.push(d);assert.ok(body.instructions.includes('INDUSTRY_CHAIN_AGENT_V2'));const ref=d.evidence_pack.observations[0].id;
  result={agent_id:'INDUSTRY_CHAIN_AGENT_V2',summary:'产业活动边界核对',status:'partial',analysis_mode:d.analysis_mode,selection_adjustment:{retained_node_ids:['up','mid','down']},nodes:['up','mid','down'].map((id,i)=>({node_id:id,name:['材料供给','生产制造','应用交付'][i],stage:['upstream','midstream','downstream'][i],claim_type:'I',description_35_60:'测试节点说明',evidence_ids:[ref]})),relationships:[{source_node_id:'up',target_node_id:'mid',relation_type:'supply',claim_type:'I',evidence_ids:[ref]}],evidence_gaps:['模拟资料']};
 }else if(d.catalogue){result={conclusions:[{text:'核对观测 {{'+d.catalogue[0].id+'}}',refs:[d.catalogue[0].id]}],risks:[],gaps:[]};}
 else if(d.role){calls.push(d);result={status:'partial',summary:'已核对资料',overview_card:{headline:'利润与现金流走势分化',support:'模拟核验：经营现金流同比下降，归母利润增长。'},agent_analysis:'角色研究记录',artifacts:[],risk_findings:[],missing:[]};}
 else result='汇总完成。';
 const t=typeof result==='string'?result:JSON.stringify(result);res.writeHead(200,{'content-type':'text/event-stream'});res.end('data: '+JSON.stringify({type:'response.output_text.delta',delta:t})+'\n\ndata: '+JSON.stringify({type:'response.completed',response:{output:[]}})+'\n\n');
});model.listen(0,'127.0.0.1');await once(model,'listening');

const pause=ms=>new Promise(r=>setTimeout(r,ms));let web,chrome;
try{
 web=spawn(process.execPath,['server.mjs'],{cwd:resolve('work/one-screen/天枢工作台'),env:{...process.env,TIANSHU_PORT:'0'}});
 const [m]=await once(web.stdout,'data'),site=m.toString().match(/http:\/\/[^\s]+/)[0];
 chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--window-size=1280,720','--headless=new','--disable-gpu','--remote-debugging-port=19371','--user-data-dir='+await mkdtemp(resolve(tmpdir(),'research-')),site],{stdio:'ignore'});
 let first;for(let i=0;i<100&&!first;i++){try{first=(await(await fetch('http://127.0.0.1:19371/json')).json()).find(x=>x.url===site+'/')}catch{}await pause(100)}
 const second=await(await fetch('http://127.0.0.1:19371/json/new?'+encodeURIComponent(site),{method:'PUT'})).json();
 async function test(page,type){
 const ws=new WebSocket(page.webSocketDebuggerUrl);await once(ws,'open');let n=0;
 async function ev(expression){const id=++n;const done=new Promise(r=>{function f(e){const d=JSON.parse(e.data);if(d.id===id){ws.removeEventListener('message',f);r(d.result)}}ws.addEventListener('message',f)});ws.send(JSON.stringify({method:'Runtime.evaluate',id,params:{expression,returnByValue:true}}));const d=await done;if(d.exceptionDetails)throw Error('browser: '+d.exceptionDetails.exception?.description?.slice(0,200));return d.result.value}
 for(let i=0;i<80&&!await ev('!!window.researchSnapshot');i++)await pause(200);
 await ev('const original=Storage.prototype.getItem;Storage.prototype.getItem=function(k){if(k==="app.api.config")return '+JSON.stringify(JSON.stringify({baseUrl:'http://127.0.0.1:'+model.address().port,apiKey:'',model:'dfmodel',reasoningEffort:'low'}))+';return original.call(this,k)}');
 const q=type==='FIN'?'研究美的集团：用2021至2025年的数据解释利润和经营现金流是否同步，比较同行，综合分析。':'研究中国动力电池行业：比较2023至2025年销量、国内装车量与代表企业竞争格局，综合分析。';
 const ledger=JSON.parse(await readFile('work/verified-new-'+type+'.json')).verifiedLedger;
 await ev('const ledger='+JSON.stringify(ledger)+';const realFetch=fetch;window.fetch=(url,opts)=>url==="/api/kernel"?Promise.resolve(new Response(JSON.stringify({type:"result",ledger})+"\\n")):realFetch(url,opts);');
 await ev('document.querySelector("#composer-input").value='+JSON.stringify(q)+';document.querySelector(".send").click()');
 let state,last='',snap;
 for(let i=0;i<540;i++){await pause(2000);state=await ev('(()=>{const s=researchSnapshot();return [s?.phase,s?.agents.map(a=>a.name+" "+a.status).join(" "),s?.events.at(-1)?.label]})()');if(JSON.stringify(state)!==last){console.log(type,...state);last=JSON.stringify(state)}
 if(state[0]==='failed'||state[0]==='clarify')throw Error(type+' '+await ev('document.querySelector(".conversation").innerText.slice(-400)'));
 if(state[0]==='done')break;}
 assert.equal(state[0],'done');snap=await ev('researchSnapshot()');assert.equal(snap.agents.length,6);assert.equal(snap.agents.find(a=>a.id==='SUPPLY').status,'已完成');
 const mode=type==='FIN'?'enterprise':'industry';assert.equal(snap.agentOutput.SUPPLY.report.chainStudy.analysis_mode,mode);
 assert.equal(calls.find(c=>c.role===(type==='FIN'?'RC':'RI')).upstream.length,4);
 await ev('document.querySelector("#board-modes [data-mode=overview]").click()');
 assert.equal(await ev('getComputedStyle(document.querySelector(".mode-switch-frame")).borderTopWidth'),'1px');
 const geometry=await ev('(()=>{let w=document.querySelector("#trace-scroll");return [innerWidth,innerHeight,w.clientHeight,w.scrollHeight,[...document.querySelectorAll(".atlas .corner")].every(c=>c.querySelector(".bc-support").getBoundingClientRect().top>=c.querySelector(".bc-verdict").getBoundingClientRect().bottom)]})()');
 console.log(type,geometry);assert.ok(geometry[4]);assert.ok(geometry[3]<=geometry[2]+1);
 const roles=type==='FIN'?['FIN','BIZ','COMP','RC']:['IND','CHAIN','DEM','RI'];
 for(const id of roles){
   await ev('document.querySelector(".atlas [data-role='+id+']").click()');
   assert.equal(await ev('!!document.querySelector(".role-reading") && !document.querySelector(".role-reading").closest("details")'),true);
   assert.ok(await ev('document.querySelector(".role-reading").innerText.includes("角色研究记录")'));
   assert.ok(await ev('!!document.querySelector(".role-sheet details")'));
   await ev('document.querySelector("#board-modes [data-mode=overview]").click()');
 }
 assert.equal(await ev('document.querySelectorAll(".atlas .bc-verdict").length'),4);assert.equal(await ev('document.querySelectorAll(".atlas .bc-metric").length'),0);assert.equal(await ev('document.querySelector(".atlas .bc-verdict").textContent'), '利润与现金流走势分化');
 assert.equal(await ev('document.querySelectorAll("#board-rail [data-role=RPT], .atlas [data-role=RPT]").length'),0);
 assert.equal(await ev('document.querySelectorAll(".atlas-spine button").length'),2);
 await ev('[...document.querySelectorAll(".atlas-spine button")].find(b=>b.textContent==="产业链分析").click()');assert.ok(await ev('!!document.querySelector("#trace-scroll .chain-study svg")'));
 await ev('document.querySelector("#report-toggle").click()');assert.equal(await ev('document.querySelectorAll("#research-pages .chain-study").length'),1);assert.equal(await ev('document.querySelectorAll("#research-pages .chain-study svg g[role=button]").length'),3);
 console.log("PASS "+mode+" parallel dispatch, four upstream handoffs, merged overview, booklet filter, live report network");
 ws.close();
 }
 const results=await Promise.allSettled([test(first,'FIN'),test(second,'IND')]);for(const r of results)if(r.status==='rejected'){console.log(r.reason.message);process.exitCode=1}
}finally{chrome?.kill();web?.kill();model.closeAllConnections();model.close();}
