from pathlib import Path
d=Path('work/conclusion-cards'); app=d/'天枢工作台'
p=app/'server.mjs';s=p.read_text('utf-8')
a=s.index('    const framing=')
s=s[:a]+"""    if(action==='work'&&role!=='SUPPLY')system+=' 在 JSON 回报中额外提供 overview_card:{headline,support}。headline 用8至20字概括对本次问题最重要且有据的判断，优先写变化方向与限制，例如“利润增长，现金转化回落”。不要只给金额、年份、指标名或笼统健康评级。support 用一至两句短句列出该判断所引用的同口径期间、指标、数值、单位及必要的反证。没有充分证据时 headline 说明哪项判断仍待核实，support 列实际缺失项。禁止用无关数字装饰结论。';
"""+s[a:];p.write_text(s,'utf-8')
p=app/'app/team.js';s=p.read_text('utf-8').replace('return {summary:raw.summary,agent_analysis:raw.agent_analysis','return {summary:raw.summary,overview_card:raw.overview_card,agent_analysis:raw.agent_analysis');p.write_text(s,'utf-8')
p=app/'app/research-board.js';s=p.read_text('utf-8')
a=s.index('  function panel(')
s=s[:a]+'''  function cornerResult(s,id){
    const output=s.agentOutput?.[id],report=output?.report;
    if(output?.error||s.agents.find(a=>a.id===id)?.status==='失败')return {title:'本项研究未完成',support:output?.error||'未收到有效研究回报。'};
    if(!report)return {title:s.phase==='done'?'本项结论待核实':'等待研究结论',support:label(s,id)};
    const summary=String(report.summary||'').trim();
    const proposed=report.overview_card||{};
    const validTitle=t=>typeof t==='string'&&t.trim().length>=4&&t.trim().length<=28&&/[\\u3400-\\u9fff]{2}/.test(t)&&!/[0-9]+(?:[.,][0-9]+)*\\s*(?:[万亿]?元|%|倍|GWh|天)/i.test(t);
    if(validTitle(proposed.headline)&&typeof proposed.support==='string'&&proposed.support.trim())return {title:proposed.headline.trim(),support:proposed.support.trim()};
    // Historical recordings have no card fields. Use their own conclusion and supporting sentences.
    const clauses=summary.split(/[。；：，]/).map(t=>t.trim()).filter(Boolean);
    const title=clauses.find(t=>validTitle(t)&&!/^且|^但|^因此|^分别/.test(t)&&/增长|回落|放缓|背离|不同|改善|承压|无法|缺少|不能|上升|下降|集中|弱于|不足|依赖|有限/.test(t));
    const limit=(report.missing||[]).map(m=>typeof m==='string'?m:m?.impact||m?.reason||m?.field).filter(Boolean)[0];
    return {title:title|| (limit?'关键判断仍待核实':'研究结论待提炼'),support:summary||limit||'本轮尚无可核验的数据。'};
  }
'''+s[a:]
s=s.replace("    if(f && mode==='corner')card.append(spark(f.g));","""    if(mode==='corner'){
      const result=cornerResult(s,id);
      const headline=el('strong','bc-verdict',result.title),evidence=el('span','bc-support',result.support);
      card.append(headline,evidence);card.title=result.title+' · '+result.support;
      if(entry.kind==='error')card.classList.add('has-gap');
      return card;
    }""");p.write_text(s,'utf-8')
css="""
.atlas .board-card.corner{justify-content:flex-start;gap:10px}
.atlas .bc-verdict{display:block;margin-top:auto;color:#f2f6f8;font-size:clamp(18px,1.65vw,28px);font-weight:650;letter-spacing:-.025em;line-height:1.38;overflow-wrap:anywhere}
.atlas .bc-support{display:block;color:#b9cbd0;font-size:clamp(12px,.92vw,14px);line-height:1.65;overflow-wrap:anywhere}
"""
for p in [app/'app/team.css',d/'演示工具/final-board.css']:p.write_text(p.read_text('utf-8-sig')+css,'utf-8')
