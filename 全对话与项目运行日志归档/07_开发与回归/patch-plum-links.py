from pathlib import Path
import re
b=Path('work/plum-evidence');a=b/'天枢工作台/app'
def provenance(s):
 i=s.index('    function evidence(r)')
 s=s[:i]+'''    function provenance(r){
      const o=r.inputs?.length===1?observations.get(r.inputs[0]):null;
      const formula=o?.formula&&(!r.formula||r.formula===o.field)?o.formula:r.formula;
      if(r.claim)return {label:'分析推断'};
      if(formula&&(!o||formula!==o.field))return {label:'计算',formula,inputs:o?.formula===formula?o.inputs:r.inputs};
      return {label:'提取'};
    }
'''+s[i:]
 s=s.replace("el(b,'p',r.formula?'计算公式　'+r.formula:'来源披露或结构化观测');","const basis=provenance(r);el(b,'strong',basis.label,'basis-label');el(b,'p',basis.formula?'计算公式　'+basis.formula:basis.label==='提取'?'提取出处（文档、表或字段）':'关联依据');if(basis.formula&&!r.operands){for(const id of basis.inputs||[]){const o=observations.get(id);if(o&&Number.isFinite(o.value))el(b,'p',o.field+' = '+fmt(o.value)+' '+o.unit+'（'+(o.period||o.year)+'）');}el(b,'p','结果：'+display(r));}")
 s=s.replace("r.claim?'结论':r.formula?'计算':'披露'","provenance(r).label").replace("r.claim?'infer':r.formula?'calc':'direct'","r.claim?'infer':provenance(r).formula?'calc':'direct'").replace("if(r.formula)el(tip,'div',r.formula);","if(provenance(r).formula)el(tip,'div','公式 · '+provenance(r).formula);").replace("if(r.formula&&!r.operands&&!r.claim)","if(provenance(r).formula&&!r.operands&&!r.claim)")
 s=s.replace("      el(panel,'h3',report.question);","      evidencePages.nav(panel,report,report.ledger,report.target,report.snapshot,report.asOf);\n      el(panel,'h3',report.question);")
 return s
p=a/'research-report.js';p.write_text(provenance(p.read_text('utf-8')),'utf-8')
p=a/'index.html';p.write_text(p.read_text('utf-8').replace('<script src="research-board.js">','<script src="evidence-pages.js"></script><script src="research-board.js">'),'utf-8')
p=a.parent/'server.mjs';p.write_text(p.read_text('utf-8').replace("'research-board.js',","'evidence-pages.js','research-board.js',"),'utf-8')
p=a/'research-board.js';s=p.read_text('utf-8');s=s.replace("g.append(spine);const box=el('div','overview-page');box.append(g);","g.append(spine);const box=el('div','overview-page');box.append(g);if(s.verifiedLedger)evidencePages.nav(box,s.verifiedLedger,s.verifiedLedger,s.plan?.target,s.snapshot,s.asOf);");p.write_text(s,'utf-8')
p=b/'演示工具/生成演示.py';s=p.read_text('utf-8').replace("'__BOARD__': board,","'__BOARD__': read(APP/'evidence-pages.js')+'\\n'+board,");p.write_text(s,'utf-8')
css="""
.evidence-page-links{display:flex;flex-wrap:wrap;gap:14px;margin:4px 0;color:#79244d;font:600 12px/1.5 system-ui}
.evidence-page-links a,.evidence-page-links a:visited{color:#81234e;text-underline-offset:3px}
.atlas .board-card.corner,.agent-run-card{background:linear-gradient(123deg,#fff 5%,#fff5f5 58%,#f1dbe9 100%);border-color:#c59cad}
.atlas .corner:nth-child(even){background:linear-gradient(123deg,#fff 5%,#fcf4fb 56%,#e9cfe4 100%)}
#board-modes .mode-switch-frame button[aria-pressed=true],#research-report .primary,#research-source .primary{background:linear-gradient(108deg,#ad294a,#722452);color:white;border-color:#852744}
#research-report .bars b{background:linear-gradient(90deg,#dc879b,#a82d55 62%,#782951)}
#research-report .report-kpis button{background:linear-gradient(140deg,#fff,#f7e4ec);border:1px solid #d1a3b7}
#research-source .basis-label{color:#81234e}.overview-page .evidence-page-links{margin:2px 0}
"""
for p in [a/'team.css',a/'research-report.css',b/'演示工具/feed.css']:p.write_text(p.read_text('utf-8')+css,'utf-8')
helper=(a/'evidence-pages.js').read_text('utf-8-sig')
for p in b.glob('*-实跑报告.html'):
 s=p.read_text('utf-8');start=s.index('window.researchReport=');end=s.index('const saved=',start)
 s=s[:start]+helper+'\n'+provenance(s[start:end])+s[end:]
 p.write_text(s.replace('</style>',css+'</style>',1),'utf-8')
