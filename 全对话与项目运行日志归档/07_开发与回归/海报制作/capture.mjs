import fs from 'node:fs/promises';import {once} from 'node:events';import {spawn} from 'node:child_process';import {resolve} from 'node:path';import {tmpdir} from 'node:os';import {pathToFileURL} from 'node:url';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const dir=resolve('work/poster');let chrome,web,ws;
try{
web=spawn(process.execPath,['server.mjs'],{cwd:resolve(dir,'black/app'),env:{...process.env,TIANSHU_PORT:'0'}});const [msg]=await once(web.stdout,'data');let url=msg.toString().match(/http:\/\/[^\s]+/)[0];
chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--allow-file-access-from-files','--remote-debugging-port=19387','--user-data-dir='+await fs.mkdtemp(resolve(tmpdir(),'ts-poster-')),url],{stdio:'ignore'});
let page;for(let i=0;i<100&&!page;i++){try{page=(await(await fetch('http://localhost:19387/json')).json()).find(x=>x.url===url+'/')}catch{}await wait(100)}
ws=new WebSocket(page.webSocketDebuggerUrl);await once(ws,'open');let seq=0;
async function cmd(method,params={}){const id=++seq;const pr=new Promise(r=>{function f(e){let d=JSON.parse(e.data);if(d.id===id){ws.removeEventListener('message',f);r(d)}}ws.addEventListener('message',f)});ws.send(JSON.stringify({method,params,id}));let d=await pr;if(d.error)throw Error(JSON.stringify(d.error));return d.result;}
async function ev(expression){let d=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(d.exceptionDetails)throw Error(d.exceptionDetails.exception?.description);return d.result.value;}
async function viewport(width,height,scale=1){await cmd('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:scale,mobile:false});}
async function shot(file,clip){await wait(250);let p=await cmd('Page.captureScreenshot',{format:'png',...(clip?{clip:{...clip,scale:1}}:{})});await fs.writeFile(file,Buffer.from(p.data,'base64'));}
if(process.argv[2]==='poster'){
 await viewport(1200,1600,2);await cmd('Page.navigate',{url:pathToFileURL(resolve(dir,'poster.html')).href});await wait(500);await ev('document.fonts.ready');await shot(resolve('outputs/天枢-参赛海报预览.png'));await viewport(1200,1600,.65);await shot(resolve(dir,'small.png'));
}else{
await viewport(1260,640,1.6);let snap=JSON.parse(await fs.readFile(resolve(dir,'black/case.json'),'utf8'));
await ev('posterFrame('+JSON.stringify(snap)+',"work")');await wait(500);await shot(resolve(dir,'main.png'));
await viewport(1460,850,1.5);await ev('document.querySelector("#board-modes [data-mode=overview]").click()');await wait(400);
const rect=await ev('(()=>{let r=document.querySelector(".atlas").getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}})()');console.log(rect);await shot(resolve(dir,'overview.png'),rect);
await viewport(1070,760,1.6);await cmd('Page.navigate',{url:pathToFileURL(resolve('work/poster/restored/中国光伏发电行业-实跑报告.html')).href});await wait(600);
let geo=await ev('(()=>{let nodes=[...document.querySelectorAll(".research-prose .metric-link")],n=nodes.find(n=>/^45[.,]/.test(n.textContent))||nodes.find(n=>n.textContent.includes("317"));n.scrollIntoView({block:"center"});return n.getBoundingClientRect().toJSON()})()');
await cmd('Input.dispatchMouseEvent',{type:'mouseMoved',x:geo.x+5,y:geo.y+5});await wait(250);
let tip=await ev('document.querySelector(".report-tip.open")?.getBoundingClientRect().toJSON()');console.log(geo,tip);if(!tip)throw Error('missing tooltip');let x=Math.max(0,Math.min(geo.x-95,1070-700,tip.x-20));let y=Math.max(0,Math.min(geo.y-60,760-260,tip.y-16));await shot(resolve(dir,'evidence.png'),{x,y,width:Math.min(1070-x,Math.max(700,tip.right-x+35)),height:Math.max(260,tip.bottom-y+25)});
}
}finally{ws?.close();chrome?.kill();web?.kill();}
