from pathlib import Path
d=Path('work/reading-view');p=d/'天枢工作台/app/research-board.js';s=p.read_text('utf-8')
a=s.index('view.append(head,prose(summary(s,id)));');b=s.index("    if(out.error)",a)
s=s[:a]+"""view.append(head);
    const isResearch=['FIN','BIZ','COMP','RC','IND','CHAIN','DEM','RI'].includes(id);
    const analysis=r.agent_analysis||out.analysis;
    if(isResearch){
      const reading=el('article','role-reading'),verdict=cornerResult(s,id),seen=new Set();
      const add=text=>{if(typeof text!=='string'||!text.trim()||seen.has(text.trim()))return;seen.add(text.trim());reading.append(prose(text));};
      reading.append(el('h3','reading-verdict',verdict.title));seen.add(verdict.title);
      if(r.summary){
        add(verdict.support);add(r.summary);add(analysis);
        if(!analysis)for(const finding of [...(r.artifacts||[]),...(r.risk_findings||[])])for(const c of finding.claims||[])add(c.text);
        const gaps=(r.missing||[]).map(x=>typeof x==='string'?x:x?.impact||x?.field).filter(Boolean);
        if(gaps.length){reading.append(el('h4','','仍需核实'));add(gaps.slice(0,2).join('；'));}
      }else add(out.error||summary(s,id));
      view.append(reading);
    }else{
      view.append(prose(summary(s,id)));
      if(analysis)view.append(fold('研究说明全文',null,()=>prose(analysis)));
    }
"""+s[b:]
s=s.replace("includes(k)));","includes(k)));",1)
s=s.replace("'artifacts','risk_findings','evidence','calculations','missing'].includes(k)","'artifacts','risk_findings','evidence','calculations','missing','overview_card'].includes(k)")
s=s.replace("String(b.dataset.mode===mode)","String(b.dataset.mode===(mode==='work'?'work':'overview'))")
p.write_text(s,'utf-8')
for p in [d/'天枢工作台/app/index.html',d/'演示工具/player.html']:
 s=p.read_text('utf-8-sig');a=s.index('>',s.index('<nav id="board-modes"'))+1;b=s.index('</nav>',a)
 p.write_text(s[:a]+'<span class="mode-switch-frame">'+s[a:b]+'</span>'+s[b:],'utf-8')
css="""
#board-modes .mode-switch-frame{display:inline-flex;align-items:stretch;max-width:100%;gap:4px;padding:4px;background:#0e1a20;border:1px solid #567078;border-radius:11px;box-shadow:0 2px 6px #0004}
#board-modes .mode-switch-frame button{flex:1 1 auto;white-space:nowrap;min-height:32px;color:#c5d2d5}
#board-modes .mode-switch-frame button[aria-pressed="true"]{background:#294d46;border-color:#7fbcab;color:#e3fff3;font-weight:650}
#board-modes .mode-switch-frame button:focus-visible{outline:2px solid #d9edbd;outline-offset:-3px}
.role-sheet .role-reading{margin:16px 0 22px;padding:0 0 14px;border-bottom:1px solid #374c57}
.role-sheet .role-reading h3.reading-verdict{font-size:clamp(19px,2vw,28px);line-height:1.45;color:#eef6f3;margin:.4em 0}
.role-sheet .role-reading .reading-prose{font-size:15px;line-height:1.85;max-width:78ch}
.role-sheet .role-reading h4{margin:16px 0 4px;color:#dfc399}
"""
for p in [d/'天枢工作台/app/team.css',d/'演示工具/final-board.css']:
 p.write_text(p.read_text('utf-8-sig')+css,'utf-8')
