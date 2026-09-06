import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const ts = createRequire(resolve('apps/mobile/package.json'))('typescript')
function fixture() {
  let token = 'local', calls = 0, answer = async () => ({ allowed: true })
  const exports = {}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('apps/mobile/src/lib/paipan-suite-navigation.ts', 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, require: name => name.includes('storage') ? { getToken: () => token }
      : { legacyPaipanApi: { nativeQaAccess: () => { calls++; return answer() } } },
  })
  return { ...exports, calls: () => calls, token: value => { token = value }, answer: value => { answer = value } }
}
test('整套三个分包同一核验，共用罗盘与其他板块无请求', async () => {
  const f = fixture()
  for (const route of ['/pkg-common/compass/index', '/pkg-paipan3/luopan/index', '/pkg-common/legacy-paipan/index', '/pages/circles/index']) {
    assert.equal(await f.resolvePaipanSuiteNavigation(route), route)
  }
  assert.equal(f.calls(), 0)
  for (const route of ['/pkg-paipan/bazi/index', '/pkg-paipan2/liuyao/index', '/pkg-paipan3/bazhai/index']) {
    assert.equal(await f.resolvePaipanSuiteNavigation(route), route)
  }
  assert.equal(f.calls(), 3)
})
test('拒绝及网络失败回整套承接页，无token不调用接口', async () => {
  const f = fixture(), route = '/pkg-paipan/bazi/index?private=not-forwarded'
  for (const answer of [async () => ({ allowed: false }), async () => ({ allowed: 'true' }), async () => { throw Error('offline') }]) {
    f.answer(answer); assert.equal(await f.resolvePaipanSuiteNavigation(route), '/pages/paipan/index')
  }
  const before = f.calls(); f.token('')
  assert.equal(await f.resolvePaipanSuiteNavigation(route), '/pages/paipan/index'); assert.equal(f.calls(), before)
})
test('请求期间换账号不能继续进入原目标', async () => {
  const f = fixture(); let finish
  f.answer(() => new Promise(resolve => { finish = resolve }))
  const pending = f.resolvePaipanSuiteNavigation('/pkg-paipan/bazi/index')
  f.token('changed'); finish({ allowed: true })
  assert.equal(await pending, '/pages/paipan/index')
})

const flush = () => new Promise(resolve => setImmediate(resolve))
test('切换非排盘页面后旧响应只取消，不劫持页面；完成回调一次', async () => {
  const f = fixture(); let finish; const resumed = [], errors = [], completed = []
  f.answer(() => new Promise(resolve => { finish = resolve }))
  assert.equal(f.interceptPaipanNavigation({ url: '/pkg-paipan/bazi/index', fail: e => errors.push(e), complete: e => completed.push(e) }, a => resumed.push(a)), false)
  assert.equal(f.interceptPaipanNavigation({ url: '/pages/circles/index' }, a => resumed.push(a)), undefined)
  finish({ allowed: true }); await flush()
  assert.equal(resumed.length, 0); assert.equal(errors.length, 1); assert.equal(completed.length, 1)
})
test('获准仅恢复一次，同进程单次凭据不重复核验或允许复用', async () => {
  const f = fixture(), resumed = []
  f.interceptPaipanNavigation({ url: '/pkg-paipan/bazi/index' }, a => resumed.push(a)); await flush()
  assert.equal(resumed.length, 1); const copied = { ...resumed[0] }
  assert.equal(f.interceptPaipanNavigation(resumed[0], () => {}), undefined)
  assert.equal(f.calls(), 1)
  assert.equal(f.interceptPaipanNavigation(copied, () => {}), false)
  await flush(); assert.equal(f.calls(), 2)
})
test('返回或应用隐藏使在途跳转失效，恢复异常也通知失败而不重试', async () => {
  const f = fixture(); let finish; let resumed = 0, failed = 0
  f.answer(() => new Promise(resolve => { finish = resolve }))
  f.interceptPaipanNavigation({ url: '/pkg-paipan/bazi/index', fail: () => failed++ }, () => resumed++)
  f.invalidatePaipanNavigation(); finish({ allowed: true }); await flush()
  assert.equal(resumed, 0); assert.equal(failed, 1)
  f.answer(async () => ({ allowed: true }))
  f.interceptPaipanNavigation({ url: '/pkg-paipan/bazi/index', fail: () => failed++ }, () => { throw Error('resume') })
  await flush(); assert.equal(failed, 2)
})

test('实际uni-H5拦截器队列：暂停后恢复仅调用一次原API与成功回调', async () => {
  const f = fixture(), called = []; let success = 0, complete = 0
  const runtime = fs.readFileSync('apps/mobile/node_modules/@dcloudio/uni-h5/dist/uni-h5.es.js', 'utf8')
  const start = runtime.indexOf('function wrapperHook('), end = runtime.indexOf('function hasCallback(', start)
  assert.ok(start >= 0 && end > start, '依赖运行时结构变化时须重新核验，不能静默跳过')
  const context = {
    globalInterceptors: {}, scopedInterceptors: {},
    HOOK_SUCCESS: 'success', HOOK_FAIL: 'fail', HOOK_COMPLETE: 'complete',
    isArray: Array.isArray, isFunction: value => typeof value === 'function',
    isPromise: value => !!value && typeof value.then === 'function',
  }
  vm.createContext(context); vm.runInContext(runtime.slice(start, end), context)
  const original = args => { called.push(args.url); args.success?.({}); args.complete?.({}) }
  const invoke = args => context.invokeApi('navigateTo', original, { ...args }, [])
  context.scopedInterceptors.navigateTo = { invoke: [args => f.interceptPaipanNavigation(args, invoke)] }
  invoke({ url: '/pkg-paipan/bazi/index', success: () => success++, complete: () => complete++ })
  assert.equal(called.length, 0)
  await flush()
  assert.deepEqual(called, ['/pkg-paipan/bazi/index']); assert.equal(f.calls(), 1)
  assert.equal(success, 1); assert.equal(complete, 1)
})
