const { test } = require('node:test')
const assert = require('node:assert/strict')
const vm = require('node:vm')
const path = require('node:path')
const { readFileSync } = require('node:fs')
const { createRequire } = require('node:module')
const ts = createRequire(path.resolve(__dirname, '../../apps/server/package.json'))('typescript')
function load(file, context = {}, dependencies = {}) {
  const compiled = ts.transpileModule(readFileSync(path.resolve(__dirname, '../../apps/mobile/src/lib/' + file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  vm.runInNewContext(compiled, { exports, require: name => dependencies[name], ...context })
  return exports
}
test('实际支付/上传 API 生命周期：并发完成一个操作不能误清空另一个租约，异常回调也释放', () => {
  const interceptors = {}, recorder = {}
  const code = load('critical-activities.ts', { uni: { addInterceptor: (name, hooks) => { interceptors[name] = hooks }, getRecorderManager: () => ({ onStart: fn => recorder.start = fn, onStop: fn => recorder.stop = fn, onError: fn => recorder.error = fn }) } })
  code.installCriticalActivityTracking()
  const first = {}, second = { complete: () => { throw new Error('模拟业务回调异常') } }, upload = {}
  interceptors.requestPayment.invoke(first); interceptors.requestPayment.invoke(second); interceptors.uploadFile.invoke(upload)
  first.complete()
  assert.deepEqual(Array.from(code.currentCriticalActivities()).sort(), ['payment', 'upload'])
  assert.throws(() => second.complete(), /业务回调/)
  assert.deepEqual(Array.from(code.currentCriticalActivities()), ['upload'])
  upload.complete(); recorder.start(); recorder.start()
  assert.deepEqual(Array.from(code.currentCriticalActivities()), ['recording'])
  recorder.error(); assert.equal(code.currentCriticalActivities().length, 0)
})
test('直接导航和冷启动深链拒绝新业务；实际 OBS 路由受控，历史订单/退款/客服/已购可读', () => {
  const interceptors = {}, redirects = [], features = new Set(), scheduled = []
  let firstPageChecks = 0
  const code = load('operation-routes.ts', { uni: { addInterceptor: (name, hooks) => interceptors[name] = hooks, showToast: () => {}, reLaunch: options => redirects.push(options.url) }, getCurrentPages: () => ++firstPageChecks > 1 ? [{}] : [], setTimeout: fn => scheduled.push(fn) }, { './remote-config': { isClientFeatureEnabled: key => features.has(key) } })
  code.installOperationRouteGuards('pkg-live/create/index?from=deep-link')
  for (const fn of scheduled) fn()
  assert.deepEqual(redirects, ['/pages/index/index'])
  for (const method of ['navigateTo', 'redirectTo', 'reLaunch']) {
    for (const route of ['/pkg-shop/checkout/index', '/pkg-merchant/apply/index', '/pkg-live/create/index', '/pkg-live/stream-config/index']) assert.equal(interceptors[method].invoke({ url: route + '?id=test' }), false)
    for (const route of ['/pkg-shop/orders/index', '/pkg-shop/refund/index', '/pkg-mine/customer-service/index', '/pkg-course/lesson/index']) assert.notEqual(interceptors[method].invoke({ url: route }), false)
  }
  features.add('live_start')
  assert.notEqual(interceptors.navigateTo.invoke({ url: '/pkg-live/create/index' }), false)
})
