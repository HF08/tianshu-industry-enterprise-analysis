from pathlib import Path
p=Path('work/live-new-report.mjs');s=p.read_text('utf-8-sig').replace('work/new-report-base/天枢团队审查包/天枢工作台','work/night-industry/天枢工作台')
a=s.index(' const q=');b=s.index(' await ev(',a)
s=s[:a]+""" const q=type==='BAT'?'研究中国动力电池行业。每组只提交一项可验证的核心发现，比较2024与2025年企业销量、国内装车量。产业链从材料到电池再到装车，资料不足标为推断。':'研究中国光伏发电行业。每组只提交一项可验证的核心发现，比较2024与2025年全国新增装机及发电量，区分集中式和分布式。产业链以硅片、电池片、组件、并网应用为范围。';
"""+s[b:]
s=s.replace("test(first,'FIN'),test(second,'IND')","test(first,'BAT'),test(second,'PV')").replace("'work/verified-new-'","'work/verified-night-'")
a=s.index(" await ev('document.querySelector(\".report-kpis");b=s.index("ws.close();",a)
s=s[:a]+""" const geo=await ev('(()=>{const r=document.querySelector("#research-report").getBoundingClientRect();return [r.height/innerHeight,r.width/innerWidth,!!document.querySelector("#research-report .composer-dock")]})()');assert.ok(geo[0]>.93&&geo[1]>.93&&!geo[2]);
 const hot=await ev('(()=>{const hit=document.querySelector("#research-pages .edge-hit");if(!hit)return null;hit.dispatchEvent(new PointerEvent("pointerenter"));return [document.querySelectorAll("#research-pages .edge-endpoint").length,document.querySelector("#research-pages .edge-caption").innerText]})()');
 console.log('QA',type,geo,hot,snap.agents.map(a=>a.status));assert.equal(hot?.[0],2);assert.ok(hot[1].includes('→'));
 """+s[b:]
Path('work/verify-night-live.mjs').write_text(s,'utf-8')
