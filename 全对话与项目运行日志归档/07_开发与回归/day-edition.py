from pathlib import Path
import re,colorsys
base=Path('work/day-preview');app=base/'天枢工作台'
def palette(m):
 h=m[0][1:]
 if len(h) in (3,4):h=''.join(x+x for x in h)
 r,g,b=[int(h[i:i+2],16)/255 for i in (0,2,4)]
 hue,l,s=colorsys.rgb_to_hls(r,g,b)
 # Preserve the semantic hue of roles while reversing surface/text contrast.
 nl=1-l if l<.38 else max(.13,min(.51,1-l))
 if l<.20:nl=.992-.72*l
 if s>.25 and l>.45:nl=min(nl,.35)
 rgb=colorsys.hls_to_rgb(hue,nl,min(s,.60) if l<.38 else min(.82,s*1.15))
 return '#'+''.join(f'{round(v*255):02x}' for v in rgb)+h[6:]
def recolor(s):
 return re.sub(r'#[\da-fA-F]{8}\b|#[\da-fA-F]{6}\b|#[\da-fA-F]{4}\b|#[\da-fA-F]{3}\b',palette,s).replace('color-scheme:dark','color-scheme:light').replace('color-scheme: dark','color-scheme: light')
def css(s):
 s=recolor(s)
 return re.sub(r'rgba\(0,\s*0,\s*0,\s*\.(\d+)\)',lambda m:'rgba(22,43,56,'+str(round(float('.'+m[1])*.48,3))+')',s)
for p in [*(app/'app').glob('*.css'),*(base/'演示工具').glob('*.css')]:
 p.write_text(css(p.read_text('utf-8-sig')),'utf-8')
for name in ['research-board.js','chain-map.js','supply-network.js','telemetry.js']:
 p=app/'app'/name;p.write_text(recolor(p.read_text('utf-8-sig')),'utf-8')
for p in [app/'app/index.html',base/'演示工具/player.html',*base.glob('*-实跑报告.html')]:
 s=p.read_text('utf-8-sig').replace('name="color-scheme" content="dark"','name="color-scheme" content="light"')
 s=re.sub(r'(<style[^>]*>)(.*?)(</style>)',lambda m:m[1]+css(m[2])+m[3],s,flags=re.S)
 if p==app/'app/index.html':s=s.replace("app.api.config","tianshu.day.user-config").replace("config?.baseUrl || 'http://127.0.0.1:7891/v1'","config?.baseUrl || 'https://api.deepseek.com'").replace("config.model : 'dfmodel'","config.model : ''")
 p.write_text(s,'utf-8')
p=app/'app/team.js';p.write_text(p.read_text('utf-8-sig').replace('app.api.config','tianshu.day.user-config'),'utf-8')
tweaks="""
:root{color-scheme:light;--bg:#f6f8f7;--sb:#eaf0ee;--tx:#172e32;--tx2:#304950;--tx3:#51686d;--dlg:#fff;--text:#172e32;--muted:#4c6266}
#trace-pane{--bg:#f7faf8;--text:#173439;--muted:#4e6467;--green:#216652;background:#f7faf8;color:#173439}
#trace-pane .overview-page .bc-verdict{color:#142e34}
#trace-pane .overview-page .bc-support{color:#475d61}
#board-modes .mode-switch-frame{background:#e2ece8;border-color:#9ab5ac}
#board-modes .mode-switch-frame button{color:#415852}
#board-modes .mode-switch-frame button[aria-pressed=true]{background:#f9fffc;color:#124e3e;border-color:#49856d}
"""
for p in [app/'app/team.css',base/'演示工具/feed.css']:p.write_text(p.read_text('utf-8')+tweaks,'utf-8')
(base/'先读我.md').write_text('# 日间预览版\n\n双击「实机演示.html」即可离线观看，不用安装 Node.js 或填写 API Key。可以拖动时间轴，进入调查全览或研究分册，打开随案证据。根目录另有两份可直接阅读的实跑报告。\n\n如需创建新研究，请使用 Windows、Node.js 22+，从「天枢工作台/START.cmd」启动，再自行配置模型地址、模型名及服务商要求的凭据。日间版使用独立的本机浏览器配置项，不读取旧版保存的连接信息。\n','utf-8')
