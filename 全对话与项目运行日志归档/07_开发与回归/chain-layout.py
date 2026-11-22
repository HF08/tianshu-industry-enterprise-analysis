from pathlib import Path
p=Path('work/chain-team-build/天枢工作台/app/research-board.js');s=p.read_text('utf-8').replace("roles(s).filter(id=>id!=='RPT').forEach","roles(s).filter(id=>!['RPT','SUPPLY'].includes(id)).forEach").replace("ids.filter(id=>mode!=='overview'||id!=='RPT')","ids.filter(id=>id!=='RPT')").replace("ids.forEach(id=>body.append(roleDetail(s,id)))","ids.filter(id=>id!=='RPT').forEach(id=>body.append(roleDetail(s,id)))")
a=s.index("['上游产业分析',s.plan?.target||'研究标的','下游产业分析'].forEach");b=s.index('g.append(spine)',a)
s=s[:a]+"""const targetButton=button('spine-node n1',s.plan?.target||'研究标的',()=>stage(1));const chainButton=button('spine-node n0','产业链分析',()=>stage('chain'));spine.append(targetButton,chainButton);"""+s[b:]
s=s.replace("stage:['上游产业分析'", "stage:s.boardId==='chain'?'产业链分析':['上游产业分析'")
s=s.replace("if(study&&window.supplyNetwork){","if(i==='chain'&&!study){if(s.agents.some(a=>a.id==='SUPPLY')){view.append(el('p','board-note',s.agentOutput?.SUPPLY?.error||'等待产业链分析回报'));}else{[0,1,2].forEach(j=>view.append(supply(s,j)));}return view;}if(i!=='1'&&i!==1&&study&&window.supplyNetwork){")
p.write_text(s,'utf-8')
p=Path('work/chain-team-build/天枢工作台/app/team.css');s=p.read_text('utf-8');p.write_text(s+"""
.chain-lanes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.chain-study{margin:12px 0}.chain-lanes section,.chain-info{border:1px solid #455459;padding:10px;border-radius:8px}
.chain-study button,.chain-study select{padding:5px 9px;margin:3px;color:inherit;border:1px solid #617178;border-radius:5px;background:#233036}
.chain-study .connected{border-color:#80a59a}.chain-study button[aria-pressed=true]{outline:2px solid #86d8be}.chain-info{margin-top:10px}.chain-info a{margin:5px;color:#a9caf5}
@media(max-width:560px){.chain-lanes{grid-template-columns:1fr}}
""",'utf-8')
