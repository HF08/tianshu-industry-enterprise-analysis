from pathlib import Path
import re
root=Path('work/editorial');app=root/'天枢工作台/app'
dark="""
:root{color-scheme:dark;--bg:#160f12;--sb:#21151b;--dlg:#251820;--pane:#1b1117;--text:#f6e8e7;--tx:#f6e8e7;--tx2:#ddc5ca;--tx3:#b5969d;--line:#5b3543;--field-line:#704451;--accent:#d65a72;--link:#e3a1ba}
html,body,.app,.sidebar,.main,.main-body,.topbar,.workspace,.composer,.composer-dock,.agent-view,.studio-bar,.replay-chat,.feed-scroll,.board-layout,#board-rail,#board-modes,.player,.trace-head,.st-bar,.board-heading{background-color:#160f12;color:#f6e8e7}
#trace-pane{--bg:#1b1117;--text:#f6e8e7;--muted:#c0a5ad;--green:#d65a72;background:#1b1117;color:#f6e8e7}
#trace-pane .overview-page .bc-verdict{color:#fff1ef}.trace-head,.board-heading{color:#f7e9e8}
#trace-pane .overview-page .bc-support{color:#d2b8bd}
#board-modes .mode-switch-frame{background:#25141c;border-color:#9c5269}
#board-modes .mode-switch-frame button{color:#dbbdc4}
#board-modes .mode-switch-frame button[aria-pressed=true]{background:linear-gradient(105deg,#8d233c,#63204f);color:#fff3f1;border-color:#dc7a91}
.agent-run-card[data-status="运行中"]{border-inline-start-color:#e0536d}.agent-run-card[data-status="已完成"]{border-inline-start-color:#bc6ba1}.agent-run-card[data-status="失败"]{border-inline-start-color:#ff526c}
.agent-run-card{background:linear-gradient(120deg,#27151d,#211521);border-color:#754454;color:#f7e9e8}
#research-report[open],#research-source[open],#research-pages,#proof-body,#research-report header,#research-source header{background:#21151d;color:#f5e7e7}
#research-report .report-notice{background:#3b1d28;border-color:#9e4d64;color:#efb5c0}
#research-report .report-section h3{color:#f7e7e7}
#research-report .report-kpis button{background:linear-gradient(130deg,#2b1720,#3a1d2c);border-color:#754454;color:#f7e9e8}
#research-report .research-prose{color:#ead7da}
#research-report .bars i{background:#3b2730}#research-report .bars b{background:linear-gradient(90deg,#e68095,#b13765 60%,#74305c)}
#research-report a,.evidence-page-links a{color:#eeb0c3}
#research-report .metric-link{text-decoration-color:#c97991}
#research-report .report-citation-status{color:#e59aad}
#research-report .report-replies{background:#2a1720;border-color:#744353}
#research-report .report-tip,.rf-menu{background:#2b1921;color:#fae6e8;border-color:#805160}
.role-basis{background:linear-gradient(110deg,#2b171f,#351b2c);border-inline-start-color:#d06d8d}
.chain-study,.chain-lanes section,.chain-info{background:#21151d;color:#f5e7e7;border-color:#704555}
.chain-study button,.chain-study select{background:#2b1a22;color:#f9e9eb;border-color:#825466}
"""
for p in [*app.glob('*.css'),*(root/'演示工具').glob('*.css')]:
 p.write_text(p.read_text('utf-8')+dark,'utf-8')
for p in [app/'index.html',*root.glob('*-实跑报告.html'),root/'演示工具/player.html']:
 s=p.read_text('utf-8-sig').replace('color-scheme:light','color-scheme:dark').replace('color-scheme: light','color-scheme: dark')
 s=re.sub(r'(<style[^>]*>)(.*?)(</style>)',lambda m:m[1]+dark+m[3],s,flags=re.S)
 p.write_text(s,'utf-8')
for p in [app/'research-board.js',app/'chain-map.js',app/'supply-network.js',app/'telemetry.js']:
 p.write_text(p.read_text('utf-8')+'''\n/* Warm red/plum dark mode tokens are supplied by host CSS. */\n''','utf-8')
