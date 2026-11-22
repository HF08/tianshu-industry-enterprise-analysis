window.researchReport=(()=>{
  const $=s=>document.querySelector(s);
  const SVG_NS='http://www.w3.org/2000/svg';
  function el(parent,tag,text,cls){const node=document.createElement(tag);if(text!=null)node.textContent=text;if(cls)node.className=cls;parent.append(node);return node;}
  function icon(cls,viewBox,shapes){const svg=document.createElementNS(SVG_NS,'svg');svg.setAttribute('class',cls);svg.setAttribute('viewBox',viewBox);svg.setAttribute('aria-hidden','true');for(const [tag,attrs] of shapes){const node=document.createElementNS(SVG_NS,tag);for(const name in attrs)node.setAttribute(name,attrs[name]);svg.append(node);}return svg;}
  const ICON={
    close:()=>icon('ic','0 0 16 16',[['path',{d:'M3.6 3.6l8.8 8.8M12.4 3.6l-8.8 8.8'}]]),
    quote:()=>icon('ic','0 0 24 24',[
      ['path',{fill:'currentColor',stroke:'none',d:'M4.5 5.2h4.3c.5 0 .9.4.9.9 0 4.3-1.7 7.5-4.8 9.5-.4.3-1 .2-1.3-.2-.3-.4-.2-1 .2-1.3 2-1.4 3.2-3.3 3.6-5.7H4.5c-.5 0-.9-.4-.9-.9V6.1c0-.5.4-.9.9-.9z'}],
      ['path',{fill:'currentColor',stroke:'none',d:'M14.2 5.2h4.3c.5 0 .9.4.9.9 0 4.3-1.7 7.5-4.8 9.5-.4.3-1 .2-1.3-.2-.3-.4-.2-1 .2-1.3 2-1.4 3.2-3.3 3.6-5.7h-2.9c-.5 0-.9-.4-.9-.9V6.1c0-.5.4-.9.9-.9z'}]]),
    doc:()=>icon('ic','0 0 24 24',[
      ['path',{d:'M14 3.4H7a1.4 1.4 0 0 0-1.4 1.4v14.4A1.4 1.4 0 0 0 7 20.6h10a1.4 1.4 0 0 0 1.4-1.4V8.8L14 3.4z'}],
      ['path',{d:'M14 3.4v5.4h5.4'}],
      ['path',{d:'M8.6 13.4h6.8M8.6 16.6h6.8'}]])
  };
  const TIP_KIND={direct:'直接取数',calc:'计算得出',infer:'推理结论'};
  const fmt=n=>typeof n==='number'?n.toLocaleString('zh-CN',{maximumFractionDigits:2}):String(n);
  const display=r=>r.unit==='元'?fmt(r.value/1e8)+' 亿元':fmt(r.value)+' '+(r.unit||'');
  const F10_TABLES={GINCOME:'合并利润表',GINCOMEQ:'合并利润表',GBALANCE:'合并资产负债表',GBALANCEQ:'合并资产负债表',GCASHFLOW:'合并现金流量表',GCASHFLOWQ:'合并现金流量表',MAINOP:'主营业务构成'};
  function f10Label(value){
    const code=String(value||'').trim().match(/RPT_(?:F10|DMSK)_(?:FINANCE|FN)_([A-Z0-9_]+)/i)?.[1]?.toUpperCase();
    return code?F10_TABLES[code]||'':'';
  }
  function plainText(value){const text=String(value||'').trim();return text&&!/RPT_/i.test(text)?text:'';}
  function catalogue(ledger,competition){
    const candidates=[...ledger.metrics,...ledger.interim.map(o=>({name:o.field,value:o.value,year:o.period,unit:o.unit,dimension:o.dimension||'',inputs:[o.id]}))];
    for(const r of competition?.rows||[])if(r.name==='同业候选营收相对倍数'||r.name==='代表企业样本营收占比')candidates.push(r);
    return candidates.filter(r=>r.inputs?.length&&['number','string'].includes(typeof r.value)).map((r,i)=>({...r,id:'D'+(i+1)}));
  }
  function prepare(s,ledger,competition){
    const rows=catalogue(ledger,competition);
    return {target:s.plan.target,type:s.plan.type,scope:s.plan.scope,question:s.research,model:s.config?.model,asOf:s.asOf,snapshot:s.snapshot,ledger,rows,
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
  function bind(session, { offline = false, localPdfHash = null } = {}){
    const dialog=$('#research-report'),source=$('#research-source'),panel=$('#research-pages'),toggle=$('#report-toggle');
    let report,stack=[],observations=new Map(),origin=null,menuAnchor=null;
    const dock=$('.composer-dock');
    // 报告打开时，输入框 3 秒没有编辑动作就收起半截；编辑、引用、上传都会重新展开
    let collapseTimer=0;
    function expandDock(){dock?.classList.remove('is-collapsed');}
    function scheduleCollapse(){
      clearTimeout(collapseTimer);
      if(!dock||!dialog.open)return;
      collapseTimer=setTimeout(function(){if(dialog.open)dock?.classList.add('is-collapsed');},3000);
    }
    function bumpDock(){expandDock();scheduleCollapse();}
    ['input','keydown','pointerdown','focusin','paste','change','drop'].forEach(function(type){dock?.addEventListener(type,bumpDock,true);});
    const composerAttach=$('#composer-attach');
    if(composerAttach)new MutationObserver(bumpDock).observe(composerAttach,{childList:true});
    // 外壳：页面级遮罩承载面板，遮罩 50 在页面内容之上、输入区 70 之下
    const layer=document.createElement('div');layer.className='report-layer';layer.id='report-layer';layer.setAttribute('aria-hidden','true');
    const sourceLayer=document.createElement('div');sourceLayer.className='source-layer';sourceLayer.id='source-layer';sourceLayer.setAttribute('aria-hidden','true');
    document.body.append(layer,sourceLayer);
    layer.append(dialog);sourceLayer.append(source);
    dialog.classList.add('report-panel');source.classList.add('source-dialog');
    const head=dialog.querySelector('header');head.classList.add('report-head');
    const heading=head.children[0];heading.classList.add('report-heading');
    const titleEl=$('#live-report-title');titleEl.classList.add('report-title');
    const stampEl=$('#report-stamp');stampEl.classList.add('report-sub');
    $('#report-exit').replaceChildren(ICON.close());
    // 报告头右上角的两个下载入口，报告未打开时隐藏
    const actions=head.querySelector('.report-actions');
    const exportMd=document.createElement('button');
    exportMd.type='button';exportMd.className='report-export-btn';exportMd.textContent='下载 Markdown';exportMd.hidden=true;
    const exportPdf=document.createElement('button');
    exportPdf.type='button';exportPdf.className='report-export-btn';exportPdf.textContent='下载 PDF';exportPdf.hidden=true;
    actions.insertBefore(exportPdf,$('#report-exit'));actions.insertBefore(exportMd,exportPdf);
    const exportStatus=el(heading,'span','','report-feedback');
    exportStatus.setAttribute('role','status');
    function syncActions(){
      const ready=!!(dialog.open&&report);
      for(const button of [exportMd,exportPdf]){button.hidden=!ready;button.disabled=!ready;}
    }
    function exportMeta(){
      return {generatedAt:new Date().toISOString(),model:report?.model||'未登记',version:window.reportExport.version};
    }
    function saveBlob(blob,name){
      const url=URL.createObjectURL(blob),link=document.createElement('a');
      link.href=url;link.download=name;link.rel='noopener';
      document.body.append(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),10000);
    }
    // 转换接口不可用时，用本机打印窗口另存为 PDF
    function printDraft(html){
      const win=window.open('','_blank');
      if(!win){exportStatus.textContent='打印窗口被拦截，请允许弹出窗口后再试。';return;}
      win.document.open();win.document.write(html);win.document.close();
      win.focus();win.print();
    }
    exportMd.onclick=()=>{
      if(!dialog.open||!report)return;
      const markdown=window.reportExport.buildMarkdown(report,exportMeta());
      saveBlob(new Blob([markdown],{type:'text/markdown;charset=utf-8'}),window.reportExport.fileName(report,'md'));
    };
    exportPdf.onclick=async()=>{
      if(!dialog.open||!report)return;
      const html=window.reportExport.buildPrintHtml(report,exportMeta());
      const name=window.reportExport.fileName(report,'pdf');
      exportStatus.textContent='';
      if(offline){printDraft(html);return;}
      exportPdf.disabled=true;
      try{
        const response=await fetch('/api/report-pdf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({html,filename:name})});
        if(!response.ok)throw Error('PDF 转换接口返回 HTTP '+response.status);
        saveBlob(await response.blob(),name);
      }catch{
        printDraft(html);
      }finally{
        syncActions();
      }
    };
    panel.classList.add('report-body');
    const sourceHead=source.querySelector('header');sourceHead.classList.add('source-head');
    const sourceTitle=$('#proof-title');sourceTitle.classList.add('source-title');
    const sourceMain=document.createElement('div');sourceMain.className='source-head-main';
    const sourceBack=document.createElement('button');sourceBack.type='button';sourceBack.className='source-back';sourceBack.textContent='← 返回';sourceBack.hidden=true;
    sourceMain.append(sourceBack,sourceTitle);
    sourceHead.insertBefore(sourceMain,sourceHead.firstChild);
    const proofClose=$('#proof-close');proofClose.classList.add('close-btn');proofClose.replaceChildren(ICON.close());
    const proofBody=$('#proof-body');proofBody.classList.add('source-body');
    const citationStatus=document.createElement('span');citationStatus.className='report-citation-status';citationStatus.setAttribute('role','status');citationStatus.hidden=true;
    function toggleLabel(open){const text=open?'收起报告':'展开报告';$('#report-toggle-label').textContent=text;toggle.title=text;toggle.setAttribute('aria-label',text);toggle.setAttribute('aria-expanded',String(open));}
    const tip=document.createElement('div');tip.className='report-tip';tip.id='report-hover-preview';tip.setAttribute('role','tooltip');
    const menu=document.createElement('div');menu.className='rf-menu';menu.setAttribute('role','menu');menu.setAttribute('aria-label','数据操作');
    function menuItem(text,iconNode){const b=document.createElement('button');b.type='button';b.className='rf-menu-item';b.setAttribute('role','menuitem');b.append(iconNode);const label=document.createElement('span');label.textContent=text;b.append(label);return b;}
    const citeItem=menuItem(offline?'复制引用':'引用',ICON.quote()),sourceItem=menuItem('查看来源',ICON.doc());
    menu.append(citeItem,sourceItem);
    function syncShell(){
      layer.classList.toggle('open',dialog.open);layer.setAttribute('aria-hidden',String(!dialog.open));
      sourceLayer.classList.toggle('open',source.open);sourceLayer.setAttribute('aria-hidden',String(!source.open));
    }
    function hideTip(){tip.classList.remove('open');}
    function dismiss(restore=false){hideTip();menu.classList.remove('open');if(restore&&origin?.isConnected)origin.focus({preventScroll:true});}
    function close(){clearTimeout(collapseTimer);expandDock();dismiss();stack=[];if(source.open)source.close();if(dialog.open)dialog.close();toggleLabel(false);syncActions();}
    function placeTip(x,y){
      const rect=tip.getBoundingClientRect(),w=document.documentElement.clientWidth,h=document.documentElement.clientHeight;
      let left=x+14,top=y+14;
      if(left+rect.width>w-8)left=x-14-rect.width;
      if(top+rect.height>h-8)top=y-14-rect.height;
      tip.style.left=Math.max(8,left)+'px';tip.style.top=Math.max(8,top)+'px';
    }
    function placeMenu(x,y){
      const rect=menu.getBoundingClientRect(),w=document.documentElement.clientWidth,h=document.documentElement.clientHeight;
      let left=x+8,top=y+8;
      if(left+rect.width>w-8)left=x-8-rect.width;
      if(top+rect.height>h-8)top=y-8-rect.height;
      menu.style.left=Math.max(8,left)+'px';menu.style.top=Math.max(8,top)+'px';
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
    function docLabel(meta){
      if(!meta)return '';
      return [plainText(meta.publisher),plainText(meta.title)||f10Label(meta.table)||plainText(meta.table)].filter(Boolean).join(' · ');
    }
    function docMetaLine(meta){
      if(!meta)return '';
      return [plainText(meta.publisher),plainText(meta.title)||f10Label(meta.table)||plainText(meta.table),meta.published&&'发布 '+meta.published,meta.locator,meta.scope].filter(Boolean).join(' · ');
    }
    function retrievedAt(){return String(report?.ledger?.retrieved_at||'').slice(0,10);}
    function obsRow(o,id){return {id:'input:'+id,rawId:id,name:o.field,year:o.period||o.year,dimension:o.dimension||'',value:o.value,unit:o.unit,formula:o.formula,inputs:[id]};}
    async function citeRow(r,compose=false){
      const s=session(),key=report.snapshot+'/'+r.id,label=r.claim?r.value:r.name+' · '+r.year;
      const urls=evidence(r).map(d=>d.url||d.url_or_document).filter(Boolean);
      const c={key,label,text:[report.target,report.snapshot,label,r.dimension,display(r),r.formula,...urls].filter(Boolean).join(' | ')};
      if(offline){
        dismiss();
        try{
          await navigator.clipboard.writeText(c.text);
          exportStatus.textContent='引用已复制';
        }catch{
          window.prompt('选中并复制这条引用',c.text);
        }
        return;
      }
      s.citations||=[];if(!s.citations.some(v=>v.key===key))s.citations.push(c);
      chips();dismiss();$('#report-exit').title='关闭报告，输入框中已有 '+s.citations.length+' 项引用';if(compose){if(source.open)source.close();$('#composer-input').focus();}
    }
    function sync(){close();const s=session();toggle.disabled=!s?.reports?.length;toggle.title=toggle.disabled?'完成研究后查看本会话报告':'展开本会话报告';$('#report-toggle-label').textContent='展开报告';chips();}
    function chips(){
      const wrap=$('#composer-attach');if(!wrap)return;wrap.replaceChildren();
      const list=session()?.citations||[];
      for(const c of list){
        const b=el(wrap,'span',null,'cite-chip');b.title=c.label;
        b.append(ICON.quote());
        el(b,'span',c.label,'cite-text');
        const remove=el(b,'button',null,'cite-x');remove.type='button';remove.setAttribute('aria-label','移除引用：'+c.label);remove.append(ICON.close());
        remove.onclick=()=>{const s=session();s.citations=s.citations.filter(v=>v!==c);chips();};
        b.append(remove);
      }
      wrap.append(citationStatus);
      citationStatus.textContent=list.length?'已引用 '+list.length+' 项 · 可在下方继续追问':'';
      citationStatus.hidden=!list.length;
      wrap.hidden=!list.length;
    }
    function renderTip(r){
      tip.replaceChildren();
      const basis=provenance(r),kind=r.claim?'infer':basis.formula?'calc':'direct';
      const head=el(tip,'div',null,'tip-head');
      el(head,'span',TIP_KIND[kind],'tip-kind '+kind);
      el(head,'strong',r.claim?r.name:r.name+' '+display(r),'tip-title');
      const doc=evidence(r)[0];
      if(kind==='infer'){
        for(const [i,ref] of (r.refs||[]).entries()){
          const line=el(tip,'div',null,'tip-evidence');
          el(line,'span','证据 '+(i+1),'tip-no');
          el(line,'span',ref.name+' '+display(ref)+(ref.year?'（'+ref.year+'）':''),null);
        }
        for(const [name,text] of [['推理',r.reason],['结论',r.value],['反证',r.counter]]){
          if(!text)continue;
          const block=el(tip,'div',null,'tip-block');
          el(block,'div',name,'tip-block-label');
          el(block,'div',text,'tip-block-text');
        }
        return;
      }
      if(kind==='calc'){
        el(tip,'div',basis.formula,'tip-formula');
        el(tip,'div','输入项','tip-label');
        for(const id of basis.inputs||r.inputs||[]){
          const o=observations.get(id);
          if(!o||o.value==null||Array.isArray(o.value))continue;
          el(tip,'div',[o.field,fmt(o.value)+' '+(o.unit||''),docLabel(report.ledger.sources[o.source])||'来源文档'].join(' · '),'tip-input');
        }
        if(r.operands)el(tip,'div',r.operands,'tip-input');
        return;
      }
      const rows=[['口径',[r.year,plainText(r.dimension)].filter(Boolean).join(' · ')],['文档',docLabel(doc)],['页码',doc?.locator],['发布时间',doc?.published],['抓取时间',retrievedAt()]];
      for(const [key,value] of rows){
        if(!value)continue;
        const line=el(tip,'div',null,'tip-row');
        el(line,'span',key,'tip-key');
        el(line,'span',value,'tip-val');
      }
    }
    function urlLink(meta){
      const url=meta?.url||meta?.url_or_document;
      if(typeof url!=='string'||!/^https?:\/\//i.test(url))return null;
      const a=document.createElement('a');
      const packaged=offline&&localPdfHash&&meta.sha256===localPdfHash;
      a.textContent=/\.pdf(?:$|\?)/i.test(url)?'打开原始 PDF ↗':'打开来源网页或数据接口 ↗';
      const page=String(meta.locator||'').match(/PDF\s*第?\s*(\d+)\s*页/i);
      const target=packaged?'案例/cabia.pdf':url;
      a.href=page&&/\.pdf(?:$|\?)/i.test(target)?target.split('#')[0]+'#page='+page[1]:target;
      a.target='_blank';a.rel='noopener noreferrer';
      return a;
    }
    function proof(r){
      dismiss();proofBody.replaceChildren();
      const basis=provenance(r),docs=evidence(r),doc=docs[0];
      $('#proof-title').textContent=r.claim?'推理链':basis.formula?'计算过程':'来源：'+(plainText(doc?.title)||plainText(doc?.publisher)||r.name);
      sourceBack.hidden=!stack.length;
      const metaRow=(key,value)=>{
        if(value==null||value==='')return;
        const row=el(proofBody,'div',null,'source-meta-row');
        el(row,'span',key,'source-meta-key');
        const cell=el(row,'span',null,'source-meta-value');
        if(typeof value==='string')cell.textContent=value;else cell.append(value);
      };
      const label=text=>el(proofBody,'div',text,'source-label');
      const block=(name,text)=>{
        if(!text)return;
        const box=el(proofBody,'div',null,'source-block');
        el(box,'div',name,'source-block-title');
        el(box,'p',text,'source-block-text');
      };
      const docList=list=>{
        const items=list.filter(Boolean);
        if(!items.length)return;
        const ol=el(proofBody,'ol',null,'source-evidence');
        for(const [i,meta] of items.entries()){
          const li=el(ol,'li',null,null);
          el(li,'span',String(i+1),'source-evidence-no');
          el(li,'div',meta.excerpt||plainText(meta.title)||f10Label(meta.table)||plainText(meta.table)||plainText(meta.publisher)||'来源文档','source-evidence-text');
          const source_line=el(li,'div',null,'source-evidence-source');
          source_line.append('来源：'+(docMetaLine(meta)||meta.url_or_document||'本机登记资料'));
          const link=urlLink(meta);
          if(link){source_line.append(' · ');source_line.append(link);}
        }
      };
      if(r.claim){
        label('证据');
        const refs=r.refs||[];
        const ol=el(proofBody,'ol',null,'source-evidence');
        for(const [i,ref] of refs.entries()){
          const li=el(ol,'li',null,null);
          el(li,'span',String(i+1),'source-evidence-no');
          const text=el(li,'div',null,'source-evidence-text');point(text,ref,ref.name+' '+display(ref)+(ref.year?'（'+ref.year+'）':''));
          el(li,'div','来源：'+([ref.year,plainText(ref.dimension)].filter(Boolean).join(' · ')||'报告数据点'),'source-evidence-source');
        }
        block('推理过程',r.reason);
        block('结论',r.value);
        block('反证',r.counter);
        if(docs.length){label('来源文档');docList(docs);}
      }else if(basis.formula){
        el(proofBody,'div',basis.formula,'source-formula');
        label('输入项');
        const inputs=el(proofBody,'div',null,'source-inputs');
        for(const id of basis.inputs||r.inputs||[]){
          const o=observations.get(id);
          if(!o)continue;
          const row=el(inputs,'div',null,'source-input');
          point(row,obsRow(o,id),o.field).classList.add('source-input-name');
          const value=point(row,obsRow(o,id),o.value==null?'未取得':fmt(o.value)+' '+(o.unit||''));
          value.classList.add('source-input-value');
          const meta=report.ledger.sources[o.source];
          el(row,'span',[plainText(meta?.publisher),f10Label(meta?.table)||plainText(meta?.title)||plainText(meta?.table),meta?.locator].filter(Boolean).join(' · ')||'来源文档','source-input-source');
        }
        const result=el(proofBody,'div',null,'source-result');
        el(result,'span','计算结果','source-result-key');
        el(result,'strong',display(r),'source-result-value');
        if(docs.length){label('来源文档');docList(docs);}
      }else{
        metaRow('口径',[r.year,plainText(r.dimension)].filter(Boolean).join(' · '));
        metaRow('文档',docLabel(doc));
        metaRow('页码',doc?.locator);
        metaRow('发布时间',doc?.published);
        metaRow('抓取时间',retrievedAt());
        if(doc?.url_or_document&&!/^https?:\/\//i.test(doc.url_or_document))metaRow('文档标识',doc.url_or_document);
        if(docs.length){label('原文摘录');docList(docs);}
      }
      const filing=report.type==='company'&&!String(r.name).startsWith('同业')&&Object.values(report.ledger.sources).find(s=>s.url&&s.title?.includes(String(r.year))&&s.title.includes('年度报告'));
      if(filing&&!evidence(r).includes(filing)){label('同期年报核对入口');docList([filing]);}
      const cite=el(proofBody,'button',offline?'复制引用':'引用并追问','source-primary');cite.type='button';cite.onclick=()=>citeRow(r,true);
      source.displayedRecord=r;if(!source.open)source.show();syncShell();proofBody.scrollTop=0;
    }
    const rowLabel=r=>[r.year,r.dimension,r.name].filter(Boolean).join(' · ');
    function point(parent,r,label){
      const btn=el(parent,'button',label||rowLabel(r)+'　'+display(r),'metric-link');
      btn.type='button';btn.setAttribute('aria-haspopup','true');
      function preview(e){
        if(menu.classList.contains('open'))return;
        document.body.append(tip);renderTip(r);tip.classList.add('open');
        const rect=btn.getBoundingClientRect();
        placeTip(e.clientX||rect.left,e.clientY||rect.top+rect.height/2);
      }
      btn.onpointerenter=preview;
      btn.onpointermove=e=>{if(tip.classList.contains('open'))placeTip(e.clientX,e.clientY);};
      btn.onpointerleave=hideTip;
      btn.onfocus=preview;btn.onblur=hideTip;
      btn.oncontextmenu=e=>{e.preventDefault();btn.click();};
      btn.onkeydown=e=>{if(e.key==='ContextMenu'||e.shiftKey&&e.key==='F10'){e.preventDefault();btn.click();}};
      btn.onclick=e=>{
        e.stopPropagation();dismiss();origin=btn;document.body.append(menu);menu.classList.add('open');
        const rect=btn.getBoundingClientRect();
        menuAnchor=rect;placeMenu(e.clientX||rect.left,e.clientY||rect.bottom);
        citeItem.onclick=()=>citeRow(r);
        sourceItem.onclick=()=>{if(source.open)stack.push(source.displayedRecord);else stack=[];proof(r);};
        if(!e.detail)citeItem.focus({preventScroll:true});
      };return btn;
    }
    function charts(parent,title,rows){
      const sectionEl=el(parent,'section',null,'report-visual');el(sectionEl,'h4',title);
      const groups=new Map();
      for(const r of rows.filter(x=>typeof x.value==='number')){
        const period=/^\d{4}$/.test(String(r.year))?'年度':'近期';
        const label=r.name+' · '+(r.dimension||'整体')+'（'+r.unit+'）';
        const key=period+' · '+label;
        if(!groups.has(key))groups.set(key,{period,label,rows:[]});
        groups.get(key).rows.push(r);
      }
      if(!groups.size){el(sectionEl,'p','缺少同口径可绘制数据。');return;}
      const select=el(sectionEl,'select');select.setAttribute('aria-label',title+'指标');
      for(const period of ['年度','近期']){
        const options=document.createElement('optgroup');options.label=period;
        for(const [key,series] of groups){
          if(series.period===period)options.append(new Option(series.label,key));
        }
        if(options.children.length)select.append(options);
      }
      const bars=el(sectionEl,'div',null,'bars');
      function draw(){bars.replaceChildren();const series=groups.get(select.value).rows.slice().sort((a,b)=>String(a.year).localeCompare(String(b.year)));
        const max=Math.max(...series.map(r=>Math.abs(r.value)),0.000001);
        for(const r of series){const btn=point(bars,r,'');btn.replaceChildren();el(btn,'span',r.year);const rail=el(btn,'i');const bar=el(rail,'b');bar.style.width=Math.abs(r.value)/max*100+'%';if(r.value<0)bar.className='negative';el(btn,'strong',display(r));}
      }select.onchange=draw;draw();
    }
    function comparison(parent){
      const area=el(parent,'section',null,'report-visual');el(area,'h4','代表企业与竞争格局');const rows=report.rows.filter(r=>['同业候选营收相对倍数','代表企业样本营收占比'].includes(r.name));
      if(!rows.length){el(area,'p','缺少同期间可比企业样本，竞争位置待核实。');return;}
      el(area,'p',report.type==='company'?'同分类上市公司合并营业总收入 ÷ 标的营业总收入。候选企业的产品、地域重叠程度须单独核实。':'样本内合并营业总收入占比，统计范围为所选分类的上市公司。');
      const bars=el(area,'div',null,'bars'),max=Math.max(...rows.map(r=>r.value),0.0001);
      for(const r of rows){const btn=point(bars,r);btn.replaceChildren();el(btn,'span',r.dimension);el(el(btn,'i'),'b').style.width=r.value/max*100+'%';el(btn,'strong',display(r));}
    }
    function industryChain(parent){
      const rows=report.rows,company=report.type==='company';
      const chain=el(parent,'section',null,'report-visual');el(chain,'h4','产业链分析');let plotted=false;
      if(report.chainStudy&&window.supplyNetwork){window.supplyNetwork.mount(chain,report.chainStudy,Object.assign({},report.ledger.sources,Object.fromEntries(report.ledger.observations.filter(o=>o.source&&report.ledger.sources[o.source]).map(o=>[o.id,report.ledger.sources[o.source]]))));plotted=true;}
      if(report.chainFailure)el(chain,'p','产业链代理回报缺失：'+report.chainFailure,'meta');
      try{if(!plotted&&report.graph)plotted=window.chainMap.mount(el(chain,'div'),report.graph);}catch{}
      if(!plotted){
        const edges=report.ledger.observations.filter(o=>o.field==='产业链关系'&&o.value?.from&&o.value?.to);
        if(edges.length)for(const o of edges)point(chain,{id:o.id,name:o.value.type,year:o.year,dimension:o.dimension,value:o.value.from+' → '+o.value.to,unit:'',inputs:[o.id]});
        else{
          const stages=company?[
            ['上游采购',r=>r.name==='前五供应商采购占比'],
            ['企业业务',r=>r.name==='产品收入占比'&&!/^其中/.test(r.dimension)],
            ['下游销售',r=>r.name==='前五客户销售占比（披露）']
          ]:[
            ['上游材料',r=>r.name==='原料价格'],
            ['中游产销',r=>['产量','销量'].includes(r.name)],
            ['下游应用',r=>r.name==='装车量']
          ];
          const flow=el(chain,'div',null,'stage-flow');
          for(const [title,choose] of stages){
            const candidates=rows.filter(choose).sort((a,b)=>Number(b.year)-Number(a.year));
            if(!candidates.length)continue;
            const stage=el(flow,'article');el(stage,'h4',title);
            for(const r of candidates.filter(r=>r.year===candidates[0].year).slice(0,4))point(stage,r);
          }
          el(chain,'p',flow.children.length?'按已披露的采购、生产或销售环节展示；节点指标可点开核验。具名供销关系仍需公告或合同支持。':'尚无可核验的上下游关系。需补充供应、销售、项目定点或行业工艺关系的原文证据。','meta');
        }
      }
    }
    function inline(parent,text,refs){
      const allowed=new Map(refs.map(r=>[r.id,r]));
      const tokens=String(text||'').split(/(\{\{D\d+\}\})/g);
      for(const token of tokens){
        if(/^\{\{D\d+\}\}$/.test(token)){const r=allowed.get(token.slice(2,-2));if(r)point(parent,r,display(r));else parent.append('（依据待核）');}
        else parent.append(token.replace(/^[【][^】]{1,20}[】]/,''));
      }
    }
    const TAG={F:'披露事实',C:'计算判断',I:'分析推断',M:'资料缺口'};
    function draw(){
      dismiss();report=session().reports.at(-1);panel.replaceChildren();
      observations=new Map([...report.ledger.observations,...report.ledger.interim].map(o=>[o.id,o]));
      titleEl.textContent=report.target+'研究报告';
      stampEl.textContent=report.ledger.years.join('–').replace(/^(\d{4}).*(\d{4})$/,'$1—$2')+' · 资料截止 '+report.asOf.slice(0,10);
      if(report.question)el(panel,'p',report.question,'report-notice');
      const byId=new Map(report.rows.map(r=>[r.id,r]));
      const readable=t=>String(t||'').replace(/\{\{(D\d+)\}\}/g,(_,id)=>byId.has(id)?display(byId.get(id)):'待核实');
      const refRows=x=>(x?.refs||[]).map(id=>byId.get(id)).filter(Boolean);
      const conclusion=key=>report.written.conclusions.find(x=>x.section===key);
      function sourceNote(r){
        const year=String(r.year??'').trim(),dimension=plainText(r.dimension);
        if(dimension)return [year,dimension].filter(Boolean).join(' · ');
        const doc=evidence(r)[0];
        if(!doc)return [year,'来源文档'].filter(Boolean).join(' · ');
        const rawTitle=String(doc.title||'').trim(),rawTable=String(doc.table||'').trim();
        const title=plainText(rawTitle),publisher=plainText(doc.publisher);
        if(title&&/(年度报告|年报)/.test(title)){if(publisher)return [publisher,year].filter(Boolean).join(' · ');}
        else if(title)return [year,title].filter(Boolean).join(' · ');
        const table=f10Label(rawTable)||f10Label(rawTitle)||plainText(rawTable);
        if(table)return [year,table].filter(Boolean).join(' · ');
        if(publisher&&!rawTitle&&!rawTable)return [publisher,year].filter(Boolean).join(' · ');
        return [year,'来源文档'].filter(Boolean).join(' · ');
      }
      function claimRow(label,x,refs){
        return {id:'claim-'+label,claim:true,name:label+' · '+(TAG[x.tag]||'分析判断'),value:readable(x.judgment),unit:'',year:report.asOf.slice(0,10),refs,
          reason:readable(x.text),counter:readable(x.counter),inputs:[...new Set(refs.flatMap(r=>r.inputs||[]))]};
      }
      function prose(parent,x,refs){
        if(!x)return null;
        const judgment=String(x.judgment||'').trim(),text=String(x.text||'').trim(),counter=String(x.counter||'').trim();
        if(!judgment&&!text&&!counter)return null;
        const p=el(parent,'p',null,'rs-text');
        if(judgment)inline(p,judgment,refs);
        if(text){if(p.textContent)p.append(' ');inline(p,text,refs);}
        if(counter){if(p.textContent)p.append(' ');p.append('反证 · ');inline(p,counter,refs);}
        return p;
      }
      function metricCard(grid,r){
        const card=el(grid,'div',null,'metric');
        el(card,'div',r.name||'指标','metric-label');
        point(el(card,'div',null,'metric-value'),r,display(r));
        const note=sourceNote(r);
        if(note){const node=el(card,'div',note,'metric-note');node.title=note;}
      }
      function metricsSection(area,key,x,title){
        const grid=el(area,'div',null,'metrics'),rows=window.reportExport.sectionMetrics(report,key);
        if(rows.length)for(const r of rows)metricCard(grid,r);
        else{
          const card=el(grid,'div',null,'metric metric-empty');
          el(card,'div','本轮缺少'+title+'指标','metric-label');
          el(card,'div','—','metric-value');
          el(card,'div','报告未引用该节可展示的数据点','metric-note');
        }
        if(!prose(area,x,refRows(x)))el(area,'p','本轮缺少可支持该项判断的证据。','rs-text');
      }
      function risksSection(area){
        const risks=report.written.risks||[];
        if(!risks.length){el(area,'p','本轮缺少可支持该项判断的证据。','rs-text');return;}
        for(const [i,x] of risks.entries()){
          const refs=refRows(x),card=el(area,'article',null,'finding'),head=el(card,'div',null,'finding-head');
          el(head,'span','风险 '+(i+1),'finding-no');
          point(el(head,'h4',null,'finding-title'),claimRow('风险 '+(i+1),x,refs),readable(x.judgment)||'判断内容待补');
          const p=el(card,'p',null,'finding-text');
          if(x.text)inline(p,x.text,refs);
          if(x.counter){if(p.textContent)p.append(' ');p.append('反证 · ');inline(p,x.counter,refs);}
          if(!p.textContent)p.append('本轮缺少可支持该项判断的证据。');
        }
      }
      function creditSection(area){
        const x=conclusion('credit'),refs=refRows(x);
        if(x){
          const card=el(area,'article',null,'finding finding-credit'),head=el(card,'div',null,'finding-head');
          el(head,'span','结论','finding-no');
          point(el(head,'h4',null,'finding-title'),claimRow('结论',x,refs),readable(x.judgment)||'判断内容待补');
          const p=el(card,'p',null,'finding-text');
          if(x.text)inline(p,x.text,refs);
          if(x.counter){if(p.textContent)p.append(' ');p.append('反证 · ');inline(p,x.counter,refs);}
          if(!p.textContent)p.append('本轮缺少可支持该项判断的证据。');
        }else el(area,'p','本轮缺少可支持该项判断的证据。','rs-text');
        const gaps=(report.written.gaps||[]).filter(Boolean);
        if(gaps.length)el(area,'p','待核实 · '+readable(gaps[0]),'rs-text');
      }
      const sections=[['summary','摘要'],['performance','经营表现'],['quality','财务质量'],['risk','风险清单'],['credit','对授信的含义']];
      for(const [i,[key,title]] of sections.entries()){
        const area=el(panel,'section',null,'rs'),head=el(area,'h3',null,'rs-title');
        el(head,'span',String(i+1).padStart(2,'0'),'rs-index');
        head.append(title);
        if(key==='risk'){risksSection(area);continue;}
        if(key==='credit'){creditSection(area);continue;}
        if(key==='performance'||key==='quality'){
          metricsSection(area,key,conclusion(key),title);
          if(key==='performance'){
            const trendRows=report.rows;
            const company=report.type==='company';
            const preferred=company?['营业收入','归母净利润','经营现金流']:['销量','装车量','新增并网装机','市场规模','产量'];
            const rank=r=>{const i=preferred.indexOf(r.name);return i<0?preferred.length:i;};
            charts(area,company?'经营趋势':'行业规模、供需与周期',trendRows.slice().sort((a,b)=>rank(a)-rank(b)));
            const segments=trendRows.filter(r=>r.dimension&&/产品收入占比|分部毛利率|分部收入增速/.test(r.name));
            if(company&&segments.length)charts(area,'产品收入与盈利结构',segments);
            comparison(area);
            industryChain(area);
          }
          continue;
        }
        if(!prose(area,conclusion(key),refRows(conclusion(key))))el(area,'p','本轮缺少可支持该项判断的证据。','rs-text');
      }
    }
    function startQuestion(q){
      if(!dialog.open||!report)return null;
      const ref=report;
      const selected=new Map(ref.rows.map(r=>[r.id,r]));
      const interpret=x=>({...x,values:x.refs.map(id=>selected.get(id)).filter(Boolean).map(r=>({id:r.id,metric:r.name,period:r.year,scope:r.dimension,value:r.value,unit:r.unit,formula:r.formula}))});
      return {data:{target:ref.target,snapshot:ref.snapshot,as_of:ref.asOf,question:ref.question,scope:ref.scope,conclusions:ref.written.conclusions.map(interpret),risks:ref.written.risks.map(interpret),gaps:ref.written.gaps},
        paint(){}};
    }
    function open(){
      const s=session();if(!s?.reports?.length)return;
      if(dialog.open){close();return;}
      exportStatus.textContent='';draw();toggleLabel(true);
      dialog.show();syncShell();bumpDock();syncActions();
    }
    sourceBack.onclick=()=>{const previous=stack.pop();if(previous)proof(previous);};
    toggle.onclick=open;$('#report-exit').onclick=close;$('#proof-close').onclick=()=>source.close();
    layer.onclick=e=>{if(e.target===layer)close();};
    sourceLayer.onclick=e=>{if(e.target===sourceLayer)source.close();};
    dock?.querySelector('.model-btn')?.addEventListener('click',()=>{if(dialog.open)close();},true);
    for(const d of [source,dialog])d.addEventListener('close',()=>{clearTimeout(collapseTimer);expandDock();syncShell();dismiss();stack=[];sourceBack.hidden=true;toggleLabel(dialog.open);syncActions();});
    document.addEventListener('keydown',e=>{
      if(e.key!=='Escape')return;
      if(menu.classList.contains('open')){e.preventDefault();e.stopImmediatePropagation();dismiss(true);return;}
      if(source.open){e.preventDefault();e.stopImmediatePropagation();source.close();return;}
      if(dialog.open){e.preventDefault();close();}
    },true);
    document.addEventListener('pointerdown',e=>{if(!menu.contains(e.target))dismiss();},true);
    document.addEventListener('scroll',()=>{
      hideTip();
      if(!menu.classList.contains('open')||!menuAnchor||!origin)return;
      const rect=origin.getBoundingClientRect();
      if(Math.abs(rect.top-menuAnchor.top)>1||Math.abs(rect.left-menuAnchor.left)>1)dismiss();
    },true);window.addEventListener('resize',()=>dismiss());
    syncShell();hideTip();
    return {sync,close,chips,startQuestion,ready(){toggle.disabled=false;toggle.title='展开报告';if(dialog.open)openLatest();}};
    function openLatest(){close();open();}
  }
  return {prepare,valid,bind,catalogue};
})();
