from pathlib import Path
d=Path('work/poster/sidebar-build');app=d/'天枢工作台/app'
p=app/'research-board.js';s=p.read_text('utf-8-sig');i=s.index('  function panel(');s=s[:i]+"""  function roleCard(s,id,click){
    const a=s.agents.find(a=>a.id===id)||{},out=s.agentOutput?.[id],entry=selected(s,id);
    const status=a.status||'等待中';
    const description=status==='失败'?(out?.error||a.task):status==='已完成'?(out?.report?.summary||a.task||entry.text):(a.task||entry.text);
    const card=button('compact-role','',click);card.dataset.role=id;card.dataset.status=status;
    card.setAttribute('aria-pressed',String(s.view===id||s.boardMode==='detail'&&s.boardId===id));
    const head=el('span','compact-head');head.append(el('i','compact-dot'),el('b','',names[id]||a.name||id),el('small','',status));
    const note=el('span','compact-note',description||'等待派发');card.title=note.textContent;card.append(head,note);return card;
  }
"""+s[i:];s=s.replace("    const entry=selected(s,id),f=fact", "    if(mode==='thumb')return roleCard(s,id,click);\n    const entry=selected(s,id),f=fact",1)
a=s.index("    const header=el('header','running-header'");b=s.index('    }return list;',a)
s=s[:a]+"""    const header=el('header','running-header');header.append(el('h2','','子智能体'),el('small','',agents.length+' 个'));list.append(header);
    if(!agents.length)list.append(el('p','board-note','等待派单'));
    for(const a of agents){list.append(roleCard(s,a.id,()=>{if(document.querySelector('#agent-panel')&&!s.replay){const toggle=document.querySelector('#toggle-agents');if(toggle?.getAttribute('aria-expanded')==='false')toggle.click();document.dispatchEvent(new CustomEvent('agent-selected',{detail:{role:a.id}}));}else detail(a.id);}));
"""+s[b:];p.write_text(s,'utf-8')
css="""
.running-cards,#board-rail,.agents-panel{background:#1d1d1e;color:#ddd}
.running-cards{gap:10px;padding:12px 14px;display:grid;grid-template-columns:minmax(0,1fr)}
.running-header{padding:4px 0 9px;color:#aaa}.running-header h2{font-size:14px;font-weight:500}
.compact-role,#agent-list .agent-card{box-sizing:border-box;width:100%;border:1px solid #39393c;background:#232325;border-radius:12px;padding:12px 14px;text-align:left;color:#ddd;min-width:0}
.compact-role{display:block}.compact-role:hover,#agent-list .agent-card:hover{background:#29292d}.compact-role[aria-pressed=true],#agent-list .agent-card.selected{border-color:#6779ff;background:#282930}
.compact-role:focus-visible,#agent-list .agent-card:focus-visible{outline:2px solid #8191ff;outline-offset:1px}
.compact-head{display:flex;gap:8px;align-items:center}.compact-head b{font-size:14px;font-weight:550;min-width:0}.compact-head small{margin-left:auto;white-space:nowrap;color:#a3a3a6}
.compact-dot{width:8px;height:8px;border-radius:100%;background:#777;flex:none}.compact-role[data-status="已完成"] .compact-dot{background:#4bb75c}
.compact-role[data-status="运行中"] .compact-dot{background:#7295ff}.compact-role[data-status="失败"] .compact-dot{background:#f16b67}
.compact-note,#agent-list .agent-task{display:block;margin-top:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#9b9ba0;font-size:12.5px;line-height:1.6}
#board-rail .compact-role{margin-bottom:9px}.app .agents-panel.open{width:clamp(294px,28vw,430px);flex-basis:clamp(294px,28vw,430px)}
@media(max-width:750px){.app .agents-panel.open{position:absolute;inset:0 0 0 auto;z-index:42;width:min(350px,82vw)}}
"""
for p in [app/'team.css',d/'演示工具/feed.css']:p.write_text(p.read_text('utf-8-sig')+css,'utf-8')
