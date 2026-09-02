import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import test from 'node:test'

const source = fs.readFileSync('apps/mobile/src/lib/legacy-paipan-payment.ts', 'utf8')
const page = fs.readFileSync('apps/mobile/src/pkg-common/legacy-paipan/index.vue', 'utf8')
const preload = fs.readFileSync('apps/mobile/src/static/legacy-paipan-preload.js', 'utf8')
const ts = createRequire(resolve('apps/mobile/package.json'))('typescript')
const compile = (text) => ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText
const plain = (value) => JSON.parse(JSON.stringify(value))
// 全部为合成测试字段，不请求真实订单、不调原生支付、不触发资金交易。
const signedFixture = () => ({ partnerId: '1234567890', prepayId: 'wx_test_order_1', timeStamp: '1788393600', nonceStr: 'fixtureNonce1', sign: 'A'.repeat(32) })

function runtime(overrides = {}, clocks = {}) {
  const calls = []
  const uni = {
    getSystemInfoSync: () => ({ platform: 'android' }),
    getProvider: (options) => { calls.push(['provider']); options.success({ provider: ['wxpay', 'appleiap'] }) },
    request: (options) => { calls.push(['request', options]); options.success({ statusCode: 200, data: signedFixture() }) },
    requestPayment: (options) => { calls.push(['native', options]); options.success({}) },
    ...overrides,
  }
  const exports = {}
  vm.runInNewContext(compile(source), { exports, uni, setTimeout, clearTimeout, ...clocks })
  return { api: exports, uni, calls }
}

