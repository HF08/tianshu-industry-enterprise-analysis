from pathlib import Path
s=Path('work/live-new-report.mjs').read_text('utf-8-sig')
s=s.replace("const key=process.env.TIANSHU_TEST_TOKEN;delete process.env.TIANSHU_TEST_TOKEN;",'''import http from 'node:http';
import {readFile} from 'node:fs/promises';
const calls=[];
const model=http.createServer(async(req,res)=>{
 let raw='';for await(const c of req)raw+=c;const body=JSON.parse(raw),d=JSON.parse(body.input);let result;
 if(body.instructions.includes('仅填写 type,target,scope,question')){const ind=body.input.includes('动力电池');result={type:ind?'industry':'company',target:ind?'中国动力电池行业':'美的集团',scope:'2021—2025',question:''};}
 else if(d.role==='SUPPLY'){
  calls.push(d);assert.ok(body.instructions.includes('INDUSTRY_CHAIN_AGENT_V2'));const ref=d.evidence_pack.observations[0].id;
  result={agent_id:'INDUSTRY_CHAIN_AGENT_V2',summary:'产业活动边界核对',status:'partial',analysis_mode:d.analysis_mode,selection_adjustment:{retained_node_ids:['up','mid','down']},nodes:['up','mid','down'].map((id,i)=>({node_id:id,name:['材料供给','生产制造','应用交付'][i],stage:['upstream','midstream','downstream'][i],claim_type:'I',description_35_60:'测试节点说明',evidence_ids:[ref]})),relationships:[{source_node_id:'up',target_node_id:'mid',relation_type:'supply',claim_type:'I',evidence_ids:[ref]}],evidence_gaps:['模拟资料']};
 }else if(d.catalogue){result={conclusions:[{text:'核对观测 {{'+d.catalogue[0].id+'}}',refs:[d.catalogue[0].id]}],risks:[],gaps:[]};}
 else if(d.role){calls.push(d);result={status:'partial',summary:'已核对资料',agent_analysis:'角色研究记录',artifacts:[],risk_findings:[],missing:[]};}
 else result='汇总完成。';
 const t=typeof result==='string'?result:JSON.stringify(result);res.writeHead(200,{'content-type':'text/event-stream'});res.end('data: '+JSON.stringify({type:'response.output_text.delta',delta:t})+'\\n\\ndata: '+JSON.stringify({type:'response.completed',response:{output:[]}})+'\\n\\n');
});model.listen(0,'127.0.0.1');await once(model,'listening');
''').replace('work/new-report-base/天枢团队审查包/天枢工作台','work/chain-team-build/天枢工作台').replace("baseUrl:'https://api.deepseek.com',apiKey:key,model:'deepseek-flash'","baseUrl:'http://127.0.0.1:'+model.address().port,apiKey:'',model:'dfmodel'")
s=s.replace('每组只提交一项可验证的核心发现','综合分析')
i=s.index(" await ev('document.querySelector(\"#composer-input\").value=")
s=s[:i]+''' const ledger=JSON.parse(await readFile('work/verified-new-'+type+'.json')).verifiedLedger;
 await ev('const ledger='+JSON.stringify(ledger)+';const realFetch=fetch;window.fetch=(url,opts)=>url==="/api/kernel"?Promise.resolve(new Response(JSON.stringify({type:"result",ledger})+"\\\\n")):realFetch(url,opts);');
'''+s[i:]
i=s.index("assert.equal(state[0],'done')");j=s.index('ws.close();',i)
s=s[:i]+'''assert.equal(state[0],'done');snap=await ev('researchSnapshot()');assert.equal(snap.agents.length,6);assert.equal(snap.agents.find(a=>a.id==='SUPPLY').status,'已完成');
 const mode=type==='FIN'?'enterprise':'industry';assert.equal(snap.agentOutput.SUPPLY.report.chainStudy.analysis_mode,mode);
 assert.equal(calls.find(c=>c.role===(type==='FIN'?'RC':'RI')).upstream.length,4);
 await ev('document.querySelector("#board-modes [data-mode=overview]").click()');
 assert.equal(await ev('document.querySelectorAll("#board-rail [data-role=RPT], .atlas [data-role=RPT]").length'),0);
 assert.equal(await ev('document.querySelectorAll(".atlas-spine button").length'),2);
 await ev('[...document.querySelectorAll(".atlas-spine button")].find(b=>b.textContent==="产业链分析").click()');assert.ok(await ev('!!document.querySelector("#trace-scroll .chain-study svg")'));
 await ev('document.querySelector("#report-toggle").click()');assert.equal(await ev('document.querySelectorAll("#research-pages .chain-study").length'),1);assert.equal(await ev('document.querySelectorAll("#research-pages .chain-study svg g[role=button]").length'),3);
 console.log("PASS "+mode+" parallel dispatch, four upstream handoffs, merged overview, booklet filter, live report network");
 '''+s[j:]
s=s.replace('chrome?.kill();web?.kill();','chrome?.kill();web?.kill();model.closeAllConnections();model.close();')
Path('work/verify-chain-agent.mjs').write_text(s,'utf-8')
