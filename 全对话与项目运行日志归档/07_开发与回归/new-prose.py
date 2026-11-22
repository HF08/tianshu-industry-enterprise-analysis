from pathlib import Path
p=Path('work/new-report-base/天枢团队审查包/天枢工作台/app/research-report.js')
s=p.read_text('utf-8')
s=s.replace("    function point(parent,r,label){","    function point(parent,r,label){").replace("      btn.onfocus=preview;btn.onblur=hideTip;","      btn.onfocus=preview;btn.onblur=hideTip;\n      btn.oncontextmenu=e=>{e.preventDefault();btn.onclick(e);};\n      btn.onkeydown=e=>{if(e.key==='ContextMenu'||e.shiftKey&&e.key==='F10'){e.preventDefault();btn.click();}};")
s=s.replace("        if(doc?.locator)","        if(r.operands)el(tip,'div',r.operands);\n        if(r.formula&&!r.operands&&!r.claim){const values=r.inputs.map(id=>observations.get(id)).filter(o=>o&&typeof o.value==='number').slice(0,3);if(values.length)el(tip,'div',values.map(o=>o.field+' '+display(o)).join('；'));}\n        if(doc?.locator)")
a=s.index('    function notes(');b=s.index('    function draw(){',a)
s=s[:a]+'''    function inline(parent,text,refs){
      const allowed=new Map(refs.map(r=>[r.id,r]));
      const tokens=String(text||'').split(/(\\{\\{D\\d+\\}\\})/g);
      for(const token of tokens){
        if(/^\\{\\{D\\d+\\}\\}$/.test(token)){const r=allowed.get(token.slice(2,-2));if(r)point(parent,r,display(r));else parent.append('（依据待核）');}
        else parent.append(token.replace(/^[【][^】]{1,20}[】]/,''));
      }
    }
    function notes(title,items){
      const area=section(title);if(!items.length)el(area,'p','当前证据不足以形成有依据的判断。');
      for(const [i,x] of items.entries()){
        const refs=x.refs.map(id=>report.rows.find(r=>r.id===id)).filter(Boolean);
        const p=el(area,'p',null,'research-prose');inline(p,x.text,refs);
        if(!x.text.includes('{{')&&refs.length){p.append(' 依据：');refs.slice(0,2).forEach((r,j)=>{if(j)p.append('、');point(p,r,r.year+' 年'+r.name+' '+display(r));});}
        if(x.counter){const sub=el(area,'p',null,'analysis-limit');inline(sub,x.counter,refs);}
      }
    }
    function annualChange(parent,name){
      const list=report.rows.filter(r=>r.name===name&&Number.isInteger(r.year)&&typeof r.value==='number').sort((a,b)=>b.year-a.year);
      for(const now of list){
        const prev=list.find(r=>r.year===now.year-1&&r.dimension===now.dimension&&r.unit===now.unit);
        if(!prev)continue;
        const diff=now.value-prev.value,unit=now.unit==='%'?'个百分点':now.unit;
        const change={id:'delta-'+now.id,name:name+'年度变动',year:now.year,dimension:now.dimension,value:diff,unit,inputs:[...new Set([...now.inputs,...prev.inputs])],formula:'本期指标 − 上期同口径指标',operands:display(now)+' − '+display(prev)+' = '+display({value:diff,unit})};
        const line=el(parent,'p',null,'research-prose');line.append((now.dimension||report.target)+'的'+name+'由 '+prev.year+' 年的');point(line,prev,display(prev));line.append('变为 '+now.year+' 年的');point(line,now,display(now));line.append('，较上年'+(diff>=0?'增加':'减少'));point(line,change,display({value:Math.abs(diff),unit}));line.append('。');break;
      }
    }
'''+s[b:]
s=s.replace("      const tiles=el(panel", """      notes('研究结论及依据',report.written.conclusions);
      const change=section('经营变化与计算依据');
      for(const name of company?['营业收入','归母净利润','经营现金流']:['销量','装车量','CR5'])annualChange(change,name);
      if(change.children.length===1)el(change,'p','缺少连续两期可比数据。');
      const tiles=el(panel""").replace("      notes('研究结论及依据',report.written.conclusions);\n      charts","      charts")
s=s.replace("el(b,'p',r.formula?'计算公式　'+r.formula:'来源披露或结构化观测');","el(b,'p',r.formula?'计算公式　'+r.formula:'来源披露或结构化观测');if(r.operands)el(b,'p',r.operands);")
s=s.replace('点击可引用或查看来源。','右击可引用或查看来源，触屏可轻点。')
s=s.replace("refs.every(id=>ids.has(id))","refs.every(id=>ids.has(id))&&[...((x.text||'')+' '+(x.counter||'')).matchAll(/\\{\\{(D\\d+)\\}\\}/g)].every(m=>x.refs.includes(m[1]))")
p.write_text(s,'utf-8')
