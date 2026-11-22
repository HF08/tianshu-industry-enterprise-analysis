import {spawnSync} from 'node:child_process';import {pathToFileURL} from 'node:url';import {resolve} from 'node:path';import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';import assert from 'node:assert/strict';
const html=readFileSync('outputs/美的集团-四板块交互预览.html','utf8');
for(const [key,sel,txt] of [['finance','.col','2021'],['business','.tile:nth-child(2)','商业及工业解决方案'],['chain','.row:nth-last-child(2)','格力电器'],['risk','.switch button:nth-child(2)','存货周转天数']]){
const file=resolve('work/test-midea-'+key+'.html');writeFileSync(file,html.replace('</html>', '<script>document.querySelector('+JSON.stringify(sel)+').click();document.body.dataset.test=document.querySelector("aside").textContent.includes('+JSON.stringify(txt)+')&&!document.body.innerText.includes("NaN");</script></html>'));
const r=spawnSync('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--user-data-dir='+mkdtempSync(resolve('work/midea-browser-')),'--window-size=1366,768','--dump-dom',pathToFileURL(file).href+'#'+key],{encoding:'utf8',timeout:15000});assert.match(r.stdout,/data-test="true"/);console.log('PASS '+key);
}
