from pathlib import Path
p=Path('work/new-report-base/天枢团队审查包/天枢工作台/app/team.js')
s=p.read_text('utf-8')
s=s.replace("out.result=report.written.conclusions.map(x=>x.text).join('\\n')","const byId=new Map(report.rows.map(r=>[r.id,r]));\n    const prose=text=>String(text||'').replace(/\\{\\{(D\\d+)\\}\\}/g,(_,id)=>{const r=byId.get(id);return r?String(r.unit==='元'?Number((r.value/1e8).toFixed(2)):r.value)+' '+(r.unit==='元'?'亿元':r.unit||''):'待核实';});\n    const risks=report.written.risks.map(x=>({...x,text:prose(x.text),counter:prose(x.counter)}));\n    out.result=report.written.conclusions.map(x=>prose(x.text)).join('\\n')")
s=s.replace('risk_findings:report.written.risks','risk_findings:risks');p.write_text(s,'utf-8')
