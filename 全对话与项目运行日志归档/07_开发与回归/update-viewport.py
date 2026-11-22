from pathlib import Path
d=Path('work/map-viewport');app=d/'天枢工作台'
p=app/'app/research-board.js';s=p.read_text('utf-8')
s=s.replace('let drawingId=0;','let drawingId=0, viewportObserver;')
a=s.index('    function recenter(){');b=s.index('    function zoom(',a)
s=s[:a]+'''    function recenter(){
      const box=surface.getBoundingClientRect();
      const bounds=world?.getBBox();
      const left=Math.min(0,(bounds?.x??0)-6),top=Math.min(0,(bounds?.y??0)-6);
      const right=Math.max(width,(bounds?.x??0)+(bounds?.width??0)+6);
      const bottom=Math.max(height,(bounds?.y??0)+(bounds?.height??0)+6);
      const contentW=right-left,contentH=bottom-top;
      const vw=box.width||contentW,vh=box.height||contentH;
      const fit=Math.min(vw/contentW,vh/contentH)*ui.scale;
      const w=vw/fit,h=vh/fit;
      svg.setAttribute('viewBox',[(left+right-w)/2-ui.pan[0],(top+bottom-h)/2-ui.pan[1],w,h].join(' '));
      amt.textContent=Math.round(ui.scale*100)+'%';
    }
'''+s[b:]
s=s.replace("svg.style.height=height/width*100+'cqw';svg.style.minHeight='165px';","")
s=s.replace("svg.style.height='100%';svg.style.minHeight='0';","")
s=s.replace('};draw();return root;', '''};draw();viewportObserver?.disconnect();viewportObserver=new ResizeObserver(recenter);viewportObserver.observe(surface);return root;''')
p.write_text(s,'utf-8')
css="""
#trace-pane[data-mode=work] .mind-surface{position:relative;flex:1 1 0;min-height:0;overflow:hidden}
#trace-pane[data-mode=work] .mind-svg{position:absolute;inset:0;display:block;width:100%;height:100%;min-height:0;touch-action:none}
"""
for p in [app/'app/team.css',d/'演示工具/feed.css']:p.write_text(p.read_text('utf-8-sig')+css,'utf-8')
p=app/'server.mjs';s=p.read_text('utf-8');s=s.replace('仅进行路由。结合全部用户消息识别标的，', '''仅进行路由。以最新用户意图和明确的研究对象为准，自动区分企业与行业。只输名称是有效任务：证券代码、可辨识的公司全称、简称或品牌对应的明确企业直接选 company；产品市场、产业、行业或领域直接选 industry。问“美的集团”或“000333”是 company；“白色家电行业”是 industry。“美的集团的行业地位”仍以企业为标的；“以美的集团为例分析家电行业”以行业为标的。不得因为没给年份、地区、指标、研究问题或没写“分析”而反问：采用系统默认五个完整财年与近期可比期间，企业研究经营变化和风险，行业研究规模、竞争和景气。在已有上下文中可解指代时直接继续。只有无法识别任何可研究标的、名称实质歧义会改变研究对象且上下文无法消解，或输入不知所云时才 clarify，并只问最小澄清问题。不编造证券代码。''')
p.write_text(s,'utf-8')
p=app/'app/team.js';s=p.read_text('utf-8');a=s.index('  async function run(s,fixedPlan');s=s[:a]+'''  // Canonical identifiers already supported by the local evidence adapters.
  function knownTarget(text){
    const name=text.trim(),aliases=new Map([['美的集团','美的集团'],['美的集团股份有限公司','美的集团'],['000333','美的集团'],['000333.SZ','美的集团'],['宁德时代','宁德时代'],['300750','宁德时代'],['300750.SZ','宁德时代']]);
    const target=aliases.get(name.toUpperCase());
    return target?{type:'company',target,scope:'五个完整财年，分析经营变化、现金流、同业表现和风险，近期可比期间单列。',question:''}:null;
  }
'''+s[a:];s=s.replace("const plan=fixedPlan||await structured(s,'TS','plan',context(s),signal);","const plan=fixedPlan||knownTarget(s.history.filter(m=>m.role==='user').at(-1)?.content||'')||await structured(s,'TS','plan',context(s),signal);")
p.write_text(s,'utf-8')
