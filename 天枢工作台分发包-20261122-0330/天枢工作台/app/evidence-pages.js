window.evidencePages=(()=>{
 const cache=new WeakMap();
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function safe(v){try{const u=new URL(v);if(!['http:','https:'].includes(u.protocol)||u.username||u.password||[...u.searchParams.keys()].some(k=>/key|token|secret|signature|password/i.test(k)))return '';return u.href;}catch{return '';}}
 const external=(u,t)=>safe(u)?'<a href="'+esc(safe(u))+'" target="_blank" rel="noopener noreferrer">'+esc(t)+'</a>':esc(t);
 const interfaces=[
 ['合并三表、产品分部、同行样本及宏观指标','东方财富数据中心','https://data.eastmoney.com/','公开查询；本轮实际请求按表名列在下方。'],
 ['年报主体检索、公告目录及原文','巨潮资讯','https://www.cninfo.com.cn/','检索接口使用 POST；通过公告网页查找证券和年报。'],
 ['行业财务统计','国家统计局','https://www.stats.gov.cn/sj/','规模以上企业，按统计分类匹配。'],
 ['行业产量与原材料','工业和信息化部','https://www.miit.gov.cn/gxsj/','行业公报和已核验快照。'],
 ['光伏装机与发电','国家能源局','https://www.nea.gov.cn/','新增、累计、发电量分别计量。'],
 ['乘用车产销','乘联分会','https://data.cpcadata.com/TotalMarket','月度生产、零售、出口。'],
 ['商品进出口','UN Comtrade','https://comtradeplus.un.org/','按 HS 商品编码、流向和实物量查询。'],
 ['制造业增加值','世界银行','https://data.worldbank.org/indicator/NV.IND.MANF.CN','当年价本币。'],
 ['模型清单及流式生成','DeepSeek Responses 文档','https://api-docs.deepseek.com/guides/responses_api/','服务商与模型由使用者配置。']
 ];
 function make(title,body){return URL.createObjectURL(new Blob(['<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+'</title><style>body{margin:auto;max-width:970px;padding:4vh 5vw;font:15px/1.75 system-ui;color:#331c29;background:#fff}h1{border-bottom:3px solid #8c2857}a{color:#862956}article{padding:12px 0;border-bottom:1px solid #e7cbd6}small{color:#765469}p{margin:.35em 0}code{overflow-wrap:anywhere}h3{margin:0}</style><h1>'+esc(title)+'</h1>'+body+'</html>'],{type:'text/html;charset=utf-8'}));}
 function describe(id,s){return '<article><h3>'+external(s.url||s.url_or_document||s.url_or_document_id,s.title||s.table||s.publisher||id)+'</h3><p>'+esc([s.publisher,s.published||s.updated,s.period,s.scope,s.locator].filter(Boolean).join(' · '))+'</p>'+(!safe(s.url||s.url_or_document||s.url_or_document_id)?'<small>仅登记本地资料；无公开网址。 '+esc(s.url_or_document||id)+'</small>':'')+(s.excerpt?'<blockquote>'+esc(s.excerpt)+'</blockquote>':'')+'</article>';}
 function links(key,ledger,target,snapshot,asOf){
  if(!key||!ledger)return [];if(cache.has(key))return cache.get(key);
  const docs=Object.entries(ledger.sources||{});const head='<p>'+esc(target)+' · 资料截止 '+esc(asOf)+'</p>';
  const digest=make('研究快照',head+'<p>快照编号 <code>'+esc(snapshot)+'</code></p><p>检索时间 '+esc(ledger.retrieved_at||'未登记')+'</p><p>报告年度 '+esc((ledger.years||[]).join('、'))+'</p>'+ (ledger.metrics||[]).map(r=>'<article><h3>'+esc(r.name)+' · '+esc(r.year)+'</h3><p>'+esc(r.value)+' '+esc(r.unit)+' · '+esc(r.dimension||target)+'</p><small>'+esc(r.formula&&r.formula!==r.name?'口径：'+r.formula:'输入：'+(r.inputs||[]).join('、'))+'</small></article>').join(''));
  const sources=make('数据来源',head+docs.map(([id,s])=>describe(id,s)).join(''));
  const actual=new Map();for(const [,s] of docs){for(const u of [s.url,s.classification])if(safe(u))actual.set(safe(u),s.table||s.title||s.publisher);}
  const apis=make('全部接口',head+'<h2>工作台接口说明</h2><p>POST /api/models 获取模型列表；POST /api/stream 转发模型输出；POST /api/kernel 运行计算内核。下列网页供浏览，不携带密钥。</p>'+interfaces.map(([t,n,u,note])=>'<article><strong>'+esc(t)+'</strong> · '+external(u,n)+'<p>'+esc(note)+'</p></article>').join('')+'<h2>本轮登记的查询链接与原文</h2>'+[...actual].map(([u,n])=>'<p>'+external(u,n||u)+'</p>').join(''));
  const result=[['快照',digest],['数据来源',sources],['全部接口',apis]];cache.set(key,result);return result;
 }
 function nav(parent,key,ledger,target,snapshot,asOf){const n=document.createElement('nav');n.className='evidence-page-links';for(const [t,u] of links(key,ledger,target,snapshot,asOf)){const a=document.createElement('a');a.textContent=t+' ↗';a.href=u;a.target='_blank';a.rel='noopener noreferrer';n.append(a);}parent.append(n);}
 return {safe,nav};
})();
