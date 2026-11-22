// Views share one session. Model text always enters the page as text, never as executable HTML.
window.researchBoard=(()=>{
  const names={IND:'行业状况',CHAIN:'同业企业竞争分析',DEM:'规模客户',RI:'行业风险',FIN:'财务计算',BIZ:'产品与商业模式',COMP:'同行竞争分析',SUPPLY:'产业链分析',RPT:'可视化报告',RC:'企业风险'};
  const glyphs=['Activity','GitFork','UsersRound','Network','ShieldCheck','Activity'];
  const colors=['#70d8c9','#bba6ff','#f6be76','#caaf78','#8fb7ff','#9cd8b1'];
  const $=id=>document.getElementById(id);
  function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
  function icon(name){const e=document.createElementNS('http://www.w3.org/2000/svg','svg');e.setAttribute('class','board-icon');e.setAttribute('aria-hidden','true');const u=document.createElementNS(e.namespaceURI,'use');u.setAttribute('href','#board-'+name);e.append(u);return e;}
  function button(cls,text,act){const b=el('button',cls,text);b.type='button';b.onclick=act;return b;}
  function short(text){return String(text||'').trim().split(/(?<=[。！？])|\n/).find(Boolean)||'';}
  function values(s,id){return s.visuals?.[id]||{rows:[],sources:{},missing:[]};}
  function roles(s){return s.agents.map(x=>x.id);}
  function label(s,id){return s.trace?.entries.get(id)?.label||'等待研究';}
  function summary(s,id){return s.agentOutput?.[id]?.report?.summary||s.trace?.entries.get(id)?.text||'等待该角色开展研究。';}
  function groups(rows,id){
    const pool=new Map();for(const r of rows||[]){if(!r.name||!Number.isFinite(r.value)||(!r.year&&!r.period))continue;
      const key=JSON.stringify([r.name,r.dimension||'',r.unit||'']);if(!pool.has(key))pool.set(key,[]);pool.get(key).push(r);}
    const primary={IND:'装车量',FIN:'营业收入',CHAIN:'代表企业样本营收占比',COMP:'同业候选营收相对倍数',DEM:'销量',BIZ:'分部毛利率',RI:'销量同比年度变化',RC:'毛利率年度变化'}[id];
    return [...pool.values()].map(g=>g.sort((a,b)=>String(a.year||a.period).localeCompare(String(b.year||b.period)))).sort((a,b)=>(b[0].name===primary)-(a[0].name===primary)||b.length-a.length);
  }
  const fmt=v=>Number(v).toLocaleString('zh-CN',{maximumFractionDigits:2});
  function metric(r){const n=Math.abs(r.value);const factor=n>=1e8?1e8:n>=1e5?1e4:1;return {value:fmt(r.value/factor),unit:(factor===1e8?'亿':factor===1e4?'万':'')+(r.unit||'')};}
  function chart(series,tiny=false){
    const group=el('div',tiny?'mini-bars':'board-chart');const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    const rows=series,w=300,h=108,max=Math.max(0,...rows.map(r=>r.value)),min=Math.min(0,...rows.map(r=>r.value));
    svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.setAttribute('role','img');svg.setAttribute('aria-label',rows.map(r=>`${r.year||r.period}年 ${fmt(r.value)}${r.unit}`).join('，'));
    function mark(tag,attrs,text){const n=document.createElementNS(svg.namespaceURI,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;svg.append(n);return n;}
    const y=v=>12+(max-v)/(max-min||1)*70;const zero=y(0);mark('line',{x1:4,x2:296,y1:zero,y2:zero,stroke:'#6e8087','stroke-width':1});
    const bw=280/Math.max(rows.length,1);rows.forEach((r,i)=>{const x=10+i*bw+bw*.18;mark('rect',{x,y:Math.min(y(r.value),zero),width:bw*.64,height:Math.max(1,Math.abs(zero-y(r.value))),rx:2,fill:'var(--role-color)',opacity:.52+(i+1)/rows.length*.46});if(!tiny)mark('text',{x:x+bw*.32,y:101,'text-anchor':'middle',fill:'#c5d5d8','font-size':10},String(r.year||r.period));});group.append(svg);return group;
  }
  function selected(s,id){return s.trace.entries.get(id)||{};}
  function fact(s,id){const g=groups(values(s,id).rows,id)[0];if(!g)return null;const r=g.at(-1);return{g,r,text:`${r.year||r.period} · ${r.name}`};}
  function spark(series){
    const host=el('span','spark');const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 164 64');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-label',series.map(r=>`${r.year||r.period} · ${fmt(r.value)} ${r.unit}`).join('，'));svg.setAttribute('role','img');
    function draw(tag,attrs){const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);svg.append(n);}
    for(let y of [12,30,48])draw('path',{d:`M3 ${y} H160`,stroke:'currentColor',opacity:'.19','stroke-dasharray':'2 4',fill:'none'});
    const v=series.map(r=>r.value),min=Math.min(...v),max=Math.max(...v);const xy=v.map((value,i)=>[v.length===1?85:8+147*i/(v.length-1),v.length===1?30:44-(value-min)/(max-min||1)*32]);
    if(xy.length>1){const line=xy.map(p=>p.join(',')).join(' ');draw('polygon',{points:`${xy[0][0]},57 ${line} ${xy.at(-1)[0]},57`,fill:'currentColor',opacity:'.09'});draw('polyline',{points:line,fill:'none',stroke:'currentColor','stroke-width':2.2});}
    const [x,y]=xy.at(-1);draw('circle',{cx:x,cy:y,r:8,fill:'currentColor',opacity:'.16'});for(const [x,y] of xy)draw('circle',{cx:x,cy:y,r:3,fill:'currentColor'});host.append(svg,el('small','',series.length===1?String(series[0].year||series[0].period):String(series[0].year||series[0].period)+' — '+String(series.at(-1).year||series.at(-1).period)));return host;
  }
  function cornerResult(s,id){
    const output=s.agentOutput?.[id],report=output?.report;
    if(output?.error||s.agents.find(a=>a.id===id)?.status==='失败')return {title:'本项研究未完成',support:output?.error||'未收到有效研究回报。'};
    if(!report)return {title:s.phase==='done'?'本项结论待核实':'等待研究结论',support:label(s,id)};
    const summary=String(report.summary||'').trim();
    const proposed=report.overview_card||{};
    const validTitle=t=>typeof t==='string'&&t.trim().length>=4&&t.trim().length<=28&&/[\u3400-\u9fff]{2}/.test(t)&&!/[0-9]+(?:[.,][0-9]+)*\s*(?:[万亿]?元|%|倍|GWh|天)/i.test(t);
    if(validTitle(proposed.headline)&&typeof proposed.support==='string'&&proposed.support.trim())return {title:proposed.headline.trim(),support:proposed.support.trim()};
    // Historical recordings have no card fields. Use their own conclusion and supporting sentences.
    const clauses=summary.split(/[。；：，]/).map(t=>t.trim()).filter(Boolean);
    const title=clauses.find(t=>validTitle(t)&&!/^且|^但|^因此|^分别/.test(t)&&/增长|回落|放缓|背离|不同|改善|承压|无法|缺少|不能|上升|下降|集中|弱于|不足|依赖|有限/.test(t));
    const limit=(report.missing||[]).map(m=>typeof m==='string'?m:m?.impact||m?.reason||m?.field).filter(Boolean)[0];
    return {title:title|| (limit?'关键判断仍待核实':'研究结论待提炼'),support:summary||limit||'本轮尚无可核验的数据。'};
  }
  function roleCard(s,id,click){
    const a=s.agents.find(a=>a.id===id)||{},out=s.agentOutput?.[id],entry=selected(s,id);
    const status=a.status||'等待中';
    const description=status==='失败'?(out?.error||a.task):status==='已完成'?(out?.report?.summary||a.task||entry.text):(a.task||entry.text);
    const card=button('compact-role','',click);card.dataset.role=id;card.dataset.status=status;
    card.setAttribute('aria-pressed',String(s.view===id||s.boardMode==='detail'&&s.boardId===id));
    const head=el('span','compact-head');head.append(el('i','compact-dot'),el('b','',names[id]||a.name||id),el('small','',status));
    const note=el('span','compact-note',description||'等待派发');card.title=note.textContent;card.append(head,note);return card;
  }
  function panel(s,id,i,mode,click){
    if(mode==='thumb')return roleCard(s,id,click);
    const entry=selected(s,id),f=fact(s,id),card=button('board-card '+mode,'',click);card.style.setProperty('--role-color',colors[i]);card.dataset.role=id;
    const head=el('span','bc-head');head.append(icon(glyphs[i]),el('b','',names[id]),el('span','bc-state',label(s,id)));card.append(head);
    if(mode==='corner'){
      const result=cornerResult(s,id);
      const headline=el('strong','bc-verdict',result.title),evidence=el('span','bc-support',result.support);
      card.append(headline,evidence);card.title=result.title+' · '+result.support;
      if(entry.kind==='error')card.classList.add('has-gap');
      return card;
    }
    if(f && mode!=='live'){const met=el('span','bc-metric');met.append(el('b','',metric(f.r).value),el('small','',metric(f.r).unit));card.append(met,el('span','bc-caption',f.text));}
    card.append(el('span','bc-caption bc-summary',short(summary(s,id))));
    if(mode==='thumb'&&f)card.append(chart(f.g,true));if(entry.kind==='error')card.classList.add('has-gap');return card;
  }
  const clock=ms=>new Date(ms).toLocaleTimeString('zh-CN',{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'});
  function runningCards(s,detail){
    const list=el('section','running-cards');
    const agents=s.agents||[],done=agents.filter(a=>a.status==='已完成'||a.status==='失败').length;
    const header=el('header','running-header');header.append(el('h2','','子智能体'),el('small','',agents.length+' 个'));list.append(header);
    if(!agents.length)list.append(el('p','board-note','等待派单'));
    for(const a of agents){list.append(roleCard(s,a.id,()=>{if(document.querySelector('#agent-panel')&&!s.replay){const toggle=document.querySelector('#toggle-agents');if(toggle?.getAttribute('aria-expanded')==='false')toggle.click();document.dispatchEvent(new CustomEvent('agent-selected',{detail:{role:a.id}}));}else detail(a.id);}));
    }return list;
  }
  function comparison(s){
    const all=values(s,'IND').rows||[];
    const names=['销量','装车量'], series=names.map(n=>all.filter(r=>r.name===n&&r.unit==='GWh'&&Number.isFinite(r.value)&&Number.isInteger(r.year)));
    if(series.some(rows=>!rows.length)||!String(s.research||s.plan?.scope).includes('装车量'))return null;
    const years=[...new Set(series.flat().map(r=>r.year))].sort(),max=Math.max(...series.flat().map(r=>r.value));
    const fig=el('figure','compare-sheet');const top=el('div','compare-head');top.append(el('figcaption','','销量与装车量'),el('small','','GWh'));fig.append(top);
    const legend=el('div','compare-legend');legend.append(el('span','key-sale',series[0][0].dimension||'销量'),el('span','key-load',series[1][0].dimension||'装车量'));fig.append(legend);
    for(const year of years){const row=el('div','compare-year');row.append(el('b','',String(year)));const pair=el('div','compare-pair');series.forEach((group,i)=>{const v=group.find(r=>r.year===year);const line=el('div','value-line tone'+i),bar=el('i',''),num=el('span','',v?fmt(v.value):'本轮缺数');bar.style.setProperty('--size',v?`${100*v.value/max}%`:'0%');line.append(bar,num);if(!v)line.classList.add('missing');pair.append(line);});row.append(pair);fig.append(row);}
    const src=series.flat().flatMap(r=>(r.inputs||[]).map(k=>s.verifiedLedger?.sources?.[k])).filter(Boolean);const docs=[...new Set(src.map(o=>o.title||o.publisher).filter(Boolean))];if(docs.length)fig.append(el('small','compare-source','资料 · '+docs.join('、')));return fig;
  }
  function overview(s,detail,stage){
    const g=el('div','atlas');roles(s).filter(id=>!['RPT','SUPPLY'].includes(id)).forEach((id,i)=>{const c=panel(s,id,i,'corner',()=>detail(id));c.style.setProperty('--order',i);c.classList.add('pos'+i);g.append(c);});
    const spine=el('div','atlas-spine');const targetButton=button('spine-node n1',s.plan?.target||'研究标的',()=>stage(1));const chainButton=button('spine-node n0','产业链分析',()=>stage('chain'));spine.append(targetButton,chainButton);g.append(spine);const box=el('div','overview-page');box.append(g);if(s.verifiedLedger)evidencePages.nav(box,s.verifiedLedger,s.verifiedLedger,s.plan?.target,s.snapshot,s.asOf);const compare=comparison(s);if(compare)box.append(compare);return box;
  }
  const fields={locator:'原文定位',published:'披露日期',sha256:'原文校验值',observation:'原始观测',evidence:'来源证据',calculations:'计算记录',artifacts:'调查发现',risk_findings:'风险复核',missing:'资料缺口',agent_analysis:'研究说明',status:'完成情况',id:'编号',type:'类别',scope:'统计口径',period:'期间',claims:'具体判断',claim_id:'判断编号',tag:'性质',text:'内容',evidence_ids:'引用证据',calc_ids:'引用计算',confidence:'可信程度',reason:'依据',counterevidence:'反证',limits:'适用边界',impact:'影响',verification_needed:'补证要求',contradictions:'冲突记录',handoff_to:'接收方',evidence_id:'证据编号',publisher:'发布机构',source_level:'来源层级',title:'资料名称',url_or_document_id:'原文或文档号',url:'原始链接',url_or_document:'原始出处',version:'版本',published_at:'发布日期',retrieved_at:'取数时间',period_or_date:'资料期间',page_or_table_or_section:'页码或表格定位',excerpt:'原文摘录',value:'数值',currency:'币种',unit:'单位',calc_id:'计算编号',metric:'指标',definition:'定义',formula:'计算方法',inputs:'输入依据',result:'结果',rounding:'舍入规则',sources:'登记出处',source:'数据来源',field:'字段',name:'名称',dimension:'统计对象',year:'年份',need:'补证所需字段',table:'数据表',mode:'审查模式',trigger:'触发条件',mechanism:'作用机制',exposure:'影响范围',horizon:'时间范围',observed_or_scenario:'观察或情景',mitigants:'缓释因素',risk_level:'风险等级',level_reason:'分级理由',monitor:'监测指标',upstream_ids:'上游回报',count:'样本数',excluded:'排除项',method:'方法',chainGraph:'产业链图谱',stages:'环节',nodes:'节点',edges:'关联',facts:'事实',group:'所属环节',from:'起点',to:'终点',relation:'关系',sub:'说明',summary:'摘要',rows:'明细',evidence_ref:'证据引用',level:'等级',searched:'已查范围',limitations:'限制',description:'说明'};
  const caption=k=>fields[k]||k;
  const isURL=v=>{try{return /^https?:$/.test(new URL(v).protocol);}catch{return false;}};
  function prose(text){
    const div=el('div','reading-prose');if(!window.markdownit){div.textContent=text;return div;}
    const md=window.markdownit({html:false,breaks:true,linkify:false}).disable('image');md.validateLink=isURL;div.innerHTML=md.render(String(text||''));
    div.querySelectorAll('a').forEach(a=>{a.target='_blank';a.rel='noopener noreferrer';});return div;
  }
  function fold(title,count,draw,cls=''){
    const box=el('details','doc-fold '+cls),head=el('summary','');head.append(el('strong','',title));if(count!=null)head.append(el('small','',String(count)));box.append(head);
    box.addEventListener('toggle',()=>{if(box.open&&box.childElementCount===1)box.append(draw());});return box;
  }
  function blockTitle(x,index){if(typeof x!=='object'||x===null)return typeof x==='string'?x:'记录 '+(index+1);
    const title=[x.year||x.period_or_date,x.name||x.metric||x.title||x.field||x.text||x.trigger||x.publisher||x.type||x.id||x.evidence_id||x.calc_id].filter(v=>typeof v==='string'||typeof v==='number').join(' · ');return title||'记录 '+(index+1);}
  function lookup(s,role){const map=new Map();function put(key,v,name){if(typeof key==='string'&&!map.has(key))map.set(key,{v,name});}
    const order=[role,...roles(s).filter(i=>i!==role)];for(const id of order){const r=s.agentOutput?.[id]?.report||{};for(const k of ['evidence','calculations','artifacts','risk_findings'])for(const row of r[k]||[]){for(const key of [row.evidence_id,row.calc_id,row.id])put(key,row,names[id]+' · '+caption(k));}}
    const ledger=s.verifiedLedger||{};for(const o of [...(ledger.observations||[]),...(ledger.interim||[])])put(o.id,o,'台账观测');return {map,sources:ledger.sources||{}};
  }
  function record(value,refs,key='',visited=new Set()){
    if(Array.isArray(value)){
      if(!value.length)return el('span','nil','无记录');
      const list=el('div','record-list');for(const x of value){const row=el('div','record-item');row.append(record(x,refs,key,visited));list.append(row);}return list;
    }
    if(value&&typeof value==='object'){
      const outer=el('div','record-body'),dl=el('dl','record-fields');outer.append(dl);if(value.sha256&&window.openCaseSource?.has(value.sha256)){const pg=String(value.locator||value.page_or_table_or_section||'').match(/第\s*(\d+)\s*页/);outer.prepend(button('local-source','查看随案原件'+(pg?' · 第 '+pg[1]+' 页':'')+' ↗',()=>window.openCaseSource.open(value.sha256,pg?Number(pg[1]):1)));}for(const [k,v] of Object.entries(value)){const dd=el('dd','');dd.append(record(v,refs,k,visited));dl.append(el('dt','',caption(k)),dd);}return outer;
    }
    if(typeof value==='string'&&isURL(value)){const a=el('a','doc-source','打开原文 ↗ '+new URL(value).hostname);a.href=value;a.target='_blank';a.rel='noopener noreferrer';a.title=value;return a;}
    const src=key==='source'?refs.sources[value]:null;
    const ref=src?{v:src,name:'登记出处'}:(['inputs','evidence_ids','calc_ids','evidence_ref','source','url_or_document_id'].includes(key)?refs.map.get(value):null);
    const identity=(src?'source:':'ref:')+value;
    if(ref&&!visited.has(identity)){const next=new Set(visited);next.add(identity);return fold(ref.name+' · '+value,null,()=>record(ref.v,refs,'',next),'ref-fold');}
    return el('span',value==null?'nil':'',value==null?'未提供':String(value));
  }
  function collection(title,rows,refs){return fold(title,rows.length,()=>{const list=el('div','doc-items');rows.forEach((row,i)=>{if(typeof row==='string')list.append(record(row,refs));else list.append(fold(blockTitle(row,i),null,()=>record(row,refs),'record-fold'));});return list;});}
  function roleDetail(s,id){
    const data=values(s,id),out=s.agentOutput?.[id]||{},r=out.report||{},refs=lookup(s,id),view=el('section','role-sheet');view.style.setProperty('--role-color',colors[roles(s).indexOf(id)]);
    const head=el('div','sheet-head');head.append(icon(glyphs[roles(s).indexOf(id)]),el('h2','',names[id]),el('span','sheet-status',label(s,id)));view.append(head);
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
    if(out.error)view.append(el('p','board-note','本轮该角色没有交付可核验的报告。'));
    for(const key of ['artifacts','risk_findings','evidence','calculations','missing'])if(r[key]?.length)view.append(collection(caption(key),r[key],refs));
    const others=Object.fromEntries(Object.entries(r).filter(([k])=>!['summary','agent_analysis','artifacts','risk_findings','evidence','calculations','missing','overview_card'].includes(k)));
    if(Object.keys(others).length)view.append(fold('分册附录',null,()=>record(others,refs)));
    if(isResearch){
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
    const series=groups(data.rows,id);if(series.length)view.append(fold('指标图表',series.length,()=>{const plots=el('div','plot-grid');for(const g of series){const f=el('figure','plot');f.append(el('figcaption','',[g[0].name,g[0].dimension,g[0].unit].filter(Boolean).join(' · ')),chart(g));plots.append(f);}return plots;}));
    for(const [k,t] of [['rows','指标与关系明细'],['evidence','台账观测'],['interim','近期观测'],['missing','台账缺口'],['issues','取数问题'],['conflicts','数据冲突']])if(data[k]?.length)view.append(collection(t,data[k],refs));
    const src=Object.entries(data.sources||{});if(src.length)view.append(collection('登记来源与原文链接',src.map(([id,v])=>({id,...v})),refs));return view;
  }
  function supply(s,i){const view=el('section','role-sheet');const study=s.agentOutput?.SUPPLY?.report?.chainStudy;if(i==='chain'&&!study){if(s.agents.some(a=>a.id==='SUPPLY')){view.append(el('p','board-note',s.agentOutput?.SUPPLY?.error||'等待产业链分析回报'));}else{[0,1,2].forEach(j=>view.append(supply(s,j)));}return view;}if(i!=='1'&&i!==1&&study&&window.supplyNetwork){window.supplyNetwork.mount(view,study,s.verifiedLedger?.sources||{},i);return view;}const g=s.agentOutput?.CHAIN?.report?.chainGraph||s.agentOutput?.COMP?.report?.chainGraph;
    view.append(el('h2','',['上游产业分析',s.plan?.target||'研究标的','下游产业分析'][i]));
    if(i===1)view.append(el('p','sheet-abstract',s.plan?.scope||''));
    const stages=g?.stages||[],stage=stages[i===0?0:i===2?stages.length-1:Math.floor(stages.length/2)];
    const nodes=stage?(g.nodes||[]).filter(n=>n.group===stage.id):[];
    if(nodes.length){const grid=el('div','chain-grid');for(const n of nodes){const card=el('article','chain-tile');card.append(icon('Boxes'),el('h3','',n.name),el('p','',n.sub||''));for(const fact of (n.facts||[]))if(Array.isArray(fact))card.append(el('p','bc-caption',fact.join(' · ')));grid.append(card);}view.append(grid);}
    else {
      const industry=s.plan?.type==='industry';const id=i===1?(industry?'IND':'FIN'):i===0?(industry?'CHAIN':'COMP'):(industry?'DEM':'BIZ');
      const refs=lookup(s,id),v=values(s,id);if(s.agentOutput?.[id]?.report)view.append(prose(summary(s,id)));
      const rows=i===0?(v.rows||[]).filter(row=>/原料|关键投入|供应|进口/.test(row.name)):(v.rows||[]);
      if(rows.length)view.append(collection('本环节可查指标',rows,refs));if((v.missing||[]).length)view.append(collection('本环节资料缺口',v.missing,refs));
      if(i!==1)view.append(el('p','board-note','本轮没有登记可核实的具名交易关系。'));
    }return view;
  }
  function bind(get){const wrap=$('trace-scroll'),bar=$('board-modes'),rail=$('board-rail');let owner=null,frame=0,signature='',lastMode='';
    const session=get;
    function change(mode,id){if(mode==='report'&&get()?.reports?.length&&document.getElementById('research-report')){document.dispatchEvent(new Event('live-report-request'));return;}wrap.scrollTop=0;const s=session();if(!s)return;s.boardMode=mode;s.boardId=id;signature='';render();}
    const openRole=id=>change('detail',id),openStage=i=>change('stage',i);
    function render(){frame=0;const s=session();if(!s)return;const on=!!s.traceOpen&&!!s.trace;rail.hidden=!on;bar.hidden=!on;if(!on){wrap.replaceChildren();return;}
      const mode=s.boardMode||'work',ids=roles(s);$('trace-pane').dataset.mode=mode;const key=[mode,s.trace.events?.length,s.finalText?.length,s.boardId,...s.agents.map(a=>a.status+' '+(a.task||'')),s.phase,s.plan?.target,...[...s.trace.entries.values()].map(x=>x.label+' '+short(x.text).slice(0,180)),...ids.map(id=>values(s,id).rows?.length||0)].join('|');if(owner===s&&key===signature)return;owner=s;signature=key;const old=wrap.scrollTop;
      $('trace-status').textContent=s.replay?'实机录制 · 回放':s.phase==='done'?'本轮已完成':s.phase==='failed'?'本轮已结束':'本轮调查';
      const large=mode==='detail'||mode==='stage'||mode==='report';const head=el('div','board-heading');
      const routeTitles={work:'子代理运行',overview:'研究全览',report:'研究报告',detail:names[s.boardId],stage:s.boardId==='chain'?'产业链分析':['上游产业分析',s.plan?.target,'下游产业分析'][s.boardId]};head.append(el('div','board-kicker',s.plan?.type==='company'?'企业研究':s.plan?.type==='industry'?'行业研究':'调查工作台'),el('h2','',routeTitles[mode]||'研究工作台'));
      if(large)head.append(button('board-back','← 返回全览',()=>change('overview')));
      let body;if(mode==='work')body=runningCards(s,openRole);else if(mode==='overview')body=overview(s,openRole,openStage);else if(mode==='detail')body=roleDetail(s,s.boardId);else if(mode==='stage')body=supply(s,s.boardId);else{body=el('div','board-report');if(s.finalText){const lead=el('article','report-lead');lead.append(el('h3','','综合结论'),prose(s.finalText));body.append(lead);}const compare=comparison(s);if(compare)body.append(compare);if(s.verifiedLedger){const ledger=s.verifiedLedger;const refs=lookup(s,ids[0]);body.append(fold('本轮完整数据台账',null,()=>{const div=el('div','doc-items');for(const [k,t] of [['metrics','指标与计算'],['observations','原始观测'],['interim','近期观测'],['missing','资料缺口'],['conflicts','数据冲突'],['issues','取数问题']])div.append(collection(t,ledger[k]||[],refs));div.append(collection('原始来源',Object.entries(ledger.sources||{}).map(([sourceKey,v])=>({sourceKey,...v})),refs));return div;}));}if(s.plan?.scope)body.append(fold('调查范围与统计口径',null,()=>prose(s.plan.scope)));if(s.research)body.append(fold('原始调查问题',null,()=>prose(s.research)));ids.filter(id=>id!=='RPT').forEach(id=>body.append(roleDetail(s,id)));if(!ids.length)body.append(el('p','board-note','角色完成研究后，报告将在这里生成。'));}
      if(mode==='overview'&&lastMode!==mode)body.querySelector('.atlas')?.classList.add('is-entry');lastMode=mode;wrap.replaceChildren(head,body);wrap.scrollTop=large||mode==='work'?old:0;rail.replaceChildren(el('h3','','研究分册'));
      ids.filter(id=>id!=='RPT').forEach((id,i)=>rail.append(panel(s,id,i,'thumb',()=>openRole(id))));
      if(!ids.length)rail.append(el('p','bc-caption','研究范围确定后显示分册。'));
      for(const b of bar.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',String(b.dataset.mode===(mode==='work'?'work':'overview')));
      $('trace-pane').classList.toggle('reading',large);
    }
    bar.onclick=e=>{const mode=e.target.closest('[data-mode]')?.dataset.mode;if(mode)change(mode);};
    return {schedule(){if(!frame)frame=requestAnimationFrame(render);},mount(){signature='';render();},report(){change('report');},finish(s){s.boardMode||='work';signature='';render();if(!document.getElementById('composer')&&s.phase==='done'&&s.boardMode==='work')setTimeout(()=>{if(session()===s&&s.traceOpen&&s.boardMode==='work')change('overview');},1800);}};
  }
  return {bind};
})();
