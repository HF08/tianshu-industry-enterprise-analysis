window.modelMeter=(()=>{
  const sessions=new WeakMap(),running=new Set();
  let visible=null,timer=null;
  const byId=id=>document.getElementById(id);
  function meter(s){
    if(!sessions.has(s))sessions.set(s,{total:0,reports:0,unknown:0,hits:0,denom:0,context:null,lastRate:null,last:null,buckets:new Map()});
    return sessions.get(s);
  }
  const number=(x)=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
  function render(){
    if(!visible)return;
    const m=meter(visible),now=Math.floor(performance.now()/1000);
    const v=Array.from({length:30},(_,i)=>m.buckets.get(now-29+i)||0);
    const requests=[...running].filter(x=>x.m===m),active=requests.length;
    const measured=active>0&&requests.every(r=>number(r.count));
    const rate=measured?requests.reduce((n,r)=>n+1000*r.count/Math.max(1,performance.now()-r.start),0):active?(v.at(-2)+v.at(-1))/2:m.lastRate;
    window.updateModelStatus({tokens:m.total,tps:rate??0,waiting:!active,cacheHit:m.denom?100*m.hits/m.denom:null,contextPercent:m.context});
    byId('st-tps-value').textContent=rate===null?'—':rate.toFixed(1);
    byId('st-tps').querySelector('.st-unit').textContent=active&&!measured?'字符/s':'tok/s';
    byId('st-tps').title=measured?'当前请求的已上报输出 token / 已用时间；并发时求和':active?'并发响应近两秒收到的文本字符数 ÷ 2，含推理输出':'最近完成请求的输出 token / 请求总耗时（含等待）';
    byId('st-wait').hidden=false;
    byId('st-wait').textContent=active?active+' 路请求中 · 实时接收':m.last?'最近请求 · '+m.last:'等待模型请求';
    if(!m.reports)byId('st-tokens').textContent='—';
    else if(m.unknown)byId('st-tokens').textContent+='（部分）';
    byId('st-tokens').title='本会话已上报 token 合计；未提供完整用量的请求 '+m.unknown+' 个';
    byId('st-cache').title='有缓存统计的请求：命中输入 token ÷ 输入 token';
    byId('st-context').title='最近完成请求的输入 token ÷ 已知模型窗口；未知窗口显示 —';
    const canvas=byId('st-wave'),ctx=canvas.getContext('2d');
    const w=canvas.width,h=canvas.height,peak=Math.max(1,...v);
    ctx.clearRect(0,0,w,h);ctx.strokeStyle='#354446';ctx.beginPath();ctx.moveTo(0,h-2);ctx.lineTo(w,h-2);ctx.stroke();
    ctx.beginPath();v.forEach((n,i)=>{const x=i*w/29,y=h-2-n*(h-5)/peak;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});
    ctx.strokeStyle='#77cfae';ctx.lineWidth=1.7;ctx.stroke();
    canvas.title='最近 30 秒响应流量，峰值 '+peak+' 字符/秒';
  }
  function tick(){
    render();
    if(!running.size&&(!visible||performance.now()-(meter(visible).ended||0)>31000)){clearInterval(timer);timer=null;}
  }
  function start(s,model){
    const m=meter(s),begin=performance.now(),token={m,start:begin};let usage={},limit=null,closed=false;
    running.add(token);if(!timer)timer=setInterval(tick,500);render();
    return {
      headers(r){const n=Number(r.headers.get('X-Context-Limit'));if(n>0)limit=n;},
      event(e){
        const u=e.response?.usage||e.usage;
        if(u){usage.prompt_tokens=u.input_tokens??usage.prompt_tokens;usage.completion_tokens=u.output_tokens??usage.completion_tokens;usage.total_tokens=u.total_tokens??usage.total_tokens;usage.prompt_cache_hit_tokens=u.input_tokens_details?.cached_tokens??u.prompt_cache_hit_tokens??usage.prompt_cache_hit_tokens;}
        if(number(usage.completion_tokens))token.count=usage.completion_tokens;
        const length=typeof e.delta==='string'&&/^response\.(output_text|reasoning_text|reasoning_summary_text)\.delta$/.test(e.type)?[...e.delta].length:0;
        const sec=Math.floor(performance.now()/1000);
        if(length){m.buckets.set(sec,(m.buckets.get(sec)||0)+length);for(const k of m.buckets.keys())if(k<sec-30)m.buckets.delete(k);}
      },
      end(){
        if(closed)return;closed=true;running.delete(token);
        const u=usage,p=u.prompt_tokens,c=u.completion_tokens,total=number(u.total_tokens)?u.total_tokens:number(p)&&number(c)?p+c:null;
        if(number(total)){m.reports++;m.total+=total;}else m.unknown++;
        const hit=u.prompt_cache_hit_tokens??u.prompt_tokens_details?.cached_tokens;
        const denom=number(p)?p:number(hit)&&number(u.prompt_cache_miss_tokens)?hit+u.prompt_cache_miss_tokens:null;
        if(number(hit)&&number(denom)&&denom>=hit){m.hits+=hit;m.denom+=denom;}
        m.ended=performance.now();m.last=model;m.lastRate=number(c)?1000*c/Math.max(1,m.ended-begin):null;
        m.context=limit&&number(p)?Math.min(100,100*p/limit):null;
        render();
      }
    };
  }
  return {select(s){visible=s;render();},start};
})();
