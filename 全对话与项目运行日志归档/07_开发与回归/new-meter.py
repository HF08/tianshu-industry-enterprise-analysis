from pathlib import Path
d=Path('work/new-report-base/天枢团队审查包/天枢工作台')
p=d/'server.mjs';s=p.read_text('utf-8');s=s.replace("'board-example.json','research-report.js'","'board-example.json','telemetry.js','research-report.js'").replace("const effort=config.reasoningEffort||'default';","""const official=url.hostname==='api.deepseek.com';
    const model=official&&/^deepseek[ _-]*v?4[._-]1[ _-]*flash(?:[ _-]*1017)?$/i.test(config.model)?'deepseek-flash':config.model;
    const effort=config.reasoningEffort||'default';""").replace("effort==='max'&&url.hostname!=='api.deepseek.com'?'xhigh':effort","official&&effort==='xhigh'?'max':!official&&effort==='max'?'xhigh':effort").replace("model:config.model,stream:true","model,stream:true").replace("'X-Accel-Buffering':'no'","'X-Accel-Buffering':'no','X-Context-Limit':official&&['deepseek-flash','deepseek-v4-pro','deepseek-v4-flash'].includes(model)?'1000000':'unknown'")
s=s.replace("if(action==='plan')", """if(action==='report')system+=' 正文用自然的研究文章表达，结论与风险每项各一段，避免清单式汇报或字段名。请在text和counter中用{{D编号}}代替每一个引用的实际指标数值，宿主将渲染数值及单位。如“2025年营业收入为{{D12}}，2024年为{{D6}}。”编号只能取本句refs所列；变量即带单位的数值，不要重复单位。避免裸写D编号；年份与计算差额可直接书写。禁止将销量与装车差额归因为出口、库存或储能；构成未经证实就明确写待核实。';
    if(action==='plan')""");p.write_text(s,'utf-8')
p=d/'app/index.html';s=p.read_text('utf-8');s=s.replace('<option value="https://api.openai.com/v1">','<option value="https://api.deepseek.com">DeepSeek 官方</option><option value="https://api.openai.com/v1">').replace("var levels=['default','low','medium','high','xhigh'];","var highest=addr?.hostname==='api.deepseek.com'?'max':'xhigh';var levels=highest==='max'?['default','low','high','max']:['default','low','medium','high','xhigh'];").replace("preferred==='max'?'xhigh':","['xhigh','max'].includes(preferred)?highest:").replace('<div class="st-wait"','<canvas id="st-wave" width="240" height="32" aria-label="近三十秒响应流量"></canvas><div class="st-wait"').replace('<script src="team.js">','<script src="telemetry.js"></script><script src="team.js">')
p.write_text(s,'utf-8')
p=d/'app/telemetry.js';s=Path('outputs/Tianshu-Monitor/app/telemetry.js').read_text('utf-8-sig')
a=s.index('        if(e.usage)');b=s.index('        const sec=',a)
s=s[:a]+"""        const u=e.response?.usage||e.usage;
        if(u){usage.prompt_tokens=u.input_tokens??usage.prompt_tokens;usage.completion_tokens=u.output_tokens??usage.completion_tokens;usage.total_tokens=u.total_tokens??usage.total_tokens;usage.prompt_cache_hit_tokens=u.input_tokens_details?.cached_tokens??u.prompt_cache_hit_tokens??usage.prompt_cache_hit_tokens;}
        if(number(usage.completion_tokens))token.count=usage.completion_tokens;
        const length=typeof e.delta==='string'&&/^response\\.(output_text|reasoning_text|reasoning_summary_text)\\.delta$/.test(e.type)?[...e.delta].length:0;
"""+s[b:];p.write_text(s,'utf-8')
p=d/'app/team.js';s=p.read_text('utf-8').replace('current=sessions.get(item);','current=sessions.get(item);window.modelMeter.select(current);');a=s.index("    const response=await fetch('/api/stream'");s=s[:a]+s[a:].replace("    const response=await fetch('/api/stream'","    const meter=window.modelMeter.start(s,s.config.model);try{\n    const response=await fetch('/api/stream'",1).replace('    if(!response.ok)','    meter.headers(response);\n    if(!response.ok)',1).replace('const event=JSON.parse(data), type=event.type||name;','const event=JSON.parse(data), type=event.type||name;meter.event(event);',1)
a=s.index('    return content;',a)+len('    return content;');s=s[:a]+'\n    }finally{meter.end();}'+s[a:]
p.write_text(s,'utf-8')
p=d/'app/research-board.js';s=p.read_text('utf-8').replace("CHAIN:'原料价格'","CHAIN:'代表企业样本营收占比',COMP:'同业候选营收相对倍数'");p.write_text(s,'utf-8')
