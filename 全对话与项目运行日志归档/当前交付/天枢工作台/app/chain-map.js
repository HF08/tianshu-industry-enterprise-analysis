(function bootstrap(){
  const css = `
  :host{display:block;min-width:0;color:var(--tx,CanvasText);background:var(--bg,Canvas);font:13px/1.6 system-ui,sans-serif;overflow-wrap:anywhere}
  *{box-sizing:border-box;min-width:0}section{container-type:inline-size;padding:12px;border:1px solid var(--line);border-radius:12px;--line:color-mix(in srgb,currentColor 25%,transparent);--soft:color-mix(in srgb,currentColor 6%,transparent)}
  h3,h4,p{margin:6px 0}small,dt{font-size:12px}nav,.nodes,.legend,.chips{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:8px 0}button,.badge{font:inherit;color:inherit;background:var(--soft);border:1px solid var(--line);padding:5px 9px;border-radius:7px}button{cursor:pointer;text-align:start}button[aria-pressed=true]{outline:2px solid currentColor;outline-offset:-2px}
  button:focus-visible,a:focus-visible{outline:2px solid currentColor;outline-offset:2px}
  .stage{display:grid;grid-template-columns:minmax(80px,20%) 1fr;gap:10px;align-items:center}.mark{border-inline-start:4px solid var(--series);padding-inline-start:8px}.mark small{display:block}.arrow{text-align:center}.detail{border-top:1px solid var(--line);margin-top:12px;padding-top:8px}.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(130px,100%),1fr));gap:6px}.facts div{background:var(--soft);padding:6px}dd{margin:0}a{color:var(--link,LinkText);text-decoration:underline}a:hover{ text-decoration-thickness:2px}
  .bar{display:flex;height:32px;margin:8px 0}.segment{display:grid;place-content:center;font-size:12px;overflow:hidden;min-width:0}.segment span{background:var(--bg,Canvas);color:var(--tx,CanvasText);border-radius:3px;padding:0 2px}
  .range{display:grid;grid-template-columns:minmax(60px,1fr) 2fr auto;gap:6px;align-items:center;font-variant-numeric:tabular-nums}.track{height:8px;background:var(--soft);position:relative}.float{height:100%;position:absolute}
  table{width:100%;border-collapse:collapse;table-layout:fixed}td,th{text-align:start;border-bottom:1px solid var(--line);padding:5px;vertical-align:top}td:first-child{font-weight:bold}
  @container(max-width:420px){.stage{display:block}.stage>.mark{display:inline-flex;gap:6px;align-items:baseline}table,tbody,tr,td{display:block}thead{display:none}td::before{content:attr(data-label);display:block;font-size:12px;opacity:.8}tr{margin:10px 0}}
  `;
  const en={chain:'Supply chain',value:'Value distribution',tech:'Technology routes',support:'Supporting activities',trend:'Technology / trend',risk:'Risk / constraints',companies:'Companies',links:'Sources',copy:'Copy URL',download:'Export HTML'};
  const zh={chain:'产业链全景',value:'价值分布',tech:'技术路线',support:'配套支撑',trend:'技术/趋势',risk:'风险/瓶颈',companies:'关联企业',links:'来源',copy:'复制链接',download:'导出图谱 HTML'};
  function mount(host,d){
    if(!d||!Array.isArray(d.nodes)||!Array.isArray(d.stages))return false;
    const nodes=d.nodes.filter(n=>n&&n.id&&n.name),active=g=>g?.id&&g.name&&nodes.some(n=>n.group===g.id);
    const stages=d.stages.filter(active),supports=(d.supports||[]).filter(g=>active(g)&&g.target);
    const groups=[...stages,...supports], labels={...(String(d.lang||document.documentElement.lang||'zh').startsWith('en')?en:zh),...d.labels};
    if(d.views?.chain!==false&&(stages.length<2||stages.length>5||supports.length>4||new Set(groups.map(g=>g.id)).size!==groups.length||new Set(nodes.map(n=>n.id)).size!==nodes.length||nodes.some(n=>!groups.some(g=>g.id===n.group))))return false;
    const v=d.valueView||{},t=d.techView||{};
    const cost=(v.cost||[]).filter(x=>x.label&&Number.isFinite(x.value)&&x.value>0);
    if(Math.abs(cost.reduce((a,x)=>a+x.value,0)-100)>1)cost.length=0;
    const margins=(v.margins||[]).filter(x=>x.name&&Number.isFinite(x.min)&&Number.isFinite(x.max)&&x.max>=x.min);
    const tabs=['chain','value','tech'].filter(k=>d.views?.[k]!==false&&(k==='chain'?stages.length:k==='value'?cost.length||margins.length:t.columns?.length&&t.rows?.some(r=>r.length===t.columns.length)));
    if(!tabs.length)return false;
    const shadow=host.shadowRoot||host.attachShadow({mode:'open'});shadow.replaceChildren();
    function el(tag,parent,text,cls){const x=document.createElement(tag);if(cls)x.className=cls;if(text!=null)x.textContent=text;parent.append(x);return x;}
    el('style',shadow,css);const box=el('section',shadow);
    const color=i=>'var(--series-'+(2+i%5)+',hsl('+[215,32,158,282,350][i%5]+' 55% 53%))';
    function mark(x,g){const i=/^series-[2-6]$/.test(g.accent)?Number(g.accent.slice(-1))-2:groups.indexOf(g);x.style.setProperty('--series',color(i));return x;}
    function link(parent,item,type){
      const name=item.name||item.label;if(!name)return;
      const raw=item.url||(item.id&&d.linkTemplates?.[type]?.replace(/\{(?:id|slug)\}/g,encodeURIComponent(item.id)));
      let href;
      try{if(typeof raw==='string'&&(/^https:\/\//i.test(raw)||/^\/(?:company|industry|report)\/[^/\\?#]+(?:[/?][^\\]*)?$/.test(raw))&&!raw.includes('\\'))href=new URL(raw,d.baseUrl||document.baseURI).href;}catch{}
      if(!href){el('span',parent,name,'badge');return;}
      let blocked=location.protocol==='file:'&&raw.startsWith('/');
      try{if(self!==top)blocked=blocked||!window.frameElement||window.frameElement.hasAttribute('sandbox')&&!window.frameElement.sandbox.contains('allow-popups');}catch{blocked=true;}
      if(blocked){const badge=el('span',parent,name,'badge'),url=el('input',badge);url.readOnly=true;url.value=href;url.setAttribute('aria-label',labels.copy);url.style.maxWidth='100%';url.onfocus=()=>url.select();return;}
      const a=el('a',parent,name);a.href=href;a.target='_blank';a.rel='noopener noreferrer';
    }
    const score=n=>(n.facts?.length||0)+(n.companies?.length||0)+(n.links?.length||0)+[n.desc,n.trend,n.risk].filter(Boolean).length;
    let selected=nodes.filter(n=>stages.some(g=>g.id===n.group)).sort((a,b)=>score(b)-score(a))[0],tab=tabs[0];
    el('h3',box,d.industry);if(d.dataNote)el('small',box,d.dataNote);
    const nav=el('nav',box),body=el('div',box);
    const buttons=new Map();
    function chain(){
      const legend=el('div',body,null,'legend');for(const g of groups)mark(el('small',legend,g.name,'mark'),g);
      const btns=new Map();
      for(const [i,g] of groups.entries()){
        if(i===stages.length)el('h4',body,labels.support);
        if(i>0&&i<stages.length)el('div',body,'↓','arrow');
        const row=el('div',body,null,'stage'),label=mark(el('div',row,g.name,'mark'),g);
        const sub=i<stages.length?g.sub:'→ '+g.target;if(sub)el('small',label,sub);
        const strip=el('div',row,null,'nodes');
        nodes.filter(n=>n.group===g.id).forEach((n,j)=>{
          if(j)el('span',strip,'→');
          const b=mark(el('button',strip,n.name,'mark'),g);if(n.sub)el('small',b,n.sub);btns.set(n,b);b.onclick=()=>{selected=n;detail();};
        });
      }
      const panel=el('div',body,null,'detail');panel.setAttribute('aria-live','polite');
      function detail(){
        panel.replaceChildren();const n=selected,g=groups.find(g=>g.id===n.group);
        for(const [node,b] of btns)b.setAttribute('aria-pressed',String(node===n));
        el('h4',panel,n.name);mark(el('span',panel,g.name,'badge mark'),g);
        const defaults=['desc','facts','companies','trend','risk','links'];
        for(const field of new Set([...(d.detailOrder||[]),...defaults])){
          const val=n[field];if(!val||!defaults.includes(field))continue;
          if(field==='facts'&&val.length){const grid=el('dl',panel,null,'facts');for(const [key,value,url] of val){const cell=el('div',grid);el('dt',cell,key);link(el('dd',cell),{name:String(value),url},'report');}}
          else if(['companies','links'].includes(field)&&val.length){el('small',panel,labels[field]);const chips=el('div',panel,null,'chips');val.forEach(x=>link(chips,x,field==='companies'?'company':x.type||'report'));}
          else if(typeof val==='string'){if(labels[field])el('strong',panel,labels[field]);el('p',panel,val);}
        }
      }detail();
    }
    function render(){
      body.replaceChildren();for(const [k,b] of buttons)b.setAttribute('aria-pressed',String(k===tab));
      if(tab==='chain'){chain();return;}
      if(tab==='tech'){if(t.title)el('h4',body,t.title);const table=el('table',body),head=el('tr',el('thead',table));t.columns.forEach(c=>el('th',head,c));const tb=el('tbody',table);for(const r of t.rows.filter(r=>r.length===t.columns.length)){const tr=el('tr',tb);r.forEach((cell,i)=>el('td',tr,cell).dataset.label=t.columns[i]);}if(t.insight)el('p',body,t.insight);return;}
      if(cost.length){if(v.costTitle)el('h4',body,v.costTitle);const bar=el('div',body,null,'bar'),legend=el('div',body,null,'legend');cost.forEach((x,i)=>{const s=el('div',bar,null,'segment');s.style.flex=String(x.value);s.style.background=color(i);s.title=x.label+' '+x.value+'%';el('span',s,x.value+'%');el('span',legend,s.title,'mark').style.setProperty('--series',color(i));});}
      if(margins.length){if(v.marginTitle)el('h4',body,v.marginTitle);const lo=Math.floor(Math.min(0,...margins.map(x=>x.min))/10)*10,hi=Math.max(lo+10,Math.ceil(Math.max(...margins.map(x=>x.max))/10)*10);el('small',body,lo+'% — '+hi+'%');margins.forEach((x,i)=>{const row=el('div',body,null,'range');el('span',row,x.name);const f=el('div',el('div',row,null,'track'),null,'float');f.style.left=100*(x.min-lo)/(hi-lo)+'%';f.style.width=100*(x.max-x.min)/(hi-lo)+'%';f.style.minWidth='2px';f.style.background=color(i);el('span',row,x.min+'–'+x.max+'%');if(x.note)el('small',body,x.note);});}if(v.insight)el('p',body,v.insight);
    }
    for(const k of tabs){const b=el('button',nav,labels[k]);buttons.set(k,b);b.onclick=()=>{tab=k;render();};}
    render();return true;
  }
  function fragment(data){
    const id='chain-'+crypto.randomUUID();
    return '\uFEFF<div id="'+id+'"></div><script>('+bootstrap.toString()+')();window.chainMap.mount(document.getElementById("'+id+'"),'+JSON.stringify(data).replace(/</g,'\\u003c')+');<\/script>';
  }

  window.chainMap={mount,fragment};
})();
