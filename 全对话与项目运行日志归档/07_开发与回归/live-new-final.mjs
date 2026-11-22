import {spawn} from 'node:child_process';import {once} from 'node:events';import {mkdtemp,writeFile} from 'node:fs/promises';import {resolve} from 'node:path';import {tmpdir} from 'node:os';import assert from 'node:assert/strict';
const key=process.env.TIANSHU_TEST_TOKEN;delete process.env.TIANSHU_TEST_TOKEN;
const pause=ms=>new Promise(r=>setTimeout(r,ms));let web,chrome;
try{
 web=spawn(process.execPath,['server.mjs'],{cwd:resolve('work/new-report-base/天枢团队审查包/天枢工作台'),env:{...process.env,TIANSHU_PORT:'0'}});
 const [m]=await once(web.stdout,'data'),site=m.toString().match(/http:\/\/[^\s]+/)[0];
 chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--remote-debugging-port=19371','--user-data-dir='+await mkdtemp(resolve(tmpdir(),'research-')),site],{stdio:'ignore'});
 let first;for(let i=0;i<100&&!first;i++){try{first=(await(await fetch('http://127.0.0.1:19371/json')).json()).find(x=>x.url===site+'/')}catch{}await pause(100)}
 const maxTest=await fetch(site+'/api/stream',{method:'POST',headers:{Origin:site,'Content-Type':'application/json'},body:JSON.stringify({role:'TS',action:'answer',config:{baseUrl:'https://api.deepseek.com',apiKey:key,model:'DeepSeek-V4.1-Flash-1017',reasoningEffort:'xhigh'},context:{question:'只回答：测试通过。'}})});
 assert.ok(maxTest.ok);const maxBody=await maxTest.text();const maxEvent=maxBody.split('\n').filter(l=>l.startsWith('data: ')).map(l=>JSON.parse(l.slice(6))).find(e=>e.type==='response.completed');
 assert.equal(maxEvent.response.reasoning.effort,'max');assert.ok(maxEvent.response.usage.total_tokens>0);console.log('VERIFIED legacy xhigh config => official max, model',maxEvent.response.model, maxEvent.response.usage);
 const second=await(await fetch('http://127.0.0.1:19371/json/new?'+encodeURIComponent(site),{method:'PUT'})).json();
 async function test(page,type){
 const ws=new WebSocket(page.webSocketDebuggerUrl);await once(ws,'open');let n=0;
 async function ev(expression){const id=++n;const done=new Promise(r=>{function f(e){const d=JSON.parse(e.data);if(d.id===id){ws.removeEventListener('message',f);r(d.result)}}ws.addEventListener('message',f)});ws.send(JSON.stringify({method:'Runtime.evaluate',id,params:{expression,returnByValue:true}}));const d=await done;if(d.exceptionDetails)throw Error('browser: '+d.exceptionDetails.exception?.description?.slice(0,200));return d.result.value}
 for(let i=0;i<80&&!await ev('!!window.researchSnapshot');i++)await pause(200);
 await ev('const original=Storage.prototype.getItem;Storage.prototype.getItem=function(k){if(k==="app.api.config")return '+JSON.stringify(JSON.stringify({baseUrl:'https://api.deepseek.com',apiKey:key,model:'deepseek-flash',reasoningEffort:'low'}))+';return original.call(this,k)}');
 const q=type==='FIN'?'研究美的集团：用2021至2025年的数据解释利润和经营现金流是否同步，比较同行，每组只提交一项可验证的核心发现。':'研究中国动力电池行业：比较2023至2025年销量、国内装车量与代表企业竞争格局，每组只提交一项可验证的核心发现。';
 await ev('document.querySelector("#composer-input").value='+JSON.stringify(q)+';document.querySelector(".send").click()');
 let state,last='',snap;
 for(let i=0;i<540;i++){await pause(2000);state=await ev('(()=>{const s=researchSnapshot();return [s?.phase,s?.agents.map(a=>a.name+" "+a.status).join(" "),s?.events.at(-1)?.label]})()');if(JSON.stringify(state)!==last){console.log(type,...state);last=JSON.stringify(state)}
 if(state[0]==='failed'||state[0]==='clarify')throw Error(type+' '+await ev('document.querySelector(".conversation").innerText.slice(-400)'));
 if(state[0]==='done')break;}
 assert.equal(state[0],'done');snap=await ev('researchSnapshot()');await writeFile('work/verified-new-'+type+'.json',JSON.stringify(snap));
 assert.equal(snap.agents.at(-1).status,'已完成');assert.ok(snap.reportEdition.conclusions.length);
 await ev('document.querySelector("#report-toggle").click()');
 assert.equal(await ev('document.querySelector("#research-report").open'),true);
 await ev('document.querySelector(".report-kpis button").dispatchEvent(new PointerEvent("pointerenter",{clientX:320,clientY:210}))');
 assert.ok(await ev('!!document.querySelector(".report-tip.open")'));
 await ev('document.querySelector(".research-prose .metric-link").dispatchEvent(new MouseEvent("contextmenu",{bubbles:true,cancelable:true}));document.querySelector(".rf-menu.open button:nth-child(2)").click()');
 assert.ok(await ev('document.querySelector("#research-source").open && !!document.querySelector("#proof-body a[href]")'));
 await ev('document.querySelector("#proof-close").click()');await pause(120);
 await ev('document.querySelector(".research-prose .metric-link").click();document.querySelector(".rf-menu.open button:first-child").click()');
 assert.ok(await ev('document.querySelector("#research-report").open && !!document.querySelector("#composer-attach .cite-chip")'));
 await ev('document.querySelector("#composer-input").value="请简短解释引用结论的统计口径和限制";document.querySelector(".send").click()');
 for(let i=0;i<100;i++){await pause(600);if(await ev('document.querySelector(".conversation article:last-child .answer-text")?.innerText.length>20'))break;}
 assert.ok(await ev('document.querySelector("#st-tokens").textContent!=="—" && document.querySelector("#st-cache").textContent.includes("%") && document.querySelector("#st-wave").title.includes("字符/秒")'));
 if(type==='FIN'){
  await ev('document.querySelector("#report-toggle").click();document.querySelector("#report-update").click()');
  for(let i=0;i<500;i++){await pause(1500);if(await ev('researchSnapshot().phase==="done"'))break;}
  await ev('document.querySelector("#report-toggle").click()');
  assert.equal(await ev('document.querySelector("#report-version").options.length'),2);
  assert.ok(await ev('document.querySelector("#research-pages").innerText.includes("与上一版本比较")'));console.log('VERIFIED report update and retained versions');
 }
 console.log('VERIFIED',type,snap.reportEdition.conclusions.length,snap.reportEdition.risks.length,snap.verifiedLedger.metrics.length);ws.close();
 }
 const results=await Promise.allSettled([test(first,'FIN'),test(second,'IND')]);for(const r of results)if(r.status==='rejected'){console.log(r.reason.message);process.exitCode=1}
}finally{chrome?.kill();web?.kill();}
