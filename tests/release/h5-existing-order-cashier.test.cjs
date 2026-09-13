const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const path = require('node:path')
const ts = require('node:module').createRequire(path.resolve('apps/mobile/package.json'))('typescript')
const file = (name) => fs.readFileSync(`apps/mobile/src/${name}`, 'utf8')
function compile(code, globals = {}) {
  const mod = { exports: {} }
  vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: mod.exports, ...globals })
  return mod.exports
}
const api = compile(file('utils/existing-order-huifu.ts'))
const alipayH5 = compile(file('utils/huifu-alipay-h5.ts'))
const mobileUa = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/128.0 Mobile Safari/537.36'

test('支付宝scheme仅接受确切HTTPS二维码域，参数编码后复用原码', () => {
  const qr = 'https://qr.alipay.com/test?x=1&y=2'
  assert.equal(alipayH5.alipaySchemeForQr(qr), `alipays://platformapi/startapp?saId=10000007&qrcode=${encodeURIComponent(qr)}`)
  for (const invalid of ['javascript:alert(1)', 'alipays://anything', 'http://qr.alipay.com/x', 'https://qr.alipay.com.evil/x', 'https://user@qr.alipay.com/x', 'https://qr.alipay.com:443/x', 'https://QR.ALIPAY.COM/x', 'https://qr.alipay.com\\@evil/x', 'https://qr.alipay.com/x\n']) assert.throws(() => alipayH5.alipaySchemeForQr(invalid))
})
test('普通手机浏览器可显示拉起入口；桌面微信和常见内嵌环境不开放', () => {
  assert.equal(alipayH5.isAlipayMobileBrowser(mobileUa), true)
  assert.equal(alipayH5.isAlipayMobileBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Version/17.0 Mobile Safari'), true)
  for (const ua of ['Mozilla/5.0 Windows NT Chrome', mobileUa+' MicroMessenger/8', mobileUa+' AlipayClient/10', mobileUa+'; wv', mobileUa+' QQ/9']) assert.equal(alipayH5.isAlipayMobileBrowser(ua), false)
})
test('拉起校验原订单凭据、渠道、时效、状态及顶层环境，不接受未知或已付订单', () => {
  const input = { orderId: 'one', userAgent: mobileUa, topLevel: true, now: 1000, view: { phase: 'pending', channel: 'alipay', qrCode: 'https://qr.alipay.com/test', busy: false }, attempt: { orderId: 'one', channel: 'alipay', outTradeNo: 'HF-one', requestedAt: 500, qrCode: 'https://qr.alipay.com/test' } }
  assert.ok(alipayH5.existingAlipayLaunchUrl(input).startsWith('alipays:'))
  for (const override of [{ topLevel: false }, { orderId: 'other' }, { now: 500+7200000 }, { now: 400 }, { attempt: null }, { view: { ...input.view, channel: 'unionpay' } }, { view: { ...input.view, phase: 'success' } }, { view: { ...input.view, phase: 'unknown' } }, { view: { ...input.view, busy: true } }, { attempt: { ...input.attempt, qrCode: 'https://qr.alipay.com/other' } }]) assert.throws(() => alipayH5.existingAlipayLaunchUrl({ ...input, ...override }))
})
function fixture(overrides = {}) {
  let order = { id: 'original-one', status: 'PENDING', amount: '0.01', type: 'PRODUCT' }, saved = null, current = {}, creates = [], queries = [], reads = 0
  const deps = {
    orderId: 'original-one', channel: 'alipay', now: () => 100000,
    readOrder: async () => { reads++; return { ...order } },
    createPayment: async (id, channel) => { creates.push({ id, channel }); order.payMethod = 'HUIFU'; order.payTransactionId = 'HF-original'; return { outTradeNo: 'HF-original', qrCode: 'https://qr.alipay.com/test-only' } },
    queryPayment: async (ref) => { queries.push(ref); return { trans_stat: 'P' } },
    loadAttempt: () => saved,
    saveAttempt: (value) => { saved = JSON.parse(JSON.stringify(value)) },
    update: (value) => { current = value }, ...overrides,
  }
  return { deps, flow: api.createExistingOrderHuifu(deps), setOrder(v) { order = v }, setSaved(v) { saved = v }, get view() { return current }, get saved() { return saved }, get counts() { return { creates, queries, reads } } }
}
test('进入原订单收银只读订单，金额来自服务端，不自动初始化', async () => {
  const f = fixture(); await f.flow.load()
  assert.equal(f.view.phase, 'ready'); assert.equal(f.view.amount, '0.01'); assert.equal(f.counts.creates.length, 0)
})
test('两个汇付渠道都只初始化原订单；拿到码不判付款成功', async () => {
  for (const channel of ['alipay', 'unionpay']) {
    const f = fixture({ channel }); await f.flow.start()
    assert.equal(f.counts.creates.length, 1); assert.equal(f.counts.creates[0].id, 'original-one'); assert.equal(f.counts.creates[0].channel, channel)
    assert.equal(f.view.phase, 'pending'); assert.ok(f.view.qrCode)
  }
})
test('已付、已退款、已取消订单不初始化', async () => {
  for (const status of ['PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED', 'REFUNDED']) {
    const f = fixture(); f.setOrder({ id: 'original-one', status, amount: 0.01, type: 'PRODUCT' }); await f.flow.start()
    assert.equal(f.counts.creates.length, 0); assert.equal(f.view.canStart, false)
  }
})
test('已有其他渠道流水不跨渠道初始化，也不调用汇付查该流水', async () => {
  const f = fixture(); f.setOrder({ id: 'original-one', status: 'PENDING', amount: 0.01, payMethod: 'WECHAT', payTransactionId: 'WX-old' })
  await f.flow.load(); await f.flow.start(); await f.flow.check()
  assert.equal(f.counts.creates.length, 0); assert.equal(f.counts.queries.length, 0); assert.equal(f.view.phase, 'unknown')
})
test('已有汇付流水只查原流水；选择另一方式不重新初始化', async () => {
  const f = fixture({ channel: 'unionpay' }); f.setOrder({ id: 'original-one', status: 'PENDING', amount: 0.01, type: 'PRODUCT', payMethod: 'HUIFU', payTransactionId: 'HF-old' })
  await f.flow.start(); await f.flow.check()
  assert.equal(f.counts.creates.length, 0); assert.deepEqual(f.counts.queries, ['HF-old'])
})
test('提交前持久标记；网络未知、重开、改渠道均不自动重新初始化', async () => {
  let attempts = 0
  const f = fixture({ createPayment: async () => { attempts++; assert.equal(f.saved.orderId, 'original-one'); throw new Error('网络结果未知') } })
  await f.flow.start(); await f.flow.start(); await api.createExistingOrderHuifu({ ...f.deps, channel: 'unionpay' }).start()
  assert.equal(attempts, 1); assert.equal(f.view.phase, 'unknown')
})

test('首次拒绝后轮询、刷新和再次点击仍保留原始失败说明且不重新初始化', async () => {
  let attempts = 0
  const message = '商户银联入驻信息配置有误'
  const f = fixture({ channel: 'unionpay', createPayment: async () => { attempts++; throw new Error(message) } })
  await f.flow.start()
  assert.equal(f.saved.lastFailureMessage, message)
  for (let i = 0; i < 3; i++) { await f.flow.check(); assert.ok(f.view.message.includes(message)); assert.equal(f.view.canStart, false) }
  const reopened = api.createExistingOrderHuifu(f.deps)
  await reopened.load(); assert.ok(f.view.message.includes(message))
  await reopened.check(); await reopened.start()
  assert.ok(f.view.message.includes(message)); assert.ok(f.view.message.includes('支付结果待核对')); assert.equal(attempts, 1)
  f.setOrder({ id: 'original-one', status: 'PAID', amount: 0.01 }); await reopened.check()
  assert.equal(f.view.phase, 'success'); assert.equal(f.view.message.includes(message), false)
})
test('本地初始标记保存失败时不发送；响应保存失败后保留未知标记', async () => {
  const f = fixture({ saveAttempt: () => { throw new Error('storage') } }); await f.flow.start(); assert.equal(f.counts.creates.length, 0)
  const g = fixture(); const save = g.deps.saveAttempt; let writes = 0
  g.deps.saveAttempt = (v) => { if (++writes > 1) throw new Error('storage'); save(v) }
  await g.flow.start(); await api.createExistingOrderHuifu(g.deps).start()
  assert.equal(g.counts.creates.length, 1); assert.equal(g.saved.outTradeNo, undefined)
})
test('双击和并发查询不重复初始化', async () => {
  let release, count = 0; const pending = new Promise(r => { release = r })
  const f = fixture({ createPayment: async () => { count++; await pending; return { outTradeNo: 'HF-one', qrCode: 'test-code' } } })
  const first = f.flow.start(); await new Promise(r => setImmediate(r)); await Promise.all([f.flow.start(), f.flow.check()]); release(); await first
  assert.equal(count, 1)
})
test('通道S不是页面成功条件；服务端订单确认为PAID才成功', async () => {
  const f = fixture({ queryPayment: async () => ({ trans_stat: 'S', paid: true }) }); await f.flow.start(); await f.flow.check(); assert.equal(f.view.phase, 'pending')
  f.setOrder({ id: 'original-one', status: 'PAID', amount: 0.01 }); await f.flow.check(); assert.equal(f.view.phase, 'success')
})
test('详情缓存尚无流水时保留本次返回二维码并查询本人初始化返回的流水', async () => {
  const f = fixture({ createPayment: async () => ({ outTradeNo: 'HF-returned', qrCode: 'qr-data' }) }); await f.flow.start(); await f.flow.check()
  assert.equal(f.view.qrCode, 'qr-data'); assert.deepEqual(f.counts.queries, ['HF-returned'])
})
test('丢失二维码不重新初始化，不降级为微信付款', async () => {
  let requests = 0; const f = fixture({ createPayment: async () => { requests++; return { outTradeNo: 'HF-one' } } })
  await f.flow.start(); await f.flow.start(); assert.equal(requests, 1); assert.equal(f.view.phase, 'unknown')
})
test('跨订单缓存、非法金额及不支持云闪付业务拒绝初始化', async () => {
  const f = fixture(); f.setSaved({ orderId: 'other', channel: 'alipay', requestedAt: 1 }); await f.flow.start(); assert.equal(f.counts.creates.length, 0)
  const g = fixture(); g.setOrder({ id: 'original-one', amount: 'NaN', status: 'PENDING' }); await g.flow.start(); assert.equal(g.counts.creates.length, 0)
  const h = fixture({ channel: 'unionpay' }); h.setOrder({ id: 'original-one', amount: 0.01, status: 'PENDING', type: 'MEMBER' }); await h.flow.start(); assert.equal(h.counts.creates.length, 0)
})
test('离开页面后迟到读取不继续发起支付或更新页面', async () => {
  let resolve; const promise = new Promise(r => { resolve = r }); const f = fixture({ readOrder: () => promise })
  const start = f.flow.start(); f.flow.dispose(); const before = JSON.stringify(f.view)
  resolve({ id: 'original-one', status: 'PENDING', amount: 0.01 }); await start
  assert.equal(f.counts.creates.length, 0); assert.equal(JSON.stringify(f.view), before)
})

// 对真实页面函数做平台预处理后执行，避免用平行实现代替结算/详情入口验证。
function platform(source, target) {
  const stack = [true]
  return source.split('\n').filter(line => {
    const m = line.match(/#(ifdef|ifndef)\s+(.+)/)
    if (m) { const matches = m[2].trim().split(/\s*\|\|\s*/).includes(target); stack.push(stack.at(-1) && (m[1] === 'ifdef' ? matches : !matches)); return false }
    if (line.includes('#endif')) { stack.pop(); return false }
    return stack.at(-1)
  }).join('\n')
}
function script(name, target = 'H5') { return platform(file(name).split('<script setup lang="ts">')[1].split('</script>')[0], target) }
function realFunction(name, fn, target, globals) {
  const source = ts.createSourceFile('page.ts', script(name, target), ts.ScriptTarget.Latest, true)
  const node = source.statements.find(n => ts.isFunctionDeclaration(n) && n.name.text === fn)
  return compile(node.getText(source) + `\nexports.fn=${fn};`, globals).fn
}
test('checkout真实提交仅建一次原订单，再进入同一汇付收银路由；重入复用已建订单', async () => {
  for (const method of ['alipay', 'unionpay']) {
    let count = 0; const paths = []; const submitting = { value: false }
    const fn = realFunction('pkg-shop/checkout/index.vue', 'submitOrder', 'H5', {
      submitting, items: { value: [{ productId: 'test-only', quantity: 1 }] }, currentAddress: { value: { id: 'address' } }, estimate: { value: {} }, selectedCoupon: { value: null }, createdOrders: new Map(), contentSource: { value: {} }, payMethod: { value: method },
      shopApi: { createOrder: async () => { count++; return { id: 'original-one', amount: 0.01 } } }, uni: { showToast() {} }, redirectTo: p => paths.push(p), ...api,
    })
    await fn(); submitting.value = false; await fn()
    assert.equal(count, 1); assert.equal(paths.length, 2); assert.ok(paths.every(p => p === api.existingOrderCashierRoute('original-one', method)))
  }
})
test('详情真实去支付选择渠道；原订单ID不变，取消不发请求', () => {
  let options; const paths = []
  const fn = realFunction('pkg-order/detail/index.vue', 'goPay', 'H5', { order: { value: { id: 'old-one', orderType: 'PRODUCT', payAmount: 0.01 } }, choosingPayment: false, uni: { showActionSheet(v) { options = v } }, navigateTo: p => paths.push(p), ...api })
  fn(); assert.equal(paths.length, 0); assert.equal(options.itemList.length, 3)
  options.success({ tapIndex: 2 }); assert.equal(paths[0], api.existingOrderCashierRoute('old-one', 'unionpay'))
})
test('非H5 checkout和详情不新增支付宝/云闪付支持', () => {
  for (const target of ['APP-PLUS', 'MP-WEIXIN']) {
    const code = platform(file('lib/shop-data.ts'), target); const tree = ts.createSourceFile('data.ts', code, ts.ScriptTarget.Latest, true)
    const declaration = tree.statements.filter(ts.isVariableStatement).flatMap(s => [...s.declarationList.declarations]).find(n => n.name.getText(tree) === 'checkoutPayMethods')
    const options = compile('exports.options=' + declaration.initializer.getText(tree)).options
    assert.deepEqual(Array.from(options, x => x.id), ['wechat'])
    let old = 0; realFunction('pkg-order/detail/index.vue', 'goPay', target, { order: { value: { id: 'one' } }, goLegacyPay: () => { old++ } })(); assert.equal(old, 1)
    assert.equal(platform(file('pages.json'), target).includes('"huifu-paying/index"'), false)
  }
})
test('旧paying显式非微信链接提前转汇付，绝不触发微信授权/支付', () => {
  const source = ts.createSourceFile('page.ts', script('pkg-shop/paying/index.vue'), ts.ScriptTarget.Latest, true)
  const call = source.statements.find(n => ts.isExpressionStatement(n) && ts.isCallExpression(n.expression) && n.expression.expression.getText(source) === 'onLoad').expression
  const paths = []
  const fn = compile('exports.load=' + call.arguments[0].getText(source), { redirectTo: p => paths.push(p), ...api }).load
  fn({ orderId: 'old-one', method: 'alipay' }); assert.equal(paths[0], api.existingOrderCashierRoute('old-one', 'alipay'))
})
test('H5新收银页面只接收既有订单，未调用任何创建业务订单接口', () => {
  const s = script('pkg-shop/huifu-paying/index.vue')
  assert.equal(/\.createOrder\s*\(/.test(s), false)
  assert.ok(s.includes('purchaseApi.payByChannel(id, method)'))
  assert.ok(s.includes('huifu:h5:existing:${accountId}:${orderId}'))
})
test('真实H5显式拉起原码、账号隔离、浏览器可见及pageshow恢复只查原单且清理监听', async () => {
  const hooks = {}, timers = new Map(), storage = new Map(), listeners = new Map(), opened = []; let timerId = 0, paints = 0, initialized = 0, queried = 0, account = 'qa-one', now = 10000
  const browserDocument = { visibilityState: 'visible', addEventListener: (n, fn) => listeners.set(n, fn), removeEventListener: n => listeners.delete(n) }
  const browserWindow = { location: { assign: url => opened.push(url) }, addEventListener: (n, fn) => listeners.set(n, fn), removeEventListener: n => listeners.delete(n) }; browserWindow.self = browserWindow; browserWindow.top = browserWindow
  const order = { id: 'original-one', amount: '0.01', status: 'PENDING', type: 'PRODUCT' }
  const modules = {
    vue: { ref: value => ({ value }), nextTick: async () => {}, getCurrentInstance: () => ({}) },
    '@dcloudio/uni-app': Object.fromEntries(['onLoad', 'onShow', 'onHide', 'onUnload'].map(name => [name, callback => { hooks[name] = callback }])),
    '@/utils/router': { redirectTo() {} },
    '@/utils/request': { apiGet: async () => ({ ...order }) },
    '@/utils/storage': { getUserInfo: () => ({ id: account }) },
    '@/lib/purchase-data': { purchaseApi: {
      payByChannel: async (id, method) => { initialized++; assert.equal(id, 'original-one'); assert.equal(method, 'alipay'); order.payMethod = 'HUIFU'; order.payTransactionId = 'HF-one'; return { outTradeNo: 'HF-one', qrCode: 'https://qr.alipay.com/test' } },
      queryHuifuPayment: async ref => { assert.equal(ref, 'HF-one'); queried++; return { trans_stat: 'P' } },
    } },
    '@/utils/qrcode': { drawQrToCanvas: () => { paints++; return true } },
    '@/utils/existing-order-huifu': api,
    '@/utils/huifu-alipay-h5': alipayH5,
  }
  const page = compile(script('pkg-shop/huifu-paying/index.vue') + '\nexports.start=startPayment;exports.open=openAlipay;exports.getView=()=>view.value;', {
    require: name => { assert.ok(modules[name], name); return modules[name] },
    setTimeout: fn => { const id = ++timerId; timers.set(id, fn); return id }, clearTimeout: id => timers.delete(id),
    uni: { getStorageSync: key => storage.get(key), setStorageSync: (key, value) => storage.set(key, JSON.parse(JSON.stringify(value))), createCanvasContext: () => ({ draw: (_, callback) => callback() }) },
    navigator: { userAgent: mobileUa }, window: browserWindow, document: browserDocument, Date: class extends Date { static now() { return now } },
  })
  await hooks.onLoad({ orderId: 'original-one', method: 'alipay' })
  assert.equal(initialized, 0); assert.equal(timers.size, 0)
  await page.start(); await new Promise(r => setImmediate(r))
  assert.equal(initialized, 1); assert.ok(paints > 0); assert.equal(timers.size, 1)
  assert.ok(storage.has('huifu:h5:existing:qa-one:original-one'))
  assert.equal(opened.length, 0)
  page.open(); page.open(); assert.equal(opened.length, 1); assert.equal(initialized, 1); assert.equal(page.getView().phase, 'pending')
  browserDocument.visibilityState = 'hidden'; listeners.get('visibilitychange')(); assert.equal(timers.size, 0)
  const before = queried; browserDocument.visibilityState = 'visible'; listeners.get('visibilitychange')(); listeners.get('pageshow')(); await new Promise(r => setImmediate(r))
  assert.equal(queried, before+1); assert.equal(timers.size, 1); assert.equal(initialized, 1); assert.equal(opened.length, 1)
  hooks.onHide(); assert.equal(timers.size, 0)
  listeners.get('pageshow')(); await new Promise(r => setImmediate(r)); assert.equal(timers.size, 0)
  hooks.onShow(); await new Promise(r => setImmediate(r)); assert.equal(timers.size, 1)
  account = 'other'; now += 2000; page.open(); assert.equal(opened.length, 1); await page.start(); assert.equal(initialized, 1)
  hooks.onUnload(); assert.equal(timers.size, 0); assert.equal(listeners.size, 0)
})
