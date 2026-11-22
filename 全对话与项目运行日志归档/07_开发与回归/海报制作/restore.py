from pathlib import Path
import re,shutil
d=Path('work/poster/restored');a=d/'天枢工作台/app';n=Path('work/night-industry');na=n/'天枢工作台/app'
skin="""
:root{color-scheme:dark;--bg:#151517;--pane:#15212c;--sb:#1b1b1c;--dlg:#212123;--tx:#e8e8e8;--text:#ecf4f7;--muted:#a6bbc4;--link:#97b9ff;--accent:#4d6bfe;--series-2:#70d8c9;--series-3:#bba6ff;--series-4:#f6be76;--series-5:#8fb7ff;--series-6:#81c1b0}
body{background:var(--bg);color:var(--tx,var(--text))}
.running-cards{display:grid;gap:9px;padding:12px;align-content:start}.running-header,.run-card-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.running-header h2{font-size:16px;margin:0}
.agent-run-card{display:grid;width:100%;gap:6px;padding:12px 14px;text-align:left;border:1px solid #3a5259;border-left:3px solid #71908f;border-radius:9px;background:#18272d;color:#dfeaea}.agent-run-card[data-status="运行中"]{border-left-color:#70d8c9}.agent-run-card[data-status="已完成"]{border-left-color:#77b9a0}.agent-run-card[data-status="失败"]{border-left-color:#ed7470}.run-card-task,.run-card-finding{font-size:12px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.run-status,.run-card-finding{color:#acd0cf}
#trace-pane[data-mode=work] #trace-scroll{overflow:auto}.evidence-page-links{display:flex;gap:14px;margin:6px 0;font-size:12px}.evidence-page-links a,.evidence-page-links a:visited{color:#9cc9ef}.role-basis{border-left:2px solid #70d8c9;padding:6px 12px}.role-basis>*{display:block}
#research-report[open]{position:fixed;inset:auto 8px auto 8px;margin:0 auto;z-index:55;max-height:none;width:calc(100% - 16px);background:#1b1b1c}.report-replies{overflow:auto;max-height:22vh;padding:10px 24px;border-top:1px solid #44585d}
"""
for rel in ['天枢工作台/app/team.css','天枢工作台/app/research-report.css','演示工具/feed.css','演示工具/final-board.css','演示工具/player.css','演示工具/source.css','演示工具/standalone.css']:
 (d/rel).write_text((n/rel).read_text('utf-8-sig')+skin,'utf-8')
p=a/'index.html';s=p.read_text('utf-8-sig');style=re.search(r'<style>.*?</style>',(na/'index.html').read_text('utf-8-sig'),re.S)[0];s=re.sub(r'<style>.*?</style>',lambda _:style,s,count=1,flags=re.S).replace('color-scheme" content="light','color-scheme" content="dark');p.write_text(s,'utf-8')
for f in ['supply-network.js','chain-map.js','telemetry.js']:shutil.copy2(na/f,a/f)
p=a/'research-board.js';s=p.read_text('utf-8-sig');s=re.sub(r'const colors=\[[^\]]*\]',"const colors=['#70d8c9','#bba6ff','#f6be76','#caaf78','#8fb7ff','#9cd8b1']",s);p.write_text(s.replace('#91737a','#6e8087').replace('#3b262b','#c5d5d8'),'utf-8')
p=d/'演示工具/player.html';s=p.read_text('utf-8-sig').replace('content="light"','content="dark"');p.write_text(s,'utf-8')
for p in d.glob('*-实跑报告.html'):
 s=p.read_text('utf-8-sig');s=re.sub(r'<style>.*?</style>',lambda _:style[:-8]+(a/'research-report.css').read_text('utf-8')+skin+'#research-report[open]{inset:3vh 2vw;height:94vh;margin:auto}#report-version,#report-update{display:none}</style>',s,count=1,flags=re.S);p.write_text(s,'utf-8')
