from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from shutil import copytree, copy2
from tempfile import mkdtemp
from hashlib import sha256
import re,json
out=Path('outputs'); old=Path('work/dist1915'); base=Path(mkdtemp(prefix='team-handoff-',dir='work'))
for d in ['实跑核验','原始资料','证据原件','演示','工具']:copytree(old/d, base/d)
app=base/'天枢工作台'
copytree(out/'Tianshu-Team',app)
with ZipFile(out/'Tianshu-Team.zip') as z:
 for n in z.namelist():
  if not n.endswith('/'):assert z.read(n)==(app/n.replace(chr(92),'/')).read_bytes(),n
read=(out/'README.md').read_text('utf-8-sig')
read=read.replace('「实时对话版」','「独立代理团队版」').replace('完整解压 ZIP，保留目录结构。','完整解压 ZIP，保留目录结构。优先双击根目录 START.cmd。').replace('端口被占用时，在 PowerShell 中设置','端口被占用时自动顺延，最多尝试后续20个端口，以启动窗口显示的地址为准。也可在 PowerShell 中设置').replace('刷新前先下载台账或导出图谱。','刷新前可导出图谱；计算台账保存在内存，实跑核验目录提供已归档的台账。').replace('主对话、下载台账和本轮生成的图谱','主对话、对应代理工作区和本轮生成的图谱').replace('追问读取当前会话的范围、台账摘要和团队回报。','天枢追问读取当前会话的范围、角色状态及正式交接的团队回报。')
idx=read.index('| 实现位置')
read=read[:idx]+'''### 独立代理如何协作

- **给谁发消息。** 主区显示天枢时，由天枢接收问题、判定标的、派单或修订范围。点右栏角色卡进入其工作区，输入框显示收件角色。发送时锁定收件人；返回天枢或切换会话后，原回复仍留在对应角色。
- **角色持有什么。** 每个角色使用同一服务商配置、各自的系统提示词和任务输入，独立调用模型。角色可访问自己的任务卡、所需内核结果、工作日志、专业分析及该角色的直接对话。已有私聊在角色发起工作请求时截取，同一角色的直接问题顺序处理。新一轮改派会重置本轮角色记录及直接对话。
- **交接哪些内容。** 每份正式团队回报包含角色、收件人、任务标识和研究产物。角色收到完整回报后，将 agent_analysis 留在角色工作区，将 summary 与其余约定产物发给天枢。风险角色接收前序正式回报。用户可点击“将此回复回报天枢”单独转发一条直接回复。完整角色私聊及私有工作日志不随正式回报自动转交。程序共享台账、模型上下文与界面展示是三种不同范围；这些工作区属于同一个本地浏览器会话。
- **失败如何处理。** 对 plan、steer、extract、work 的结构化输出先解析再检查必填字段；针对无效 JSON、缺字段、流截断或长度限制，沿用原任务输入补试最多两次，最多三次尝试。成功后交接一次；取消或改派终止旧轮重试。鉴权失败应在设置中修订配置。
- **队友从哪里改。** 改角色能力先看 prompts.md 及 server.mjs 中各动作的附加指令；改可计算指标核对 metrics.mjs 与指标字段字典；改来源回到 disclosures.mjs、kernel.mjs 和证据原件；改角色路由、可见性或回报协议，同时运行包内浏览器回归。工作记录采用常开白字进度行，结构化字段由程序消费。

'''+read[idx:]
read=read.replace('覆盖路由、插话、公开摘要首末行','覆盖定向投递、私有分析与正式回报隔离、自动重试、路由、插话、公开摘要首末行')
(base/'README.md').write_text(read,'utf-8')
(base/'START.cmd').write_bytes(b'@echo off\r\nfor /d %%D in ("%~dp0*") do if exist "%%~fD\\server.mjs" if exist "%%~fD\\START.cmd" (\r\n  call "%%~fD\\START.cmd"\r\n  exit /b\r\n)\r\necho Please extract the entire archive before starting.\r\npause\r\nexit /b 1\r\n')
p=app/'指标接口说明.md';s=p.read_text('utf-8-sig').replace('下载按钮提供','内核返回').replace('下载台账可以','随包实跑台账可以');p.write_text(s,'utf-8')
p=base/'工具/verify-stream.mjs';s=Path('work/test-independent.mjs').read_text('utf-8-sig').replace('outputs/Tianshu-Team','天枢工作台').replace('work/lithium-graph.json','演示/lithium-graph.json').replace('outputs/锂电产业链图谱.html','演示/锂电产业链图谱.html')
p.write_text(s,'utf-8')
for link in re.findall(r'\]\(([^)]+)\)',read):
 if '://' not in link: assert (base/link).exists(),link
files=sorted(p for p in base.rglob('*') if p.is_file())
(base/'SHA256SUMS.txt').write_text(''.join(f'{sha256(p.read_bytes()).hexdigest()}  {p.relative_to(base).as_posix()}\n' for p in files),'utf-8')
pack=out/'Tianshu-Team-Collaboration.zip'
with ZipFile(pack,'w',ZIP_DEFLATED) as z:
 for p in [*files,base/'SHA256SUMS.txt']:z.write(p,p.relative_to(base).as_posix())
check=Path(mkdtemp(prefix='team-unpacked-',dir='work'))
with ZipFile(pack) as z:
 assert z.testzip() is None
 z.extractall(check)
for l in (check/'SHA256SUMS.txt').read_text('utf-8').splitlines():
 h,n=l.split('  ',1);assert sha256((check/n).read_bytes()).hexdigest()==h,n
copy2(check/'README.md',out/'独立代理团队版-协作说明.md')
Path('work/team-collab-check.txt').write_text(str(check.resolve()),'utf-8')
print(len(files)+1,pack.stat().st_size)
