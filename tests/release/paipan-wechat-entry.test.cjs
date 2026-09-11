const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('node:module').createRequire(require('node:path').resolve('apps/mobile/package.json'))('typescript');
const src = fs.readFileSync('apps/mobile/src/pages/paipan/index.vue', 'utf8');
const method = src.slice(src.indexOf('async function loadPaipanEntry()'), src.indexOf('function openLoginForPaipan()'));
async function run({target = 'tool', mode = 'legacy', error, url = 'https://www.yrydai.cn/guoxueApp.php?go=tool&sign=test'} = {}) {
  const calls = [], staged = [], navigated = [];
  const entry = async (kind) => { calls.push(kind); if (error) throw Error(error); return {mode:'legacy', url}; };
  const c = {entryTarget:target, entryStationId:'s', nativeQaRequested:false,
    hydratePaipanRuntime:async()=>mode, getFavorites:()=>[], loadPlatformAgents:async()=>{},
    stageLegacyPaipanEntry:e=>staged.push(e), uni:{navigateTo:e=>navigated.push(e.url)},
    legacyPaipanApi:{entry:()=>entry('tool'), account:()=>entry('account'), stationEntry:()=>entry('station')}};
  for (const k of ['entryLoading','entryError','allowNative','qaNotFound','loginRequired','favIds','legacyRouting']) c[k]={value:null};
  vm.runInNewContext(ts.transpileModule(method+';globalThis.run=loadPaipanEntry', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,c);
  await c.run(); return {c,calls,staged,navigated};
}
test('普通入口经过服务端登录校验并保留签名地址', async()=>{
  const r=await run(); assert.deepEqual(r.calls,['tool']); assert.match(r.staged[0].url,/guoxueApp.php\?go=tool&sign=test$/);
  assert.deepEqual(r.navigated,['/pkg-common/legacy-paipan/index']); assert.equal(r.c.entryError.value,'');
});
test('未绑定手机可使用服务端返回的网页授权入口',async()=>{
  const r=await run({url:'https://www.yrydai.com/p1.php'}); assert.equal(r.staged[0].url,'https://www.yrydai.com/p1.php'); assert.equal(r.c.entryError.value,'');
});
test('未登录不能绕过服务端直接访问旧站',async()=>{
  const r=await run({error:'未登录'}); assert.equal(r.c.loginRequired.value,true); assert.equal(r.staged.length,0); assert.deepEqual(r.navigated,[]);
});
test('状态未确认不打开旧站',async()=>{const r=await run({mode:'unknown'});assert.deepEqual(r.calls,[]);assert.match(r.c.entryError.value,/状态暂时无法确认/)});
test('原生模式保留原生入口',async()=>{const r=await run({mode:'native'});assert.deepEqual(r.calls,[]);assert.equal(r.c.allowNative.value,true)});
test('个人中心和分站分别调用对应接口，保留分站推荐参数',async()=>{
  assert.deepEqual((await run({target:'account'})).calls,['account']);
  const r=await run({target:'station',url:'https://www.yrydai.com/p1.php?ruid=123'});assert.deepEqual(r.calls,['station']);assert.equal(r.staged[0].url,'https://www.yrydai.com/p1.php?ruid=123');
});
test('错误地址不可打开，入口页不整页外跳',async()=>{
  const r=await run({url:'javascript:alert(1)'}); assert.deepEqual(r.navigated,[]);assert.match(r.c.entryError.value,/未正确配置/);assert.doesNotMatch(method,/window\.location|legacyWechatToolUrl/);
});
