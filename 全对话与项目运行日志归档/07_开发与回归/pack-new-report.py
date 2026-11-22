from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
from hashlib import sha256
base=Path('work/new-report-base/天枢团队审查包')
files=sorted(p for p in base.rglob('*') if p.is_file());dest=Path('outputs/Tianshu-NewBuild-Research.zip')
import re
with ZipFile(dest,'w',ZIP_DEFLATED,compresslevel=6) as z:
 for p in files:
  data=p.read_bytes()
  if p.suffix.lower() in {'.md','.html','.js','.mjs','.json','.py'}: assert not re.search(rb'sk-[a-zA-Z0-9]{24,}',data),p.name
  z.write(p,p.relative_to(base).as_posix())
with ZipFile(dest) as z:
 assert z.testzip() is None
 for p in files: assert sha256(z.read(p.relative_to(base).as_posix())).digest()==sha256(p.read_bytes()).digest()
print(len(files),dest.stat().st_size)
