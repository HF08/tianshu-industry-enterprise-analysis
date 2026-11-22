/* Playback advances across actual session events. Gaps are shortened; timestamps on nodes are unchanged. */
(() => {
  const raw=JSON.parse(document.getElementById('recording').textContent), events=raw.events;
  const $=id=>document.getElementById(id),range=$('playhead'),toggle=$('play'),time=$('play-time');
  const positions=events.map(()=>0);for(let i=1;i<events.length;i++){
    const gap=Math.max(0,events[i].at-events[i-1].at);
    positions[i]=positions[i-1]+(gap<180?190:Math.min(6000,Math.max(680,gap*.4)));
  }
  const end=positions.at(-1)||1,format=ms=>`${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}`;
  let s,cursor=0,index=-1,playing=false,last=0,frame=0;
  const board=window.researchBoard.bind(()=>s);
  const transcript=(raw.transcript||[]).slice().sort((a,b)=>a.at-b.at),feed=$('replay-feed');let shown=-1,blocks=new Map(),lastRead=0;
  const publicNames={IND:'行业状况',CHAIN:'上下游分析',DEM:'规模客户',RI:'风险复核',TS:'天枢'};
  const timeline=[{at:events[0].at,key:'question',who:'调查问题',text:raw.question},...transcript];
  for(const e of events)if(e.label==='研究范围已确定'||e.key==='final'&&e.kind==='step')timeline.push({at:e.at,key:'event-'+e.at,who:'天枢',text:e.text});
  timeline.sort((a,b)=>a.at-b.at);
  function writeFeed(realTs){
    let following=feed.scrollHeight-feed.scrollTop-feed.clientHeight<72;
    if(realTs<lastRead||shown<0){feed.replaceChildren();blocks.clear();shown=0;following=true;}lastRead=realTs;
    let changed=false;while(shown<timeline.length&&timeline[shown].at<=realTs){const e=timeline[shown++];let item=blocks.get(e.key);
      if(e.key.endsWith('-report')){const prior=blocks.get(e.key.replace('-report','-brief'));if(prior&&prior.body.textContent.trim()===e.text.trim()){prior.row.classList.add('feed-handoff');prior.row.querySelector('b').textContent=(publicNames[e.key.split('-')[0]]||e.who)+' · 已交卷';changed=true;continue;}}
      if(!item){const row=document.createElement('article');row.className='feed-row '+(e.key==='question'?'feed-query':e.key.endsWith('-report')?'feed-handoff':'');
        const head=document.createElement('header'),dot=document.createElement('i'),name=document.createElement('b'),time=document.createElement('time');row.style.setProperty('--feed-color',({IND:'#74dcbc',CHAIN:'#bba4f6',DEM:'#f4bd7d',RI:'#92b7fb'})[e.key.split('-')[0]]||'#93c7bb');name.textContent=(publicNames[e.key.split('-')[0]]||e.who)+(e.key.endsWith('-report')?' · 交卷':e.key==='final-body'?' · 综合报告':'');time.textContent=new Date(e.at).toLocaleTimeString('zh-CN',{hour12:false});head.append(dot,name,time);const body=document.createElement('div');body.className='feed-text';row.append(head,body);feed.append(row);item={row,body};blocks.set(e.key,item);}
      item.body.append(document.createTextNode(e.text));if(e.key==='final-body'&&item.body.textContent===raw.finalText&&window.markdownit){const md=window.markdownit({html:false,breaks:true,linkify:false}).disable('image');md.validateLink=v=>/^https?:\/\//i.test(v);item.body.innerHTML=md.render(raw.finalText);item.body.classList.add('reading-prose');item.body.style.whiteSpace='normal';}changed=true;
    }
    if(changed&&following)feed.scrollTop=feed.scrollHeight;
  }
  function realPosition(){let i=0;while(i+1<positions.length&&positions[i+1]<=cursor)i++;if(i===events.length-1)return events[i].at;const p=(cursor-positions[i])/(positions[i+1]-positions[i]);return events[i].at+(events[i+1].at-events[i].at)*p;}
  function paint(force=false){
    writeFeed(realPosition());
    range.value=String(cursor);time.textContent=format(cursor)+' / '+format(end);
    let at=0;while(at+1<events.length&&positions[at+1]<=cursor)at++;
    if(!force&&at===index)return;index=at;
    const visible=events.slice(0,at+1), entries=new Map(visible.map(e=>[e.key,e]));
    const routed=visible.some(e=>e.key==='scope'&&e.label==='研究范围已确定');
    const done=cursor>=end, finalEvent=visible.find(e=>e.key==='final');
    const ids=routed?raw.agents:[], agentOutput={},visuals={};let ledger=null;
    for(const a of ids){const list=visible.filter(e=>e.key===a.id);
      if(list.some(e=>e.kind==='evidence')){visuals[a.id]=raw.visuals[a.id];if(['IND','FIN'].includes(a.id))ledger=raw.verifiedLedger;}
      if(list.some(e=>['result','error'].includes(e.kind)))agentOutput[a.id]=raw.agentOutput[a.id];
    }
    const mode=s?.boardMode||'work',id=s?.boardId;
    s={replay:true,traceOpen:true,boardMode:mode==='detail'&&!ids.some(a=>a.id===id)?'work':mode,boardId:id,trace:{entries,events:visible},phase:done?raw.phase:finalEvent?'synthesizing':routed?'working':'planning',research:raw.question,plan:routed?raw.plan:null,agents:ids,agentOutput,visuals,verifiedLedger:ledger,finalText:done?raw.finalText:''};
    board.mount();$('wall').textContent=new Date(events[at].at).toLocaleTimeString('zh-CN',{hour12:false});$('report').disabled=!done||!raw.finalText;
  }
  function stop(){playing=false;cancelAnimationFrame(frame);toggle.textContent=cursor>=end?'↺ 重播':'▶ 播放';toggle.setAttribute('aria-pressed','false');}
  function tick(now){if(!playing)return;cursor=Math.min(end,cursor+now-last);last=now;paint();if(cursor>=end){stop();const doneSession=s;setTimeout(()=>{if(s===doneSession&&cursor>=end&&s.boardMode==='work'){s.boardMode='overview';board.mount();}},1500);}else frame=requestAnimationFrame(tick);}
  function start(){if(cursor>=end){cursor=0;s.boardMode='work';paint(true);}playing=true;last=performance.now();toggle.textContent='Ⅱ 暂停';toggle.setAttribute('aria-pressed','true');frame=requestAnimationFrame(tick);}
  toggle.onclick=()=>playing?stop():start();range.max=String(end);range.oninput=()=>{stop();cursor=Number(range.value);paint(true);stop();};$('jump').onclick=()=>{stop();cursor=end;s.boardMode='overview';paint(true);stop();};$('report').onclick=()=>{stop();board.report();};

  $('trace-scroll').addEventListener('click',e=>{if(e.target.closest('button,summary'))stop();});$('board-rail').addEventListener('click',stop);$('board-modes').addEventListener('click',stop);
  $('actual').textContent='原始用时 '+format(events.at(-1).at-events[0].at);range.step='1';paint(true);start();
})();
