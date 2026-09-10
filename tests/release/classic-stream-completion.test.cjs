const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
const ts = require('node:module').createRequire(require('node:path').resolve('apps/mobile/package.json'))('typescript');
function fixture(lines) {
  const m = { exports: {} };
  const body = new ReadableStream({ start(c) { for (const line of lines) c.enqueue(new TextEncoder().encode(line)); c.close(); } });
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('apps/server/src/modules/ai-gateway/adapters/deepseek.adapter.ts','utf8'), { compilerOptions: { module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true } }).outputText, {
    exports:m.exports, process:{env:{DEEPSEEK_API_KEY:'test'}}, AbortSignal, TextDecoder,
    fetch:async()=>({ok:true,body}),
    require:()=>({Injectable:()=>x=>x,Logger:class{warn(){}error(){}},BusinessException:class extends Error{constructor(code,message){super(message)}},ErrorCode:{THIRD_AI_FAILED:'FAILED'}}),
  });
  return new m.exports.DeepSeekAdapter();
}
const delta = 'data: {"choices":[{"delta":{"content":"译文"}}]}\n\n';
async function read(lines) { const out=[]; for await(const x of fixture(lines).chatStream('test',[],{requireCompleteStream:true})) out.push(x); return out.join(''); }
test('完整结束正常返回译文', async()=>assert.equal(await read([delta,'data: {"choices":[{"finish_reason":"stop"}]}\n\n','data: [DONE]\n\n']),'译文'));
test('达到输出上限不得作为成功',async()=>assert.rejects(read([delta,'data: {"choices":[{"finish_reason":"length"}]}\n\n','data: [DONE]\n\n']),/生成中断/));
test('连接结束但无完成标记不得作为成功',async()=>assert.rejects(read([delta]),/生成中断/));
test('仅收到DONE但无模型正常结束不得作为成功',async()=>assert.rejects(read([delta,'data: [DONE]\n\n']),/生成中断/));
