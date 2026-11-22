from pathlib import Path
import re,colorsys
root=Path('work/red-shared');app=root/'天枢工作台/app'
def color(m):
 h=m[0][1:];h=''.join(x*2 for x in h) if len(h) in (3,4) else h
 hue,l,s=colorsys.rgb_to_hls(*[int(h[i:i+2],16)/255 for i in (0,2,4)])
 if s<.055:return m[0]
 # A burgundy-to-coral scale; keep the existing lightness hierarchy.
 rgb=colorsys.hls_to_rgb((.965+.065*hue)%1,l,min(.74,s))
 return '#'+''.join(f'{round(x*255):02x}' for x in rgb)+h[6:]
def red(s):
 s=re.sub(r'#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{4}\b|#[0-9a-fA-F]{3}\b',color,s)
 def rgb(m):
  a,b,c=map(int,m.group(2,3,4));h=color(re.match(r'.+','#%02x%02x%02x'%(a,b,c)))
  return m[1]+'('+','.join(str(int(h[i:i+2],16)) for i in (1,3,5))+m[5]+')'
 return re.sub(r'\b(rgb|rgba)\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(\s*(?:,[.\d\s]+)?)\)',rgb,s)
for p in [*app.glob('*.css'),*(root/'演示工具').glob('*.css'),*[app/n for n in ['research-board.js','chain-map.js','supply-network.js','telemetry.js']]]:
 s=red(p.read_text('utf-8-sig')).replace('[215,32,158,282,350]','[350,6,335,16,355]')
 p.write_text(s,'utf-8')
for p in [app/'index.html',root/'演示工具/player.html',*root.glob('*-实跑报告.html')]:
 s=p.read_text('utf-8-sig');s=re.sub(r'(<style[^>]*>)(.*?)(</style>)',lambda m:m[1]+red(m[2])+m[3],s,flags=re.S)
 if p==app/'index.html':s=re.sub(r'(<script>)(.*?)(</script>)',lambda m:m[1]+red(m[2])+m[3],s,flags=re.S)
 if p in root.glob('*-实跑报告.html'):
  a=s.find('<script>');b=s.find('const saved=',a)
  if b>a>=0:s=s[:a]+red(s[a:b]).replace('[215,32,158,282,350]','[350,6,335,16,355]')+s[b:]
 p.write_text(s,'utf-8')
p=app/'research-report.js';s=p.read_text('utf-8')
a=s.index('    function open(){');b=s.index("    document.addEventListener('pointerdown'",a)
s=s[:a]+'''    const historyBox=el(dialog,'section',null,'report-replies');historyBox.hidden=true;
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
      draw();dialog.show();position();showReplies();toggleLabel(true);
    }
    toggle.onclick=open;$('#report-exit').onclick=close;$('#proof-close').onclick=()=>source.close();
    for(const d of [source,dialog])d.onclick=e=>{if(e.target===d)d.close();};
    dock.querySelector('.model-btn')?.addEventListener('click',()=>{if(dialog.open)close();},true);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&dialog.open&&!source.open&&!menu.classList.contains('open')){e.preventDefault();close();}},false);
'''+s[b:]
s=s.replace("if(compose){close();$('#composer-input').focus();}","if(compose){if(source.open)source.close();$('#composer-input').focus();}").replace('关闭报告后可追问','可在下方继续追问').replace('return {sync,close,chips,ready()', 'return {sync,close,chips,startQuestion,ready()')
p.write_text(s,'utf-8')
p=app/'team.js';s=p.read_text('utf-8').replace('async function reply(s,action,data,signal){','async function reply(s,action,data,signal,reportTurn){').replace('body.innerHTML=displayMarkdown(buffer);\n      if(follow)','body.innerHTML=displayMarkdown(buffer);reportTurn?.paint(body.innerHTML);\n      if(follow)').replace("（回答未完成）'));throw e;","（回答未完成）'));reportTurn?.paint(body.innerHTML);throw e;")
s=s.replace("    if(s.view){sendDirect(s,s.view,content);return;}","    const reportTurn=reports.startQuestion(text);\n    if(s.view&&!reportTurn){sendDirect(s,s.view,content);return;}")
s=s.replace("s.queue=s.queue.then(()=>handle(s,history))","s.queue=s.queue.then(()=>reportTurn?reply(s,'answer',{...context(s,history),reading_report:reportTurn.data,latest_user_message:content},undefined,reportTurn):handle(s,history))")
p.write_text(s,'utf-8')
