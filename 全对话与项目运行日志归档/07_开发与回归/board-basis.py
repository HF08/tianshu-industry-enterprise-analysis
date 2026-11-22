from pathlib import Path
b=Path('work/plum-evidence');p=b/'天枢工作台/app/research-board.js';s=p.read_text('utf-8');i=s.index('    const series=groups(data.rows,id);')
s=s[:i]+"""    if(isResearch){
      const ledger=s.verifiedLedger||{},obs=new Map([...(ledger.observations||[]),...(ledger.interim||[])].map(o=>[o.id,o]));
      const candidates=(data.rows||[]).filter(r=>Number.isFinite(r.value)&&r.inputs?.length).slice().sort((a,b)=>String(b.year||b.period).localeCompare(String(a.year||a.period)));
      const kinds=new Set();for(const r of candidates){
        const input=r.inputs.length===1?obs.get(r.inputs[0]):null;
        const formula=r.formula&&r.formula!==input?.field?r.formula:input?.formula;
        const kind=formula?'计算':'提取';if(kinds.has(kind))continue;
        const src=ledger.sources?.[input?.source]||data.sources?.[input?.source];
        if(!formula&&!src)continue;
        kinds.add(kind);const block=el('div','role-basis');
        block.append(el('b','',kind+' · '+r.name),el('span','',[r.year||r.period,r.dimension,fmt(r.value)+' '+r.unit].filter(Boolean).join(' · ')));
        if(formula)block.append(el('small','','公式：'+formula));
        else{const url=evidencePages.safe(src.url||src.url_or_document);const ref=el(url?'a':'small','',src.title||src.table||src.publisher||'本轮资料');if(url){ref.href=url;ref.target='_blank';ref.rel='noopener noreferrer';}block.append(ref,el('small','',src.locator||input.field));}
        view.insertBefore(block,view.querySelector('.doc-fold'));if(kinds.size===2)break;
      }
    }
"""+s[i:];p.write_text(s,'utf-8')
css="""
.role-basis{border-inline-start:3px solid #ac4e74;background:linear-gradient(110deg,#fff8fa,#f5e7f1);padding:8px 12px;margin:8px 0}
.role-basis>*{display:block}.role-basis small,.role-basis a{font-size:12px}
#trace-pane .atlas .board-card.corner{background:linear-gradient(120deg,#fff 4%,#fff5f6 54%,#f0d3e1);border-color:#c798ad}
#trace-pane .atlas .board-card.corner:nth-child(even){background:linear-gradient(120deg,#fff 4%,#faf1f8 54%,#eacde3)}
"""
for p in [b/'天枢工作台/app/team.css',b/'演示工具/feed.css']:p.write_text(p.read_text('utf-8')+css,'utf-8')
