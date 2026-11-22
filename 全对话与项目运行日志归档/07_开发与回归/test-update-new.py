from pathlib import Path
p=Path('work/live-new-report.mjs');s=p.read_text('utf-8-sig')
s=s.replace('const second=', '''const maxTest=await fetch(site+'/api/stream',{method:'POST',headers:{Origin:site,'Content-Type':'application/json'},body:JSON.stringify({role:'TS',action:'answer',config:{baseUrl:'https://api.deepseek.com',apiKey:key,model:'DeepSeek-V4.1-Flash-1017',reasoningEffort:'xhigh'},context:{question:'只回答：测试通过。'}})});
 assert.ok(maxTest.ok);const maxBody=await maxTest.text();const maxEvent=maxBody.split('\\n').filter(l=>l.startsWith('data: ')).map(l=>JSON.parse(l.slice(6))).find(e=>e.type==='response.completed');
 assert.equal(maxEvent.response.reasoning.effort,'max');assert.ok(maxEvent.response.usage.total_tokens>0);console.log('VERIFIED legacy xhigh config => official max, model',maxEvent.response.model, maxEvent.response.usage);
 const second=''')
s=s.replace("await ev('document.querySelector(\".report-kpis button\").click();document.querySelector(\".rf-menu.open button:nth-child(2)\").click()');","await ev('document.querySelector(\".research-prose .metric-link\").dispatchEvent(new MouseEvent(\"contextmenu\",{bubbles:true,cancelable:true}));document.querySelector(\".rf-menu.open button:nth-child(2)\").click()');")
s=s.replace('.finding-card .metric-link','.research-prose .metric-link')
s=s.replace("console.log('VERIFIED',type", """assert.ok(await ev('document.querySelector("#st-tokens").textContent!=="—" && document.querySelector("#st-cache").textContent.includes("%") && document.querySelector("#st-wave").title.includes("字符/秒")'));
 if(type==='FIN'){
  await ev('document.querySelector("#report-toggle").click();document.querySelector("#report-update").click()');
  for(let i=0;i<500;i++){await pause(1500);if(await ev('researchSnapshot().phase==="done"'))break;}
  await ev('document.querySelector("#report-toggle").click()');
  assert.equal(await ev('document.querySelector("#report-version").options.length'),2);
  assert.ok(await ev('document.querySelector("#research-pages").innerText.includes("与上一版本比较")'));console.log('VERIFIED report update and retained versions');
 }
 console.log('VERIFIED',type""")
Path('work/live-new-final.mjs').write_text(s,'utf-8')
