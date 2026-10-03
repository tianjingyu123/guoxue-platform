const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
const ts = require('node:module').createRequire(require('node:path').resolve('apps/mobile/package.json'))('typescript');
function load(path, name) {
  const m = { exports: {} };
  const mocks = new Proxy({ Logger: class {}, RedLine: {}, ErrorCode: { RATE_LIMITED: 'LIMIT' }, BusinessException: class extends Error { constructor(code, message) { super(message); } } }, { get: (o,k) => k in o ? o[k] : () => () => {} });
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'), { compilerOptions: { module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true } }).outputText, { exports:m.exports, require:()=>mocks, process:{env:{}}, Date });
  return m.exports[name];
}
const Controller = load('apps/server/src/modules/classic/classic.controller.ts','ClassicController');
const Benefit = load('apps/server/src/modules/member/member-benefit.service.ts','MemberBenefitService');
function fixture(fail=false, disconnected=false) {
  let count=0, refunds=0;
  const benefit=new Benefit({user:{findUnique:async()=>({memberLevel:'NONE'})}}, {get:async()=>null,incrWithTtl:async()=>({count:++count}),refundCounter:async()=>{count--;refunds++;}});
  const op=async()=>{if(fail) throw Error('模型失败');return '回答';};
  const companion={chat:op,async *chatStream(){yield '首段';if(fail) throw Error('断流');yield '末段';}};
  const sse={async writeSseStream(res,source){for await(const chunk of source){}}};
  return { controller:new Controller({dictionaryLookup:op,askClassic:op},null,null,companion,benefit,sse), state:()=>({count,refunds}), res:{destroyed:disconnected} };
}
for(const method of ['dictionaryLookup','ask','companionChat']) {
  test(method+'失败退额，成功仅扣一次',async()=>{
    const failed=fixture(true);
    await assert.rejects(failed.controller[method]({user:{id:'qa'}},{}),/模型失败/);
    assert.deepEqual(failed.state(),{count:0,refunds:1});
    const good=fixture();await good.controller[method]({user:{id:'qa'}},{});
    assert.deepEqual(good.state(),{count:1,refunds:0});
  });
}
test('伴读流式部分输出后异常退额',async()=>{
  const f=fixture(true);await assert.rejects(f.controller.companionChatStream({user:{id:'qa'}},f.res,{}),/断流/);
  assert.deepEqual(f.state(),{count:0,refunds:1});
});
test('伴读用户断开退额，完整成功扣一次',async()=>{
  const f=fixture(false,true);await assert.rejects(f.controller.companionChatStream({user:{id:'qa'}},f.res,{}),/连接已断开/);
  assert.deepEqual(f.state(),{count:0,refunds:1});
  const good=fixture();await good.controller.companionChatStream({user:{id:'qa'}},good.res,{});
  assert.deepEqual(good.state(),{count:1,refunds:0});
});
