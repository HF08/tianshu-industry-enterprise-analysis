window.modelMeter=(()=>{
  // 波峰图的窗口：过去 60 秒逐秒一个桶，存的是这一秒收到的文本字符数
  const POINTS=60,STORAGE_KEY='tianshu.day.user-config';
  const sessions=new WeakMap(),running=new Set();
  let visible=null,timer=null;
  function meter(s){
    if(!sessions.has(s))sessions.set(s,{total:0,est:0,estimated:false,reports:0,hits:0,denom:0,context:null,model:'',ended:0,buckets:new Map()});
    return sessions.get(s);
  }
  const number=(x)=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
  // 模型名优先用最近一次请求的模型；只读到配置时属于下一次运行
  function modelName(m){
    if(m.model)return{name:m.model,scope:'本次运行'};
    let config=null;
    try{config=JSON.parse(localStorage.getItem(STORAGE_KEY));}catch{}
    const name=typeof config?.model==='string'?config.model.trim():'';
    return{name,scope:name?'下次运行':''};
  }
  function render(){
    if(!visible)return;
    const m=meter(visible);
    // 最后一格取最近一个完整秒：进行中的那一秒还不完整，写进去会把曲线末端压塌
    const end=Math.floor(performance.now()/1000)-1;
    const series=Array.from({length:POINTS},(_,i)=>m.buckets.get(end-(POINTS-1)+i)||0);
    const peak=Math.max(0,...series);
    const model=modelName(m);
    window.updateModelStatus({
      tps:series[POINTS-1],unit:'字符/s',
      tokens:(m.total+m.est)>0?m.total+m.est:null,
      estimated:m.estimated,
      cacheHit:m.denom?100*m.hits/m.denom:null,
      contextPercent:m.context,
      series,peak:peak||null,
      model:model.name,modelScope:model.scope
    });
  }
  function tick(){
    render();
    if(running.size)return;
    const m=visible&&meter(visible);
    // 停止出字后继续刷新 61 秒，让曲线随窗口右移回空闲，之后停掉定时器
    if(!m||!m.ended||performance.now()-m.ended>61000){clearInterval(timer);timer=null;}
  }
  function keepTicking(){if(!timer)timer=setInterval(tick,500);}
  function start(s,model){
    const m=meter(s),begin=performance.now(),token={m,start:begin};let usage={},chars=0,limit=null,closed=false;
    if(typeof model==='string'&&model.trim())m.model=model.trim();
    running.add(token);keepTicking();render();
    return {
      headers(r){const n=Number(r.headers.get('X-Context-Limit'));if(n>0)limit=n;},
      event(e){
        const u=e.response?.usage||e.usage;
        if(u){
          usage.prompt_tokens=u.input_tokens??u.prompt_tokens??usage.prompt_tokens;
          usage.completion_tokens=u.output_tokens??u.completion_tokens??usage.completion_tokens;
          usage.total_tokens=u.total_tokens??usage.total_tokens;
          usage.prompt_cache_hit_tokens=u.input_tokens_details?.cached_tokens??u.prompt_tokens_details?.cached_tokens??u.prompt_cache_hit_tokens??usage.prompt_cache_hit_tokens;
        }
        if(number(usage.completion_tokens))token.count=usage.completion_tokens;
        const length=typeof e.delta==='string'&&/^response\.(output_text|reasoning_text|reasoning_summary_text)\.delta$/.test(e.type)?[...e.delta].length:0;
        if(length){
          chars+=length;
          const sec=Math.floor(performance.now()/1000);
          m.buckets.set(sec,(m.buckets.get(sec)||0)+length);
          for(const k of m.buckets.keys())if(k<sec-POINTS)m.buckets.delete(k);
        }
      },
      end(){
        if(closed)return;closed=true;running.delete(token);
        const u=usage,p=u.prompt_tokens,c=u.completion_tokens,total=number(u.total_tokens)?u.total_tokens:number(p)&&number(c)?p+c:null;
        if(number(total)){m.reports++;m.total+=total;}
        else if(chars>0){m.est+=Math.round(chars/1.6);m.estimated=true;}
        const hit=u.prompt_cache_hit_tokens??u.prompt_tokens_details?.cached_tokens;
        const denom=number(p)?p:number(hit)&&number(u.prompt_cache_miss_tokens)?hit+u.prompt_cache_miss_tokens:null;
        if(number(hit)&&number(denom)&&denom>=hit){m.hits+=hit;m.denom+=denom;}
        m.ended=performance.now();
        m.context=limit&&number(p)?Math.min(100,100*p/limit):null;
        render();
      }
    };
  }
  return {select(s){visible=s;render();keepTicking();},start,refresh:render};
})();
