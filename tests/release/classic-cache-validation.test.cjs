const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ts=require('node:module').createRequire(require('node:path').resolve('apps/mobile/package.json'))('typescript');
const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('apps/server/src/modules/ai-gateway/ai-gateway.service.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText,{exports:m.exports,require:()=>({Injectable:()=>x=>x,Logger:class{debug(){}warn(){}},AiTimeoutError:Error})});
function fixture(cached,answer){let calls=0,writes=0;const adapter={chat:async()=>{calls++;return {content:answer}}};const noop={setGateway(){}};const g=new m.exports.AiGatewayService({resolve:async()=>({model:'test',provider:'deepseek',options:{}})},{log:async()=>{}},{lookup:async()=>cached,store:async()=>{writes++}},adapter,adapter,adapter,adapter,{recordAiCall(){},recordSemanticCacheHit(){}},noop,noop);return {g,calls:()=>calls,writes:()=>writes};}
const req={scene:'classic_translate',messages:[{role:'user',content:'原文段落'}],validateContent:x=>x==='合格'};
test('无效缓存不复用，新合格结果可缓存',async()=>{const f=fixture('坏缓存','合格');assert.equal((await f.g.chat(req)).content,'合格');assert.equal(f.calls(),1);assert.equal(f.writes(),1)});
test('新无效结果不写缓存',async()=>{const f=fixture(null,'不完整');await f.g.chat(req);assert.equal(f.writes(),0)});
test('合格缓存不重复生成',async()=>{const f=fixture('合格','无用');await f.g.chat(req);assert.equal(f.calls(),0)});
