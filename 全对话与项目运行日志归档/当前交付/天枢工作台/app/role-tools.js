// Deterministic research operations over the same dated ledger used by FIN and IND.
window.roleTools = (() => {
  const titles={
    BIZ:'计算产品组合贡献与分部盈利',COMP:'筛选同业候选与已披露交易关系',
    CHAIN:'排序同行代表企业并核对样本集中度',DEM:'计算客户分层、需求渗透与市场空间',
    RC:'复核现金流、盈利变化与上游矛盾',RI:'复核需求、库存、集中度与上游矛盾'
  };
  function run(role,ledger,upstream){
    const rows=[],missing=[],metrics=ledger.metrics,year=ledger.years.at(-1);
    const observations=ledger.observations.filter(o=>ledger.years.includes(o.year)&&!ledger.conflicts.some(c=>c.key===o.year+'|'+o.field&&c.dimension===(o.dimension||'')));
    const copyMetrics=(test)=>rows.push(...metrics.filter(test));
    const derived=(name,value,unit,scope,formula,inputs)=>rows.push({name,value,unit,...scope,formula,inputs});
    function pairs(left,right,fn){
      for(const a of observations.filter(o=>o.field===left)){
        const b=observations.find(o=>o.field===right&&o.year===a.year&&(o.dimension||'')===(a.dimension||''));
        if(b&&Number.isFinite(a.value)&&Number.isFinite(b.value))fn(a,b);
      }
    }
    if(role==='BIZ'){
      copyMetrics(m=>/产品收入占比|分部毛利率|分部收入增速|贡献（|前五大客户|单位成本|留存率/.test(m.name));
      pairs('分部收入','分部成本',(a,b)=>{
        if(a.unit==='元'&&b.unit==='元')derived('分部毛利额',a.value-b.value,'元',{year:a.year,dimension:a.dimension},'分部收入－分部成本',[a.id,b.id]);
      });
      if(!rows.some(r=>r.name==='分部毛利额'))missing.push('缺同产品同期间收入与成本');
    }
    if(role==='COMP'){
      const sample=observations.find(o=>o.source==='PEERS'&&o.field==='同业候选');
      const code=ledger.sources.PEERS?.target_code;
      const self=sample?.value.find(p=>p.code===code);
      if(self){
        const peers=sample.value.filter(p=>p.code!==code).sort((a,b)=>Math.abs(Math.log(a.revenue/self.revenue))-Math.abs(Math.log(b.revenue/self.revenue))).slice(0,3);
        for(const p of peers)derived('同业候选营收相对倍数',p.revenue/self.revenue,'倍',{year:sample.year,dimension:p.name+' '+p.code,peer_revenue_yuan:p.revenue,target_revenue_yuan:self.revenue},'同分类候选合并营业总收入 / 标的合并营业总收入',[sample.id]);
      }
      missing.push('候选企业须复核产品和地域；直接竞争关系需披露依据');
    }
    if(role==='COMP'||role==='CHAIN'){
      for(const o of observations.filter(o=>o.field==='产业链关系')){
        const e=o.value;
        if(!e||!['from','to','type'].every(k=>typeof e[k]==='string'&&e[k].trim()))continue;
        rows.push({name:'披露关系',year:o.year,from:e.from,to:e.to,relation:e.type,inputs:[o.id]});
      }
      if(!rows.some(r=>r.name==='披露关系'))missing.push('缺具名关系披露；不得据此生成交易边');
    }
    if(role==='CHAIN'){
      copyMetrics(m=>['CR5','CR10','HHI'].includes(m.name));
      const sample=observations.filter(o=>o.field==='样本营收明细').sort((a,b)=>b.year-a.year)[0];
      if(sample){
        const total=sample.value.reduce((n,row)=>n+row[1],0);
        if(total>0)for(const [code,revenue,name] of [...sample.value].sort((a,b)=>b[1]-a[1]).slice(0,5))
          derived('代表企业样本营收占比',100*revenue/total,'%',{year:sample.year,dimension:(name?name+' ':'')+code,sample_scope:sample.dimension},'代表企业合并营业总收入 / 同分类有效样本营业总收入合计 × 100',[sample.id]);
      }else missing.push('缺同一行业分类的企业样本与营收，无法排名');

      pairs('关键投入采购额','同范围采购总额',(a,b)=>{
        if(a.unit==='元'&&b.unit==='元'&&a.value>=0&&a.value<=b.value&&b.value>0)derived('关键投入采购占比',a.value/b.value*100,'%',{year:a.year,dimension:a.dimension},'关键投入采购额 / 同范围采购总额 × 100',[a.id,b.id]);
      });
    }
    if(role==='DEM'){
      copyMetrics(m=>['市场规模','新增并网装机','期末累计装机','发电量','销量','销量同比','国产化率'].includes(m.name));
      for(const o of (ledger.interim||[]).filter(o=>o.field==='纯电动汽车装车量占比')){
        rows.push({name:o.field,period:o.period,dimension:o.dimension,value:o.value,unit:o.unit,inputs:[o.id]});
      }
      for(const [name,n,d] of [['需求渗透率','已采用客户数','可比客户总数'],['客群销售额占比','客群销售额','同范围市场销售额'],['可及市场占比','可及市场销售额','同范围市场销售额']]){
        const count=n==='已采用客户数';
        pairs(n,d,(a,b)=>{
          if(a.unit===b.unit&&(count?['户','家','人'].includes(a.unit):a.unit==='元')&&a.value>=0&&a.value<=b.value&&b.value>0)
            derived(name,a.value/b.value*100,'%',{year:a.year,dimension:a.dimension},n+' / '+d+' × 100',[a.id,b.id]);
        });
        if(!rows.some(r=>r.name===name))missing.push(name+'需同期间同客群的'+n+'和'+d);
      }
    }
    if(role==='RC'||role==='RI'){
      const selected=role==='RC'?['DSO','毛利率','资产负债率','经营现金流与净利润比']:['销量同比','库存变化','产能利用率','CR5','行业价格同比'];
      for(const m of metrics.filter(m=>selected.includes(m.name)&&m.year===year)){
        if(ledger.conflicts.some(c=>c.dimension===m.dimension&&c.key.endsWith('|'+m.name)))continue;
        const prior=metrics.find(p=>p.name===m.name&&p.dimension===m.dimension&&p.year===year-1&&p.unit===m.unit);
        if(!prior)continue;
        derived(m.name+'年度变化',m.value-prior.value,m.unit==='%'?'百分点':m.unit,{year,dimension:m.dimension,prior:prior.value,current:m.value,indicator_formula:m.formula},'本期指标－上期同口径指标',[...prior.inputs,...m.inputs]);
      }
      for(const item of upstream){
        if(item.error||item.result?.status!=='complete')missing.push(item.from+' 回报覆盖不完整');
      }
      for(const conflict of ledger.conflicts)missing.push('待核对 '+conflict.key+' '+conflict.dimension);
      if(!rows.length)missing.push('缺连续可比记录，暂不能量化年度风险变化');
    }
    const ids=new Set(rows.flatMap(r=>r.inputs));
    const evidence=observations.concat(ledger.interim).filter(o=>o&&ids.has(o.id)).map(o=>o.field==='同业候选'?{id:o.id,source:o.source,year:o.year,field:o.field,unit:o.unit}:o);
    const sources={};
    for(const o of evidence)if(o.source)sources[o.source]=ledger.sources[o.source];
    return {operation:titles[role],years:ledger.years,rows,evidence,sources,missing};
  }
  return {titles,run};
})();
