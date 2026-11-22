from pathlib import Path
import re, colorsys
base=Path('work/warm-plum');app=base/'天枢工作台/app'
# Use the pre-red hues as semantic series identities. All rendered chromatic
# values pass through one warm red / plum mapping, including translucent paints.
hexpat=r'#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{4}\b|#[0-9a-fA-F]{3}\b'
def recolor(m):
 h=m[0][1:];h=''.join(c*2 for c in h) if len(h)<5 else h
 rgb=[int(h[i:i+2],16)/255 for i in (0,2,4)]
 hue,l,s=colorsys.rgb_to_hls(*rgb)
 if max(rgb)==min(rgb):return m[0]
 angle=hue*360
 dest= (346 if angle<65 or angle>=340 else 317 if angle<170 else 321 if angle<275 else 310)
 if l>.8:s=min(s,.43)
 result=colorsys.hls_to_rgb(dest/360,l,s)
 return '#'+''.join(f'{round(v*255):02x}' for v in result)+h[6:]
def paints(s):
 s=re.sub(hexpat,recolor,s)
 def rgba(m):
  vals=list(map(int,m.groups()[1:4]));color=recolor(re.match('.+','#'+''.join('%02x'%x for x in vals)))
  return m[1]+'('+','.join(str(int(color[i:i+2],16)) for i in (1,3,5))+m[5]+')'
 s=re.sub(r'\b(rgb|rgba)\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(\s*(?:,[.\d\s]+)?)\)',rgba,s)
 return s.replace('[350,6,335,16,355]','[346,313,355,326,339]').replace('LinkText','#883060')
theme="""
:root{color-scheme:light;accent-color:#a83250;--accent:#a83250;--link:#85305e;--series-2:#a72f4d;--series-3:#80346e;--series-4:#ce5062;--series-5:#ad5988;--series-6:#73243c;--green:#a83250}
:focus-visible{outline-color:#923764}::selection{background:#f1d3e4;color:#42182c}
a,a:visited{color:#85305e}
.agent-run-card[data-status="运行中"]{border-inline-start-color:#a42f4b}.agent-run-card[data-status="已完成"]{border-inline-start-color:#893766}.agent-run-card[data-status="失败"]{border-inline-start-color:#bd233e}
#board-modes .mode-switch-frame{border-color:#d8adbf;background:#fbf0f4}
#board-modes .mode-switch-frame button[aria-pressed=true]{background:#f2d9e5;color:#652044;border-color:#a9537c}
"""
def transform(p):
 s=p.read_text('utf-8-sig')
 if p.suffix=='.html':
  s=re.sub(r'(<style[^>]*>)(.*?)(</style>)',lambda m:m[1]+paints(m[2])+theme+m[3],s,flags=re.S)
  if p.name=='index.html':s=re.sub(r'(<script>)(.*?)(</script>)',lambda m:m[1]+paints(m[2])+m[3],s,flags=re.S)
  else:
   a=s.find('<script>');b=s.find('const saved=',a)
   if b>a>=0:s=s[:a]+paints(s[a:b])+s[b:]
 elif p.suffix=='.js':s=paints(s)
 else:s=paints(s)
 p.write_text(s,'utf-8')
for p in [*app.glob('*.css'),*(base/'演示工具').glob('*.css'),*[app/n for n in ['research-board.js','chain-map.js','supply-network.js','telemetry.js']],app/'index.html',*base.glob('*-实跑报告.html')]:transform(p)
for p in [app/'team.css',app/'research-report.css',base/'演示工具/feed.css']:
 p.write_text(p.read_text('utf-8')+theme,'utf-8')
p=app/'research-board.js';s=p.read_text('utf-8');s=re.sub(r'const colors=\[[^\]]+\]',"const colors=['#a72f4d','#80346e','#ce5062','#ad5988','#73243c','#943851']",s);p.write_text(s,'utf-8')
p=app/'chain-map.js';s=p.read_text('utf-8').replace('  :host{','  :host{--link:#85305e;--series-2:#a72f4d;--series-3:#80346e;--series-4:#ce5062;--series-5:#ad5988;--series-6:#73243c;');p.write_text(s,'utf-8')

