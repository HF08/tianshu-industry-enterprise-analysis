// Formula expressions are maintained here; imported observations are values only.
const groups = {
  FIN: `
营业收入|元|收入
归母净利润|元|归母利润
经营现金流|元|经营净现金
营业收入同比|%|(收入/前收入-1)*100
收入三年复合增速|%|(Math.pow(收入/三年前收入,1/3)-1)*100
产品收入占比|%|分部收入/收入*100
分部收入增速|%|(分部收入/前分部收入-1)*100
前五大客户收入占比|%|前五客户销售额/收入*100
合同负债占收入|%|合同负债/收入*100
应收占收入|%|应收账款/收入*100
应收及合同资产占收入|%|(应收账款+合同资产)/收入*100
销售费用率|%|销售费用/收入*100
分部毛利率|%|(分部收入-分部成本)/分部收入*100
分部营业利润率|%|分部营业利润/分部收入*100
收现比|倍|销售收现/收入
毛利率|%|(收入-营业成本)/收入*100
营业利润率|%|营业利润/收入*100
净利率|%|净利润/收入*100
管理费用率|%|管理费用/收入*100
研发费用率|%|研发费用/收入*100
增量营业利润率|%|(营业利润-前营业利润)/(收入-前收入)*100
ROE（平均归母权益）|%|归母利润/((归母权益+前归母权益)/2)*100
资产周转率|次|收入/((总资产+前总资产)/2)
杜邦归母净利率|%|归母利润/收入*100
杜邦权益乘数|倍|(总资产+前总资产)/(归母权益+前归母权益)
ROIC|%|税后经营利润/((投入资本+前投入资本)/2)*100
增量ROIC|%|(税后经营利润-前税后经营利润)/(投入资本-前投入资本)*100
资本开支占收入|%|资本开支/收入*100
再投资率|%|(资本开支-折旧摊销+经营营运资本-前经营营运资本)/税后经营利润*100
经营现金流与净利润比|倍|经营净现金/净利润
自由现金流|元|经营净现金-资本开支
DSO|天|(应收账款+前应收账款)/2/收入*年度天数
DIO|天|(存货+前存货)/2/营业成本*年度天数
DPO（成本代理）|天|(应付账款+前应付账款)/2/营业成本*年度天数
CCC|天|((应收账款+前应收账款)/收入+(存货+前存货-应付账款-前应付账款)/营业成本)*年度天数/2
经营净营运资本占收入|%|经营营运资本/收入*100
资产负债率|%|总负债/总资产*100
有息负债率|%|有息负债/总资产*100
净负债与EBITDA比|倍|(有息负债-现金等价物)/息税折旧摊销前利润
利息保障倍数|倍|(税前利润+利息费用)/利息费用
流动比率|倍|流动资产/流动负债
速动比率（扣存货）|倍|(流动资产-存货)/流动负债
短债占比|%|一年内到期有息债务/有息负债*100
经营现金流付息倍数|倍|经营净现金/利息费用
应计比率|%|(净利润-经营净现金)/((总资产+前总资产)/2)*100
非经常损益占归母利润|%|(归母利润-扣非归母)/归母利润*100
研发资本化率|%|资本化研发投入/研发总投入*100
商誉占净资产|%|商誉/净资产*100
销量同比|%|(销量/前销量-1)*100
产品平均售价|元/件|产品销售收入/销量
量变贡献（上期价格）|元|(销量-前销量)*前产品销售收入/前销量
价变贡献（本期销量）|元|产品销售收入-销量*前产品销售收入/前销量
产品结构占比|%|产品销售收入/收入*100
指引完成率|%|同口径实际值/原指引目标*100
`,
  IND:`
市场规模|元|市场销售额
规模增速|%|(市场销售额/前市场销售额-1)*100
产量同比|%|(产量/前产量-1)*100
销量同比|%|(销量/前销量-1)*100
产能利用率|%|实际产出/有效产能*100
库存变化|实物单位|行业库存-前行业库存
产品原料价差|元/产品单位|产品价格-原料价格*单位产品耗料
国产化率|%|境内销售国产量/境内总销量*100
行业价格同比|%|(产品价格/前产品价格-1)*100
`,
  制造业:`
产能利用率|%|实际产出/有效产能*100
良率|%|合格件数/投产件数*100
单位成本|元/件|产品销售成本/销量
原料价差|元/产品单位|产品价格-原料价格*单位产品耗料
`,
  零售与消费:`
同店销售增速|%|(同店本期销售额/同店可比期销售额-1)*100
坪效|元/平方米|门店销售额/平均经营面积
客单价|元/单|成交金额/订单数
复购率|%|复购客户数/购买客户数*100
`,
  SaaS与互联网:`
月经常性收入|元/月|月订阅收入
年化经常性收入|元/年|月订阅收入*12
净收入留存率|%|(存量期初收入-流失收入-收缩收入+扩展收入)/存量期初收入*100
毛收入留存率|%|(存量期初收入-流失收入-收缩收入)/存量期初收入*100
客户流失率|%|流失客户/期初客户*100
ARPU|元/户|期间服务收入/平均活跃付费户
CAC回收期|月|单位获客成本/月均每客毛利
订阅毛利率|%|(订阅收入-订阅成本)/订阅收入*100
`,
  银行:`
净息差|%|净利息收入/平均生息资产*100
不良贷款率|%|不良贷款/贷款总额*100
拨备覆盖率|%|贷款减值准备/不良贷款*100
核心一级资本充足率|%|核心一级资本净额/风险加权资产*100
成本收入比|%|业务及管理费/银行营业收入*100
信用成本|%|贷款减值损失/平均贷款余额*100
`,
  保险:`
综合成本率|%|(承保赔付+承保费用)/已赚保费*100
综合偿付能力充足率|%|实际资本/最低资本*100
投资收益率|%|投资收益额/平均投资资产*100
`,
  地产与工程:`
净负债率|%|(有息负债-现金等价物)/净资产*100
现金回款率|%|同期销售回款/同期合同销售额*100
`,
  公用事业:`
受监管资产回报率|%|受监管经营收益/平均监管资产基数*100
设备利用率|%|实际利用小时/可用小时*100
经营现金流同比|%|(经营净现金/前经营净现金-1)*100
`,
  医药与生物科技:`
研发成功率|%|同队列成功项目/同队列已决项目*100
专利到期收入占比|%|指定窗口到期产品收入/收入*100
`
};
const disclosed={
 FIN:'销量 产品价格 产品销售成本 在手订单 交付量 合同负债 营业成本 净利润 审计意见 审计师变更 财务重述 债务到期结构 租赁负债 担保 表外义务 坏账准备 存货跌价准备 存货跌价及合同履约成本减值准备 关联交易 资金占用 管理层经营指引 前五供应商采购占比 前五客户销售占比（披露） 研发总投入 费用化研发支出 期末库存量',
 IND:'新增并网装机 期末累计装机 发电量 光伏发电利用率 产量 销量 装车量 产品价格 原料价格 行业库存 进口量 出口量 PMI 工业增加值 制造业增加值 政策变化 监管变化 技术变化 标准变化 规上企业营业收入 规上企业营收同比 规上企业营业成本 规上企业成本同比 规上企业利润总额 规上企业利润同比',
 制造业:'在手订单',零售与消费:'渠道库存 终端动销',保险:'新业务价值 内含价值 准备金充足性',
 地产与工程:'预售金额 土地储备 合同资产 存货跌价准备',公用事业:'准许收益率 资本开支 债务到期结构 经营净现金',
 医药与生物科技:'管线进度 医保覆盖 峰值销售预测及来源'
};
export const sectors=Object.keys(groups).slice(2);
const catalog=Object.fromEntries(Object.entries(groups).map(([g,defs])=>[g,defs.trim().split('\n').map(line=>{
  const [name,unit,formula]=line.split('|');
  const fields=[...new Set(formula.match(/[\u3400-\u9fff]+/g))];
  return {name,unit,formula,fields,compute:Function(...fields,'return '+formula)};
})]));
export const dictionary=Object.fromEntries(Object.entries(catalog).map(([group,defs])=>[group,{formulas:defs.map(({compute,...rest})=>rest),disclosures:(disclosed[group]||'').split(' ').filter(Boolean)}]));
export function calculate({role,sector,observations,years,dimension=''}) {
  const map=new Map(),conflicts=new Set();
  for(const obs of observations){
    if((obs.dimension||'')!==dimension)continue;
    const key=obs.year+'|'+obs.field,prior=map.get(key);
    if(prior&&(JSON.stringify(prior.value)!==JSON.stringify(obs.value)||prior.unit!==obs.unit))conflicts.add(key);
    map.set(key,obs);
  }
  const lookup=(year,field)=>conflicts.has(year+'|'+field)?undefined:map.get(year+'|'+field);
  const financial=['银行','保险'].includes(sector);
  let defs=role==='IND'?catalog.IND:financial?catalog.FIN.filter(d=>['归母净利润','ROE（平均归母权益）'].includes(d.name)):catalog.FIN;
  if(role==='FIN'&&catalog[sector]&&sectors.includes(sector))defs=defs.concat(catalog[sector]);
  if(dimension&&role==='FIN')defs=defs.filter(d=>d.fields.some(f=>[...map.values()].some(o=>o.field===f&&f!=='收入')));
  const metrics=[],missing=[];
  for(const year of years){
    for(const def of defs){
      const inputs=def.fields.map(f=>{
        if(f==='年度天数')return {value:(Date.UTC(year+1,0,1)-Date.UTC(year,0,1))/86400000,id:'calendar-'+year};
        const lag=f.startsWith('三年前')?3:f.startsWith('前')&&!f.startsWith('前五')?1:0;
        return lookup(year-lag,lag?f.slice(lag===3?3:1):f);
      });
      const absent=def.fields.filter((_,i)=>!Number.isFinite(inputs[i]?.value));
      if(absent.length){missing.push({year,name:def.name,need:absent});continue;}
      const values=inputs.map(v=>v.value);
      const measures=new Set('年度天数 销量 前销量 产量 前产量 实际产出 有效产能 行业库存 前行业库存 产品价格 前产品价格 原料价格 单位产品耗料 境内销售国产量 境内总销量 合格件数 投产件数 平均经营面积 订单数 复购客户数 购买客户数 流失客户 期初客户 平均活跃付费户 单位获客成本 月均每客毛利 同口径实际值 原指引目标 实际利用小时 可用小时 同队列成功项目 同队列已决项目'.split(' '));
      const nonMoney=inputs.some((v,i)=>!measures.has(def.fields[i])&&v.unit!=='元');
      const pairs=[['实际产出','有效产能'],['同口径实际值','原指引目标'],['境内销售国产量','境内总销量']];
      const mismatch=pairs.some(([a,b])=>def.fields.includes(a)&&def.fields.includes(b)&&inputs[def.fields.indexOf(a)].unit!==inputs[def.fields.indexOf(b)].unit);
      if(nonMoney||mismatch){missing.push({year,name:def.name,reason:'输入单位不符合公式口径'});continue;}
      if(inputs.some((v,i)=>def.fields[i].startsWith('前')&&def.fields.includes(def.fields[i].slice(1))&&v.unit!==inputs[def.fields.indexOf(def.fields[i].slice(1))].unit)){
        missing.push({year,name:def.name,reason:'跨期单位不一致'});continue;
      }
      const invalidGrowth=/增速|同比/.test(def.name)&&(values[1]<=0||values[0]<0);
      const invalidReturn=(def.name==='增量ROIC'&&values[2]<=values[3])||(def.name==='净负债与EBITDA比'&&values[2]<=0);
      const value=invalidGrowth||invalidReturn?NaN:def.compute(...values);
      if(!Number.isFinite(value)){missing.push({year,name:def.name,reason:'分母为零或增长基数不可比'});continue;}
      let unit=def.unit;
      if(['产品平均售价','单位成本'].includes(def.name))unit='元/'+inputs[def.fields.indexOf('销量')].unit;
      if(def.name==='库存变化')unit=inputs[0].unit;
      metrics.push({year,name:def.name,unit,value,formula:def.formula,inputs:inputs.map(i=>i.id),dimension});
    }
    const fields=[...new Set(((disclosed[role]||'')+' '+(role==='FIN'?disclosed[sector]||'':'')).trim().split(/\s+/))];
    for(const field of fields){const o=lookup(year,field);if(o)metrics.push({year,name:field,value:o.value,unit:o.unit,inputs:[o.id],dimension});else if(!dimension)missing.push({year,name:field,need:[field]});}
    if(role==='IND'){
      const shares=lookup(year,'完整市场份额'),s=shares?.value;
      const valid=Array.isArray(s)&&s.length&&s.every(x=>Number.isFinite(x)&&x>=0&&x<=100)&&Math.abs(s.reduce((a,b)=>a+b,0)-100)<0.01;
      for(const n of [5,10,0]){
        const name=n?'CR'+n:'HHI';
        if(!valid){missing.push({year,name,need:['同口径全市场份额数组（百分数，合计100）']});continue;}
        const sorted=[...s].sort((a,b)=>b-a);
        metrics.push({year,name,value:n?sorted.slice(0,n).reduce((a,b)=>a+b,0):s.reduce((a,b)=>a+b*b,0),unit:n?'%':'点',formula:n?'前'+n+'家份额之和':'百分数份额平方和',inputs:[shares.id],dimension});
      }
    }
  }
  return {metrics,missing,conflicts:[...conflicts]};
}
