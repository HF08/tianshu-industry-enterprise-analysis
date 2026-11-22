import assert from 'node:assert/strict';
import http from 'node:http';import {once} from 'node:events';
import {modelRequest,streamUpstream} from '../outputs/Tianshu-Monitor/provider.mjs';
const official=modelRequest({model:'DeepSeek-V4.1-Flash-1017',reasoningEffort:'max'},new URL('https://api.deepseek.com/v1'));
assert.equal(official.model,'deepseek-flash');assert.deepEqual(official.options,{reasoning_effort:'max',thinking:{type:'enabled'}});
let bodies=[];const server=http.createServer(async(req,res)=>{let text='';for await(const chunk of req)text+=chunk;const b=JSON.parse(text);bodies.push(b);
let error=b.stream_options?'unsupported stream_options':b.thinking?'unknown thinking parameter':null;
if(error){res.writeHead(422).end(JSON.stringify({error:{message:error}}));return;}
res.writeHead(200,{'content-type':'text/event-stream'}).end('data: [DONE]\n\n');});
server.listen(0,'127.0.0.1');await once(server,'listening');
try{const base='http://127.0.0.1:'+server.address().port;const r=await streamUpstream(base,{}, {model:'gateway/DeepSeek-V4.1-Flash',apiKey:'test',reasoningEffort:'max'},[],new AbortController().signal);
assert.equal(r.response.status,200);assert.equal(bodies.length,3);assert.ok(bodies.every(b=>b.reasoning_effort==='max'&&b.model==='gateway/DeepSeek-V4.1-Flash'));
console.log('PASS official alias and max payload; compatible gateway parameter negotiation preserves max');
}finally{server.close();}
