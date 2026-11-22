from pathlib import Path
d=Path('outputs/Tianshu-Report')
p=d/'app/index.html';s=p.read_text('utf-8-sig')
a=s.index('<div class="report-layer"');b=s.index('<div class="toast"',a);s=s[:a]+'''<dialog id="research-report" aria-labelledby="live-report-title"><header><div><small id="report-stamp"></small><h2 id="live-report-title">研究报告</h2></div><div class="report-actions"><select id="report-version" aria-label="报告版本"></select><button id="report-update">更新报告</button><button id="report-exit" aria-label="关闭报告">关闭</button></div></header><main id="research-pages"></main></dialog>
<dialog id="research-source" aria-labelledby="proof-title"><header><h2 id="proof-title">指标依据</h2><button id="proof-close">返回报告</button></header><main id="proof-body"></main></dialog>
'''+s[b:];a=s.rindex('<script>',0,s.index('// 报告预览：示例数据'));b=s.index('</script>',a)+9;s=s[:a]+s[b:];s=s.replace('aria-controls="report-panel"','aria-controls="research-report"').replace('<script src="team.js">','<link rel="stylesheet" href="research-report.css"><script src="research-report.js"></script>\n<script src="team.js">');p.write_text(s,'utf-8')
p=d/'server.mjs';s=p.read_text('utf-8-sig').replace("COMP:'研究系统提示词 · 上下游关联'","COMP:'研究系统提示词 · 企业同行竞争'").replace("CHAIN:'研究系统提示词 · 上下游分析'","CHAIN:'研究系统提示词 · 行业同业企业竞争'").replace("TS:'主模型系统',","RPT:'可视化报告代理', TS:'主模型系统',").replace("'chain-map.js'])","'chain-map.js','research-report.js','research-report.css'])").replace('const actions = {','''const actions = {
  report:'仅输出合法 JSON 对象 {"conclusions":[{"tag":"I","text":"完整中文结论，直接回答研究问题","refs":["D1"],"counter":"反证或限制"}],"risks":[{"tag":"I","text":"风险触发条件与影响路径","refs":["D2"],"counter":"缓释证据和待核实条件"}],"gaps":["具体缺项"]}。每一条结论和风险均须引用所给指标目录中存在的编号。检查跨年、同业口径与证据覆盖。无证据时数组留空、说明缺口，禁止虚构。', ''');p.write_text(s,'utf-8')
p=d/'prompts.md';s=p.read_text('utf-8-sig')
def replace_section(prefix,content):
 global s
 a=s.index('## '+prefix);b=s.index('\n## ',a+3);s=s[:a]+content.strip()+'\n'+s[b:]
replace_section('研究系统提示词 · 上下游关联',"""
## 研究系统提示词 · 企业同行竞争分析（COMP）

1. 对象是标的企业及具有产品替代性的上市同行。回答其相对规模、经营效率、竞争位置与证据限制。
2. 输入为任务卡、角色内核候选、期间和来源。先区分合并范围与可比产品；无可比者留M并说明原因。
3. 同一币种、会计期、会计定义和分母才能并列。营业收入与营业总收入分别建表。
4. 明确筛选标准→检验地域、产品、客户和规模→用实际收入倍数、可得毛利率或经营指标作比较→核实异常与反例。
5. 至少说明入选者、排除理由或待核验项。规模接近仅是初筛；份额、品牌优势或价格权力均需额外证据。
6. 给天枢和报告代理 PeerComparison 与可视比较序列；产业链关系作为竞争解释，保留证据和适用期间。
7. 关键字段缺失时交部分结果，不猜测未披露的竞争者数值。
8. 不把行业样本营收排名解释为终端市场份额，不输出投资建议。
""")
replace_section('研究系统提示词 · 上下游分析',"""
## 研究系统提示词 · 行业同业企业竞争分析（CHAIN）

1. 从已定义的细分行业出发，回答代表企业是谁、规模分布如何、格局是否变化。
2. 读取本轮行业样本、集中度、生产或装车等不同口径。仅有证券代码时保留代码。
3. 比较前确认产品边界、地域、年份、企业集团层级、分类变动及样本名单。
4. 对按同一指标排序的代表企业计算样本占比，配合可比年度CR5/CR10/HHI检验变化；对缺失企业或样本变更注明局限。
5. 产业链依赖属于格局解释。图谱需标明典型环节和真实供销边；具名关系须引用披露。
6. 交付 PeerComparison、集中度趋势和有来源的比较图数据，供行业风险和报告代理使用。
7. 缺少完整市场分母时仅报告样本内位置。
8. 禁止从样本排名推导市场支配力、反垄断判断或授信结论。
""")
s=s.replace('天枢负责写报告','报告代理负责证据化报告，天枢负责验收和对话总结')
s+='''
## 可视化报告代理（RPT）

你是独立的报告子代理，接收研究问题、四个团队回报与本轮可追溯的指标目录。输出面向行业研究人员的结论与风险解释，交由宿主绘制趋势、同业对比、产业链和缺口。先核对“哪个主体、哪年、什么指标、哪个来源”。用 F/C/I 区分披露、计算、推断。每个风险指出异常、影响机制、相反证据和需要复核的资料，引用目录编号；不能证实的归入 gaps。禁止把资料齐备程度当成风险等级。报告更新时只比较同期间、同维度和同单位的值。不要返回 HTML 或未经验证的外部链接。
''';p.write_text(s,'utf-8')
