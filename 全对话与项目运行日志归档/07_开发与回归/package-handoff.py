from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
from hashlib import sha256
from shutil import copy2
import json,tempfile
root=Path.cwd(); out=root/'outputs'; work=root/'work'
base=Path(tempfile.mkdtemp(prefix='交接-',dir=work))
def copy(src,dest):
 p=base/dest;p.parent.mkdir(parents=True,exist_ok=True);copy2(src,p)
with ZipFile(out/'天枢工作台-实时对话版.zip') as z:
 for info in z.infolist():
  name=info.filename.replace(chr(92),'/')
  if name.startswith('天枢工作台/'):
   p=out/name
   assert z.read(info)==p.read_bytes(),name
   copy(p,name)
copy(out/'README.md','README.md')
src=Path('D:/wechat/xwechat_files/wxid_lkpn3k6cex7v22_56d9/msg/file/2026-11')
for srcfile in ('企业行业核心指标筛选表.md','交付-工行黑客松-命题二-20261121-1520.zip'):copy(src/srcfile,'原始资料/'+srcfile)
copy(out/'天枢研究助手提示词包.md','原始资料/天枢研究助手提示词包（首版）.md')
for n in ('catl','catl24','cabia'):
 for e in ('pdf','txt'):copy(work/f'{n}.{e}',f'证据原件/{n}.{e}')
copy(work/'nbs.html','证据原件/nbs.html')
for prefix in ('before','final','tools'):
 for role in ('IND','FIN'):copy(work/f'{prefix}-{role}.json',f'实跑核验/{prefix}-{role}.json')
copy(out/'行业与企业取数复核.md','实跑核验/行业与企业取数复核.md')
copy(out/'锂电产业链图谱.html','演示/锂电产业链图谱.html')
copy(work/'lithium-graph.json','演示/lithium-graph.json')
for f in ['verify-stream.mjs','generate-graph.mjs','build-source-snapshot.mjs']:
 s=(work/f).read_text('utf-8-sig').replace('outputs/天枢工作台','天枢工作台').replace('outputs/锂电产业链图谱','演示/锂电产业链图谱').replace('work/lithium-graph','演示/lithium-graph').replace('work/final-','实跑核验/final-').replace('work/catl.txt','证据原件/catl.txt').replace('work/cabia.txt','证据原件/cabia.txt').replace("'work/'+n+'.pdf'","'证据原件/'+n+'.pdf'").replace("resolve('work/browser-')","resolve(tmpdir(),'tianshu-test-')").replace("spawn('C:/Program Files/Google/Chrome/Application/chrome.exe'","spawn(process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'")
 if f=='verify-stream.mjs':s="import {tmpdir} from 'node:os';\n"+s
 d=base/'工具';d.mkdir(exist_ok=True);(d/f).write_text(s,'utf-8')
files=sorted(p for p in base.rglob('*') if p.is_file())
(base/'SHA256SUMS.txt').write_text(''.join(f'{sha256(p.read_bytes()).hexdigest()}  {p.relative_to(base).as_posix()}\n' for p in files),'utf-8')
package=out/'天枢工作台-完整项目交接包.zip'
with ZipFile(package,'w',ZIP_DEFLATED,compresslevel=6) as z:
 for p in [*files,base/'SHA256SUMS.txt']:z.write(p,p.relative_to(base).as_posix())
with ZipFile(package) as z:
 assert z.testzip() is None
 for p in files: assert sha256(z.read(p.relative_to(base).as_posix())).digest()==sha256(p.read_bytes()).digest()
 assert z.read('README.md')==(out/'README.md').read_bytes()
print(str(base))
print(len(files)+1,package.stat().st_size)
(work/'last-package-stage.txt').write_text(str(base),'utf-8')
