from pathlib import Path
d=Path('work/editorial/天枢工作台')
p=d/'server.mjs';s=p.read_text('utf-8-sig');a=s.index("    if(action==='report')");b=s.index("    if(action==='plan')",a)
s=s[:a]+"    if(action==='report')system=await readFile(new URL('./report-writing.md',import.meta.url),'utf8');\n"+s[b:];p.write_text(s,'utf-8')
p=d/'app/research-report.js';s=p.read_text('utf-8');i=s.index("    return ['conclusions','risks']");s=s[:i]+"""    if(!Array.isArray(result?.conclusions)||!Array.isArray(result?.risks)||result.conclusions.length>4||result.risks.length>2)return false;
    if(new Set(result.conclusions.map(x=>x?.section)).size!==result.conclusions.length)return false;
    if(result.conclusions.some(x=>!['summary','performance','quality','credit'].includes(x?.section))||result.risks.some(x=>x?.section!=='risk'))return false;
    if([...result.conclusions,...result.risks].some(x=>typeof x.judgment!=='string'||!x.judgment.trim()||!Array.isArray(x.refs)||x.refs.length>5))return false;
"""+s[i:]
i=s.index('    function charts(');j=s.index('    function inline(',i);s=s[:i]+s[j:]
i=s.index('    function notes(');j=s.index('    const historyBox=',i)
s=s[:i]+"""    function draw(){
      dismiss();report=session().reports.at(-1);panel.replaceChildren();
      observations=new Map([...report.ledger.observations,...report.ledger.interim].map(o=>[o.id,o]));
      $('#live-report-title').textContent=report.target+'研究报告';
      $('#report-stamp').textContent=report.ledger.years.join('–').replace(/^(\\d{4}).*(\\d{4})$/,'$1—$2')+' · 资料截止 '+report.asOf.slice(0,10);
      el(panel,'p',report.question,'report-notice');
      const byId=new Map(report.rows.map(r=>[r.id,r]));
      const readable=(t)=>String(t||'').replace(/\\{\\{(D\\d+)\\}\\}/g,(_,id)=>byId.has(id)?display(byId.get(id)):'待核实');
      const sections=[['summary','摘要'],['performance','经营表现'],['quality','财务质量'],['risk','风险清单'],['credit','对授信的含义']];
      for(const [key,title] of sections){
        const area=section(title),items=key==='risk'?report.written.risks:report.written.conclusions.filter(x=>x.section===key);
        if(!items.length){el(area,'p',report.fallback?'报告代理未完成该节核验。':'本轮缺少可支持该项判断的证据。','analysis-limit');}
        for(const [i,x] of items.entries()){
          const refs=x.refs.map(id=>byId.get(id)).filter(Boolean);
          const p=el(area,'p',null,'research-prose');
          point(p,{id:key+i,claim:true,name:title+' · '+({I:'分析推断',C:'计算判断',F:'披露事实',M:'资料缺口'}[x.tag]||'分析判断'),value:readable(x.judgment),unit:'',year:report.asOf.slice(0,10),refs,counter:readable(x.counter),inputs:[...new Set(refs.flatMap(r=>r.inputs))]},readable(x.judgment));
          p.append(' ');inline(p,x.text,refs);if(x.counter){p.append(' ');inline(p,x.counter,refs);}
        }
        if(key==='credit'&&report.written.gaps.length)el(area,'p','待核实 · '+readable(report.written.gaps[0]),'analysis-limit');
      }
      evidencePages.nav(panel,report,report.ledger,report.target,report.snapshot,report.asOf);
    }
"""+s[j:]
s=s.replace("el(b,'h4',r.value);if(r.counter)","el(b,'h4',r.value);if(r.reason)el(b,'p',r.reason);if(r.counter)").replace("refs,counter:readable(x.counter)","refs,reason:readable(x.text),counter:readable(x.counter)")
p.write_text(s,'utf-8')
p=d/'app/team.js';s=p.read_text('utf-8').replace("map(x=>prose(x.text)).join","map(x=>prose([x.judgment,x.text].filter(Boolean).join(' '))).join").replace('已提供可核验的数据图表','请从来源网页核查本轮台账');p.write_text(s,'utf-8')
