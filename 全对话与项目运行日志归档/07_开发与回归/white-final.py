from pathlib import Path
import re
root=Path('work/white-agents');app=root/'天枢工作台/app'
def strip(s):
 s=re.sub(r'<select id="report-version"[^>]*>.*?</select>','',s,flags=re.S,count=1)
 s=re.sub(r'<button id="report-update"[^>]*>.*?</button>','',s,flags=re.S,count=1)
 s=s.replace('function bind(session,onUpdate)','function bind(session)').replace(",versions=$('#report-version')","").replace('s.reports[Number(versions.value)]','s.reports.at(-1)').replace('s.reports[Number(versions.value)-1]','s.reports.at(-2)').replace('versions.onchange=draw;','')
 s=re.sub(r" *active=s;\$\('#report-update'\).*?\n",'',s)
 s=s.replace("versions.value=String(s.reports.length-1);",'')
 s=re.sub(r" *\$\('#report-update'\)\.onclick=.*?\n",'',s)
 return s
p=app/'research-report.js';p.write_text(strip(p.read_text('utf-8')),'utf-8')
p=app/'index.html';p.write_text(strip(p.read_text('utf-8')),'utf-8')
p=app/'team.js';s=p.read_text('utf-8');s=re.sub(r'const reports=window.researchReport.bind\(\(\)=>current,.*?;\}\);','const reports=window.researchReport.bind(()=>current);',s);p.write_text(s,'utf-8')
css="""
:is(#research-report,#research-source) :is(.research-prose,.analysis-limit,.finding-card,.signal-card,.stage-flow,#proof-body) button.metric-link,
:is(#research-report,#research-source) :is(.research-prose,.analysis-limit,.finding-card,.signal-card,.stage-flow,#proof-body) button.metric-link:is(:hover,:focus-visible,:active){
 border:0;border-radius:0;background:transparent;box-shadow:none;padding:0;margin:0;color:inherit;
 text-decoration:underline dashed #69827d;text-underline-offset:.22em;text-decoration-thickness:1px;
}
:is(#research-report,#research-source) button.metric-link:focus-visible{outline:0;text-decoration-thickness:2px;text-decoration-color:#185e51;color:#185e51}
"""
p=app/'research-report.css';p.write_text(p.read_text('utf-8')+css,'utf-8')
for p in root.glob('*-实跑报告.html'):
 s=p.read_text('utf-8');s=strip(s).replace('</style>',css+'</style>',1);p.write_text(s,'utf-8')
