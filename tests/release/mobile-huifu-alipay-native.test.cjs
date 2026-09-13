const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const test = require('node:test')
const ts = require('node:module').createRequire(require('node:path').resolve('apps/mobile/package.json'))('typescript')
const mod = { exports: {} }
const source = fs.readFileSync('apps/mobile/src/utils/huifu-alipay-native.ts', 'utf8')
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: mod.exports })
const { buildAlipayNativeUrl, createAlipayNativePayment } = mod.exports
const qr = 'https://qr.alipay.com/test?x=1&y=a%2Bb'

function fixture(overrides = {}) {
  let record = { status: 'PENDING' }, saved = null, view = {}, failOpen, creates = 0, opened = 0, paid = 0, queries = 0
  const d = {
    orderId: 'order-one', platform: 'Android', now: () => 100000, active: () => true,
    readOrder: async () => ({ ...record }),
    createPayment: async () => { creates++; record = { ...record, payMethod: 'HUIFU', payTransactionId: 'HF-one' }; return { outTradeNo: 'HF-one', qrCode: qr } },
    queryPayment: async () => { queries++; return { trans_stat: 'P' } },
    load: () => saved, save: (v) => { saved = JSON.parse(JSON.stringify(v)) },
    openUrl: (url, fail) => { opened++; assert.equal(url, buildAlipayNativeUrl(qr)); failOpen = fail },
    update: (v) => { view = v }, paid: () => { paid++ }, ...overrides,
  }
  return { d, flow: createAlipayNativePayment(d), setOrder: (v) => { record = v }, get view() { return view }, get saved() { return saved }, fail: () => failOpen(), counts: () => ({ creates, opened, paid, queries }) }
}

