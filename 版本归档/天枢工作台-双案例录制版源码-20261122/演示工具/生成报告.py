"""使用随包留档、工作台样式及交互组件重建三份离线报告。仅需 Python 3 标准库。"""
import hashlib
import json
import re
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / '天枢工作台' / 'app'


def read(path):
    return path.read_text(encoding='utf-8-sig')


def build():
    index = read(APP / 'index.html')
    dialogs = ''.join(re.findall(r'<dialog id="research-(?:report|source)".*?</dialog>', index, re.S))
    if 'id="proof-body"' not in dialogs or 'id="research-pages"' not in dialogs:
        raise ValueError('工作台页面缺少报告或来源面板')
    styles = '\n'.join((re.search(r'<style>(.*?)</style>', index, re.S)[1], read(APP/'team.css'), read(APP/'research-report.css')))
    scripts = '\n'.join(read(APP/name) for name in ('chain-map.js','supply-network.js','evidence-pages.js','report-export.js','research-report.js')).replace('</script', r'<\/script')
    pdf_hash = hashlib.sha256((ROOT/'案例'/'cabia.pdf').read_bytes()).hexdigest()
    for case in sorted((ROOT/'案例').glob('*-实跑报告.json')):
        report = json.loads(read(case))
        data = json.dumps(report, ensure_ascii=False, separators=(',', ':')).replace('<', r'\u003c')
        title = escape(report['target'])+'研究报告'
        html = f'''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title}</title><style>{styles}
.case-home{{margin:12vh auto;max-width:720px;padding:24px}}.case-home button{{padding:8px 16px;border:1px solid #62656c;border-radius:8px}}</style></head>
<body><main class="case-home"><h1>{title}</h1><button id="report-toggle"><span id="report-toggle-label">展开报告</span></button></main>{dialogs}
<script>{scripts}</script><script id="case-data" type="application/json">{data}</script>
<script>const saved=JSON.parse(document.getElementById('case-data').textContent);
saved.rows=researchReport.catalogue(saved.ledger,saved.competition);saved.failures||=[];
const local={{reports:[saved],phase:'done',citations:[]}};
const reader=researchReport.bind(()=>local,{{offline:true,localPdfHash:'{pdf_hash}'}});
reader.sync();document.getElementById('report-toggle').click();</script></body></html>'''
        target = ROOT / case.with_suffix('.html').name
        target.write_bytes(html.encode('utf-8'))
        print('已生成',target.name)


if __name__ == '__main__':
    build()

