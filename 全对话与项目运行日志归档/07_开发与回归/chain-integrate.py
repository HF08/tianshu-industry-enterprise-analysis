from pathlib import Path
from shutil import copy2
d=Path('work/chain-team-build/天枢工作台')
src=next(Path('D:/wechat/xwechat_files/wxid_lkpn3k6cex7v22_56d9/msg/file/2026-11').glob('产业链分析子代理提示词(1).md'))
copy2(src,d/'industry-chain-agent.md')
def edit(f,fn):
 p=d/f;s=p.read_text('utf-8-sig');p.write_text(fn(s),'utf-8')
def server(s):
 s=s.replace("RPT:'可视化报告代理',","SUPPLY:'产业链分析', RPT:'可视化报告代理',")
 s=s.replace('  const roleText = section(roles[role]);',"""  if(role==='SUPPLY')return [section('共享契约'),await readFile(new URL('./industry-chain-agent.md',import.meta.url),'utf8')];
  const roleText = section(roles[role]);""")
 s=s.replace("    if(action==='plan')","""    if(role==='SUPPLY'&&action==='work')system=parts.join('\\n')+'\\n执行 INDUSTRY_CHAIN_AGENT_V2 的第22节 JSON 契约：summary 放首位，analysis_mode 服从本次任务卡。直接输出顶层 nodes 和 relationships，不再套一层对象。采用 evidence_pack 中实际编号。每一条 F 关系需有可信证据，否则改 I 或 M。控制输出长度；未知项用空数组或明确缺口。cross_checks 仅列互证请求，不宣称已执行。';
    if(action==='plan')""")
 return s.replace("'research-board.js','board-example.json'","'research-board.js','supply-network.js','board-example.json'")
edit('server.mjs',server)
def team(s):
 s=s.replace("RPT:'可视化报告'","SUPPLY:'产业链分析',RPT:'可视化报告'",1).replace("'COMP','RC'","'COMP','SUPPLY','RC'",1).replace("'DEM','RI'","'DEM','SUPPLY','RI'",1)
 s=s.replace("const assignments={","const assignments={SUPPLY:'先建立行业基准链，按企业敞口或行业结构筛选节点，核对有向关系与卡点',")
 s=s.replace("const focus=action==='work'","const focus=role!=='SUPPLY'&&action==='work'")
 s=s.replace('const value=focus?focus.expand(raw):raw;',"""const value=role==='SUPPLY'&&action==='work'?window.supplyNetwork.handoff(raw,data):focus?focus.expand(raw):raw;""")
 a=s.index("        if(['CHAIN','COMP'].includes(id)){");b=s.index('      const evidence=',a)
 s=s[:a]+'''      }
      if(id==='SUPPLY'){
        state(s,id,'运行中','读取共享证据，校准产业活动边界');
        const ledger=await s.ledger;signal.throwIfAborted();
        Object.assign(data,window.supplyNetwork.task(ledger,s.plan,s.research,s.snapshot,s.asOf));
        s.visuals[id]={rows:[],sources:data.evidence_pack.sources,missing:[],evidence:data.evidence_pack.observations};
      }
'''+s[b:]
 a=s.index("      if(['CHAIN','COMP'].includes(id)&&result.chainGraph)");b=s.index('    }catch(e){\n      if(signal.aborted)',a)
 s=s[:a]+s[b:]
 s=s.replace("ids.slice(0,3)","ids.slice(0,-1)").replace("work(s,ids[3],signal)","work(s,ids.at(-1),signal)").replace('等待三个研究角色回报','等待四个研究角色回报').replace('等待四份回报','等待研究与风险回报').replace('与四份团队回报','与团队回报')
 return s.replace("out.taskCard=data;\n    try{","data.chain_summary=s.agentOutput.SUPPLY?.report?.summary;\n    out.taskCard=data;\n    try{")
edit('app/team.js',team)
def board(s):
 s=s.replace("RPT:'可视化报告'","SUPPLY:'产业链分析',RPT:'可视化报告'",1)
 s=s.replace("'ShieldCheck','Activity'","'Network','ShieldCheck','Activity'").replace("'#8fb7ff','#9cd8b1'","'#caaf78','#8fb7ff','#9cd8b1'")
 s=s.replace('ids.slice(0,3)','ids.filter(id=>![\'RC\',\'RI\',\'RPT\'].includes(id))').replace('const riskId=ids[3]','const riskId=ids.find(id=>id===\'RC\'||id===\'RI\')').replace('const w=450','const w=Math.max(450,active.length*149+5)').replace('正在审查三条回报','正在审查研究回报').replace('四份回报已汇总','研究回报已汇总')
 s=s.replace('roles(s).forEach((id,i)=>{const c=panel','roles(s).filter(id=>id!==\'RPT\').forEach((id,i)=>{const c=panel')
 s=s.replace("ids.forEach((id,i)=>rail.append","ids.filter(id=>mode!=='overview'||id!=='RPT').forEach((id,i)=>rail.append")
 s=s.replace("function supply(s,i){const view=el('section','role-sheet');","""function supply(s,i){const view=el('section','role-sheet');const study=s.agentOutput?.SUPPLY?.report?.chainStudy;if(study&&window.supplyNetwork){window.supplyNetwork.mount(view,study,s.verifiedLedger?.sources||{},i);return view;}""")
 return s
edit('app/research-board.js',board)
edit('app/index.html',lambda s:s.replace('<script src="research-board.js">','<script src="supply-network.js"></script>\n<script src="research-board.js">').replace('flex: 0 0 300px; width: 300px','flex: 0 0 clamp(300px,24vw,370px); width: clamp(300px,24vw,370px)'))
edit('app/team.css',lambda s:s.replace('clamp(100px,13vw,215px)','clamp(200px,19vw,300px)').replace('clamp(78px,9vw,155px)','clamp(190px,17vw,275px)')+'\n.atlas .pos4{grid-column:1 / -1;grid-row:3}\n')
edit('app/research-report.js',lambda s:s.replace('graph:s.messages.find','chainStudy:s.agentOutput?.SUPPLY?.report?.chainStudy,chainFailure:s.agentOutput?.SUPPLY?.error,graph:s.messages.find').replace("const chain=section('产业链与关联关系');let plotted=false;", """const chain=section('产业链分析');let plotted=false;
      if(report.chainStudy&&window.supplyNetwork){window.supplyNetwork.mount(chain,report.chainStudy,report.ledger.sources);plotted=true;}
      if(report.chainFailure)el(chain,'p','产业链代理回报缺失：'+report.chainFailure,'meta');""").replace('if(report.graph)plotted','if(!plotted&&report.graph)plotted'))
def prompts(s):
 a=s.index('**COMP 与 CHAIN');b=s.index('**按缺项',a) if '**按缺项' in s[a:] else s.index('1. 一级来源',a)
 return s[:a]+'''**产业链分工。** SUPPLY 是企业与行业分支共用的独立研究角色，和其余三个研究角色并行启动，取得同轮共享资料后按产业链专用提示词执行。企业模式先构建行业基准链，再以标的敞口作二次筛选；行业模式侧重完整结构、卡点与替代路径。COMP、CHAIN 继续承担各自的同行竞争分析。风险层收到四个研究角色的结果后复核，RPT 在原产业链区域呈现 SUPPLY 的成果。详细节点、关系、模式及自检契约见运行时注入的 industry-chain-agent.md。

'''+s[b:]
edit('prompts.md',prompts)