test('旧排盘订单、收款和权益与新商城及 Apple 内购代码隔离', () => {
  assert.doesNotMatch(source, /from\s+['"]|apiGet\(|shopApi|\/shop\/|appleiap|verifyPurchase|setStorage|console\./u)
  assert.match(source, /https:\/\/www\.rebu\.net\.cn\/app\/getTrade\.php/u)
  const sdk = JSON.parse(fs.readFileSync('apps/mobile/src/manifest.json', 'utf8'))['app-plus'].distribute.sdkConfigs
  assert.equal(runtime().api.LEGACY_PAYMENT_APP_ID, sdk.payment.weixin.appid)
  assert.ok(sdk.payment.appleiap, '新系统 Apple 支付保持不变')
  assert.match(page, /\/\/ #ifdef APP-PLUS\s+import .*legacy-paipan-payment'\s+\/\/ #endif/u)
})

test('桥只接受一项合法交易号，不允许注入金额、商户或另一个支付接口', () => {
  const { api } = runtime()
  assert.equal(api.parseLegacyPaymentBridgeUrl('rebu://legacy-payment?trade_no=legacy-123_ABC'), 'legacy-123_ABC')
  for (const value of [
    'https://legacy-payment?trade_no=1', 'rebu://legacy-payment?trade_no=',
    'rebu://legacy-payment?trade_no=1&amount=1', 'rebu://legacy-payment?trade_no=1#fragment',
    'rebu://legacy-payment?trade_no=1&url=https://untrusted.example',
    'rebu://legacy-payment?trade_no=%22', 'rebu://legacy-payment?trade_no=' + 'a'.repeat(129),
  ]) assert.equal(api.parseLegacyPaymentBridgeUrl(value), null, value)
})

for (const platform of ['android', 'ios']) {
  test(`${platform} 使用旧 guoxue 接口和微信原生支付，不创建新订单`, async () => {
    const { api, calls } = runtime({ getSystemInfoSync: () => ({ platform }) })
    const result = await api.payLegacyPaipanOrder('legacy-order-1', { canProceed: () => true, beforeNativePay: () => calls.push(['beforeNative']) })
    assert.equal(result, 'submitted', 'SDK 成功只能标记提交，不能标记到账')
    assert.deepEqual(calls.map(([name]) => name), ['provider', 'request', 'beforeNative', 'native'])
    const request = calls[1][1]
    assert.equal(request.url, 'https://www.rebu.net.cn/app/getTrade.php')
    assert.equal(request.method, 'GET')
    assert.equal(request.timeout, 10000)
    assert.deepEqual(plain(request.data), { app: 'guoxue', trade_no: 'legacy-order-1' })
    assert.deepEqual(plain(request.header), { Accept: 'application/json' }, '不得携带新系统令牌')
    const native = calls[3][1]
    assert.equal(native.provider, 'wxpay')
    assert.deepEqual(plain(native.orderInfo), {
      appid: api.LEGACY_PAYMENT_APP_ID, partnerid: '1234567890', prepayid: 'wx_test_order_1',
      timestamp: '1788393600', noncestr: 'fixtureNonce1', sign: 'A'.repeat(32), package: 'Sign=WXPay',
    })
  })
}

test('SDK 不可用、非 App 平台或页面过期时，不访问旧收款接口', async () => {
  for (const overrides of [
    { getSystemInfoSync: () => ({ platform: 'web' }) },
    { getProvider: (options) => options.success({ provider: ['appleiap'] }) },
    { getProvider: (options) => options.fail({ errMsg: 'private error detail' }) },
    { getProvider: () => { throw new Error('private error detail') } },
  ]) {
    const { api, calls } = runtime(overrides)
    await assert.rejects(api.payLegacyPaipanOrder('order1', { canProceed: () => true }), (error) => error.code === 'UNAVAILABLE' && !error.message.includes('private'))
    assert.equal(calls.filter(([name]) => name === 'request' || name === 'native').length, 0)
  }
  const { api, calls } = runtime()
  await assert.rejects(api.payLegacyPaipanOrder('order1', { canProceed: () => false }), (error) => error.code === 'STALE_PAGE')
  assert.equal(calls.length, 0)
})

test('SDK 查询超时后忽略迟到成功，不发起旧订单请求', async () => {
  let timer
  let provider
  const { api, calls } = runtime({ getProvider: (options) => { provider = options } }, { setTimeout: (callback) => { timer = callback; return 1 }, clearTimeout: () => {} })
  const pending = api.payLegacyPaipanOrder('order1', { canProceed: () => true })
  timer()
  await assert.rejects(pending, (error) => error.code === 'UNAVAILABLE')
  provider.success({ provider: ['wxpay'] })
  assert.equal(calls.length, 0)
})

test('HTTP 非200、非JSON、签名不完整或应用不匹配时拒绝调微信', async () => {
  const cases = [
    { statusCode: 403, data: signedFixture() }, { statusCode: 200, data: '<html>login</html>' },
    ...[null, [], {}, { ...signedFixture(), appid: 'wxWrongApp' },
      { ...signedFixture(), appId: 'wxWrongApp' }, { ...signedFixture(), package: 'arbitrary' },
      { ...signedFixture(), partnerId: 'not-a-merchant' }, { ...signedFixture(), prepayId: 'https://bad' },
      { ...signedFixture(), nonceStr: 'a'.repeat(33) }, { ...signedFixture(), sign: '' },
      { ...signedFixture(), timeStamp: 'invalid' }].map((data) => ({ statusCode: 200, data })),
  ]
  for (const response of cases) {
    const { api, calls } = runtime({ request: (options) => options.success(response) })
    await assert.rejects(api.payLegacyPaipanOrder('order1', { canProceed: () => true }), (error) => error.code === 'INVALID_RESPONSE')
    assert.equal(calls.some(([name]) => name === 'native'), false)
  }
})

test('网络失败只返回固定中文错误，不泄露服务端响应或签名', async () => {
  for (const request of [
    (options) => options.fail({ errMsg: 'TOKEN_SECRET_FIXTURE' }),
    () => { throw new Error('TOKEN_SECRET_FIXTURE') },
  ]) {
    const { api } = runtime({ request })
    await assert.rejects(api.payLegacyPaipanOrder('order1', { canProceed: () => true }), (error) => error.code === 'INVALID_RESPONSE' && !error.message.includes('TOKEN_SECRET_FIXTURE'))
  }
})

test('重复点击被互斥，旧参数请求和原生支付都只发起一次', async () => {
  let finish
  const { api, calls } = runtime({ requestPayment: (options) => { calls.push(['native']); finish = options.success } })
  const first = api.payLegacyPaipanOrder('order1', { canProceed: () => true })
  await new Promise((resolve) => setImmediate(resolve))
  await assert.rejects(api.payLegacyPaipanOrder('order1', { canProceed: () => true }), (error) => error.code === 'BUSY')
  assert.equal(calls.filter(([name]) => name === 'request').length, 1)
  assert.equal(calls.filter(([name]) => name === 'native').length, 1)
  finish({})
  assert.equal(await first, 'submitted')
})

test('取旧订单参数途中换页，不再调起微信', async () => {
  let current = true
  const { api, calls } = runtime({ request: (options) => { current = false; options.success({ statusCode: 200, data: signedFixture() }) } })
  await assert.rejects(api.payLegacyPaipanOrder('order1', { canProceed: () => current }), (error) => error.code === 'STALE_PAGE')
  assert.equal(calls.some(([name]) => name === 'native'), false)
})

test('取消和未知结果分别反馈，不伪造支付成功，也不自动再付一次', async () => {
  for (const [failure, expected] of [
    [{ errCode: -2 }, 'cancelled'], [{ errMsg: 'requestPayment:fail cancel' }, 'cancelled'],
    [{ errCode: -1, errMsg: 'signed private response' }, 'unconfirmed'],
  ]) {
    let requests = 0
    const { api } = runtime({ requestPayment: (options) => { requests += 1; options.fail(failure) } })
    assert.equal(await api.payLegacyPaipanOrder('order1', { canProceed: () => true }), expected)
    assert.equal(requests, 1)
  }
})

test('旧页只刷新自己的订单，不调用 payOk 或修改新旧会员状态', () => {
  const { api } = runtime()
  let queried = 0
  let reloaded = 0
  const location = { reload: () => { reloaded += 1 } }
  vm.runInNewContext(api.LEGACY_PAYMENT_REFRESH_SCRIPT, { window: { resumeUpdate: () => { queried += 1 }, location } })
  assert.equal(queried, 1)
  assert.equal(reloaded, 0)
  vm.runInNewContext(api.LEGACY_PAYMENT_REFRESH_SCRIPT, { window: { location } })
  assert.equal(reloaded, 1)
  vm.runInNewContext(api.LEGACY_PAYMENT_REFRESH_SCRIPT, { window: { resumeUpdate: () => { throw new Error('old page error') }, location } })
  assert.equal(reloaded, 2)
  assert.doesNotMatch(api.LEGACY_PAYMENT_REFRESH_SCRIPT, /payOk|vip|member|localStorage|sessionStorage/u)
})

test('双桥支付不再跳微信内网页，iOS 的 webkit 支付消息也走同一交易号通道', () => {
  const late = page.match(/function legacyNavigationBridgeScript\(\): string \{\s*return `([\s\S]*?)`\s*\}/u)[1]
  for (const script of [preload, late]) {
    const assigned = []
    const window = {
      location: { hostname: 'www.yrydai.cn', href: 'https://www.yrydai.cn/my.php', assign: (url) => assigned.push(url) },
      history: { length: 1 },
    }
    vm.runInNewContext(script, { URL, window, document: { documentElement: {}, querySelectorAll: () => [], addEventListener: () => {}, readyState: 'complete' } })
    window.webkit.messageHandlers.payWX.postMessage('old-order-1')
    assert.equal(assigned.at(-1), 'rebu://legacy-payment?trade_no=old-order-1')
    window.webUni.postMessage({ action: 'pay', payload: { trade_no: 'old-order-2', appid: 'attacker', amount: 1 } })
    assert.equal(assigned.at(-1), 'rebu://legacy-payment?trade_no=old-order-2')
    assert.equal(assigned.some((url) => url.includes('mod=pay')), false)
  }
  assert.match(page, /action === 'legacy-payment'\) void requestLegacyPayment\(url, child\)/u)
  assert.match(page, /onShow\(\(\) => \{\s*legacyPageVisible = true\s*flushLegacyPaymentResult\(\)/u)
  assert.match(page, /pending\.documentVersion !== legacyDocumentVersion/u)
  assert.match(page, /pending\.child\.getURL\?\.\(\) !== pending\.url/u)
})

function paymentPageHarness(pay) {
  const actions = []
  const { api } = runtime()
  const child = { getURL: () => 'https://www.yrydai.cn/my.php?mod=member', evalJS: (script) => actions.push(['refresh', script]) }
  const context = {
    legacyChildWebview: child, legacyPageVisible: true, legacyDocumentVersion: 1,
    legacyPaymentBusy: false, legacyPaymentLoading: false, pendingLegacyPayment: null,
    parseLegacyPaymentBridgeUrl: api.parseLegacyPaymentBridgeUrl,
    LegacyPaymentError: api.LegacyPaymentError,
    LEGACY_PAYMENT_REFRESH_SCRIPT: api.LEGACY_PAYMENT_REFRESH_SCRIPT,
    isTrustedLegacyUrl: (url) => url.startsWith('https://www.yrydai.cn/'),
    payLegacyPaipanOrder: pay,
    uni: {
      showLoading: () => actions.push(['loading']), hideLoading: () => actions.push(['hideLoading']),
      showToast: (options) => actions.push(['toast', options.title]),
    },
  }
  vm.createContext(context)
  vm.runInContext(compile(page.slice(page.indexOf('function hideLegacyPaymentLoading'), page.indexOf('function bindLegacyChildWebview'))), context)
  return { context, child, actions }
}

test('支付回调早于 App 恢复时延后刷新，回到原旧页面只处理一次', async () => {
  let complete
  let attempts = 0
  const { context, child, actions } = paymentPageHarness(async (_trade, options) => {
    attempts += 1
    assert.equal(options.canProceed(), true)
    options.beforeNativePay()
    return new Promise((resolve) => { complete = resolve })
  })
  const pending = context.requestLegacyPayment('rebu://legacy-payment?trade_no=order1', child)
  await context.requestLegacyPayment('rebu://legacy-payment?trade_no=order1', child)
  assert.equal(attempts, 1)
  context.legacyPageVisible = false
  complete('submitted')
  await pending
  assert.equal(actions.some(([name]) => name === 'refresh' || name === 'toast'), false)
  context.legacyPageVisible = true
  context.flushLegacyPaymentResult()
  context.flushLegacyPaymentResult()
  assert.equal(actions.filter(([name]) => name === 'refresh').length, 1)
  assert.equal(actions.filter(([name]) => name === 'toast').length, 1)
  assert.match(actions.find(([name]) => name === 'toast')[1], /旧系统确认支付结果/u)
  assert.equal(context.legacyPaymentBusy, false)
})

test('离开旧页、同URL重载或切换子窗口后，支付结果不投递到新页面', async () => {
  for (const change of [
    (context) => { context.legacyDocumentVersion += 1 },
    (_context, child) => { child.getURL = () => 'https://www.yrydai.cn/other' },
    (context) => { context.legacyChildWebview = {} },
  ]) {
    let complete
    const { context, child, actions } = paymentPageHarness(() => new Promise((resolve) => { complete = resolve }))
    const pending = context.requestLegacyPayment('rebu://legacy-payment?trade_no=order1', child)
    change(context, child)
    complete('submitted')
    await pending
    context.flushLegacyPaymentResult()
    assert.equal(actions.some(([name]) => name === 'refresh' || name === 'toast'), false)
    assert.equal(context.pendingLegacyPayment, null)
  }
})

test('非当前窗口、非旧站、隐藏页面和篡改支付链接都不请求支付', async () => {
  let attempts = 0
  const { context, child } = paymentPageHarness(async () => { attempts += 1; return 'submitted' })
  await context.requestLegacyPayment('rebu://legacy-payment?trade_no=order1', {})
  context.legacyPageVisible = false
  await context.requestLegacyPayment('rebu://legacy-payment?trade_no=order1', child)
  context.legacyPageVisible = true
  await context.requestLegacyPayment('rebu://legacy-payment?trade_no=order1&merchant=bad', child)
  child.getURL = () => 'https://untrusted.example/'
  await context.requestLegacyPayment('rebu://legacy-payment?trade_no=order1', child)
  assert.equal(attempts, 0)
})
