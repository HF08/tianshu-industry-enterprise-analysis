from pathlib import Path
s=Path('work/test-independent.mjs').read_text('utf-8-sig').replace("resolve('outputs/Tianshu-Team')","resolve('outputs/Tianshu-Report')").replace("i<800","i<1900")
a=s.index(" if(sys.includes('用户正在");b=s.index(" res.writeHead(200,{'content-type':'text/event-stream'});",a)
s=s[:a]+""" if(sys.includes('仅进行路由')){
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
"""+s[b:]
a=s.index(' const report={type:');b=s.index(' ws.close();',a)
s=s[:a]+""" assert.equal(await ev('document.querySelector("#report-toggle").disabled'),true);
 await send('分析美的集团');
 await until(has('已完成本次汇总'));
 const click=sel=>ev('document.querySelector('+JSON.stringify(sel)+').click()');
 await click('#report-toggle');
 assert.equal(await ev('document.querySelector("#live-report-title").innerText'),'美的集团研究报告');
 assert.equal(await ev('document.querySelectorAll(".agent-card").length'),5);
 assert.equal(await ev('document.querySelector("#report-stamp").textContent.includes("报告代理汇编")'),true);
 assert.ok(await ev('document.querySelectorAll("#research-pages .bars button").length')>=8);
 assert.ok(await ev('document.querySelector("#research-pages").innerText.includes("美的集团") || document.querySelector("#live-report-title").innerText.includes("美的集团")'));
 await click('.report-kpis button');
 await until('document.querySelector("#research-source").open && !!document.querySelector("#proof-body a")');
 assert.ok(await ev('document.querySelector("#proof-body").textContent.includes("收入")'));
 assert.ok(await ev('[...document.querySelectorAll("#proof-body a")].some(a=>/cninfo/.test(a.href))'));
 await click('#proof-body button.primary');
 assert.ok(await ev('document.querySelector("#composer-attach").innerText.includes("营业收入")'));
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
"""+s[b:]
Path('work/test-real-report.mjs').write_text(s,'utf-8')
