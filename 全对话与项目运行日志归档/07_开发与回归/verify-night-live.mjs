import {spawn} from 'node:child_process';import {once} from 'node:events';import {mkdtemp,writeFile} from 'node:fs/promises';import {resolve} from 'node:path';import {tmpdir} from 'node:os';import assert from 'node:assert/strict';
const key=process.env.TIANSHU_TEST_TOKEN;delete process.env.TIANSHU_TEST_TOKEN;
const pause=ms=>new Promise(r=>setTimeout(r,ms));let web,chrome;
try{
 web=spawn(process.execPath,['server.mjs'],{cwd:resolve('work/night-industry/天枢工作台'),env:{...process.env,TIANSHU_PORT:'0'}});
 const [m]=await once(web.stdout,'data'),site=m.toString().match(/http:\/\/[^\s]+/)[0];
 chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--remote-debugging-port=19371','--user-data-dir='+await mkdtemp(resolve(tmpdir(),'research-')),site],{stdio:'ignore'});
 let first;for(let i=0;i<100&&!first;i++){try{first=(await(await fetch('http://127.0.0.1:19371/json')).json()).find(x=>x.url===site+'/')}catch{}await pause(100)}
 const second=await(await fetch('http://127.0.0.1:19371/json/new?'+encodeURIComponent(site),{method:'PUT'})).json();
 async function test(page,type){
 const ws=new WebSocket(page.webSocketDebuggerUrl);await once(ws,'open');let n=0;
 async function ev(expression){const id=++n;const done=new Promise(r=>{function f(e){const d=JSON.parse(e.data);if(d.id===id){ws.removeEventListener('message',f);r(d.result)}}ws.addEventListener('message',f)});ws.send(JSON.stringify({method:'Runtime.evaluate',id,params:{expression,returnByValue:true}}));const d=await done;if(d.exceptionDetails)throw Error('browser: '+d.exceptionDetails.exception?.description?.slice(0,200));return d.result.value}
 for(let i=0;i<80&&!await ev('!!window.researchSnapshot');i++)await pause(200);
 await ev('const original=Storage.prototype.getItem;Storage.prototype.getItem=function(k){if(k==="app.api.config")return '+JSON.stringify(JSON.stringify({baseUrl:'https://api.deepseek.com',apiKey:key,model:'deepseek-flash',reasoningEffort:'low'}))+';return original.call(this,k)}');
 const q=type==='BAT'?'研究中国动力电池行业。每组只提交一项可验证的核心发现，比较2024与2025年企业销量、国内装车量。产业链从材料到电池再到装车，资料不足标为推断。':'研究中国光伏发电行业。每组只提交一项可验证的核心发现，比较2024与2025年全国新增装机及发电量，区分集中式和分布式。产业链以硅片、电池片、组件、并网应用为范围。';
 await ev('document.querySelector("#composer-input").value='+JSON.stringify(q)+';document.querySelector(".send").click()');
 let state,last='',snap;
 for(let i=0;i<540;i++){await pause(2000);state=await ev('(()=>{const s=researchSnapshot();return [s?.phase,s?.agents.map(a=>a.name+" "+a.status).join(" "),s?.events.at(-1)?.label]})()');if(JSON.stringify(state)!==last){console.log(type,...state);last=JSON.stringify(state)}
 if(state[0]==='failed'||state[0]==='clarify')throw Error(type+' '+await ev('document.querySelector(".conversation").innerText.slice(-400)'));
 if(state[0]==='done')break;}
 assert.equal(state[0],'done');snap=await ev('researchSnapshot()');await writeFile('work/verified-night-'+type+'.json',JSON.stringify(snap));
 assert.equal(snap.agents.at(-1).status,'已完成');assert.ok(snap.reportEdition.conclusions.length);
 await ev('document.querySelector("#report-toggle").click()');
 assert.equal(await ev('document.querySelector("#research-report").open'),true);
 const geo=await ev('(()=>{const r=document.querySelector("#research-report").getBoundingClientRect();return [r.height/innerHeight,r.width/innerWidth,!!document.querySelector("#research-report .composer-dock")]})()');assert.ok(geo[0]>.93&&geo[1]>.93&&!geo[2]);
 const hot=await ev('(()=>{const hit=document.querySelector("#research-pages .edge-hit");if(!hit)return null;hit.dispatchEvent(new PointerEvent("pointerenter"));return [document.querySelectorAll("#research-pages .edge-endpoint").length,document.querySelector("#research-pages .edge-caption").innerText]})()');
 console.log('QA',type,geo,hot,snap.agents.map(a=>a.status));assert.equal(hot?.[0],2);assert.ok(hot[1].includes('→'));
 ws.close();
 }
 const results=await Promise.allSettled([test(first,'BAT'),test(second,'PV')]);for(const r of results)if(r.status==='rejected'){console.log(r.reason.message);process.exitCode=1}
}finally{chrome?.kill();web?.kill();}
