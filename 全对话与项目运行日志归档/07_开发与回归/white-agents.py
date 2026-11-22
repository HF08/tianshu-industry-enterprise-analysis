from pathlib import Path
import re
d=Path('work/white-agents'); app=d/'天枢工作台'
def edit(f,fn):
 p=d/f;p.write_text(fn(p.read_text('utf-8-sig')),'utf-8')
def board(s):
 a=s.index('  const maps=new Map()');b=s.index('  function comparison(s)',a)
 s=s[:a]+'''  function runningCards(s,detail){
    const list=el('section','running-cards');
    const agents=s.agents||[],done=agents.filter(a=>a.status==='已完成'||a.status==='失败').length;
    const header=el('header','running-header');header.append(el('h2','','子代理运行'),el('small','',done+' / '+agents.length+' 已结束'));list.append(header);
    if(!agents.length)list.append(el('p','board-note','正在确认研究范围，派单后将在这里显示各子代理。'));
    for(const a of agents){
      const output=s.agentOutput?.[a.id],entry=s.trace?.entries.get(a.id);
      const card=button('agent-run-card','',()=>detail(a.id));card.dataset.role=a.id;
      const state=a.status||'等待中';card.dataset.status=state;
      const head=el('span','run-card-head');head.append(el('strong','',names[a.id]||a.name||a.id),el('small','run-status',state));card.append(head);
      const finding=output?.report?.overview_card?.headline||output?.report?.summary;
      const task=state==='失败'?(output?.error||a.task):state==='已完成'?(finding||a.task||entry?.text):(a.task||entry?.text);
      card.append(el('span','run-card-task',task||'等待派发'));
      if(state==='运行中'&&entry?.text&&entry.text!==task)card.append(el('small','run-card-finding',short(entry.text)));
      list.append(card);
    }return list;
  }
'''+s[b:]
 return s.replace('||s.sampleGraph','').replace('let sample=null,owner=null','let owner=null').replace('const session=()=>sample||get();','const session=get;').replace("&&!sample&&get()", "&&get()").replace("s.sample||'',","...s.agents.map(a=>a.status+' '+(a.task||'')),").replace("s.sample?'随包核验样例':",'').replace("s.sample?'核验样例':",'').replace("leaveSample(){sample=null;},showSample(s){sample=s;signature='';render();},",'').replace("branch(s,openRole,()=>change('report'))","runningCards(s,openRole)").replace("wrap.scrollTop=large?old:0","wrap.scrollTop=large||mode==='work'?old:0").replace("work:'多线调查'","work:'子代理运行'")
edit('天枢工作台/app/research-board.js',board)
def team(s):
 a=s.index("  $('#board-example')");b=s.index('  function humanFailure',a);s=s[:a]+s[b:]
 return s.replace('if(current===s)board.leaveSample();','').replace('board.leaveSample();','').replace("'调查导图'","'子代理运行'").replace("if(current===s){showPanel(s);scheduleView(s);}","if(current===s){showPanel(s);scheduleView(s);board.schedule();}")
edit('天枢工作台/app/team.js',team)
edit('天枢工作台/server.mjs',lambda s:s.replace("'board-example.json',",''))
(app/'app/board-example.json').unlink()
edit('天枢工作台/app/index.html',lambda s:re.sub(r'^.*<button[^\n]+(?:id="board-example"|<span>完全权限</span>)[^\n]*\n','',s,flags=re.M).replace('>实时流程</button>','>子代理运行</button>').replace('>调查流程</strong>','>子代理运行</strong>'))
edit('演示工具/player.html',lambda s:s.replace('多线流程','子代理运行'))
edit('演示工具/case-player.js',lambda s:s.replace("  $('trace-scroll').addEventListener('pointerdown',e=>{if(e.target.closest('.mind-workspace'))stop();});",'').replace('button,summary,.mind-svg,.mind-node','button,summary'))
# Reuse the existing light palette for base styles and recolor embedded svg/script paints too.
code=Path('work/day-edition.py').read_text('utf-8-sig').replace("Path('work/day-preview')","Path('work/white-agents')")
exec(code)
skin="""
:root{color-scheme:light;--bg:#fff;--sb:#fff;--dlg:#fff;--pane:#fff;--text:#182c31;--tx:#182c31;--line:#d8e1df;--dlg-line:#cbd7d4}
html,body,.app,.sidebar,.main,.main-body,.topbar,.workspace,.composer,.composer-dock,.agent-view,.studio-bar,.replay-chat,.feed-scroll,.board-layout,#board-rail,#board-modes,.player,.trace-head,.st-bar,.board-heading{background-color:#fff}
#trace-pane,#trace-scroll,.replay-wrap{background:#fff;color:#172d31}
#trace-pane .corner,#trace-pane .board-card,#trace-pane .role-sheet,#trace-pane .compare-sheet,#research-report[open],#research-source[open],#research-pages,#proof-body,#research-report header,#research-source header{background:#fff;color:#172d31}
#trace-pane[data-mode=work] #trace-scroll{overflow-y:auto;padding:12px;scrollbar-width:thin;height:100%}
#trace-pane[data-mode=work] .board-heading,#trace-pane[data-mode=work] .trace-head{display:none}
.running-cards{display:grid;gap:10px;align-content:start}
.running-header,.run-card-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
.running-header h2{font-size:17px;margin:3px 0}.running-header small,.run-card-finding{color:#516762}
.agent-run-card{display:grid;width:100%;text-align:left;gap:8px;padding:15px 16px;min-height:83px;background:#fff;border:1px solid #d0dcda;border-inline-start:4px solid #aebbb8;border-radius:10px;color:#20332f}
.agent-run-card:hover,.agent-run-card:focus-visible{border-color:#538977;box-shadow:0 2px 8px #29443815}
.agent-run-card[data-status="运行中"]{border-inline-start-color:#138064}.agent-run-card[data-status="失败"]{border-inline-start-color:#c24442}
.agent-run-card[data-status="已完成"]{border-inline-start-color:#497e6a}.run-status{font-size:12px;color:#4a6059}.agent-run-card[data-status="失败"] .run-status{color:#ab3837}
.run-card-task,.run-card-finding{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;overflow-wrap:anywhere}.run-card-task{font-size:14px;line-height:1.5}
#trace-pane .atlas .bc-verdict{color:#142e34}#trace-pane .atlas .bc-support{color:#415751}
#research-report .research-prose,#research-pages .research-prose{color:#20332f}
"""
for p in [app/'app/team.css',app/'app/research-report.css',base/'演示工具/feed.css']:p.write_text(p.read_text('utf-8')+skin,'utf-8')
# Reports are standalone exports with embedded graph code and dark overrides at the end of their CSS.
for p in base.glob('*-实跑报告.html'):
 s=p.read_text('utf-8');s=s.replace('</style>',skin+'</style>',1)
 a=s.find('<script>');b=s.find('const saved=',a)
 if a>=0 and b>a:s=s[:a]+recolor(s[a:b])+s[b:]
 p.write_text(s,'utf-8')
