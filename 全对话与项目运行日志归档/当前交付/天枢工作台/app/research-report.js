window.researchReport=(()=>{
  const $=s=>document.querySelector(s);
  function el(parent,tag,text,cls){const node=document.createElement(tag);if(text!=null)node.textContent=text;if(cls)node.className=cls;parent.append(node);return node;}
  const fmt=n=>typeof n==='number'?n.toLocaleString('zh-CN',{maximumFractionDigits:2}):String(n);
  const display=r=>r.unit==='元'?fmt(r.value/1e8)+' 亿元':fmt(r.value)+' '+(r.unit||'');
  function catalogue(ledger,competition){
    const candidates=[...ledger.metrics,...ledger.interim.map(o=>({name:o.field,value:o.value,year:o.period,unit:o.unit,dimension:o.dimension||'',inputs:[o.id]}))];
    for(const r of competition?.rows||[])if(r.name==='同业候选营收相对倍数'||r.name==='代表企业样本营收占比')candidates.push(r);
    return candidates.filter(r=>r.inputs?.length&&['number','string'].includes(typeof r.value)).map((r,i)=>({...r,id:'D'+(i+1)}));
  }
  function prepare(s,ledger,competition){
    const rows=catalogue(ledger,competition);
    return {target:s.plan.target,type:s.plan.type,scope:s.plan.scope,question:s.research,asOf:s.asOf,snapshot:s.snapshot,ledger,rows,
      chainStudy:s.agentOutput?.SUPPLY?.report?.chainStudy,chainFailure:s.agentOutput?.SUPPLY?.error,graph:s.messages.find(m=>m.result?.chainGraph)?.result.chainGraph,
      failures:s.messages.filter(m=>m.error).map(m=>m.from+'：'+m.error)};
  }
  function valid(result,rows){
    const ids=new Set(rows.map(r=>r.id));
    if(!Array.isArray(result?.conclusions)||!Array.isArray(result?.risks)||result.conclusions.length>4||result.risks.length>2)return false;
    if(new Set(result.conclusions.map(x=>x?.section)).size!==result.conclusions.length)return false;
    if(result.conclusions.some(x=>!['summary','performance','quality','credit'].includes(x?.section))||result.risks.some(x=>x?.section!=='risk'))return false;
    if([...result.conclusions,...result.risks].some(x=>typeof x.judgment!=='string'||!x.judgment.trim()||!Array.isArray(x.refs)||x.refs.length>5))return false;
    return ['conclusions','risks'].every(k=>Array.isArray(result?.[k])&&result[k].every(x=>x&&typeof x.text==='string'&&x.text.trim()&&Array.isArray(x.refs)&&x.refs.length&&x.refs.every(id=>ids.has(id))&&[...((x.text||'')+' '+(x.counter||'')).matchAll(/\{\{(D\d+)\}\}/g)].every(m=>x.refs.includes(m[1]))))&&Array.isArray(result.gaps)&&result.gaps.every(x=>typeof x==='string')&&(!ids.size||result.conclusions.length>0);
  }
  function bind(session){
    const dialog=$('#research-report'),source=$('#research-source'),panel=$('#research-pages'),toggle=$('#report-toggle');
    let report,active,stack=[],observations=new Map(),origin=null;
    const dock=$('.composer-dock');
    const citationStatus=el(dialog.querySelector('header'),'small',null,'report-citation-status');
    citationStatus.setAttribute('role','status');
    function toggleLabel(open){const text=open?'收起报告':'展开报告';$('#report-toggle-label').textContent=text;toggle.title=text;toggle.setAttribute('aria-label',text);toggle.setAttribute('aria-expanded',String(open));}
    const tip=el(dialog,'div',null,'report-tip');tip.id='report-hover-preview';tip.setAttribute('role','tooltip');
    const menu=el(dialog,'div',null,'rf-menu');menu.setAttribute('aria-label','数据操作');
    const citeItem=el(menu,'button','引用','rf-menu-item'),sourceItem=el(menu,'button','查看来源','rf-menu-item');
    function hideTip(){tip.classList.remove('open');}
    function dismiss(restore=false){hideTip();menu.classList.remove('open');if(restore&&origin?.isConnected)origin.focus({preventScroll:true});hideTip();}
    function close(){dismiss();stack=[];if(source.open)source.close();if(dialog.open)dialog.close();toggleLabel(false);}
    function place(node,x,y){
      const rect=node.getBoundingClientRect(),w=document.documentElement.clientWidth,h=window.innerHeight;
      node.style.left=Math.max(6,Math.min(w-rect.width-6,x+rect.width+14>w?x-rect.width-8:x+8))+'px';
      node.style.top=Math.max(6,Math.min(h-rect.height-6,y+rect.height+18>h?y-rect.height-8:y+12))+'px';
    }
    function provenance(r){
      const o=r.inputs?.length===1?observations.get(r.inputs[0]):null;
      const formula=o?.formula&&(!r.formula||r.formula===o.field)?o.formula:r.formula;
      if(r.claim)return {label:'分析推断'};
      if(formula&&(!o||formula!==o.field))return {label:'计算',formula,inputs:o?.formula===formula?o.inputs:r.inputs};
      return {label:'提取'};
    }
    function evidence(r){
      const docs=new Set(),seen=new Set();
      function visit(id){if(seen.has(id))return;seen.add(id);const o=observations.get(id);if(o?.source&&report.ledger.sources[o.source])docs.add(report.ledger.sources[o.source]);(o?.inputs||[]).forEach(visit);}
      r.inputs.forEach(visit);return [...docs];
    }
    function citeRow(r,compose=false){
      const s=session(),key=report.snapshot+'/'+r.id,label=r.claim?r.value:r.name+' · '+r.year;
      const urls=evidence(r).map(d=>d.url||d.url_or_document).filter(Boolean);
      const c={key,label,text:[report.target,report.snapshot,label,r.dimension,display(r),r.formula,...urls].filter(Boolean).join(' | ')};
      s.citations||=[];if(!s.citations.some(v=>v.key===key))s.citations.push(c);
      chips();position();dismiss();$('#report-exit').title='关闭报告，输入框中已有 '+s.citations.length+' 项引用';if(compose){if(source.open)source.close();$('#composer-input').focus();}
    }
    function sync(){close();const s=session();toggle.disabled=!s?.reports?.length;toggle.title=toggle.disabled?'完成研究后查看本会话报告':'展开本会话报告';$('#report-toggle-label').textContent='展开报告';chips();}
    function chips(){
      const wrap=$('#composer-attach');wrap.replaceChildren();
      for(const c of session()?.citations||[]){const b=el(wrap,'span',null,'cite-chip');b.title=c.label;el(b,'span',c.label,'cite-text');const remove=el(b,'button','×','cite-x');remove.type='button';remove.setAttribute('aria-label','移除引用：'+c.label);remove.onclick=()=>{const s=session();s.citations=s.citations.filter(v=>v!==c);chips();};}
      wrap.hidden=!wrap.children.length;citationStatus.textContent=wrap.children.length?'已引用 '+wrap.children.length+' 项 · 可在下方继续追问':'';citationStatus.hidden=!wrap.children.length;
    }
    function proof(r){
      dismiss();const b=$('#proof-body');b.replaceChildren();$('#proof-title').textContent=r.claim?'判断依据':r.name+' · '+display(r);
      if(stack.length){const back=el(b,'button','← 返回上一级');back.onclick=()=>proof(stack.pop());}
      if(r.claim){el(b,'h4',r.value);if(r.reason)el(b,'p',r.reason);if(r.counter)el(b,'p',r.counter);for(const ref of r.refs)point(b,ref);}
      el(b,'p',[report.target,r.year,r.dimension||'研究标的口径'].join(' · '));
      const basis=provenance(r);el(b,'strong',basis.label,'basis-label');el(b,'p',basis.formula?'计算公式　'+basis.formula:basis.label==='提取'?'提取出处（文档、表或字段）':'关联依据');if(basis.formula&&!r.operands){for(const id of basis.inputs||[]){const o=observations.get(id);if(o&&Number.isFinite(o.value))el(b,'p',o.field+' = '+fmt(o.value)+' '+o.unit+'（'+(o.period||o.year)+'）');}el(b,'p','结果：'+display(r));}if(r.operands)el(b,'p',r.operands);
      const obs=new Map([...report.ledger.observations,...report.ledger.interim].map(o=>[o.id,o]));
      const used=new Set(),links=[];
      function addSource(meta){
        if(!meta)return;
        el(b,'p',[meta.publisher,meta.title||meta.table,meta.published&&'发布 '+meta.published,meta.locator,meta.scope].filter(Boolean).join(' · '),'meta');
        if(meta.excerpt)el(b,'blockquote',meta.excerpt);
        const url=meta.url||meta.url_or_document;
        if(typeof url==='string'&&/^https?:\/\//i.test(url)){
          const a=el(b,'a',/\.pdf(?:$|\?)/i.test(url)?'打开原始 PDF ↗':'打开来源网页或数据接口 ↗');
          const page=String(meta.locator||'').match(/PDF\s*第?\s*(\d+)\s*页/i);
          a.href=page&&/\.pdf(?:$|\?)/i.test(url)?url.split('#')[0]+'#page='+page[1]:url;
          a.target='_blank';a.rel='noopener noreferrer';links.push(a.href);
        }else if(url)el(b,'small','文档标识：'+url);
      }
      function walk(id){
        if(used.has(id))return;used.add(id);
        const o=obs.get(id);
        if(!o){el(b,'p',id.startsWith('calendar-')?'年度天数基数：'+id:'输入记录：'+id);return;}
        el(b,'h4',o.field+' · '+(o.period||o.year));
        if(Array.isArray(o.value)){
          const pre=el(b,'details');el(pre,'summary','查看样本数据（'+o.value.length+' 项）');el(pre,'pre',JSON.stringify(o.value,null,2));
        }else if(r.rawId!==id)point(b,{id:'input:'+id,rawId:id,name:o.field,year:o.period||o.year,dimension:o.dimension||'',value:o.value,unit:o.unit,formula:o.formula,inputs:[id]});
        else el(b,'p',fmt(o.value)+' '+o.unit);
        if(o.formula)el(b,'small',o.formula);
        addSource(report.ledger.sources[o.source]);if(r.rawId===id)(o.inputs||[]).forEach(walk);
      }
      if(!r.claim)r.inputs.forEach(walk);
      const filing=report.type==='company'&&!r.name.startsWith('同业')&&Object.values(report.ledger.sources).find(s=>s.url&&s.title?.includes(String(r.year))&&s.title.includes('年度报告'));
      if(filing&&!links.includes(filing.url)){el(b,'h4','同期年报核对入口');addSource(filing);}
      const cite=el(b,'button','引用并追问','primary');cite.onclick=()=>citeRow(r,true);
      source.displayedRecord=r;if(!source.open)source.showModal();source.scrollTop=0;b.scrollTop=0;
    }
    const rowLabel=r=>[r.year,r.dimension,r.name].filter(Boolean).join(' · ');
    function point(parent,r,label){
      const btn=el(parent,'button',label||rowLabel(r)+'　'+display(r),'metric-link');
      btn.type='button';btn.setAttribute('aria-haspopup','true');
      function preview(e){
        if(menu.classList.contains('open'))return;
        const host=btn.closest('dialog');host.append(tip);tip.replaceChildren();
        const head=el(tip,'div',null,'tip-head');
        el(head,'span',provenance(r).label,'tip-kind '+(r.claim?'infer':provenance(r).formula?'calc':'direct'));
        el(head,'strong',r.name,'tip-title');el(tip,'div',display(r));
        const doc=evidence(r)[0];el(tip,'small',[r.year,r.dimension,doc?.title||doc?.table||doc?.publisher].filter(Boolean).join(' · '));
        if(provenance(r).formula)el(tip,'div','公式 · '+provenance(r).formula);if(r.claim)el(tip,'div','关联依据：'+r.refs.map(v=>v.name).join('、'));
        if(r.operands)el(tip,'div',r.operands);
        if(provenance(r).formula&&!r.operands&&!r.claim){const values=r.inputs.map(id=>observations.get(id)).filter(o=>o&&typeof o.value==='number').slice(0,3);if(values.length)el(tip,'div',values.map(o=>o.field+' '+display(o)).join('；'));}
        if(doc?.locator)el(tip,'div',doc.locator);
        tip.classList.add('open');const rect=btn.getBoundingClientRect();place(tip,e.clientX||rect.left,e.clientY||rect.bottom);
      }
      btn.onpointerenter=preview;btn.onpointermove=e=>{if(tip.classList.contains('open'))place(tip,e.clientX,e.clientY);};btn.onpointerleave=hideTip;
      btn.onfocus=preview;btn.onblur=hideTip;
      btn.oncontextmenu=e=>{e.preventDefault();btn.onclick(e);};
      btn.onkeydown=e=>{if(e.key==='ContextMenu'||e.shiftKey&&e.key==='F10'){e.preventDefault();btn.click();}};
      btn.onclick=e=>{
        e.stopPropagation();dismiss();origin=btn;btn.closest('dialog').append(menu);menu.classList.add('open');
        const rect=btn.getBoundingClientRect();place(menu,e.clientX||rect.left,e.clientY||rect.bottom);
        citeItem.onclick=()=>citeRow(r);
        sourceItem.onclick=()=>{if(source.open)stack.push(source.displayedRecord);else stack=[];proof(r);};
        if(!e.detail)citeItem.focus({preventScroll:true});
      };return btn;
    }
    function section(name){const s=el(panel,'section',null,'report-section');el(s,'h3',name);return s;}
    function inline(parent,text,refs){
      const allowed=new Map(refs.map(r=>[r.id,r]));
      const tokens=String(text||'').split(/(\{\{D\d+\}\})/g);
      for(const token of tokens){
        if(/^\{\{D\d+\}\}$/.test(token)){const r=allowed.get(token.slice(2,-2));if(r)point(parent,r,display(r));else parent.append('（依据待核）');}
        else parent.append(token.replace(/^[【][^】]{1,20}[】]/,''));
      }
    }
    function draw(){
      dismiss();report=session().reports.at(-1);panel.replaceChildren();
      observations=new Map([...report.ledger.observations,...report.ledger.interim].map(o=>[o.id,o]));
      $('#live-report-title').textContent=report.target+'研究报告';
      $('#report-stamp').textContent=report.ledger.years.join('–').replace(/^(\d{4}).*(\d{4})$/,'$1—$2')+' · 资料截止 '+report.asOf.slice(0,10);
      el(panel,'p',report.question,'report-notice');
      const byId=new Map(report.rows.map(r=>[r.id,r]));
      const readable=(t)=>String(t||'').replace(/\{\{(D\d+)\}\}/g,(_,id)=>byId.has(id)?display(byId.get(id)):'待核实');
      const sections=[['summary','摘要'],['performance','经营表现'],['quality','财务质量'],['risk','风险清单'],['credit','对授信的含义']];
      for(const [key,title] of sections){
        const area=section(title),items=key==='risk'?report.written.risks:report.written.conclusions.filter(x=>x.section===key);
        if(!items.length){el(area,'p',report.fallback?'报告代理未完成该节核验。':'本轮缺少可支持该项判断的证据。','analysis-limit');}
        for(const [i,x] of items.entries()){
          const refs=x.refs.map(id=>byId.get(id)).filter(Boolean);
          const p=el(area,'p',null,'research-prose');
          point(p,{id:key+i,claim:true,name:title+' · '+({I:'分析推断',C:'计算判断',F:'披露事实',M:'资料缺口'}[x.tag]||'分析判断'),value:readable(x.judgment),unit:'',year:report.asOf.slice(0,10),refs,reason:readable(x.text),counter:readable(x.counter),inputs:[...new Set(refs.flatMap(r=>r.inputs))]},readable(x.judgment));
          p.append(' ');inline(p,x.text,refs);if(x.counter){p.append(' ');inline(p,x.counter,refs);}
        }
        if(key==='credit'&&report.written.gaps.length)el(area,'p','待核实 · '+readable(report.written.gaps[0]),'analysis-limit');
      }
      evidencePages.nav(panel,report,report.ledger,report.target,report.snapshot,report.asOf);
    }
    const historyBox=el(dialog,'section',null,'report-replies');historyBox.hidden=true;
    function position(){
      if(!dialog.open)return;
      const rect=dock.getBoundingClientRect(),top=document.querySelector('.topbar').getBoundingClientRect().bottom;
      dialog.style.top=(top+3)+'px';dialog.style.height=Math.max(64,rect.top-top-8)+'px';
    }
    new ResizeObserver(position).observe(dock);window.addEventListener('resize',position);
    function showReplies(){
      historyBox.replaceChildren();const turns=report?.dialogue||[];historyBox.hidden=!turns.length;
      for(const turn of turns){el(historyBox,'strong',turn.q);const answer=el(historyBox,'div',null,'answer-text');answer.innerHTML=turn.html||'';if(!turn.html)answer.textContent='正在回答…';}
      historyBox.scrollTop=historyBox.scrollHeight;
    }
    function startQuestion(q){
      if(!dialog.open||!report)return null;
      const ref=report,turn={q,html:''};(ref.dialogue||=[]).push(turn);showReplies();
      const selected=new Map(ref.rows.map(r=>[r.id,r]));
      const interpret=x=>({...x,values:x.refs.map(id=>selected.get(id)).filter(Boolean).map(r=>({id:r.id,metric:r.name,period:r.year,scope:r.dimension,value:r.value,unit:r.unit,formula:r.formula}))});
      return {data:{target:ref.target,snapshot:ref.snapshot,as_of:ref.asOf,question:ref.question,scope:ref.scope,conclusions:ref.written.conclusions.map(interpret),risks:ref.written.risks.map(interpret),gaps:ref.written.gaps},
        paint(html){turn.html=html;if(report===ref&&dialog.open)showReplies();}};
    }
    function open(){
      const s=session();if(!s?.reports?.length)return;
      if(dialog.open){close();return;}
      draw();dialog.show();showReplies();toggleLabel(true);position();
    }
    toggle.onclick=open;$('#report-exit').onclick=close;$('#proof-close').onclick=()=>source.close();
    for(const d of [source,dialog])d.onclick=e=>{if(e.target===d)d.close();};
    dock.querySelector('.model-btn')?.addEventListener('click',()=>{if(dialog.open)close();},true);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&dialog.open&&!source.open&&!menu.classList.contains('open')){e.preventDefault();close();}},false);
    document.addEventListener('pointerdown',e=>{if(!menu.contains(e.target))dismiss();},true);
    document.addEventListener('scroll',()=>dismiss(),true);window.addEventListener('resize',()=>dismiss());
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.classList.contains('open')){e.preventDefault();e.stopImmediatePropagation();dismiss(true);}},true);
    for(const d of [source,dialog])d.addEventListener('close',()=>{if(d.open)return;if(d.contains(menu))dismiss();if(d===dialog){toggleLabel(false);}else stack=[];});
    return {sync,close,chips,startQuestion,ready(){toggle.disabled=false;toggle.title='展开报告';if(dialog.open)openLatest();}};
    function openLatest(){close();open();}
  }
  return {prepare,valid,bind,catalogue};
})();
