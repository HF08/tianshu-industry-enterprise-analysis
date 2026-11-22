// 报告导出：Markdown 与 A4 打印版共用一个文档模型，两种格式的正文、表格与编号完全一致
window.reportExport=(()=>{
  const VERSION='1.0';
  const EMPTY_TEXT='本轮缺少可支持该项判断的证据。';
  const F10_TABLES={GINCOME:'合并利润表',GINCOMEQ:'合并利润表',GBALANCE:'合并资产负债表',GBALANCEQ:'合并资产负债表',GCASHFLOW:'合并现金流量表',GCASHFLOWQ:'合并现金流量表',MAINOP:'主营业务构成'};
  // 与报告弹窗卡片相同的指标挑选顺序
  const CARD_NAMES={
    performance:['营业收入','营业收入同比','营收同比','毛利率','归母净利润'],
    quality:['经营现金流','经营活动现金流净额','经营现金流与净利润比','现金流与净利润之比','应收账款','应收账款同比','应收账款增速','ROE','ROE（平均归母权益）','资产负债率','存货周转天数','DSO','CCC']
  };
  function fmt(n){return typeof n==='number'?n.toLocaleString('zh-CN',{maximumFractionDigits:2}):String(n);}
  function display(r){return r.unit==='元'?fmt(r.value/1e8)+' 亿元':fmt(r.value)+' '+(r.unit||'');}
  function plainText(value){const text=String(value==null?'':value).trim();return text&&!/RPT_/i.test(text)?text:'';}
  function f10Label(value){
    const code=String(value||'').trim().match(/RPT_(?:F10|DMSK)_(?:FINANCE|FN)_([A-Z0-9_]+)/i)?.[1]?.toUpperCase();
    return code?F10_TABLES[code]||'':'';
  }
  const yearOf=r=>{const n=Number(String(r.year??'').slice(0,4));return Number.isFinite(n)?n:0;};
  const metricRank=(name,names)=>{const exact=names.indexOf(name);if(exact>=0)return exact;const part=names.findIndex(n=>String(name||'').includes(n));return part<0?names.length:part;};
  const latestByName=rows=>{const unique=new Map();for(const r of rows){const prev=unique.get(r.name);if(!prev||yearOf(r)>yearOf(prev))unique.set(r.name,r);}return[...unique.values()];};
  // 各节指标卡所用的数据行：先取结论引用，再用本节指标名补齐，最多四条
  function sectionMetrics(report,key){
    const names=CARD_NAMES[key];
    if(!names)return [];
    const rows=Array.isArray(report.rows)?report.rows:[];
    const byId=new Map(rows.map(r=>[r.id,r]));
    const conclusion=(report.written?.conclusions||[]).find(x=>x.section===key);
    const refs=(conclusion?.refs||[]).map(id=>byId.get(id)).filter(Boolean);
    const picked=latestByName(refs).sort((a,b)=>metricRank(a.name,names)-metricRank(b.name,names)).slice(0,4);
    const seen=new Set(picked.map(r=>r.name)),pool=rows.filter(r=>!seen.has(r.name));
    for(const exact of [true,false]){
      for(const name of names){
        if(picked.length>=4)break;
        const hits=pool.filter(r=>(exact?r.name===name:String(r.name||'').includes(name))&&!seen.has(r.name));
        if(!hits.length)continue;
        const hit=latestByName(hits).sort((a,b)=>yearOf(b)-yearOf(a))[0];
        picked.push(hit);seen.add(hit.name);
      }
    }
    return picked.sort((a,b)=>metricRank(a.name,names)-metricRank(b.name,names));
  }
  function periodOf(report){
    const years=(report.ledger?.years||[]).filter(y=>Number.isFinite(Number(y))).map(String).sort();
    if(years.length>1)return years[0]+'—'+years[years.length-1];
    if(years.length===1)return years[0];
    return String(report.asOf||'').slice(0,4)||'未登记';
  }
  function formatTime(value){
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return String(value==null?'':value)||'未登记';
    const pad=n=>String(n).padStart(2,'0');
    return date.getFullYear()+'-'+pad(date.getMonth()+1)+'-'+pad(date.getDate())+' '+pad(date.getHours())+':'+pad(date.getMinutes());
  }
  function compose(report,meta){
    const ledger=report.ledger||{};
    const rows=Array.isArray(report.rows)?report.rows:[];
    const byId=new Map(rows.map(r=>[r.id,r]));
    const observations=new Map();
    for(const item of [...(ledger.observations||[]),...(ledger.interim||[])])observations.set(item.id,item);
    const sources=ledger.sources||{};
    const written=report.written||{};
    const conclusions=Array.isArray(written.conclusions)?written.conclusions:[];
    const risks=Array.isArray(written.risks)?written.risks:[];
    const gaps=(Array.isArray(written.gaps)?written.gaps:[]).filter(Boolean);
    const retrieved=String(ledger.retrieved_at||'').slice(0,10);
    // 来源编号按正文首次引用顺序分配：先五节、后附录 A，附录 B 按同一编号列示
    const cited=[],rowSources=new Map();
    function sourcesOf(row){
      if(rowSources.has(row.id))return rowSources.get(row.id);
      const ids=[],seen=new Set();
      const visit=id=>{
        if(seen.has(id))return;
        seen.add(id);
        const item=observations.get(id);
        if(item?.source&&sources[item.source]&&!ids.includes(item.source))ids.push(item.source);
        for(const next of item?.inputs||[])visit(next);
      };
      for(const id of row.inputs||[])visit(id);
      rowSources.set(row.id,ids);
      return ids;
    }
    function cite(ids){
      const numbers=[];
      for(const id of ids){
        let index=cited.indexOf(id);
        if(index<0){cited.push(id);index=cited.length-1;}
        numbers.push(index+1);
      }
      return numbers;
    }
    const numbers=ids=>ids.map(n=>'['+n+']').join('');
    const sortedNumbers=ids=>numbers([...ids].sort((a,b)=>a-b));
    const citeRow=row=>numbers(cite(sourcesOf(row)));
    // 正文的 {{D1}} 代入数值，并在其后缀上来源编号
    function annotate(text){
      return String(text||'').split(/(\{\{D\d+\}\})/g).map(token=>{
        const match=/^\{\{(D\d+)\}\}$/.exec(token);
        if(!match)return token.replace(/^[【][^】]{1,20}[】]/,'');
        const row=byId.get(match[1]);
        if(!row)return '（依据待核）';
        return display(row).trim()+citeRow(row);
      }).join('').trim();
    }
    function proseBlocks(conclusion){
      if(!conclusion)return [{type:'p',text:EMPTY_TEXT}];
      const judgment=String(conclusion.judgment||'').trim(),text=String(conclusion.text||'').trim(),counter=String(conclusion.counter||'').trim();
      if(!judgment&&!text&&!counter)return [{type:'p',text:EMPTY_TEXT}];
      const blocks=[];
      if(judgment)blocks.push({type:'p',label:'判断',text:annotate(judgment)});
      if(text)blocks.push({type:'p',text:annotate(text)});
      if(counter)blocks.push({type:'p',label:'反证',text:annotate(counter)});
      return blocks;
    }
    function metricBlocks(key,label){
      const picked=sectionMetrics(report,key);
      if(!picked.length)return [{type:'p',text:'本轮缺少'+label+'指标：报告未引用该节可展示的数据点。'}];
      return [{type:'table',columns:[
        {label:'指标',width:22},{label:'数值',align:'right',width:12},{label:'期间',width:8},{label:'口径',width:12},{label:'公式',width:38},{label:'来源',width:8}
      ],rows:picked.map(row=>[row.name||'—',display(row).trim()||'—',String(row.year??'—'),plainText(row.dimension)||'—',String(row.formula||'').trim()||'—',citeRow(row)||'—'])}];
    }
    function inputText(row){
      const parts=[];
      for(const id of row.inputs||[]){
        const item=observations.get(id);
        if(!item||item.value==null||Array.isArray(item.value))continue;
        const time=item.period||item.year;
        const value=item.unit==='元'?fmt(item.value/1e8)+' 亿元':fmt(item.value)+' '+(item.unit||'');
        parts.push([item.field,time].filter(t=>t!=null&&t!=='').join(' ')+' '+value);
      }
      return parts.join('；');
    }
    function catalogueBlocks(){
      if(!rows.length)return [{type:'p',text:'本轮报告未引用可展示的数据点。'}];
      return [{type:'table',columns:[
        {label:'编号',width:6},{label:'指标',width:13},{label:'数值',align:'right',width:10},{label:'期间',width:6},{label:'口径',width:10},{label:'公式',width:16},{label:'计算输入',width:31},{label:'来源',width:8}
      ],rows:rows.map(row=>[row.id,row.name||'—',display(row).trim()||'—',String(row.year??'—'),plainText(row.dimension)||'—',String(row.formula||'').trim()||'—',inputText(row)||'—',citeRow(row)||'—'])}];
    }
    function riskBlocks(){
      if(!risks.length)return [{type:'p',text:EMPTY_TEXT}];
      return risks.map((risk,index)=>{
        const refs=(risk.refs||[]).map(id=>byId.get(id)).filter(Boolean);
        return {type:'risk',title:'风险 '+(index+1),items:[
          {label:'触发条件',value:annotate(risk.judgment)||'未登记'},
          {label:'正文',value:annotate(risk.text)||EMPTY_TEXT},
          {label:'反证',value:annotate(risk.counter)||'未登记'},
          {label:'证据编号',value:sortedNumbers(cite([...new Set(refs.flatMap(sourcesOf))]))||'未登记'}
        ]};
      });
    }
    function sourceItems(){
      return cited.map((id,index)=>{
        const item=sources[id]||{};
        const title=plainText(item.title)||f10Label(item.table)||plainText(item.table);
        const locator=plainText(item.locator)||f10Label(item.table)||plainText(item.table);
        const url=typeof item.url==='string'?item.url:typeof item.url_or_document==='string'?item.url_or_document:'';
        return {no:index+1,
          publisher:plainText(item.publisher)||'未登记',
          title:title||'未登记',
          published:plainText(item.published)||'未登记',
          retrieved:retrieved||'未登记',
          locator:locator||'—',
          url:url||'—'};
      });
    }
    function checkBlocks(){
      const conflictItems=(ledger.conflicts||[]).map(item=>[plainText(item?.dimension),plainText(item?.key)].filter(Boolean).join(' · ')).filter(Boolean).map(text=>'口径冲突：'+text);
      const groups=[
        {title:'资料缺口',items:gaps.map(gap=>annotate(gap))},
        {title:'数据核对',items:[...(ledger.issues||[]).map(String).filter(Boolean),...conflictItems]},
        {title:'未完成任务',items:(report.failures||[]).map(String).filter(Boolean)}
      ].filter(group=>group.items.length);
      if(!groups.length)return [{type:'p',text:'本轮未登记资料缺口、数据核对问题或未完成任务。'}];
      return groups.map(group=>({type:'group',title:group.title,items:group.items}));
    }
    const sections=[];
    sections.push({index:'01',title:'摘要',blocks:proseBlocks(conclusions.find(x=>x.section==='summary'))});
    for(const [index,key,label] of [['02','performance','经营表现'],['03','quality','财务质量']]){
      const blocks=[...metricBlocks(key,label),...proseBlocks(conclusions.find(x=>x.section===key))];
      sections.push({index,title:label,blocks});
    }
    sections.push({index:'04',title:'风险清单',blocks:riskBlocks()});
    const creditBlocks=proseBlocks(conclusions.find(x=>x.section==='credit'));
    if(gaps.length)creditBlocks.push({type:'note',label:'待核实',text:annotate(gaps[0])});
    sections.push({index:'05',title:'对授信的含义',blocks:creditBlocks});
    sections.push({index:'A',title:'数据与计算明细',appendix:true,blocks:catalogueBlocks()});
    sections.push({index:'B',title:'来源清单',appendix:true,blocks:cited.length?[{type:'sources',items:sourceItems()}]:[{type:'p',text:'本轮报告未关联到可列示的来源文档。'}]});
    sections.push({index:'C',title:'缺口与核验',appendix:true,blocks:checkBlocks()});
    return {
      title:'天枢研究报告：'+(report.target||'未登记标的'),
      target:String(report.target||'未登记标的'),
      question:String(report.question||'').trim(),
      meta:[
        {label:'报告期',value:periodOf(report)},
        {label:'资料截止',value:String(report.asOf||'').slice(0,10)||'未登记'},
        {label:'生成时间',value:formatTime(meta?.generatedAt||new Date().toISOString())},
        {label:'模型',value:String(meta?.model||'').trim()||'未登记'},
        {label:'版本',value:String(meta?.version||VERSION).trim()||VERSION}
      ],
      sections
    };
  }
  const mdCell=value=>String(value==null?'':value).replace(/\|/g,'\\|').replace(/\r?\n/g,' ').trim()||'—';
  function markdownBlock(block,out){
    if(block.type==='p'){
      out.push((block.label?'**'+block.label+'**：':'')+block.text,'');
      return;
    }
    if(block.type==='table'){
      out.push('| '+block.columns.map(column=>mdCell(column.label)).join(' | ')+' |');
      out.push('| '+block.columns.map(column=>column.align==='right'?'---:':'---').join(' | ')+' |');
      for(const row of block.rows)out.push('| '+row.map(mdCell).join(' | ')+' |');
      out.push('');
      return;
    }
    if(block.type==='risk'){
      out.push('### '+block.title,'');
      for(const item of block.items)out.push('- **'+item.label+'**：'+item.value);
      out.push('');
      return;
    }
    if(block.type==='group'){
      out.push('**'+block.title+'**','');
      for(const item of block.items)out.push('- '+item);
      out.push('');
      return;
    }
    if(block.type==='note'){
      out.push('> **'+block.label+'**：'+block.text,'');
      return;
    }
    for(const item of block.items)out.push('- ['+item.no+'] 发布者：'+item.publisher+'；标题：'+item.title+'；发布日：'+item.published+'；取数日：'+item.retrieved+'；页码或表名：'+item.locator+'；链接：'+item.url);
    out.push('');
  }
  function buildMarkdown(report,meta){
    const doc=compose(report,meta);
    const out=['# '+doc.title,''];
    for(const item of doc.meta)out.push('- '+item.label+'：'+item.value);
    out.push('');
    if(doc.question)out.push('> 研究问题：'+doc.question,'');
    for(const section of doc.sections){
      out.push('## '+(section.appendix?'附录 '+section.index:section.index)+' '+section.title,'');
      for(const block of section.blocks)markdownBlock(block,out);
    }
    return out.join('\n').replace(/\n{3,}/g,'\n\n').trim()+'\n';
  }
  function esc(value){
    return String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function cssString(value){
    return '"'+String(value==null?'':value).replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/[\r\n]+/g,' ')+'"';
  }
  function htmlBlock(block){
    if(block.type==='p')return '<p class="block">'+(block.label?'<span class="label">'+esc(block.label)+'</span>：':'')+esc(block.text)+'</p>';
    if(block.type==='table'){
      const group=block.columns.some(column=>column.width)?'<colgroup>'+block.columns.map(column=>'<col'+(column.width?' style="width:'+column.width+'%"':'')+'>').join('')+'</colgroup>':'';
      const head='<thead><tr>'+block.columns.map(column=>'<th'+(column.align==='right'?' class="num"':'')+'>'+esc(column.label)+'</th>').join('')+'</tr></thead>';
      const body='<tbody>'+block.rows.map(row=>'<tr>'+row.map((value,index)=>'<td'+(block.columns[index].align==='right'?' class="num"':'')+'>'+esc(value)+'</td>').join('')+'</tr>').join('')+'</tbody>';
      return '<table class="grid">'+group+head+body+'</table>';
    }
    if(block.type==='risk'){
      return '<article class="finding block"><h3>'+esc(block.title)+'</h3>'+
        block.items.map(item=>'<div class="def"><span class="def-k">'+esc(item.label)+'</span><div class="def-v">'+esc(item.value)+'</div></div>').join('')+
        '</article>';
    }
    if(block.type==='group'){
      return '<div class="block"><p class="group-title">'+esc(block.title)+'</p><ul class="group-list">'+
        block.items.map(item=>'<li>'+esc(item)+'</li>').join('')+'</ul></div>';
    }
    if(block.type==='note')return '<p class="note block"><span class="label">'+esc(block.label)+'</span>：'+esc(block.text)+'</p>';
    return '<ul class="sources block">'+block.items.map(item=>'<li><span class="src-no">['+item.no+']</span><div class="src-body">'+
      '<span>发布者：'+esc(item.publisher)+'</span><span>标题：'+esc(item.title)+'</span><span>发布日：'+esc(item.published)+'</span>'+
      '<span>取数日：'+esc(item.retrieved)+'</span><span>页码或表名：'+esc(item.locator)+'</span><span>链接：'+esc(item.url)+'</span>'+
      '</div></li>').join('')+'</ul>';
  }
  function buildPrintHtml(report,meta){
    const doc=compose(report,meta);
    const cutoff=doc.meta.find(item=>item.label==='资料截止')?.value||'未登记';
    const fonts='"Microsoft YaHei", "Segoe UI", sans-serif';
    const css=[
      '@page { size: A4; margin: 18mm 16mm;',
      '  @top-left { content: '+cssString('天枢研究报告 · 标的：'+doc.target)+'; font: 8.5pt '+fonts+'; color: #6b6b6b; }',
      '  @top-right { content: '+cssString('资料截止 '+cutoff)+'; font: 8.5pt '+fonts+'; color: #6b6b6b; }',
      '  @bottom-left { content: "仅供内部研究参考"; font: 8.5pt '+fonts+'; color: #6b6b6b; }',
      '  @bottom-right { content: "第 " counter(page) " 页 / 共 " counter(pages) " 页"; font: 8.5pt '+fonts+'; color: #6b6b6b; }',
      '}',
      'html, body { margin: 0; padding: 0; background: #fff; color: #1a1a1a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }',
      'body { font: 10.5pt/1.75 '+fonts+'; }',
      '.doc-title { margin: 0 0 10pt; font-size: 20pt; line-height: 1.3; font-weight: 700; color: #111; break-after: avoid; }',
      '.doc-meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3pt 18pt; margin: 0 0 12pt; padding: 8pt 10pt; border: 1px solid #dedede; background: #fafafa; font-size: 9pt; line-height: 1.6; break-inside: avoid; }',
      '.doc-meta div { display: flex; gap: 8pt; }',
      '.doc-meta dt { flex: 0 0 52pt; color: #6b6b6b; }',
      '.doc-meta dd { margin: 0; color: #1a1a1a; }',
      '.doc-question { margin: 0 0 14pt; padding: 7pt 10pt; border-left: 3pt solid #4d6bfe; background: #f5f7ff; font-size: 9.5pt; line-height: 1.7; break-inside: avoid; }',
      '.section { margin: 0 0 18pt; }',
      '.section > h2 { display: flex; align-items: baseline; gap: 8pt; margin: 0 0 8pt; padding-bottom: 4pt; border-bottom: 1px solid #d9d9d9; font-size: 13pt; line-height: 1.4; color: #111; break-after: avoid; }',
      '.section-index { flex: 0 0 auto; font-size: 9.5pt; color: #4d6bfe; letter-spacing: .5pt; }',
      '.block { break-inside: avoid; }',
      'p { margin: 0 0 8pt; text-align: justify; }',
      '.label { font-weight: 600; color: #111; }',
      '.grid { width: 100%; border-collapse: collapse; margin: 0 0 10pt; table-layout: fixed; font-size: 8.8pt; line-height: 1.55; }',
      '.grid thead { display: table-header-group; }',
      '.grid th, .grid td { border: 1px solid #c9c9c9; padding: 3pt 5pt; vertical-align: top; text-align: left; }',
      '.grid th { background: #f2f2f4; font-weight: 600; white-space: nowrap; }',
      '.grid tr { break-inside: avoid; }',
      '.grid tbody tr:nth-child(even) td { background: #fbfbfc; }',
      '.grid .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }',
      '.finding { margin: 0 0 10pt; padding: 8pt 10pt; border: 1px solid #dcdcdc; border-left: 3pt solid #b48a2a; background: #fdfdfd; }',
      '.finding h3 { margin: 0 0 6pt; font-size: 10.5pt; }',
      '.def { display: flex; gap: 8pt; margin: 0 0 3pt; font-size: 9.5pt; line-height: 1.7; }',
      '.def-k { flex: 0 0 52pt; color: #6b6b6b; }',
      '.def-v { flex: 1 1 auto; min-width: 0; }',
      '.note { margin: 0 0 8pt; padding: 6pt 10pt; border-left: 3pt solid #c98a12; background: #fffaf0; font-size: 9.5pt; }',
      '.group-title { margin: 10pt 0 3pt; font-size: 10pt; font-weight: 600; }',
      '.group-list { margin: 0 0 8pt; padding-left: 14pt; }',
      '.group-list li { font-size: 9.5pt; line-height: 1.7; }',
      '.sources { margin: 0; padding: 0; list-style: none; }',
      '.sources li { display: flex; gap: 6pt; padding: 5pt 0; border-bottom: 1px dashed #e2e2e2; font-size: 9pt; line-height: 1.65; break-inside: avoid; }',
      '.src-no { flex: 0 0 24pt; color: #b06a00; font-weight: 600; }',
      '.src-body { flex: 1 1 auto; min-width: 0; }',
      '.src-body span { display: inline-block; margin-right: 10pt; }'
    ].join('\n');
    const body=['<header>','<h1 class="doc-title">'+esc(doc.title)+'</h1>','<dl class="doc-meta">'];
    for(const item of doc.meta)body.push('<div><dt>'+esc(item.label)+'</dt><dd>'+esc(item.value)+'</dd></div>');
    body.push('</dl>','</header>');
    if(doc.question)body.push('<p class="doc-question"><span class="label">研究问题</span>：'+esc(doc.question)+'</p>');
    for(const section of doc.sections){
      body.push('<section class="section">','<h2><span class="section-index">'+esc(section.appendix?'附录 '+section.index:section.index)+'</span>'+esc(section.title)+'</h2>');
      for(const block of section.blocks)body.push(htmlBlock(block));
      body.push('</section>');
    }
    return ['<!doctype html>','<html lang="zh-CN">','<head>','<meta charset="utf-8">','<meta name="viewport" content="width=device-width, initial-scale=1">',
      '<title>'+esc(doc.title)+'</title>','<style>',css,'</style>','</head>','<body>',...body,'</body>','</html>'].join('\n');
  }
  function fileName(report,ext){
    const base='天枢研究报告-'+String(report.target||'未登记标的')+'-'+periodOf(report);
    return base.replace(/[\\/:*?"<>|\s]+/g,'-')+'.'+ext;
  }
  return {buildMarkdown,buildPrintHtml,fileName,sectionMetrics,version:VERSION};
})();
