import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const archive=[];
function doc(key,id,publisher,title,published,url,rows,extra={}){
 archive.push({key,doc:{id,publisher,title,published,url,version:'经核对的文档快照',...extra},rows});
}
const group='动力电池',cabia='中国汽车动力电池产业创新联盟';
const digest=async n=>createHash('sha256').update(await fs.readFile('work/'+n+'.pdf')).digest('hex');
doc(group,'CABIA2603',cabia,'2026年3月动力电池月度信息','2026-04-30','https://www.jtcopper.com/wp-content/uploads/2026/04/2026年3月动力电池月度信息.pdf',[
 ...[[2023,616.3],[2024,791.3],[2025,1200.9]].map(([y,v])=>[y,'销量',v,'GWh','中国动力电池企业销量（含出口）','PDF第7页 / 动力和储能电池销量年度分项']),
 ...[[2024,548.4],[2025,769.7]].map(([y,v])=>[y,'装车量',v,'GWh','中国新能源汽车动力电池装车','PDF第19页 / 国内装车量年度对比']),
 ...[[2024,1096.8],[2025,1755.6]].map(([y,v])=>[y,'产量',v,'GWh','中国动力与储能电池合计','PDF第4页 / 总产量']),
 ...[['动力电池累计销量',291.9,'GWh',2],['国内累计装车量',124.9,'GWh',2],['装车CR5',81,'% ',22],['装车CR10',93.9,'%',22],['磷酸铁锂国内装车量',99,'GWh',20],['纯电动汽车装车量占比',81.6,'%',21]].map(([field,v,unit,p])=>[2026,field,v,unit.trim(),'中国动力电池 · 2026年第一季度','PDF第'+p+'页 / 一季度累计','2026-03-31'])
],{sha256:await digest('cabia'),limits:'协会署名报告，由第三方托管；封面仅标2026年4月，按月末保守准入，非确切发布日期'});
for(const [year,day,url,volume,price] of [
 [2023,'2024-03-01','https://wap.miit.gov.cn/gxsj/tjfx/dzxx/art/2024/art_7de3ac5f07514eec80039a81aa2e22d8.html',675,258000],
 [2024,'2025-02-27','https://www.miit.gov.cn/gyhxxhb/jgsj/dzxxs/dzjc/art/2025/art_b6fabc541b094897b3f27eea54981762.html',826,90000]
])doc(group,'MIIT'+year,'工信部电子信息司',year+'年全国锂离子电池行业运行情况',day,url,[
 [year,'产量',volume,'GWh','中国动力型锂电池','电池环节 / 分用途产量'],
 [year,'原料价格',price,'元/吨','中国电池级碳酸锂年度均价','二阶材料环节 / 碳酸锂均价（万元/吨×10000）']
]);
doc(group,'BNEF25','BloombergNEF','2025 Lithium-Ion Battery Price Survey','2025-12-09','https://about.bnef.com/insights/clean-transport/lithium-ion-battery-pack-prices-fall-to-108-per-kilowatt-hour-despite-rising-metal-prices-bloombergnef/',[[2025,'产品价格',84,'美元/kWh','中国地区锂电池包调查均价 · 多用途','公开调查说明 / Average battery pack prices by region']],{limits:'研究机构自有调查，不能用于推导单一企业售价或动力专属市场规模'});
doc(group,'GB38031','国家市场监督管理总局、国家标准化管理委员会','GB 38031-2025','2025-03-28','https://openstd.samr.gov.cn/bzgk/std/newGbInfo?hcno=3AB693FAFF5D9716DF61C61D6FD2187A',[[2025,'标准变化','GB 38031-2025《电动汽车用动力蓄电池安全要求》于2025-03-28发布，2026-07-01实施','文本','中国电动汽车用动力蓄电池','国家标准基本信息 / 发布日期、实施日期']]);
for(const [year,n,id,day,pCap,pCust,pRD,capacity,output,sales,prev,inv,top,supplier,rd] of [
 [2024,'catl24','1222806982','2025-03-15',21,23,206,676,516,475,390,106,134064232,16.33,18606756],
 [2025,'catl','1225002666','2026-03-09',27,29,206,772,748,661,475,186,165061533,10.38,22146581]
]){
 const sys='电池系统（合计）',loc=p=>'PDF第'+p+'页';
 const rows=[[year,'前五客户销售额',top*1000,'元','',loc(pCust)+' / 主要客户'],
 [year,'前五供应商采购占比',supplier,'%','',loc(pCust)+' / 主要供应商'],
 [year,'研发总投入',rd*1000,'元','',loc(pRD)+' / 研发支出合计'],
 [year,'费用化研发支出',rd*1000,'元','',loc(pRD)+' / 其中费用化研发支出'],
 [year,'有效产能',capacity,'GWh',sys,loc(pCap)+' / 产能（公司口径）'],
 [year,'实际产出',output,'GWh',sys,loc(pCap)+' / 实际产量'],
 [year,'销量',sales,'GWh',sys,loc(pCap)+' / 实物销售量'],
 [year-1,'销量',prev,'GWh',sys,loc(pCap)+' / 实物销售量比较列'],
 [year,'期末库存量',inv,'GWh',sys,loc(year===2025?28:21)+' / 产销存'],
 [year,'资金占用','公司披露报告期未发生控股股东及其他关联方非经营性占用资金','文本','',loc(year===2025?71:78)+' / 重要事项']];
 if(year===2025)rows.push([year,'担保',66683600e3,'元','',loc(88)+' / 期末实际担保余额A4+B4+C4'],
 [year,'坏账准备',2813422e3,'元','应收账款（合并）',loc(168)+' / 应收账款坏账准备期末余额'],
 [year,'存货跌价及合同履约成本减值准备',7716449e3,'元','',loc(173)+' / 期末余额合计'],
 [year,'债务到期结构','金融负债未折现合同现金流（千元）：一年内309676322，一至二年15525627，二至五年52882441，五年以上17714990。含经营性应付款。','文本','',loc(211)+' / 金融负债到期期限分析'],
 [year,'审计师变更','年度报告勾选未改聘会计师事务所','文本','',loc(72)+' / 是否改聘会计师事务所'],
 [year,'销量',541,'GWh','动力电池系统',loc(22)+' / 动力电池业务'],
 [year,'销量',121,'GWh','储能电池系统',loc(23)+' / 储能电池业务'],
 ...['VW','BMW','Stellantis','Volvo','DMG'].map(customer=>[year,'产业链关系',{from:'宁德时代',to:customer,type:'海外客户项目定点（未披露本项收入）'},'关系',customer,loc(23)+' / 海外市场定点情况']));
 doc('300750','CATL'+year,'宁德时代新能源科技股份有限公司',year+'年年度报告',day,'https://static.cninfo.com.cn/finalpage/'+day+'/'+id+'.PDF',rows,{sha256:await digest(n)});
}
await fs.writeFile('outputs/天枢工作台/source-snapshot.json',JSON.stringify(archive,null,2));
