const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('node:module').createRequire(path.resolve('apps/mobile/package.json'))('typescript')
const read = p => fs.readFileSync(`apps/mobile/src/${p}`, 'utf8')
function compile(code, globals = {}) {
  const exports = {}
  vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, ...globals })
  return exports
}
function platformSource(platform) {
  return read('utils/default-digital-payment.ts').replace(/\/\/ #ifdef (H5|APP-PLUS)\r?\n([\s\S]*?)\/\/ #endif/g, (_, flag, body) => flag === platform ? body : '')
}
test('Android 默认支付宝，小程序默认微信，iOS 不降级现金支付', async () => {
  for (const platform of ['android', 'ios']) {
    const api = compile(platformSource('APP-PLUS'), { uni: { getSystemInfoSync: () => ({ platform }) } })
    if (platform === 'android') assert.equal(await api.defaultDigitalPaymentMethod(), 'alipay')
    else await assert.rejects(api.defaultDigitalPaymentMethod(), /暂未开放/)
  }
  assert.equal(await compile(platformSource('MP-WEIXIN')).defaultDigitalPaymentMethod(), 'wechat')
})
test('H5 使用真实渠道策略，微信内微信、浏览器支付宝，禁用和iframe不建入口', async () => {
  const device = compile(read('utils/payment-device.ts'))
  const alipay = compile(read('utils/huifu-alipay-h5.ts'))
  const policy = compile(read('utils/h5-payment-options.ts'), { require: n => n === './payment-device' ? device : alipay })
  for (const [ua, flags, topLevel, expected] of [
    ['Android Mobile MicroMessenger', {}, true, 'wechat'],
    ['Windows Chrome', {}, true, 'alipay'],
    ['Android Mobile Chrome', {}, true, 'alipay'],
    ['Windows Chrome', { client_pay_h5_alipay_desktop: false }, true, null],
    ['Android Mobile Chrome', {}, false, null],
  ]) {
    const window = { top: {} }; window.self = topLevel ? window.top : {}
    const api = compile(platformSource('H5'), { window, navigator: { userAgent: ua }, require: n => n === './h5-payment-options' ? policy : {
      hydrateRemoteConfig: async () => {}, getRemoteConfig: () => ({ features: flags }),
    } })
    if (expected) assert.equal(await api.defaultDigitalPaymentMethod(), expected)
    else await assert.rejects(api.defaultDigitalPaymentMethod(), /暂不支持付款/)
  }
})
test('两个购买入口在建单之前拒绝不可用渠道，错误后允许重试', async () => {
  for (const page of ['xiaobu-member', 'xiaobu-voice-topup']) {
    const script = read(`pkg-agent/agent/${page}.vue`).split('<script setup lang="ts">')[1].split('</script>')[0]
    const ast = ts.createSourceFile('page.ts', script, ts.ScriptTarget.Latest, true)
    const buy = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'buy')
    let created = 0; const buying = { value: false }; const messages = []
    const api = compile(`${buy.getText(ast)}\nexports.buy=buy`, {
      buying, picked: { value: 30 }, pickedPlan: { value: { key: 'monthly' } },
      defaultDigitalPaymentMethod: async () => { throw Error('渠道关闭') },
      shopApi: { createOrder: async () => { created++ } },
      uni: { showToast: ({ title }) => messages.push(title) },
    })
    await api.buy()
    assert.equal(created, 0); assert.equal(buying.value, false); assert.deepEqual(messages, ['渠道关闭'])
  }
})

test('购买成功跳转使用已选默认渠道且保留原服务上下文', async () => {
  const query = compile(read('utils/query-string.ts'))
  for (const page of ['xiaobu-member', 'xiaobu-voice-topup']) {
    const script = read(`pkg-agent/agent/${page}.vue`).split('<script setup lang="ts">')[1].split('</script>')[0]
    const ast = ts.createSourceFile('page.ts', script, ts.ScriptTarget.Latest, true)
    const buy = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'buy')
    const routes = []
    const api = compile(`${buy.getText(ast)}\nexports.buy=buy`, {
      buying: { value: false }, picked: { value: 30 }, pickedPlan: { value: { key: 'monthly' } },
      pendingOrder: { value: null }, returnRecordId: { value: 'r 1' }, circleId: { value: '' },
      info: { value: { packs: [] } }, returnVoiceScene: { value: 'report_dialogue' },
      returnVoiceContextId: { value: 'r 1' }, returnVoiceSectionId: { value: 's1' },
      defaultDigitalPaymentMethod: async () => 'alipay', queryString: query.queryString,
      shopApi: { createOrder: async () => ({ id: 'order1', amount: 10 }) },
      navigateTo: route => routes.push(route), uni: { showToast: () => assert.fail('不应失败') },
    })
    await api.buy()
    assert.equal(routes.length, 1)
    const params = new URLSearchParams(routes[0].split('?')[1])
    assert.equal(params.get('method'), 'alipay')
    assert.equal(params.get('confirmed'), '1')
    assert.equal(params.get(page === 'xiaobu-member' ? 'returnRecordId' : 'returnVoiceContextId'), 'r 1')
  }
})

test('报告和从业者购买：新单和原单使用默认渠道，已付或未知不重复建单', async () => {
  for (const [file, name] of [['pkg-paipan/bazi/ai-report.vue', 'buyReport'], ['pkg-workspace/pro/index.vue', 'purchase']]) {
    const script = read(file).split('<script setup lang="ts">')[1].split('</script>')[0]
    const ast = ts.createSourceFile('page.ts', script, ts.ScriptTarget.Latest, true)
    const fn = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name)
    for (const state of ['NEW', 'PENDING', 'PAID', 'UNKNOWN', 'DISABLED']) {
      let created = 0; let refreshed = 0; const routes = []; const messages = []
      const busy = { value: false }
      const previous = state === 'NEW' ? null : { id: 'old', amount: 10, targetId: 'record:general' }
      const api = compile(`${fn.getText(ast)}\nexports.run=${name}`, {
        buyingReport: busy, purchasing: busy, paywall: { value: { reportType: 'general', priceYuan: 10 } },
        recordId: { value: 'record' }, pro: { value: { price: 10 } },
        pendingReportOrder: { value: previous }, pendingOrder: { value: previous },
        track: { custom() {} }, checkAccessThenLoad: async () => { refreshed++ }, load: async () => { refreshed++ },
        defaultDigitalPaymentMethod: async () => { if (state === 'DISABLED') throw Error('渠道关闭'); return 'alipay' },
        shopApi: { getOrderPayState: async () => ({ status: state, paid: state === 'PAID' }),
          createOrder: async () => { created++; return { id: 'new', amount: 10 } } },
        navigateTo: route => routes.push(route), uni: { showToast: ({ title }) => messages.push(title) },
      })
      await api.run()
      assert.equal(busy.value, false)
      assert.equal(created, state === 'NEW' ? 1 : 0)
      if (['NEW', 'PENDING'].includes(state)) {
        assert.equal(routes.length, 1)
        const params = new URLSearchParams(routes[0].split('?')[1])
        assert.equal(params.get('method'), 'alipay'); assert.equal(params.get('confirmed'), '1')
        assert.equal(params.get('orderId'), state === 'NEW' ? 'new' : 'old')
      } else {
        assert.equal(routes.length, 0)
        if (state === 'PAID') assert.equal(refreshed, 1)
        else assert.equal(messages.length, 1)
      }
    }
  }
})