test('二维码整体编码，不把内层查询参数注入支付宝 scheme', () => {
  assert.equal(buildAlipayNativeUrl(qr), 'alipays://platformapi/startapp?saId=10000007&qrcode=' + encodeURIComponent(qr))
})
test('拒绝伪装主机、协议、端口、用户信息、控制符和任意 payInfo', () => {
  for (const bad of [null, {}, '', 'http://qr.alipay.com/a', 'https://qr.alipay.com.evil/a', 'https://qr.alipay.com@evil/a', 'https://evil@qr.alipay.com/a', 'https://qr.alipay.com:443/a', 'https://qr.alipay.com./a', 'https://qr%2ealipay.com/a', 'https://qr.alipay.com\\evil/a', 'https://qr.alipay.com/a\n', 'https://qr.alipay.com/a#x', 'javascript:alert(1)', 'alipays://platformapi/startapp?saId=1', 'app_id=123&sign=abc', 'https://qr.alipay.com/' + 'a'.repeat(1100)]) assert.throws(() => buildAlipayNativeUrl(bad))
})
test('拉起成功只进入待支付；失败和取消返回均复用原单', async () => {
  const f = fixture(); await f.flow.start()
  assert.equal(f.view.phase, 'pending'); assert.equal(f.counts().paid, 0)
  f.fail(); assert.equal(f.view.phase, 'openFailed')
  await f.flow.check(); assert.equal(f.counts().paid, 0)
  await f.flow.reopen(); assert.equal(f.counts().creates, 1); assert.equal(f.counts().opened, 2)
})
test('通道返回S但平台订单仍PENDING时不提前成功', async () => {
  const f = fixture({ queryPayment: async () => ({ trans_stat: 'S', paid: true }) }); await f.flow.start(); await f.flow.check()
  assert.equal(f.counts().paid, 0); assert.equal(f.view.phase, 'pending')
})
test('通道查询失败仍读订单，异步已入账则成功且只通知一次', async () => {
  const f = fixture(); await f.flow.start()
  f.d.queryPayment = async () => { f.setOrder({ status: 'PAID' }); throw new Error('network') }
  await f.flow.check(); await f.flow.check(); f.fail()
  assert.equal(f.counts().paid, 1); assert.equal(f.view.phase, 'success')
})
test('下单超时保留请求标记，重试及重建页面均不重复下单', async () => {
  let attempts = 0
  const f = fixture({ createPayment: async () => { attempts++; throw new Error('timeout') } })
  await f.flow.start(); await f.flow.start(); await f.flow.reopen()
  const restored = createAlipayNativePayment(f.d); await restored.start()
  assert.equal(attempts, 1); assert.equal(f.counts().opened, 0); assert.equal(f.view.phase, 'unknown')
})
test('重复点击及恢复查单在发起过程中互斥', async () => {
  let release, attempts = 0
  const pending = new Promise(r => { release = r })
  const f = fixture({ createPayment: async () => { attempts++; await pending; return { outTradeNo: 'HF-one', qrCode: qr } } })
  const first = f.flow.start(); await new Promise(r => setImmediate(r))
  await Promise.all([f.flow.start(), f.flow.reopen(), f.flow.check()])
  assert.equal(attempts, 1); f.setOrder({ status: 'PENDING', payMethod: 'HUIFU', payTransactionId: 'HF-one' }); release(); await first
  assert.equal(f.counts().opened, 1)
})
test('已关闭订单不被迟到的open失败回调覆盖', async () => {
  const f = fixture(); await f.flow.start(); f.setOrder({ status: 'CANCELLED' }); await f.flow.check(); f.fail()
  assert.equal(f.view.phase, 'closed'); assert.equal(f.view.canOpen, false)
})
test('缓存清理后服务端已有汇付单，只查原单且不创建新支付', async () => {
  const f = fixture(); f.setOrder({ status: 'PENDING', payMethod: 'HUIFU', payTransactionId: 'HF-existing' }); await f.flow.start(); await f.flow.check()
  assert.equal(f.counts().creates, 0); assert.equal(f.counts().opened, 0); assert.equal(f.counts().queries, 1)
})
test('其他渠道已有支付记录不能再建支付宝单', async () => {
  const f = fixture(); f.setOrder({ status: 'PENDING', payMethod: 'WECHAT', payTransactionId: 'wx-existing' }); await f.flow.start()
  assert.equal(f.counts().creates, 0); assert.equal(f.view.phase, 'closed')
})
test('订单鉴权失败不发起支付，不把网络错误当成功', async () => {
  const f = fixture({ readOrder: async () => { throw new Error('403') } }); await f.flow.start(); await f.flow.check()
  assert.equal(f.counts().creates, 0); assert.equal(f.counts().paid, 0)
})
test('非Android不调用接口或原生打开方法', async () => {
  const f = fixture({ platform: 'iOS', readOrder: async () => { throw new Error('must not call') } }); await f.flow.start()
  assert.equal(f.view.phase, 'unsupported'); assert.equal(f.counts().creates, 0)
})
test('销毁及后台中的延迟响应不能拉起支付宝', async () => {
  const f = fixture({ active: () => false }); await f.flow.start(); assert.equal(f.counts().opened, 0)
  f.flow.dispose(); await f.flow.reopen(); assert.equal(f.counts().opened, 0)
})
test('不接受raw或payInfo中的任意字符串冒充已验证二维码', async () => {
  const f = fixture({ createPayment: async () => ({ outTradeNo: 'HF-one', payInfo: qr, raw: { qr_code: qr } }) }); await f.flow.start()
  assert.equal(f.counts().opened, 0); assert.equal(f.view.phase, 'unknown')
})
test('原凭据保留时重新进入可恢复拉起，仍不重复下单', async () => {
  const f = fixture(); await f.flow.start(); f.flow.dispose()
  const restored = createAlipayNativePayment(f.d); await restored.start()
  assert.equal(f.counts().creates, 1); assert.equal(f.counts().opened, 2)
})
test('过期缓存仅保留查单能力，不拉起过期二维码或重建交易', async () => {
  const f = fixture(); await f.flow.start(); f.d.now = () => 100000 + 7200001
  await f.flow.reopen(); assert.equal(f.counts().creates, 1); assert.equal(f.counts().opened, 1); assert.equal(f.view.canOpen, false)
})
test('存储写入失败时在网络发起之前停止', async () => {
  const f = fixture({ save: () => { throw new Error('disk full') } }); await f.flow.start()
  assert.equal(f.counts().creates, 0)
})
test('两个页面实例先后检查持久化标记，不重复发起同一订单', async () => {
  let release, creates = 0
  const wait = new Promise(r => { release = r })
  const f = fixture({ createPayment: async () => { creates++; await wait; return { outTradeNo: 'HF-one', qrCode: qr } } })
  const other = createAlipayNativePayment(f.d)
  const first = f.flow.start(); await new Promise(r => setImmediate(r)); await other.start()
  assert.equal(creates, 1)
  f.setOrder({ status: 'PENDING', payMethod: 'HUIFU', payTransactionId: 'HF-one' }); release(); await first
})
test('离开页面后迟到查询不触发成功导航，返回后重新确认', async () => {
  let release, active = true
  const f = fixture({ active: () => active }); await f.flow.start()
  f.d.readOrder = () => new Promise(r => { release = r })
  const checking = f.flow.check(); active = false; release({ status: 'PAID' }); await checking
  assert.equal(f.counts().paid, 0)
  active = true; f.d.readOrder = async () => ({ status: 'PAID' }); await f.flow.check(); assert.equal(f.counts().paid, 1)
})
