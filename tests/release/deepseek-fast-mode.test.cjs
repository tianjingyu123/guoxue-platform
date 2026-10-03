const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ts=require('node:module').createRequire(require('node:path').resolve('apps/mobile/package.json'))('typescript');
function setup(){const requests=[];const m={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('apps/server/src/modules/ai-gateway/adapters/deepseek.adapter.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText,{exports:m.exports,process:{env:{DEEPSEEK_API_KEY:'test'}},AbortSignal,TextDecoder,
require:()=>({Injectable:()=>x=>x,Logger:class{warn(){}error(){}},BusinessException:Error,ErrorCode:{}}),
fetch:async(url,init)=>{requests.push(JSON.parse(init.body));return {ok:true,json:async()=>({choices:[{message:{content:'译文'},finish_reason:'stop'}]}),body:new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"译文"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n'));c.close()}})}}});
return {adapter:new m.exports.DeepSeekAdapter(),requests};}
test('流式及非流式请求显式关闭思考且保留模型和预算',async()=>{const {adapter,requests}=setup();await adapter.chat('deepseek-v4-flash',[],{maxTokens:1536});for await(const x of adapter.chatStream('deepseek-v4-flash',[],{maxTokens:1536,requireCompleteStream:true})){}assert.equal(requests.length,2);for(const r of requests){assert.equal(r.thinking.type,'disabled');assert.equal(r.model,'deepseek-v4-flash');assert.equal(r.max_tokens,1536)}});
