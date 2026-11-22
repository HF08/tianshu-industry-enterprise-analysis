import {tmpdir} from 'node:os';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const pause=n=>new Promise(r=>setTimeout(r,n));
let web,chrome;
const calls=[];const graph=JSON.parse(await readFile('work/lithium-graph.json','utf8'));
const mock=http.createServer(async(req,res)=>{
 if(req.url==='/v1/models'&&req.method==='GET'){
   assert.equal(req.headers.authorization,'Bearer test');
   res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify({data:[{id:'DeepSeek-V4.1-Flash-1017'},{id:'other'}]}));return;
 }
 assert.equal(req.url,'/v1/chat/completions');
 let body='';for await(const part of req)body+=part;
 const {messages,reasoning_effort,model}=JSON.parse(body), sys=messages[0].content, data=JSON.parse(messages[1].content);
 assert.equal(reasoning_effort,'max');assert.equal(model,'DeepSeek-V4.1-Flash-1017');
 let out;
 if(sys.includes('仅进行路由')){
  const ind=JSON.stringify(data.conversation).includes('电池');
  out=JSON.stringify({type:ind?'industry':'company',scope:'五个完整财年，近期累计单列',target:ind?'中国动力电池行业':'美的集团'});
 }else if(sys.includes('判断最新插话'))out=JSON.stringify({action:'answer'});
 else if(sys.includes('根据输入任务卡')){
  calls.push(data);out=JSON.stringify({summary:'已核对本轮输入及口径',status:'partial',agent_analysis:'当前资料已进入台账',artifacts:[],risk_findings:[],missing:[],chainGraph:data.role==='CHAIN'?graph:undefined});
 }else if(sys.includes('可视化报告代理')){
  calls.push({role:'RPT',...data});
  const row=data.catalogue.find(x=>x.name==='营业收入'||x.name==='销量')||data.catalogue[0];
  assert.ok(row);
  const bad=!data.retry_instruction;
  out=JSON.stringify({conclusions:[{text:'所选口径已取得观测值，应结合期间比较。',refs:[bad?'不存在的编号':row.id]}],risks:[{text:'该记录单独不足以归因经营风险。',counter:'需核查可比期间与统计范围。',refs:[row.id]}],gaps:['核对业务范围']});
 }else if(sys.includes('根据已收到的团队消息'))out='已完成本次汇总';
 else{calls.push({role:'answer',...data});out='已收到报告引用';}
 res.writeHead(200,{'content-type':'text/event-stream'});
 const framed=sys.includes('传输约定'),structured=out.startsWith('{');
 if(framed){
   for(const content of ['【摘','要】\n正在核对研究范围。','\n正在读取披露资料。',structured?'【数':'【正',structured?'据】':'文】']){
     res.write('data: '+JSON.stringify({choices:[{delta:{content,reasoning_content:'PRIVATE_TEST'}}]})+'\n\n');await pause(sys.includes('仅进行路由')?180:10);
   }
 }
 const split=out.startsWith('**')?out.indexOf('\n\n-'):out.startsWith('{"summary"')?14:3;
 for(const content of [out.slice(0,split),out.slice(split)]){res.write('data: '+JSON.stringify({choices:[{delta:{content}}]})+'\n\n');await pause(out.startsWith('**')?240:20);}
 res.write('data: '+JSON.stringify({choices:[],usage:{prompt_tokens:80,prompt_cache_hit_tokens:60,completion_tokens:20,total_tokens:100}})+'\n\n');res.end('data: [DONE]\n\n');
});
try{
 mock.listen(0,'127.0.0.1');await once(mock,'listening');
 web=spawn(process.execPath,['server.mjs'],{cwd:resolve('outputs/Tianshu-Monitor'),env:{...process.env,TIANSHU_PORT:'0'}});const [stdout]=await once(web.stdout,'data');
 const site=stdout.toString().match(/http:\/\/[^\s]+/)[0], profile=await mkdtemp(resolve(tmpdir(),'tianshu-test-'));
 chrome=spawn(process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=19349','--user-data-dir='+profile,site],{stdio:'ignore'});
 let page;for(let i=0;i<100&&!page;i++){try{page=(await(await fetch('http://localhost:19349/json')).json()).find(x=>x.url===site+'/');}catch{}await pause(100);}
 const ws=new WebSocket(page.webSocketDebuggerUrl);await once(ws,'open');let n=0;
 async function ev(expression){const id=++n;const msg=new Promise(r=>{function f(e){const d=JSON.parse(e.data);if(d.id===id){ws.removeEventListener('message',f);r(d.result);}}ws.addEventListener('message',f);});ws.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression,returnByValue:true}}));const d=await msg;if(d.exceptionDetails)throw Error(JSON.stringify(d.exceptionDetails));return d.result.value;}
 async function until(code){for(let i=0;i<1900;i++){if(await ev(code))return;await pause(70);}throw Error('timeout '+code+' '+await ev('document.body.innerText.slice(-3000)'));}
 const has=t=>'document.querySelector(".conversation").innerText.includes('+JSON.stringify(t)+')';
 const send=t=>ev('document.querySelector("textarea").value='+JSON.stringify(t)+';document.querySelector(".send").click()');
 await until('!!document.querySelector(".conversation")');
 await ev('document.querySelector(".model-btn").click()');
 assert.equal(await ev('document.querySelector("#settings-overlay").contains(document.elementFromPoint(innerWidth/2,innerHeight-45))'),true);
 await ev('document.querySelector("#field-base-url").value="http://127.0.0.1:'+mock.address().port+'/v1/chat/completions";document.querySelector("#field-base-url").dispatchEvent(new Event("input"));document.querySelector("#field-api-key").value="test";document.querySelector("#fetch-models").click()');
 await until('document.querySelector("#available-models").options.length===3');
 await ev('document.querySelector("#available-models").value="DeepSeek-V4.1-Flash-1017";document.querySelector("#available-models").dispatchEvent(new Event("change"));document.querySelector("#effort").value="max";document.querySelector("#save-settings").click()');
 await ev('document.querySelector(".model-btn").click()');
 assert.equal(await ev('document.querySelector("#field-model").value+":"+document.querySelector("#effort").value'),'DeepSeek-V4.1-Flash-1017:max');
 await ev('document.querySelector("#cancel-settings").click()');
 assert.equal(await ev('document.querySelector("#report-toggle").disabled'),true);
 await send('分析美的集团');
 await until(has('已完成本次汇总'));
 assert.equal(await ev('document.querySelector("#st-cache").textContent'),'75%');assert.ok(await ev('parseFloat(document.querySelector("#st-tps-value").textContent)>0'));assert.ok(await ev('document.querySelector("#st-tokens").textContent!=="—"'));assert.ok(await ev('!document.querySelector("#st-wave").title.includes("峰值 0 ")'));
 const click=sel=>ev('document.querySelector('+JSON.stringify(sel)+').click()');
 await click('#report-toggle');
 assert.equal(await ev('document.querySelector("#live-report-title").innerText'),'美的集团研究报告');
 assert.equal(await ev('document.querySelectorAll(".agent-card").length'),5);
 assert.equal(await ev('document.querySelector("#report-stamp").textContent.includes("报告代理汇编")'),true);
 assert.ok(await ev('document.querySelectorAll("#research-pages .bars button").length')>=8);
 assert.ok(await ev('document.querySelector("#research-pages").innerText.includes("美的集团") || document.querySelector("#live-report-title").innerText.includes("美的集团")'));
 await ev('document.querySelector(".report-kpis button").dispatchEvent(new PointerEvent("pointerenter",{clientX:500,clientY:250}))');
 assert.ok(await ev('document.querySelector(".report-tip.open").textContent.includes("营业收入")'));
 await click('.report-kpis button');
 assert.ok(await ev('!document.querySelector("#research-source").open && !!document.querySelector(".rf-menu.open") && !document.querySelector(".report-tip.open")'));
 await click('.rf-menu.open button:nth-child(2)');
 await until('document.querySelector("#research-source").open && !!document.querySelector("#proof-body a")');
 assert.ok(await ev('document.querySelector("#proof-body").textContent.includes("收入")'));
 assert.ok(await ev('[...document.querySelectorAll("#proof-body a")].some(a=>/cninfo/.test(a.href))'));
 await click('#proof-body button.metric-link');await click('.rf-menu.open button:nth-child(2)');
 assert.ok(await ev('document.querySelector("#proof-body button").textContent.includes("返回上一级")'));
 await click('#proof-body button');await click('#proof-close');await pause(120);
 await click('.finding-card button.metric-link');await click('.rf-menu.open button:nth-child(2)');
 assert.equal(await ev('document.querySelector("#proof-title").textContent'),'判断依据');
 await click('#proof-close');await pause(120);
 await click('.report-kpis button');await click('.rf-menu.open button:first-child');
 assert.ok(await ev('document.querySelector("#research-report").open && document.querySelector("#research-report #composer-attach").innerText.includes("营业收入")'));
 await send('这个数值的依据是什么');await until(has('已收到报告引用'));
 assert.ok(calls.find(c=>c.role==='answer').latest_user_message.includes('https://'));
 await click('#report-toggle');await click('#report-update');
 await until('document.querySelector(".conversation").innerText.split("已完成本次汇总").length===3');
 await click('#report-toggle');
 assert.equal(await ev('document.querySelector("#report-version").options.length'),2);
 assert.ok(await ev('document.querySelector("#research-pages").innerText.includes("与上一版本比较")'));
 await ev('document.querySelector("#report-version").value="0";document.querySelector("#report-version").dispatchEvent(new Event("change"))');
 await click('#report-exit');await click('#new-chat');
 assert.equal(await ev('document.querySelector("#report-toggle").disabled'),true);
 await send('分析中国动力电池行业');await until(has('已完成本次汇总'));await click('#report-toggle');
 assert.equal(await ev('document.querySelector("#live-report-title").innerText'),'中国动力电池行业研究报告');
 assert.ok(await ev('!![...document.querySelectorAll("#research-pages div")].find(e=>e.shadowRoot)'));
 assert.ok(calls.find(c=>c.role==='CHAIN').role_kernel.rows.some(r=>r.name==='代表企业样本营收占比'));
 assert.ok(!calls.find(c=>c.role==='RPT').retry_instruction);
 console.log('PASS both live ledgers, separate report agent, invalid citation retry, peer ranking, chart evidence, annual report links, citation to real follow-up request, history and session isolation');
 ws.close();console.log('PASS: streaming, routing, both teams, risk dependencies, steering, follow-up and session isolation');
}finally{chrome?.kill();web?.kill();mock.closeAllConnections();mock.close();}
