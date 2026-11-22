(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const names = {FIN:'财务计算', BIZ:'产品与商业模式', COMP:'同行竞争分析',
    IND:'行业状况（数据）', CHAIN:'同业企业竞争分析', DEM:'规模客户', RC:'企业风险模式', RI:'行业风险模式',SUPPLY:'产业链分析',RPT:'可视化报告'};
  const teams = {company:['FIN','BIZ','COMP','SUPPLY','RC'], industry:['IND','CHAIN','DEM','SUPPLY','RI']};
  const assignments={SUPPLY:'先建立行业基准链，按企业敞口或行业结构筛选节点，核对有向关系与卡点',FIN:'复算五年指标，核对附注和可比性',BIZ:'拆分产品盈利、客户结构与增长来源',COMP:'比较标的和可比公司的规模、竞争地位及口径',IND:'核定行业统计边界、供需与集中度',CHAIN:'比较行业代表企业、营收分布和集中度变化',DEM:'核验客群分层、渗透率与市场分母',RC:'审查企业敞口、反证和监测指标',RI:'审查行业周期、政策与产业链传导',RPT:'用本轮台账与研究回报生成可视化证据报告'};
  const sessionSwitch=$('.session-switch'),scrim=$('.session-scrim');
  function setSessionDrawer(open){
    $('.app').classList.toggle('sessions-open',open);
    sessionSwitch.setAttribute('aria-expanded',String(open));scrim.hidden=!open;
    if(open)$('#new-chat').focus();
  }
  sessionSwitch.onclick=()=>setSessionDrawer(scrim.hidden);
  $('#new-chat').addEventListener('click',()=>setSessionDrawer(false));
  scrim.onclick=()=>{setSessionDrawer(false);sessionSwitch.focus();};
  window.addEventListener('keydown',event=>{if(event.key==='Escape'&&!scrim.hidden)scrim.click();});
  matchMedia('(max-width: 790px)').addEventListener('change',()=>setSessionDrawer(false));
  const sessions = new WeakMap();
  const workspace = $('.workspace'), input = $('#composer-input');
  const agentView = $('#agent-view'), crumbMenu = $('#crumb-menu');
  let current, viewFrame = 0, agentViewParts = null;
  const tracePane=$('#trace-pane'), traceToggle=$('#trace-toggle');
  const reports=window.researchReport.bind(()=>current);
  const board=window.researchBoard.bind(()=>current);
  // Public report snapshot. Configuration, credentials, drafts and private conversations stay outside it.
  function reportSnapshot(s){
    if(!s?.trace)return null;
    const agentOutput=Object.fromEntries(s.agents.map(({id})=>{const r=s.agentOutput[id]||{};return [id,{report:r.report||null,analysis:r.analysis||'',error:r.error||''}];}));
    return {version:2,events:s.trace.events.slice(),transcript:s.trace.transcript.slice(),model:s.config?.model,snapshot:s.snapshot,asOf:s.asOf,phase:s.phase,plan:s.plan,question:s.research,agents:s.agents.map(({id,name,status})=>({id,name,status})),agentOutput,visuals:s.visuals||{},verifiedLedger:s.verifiedLedger||null,reportEdition:s.reports?.at(-1)?.written||null,finalText:s.finalText||'',entries:[...s.trace.entries]};
  }
  window.researchSnapshot=()=>reportSnapshot(current);
  function newTrace(){return {entries:new Map(),events:[],transcript:[]};}
  function mountTrace(s){
    if(current!==s)return;
    tracePane.hidden=!s.traceOpen;traceToggle.textContent=s.traceOpen?'收起侧栏':'调查导图';
    traceToggle.setAttribute('aria-pressed',String(!!s.traceOpen));traceToggle.disabled=!s.trace;board.mount();
  }
  let sampleOwner=null;
  function leaveSample(){sampleOwner=null;board.leaveSample();}
  traceToggle.onclick=()=>{
    if(!current)return;
    current.demoSequence=(current.demoSequence||0)+1;
    if(sampleOwner===current)leaveSample();
    else current.traceOpen=!current.traceOpen;
    mountTrace(current);
  };
  function traceNode(s,key,role,label,text,kind='step'){
    if(!s.trace)return;
    const entry={role,label,text:String(text||''),kind};
    const previous=s.trace.entries.get(key);
    s.trace.entries.set(key,entry);
    // Record public milestones on arrival. Streaming fragments update the live card only.
    if(!previous||previous.kind!==kind||previous.label!==label){
      const caption=kind==='model'?'正在整理本轮可公开的发现。':entry.text;
      s.trace.events.push({at:Date.now(),key,role,label,kind,text:caption});
    }
    if(current===s)board.schedule();
  }
  document.addEventListener('live-report-request',()=>{if(current?.reports?.length)$('#report-toggle').click();});
  $('#board-example').onclick=async()=>{
    const origin=current;const sequence=origin.demoSequence=(origin.demoSequence||0)+1;
    const btn=$('#board-example');btn.disabled=true;
    try{
      const response=await fetch('/board-example.json');if(!response.ok)throw Error('样例读取失败');
      const d=await response.json();if(current!==origin||sequence!==origin.demoSequence)return;
      const s={sample:true,traceOpen:true,boardMode:'overview',phase:'done',plan:d.plan,agents:d.ids.map(id=>({id})),agentOutput:{},visuals:d.visuals,sampleGraph:d.graph,trace:newTrace()};
      s.trace.entries.set('scope',{label:'研究范围',text:d.plan.scope});
      for(const id of d.ids){const v=s.visuals[id],r=v.highlight;const period=r?.period||r?.year;const summary=r?`${period}${/^\d{4}$/.test(String(period))?' 年':' '}${r.dimension||''}的${r.name}为 ${Number(r.value.toFixed(2)).toLocaleString('zh-CN')} ${r.unit}。`:(v.missing[0]||'暂无足够的已核验指标。');s.trace.entries.set(id,{label:'已核验台账',text:summary});}
      sampleOwner=origin;tracePane.hidden=false;traceToggle.disabled=false;traceToggle.setAttribute('aria-pressed','true');traceToggle.textContent='返回对话';board.showSample(s);
    } catch(e){bubble(origin,'样例提示',e.message,'error');}finally{btn.disabled=false;}
  };
  function humanFailure(error){
    if(/timeout|timed out|超时/i.test(error))return '等待研究结果超时，本次未取得结论。';
    if(/格式|JSON|完整|必需字段/.test(error))return '这份回报未能核验，本次没有可交付的结论。';
    return '本次未取得有效回报。可在对应角色的对话中查看原因。';
  }
  function showPanel(s){
    $('#agent-empty').textContent=({planning:'天枢正在识别标的并组建团队',clarify:'等待补充研究标的',failed:'组队未完成，请查看运行提示'})[s.phase]||'暂无活跃';
    window.renderAgentPanel(s.agents);
  }
  function leadPlaceholder(s){return s.history.length?'继续向天枢追问或补充内容':'描述你想分析的公司或行业';}
  function select(item) {
    setSessionDrawer(false);
    if(current){current.draft=input.value;current.view=null;current.feed.remove();}
    if(!sessions.has(item)){
      const feed=document.createElement('div');
      feed.className='conversation';
      sessions.set(item,{item,feed,draft:'',history:[],agents:[],messages:[],agentOutput:{},direct:{},view:null,queue:Promise.resolve(),phase:'idle'});
    }
    leaveSample();current=sessions.get(item);window.modelMeter.select(current);
    mountTrace(current);
    current.view=null;
    input.placeholder=leadPlaceholder(current);
    workspace.append(current.feed);
    input.value=current.draft;
    hideAgentView();
    current.feed.hidden=!current.feed.childElementCount;
    $('#workspace-title').hidden=!current.feed.hidden || item.dataset.fresh!=='1';
    renderLeadTitle(current);
    window.setActiveAgentRole(null);
    closeMenu();
    showPanel(current);reports.sync();
    workspace.scrollTop=workspace.scrollHeight;
  }
  window.addEventListener('session-selected',e=>select(e.detail));
  select($('.chat-item.active'));

  // 顶栏标题：主会话显示会话名，代理视图显示「会话名 / 代理名 ⌄」
  function renderLeadTitle(s){
    const title=$('#topbar-title');
    title.classList.remove('is-agent');
    title.textContent=s.item.dataset.name;
  }
  function chevronIcon(){
    const ns='http://www.w3.org/2000/svg';
    const svg=document.createElementNS(ns,'svg'),use=document.createElementNS(ns,'use');
    svg.setAttribute('class','ic');svg.setAttribute('aria-hidden','true');use.setAttribute('href','#i-chevron');
    svg.append(use);return svg;
  }
  function renderAgentTitle(s,role){
    const title=$('#topbar-title');
    title.textContent='';title.classList.add('is-agent');
    const sessionButton=document.createElement('button');
    sessionButton.type='button';sessionButton.className='crumb-session';sessionButton.textContent=s.item.dataset.name;
    sessionButton.title='返回主会话';sessionButton.onclick=()=>leaveAgentView(s);
    const sep=document.createElement('span');
    sep.className='crumb-sep';sep.textContent='/';sep.setAttribute('aria-hidden','true');
    const agentEl=document.createElement('span');
    agentEl.className='crumb-agent';agentEl.textContent=names[role]||role;
    const caret=document.createElement('button');
    caret.type='button';caret.className='crumb-caret';caret.title='切换视图';caret.setAttribute('aria-label','切换视图');
    caret.setAttribute('aria-haspopup','menu');caret.setAttribute('aria-expanded','false');caret.setAttribute('aria-controls','crumb-menu');
    caret.append(chevronIcon());caret.onclick=toggleMenu;
    title.append(sessionButton,sep,agentEl,caret);
  }
  function menuItems(s){
    crumbMenu.textContent='';
    function add(label,role){
      const item=document.createElement('button');
      item.type='button';item.className='crumb-menu-item';item.textContent=label;
      item.setAttribute('role','menuitem');
      if(role===s.view){item.classList.add('current');item.setAttribute('aria-current','true');}
      item.onclick=()=>{closeMenu();if(role)openAgent(s,role);else leaveAgentView(s);};
      crumbMenu.append(item);
    }
    add('主会话',null);
    for(const agent of s.agents)add(agent.name,agent.id);
  }
  function placeMenu(){
    const caret=document.querySelector('.crumb-caret');
    if(!caret)return;
    const bounds=crumbMenu.getBoundingClientRect(),rect=caret.getBoundingClientRect();
    const margin=8,gap=6,width=document.documentElement.clientWidth,height=document.documentElement.clientHeight;
    let left=rect.left,top=rect.bottom+gap;
    if(left+bounds.width>width-margin)left=width-margin-bounds.width;
    if(top+bounds.height>height-margin)top=rect.top-gap-bounds.height;
    crumbMenu.style.left=Math.max(margin,left)+'px';
    crumbMenu.style.top=Math.max(margin,top)+'px';
  }
  function openMenu(){
    if(!current?.view)return;
    menuItems(current);
    crumbMenu.classList.add('open');crumbMenu.setAttribute('aria-hidden','false');
    const caret=document.querySelector('.crumb-caret');
    if(caret)caret.setAttribute('aria-expanded','true');
    placeMenu();
  }
  function closeMenu(){
    if(!crumbMenu.classList.contains('open'))return;
    crumbMenu.classList.remove('open');crumbMenu.setAttribute('aria-hidden','true');
    const caret=document.querySelector('.crumb-caret');
    if(caret)caret.setAttribute('aria-expanded','false');
  }
  function toggleMenu(){
    if(crumbMenu.classList.contains('open'))closeMenu();else openMenu();
  }
  document.addEventListener('click',e=>{
    if(!crumbMenu.classList.contains('open'))return;
    if(e.target.closest?.('#crumb-menu, .crumb-caret'))return;
    closeMenu();
  });
  document.addEventListener('keydown',e=>{
    if(e.key!=='Escape'||!crumbMenu.classList.contains('open'))return;
    e.stopPropagation();closeMenu();
  },true);

  // 每个角色的输出缓冲：摘要、进度、状态、错误与最终回报
  function agentOutput(s,role){
    if(!s.agentOutput[role])s.agentOutput[role]={summary:'',summaryDone:false,brief:'',progress:[],status:'等待中',task:'',error:'',result:'',report:null,done:false};
    return s.agentOutput[role];
  }
  function agentError(s,role){
    const out=s.agentOutput[role];
    if(out?.error)return out.error;
    return s.messages.find(m=>m.from===role&&m.error)?.error||'';
  }
  function recordProgress(s,role,author,text){
    const out=s.agentOutput?.[role];
    if(!out)return;
    out.progress.push({author,text});
    scheduleView(s);
  }
  // 代理视图：容器只负责裁剪与滚动，内容直接复用主会话的工作记录、摘要与回报组件
  function buildAgentView(){
    agentView.textContent='';
    const inner=document.createElement('div');inner.className='conversation';
    const error=document.createElement('article'),errorLabel=document.createElement('strong'),errorBody=document.createElement('p');
    error.className='error';errorLabel.textContent='运行提示';error.append(errorLabel,errorBody);
    agentView.append(inner);
    agentViewParts={inner,error,errorBody,progressCount:0,summary:null,note:null,answer:'',report:null,errorShown:false};
  }
  function paintAgentView(s){
    if(!s.view)return;
    if(!agentViewParts)buildAgentView();
    const parts=agentViewParts,role=s.view,out=s.agentOutput?.[role];
    const follow=workspace.scrollHeight-workspace.scrollTop-workspace.clientHeight<80;
    const rows=out?.progress||[];
    for(let i=parts.progressCount;i<rows.length;i++)workLog(parts.inner).append(progressRow(rows[i].author,rows[i].text));
    parts.progressCount=rows.length;
    if(out?.summary){
      if(!parts.summary){parts.summary=summaryControl(role);parts.inner.append(parts.summary.button);}
      parts.summary.set(out.summary,!!(out.summaryDone||out.done||out.error));
    }
    const answer=out?.result?names[role]+'：'+out.result:out?.brief?names[role]+'：'+out.brief:'';
    if(out?.analysis&&parts.analysisText!==out.analysis){
      if(!parts.analysis){parts.analysis=document.createElement('div');parts.analysis.className='answer-text';parts.inner.append(parts.analysis);}
      parts.analysis.innerHTML=displayMarkdown(out.analysis);parts.analysisText=out.analysis;
    }
    if(answer&&answer!==parts.answer){
      if(!parts.note){
        parts.note=bubble(s,'天枢 · 团队回报','','progress',parts.inner);
        parts.note.className='answer-text';
      }
      parts.note.innerHTML=displayMarkdown(answer);
      parts.answer=answer;
    }
    if(out?.report&&parts.report!==out.report&&parts.note){
      showTeamReport(parts.note,out.report);parts.report=out.report;
    }
    const error=agentError(s,role);
    if(error){
      if(!parts.errorShown){parts.inner.append(parts.error);parts.errorShown=true;}
      parts.errorBody.textContent=names[role]+'任务失败：'+error;
    }
    if(follow)workspace.scrollTop=workspace.scrollHeight;
    if(s.direct[role])parts.inner.append(s.direct[role].thread);
  }
  function scheduleView(s){
    if(!s.view||current!==s||viewFrame)return;
    viewFrame=requestAnimationFrame(()=>{
      viewFrame=0;
      if(current===s)paintAgentView(s);
    });
  }
  function hideAgentView(){
    agentView.hidden=true;agentView.textContent='';agentViewParts=null;
  }
  function openAgent(s,role){
    if(current!==s||!s.agents.some(a=>a.id===role))return;
    closeMenu();
    if(s.view===role)return;
    s.view=role;
    s.traceOpen=false;mountTrace(s);
    input.placeholder='发给'+names[role]+'…';
    s.feed.hidden=true;
    $('#workspace-title').hidden=true;
    agentView.hidden=false;
    buildAgentView();
    paintAgentView(s);
    workspace.scrollTop=0;
    renderAgentTitle(s,role);
    window.setActiveAgentRole(role);
  }
  function leaveAgentView(s){
    closeMenu();
    s.view=null;
    input.placeholder=leadPlaceholder(current);
    hideAgentView();
    window.setActiveAgentRole(null);
    if(current!==s)return;
    s.feed.hidden=!s.feed.childElementCount;
    $('#workspace-title').hidden=!s.feed.hidden||s.item.dataset.fresh!=='1';
    renderLeadTitle(s);
    workspace.scrollTop=workspace.scrollHeight;
  }
  function ensureViewRole(s){
    if(!s.view)return;
    if(s.agents.some(a=>a.id===s.view))return;
    if(current===s)leaveAgentView(s);else s.view=null;
  }
  document.addEventListener('agent-selected',e=>{
    if(current)openAgent(current,e.detail?.role);
  });

  // 工作记录 details：主会话与代理视图共用同一结构与类名
  function workLog(host){
    let log=host.lastElementChild;
    if(!log?.classList.contains('work-log')){
      log=document.createElement('section');log.className='work-log';host.append(log);
    }
    return log;
  }
  function progressRow(author,text){
    const row=document.createElement('article'),label=document.createElement('strong'),body=document.createElement('p');
    row.className='progress';label.textContent=author;body.textContent=text;
    row.append(label,body);return row;
  }
  function bubble(s,author,text,kind='',host=s.feed){
    const row=document.createElement('article'), label=document.createElement('strong'), body=document.createElement('p');
    row.className=kind;label.textContent=author;body.textContent=text;
    row.append(label,body);
    if(kind==='progress'){
      workLog(host).append(row);
    }else{
      host.append(row);
      if(kind==='user'){
        const meta=document.createElement('div'),copy=document.createElement('button');
        meta.className='message-meta';
        meta.append(new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}));
        copy.type='button';copy.textContent='⧉';copy.title='复制消息';copy.setAttribute('aria-label','复制消息');
        copy.onclick=async()=>{try{await navigator.clipboard.writeText(text);copy.textContent='✓';}catch{copy.title='未取得剪贴板权限';}};
        meta.append(copy);row.append(meta);
      }
    }
    if(host===s.feed){
      if(current===s&&s.view){
        // 代理视图显示期间对话区保持隐藏
      }else{
        s.feed.hidden=false;
      }
      if(current===s&&!s.view){$('#workspace-title').hidden=true;workspace.scrollTop=workspace.scrollHeight;}
    }
    return body;
  }
  function progress(s,text,role){
    if(role&&role!=='TS'){recordProgress(s,role,names[role],text);return;}
    bubble(s,'天枢 · 工作进度',text,'progress');
  }
  function state(s,role,status,task){
    Object.assign(s.agents.find(a=>a.id===role),{status,task});
    const out=s.agentOutput?.[role];
    if(out){
      if(status==='运行中'&&task!==out.task&&!task.startsWith('正在接收模型回报'))recordProgress(s,role,names[role],task);
      out.status=status;out.task=task||'';
    }
    if(current===s){showPanel(s);scheduleView(s);}
  }
  class HandoffError extends Error {}
  function parseJSON(text){
    const payload=text.trim().replace(/^【摘要】[^]*?【数据】\s*|^【数据】\s*/, '');
    if(!payload)throw new HandoffError('模型返回空的结构化回报');
    // Accept a single complete object inside explanatory text or a Markdown fence.
    // Scan only top-level objects. An unfinished outer object must never yield a nested one.
    let start=-1,depth=0,quoted=false,escaped=false,value,found=false;
    for(let i=0;i<payload.length;i++){
      const ch=payload[i];
      if(depth===0){
        if(ch!=='{')continue;
        if(found)throw new HandoffError('模型返回了多个 JSON 对象，无法确定唯一交卷');
        start=i;depth=1;continue;
      }
      if(quoted){
        if(escaped)escaped=false;
        else if(ch==='\\')escaped=true;
        else if(ch==='"')quoted=false;
        continue;
      }
      if(ch==='"')quoted=true;
      else if(ch==='{')depth++;
      else if(ch==='}'&&--depth===0){
        try{value=JSON.parse(payload.slice(start,i+1));found=true;}
        catch(error){
          const position=error.message.match(/position (\d+)/i)?.[1];
          throw new HandoffError('JSON 语法错误'+(position?'（字符位置 '+position+'）':'')+'，请检查引号、逗号和换行转义');
        }
      }
    }
    if(depth)throw new HandoffError('回报的 JSON 对象未闭合，已收到 '+payload.length+' 个字符');
    if(!found)throw new HandoffError('已收到 '+payload.length+' 个字符，未找到 JSON 回报对象');
    if(payload.startsWith('['))throw new HandoffError('回报根节点应为对象，收到数组');
    return value;
  }
  // For explicitly single-finding assignments, keep the full ledger in the workspace and
  // send the model a numbered evidence table. Resolve citations against actual rows on return.
  function singleFinding(s,id,data){
    const ledger=s.verifiedLedger||{}, view=s.visuals[id]||{}, roleRows=view.rows||[];
    const upstream=s.messages.filter(m=>m.result).map(m=>({role:m.from,summary:m.result.summary}));
    const records=[...roleRows];
    if(id==='RI'||id==='RC')records.push(...(ledger.metrics||[]).filter(r=>s.research.includes(r.name)));
    const obs=new Map([...(ledger.observations||[]),...(ledger.interim||[])].map(o=>[o.id,o]));
    const table=records.map((r,i)=>({n:i+1,year:r.year||r.period,metric:r.name,scope:r.dimension||r.relation,value:r.value??[r.from,r.to].filter(Boolean).join(' → '),unit:r.unit,formula:r.formula}));
    const input={format:'single-finding',role:names[id],question:s.research,assignment:assignments[id],target:s.plan.target,table,upstream,known_gaps:[...new Set((view.missing||[]).map(m=>typeof m==='string'?m:m.name))]};
    function expand(raw){
      if(!raw||typeof raw.summary!=='string'||!raw.summary.trim()||typeof raw.agent_analysis!=='string'||!Array.isArray(raw.refs)||!Array.isArray(raw.missing)||!['complete','partial','blocked'].includes(raw.status))throw Error('回报必需字段缺失或类型不正确');
      const chosen=[...new Set(raw.refs.map(Number))];if(chosen.some(n=>!Number.isInteger(n)||n<1||n>records.length))throw Error('回报必需字段引用不正确');
      const ev=new Map(),calc=[];for(const n of chosen){const row=records[n-1];for(const ref of row.inputs||[]){const o=obs.get(ref);if(!o)continue;const src=ledger.sources?.[o.source]||view.sources?.[ref]||{};ev.set(ref,{evidence_id:ref,...src,field:o.field,value:o.value,unit:o.unit,scope:o.dimension,period_or_date:o.year||o.period});}
        if(row.formula)calc.push({calc_id:id+'-C'+n,metric:row.name,period:row.year||row.period,unit:row.unit,formula:row.formula,result:row.value,evidence_ids:row.inputs});}
      const finding={id:id+'-A1',claims:[{text:raw.summary,evidence_ids:[...ev.keys()],calc_ids:calc.map(c=>c.calc_id)}]};const risk=['RC','RI'].includes(id);
      return {summary:raw.summary,overview_card:raw.overview_card,agent_analysis:raw.agent_analysis,status:raw.status,evidence:[...ev.values()],calculations:calc,artifacts:risk?[]:[finding],risk_findings:risk?[finding]:[],missing:raw.missing};
    }
    return {input,expand};
  }
  // Resolve short model citations to the exact dated observations retained by this run.
  function indexedFindings(s,role,data){
    const ledger=s.verifiedLedger||{},view=s.visuals[role]||{};
    const records=[...(view.rows||[])];
    if(['FIN','IND'].includes(role))for(const o of ledger.interim||[]){
      records.push({name:o.field,value:o.value,period:o.period,unit:o.unit,dimension:o.dimension,inputs:[o.id]});
    }
    const observations=new Map([...(ledger.observations||[]),...(ledger.interim||[])].map(o=>[o.id,o]));
    for(const year of ledger.years||[]){
      const days=(Date.UTC(year+1,0,1)-Date.UTC(year,0,1))/86400000;
      observations.set('calendar-'+year,{field:'年度天数',year,value:days,unit:'天',formula:'下一年元旦与本年元旦的日历差'});
    }
    const table=records.map((r,i)=>({n:i+1,name:r.name,period:r.period||r.year,scope:r.dimension||r.relation,value:r.value??[r.from,r.to].filter(Boolean).join(' → '),unit:r.unit,formula:r.formula}));
    const input={format:'indexed-findings',question:s.research,target:s.plan.target,scope:s.plan.scope,assignment:data.assignment,
      table,upstream:s.messages.map(m=>({role:m.from,summary:m.result?.summary,error:m.error})),materials:data.materials,
      missing:[...new Set((view.missing||[]).map(x=>typeof x==='string'?x:x.name||x.field).filter(Boolean))],issues:ledger.issues,conflicts:ledger.conflicts};
    function expand(raw){
      if(!raw||!Array.isArray(raw.findings)||typeof raw.agent_analysis!=='string'||!Array.isArray(raw.missing))throw new HandoffError('回报缺少 findings、agent_analysis 或 missing');
      if(raw.status==='complete'&&!raw.findings.length)throw new HandoffError('完整交卷至少需要一条带证据的发现');
      const evidence=new Map(),calculations=new Map();
      function collect(id,visited){
        if(visited.has(id))return;
        visited.add(id);const o=observations.get(id);if(!o)return;
        evidence.set(id,{...(ledger.sources?.[o.source]||{}),evidence_id:id,field:o.field,value:o.value,unit:o.unit,period_or_date:o.period||o.year});
        for(const ref of o.inputs||[])collect(ref,visited);
      }
      const claims=raw.findings.map(f=>{
        if(typeof f?.text!=='string'||!f.text.trim()||!Array.isArray(f.refs)||!f.refs.length)throw new HandoffError('每条发现必须含 text 和台账行号 refs；无证据的事项请写入 missing');
        const ids=new Set(),calcIds=[];
        for(const ref of new Set(f.refs)){
          const n=typeof ref==='string'&&/^\d+$/.test(ref)?Number(ref):ref;
          const row=records[n-1];
          if(!Number.isInteger(n)||n<1||!row)throw new HandoffError('发现引用超出台账行号范围 1–'+records.length+'，只可使用 table[].n');
          if(!row.inputs?.length||!row.inputs.every(id=>observations.has(id)))throw new HandoffError('第 '+n+' 行的底层来源无法核验，请另选有来源的原始行或列为缺口');
          for(const ref of row.inputs)collect(ref,ids);
          if(row.formula){const id=role+'-C'+n;calculations.set(id,{calc_id:id,metric:row.name,formula:row.formula,period:row.period||row.year,result:row.value,unit:row.unit,evidence_ids:row.inputs});calcIds.push(id);}
        }
        return {text:f.text,evidence_ids:[...ids],calc_ids:calcIds};
      });
      const risk=role==='RC'||role==='RI',items=claims.length?[{id:role+'-A1',claims}]:[];
      return {summary:raw.summary,status:raw.status,agent_analysis:raw.agent_analysis,overview_card:raw.overview_card,missing:raw.missing,
        evidence:[...evidence.values()],calculations:[...calculations.values()],artifacts:risk?[]:items,risk_findings:risk?items:[]};
    }
    return {input,expand};
  }
  async function structured(s,role,action,data,signal,onText,reset){
    const focus=role==='SUPPLY'||action!=='work'?null:
      /一项(?:可验证的)?(?:核心)?发现/.test(s.research||'')?singleFinding(s,role,data):indexedFindings(s,role,data);
    if(focus)data=focus.input;
    const checks={
      report:r=>window.researchReport.valid(r,data.catalogue),
      work:r=>['complete','partial','blocked'].includes(r.status)&&Array.isArray(r.artifacts)&&Array.isArray(r.risk_findings)&&typeof r.summary==='string'&&r.summary.trim(),
      plan:r=>r.type==='clarify'||(Object.hasOwn(teams,r.type)&&typeof r.target==='string'&&r.target.trim()&&typeof r.scope==='string'&&r.scope.trim()),
      steer:r=>['answer','revise'].includes(r.action),extract:r=>Array.isArray(r.rows)
    };
    let reason='';
    for(let attempt=1;attempt<=3;attempt++){
      signal?.throwIfAborted();
      try{
        const raw=parseJSON(await call(s,role,action,attempt===1?data:{...data,retry_instruction:'根据 previous_error 纠正上一轮交卷。输出一个完整 JSON 对象，保留必需字段，精简证据与计算到支持主要结论的必要条目，避免逐行重抄台账。',previous_error:reason},signal,onText));
        const value=role==='SUPPLY'&&action==='work'?window.supplyNetwork.handoff(raw,data):focus?focus.expand(raw):raw;
        if(action==='work'&&value){
          const problems=[];
          if(typeof value.summary!=='string'||!value.summary.trim())problems.push('summary');
          if(!['complete','partial','blocked'].includes(value.status))problems.push('status');
          for(const key of ['artifacts','risk_findings'])if(!Array.isArray(value[key]))problems.push(key);
          if(problems.length)throw new HandoffError('回报字段缺失或类型有误：'+problems.join('、'));
        }
        if(!value||!checks[action](value))throw new HandoffError('回报未通过'+({report:'报告章节或证据引用',plan:'研究标的与范围',steer:'追问类型',extract:'提取记录'}[action]||'字段')+'校验');
        return value;
      }catch(e){
        signal?.throwIfAborted();
        if(!/格式不完整|必需字段|模型未返回完整|长度限制|模型流中断/.test(e.message)&&!(e instanceof SyntaxError)&&!(e instanceof HandoffError))throw e;
        reason=e instanceof SyntaxError?'流数据解析异常':e.message;
        if(attempt===3)throw Error('连续三次未取得有效回报：'+reason);
        reset?.();
        progress(s,(names[role]||'天枢')+'正在重试（第 '+(attempt+1)+'/3 次）：'+reason.replace(/，请重试$/,''),role);
        await new Promise(resolve=>setTimeout(resolve,250*attempt));
      }
    }
  }
  // 公开工作摘要按钮：思考 · 前缀、流式中显示最后一行、结束后显示第一行、点击展开全文
  function summaryControl(role){
    const button=document.createElement('button');
    button.type='button';button.className='thought-summary';
    button.setAttribute('aria-expanded','false');
    button.title=(names[role]||'天枢')+' · 公开工作摘要';
    const label=document.createElement('span');label.textContent='工作摘要 · ';
    const caption=document.createElement('span');
    button.append(label,caption);
    let full='',done=false;
    function paint(){
      const lines=full.trim().split(/\r?\n/).filter(l=>l.trim());
      const open=button.getAttribute('aria-expanded')==='true';
      caption.textContent=(open?full.trim():(done?lines[0]:lines.at(-1)))||'';
    }
    button.onclick=()=>{button.setAttribute('aria-expanded',String(button.getAttribute('aria-expanded')!=='true'));paint();};
    return {
      button,
      set(text,isDone){full=text;done=isDone;paint();},
      add(delta){full+=delta;paint();},
      finish(){done=true;paint();}
    };
  }
  function recordText(s,key,who,delta){
    if(!s.trace||!delta)return;const time=Date.now(),rows=s.trace.transcript;
    let last=rows.at(-1);
    if(last?.key===key&&time-last.at<220){last.text+=delta;last.at=time;}
    else rows.push({at:time,key,who,text:delta});
  }
  function publicSummary(s,role,anchor){
    if(role!=='TS'){
      const out=agentOutput(s,role);
      let row,body;
      return {add(delta){
        if(!row){row=progressRow(names[role],'');row.className='stream-line';out.feedRow=row;s.feed.append(row);body=row.querySelector('p');}
        const follow=current===s&&!s.view&&workspace.scrollHeight-workspace.clientHeight-workspace.scrollTop<95;
        out.summary+=delta;body.textContent=out.summary;recordText(s,role+'-brief',names[role],delta);scheduleView(s);if(follow)workspace.scrollTop=workspace.scrollHeight;
      },finish(){out.summaryDone=true;scheduleView(s);}};
    }
    const control=summaryControl(role);
    let attached=false;
    function attach(){
      if(attached)return;
      attached=true;
      if(anchor)anchor.before(control.button);else s.feed.append(control.button);
    }
    return {
      add(delta){
        attach();
        const follow=current===s&&!s.view&&workspace.scrollHeight-workspace.clientHeight-workspace.scrollTop<90;
        control.add(delta);recordText(s,'TS-brief-'+(s.phase||''),'天枢',delta);
        const out=s.agentOutput?.[role];
        if(out){out.summary+=delta;scheduleView(s);}
        if(follow)workspace.scrollTop=workspace.scrollHeight;
      },
      finish(){
        control.finish();
        const out=s.agentOutput?.[role];
        if(out){out.summaryDone=true;scheduleView(s);}
      }
    };
  }
  // Keep incomplete protocol markers between SSE events. JSON is consumed by agents only.
  function publicStream(summary,structured,onText){
    const start='【摘要】',end=structured?'【数据】':'【正文】';
    let stage='start',pending='',body='';
    const emit=t=>{if(t){body+=t;onText?.(t);}};
    return {
      push(chunk){
        pending+=chunk;
        if(stage==='start'){
          pending=pending.trimStart();
          if(!pending||start.startsWith(pending)&&pending.length<start.length)return;
          if(pending.startsWith(start)){stage='summary';pending=pending.slice(start.length);}
          else stage='body'; // Providers may return a plain answer or bare JSON.
        }
        if(stage==='summary'){
          const pos=pending.indexOf(end);
          if(pos<0){
            let keep=0;
            for(let n=1;n<end.length;n++)if(pending.endsWith(end.slice(0,n)))keep=n;
            const chunk=pending.slice(0,pending.length-keep);
            if(chunk)summary.add(chunk);
            pending=pending.slice(pending.length-keep);return;
          }
          if(pos)summary.add(pending.slice(0,pos));
          summary.finish();pending=pending.slice(pos+end.length);stage='body';
        }
        emit(pending);pending='';
      },
      finish(){summary.finish();if(stage==='summary')throw Error('模型未返回完整答复，请重试');return body;},
      close(){summary.finish();}
    };
  }
  async function call(s,role,action,context,signal,onText,anchor){
    const run=s.trace;
    const key=action==='plan'?'scope':action==='work'?role:action==='final'?'final':crypto.randomUUID();
    const title={plan:'确定研究范围',work:'正在研究',answer:'回答追问',direct:'回答追问',final:'汇总研究结论'}[action];
    function show(label,text,tone){if(title && s.trace===run&&!signal?.aborted)traceNode(s,key,role,label,text,tone);}
    let summaryText='',plain='';
    try {
    const meter=window.modelMeter.start(s,s.config.model);try{
    const response=await fetch('/api/stream',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({config:s.config,role,action,context,liveTrace:true}),signal});
    meter.headers(response);
    if(!response.ok)throw Error((await response.text()).slice(0,250));
    const reader=response.body.pipeThrough(new TextDecoderStream()).getReader();
    let pending='',content='',finished=false;
    const structuredAction=['work','plan','report','extract','steer'].includes(action);
    const withSummary=['answer','final'].includes(action);
    const summary=withSummary?publicSummary(s,role,anchor):null;
    function answerChunk(token){
      if(['direct','final','answer'].includes(action)){
        plain+=token;
        if(!summaryText)show(title,plain,'model');
      }
      onText?.(token);
    }
    const split=summary?publicStream({
      add(delta){summary.add(delta);summaryText+=delta;show(title,summaryText,'model');},
      finish(){summary.finish();}
    },['plan','work'].includes(action),answerChunk):null;
    const parts=new Map(),indices=new Map();
    let authoritative='',refused=false,eventName='',dataLines=[];
    function partKey(event){
      if(event.item_id&&event.output_index!=null)indices.set(event.item_id,event.output_index);
      const item=event.output_index??indices.get(event.item_id)??event.item_id??0;
      return JSON.stringify([item,event.content_index??0]);
    }
    function accept(key,text,whole=false){
      if(typeof text!=='string'||!text)return;
      const previous=parts.get(key)||'';
      const token=whole?(text.startsWith(previous)?text.slice(previous.length):''):text;
      parts.set(key,whole?text:previous+token);
      if(!token)return;
      if(split)split.push(token);else{content+=token;answerChunk(token);}
    }
    function dispatch(){
      const data=dataLines.join('\n').trim(), name=eventName;
      dataLines=[];eventName='';
      if(!data)return;
      if(data==='[DONE]'){finished=true;return;}
      const event=JSON.parse(data), type=event.type||name;meter.event(event);
      if(event.tianshu){
        if(event.tianshu.stage==='loaded' && action==='work')show('研究指引已就绪',assignments[role],'skill');
        return;
      }
      if(type==='error'||type==='response.failed'||event.error)throw Error(event.response?.error?.message||event.error?.message||event.message||'Responses 请求失败');
      if(type==='response.incomplete')throw Error(event.response?.incomplete_details?.reason==='max_output_tokens'?'输出达到模型长度限制，请缩小范围':'模型未返回完整答复：'+(event.response?.incomplete_details?.reason||'incomplete'));
      const key=partKey(event);
      if(type==='response.output_text.delta')accept(key,event.delta);
      else if(type==='response.output_text.done')accept(key,event.text,true);
      else if(type==='response.content_part.done'&&event.part?.type==='output_text')accept(key,event.part.text,true);
      else if(type==='response.output_item.done'&&event.item?.type==='message'){
        for(const [index,part] of (event.item.content||[]).entries()){
          if(part.type==='refusal')refused=true;
          if(part.type==='output_text')accept(partKey({...event,item_id:event.item.id,content_index:index}),part.text,true);
        }
      }
      else if(type==='response.refusal.delta'||type==='response.refusal.done')refused=true;
      else if(type==='response.completed'){
        // Some proxies renumber message items in the final snapshot (reasoning may appear first).
        const finalParts=(event.response?.output||[]).filter(i=>i.type==='message').flatMap(i=>i.content||[]);
        if(finalParts.some(p=>p.type==='refusal'))refused=true;
        const finalText=finalParts.filter(p=>p.type==='output_text').map(p=>p.text||'').join('');
        const streamed=[...parts.values()].join('');
        authoritative=finalText;
        if(finalText.startsWith(streamed))accept('final-tail',finalText.slice(streamed.length));
        if(refused)throw Error('模型拒绝了本次请求');
        finished=true;
      }
    }
    function line(raw){
      const value=raw.replace(/\r$/,'');
      if(value===''){dispatch();return;}
      if(value.startsWith('event:'))eventName=value.slice(6).trim();
      if(value.startsWith('data:'))dataLines.push(value.slice(5).replace(/^ /,''));
    }
    try{
      while(!finished){
        const {done,value}=await reader.read();if(done)break;
        pending+=value;
        const lines=pending.split('\n');pending=lines.pop();lines.forEach(line);
      }
      if(!finished){if(pending)line(pending);dispatch();}
      if(split)content=split.finish();
      if(structuredAction)content=authoritative||[...parts.values()].join('');
      if(refused)throw Error('模型拒绝了本次请求');
    }finally{split?.close();await reader.cancel().catch(()=>{});}
    if(!finished||!content.trim())throw Error('模型流中断或返回空内容');
    if(['direct','answer','final'].includes(action))show(action==='final'?'研究汇总':'追问已答复',summaryText||content,'result');
    return content;
    }finally{meter.end();}
    } catch(e) {if(!signal?.aborted && ['direct','answer'].includes(action))show('答复未完成',humanFailure(e.message),'error');throw e;}
  }
  function context(s,history=s.history){
    return {conversation:history.slice(),scope:s.plan,team_messages:s.messages.slice(),agents:s.agents.map(({id,name,status})=>({id,name,status})),phase:s.phase};
  }
  const markdown=window.markdownit({html:false,breaks:true,linkify:false}).disable('image');
  function displayMarkdown(text){
    const wrapped=text.match(/^\s*`{3}(?:markdown|md)[ \t]*\r?\n([\s\S]*)$/i);
    const source=wrapped?wrapped[1].replace(/\n`{3}\s*$/,''):text;
    if(!source.includes('\t'))return markdown.render(source);
    // Some providers emit TSV for tables. Preserve indentation and fenced code.
    const lines=source.split('\n'),output=[];
    let fence=null;
    for(let i=0;i<lines.length;i++){
      const line=lines[i],marker=line.match(/^ {0,3}(`{3,}|~{3,})/);
      if(marker){
        if(!fence)fence=marker[1];
        else if(marker[1][0]===fence[0]&&marker[1].length>=fence.length)fence=null;
        output.push(line);continue;
      }
      if(fence||/^\s/.test(line)||!line.includes('\t')){output.push(line);continue;}
      const rows=[line.split(/\t+/)];
      while(i+1<lines.length&&!/^\s/.test(lines[i+1])&&lines[i+1].split(/\t+/).length===rows[0].length)rows.push(lines[++i].split(/\t+/));
      if(rows.length===1){output.push(line);continue;}
      const tableRow=cells=>'| '+cells.map(c=>c.trim().replace(/\|/g,'\\|')).join(' | ')+' |';
      output.push('',tableRow(rows[0]),tableRow(rows[0].map(()=>'---')),...rows.slice(1).map(tableRow),'');
    }
    return markdown.render(output.join('\n'));
  }
  async function reply(s,action,data,signal,reportTurn){
    const placeholder=bubble(s,'天枢','');
    const body=document.createElement('div');
    body.className='answer-text';placeholder.replaceWith(body);
    let buffer='',timer;
    function render(){
      if(timer)cancelAnimationFrame(timer);timer=null;
      const follow=current===s && !s.view && workspace.scrollHeight-workspace.scrollTop-workspace.clientHeight<80;
      body.innerHTML=displayMarkdown(buffer);reportTurn?.paint(body.innerHTML);
      if(follow)workspace.scrollTop=workspace.scrollHeight;
    }
    try{
      const text=await call(s,'TS',action,data,signal,token=>{
        buffer+=token;recordText(s,action+'-body','天枢',token);
        if(!timer)timer=requestAnimationFrame(render);
      },body.parentElement);
      render();s.history.push({role:'assistant',content:text});
    }catch(e){
      render();body.append(document.createTextNode(signal?.aborted?'（本轮已由新要求替代）':'（回答未完成）'));reportTurn?.paint(body.innerHTML);throw e;
    }
  }
  async function fetchLedger(s,id,signal){
    const records=[...(s.records||[])];
    const report=s.report;
    if(report&&report.role===id&&report.target===s.plan.target&&report.published<=s.asOf.slice(0,10)){
      state(s,id,'运行中','提取研报原文并核对数字定位');
      try{
        const extracted=await structured(s,id,'extract',{report},signal);
        if(!Array.isArray(extracted.rows))throw Error('未返回候选记录数组');
        const accepted=extracted.rows.filter(r=>r?.kind==='历史实绩'&&r.own_data===true&&r.period_kind==='全年'&&typeof r.excerpt==='string'&&report.text.includes(r.excerpt)&&
          typeof r.locator==='string'&&r.locator.length>0&&report.text.includes(r.locator)&&Number.isFinite(r.value)&&Number.isInteger(r.year)&&
          typeof r.field==='string'&&r.field.trim()&&typeof r.dimension==='string'&&r.dimension.trim()&&typeof r.unit==='string'&&r.unit.trim()&&
          r.excerpt.includes(String(r.year))&&r.excerpt.includes(r.unit)&&
          (r.excerpt.replaceAll(',','').match(/-?\d+(?:\.\d+)?/g)||[]).some(token=>Number(token)===r.value));
        records.push(...accepted.map(r=>({...r,target:report.target,role:id,published:report.published,publisher:report.publisher,source:report.source,method:'上传材料原文匹配，发布者身份与统计方法待外部核验'})));
        progress(s,'研报候选 '+extracted.rows.length+' 条，通过原文、单位和期间校验 '+accepted.length+' 条。',id);
      }catch(e){signal.throwIfAborted();progress(s,'研报补取未完成：'+e.message+'。继续调用公开数据接口。',id);}
    }else if(report&&report.role===id)progress(s,'研报标的或发布日期与任务不匹配，本轮未采用。',id);
    const response=await fetch('/api/kernel',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/x-ndjson'},signal,
      body:JSON.stringify({role:id,target:s.plan.target,sector:s.plan.sector,as_of:s.asOf,records})});
    if(!response.ok)throw Error('取数失败：'+await response.text());
    const reader=response.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer='',ledger;
    try{
      while(true){
        const {value,done}=await reader.read();
        if(done)break;
        signal.throwIfAborted();
        buffer+=value;
        const lines=buffer.split('\n');buffer=lines.pop();
        for(const line of lines){
          const event=JSON.parse(line);
          if(event.type==='progress')state(s,id,'运行中',event.task);
          if(event.type==='error')throw Error(event.message);
          if(event.type==='result')ledger=event.ledger;
        }
      }
    }finally{await reader.cancel().catch(()=>{});}
    if(!ledger)throw Error('取数连接中断，未取得完整台账');
    return ledger;
  }
  function showTeamReport(note,result){
    const details=document.createElement('details'),title=document.createElement('summary');
    title.textContent='查看团队消息';details.append(title);
    function add(label,items){
      if(!Array.isArray(items))return;
      const lines=[...new Set(items.filter(v=>typeof v==='string'&&v.trim()))].slice(0,6);
      if(!lines.length)return;
      const heading=document.createElement('strong'),body=document.createElement('div');
      heading.textContent=label;body.className='answer-text';
      body.innerHTML=displayMarkdown(lines.map(v=>'- '+v).join('\n'));
      details.append(heading,body);
    }
    const findings=[...result.artifacts,...result.risk_findings];
    add('主要发现',findings.flatMap(f=>(f?.claims||[]).map(c=>c.text)));
    add('判断依据',(result.evidence||[]).map(e=>[e?.title,e?.period_or_date,e?.page_or_table_or_section].filter(v=>typeof v==='string'&&v.trim()).join(' · ')));
    add('待核实事项',[...(result.missing||[]),...findings.flatMap(f=>f?.missing||[])].map(m=>typeof m==='string'?m:m?.impact||m?.field||m?.reason));
    if(details.childElementCount>1)note.after(details);
  }
  async function work(s,id,signal){
    const output=agentOutput(s,id);
    Object.assign(output,{summary:'',summaryDone:false,brief:'',progress:[],result:'',report:null,error:'',done:false});
    traceNode(s,id,id,'开始研究',assignments[id]);
    state(s,id,'运行中','准备研究任务与数据口径');
    progress(s,'已向「'+names[id]+'」派发任务。');
    recordProgress(s,id,'天枢','收到任务：'+assignments[id]+'。研究问题：'+s.research);
    const upstream=s.messages.slice();
    const task_id=s.snapshot+'-'+id;
    try{
      const data={task_id,snapshot_id:s.snapshot,as_of:s.asOf,target:s.plan.target,question:s.research,
        role:id,scope:s.plan.scope,metric_definitions:'按共享口径，明确单位、分母与可比范围',windows:'财务五个完整财年；近期单列',
        benchmarks:s.plan.scope,required_outputs:'按角色契约交付',upstream_ids:upstream.map(m=>m.id),handoff_to:['TS'],
        upstream,materials:s.materials,assignment:assignments[id]};
      output.taskCard=data;
      for(const msg of upstream)recordProgress(s,id,names[id],'收到 '+names[msg.from]+' 的团队消息：'+(msg.result?.summary||msg.error));
      if(id==='FIN'||id==='IND'){
        s.ledger=fetchLedger(s,id,signal);
        const ledger=await s.ledger;
        signal.throwIfAborted();
        s.verifiedLedger=ledger;s.visuals[id]={rows:ledger.metrics,sources:ledger.sources,missing:ledger.missing,evidence:ledger.observations,interim:ledger.interim,issues:ledger.issues,conflicts:ledger.conflicts};if(current===s)board.schedule();
        const notice=names[id]+'：'+ledger.metrics.length+' 条年度结果，'+ledger.interim.length+' 条近期观测。';
        recordProgress(s,id,names[id],notice);
        const series=new Map();
        const obsById=new Map(ledger.observations.map(o=>[o.id,o]));
        function origins(id){const o=obsById.get(id);return o?.source?[o.source]:(o?.inputs||[]).flatMap(origins);}
        for(const row of ledger.metrics){
          const key=JSON.stringify([row.dimension,row.name,row.unit]);
          if(!series.has(key))series.set(key,{dimension:row.dimension,name:row.name,unit:row.unit,formula:row.formula,values:{},sources_by_year:{}});
          series.get(key).values[row.year]=row.value;
          series.get(key).sources_by_year[row.year]=[...new Set(row.inputs.flatMap(origins))];
        }
        data.kernel={years:ledger.years,sources:ledger.sources,series:[...series.values()],issues:ledger.issues,conflicts:ledger.conflicts,
          missing_fields:[...new Set(ledger.missing.flatMap(r=>r.need||[r.name]))],interim:ledger.interim};
      }
      if(window.roleTools.titles[id]){
        state(s,id,'运行中','读取本轮共享取数台账');
        const ledger=await s.ledger;
        signal.throwIfAborted();
        state(s,id,'运行中',window.roleTools.titles[id]);
        data.role_kernel=window.roleTools.run(id,ledger,upstream);
        s.visuals[id]=data.role_kernel;if(current===s)board.schedule();
      }
      if(id==='SUPPLY'){
        state(s,id,'运行中','读取共享证据，校准产业活动边界');
        const ledger=await s.ledger;signal.throwIfAborted();
        Object.assign(data,window.supplyNetwork.task(ledger,s.plan,s.research,s.snapshot,s.asOf));
        s.visuals[id]={rows:[],sources:data.evidence_pack.sources,missing:[],evidence:data.evidence_pack.observations};
      }
      const evidence=s.visuals[id]||{};
      const count=Object.keys(evidence.sources||{}).length;
      traceNode(s,id,id,count?'资料已归集':'已核对资料缺口',count?`${(evidence.rows||[]).length} 条指标或关系，关联 ${count} 份来源。`:(evidence.missing||[]).map(m=>typeof m==='string'?m:m.name).filter(Boolean).slice(0,1).join('')||'当前还缺少可比数据。','evidence');
      const operation=data.role_kernel?.operation||'指标计算';
      data.role_conversation=(s.direct[id]?.history||[]).slice();
      state(s,id,'运行中',operation+'完成，正在请求模型分析');
      let lastProgress=0,chars=0,note=null,prefix='',briefDone=false,summaryLength=0;
      const previewSummary=publicSummary(s,id);
      // Decode only the leading public summary string, never render partial agent JSON.
      function liveBrief(chunk){
        if(briefDone)return;
        prefix+=chunk;
        const match=prefix.match(/^\s*(?:\x60{3}json\s*)?\{\s*"summary"\s*:\s*"/i);
        if(!match){if(prefix.length>60)briefDone=true;return;}
        const tail=prefix.slice(match[0].length);
        const token=tail.match(/^(?:[^"\\]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*/)[0];
        let message;
        try{message=JSON.parse('"'+token+'"');}catch{briefDone=true;return;}
        if(message){
          const delta=message.slice(summaryLength);
          if(delta)previewSummary.add(delta);summaryLength=message.length;
          output.brief=message;
          traceNode(s,id,id,'正在形成结论',message,'model');
          scheduleView(s);
        }
        if(tail[token.length]==='"'||prefix.length>8192){briefDone=true;prefix='';previewSummary.finish();}
      }
      const result=await structured(s,id,'work',data,signal,token=>{
        liveBrief(token);
        chars+=token.length;
        if(Date.now()-lastProgress>650&&!signal.aborted){
          state(s,id,'运行中','正在接收模型回报 · '+chars+' 字符');lastProgress=Date.now();
        }
      },()=>{briefDone=false;prefix='';summaryLength=0;output.brief='';output.summary='';output.summaryDone=false;if(note)note.textContent='';});
      signal.throwIfAborted();
      previewSummary.finish();
      if(!['complete','partial','blocked'].includes(result.status)||!Array.isArray(result.artifacts)||
          !Array.isArray(result.risk_findings)||typeof result.summary!=='string'||!result.summary.trim())throw Error('回报格式不完整');
      const {agent_analysis, ...handoff}=result;
      output.analysis=typeof agent_analysis==='string'?agent_analysis:'';
      const msg={id:task_id,from:id,to:'TS',result:handoff};
      s.messages.push(msg);
      traceNode(s,id,id,({complete:'研究完成',partial:'仍有缺口',blocked:'研究受阻'})[result.status],result.summary,'result');
      output.result=result.summary;output.report=result;output.done=true;recordText(s,id+'-report',names[id],result.summary);
      const preview=document.createElement('div');preview.innerHTML=displayMarkdown(result.summary);
      state(s,id,'已完成',preview.textContent.trim());
      if(output.feedRow&&output.summary.trim()===result.summary.trim()){output.feedRow.querySelector('strong').textContent=names[id]+' · 已交卷';if(note)note.closest('article')?.remove();note=output.feedRow.querySelector('p');}else if(!note)note=bubble(s,'天枢 · 收到团队回报','','progress');
      note.className='answer-text';note.innerHTML=displayMarkdown(note===output.feedRow?.querySelector('p')?result.summary:names[id]+'：'+result.summary);
    }catch(e){
      if(signal.aborted)throw e;
      s.messages.push({id:task_id,from:id,to:'TS',error:e.message});
      output.error=e.message;output.done=true;
      traceNode(s,id,id,'未取得结论',humanFailure(e.message),'error');
      state(s,id,'失败',e.message);progress(s,names[id]+'任务失败：'+e.message);
    }
  }
  async function compileReport(s,signal){
    traceNode(s,'RPT','RPT','报告编制','核对指标、来源与团队回报','step');
    const role='RPT',out=agentOutput(s,role);
    state(s,role,'运行中','对齐四份回报、指标与来源');
    let ledger;
    try{ledger=await s.ledger;}catch(e){signal.throwIfAborted();}
    ledger||={target:s.plan.target,years:[],metrics:[],interim:[],observations:[],sources:{},issues:['共享台账未取得'],conflicts:[],missing:[]};
    const competitive=s.agentOutput[s.plan.type==='company'?'COMP':'CHAIN']?.taskCard?.role_kernel;
    const report=window.researchReport.prepare(s,ledger,competitive);
    const indexed=new Map([...ledger.observations,...ledger.interim].map(o=>[o.id,o]));
    const sourceIds=id=>{const o=indexed.get(id);return o?.source?[o.source]:(o?.inputs||[]).flatMap(sourceIds);};
    const catalogue=report.rows.map(({id,name,year,value,unit,dimension,inputs})=>({id,name,year,value,unit,dimension,source_ids:[...new Set(inputs.flatMap(sourceIds))]}));
    const sourceIndex=Object.fromEntries(Object.entries(ledger.sources).map(([id,s])=>[id,[s.publisher,s.title||s.table,s.published,s.locator||s.scope].filter(Boolean).join(' · ')]));
    const data={question:s.research,scope:s.plan,as_of:s.asOf,catalogue,sourceIndex,upstream:s.messages.map(m=>({from:m.from,summary:m.result?.summary,risk_findings:m.result?.risk_findings,error:m.error})),issues:ledger.issues,conflicts:ledger.conflicts};
    data.chain_summary=s.agentOutput.SUPPLY?.report?.summary;
    out.taskCard=data;
    try{
      report.written=await structured(s,role,'report',data,signal);
      state(s,role,'已完成','图表和判断依据已关联');
    }catch(e){
      signal.throwIfAborted();report.fallback=true;
      report.written={conclusions:[],risks:[],gaps:['报告代理未完成证据关联：'+e.message+'。请从来源网页核查本轮台账。']};
      state(s,role,'失败',e.message);out.error=e.message;
    }
    signal.throwIfAborted();
    const byId=new Map(report.rows.map(r=>[r.id,r]));
    const prose=text=>String(text||'').replace(/\{\{(D\d+)\}\}/g,(_,id)=>{const r=byId.get(id);return r?String(r.unit==='元'?Number((r.value/1e8).toFixed(2)):r.value)+' '+(r.unit==='元'?'亿元':r.unit||''):'待核实';});
    const risks=report.written.risks.map(x=>({...x,text:prose(x.text),counter:prose(x.counter)}));
    out.result=report.written.conclusions.map(x=>prose([x.judgment,x.text].filter(Boolean).join(' '))).join('\n')||'可核验的数据与缺口见报告';out.done=true;
    s.reports||=[];s.reports.push(report);
    s.messages.push({id:s.snapshot+'-RPT',from:role,to:'TS',result:{summary:out.result,status:report.fallback?'partial':'complete',artifacts:[],risk_findings:risks}});
    out.report={summary:out.result,missing:report.written.gaps,artifacts:[],risk_findings:risks};out.analysis=out.result;traceNode(s,'RPT','RPT','报告就绪',out.result,'result');recordText(s,'RPT-result','可视化报告',out.result);
    if(current===s){reports.ready();scheduleView(s);}
    progress(s,report.fallback?'已生成本轮部分报告，可展开查看数据与缺口。':'本轮研究报告已生成，可展开查看图表、依据及引用。');
  }
  // Canonical identifiers already supported by the local evidence adapters.
  function knownTarget(text){
    const name=text.trim(),aliases=new Map([['美的集团','美的集团'],['美的集团股份有限公司','美的集团'],['000333','美的集团'],['000333.SZ','美的集团'],['宁德时代','宁德时代'],['300750','宁德时代'],['300750.SZ','宁德时代']]);
    const target=aliases.get(name.toUpperCase());
    return target?{type:'company',target,scope:'五个完整财年，分析经营变化、现金流、同业表现和风险，近期可比期间单列。',question:''}:null;
  }
  async function run(s,fixedPlan,fixedQuestion){
    s.controller?.abort();
    const controller=new AbortController(), signal=controller.signal;
    s.controller=controller;s.phase='planning';s.plan=null;s.messages=[];s.agents=[];s.agentOutput={};s.direct={};
    if(current===s){showPanel(s);if(s.view){buildAgentView();paintAgentView(s);}scheduleView(s);}
    if(current===s)leaveSample();s.trace=newTrace();s.traceOpen=true;s.boardMode='work';s.visuals={};s.verifiedLedger=null;s.finalText='';mountTrace(s);
    traceNode(s,'scope','TS','确定研究范围',s.history.filter(m=>m.role==='user').at(-1)?.content||'');
    s.snapshot=crypto.randomUUID();s.asOf=new Date().toISOString();
    s.materials=s.history.filter(m=>m.role==='user').slice();s.research=fixedQuestion||s.materials.map(m=>m.content).join('\n');
    try{
      progress(s,'正在识别研究标的、时间范围和统计口径。');
      const plan=fixedPlan||knownTarget(s.history.filter(m=>m.role==='user').at(-1)?.content||'')||await structured(s,'TS','plan',context(s),signal);
      if(plan.type==='clarify'){
        const question=plan.question||'请补充企业全称或行业范围。';
        bubble(s,'天枢',question);s.history.push({role:'assistant',content:question});s.phase='clarify';traceNode(s,'scope','TS','等待补充',question,'result');ensureViewRole(s);if(current===s)showPanel(s);return;
      }
      if(!Object.hasOwn(teams,plan.type)||!plan.target||!plan.scope)throw Error('天枢未返回有效的标的和口径，请重试');
      traceNode(s,'scope','TS','研究范围已确定',plan.target+' · '+plan.scope,'result');
      s.plan=plan;s.phase='working';
      const ids=teams[plan.type];
      s.agents=ids.map(id=>({id,name:names[id],status:'等待中',task:['RC','RI'].includes(id)?'等待四个研究角色回报':'等待派发'}));
      s.agents.push({id:'RPT',name:names.RPT,status:'等待中',task:'等待研究与风险回报'});
      ensureViewRole(s);
      progress(s,'已选择'+(plan.type==='company'?'企业':'行业')+'组 · '+plan.target+'。'+plan.scope);
      await Promise.all(ids.slice(0,-1).map(id=>work(s,id,signal)));
      await work(s,ids.at(-1),signal);
      await compileReport(s,signal);
      s.phase='synthesizing';traceNode(s,'final','TS','汇总研究结论','正在整理各角色的发现和证据缺口。');progress(s,'本组任务已结束，正在汇总回报与缺口。');
      await reply(s,'final',context(s),signal);s.phase='done';s.finalText=s.history.at(-1)?.content||'';board.finish(s);
    }catch(e){if(!signal.aborted){s.phase='failed';traceNode(s,s.plan?'final':'scope','TS','研究未完成',humanFailure(e.message),'error');if(s.plan)board.finish(s);ensureViewRole(s);if(current===s)showPanel(s);bubble(s,'运行提示',e.message,'error');}}
  }
  async function handle(s,history){
    if(['idle','failed','clarify'].includes(s.phase)){void run(s);return;}
    const data=context(s,history);
    const choice=await structured(s,'TS','steer',data);
    if(choice.action==='revise'){progress(s,'已收到范围调整，将按更新后的要求重新派单。');void run(s);return;}
    if(choice.action!=='answer')throw Error('未识别插话类型，请重新发送');
    await reply(s,'answer',{...context(s,history),latest_user_message:history.at(-1).content});
  }
  function sendDirect(s,role,content){
    const chat=s.direct[role]||=( {thread:document.createElement('section'),history:[],queue:Promise.resolve()} );
    chat.thread.className='role-dialogue';
    const question={role:'user',content};
    const signal=s.controller?.signal;
    chat.history.push(question);
    bubble(s,'你',content,'user',chat.thread);
    const slot=bubble(s,names[role],'等待回复…','',chat.thread);slot.className='answer-text';
    paintAgentView(s);workspace.scrollTop=workspace.scrollHeight;
    chat.queue=chat.queue.then(async()=>{
      signal?.throwIfAborted();
      const item=s.messages.find(m=>m.from===role);
      const own=s.agentOutput[role];
      const data={recipient:role,question:content,research:s.research,scope:s.plan,task_id:item?.id,
        assignment:assignments[role],task_inputs:own?.taskCard,work_log:own?.progress,agent_analysis:own?.analysis,
        agent_report:item?.result,status:s.agents.find(a=>a.id===role)?.task,
        conversation:chat.history.slice(0,chat.history.indexOf(question)+1)};
      let buffer='';
      const answer=await call(s,role,'direct',data,signal,token=>{
        buffer+=token;slot.innerHTML=displayMarkdown(buffer);
      });
      chat.history.splice(chat.history.indexOf(question)+1,0,{role:'assistant',content:answer});
      const forward=document.createElement('button');forward.className='btn btn-ghost';forward.textContent='将此回复回报天枢';
      forward.onclick=()=>{
        if(signal?.aborted||forward.disabled)return;
        const update={id:s.snapshot+'-'+role+'-'+crypto.randomUUID(),from:role,to:'TS',result:{summary:answer,status:'partial',artifacts:[],risk_findings:[]}};
        s.messages.push(update);progress(s,'收到「'+names[role]+'」的补充回报：'+answer);
        forward.disabled=true;forward.textContent='已回报天枢';
      };
      slot.after(forward);
    }).catch(e=>{if(slot.textContent==='等待回复…')slot.textContent='';slot.append(document.createTextNode(signal?.aborted?'（研究范围已更新，本次回复已停止）':'（回复失败：'+e.message+'）'));});
  }
  function send(){
    const s=current,text=input.value.trim();if(!text)return;
    if(location.protocol==='file:'){bubble(s,'启动提示','请使用项目内的“启动工作台.cmd”打开本地服务。','error');return;}
    let config;
    try{config=JSON.parse(localStorage.getItem('tianshu.day.user-config'));}catch{}
    if(!config?.baseUrl||!config.model||(!config.apiKey&&!/^https?:\/\/(?:127\.0\.0\.1|localhost|\[::1\])(?=[:/]|$)/i.test(config.baseUrl))){bubble(s,'配置提示','请先在右上角设置中保存模型地址、API Key 和模型名，再发送。','error');return;}
    s.config=config;if(current===s){leaveSample();mountTrace(s);}
    const content=text+(s.citations?.length?'\n引用本会话报告：\n'+s.citations.map(c=>c.text).join('\n'):'');
    s.citations=[];reports.chips();
    if(!s.history.length){
      s.item.dataset.fresh='0';
      s.item.dataset.name=text.slice(0,22);
      s.item.querySelector('.chat-name').textContent=s.item.dataset.name;
      if(s.view)renderAgentTitle(s,s.view);else renderLeadTitle(s);
    }
    input.value='';
    const reportTurn=reports.startQuestion(text);
    if(s.view&&!reportTurn){sendDirect(s,s.view,content);return;}
    s.history.push({role:'user',content});input.placeholder=leadPlaceholder(s);
    bubble(s,'你',content,'user');
    const history=s.history.slice();
    s.queue=s.queue.then(()=>reportTurn?reply(s,'answer',{...context(s,history),reading_report:reportTurn.data,latest_user_message:content},undefined,reportTurn):handle(s,history)).catch(e=>bubble(s,'消息处理失败',e.message,'error'));
  }
  $('.send').addEventListener('click',send);
  $('.circle-plus').title='导入实跑报告、研报或指标数据（JSON）';
  $('.circle-plus').onclick=()=>{
    const s=current,picker=document.createElement('input');picker.type='file';picker.accept='.json';
    picker.onchange=async()=>{
      try{
        const file=picker.files[0];if(!file)return;
        if(file.size>1500000)throw Error('单个资料包请控制在 1.5 MB 内');
        const rows=JSON.parse((await file.text()).replace(/^\uFEFF/,''));
        if(rows?.written&&rows?.ledger){
          if(!['company','industry'].includes(rows.type)||typeof rows.target!=='string'||typeof rows.asOf!=='string'||!rows.snapshot||
             !['metrics','interim','observations','years'].every(k=>Array.isArray(rows.ledger[k]))||!rows.ledger.sources)throw Error('报告留档缺少标的、日期或证据台账');
          rows.rows=window.researchReport.catalogue(rows.ledger,rows.competition);rows.failures||=[];
          if(!window.researchReport.valid(rows.written,rows.rows))throw Error('报告留档的章节或指标引用无效');
          s.reports||=[];s.reports.push(rows);progress(s,'已载入实跑留档：'+rows.target+' · '+rows.asOf.slice(0,10));
          if(current===s){reports.sync();reports.ready();$('#report-toggle').click();}
          return;
        }
        if(rows?.type==='report'){
          if(!['FIN','IND'].includes(rows.role)||!rows.target||!rows.publisher||!/^https?:\/\//.test(rows.source)||!/^\d{4}-\d{2}-\d{2}$/.test(rows.published)||typeof rows.text!=='string'||!rows.text.trim()||rows.text.length>40000)throw Error('研报包需含标的、角色、发布方、原始链接、日期和不超过四万字的原文');
          s.report=rows;progress(s,'已载入研报原文，下次匹配该标的时将按页码和表名核验。');return;
        }
        if(!Array.isArray(rows)||!rows.every(r=>r&&r.target&&r.field&&r.source&&r.locator&&r.published&&r.unit&&Number.isInteger(r.year)&&Object.hasOwn(names,r.role)))throw Error('请使用指标接口说明中的记录数组格式');
        s.records=rows;
        progress(s,'已载入 '+file.name+'，共 '+rows.length+' 条记录，下次派单时匹配本次标的。');
      }catch(e){bubble(s,'导入失败',e.message,'error');}
    };picker.click();
  };
  $('#composer').addEventListener('submit',e=>{e.preventDefault();send();});
  input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&e.keyCode!==229){e.preventDefault();send();}});
})();
