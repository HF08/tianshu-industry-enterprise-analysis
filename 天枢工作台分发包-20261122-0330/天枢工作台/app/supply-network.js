window.supplyNetwork=(()=>{
  const stages=['upstream','midstream','downstream'],labels=['上游','中游','下游'];
  function task(ledger,plan,question,run_id,as_of){
    const relevant=ledger.observations.filter(o=>o.field==='产业链关系'||/并网|装机|发电量|产能|产量|销量|原料|装车|供应商|客户|分部收入|订单|价格/.test(o.field)).filter(o=>!Array.isArray(o.value));
    const rows=relevant.sort((a,b)=>Number(b.field==='产业链关系')-Number(a.field==='产业链关系')||b.year-a.year).slice(0,100);
    const sources=Object.fromEntries(rows.filter(o=>o.source&&ledger.sources[o.source]).map(o=>[o.source,ledger.sources[o.source]]));
    return {run_id,analysis_mode:plan.type==='company'?'enterprise':'industry',target_type:plan.type,target_name:plan.target,research_question:question,period:ledger.years.join('、'),as_of,evidence_pack:{observations:rows,sources},industry_context:plan.scope};
  }
  function handoff(raw,data){
    const fail=()=>{throw Error('回报必需字段或产业链节点引用不正确');};
    if(!raw||raw.analysis_mode!==data.analysis_mode||typeof raw.summary!=='string'||!Array.isArray(raw.nodes)||!Array.isArray(raw.relationships)||!['complete','partial','blocked','failed'].includes(raw.status)||!raw.selection_adjustment)fail();
    if(raw.status==='failed')throw Error('产业链研究失败：'+raw.summary);
    const ids=new Set(raw.nodes.map(n=>n.node_id));
    if(ids.size!==raw.nodes.length||raw.nodes.some(n=>!n.node_id||!n.name||!stages.includes(n.stage))||raw.relationships.some(e=>!ids.has(e.source_node_id)||!ids.has(e.target_node_id)))fail();
    const evidence=new Set([...Object.keys(data.evidence_pack.sources),...data.evidence_pack.observations.map(o=>o.id)]);
    if([...raw.nodes,...raw.relationships].some(item=>!Array.isArray(item.evidence_ids)||item.evidence_ids.some(id=>!evidence.has(id))||(item.claim_type==='F'&&!item.evidence_ids.length)))fail();
    return {summary:raw.summary,status:raw.status,agent_analysis:raw.summary,chainStudy:raw,missing:raw.evidence_gaps||[],artifacts:[{type:'ChainKeyCompanies',claims:[{text:raw.summary}],missing:raw.evidence_gaps||[]}],risk_findings:[]};
  }
  function mount(host,study,sources={},initial){
    const el=(parent,tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;parent.append(n);return n;};
    const nodes=study.nodes||[],edges=study.relationships||[],lookup=new Map(nodes.map(n=>[n.node_id,n]));
    const root=el(host,'section',null,'chain-study');el(root,'p',study.summary);
    if(!nodes.length){el(root,'small','现有材料不足以确认产业活动节点。');return;}
    const control=el(root,'select');control.setAttribute('aria-label','关系筛选');
    control.add(new Option('全部关系',''));const types={supply:'供应',equipment:'设备',energy:'能源',logistics:'物流',certification:'认证',licensing:'授权',manufacturing:'制造',channel:'渠道',equity:'股权',procurement:'采购',substitution:'替代',recycling:'循环利用',data_feedback:'数据反馈',demand_feedback:'需求反馈'};
    for(const t of new Set(edges.map(e=>e.relation_type)))control.add(new Option(types[t]||t,t));
    const grid=el(root,'div',null,'chain-lanes'),buttons=new Map();
    const target=new Set(study.target_company_position?.node_ids||[]);
    let selected=nodes.find(n=>n.stage===stages[initial])||nodes.find(n=>target.has(n.node_id))||nodes[0];
    stages.forEach((s,i)=>{const col=el(grid,'section');el(col,'h4',labels[i]);for(const n of nodes.filter(x=>x.stage===s)){
      const b=el(col,'button',n.name);b.type='button';b.title=n.description_35_60||n.activity||n.name;b.onclick=()=>{selected=n;draw();};buttons.set(n.node_id,b);
      if(target.has(n.node_id))el(b,'small',' 标的所在环节');
    }});
    const ns='http://www.w3.org/2000/svg',network=document.createElementNS(ns,'svg');network.setAttribute('role','img');network.setAttribute('aria-label','三阶段产业活动及有向关系');network.style.cssText='display:block;width:100%;max-height:310px';const figure=el(root,'div',null,'edge-figure');grid.before(figure);figure.append(network);const tooltip=el(figure,'span',null,'edge-label');tooltip.hidden=true;
    const edgeCaption=el(root,'p','悬停连线可查看关系方向','edge-caption');edgeCaption.setAttribute('aria-live','polite');
    function diagram(related){
      edgeCaption.textContent='悬停连线可查看关系方向';const nodeShapes=new Map();
      network.replaceChildren();tooltip.hidden=true;
      const positions=new Map(),height=62*Math.max(1,...stages.map(s=>nodes.filter(n=>n.stage===s).length))+12;
      network.setAttribute('viewBox','0 0 600 '+height);
      const svg=(tag,attrs,parent=network)=>{const x=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))x.setAttribute(k,v);parent.append(x);return x;};
      const markerId='edge-'+crypto.randomUUID(),marker=svg('marker',{id:markerId,viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:6,markerHeight:6,orient:'auto'},svg('defs',{}));
      svg('path',{d:'M0 0L10 5L0 10Z',fill:'#8eaead'},marker);
      stages.forEach((s,i)=>nodes.filter(n=>n.stage===s).forEach((n,j)=>positions.set(n.node_id,[20+200*i,16+62*j])));
      for(const e of edges.filter(x=>!control.value||x.relation_type===control.value)){
        const a=positions.get(e.source_node_id),b=positions.get(e.target_node_id);if(!a||!b)continue;
        const right=b[0]>=a[0],x=a[0]+(right?148:0),y=b[0]+(right?0:148),gap=right?24:-24;
        const visible=svg('path',{d:'M'+x+' '+(a[1]+16)+' C'+(x+gap)+' '+(a[1]+16)+' '+(y-gap)+' '+(b[1]+16)+' '+y+' '+(b[1]+16),fill:'none',stroke:related.includes(e)?'#73dcc4':'#7c929b','stroke-width':related.includes(e)?2.5:1.4,'stroke-dasharray':e.claim_type==='F'?'none':'5 3','marker-end':'url(#'+markerId+')'});
        const label=lookup.get(e.source_node_id).name+' → '+lookup.get(e.target_node_id).name+' · '+(types[e.relation_type]||e.relation_type)+(e.direction_label?' · '+e.direction_label:'')+' ['+e.claim_type+']';
        const hit=svg('path',{class:'edge-hit',d:visible.getAttribute('d'),stroke:'transparent','stroke-width':16,fill:'none','pointer-events':'stroke',tabindex:0,role:'button','aria-label':label});
        function light(on,event){
          for(const id of [e.source_node_id,e.target_node_id])nodeShapes.get(id)?.classList.toggle('edge-endpoint',on);
          visible.setAttribute('stroke',on?'#ffe0a0':related.includes(e)?'#73dcc4':'#7c929b');
          edgeCaption.textContent=on?label:'悬停连线可查看关系方向';tooltip.hidden=!on;if(on){tooltip.textContent=label;const f=figure.getBoundingClientRect(),b=hit.getBoundingClientRect();const x=(event?.clientX||b.left+b.width/2)-f.left,y=(event?.clientY||b.top+b.height/2)-f.top;tooltip.style.left=Math.max(0,Math.min(f.width-tooltip.offsetWidth,x+8))+'px';tooltip.style.top=Math.max(0,y-tooltip.offsetHeight-7)+'px';}
        }
        hit.onpointerenter=hit.onfocus=hit.onclick=ev=>light(true,ev);hit.onpointermove=ev=>light(true,ev);hit.onpointerleave=hit.onblur=()=>light(false);
      }
      for(const n of nodes){const [x,y]=positions.get(n.node_id),g=svg('g',{role:'button',tabindex:0,'aria-label':n.name});nodeShapes.set(n.node_id,g);g.style.cursor='pointer';g.onclick=()=>{selected=n;draw();};g.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();g.onclick();}};
        svg('rect',{x,y,width:148,height:32,rx:6,fill:selected===n?'#25574c':'#25343a',stroke:target.has(n.node_id)?'#d5af73':'#647e82'},g);
        svg('text',{x:x+74,y:y+21,'text-anchor':'middle','font-size':12,fill:'#f0f4f4'},g).textContent=n.name.length>11?n.name.slice(0,10)+'…':n.name;
        svg('title',{},g).textContent=n.description_35_60||n.name;
      }
    }
    const detail=el(root,'div',null,'chain-info');detail.setAttribute('aria-live','polite');
    function draw(){detail.replaceChildren();const related=edges.filter(e=>(!control.value||e.relation_type===control.value)&&[e.source_node_id,e.target_node_id].includes(selected.node_id));diagram(related);const neighbors=new Set(related.flatMap(e=>[e.source_node_id,e.target_node_id]));
      for(const [id,b] of buttons){b.setAttribute('aria-pressed',String(id===selected.node_id));b.classList.toggle('connected',neighbors.has(id));}
      el(detail,'h4',selected.name);el(detail,'p',selected.description_35_60||selected.activity);for(const [k,title] of [['input_summary','投入'],['output_summary','产出']])if(selected[k])el(detail,'p',title+' · '+selected[k]);
      const cs=(selected.representative_companies||[]).map(c=>typeof c==='string'?c:c.name||c.company_name).filter(Boolean);if(cs.length)el(detail,'p','代表企业 · '+cs.join('、'));if(selected.choke_level&&selected.choke_level!=='none')el(detail,'p','约束程度 · '+({high:'高',medium:'中',low:'低',unknown:'待核实'}[selected.choke_level]||selected.choke_level));
      for(const e of related){const next=e.source_node_id===selected.node_id?e.target_node_id:e.source_node_id;
        const link=el(detail,'button',lookup.get(e.source_node_id).name+' → '+lookup.get(e.target_node_id).name+' · '+(types[e.relation_type]||e.relation_type)+' ['+e.claim_type+']');link.onclick=()=>{selected=lookup.get(next);draw();};}
      if(!related.length)el(detail,'small','当前筛选下无已登记的相邻关系。');
      const refs=new Set([...(selected.evidence_ids||[]),...related.flatMap(e=>e.evidence_ids||[])]);for(const id of refs){const s=sources[id];if(!s)continue;const url=s.url||s.url_or_document;if(/^https?:\/\//i.test(url)){const a=el(detail,'a',s.title||s.publisher||id);a.href=url;a.target='_blank';a.rel='noopener noreferrer';}}
    }control.onchange=draw;draw();
    const focus=study.analysis_mode==='enterprise'?study.target_company_position:study.industry_chain_focus;
    if(focus){const lines=study.analysis_mode==='enterprise'?[['直接敞口',focus.direct_exposure],['间接传导',focus.indirect_exposure],['替代条件',focus.substitution_options]]:[['链条结构',focus.structure_focus],['关键约束',focus.choke_focus],['合作与依赖',focus.cooperation_focus]];
      for(const [title,value] of lines)if(typeof value==='string'&&value.trim()){el(root,'h4',title);el(root,'p',value);}
    }
  }
  return {task,handoff,mount};
})();
