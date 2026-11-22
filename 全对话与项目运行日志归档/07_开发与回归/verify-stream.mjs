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
   res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify({data:[{id:'test'},{id:'other'}]}));return;
 }
 assert.equal(req.url,'/v1/chat/completions');
 let body='';for await(const part of req)body+=part;
 const {messages,reasoning_effort,model}=JSON.parse(body), sys=messages[0].content, data=JSON.parse(messages[1].content);
 assert.equal(reasoning_effort,'high');assert.equal(model,'test');
 let out;
 if(sys.includes('仅进行路由'))out=JSON.stringify({type:JSON.stringify(data.conversation).includes('改行业')?'industry':'company',scope:'五年',target:'测试标的'});
 else if(sys.includes('判断最新插话'))out=JSON.stringify({action:data.conversation.at(-1).content.includes('改行业')?'revise':'answer'});
 else if(sys.includes('从 report.text 提取历史实绩')){
   const row={kind:'历史实绩',own_data:true,period_kind:'全年',year:2025,field:'销量',value:123,unit:'GWh',dimension:'测试范围',locator:'表1',excerpt:data.report.text};
   out=JSON.stringify({rows:[row,{...row,value:456},{...row,kind:'预测'}]});
 }else if(sys.includes('根据输入任务卡')){
   calls.push(data);await pause(600);
   if(data.role==='DEM'){res.writeHead(503).end();return;}
   out=JSON.stringify({summary:'测试回报',chainGraph:['COMP','CHAIN'].includes(data.role)?graph:undefined,status:'partial',artifacts:[],risk_findings:[],evidence:[],calculations:[],missing:['缺资料'],handoff_to:['TS'],task_id:data.task_id,snapshot_id:data.snapshot_id,role:data.role});
 }else if(sys.includes('根据已收到的团队消息'))out='**汇总四个回报**\n\n年度\t数值\n2025\t2\n\n- *重点*';
 else out='追问回复，当前回报数'+data.team_messages.length;
 res.writeHead(200,{'content-type':'text/event-stream'});
 const framed=sys.includes('传输约定'),structured=out.startsWith('{');
 if(framed){
   for(const content of ['【摘','要】\n正在核对研究范围。','\n正在读取披露资料。',structured?'【数':'【正',structured?'据】':'文】']){
     res.write('data: '+JSON.stringify({choices:[{delta:{content,reasoning_content:'PRIVATE_TEST'}}]})+'\n\n');await pause(sys.includes('仅进行路由')?180:10);
   }
 }
 const split=out.startsWith('**')?out.indexOf('\n\n-'):out.startsWith('{"summary"')?14:3;
 for(const content of [out.slice(0,split),out.slice(split)]){res.write('data: '+JSON.stringify({choices:[{delta:{content}}]})+'\n\n');await pause(out.startsWith('**')?240:20);}
 res.end('data: [DONE]\n\n');
});
try{
 mock.listen(0,'127.0.0.1');await once(mock,'listening');
 web=spawn(process.execPath,['server.mjs'],{cwd:resolve('outputs/天枢工作台'),env:{...process.env,TIANSHU_PORT:'0'}});const [stdout]=await once(web.stdout,'data');
 const site=stdout.toString().match(/http:\/\/[^\s]+/)[0], profile=await mkdtemp(resolve('work/browser-'));
 chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=19349','--user-data-dir='+profile,site],{stdio:'ignore'});
 let page;for(let i=0;i<100&&!page;i++){try{page=(await(await fetch('http://localhost:19349/json')).json()).find(x=>x.url===site+'/');}catch{}await pause(100);}
 const ws=new WebSocket(page.webSocketDebuggerUrl);await once(ws,'open');let n=0;
 async function ev(expression){const id=++n;const msg=new Promise(r=>{function f(e){const d=JSON.parse(e.data);if(d.id===id){ws.removeEventListener('message',f);r(d.result);}}ws.addEventListener('message',f);});ws.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression,returnByValue:true}}));const d=await msg;if(d.exceptionDetails)throw Error(JSON.stringify(d.exceptionDetails));return d.result.value;}
 async function until(code){for(let i=0;i<160;i++){if(await ev(code))return;await pause(70);}throw Error('timeout '+code+' '+await ev('document.body.innerText.slice(-3000)'));}
 const has=t=>'document.querySelector(".conversation").innerText.includes('+JSON.stringify(t)+')';
 const send=t=>ev('document.querySelector("textarea").value='+JSON.stringify(t)+';document.querySelector(".send").click()');
 await until('!!document.querySelector(".conversation")');
 await ev('document.querySelector(".model-btn").click()');
 assert.equal(await ev('document.querySelector("#settings-overlay").contains(document.elementFromPoint(innerWidth/2,innerHeight-45))'),true);
 await ev('document.querySelector("#field-base-url").value="http://127.0.0.1:'+mock.address().port+'/v1/chat/completions";document.querySelector("#field-base-url").dispatchEvent(new Event("input"));document.querySelector("#field-api-key").value="test";document.querySelector("#fetch-models").click()');
 await until('document.querySelector("#available-models").options.length===3');
 await ev('document.querySelector("#available-models").value="test";document.querySelector("#available-models").dispatchEvent(new Event("change"));document.querySelector("#effort").value="high";document.querySelector("#save-settings").click()');
 await ev('document.querySelector(".model-btn").click()');
 assert.equal(await ev('document.querySelector("#field-model").value+":"+document.querySelector("#effort").value'),'test:high');
 await ev('document.querySelector("#cancel-settings").click()');
 const report={type:'report',role:'FIN',target:'测试标的',publisher:'测试机构',source:'https://example.org/test',published:'2026-01-01',text:'表1 2025年全年销量123 GWh'};
 await ev('const originalPick=HTMLInputElement.prototype.click; HTMLInputElement.prototype.click=function(){if(this.type!=="file")return originalPick.call(this);const dt=new DataTransfer();dt.items.add(new File(['+JSON.stringify(JSON.stringify(report))+'],"sample.json"));this.files=dt.files;this.onchange();}; document.querySelector(".circle-plus").click();HTMLInputElement.prototype.click=originalPick;');
 await until(has('已载入研报原文'));
 await send('研究企业');
 await until('document.querySelector(".thought-summary")?.textContent.includes("正在读取披露资料")');
 assert.equal(await ev('const th=document.querySelector(".thought-summary");th.textContent.includes("核对研究范围")'),false);
 await ev('th.click()');assert.equal(await ev('th.textContent.includes("核对研究范围") && th.textContent.includes("读取披露资料")'),true);
 await ev('th.click()');await until(has('财务计算」派发'));assert.equal(await ev('th.textContent.includes("核对研究范围") && !th.textContent.includes("读取披露资料")'),true);
 await send('现在进度？');await until(has('追问回复'));await until(has('汇总四个回报'));assert.equal(calls.find(c=>c.role==='RC').upstream.length,3);
 assert.equal(await ev('/【数据】|【正文】|PRIVATE_TEST|"snapshot_id"/.test(document.querySelector(".conversation").innerText)'),false);
 assert.equal(await ev('document.querySelectorAll(".agent-state.done").length'),4);
 assert.equal(calls.find(c=>c.role==='FIN').kernel.series.find(s=>s.name==='销量'&&s.dimension==='测试范围').values['2025'],123);
 assert.equal(await ev(has('通过原文、单位和期间校验 1 条')),true);
 assert.equal(await ev('document.querySelector("#agent-panel").classList.contains("is-empty")'),false);
 await until('!!document.querySelector(".answer-text table td") && !!document.querySelector(".answer-text strong")');
 assert.equal(await ev('document.querySelector(".work-log").innerText.includes("snapshot_id")'),false);
 for(const role of ['BIZ','COMP','RC'])assert.ok(calls.find(c=>c.role===role).role_kernel);
 await until('Array.from(document.querySelectorAll(".conversation > div")).some(x=>x.shadowRoot)');
 const check=await ev('('+function(){
   const host=[...document.querySelectorAll('.conversation > div')].find(x=>x.shadowRoot),root=host.shadowRoot;
   const tabs=[...root.querySelectorAll('nav button')];if(tabs.length!==3)return 'tabs';
   for(const b of root.querySelectorAll('.nodes button')){b.click();b.click();if(!root.querySelector('.detail h4').textContent)return 'detail';}
   for(const a of root.querySelectorAll('a'))if(!a.href.startsWith('https:')||a.target!=='_blank'||!a.rel.includes('noopener'))return 'url';
   for(const w of [320,720]){host.style.width=w+'px';for(const theme of ['dark','light']){host.style.colorScheme=theme;host.style.setProperty('--tx','CanvasText');host.style.setProperty('--bg','Canvas');for(const b of tabs){b.click();if(host.scrollWidth>w+1)return 'overflow '+w;}}}
   tabs[1].click();if(root.querySelectorAll('.segment').length!==2)return 'cost';
   tabs[2].click();if(root.querySelectorAll('tbody tr').length!==2)return 'tech';
   host.style.width='';return 'ok';
 }.toString()+')()');assert.equal(check,'ok');
 const dynamic=await ev('('+function(){
   const h=document.createElement('div');document.body.append(h);
   const d={industry:'Test',stages:[{id:'a',name:'A'},{id:'b',name:'B'}],nodes:[{id:'x',name:'X',group:'a',companies:[{name:'Text'},{id:'42',name:'Route'}]},{id:'y',name:'Y',group:'b'}],linkTemplates:{company:'/company/{id}'}};
   window.chainMap.mount(h,d);const links=[...h.shadowRoot.querySelectorAll('a')];if(links.length!==1||!links[0].href.endsWith('/company/42'))return false;
   d.stages.push({id:'c',name:'C'});d.nodes.push({id:'z',group:'c',name:'Z'});window.chainMap.mount(h,d);
   const ok=h.shadowRoot.querySelectorAll('.stage').length===3&&h.shadowRoot.querySelectorAll('nav button').length===1;h.remove();return ok;
 }.toString()+')()');assert.equal(dynamic,true);
 await send('补充解释');await until(has('追问回复，当前回报数4'));
 await send('改行业');await until(has('行业状况（数据）」派发'));await send('改行业并调整期间');await until('document.querySelectorAll(".conversation article").length>18 && document.querySelector(".conversation").innerText.split("汇总四个回报").length===3');
 assert.equal(calls.find(c=>c.role==='RI').upstream.length,3);
 for(const role of ['DEM','CHAIN','RI'])assert.ok(calls.find(c=>c.role===role).role_kernel);
 assert.equal(await ev('document.querySelectorAll(".agent-card").length'),4);
 assert.equal(await ev('getComputedStyle(document.querySelector(".agent-state.failed")).backgroundColor'),'rgb(255, 102, 95)');
 await ev('document.querySelector("#new-chat").click()');assert.equal(await ev('document.querySelector(".conversation").innerText'),'');
 const fragment=await readFile('outputs/锂电产业链图谱.html','utf8');
 await ev('window.demo=document.createElement("iframe");demo.setAttribute("sandbox","allow-scripts allow-same-origin");demo.srcdoc='+JSON.stringify(fragment)+';document.body.append(demo)');
 await until('!!demo.contentDocument.querySelector("div")?.shadowRoot');
 assert.equal(await ev('const demoRoot=demo.contentDocument.querySelector("div").shadowRoot;demoRoot.querySelector("nav button").click();demoRoot.querySelectorAll("a").length===0 && [...demoRoot.querySelectorAll("input[readonly]")].some(x=>x.value.startsWith("https://"))'),true);
 ws.close();console.log('PASS: streaming, routing, both teams, risk dependencies, steering, follow-up and session isolation');
}finally{chrome?.kill();web?.kill();mock.closeAllConnections();mock.close();}
