from pathlib import Path
app=Path('work/night-industry/天枢工作台')
def edit(f,fn):
 p=app/f;p.write_text(fn(p.read_text('utf-8-sig')),'utf-8')
edit('kernel.mjs',lambda s:"import {sectorFor} from './sector-data.mjs';\n"+s.replace("const label=/动力电池|锂离子电池|锂电池/.test(ctx.target)?'电池':","const sector=sectorFor(ctx.target);const label=sector==='pv'?'光伏设备':sector==='li'?'电池':").replace("(/锂电|动力电池|锂离子/.test(ctx.target)?'850760':null)","(sector==='li'?'850760':null)"))
edit('disclosures.mjs',lambda s:"import {sectorFor,fetchSectorDisclosures} from './sector-data.mjs';\n"+s.replace("const battery=isBattery(ctx.target);","const sector=sectorFor(ctx.target),battery=sector==='li';").replace("const name=isBattery(ctx.target)?","const name=sectorFor(ctx.target)?").replace(" try{await(role==='FIN'?annualReports:nationalStats)(ctx);}"," if(role==='IND'&&sector)await fetchSectorDisclosures(ctx,sector,ingest);\n try{await(role==='FIN'?annualReports:nationalStats)(ctx);}"))
edit('metrics.mjs',lambda s:s.replace("IND:'产量 销量","IND:'新增并网装机 期末累计装机 发电量 光伏发电利用率 产量 销量"))
edit('app/role-tools.js',lambda s:s.replace("'市场规模','销量','销量同比','国产化率'","'市场规模','新增并网装机','期末累计装机','发电量','销量','销量同比','国产化率'"))
edit('app/supply-network.js',lambda s:s.replace('/产能|产量|销量|原料','/并网|装机|发电量|产能|产量|销量|原料'))
edit('app/research-report.js',lambda s:s.replace("['市场规模','销量','装车量','CR5','原料价格','产量']","['市场规模','新增并网装机','销量','装车量','CR5','原料价格','产量']").replace("['销量','装车量','CR5']","['新增并网装机','销量','装车量','CR5']").replace("const dock=$('.composer-dock'),home=document.createComment('composer-dock');dock.before(home);","const dock=$('.composer-dock');").replace("    function restoreDock(){if(dock.parentNode===dialog)home.after(dock);}\n","").replace("restoreDock();","").replace("draw();dialog.append(dock);dialog.showModal()","draw();dialog.showModal()").replace("chips();dismiss();if(compose)","chips();dismiss();$('#report-exit').title='关闭报告，输入框中已有 '+s.citations.length+' 项引用';if(compose)"))
p=app/'app/research-report.css';p.write_text(p.read_text('utf-8')+"""
#research-report[open]{width:calc(100vw - 24px);max-width:1700px;height:calc(100dvh - 20px);max-height:calc(100dvh - 20px);margin:auto}
#research-report header{padding-block:8px}
#research-report #research-pages{flex:1;min-height:0;padding-block:12px;scrollbar-gutter:stable}
.chain-study .edge-endpoint rect{stroke:#ffe0a0;stroke-width:3;filter:drop-shadow(0 0 3px #e6b66b)}
.chain-study .edge-caption{min-height:1.6em;color:#eed0a0}
""",'utf-8')
edit('app/supply-network.js',lambda s:s.replace("    function diagram(related){","    const edgeCaption=el(root,'p','悬停连线可查看关系方向','edge-caption');edgeCaption.setAttribute('aria-live','polite');\n    function diagram(related){\n      edgeCaption.textContent='悬停连线可查看关系方向';const nodeShapes=new Map();").replace("        svg('path',{d:'M'+x","        const visible=svg('path',{d:'M'+x").replace("      for(const n of nodes){const [x,y]=positions", "      for(const n of nodes){const [x,y]=positions").replace("g.style.cursor='pointer';g.onclick", "nodeShapes.set(n.node_id,g);g.style.cursor='pointer';g.onclick").replace("""'url(#'+markerId+')'});
      }""","""'url(#'+markerId+')'});
        const label=lookup.get(e.source_node_id).name+' → '+lookup.get(e.target_node_id).name+' · '+(types[e.relation_type]||e.relation_type)+(e.direction_label?' · '+e.direction_label:'')+' ['+e.claim_type+']';
        const hit=svg('path',{class:'edge-hit',d:visible.getAttribute('d'),stroke:'transparent','stroke-width':16,fill:'none','pointer-events':'stroke',tabindex:0,role:'button','aria-label':label});
        function light(on){
          for(const id of [e.source_node_id,e.target_node_id])nodeShapes.get(id)?.classList.toggle('edge-endpoint',on);
          visible.setAttribute('stroke',on?'#ffe0a0':related.includes(e)?'#73dcc4':'#7c929b');
          edgeCaption.textContent=on?label:'悬停连线可查看关系方向';
        }
        hit.onpointerenter=hit.onfocus=hit.onclick=()=>light(true);hit.onpointerleave=hit.onblur=()=>light(false);
      }"""))
p=app/'prompts.md';s=p.read_text('utf-8');s=s.replace('### 来源、证据与口径','''### 来源、证据与口径

行业任务先识别细分行业和统计层级。锂电：分别列全用途锂离子电池、动力/储能/消费型、国内装车、企业销量（含出口），用工信部与协会统计互证；HS850760锂离子蓄电池净重不等于动力专属GWh。光伏：按多晶硅（万吨）、硅片、电池片、组件（GW）、新增并网与年末累计装机（GW）、发电量（TWh）逐项取证。累计装机为时点、新增装机为期间量，并网功率不等于制造销量；发电利用率不能作为制造产能利用率。绝不能将上下游产量相加。季累计与年度单列。国家能源局装机口径、工信部制造公报和上市分类样本营收各自说明分母；资料不足时指明要补哪个环节和原表，不能拿上位行业营收凑市场规模。''');p.write_text(s,'utf-8')
