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
const device = compile(file('utils/payment-device.ts'))
const policy = compile(file('utils/h5-payment-options.ts'), { require: name => name === './payment-device' ? device : alipayH5 })
const config = { getRemoteConfig: () => ({ features: { client_pay_h5_unionpay_desktop: true } }), hydrateRemoteConfig: async () => {} }
const mobileUa = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/128.0 Mobile Safari/537.36'
const wechatIdentity = compile(file('utils/wechat-payment-identity.ts'))

test('渠道默认按环境收敛，独立布尔开关不开放错误环境', () => {
  const enabled = (ua, flags, top = true) => Array.from(policy.h5PaymentOptions(ua, flags, top).filter(x => x.enabled), x => x.id)
  assert.deepEqual(enabled(mobileUa), ['alipay'])
  assert.deepEqual(enabled('Windows Chrome'), ['alipay'])
  assert.deepEqual(enabled(mobileUa + ' MicroMessenger/8'), ['wechat'])
  assert.deepEqual(enabled('Windows Chrome MicroMessenger/8'), [])
  assert.deepEqual(enabled(mobileUa, {}, false), [])
  assert.deepEqual(enabled(mobileUa, { client_pay_h5_alipay_mobile: false }), [])
  assert.deepEqual(enabled(mobileUa, { client_pay_h5_unionpay_desktop: true }), ['alipay'])
  assert.deepEqual(enabled('Windows Chrome', { client_pay_h5_unionpay_desktop: true }), ['alipay', 'unionpay'])
  assert.deepEqual(enabled('Windows Chrome', { client_pay_h5_wechat_mweb: true }), ['alipay'])
  assert.deepEqual(enabled(mobileUa, { client_pay_h5_wechat_mweb: 'true' }), ['alipay'])
  assert.deepEqual(enabled(mobileUa + ' MicroMessenger/8', { client_pay_h5_alipay_mobile: true, client_pay_h5_wechat_jsapi: false }), [])
})

test('最新订单直读校验归属并只清缓存，不覆盖并发退款或调用付款', async () => {
  const source = ts.createSourceFile('shop.ts', fs.readFileSync('apps/server/src/modules/shop/shop-order.service.ts','utf8'), ts.ScriptTarget.Latest, true)
  const cls = source.statements.find(ts.isClassDeclaration)
  const methods = ['getCurrentOrder', 'getOrder', 'enrichOrders'].map(name => cls.members.find(n=>n.name?.getText(source)===name).getText(source)).join('\n')
  const C = compile(`class Service { ${methods} }; exports.C=Service;`, { CACHE_PREFIX:'shop:', ORDER_CACHE_TTL:300, BusinessException:class extends Error {constructor(code,msg){super(msg);this.code=code}}, ErrorCode:{FORBIDDEN:'403',NOT_FOUND:'404'} }).C
  const service = new C(); let row={id:'one',userId:'owner',status:'PAID'}, cached={...row,status:'PENDING'}, deletes=0, writes=0
  service.prisma = { order:{findUnique:async()=>({...row})} }
  service.redis = { getJson:async()=>cached, setJson:async()=>{writes++}, del:async()=>{ deletes++; row.status='REFUNDED'; cached=null } }
  assert.equal((await service.getOrder('one','owner')).status,'PENDING')
  assert.equal((await service.getCurrentOrder('one','owner')).status,'PAID')
  assert.equal((await service.getCurrentOrder('one','owner')).status,'REFUNDED')
  assert.equal(writes,0); assert.equal(deletes,2); assert.equal(cached,null)
  await assert.rejects(service.getCurrentOrder('one','other'),e=>e.code==='403')
  await assert.rejects(service.getCurrentOrder('one',''),e=>e.code==='403')
  assert.equal(deletes,2)
  service.redis.del=async()=>{throw Error('redis unavailable')}
  assert.equal((await service.getCurrentOrder('one','owner')).status,'REFUNDED')
  const controller=fs.readFileSync('apps/server/src/modules/shop/shop.controller.ts','utf8')
  const route=controller.slice(controller.indexOf('@Get("orders/:id/current")'),controller.indexOf('@Get("orders/:id")'))
  assert.match(route,/UseGuards\(JwtAuthGuard, StrictRedisThrottleGuard\)/)
  assert.match(route,/Header\("Cache-Control", "no-store"\)/)
  assert.match(route,/getCurrentOrder\(id, req.user.id\)/)
})

test('通道已付才触发有限直读，普通轮询不直查；缓存PENDING不妨碍DB已付确认', async () => {
  let now=100000, paid=false, dbPaid=false; const reads=[]
  const f=fixture({now:()=>now,readOrder:async fresh=>{reads.push(fresh);return {id:'original-one',amount:0.01,status:fresh&&dbPaid?'PAID':'PENDING',type:'PRODUCT'}},queryPayment:async()=>({trans_stat:paid?'S':'P'})})
  await f.flow.start(); await f.flow.check(); assert.equal(reads.filter(Boolean).length,0)
  paid=true; await f.flow.check(); assert.equal(f.view.phase,'pending'); assert.equal(reads.filter(Boolean).length,1)
  await f.flow.check(); assert.equal(reads.filter(Boolean).length,1)
  now+=15000; dbPaid=true; await f.flow.check(); assert.equal(f.view.phase,'success'); assert.equal(reads.filter(Boolean).length,2)
  assert.equal(f.counts.creates.length,1)
})

test('手机渠道用支付名称，桌面用扫码名称；真实checkout按设备显示', () => {
  const tree = ts.createSourceFile('shop.ts', platform(file('lib/shop-data.ts'), 'H5'), ts.ScriptTarget.Latest, true)
  const declaration = tree.statements.filter(ts.isVariableStatement).flatMap(s => [...s.declarationList.declarations]).find(n => n.name.getText(tree) === 'checkoutPayMethods')
  for (const ua of [mobileUa, mobileUa+' MicroMessenger/8', 'Windows NT Chrome']) {
    const result = compile(`const ${declaration.getText(tree)};exports.methods=checkoutPayMethods;`, { ...device, navigator: { userAgent: ua } }).methods
    assert.deepEqual(Array.from(result,x=>x.name), device.isPaymentMobile(ua) ? ['微信支付','支付宝支付','云闪付支付'] : ['微信扫码','支付宝扫码','云闪付扫码'])
  }
})
test('服务端只读本人当前付款公众号H5身份，拒绝不确定或缺失身份', async () => {
  const source = ts.createSourceFile('auth.ts', fs.readFileSync('apps/server/src/modules/auth/auth.service.ts','utf8'), ts.ScriptTarget.Latest, true)
  const cls = source.statements.find(ts.isClassDeclaration)
  const method = cls.members.find(n=>n.name?.getText(source)==='getWechatPaymentIdentity').getText(source)
  let queried
  const C = compile(`class Auth { ${method} };exports.C=Auth;`, { process:{env:{WECHAT_OFFICIAL_APPID:'wx-payment',WECHAT_APP_ID:'wx-other'}} }).C
  const svc = new C(); let rows=[{openId:'oa-user-one'}]
  svc.prisma={auth:{findMany:async q=>{queried=q;return rows}}}
  assert.equal((await svc.getWechatPaymentIdentity('one')).openid,'oa-user-one')
  assert.deepEqual(JSON.parse(JSON.stringify(queried.where)),{userId:'one',provider:'WECHAT',namespace:'wechat:h5:wx-payment',appId:'wx-payment'})
  assert.equal(queried.take,2)
  rows=[{openId:'a'},{openId:'b'}];const ambiguous=await svc.getWechatPaymentIdentity('one');assert.equal(ambiguous.openid,null);assert.equal(ambiguous.allowSessionCache,false)
  rows=[];assert.equal((await svc.getWechatPaymentIdentity('one')).allowSessionCache,true)
})
test('前端优先登录公众号身份，缓存按账号/AppID隔离，旧缓存和不确定身份不复用', async () => {
  const calls=[];const cache={'wx_oa_openid':'old-unscoped','wx_oa_openid:one:wxA':'cached-A'}
  const read=k=>{calls.push(k);return cache[k]||null}
  assert.equal((await wechatIdentity.reusableWechatPaymentIdentity('one',async()=>({appId:'wxA',openid:'login-A'}),read)).openid,'login-A')
  assert.equal((await wechatIdentity.reusableWechatPaymentIdentity('one',async()=>({appId:'wxA',allowSessionCache:true}),read)).openid,'cached-A')
  for (const [user,app] of [['two','wxA'],['one','wxB']]) assert.equal((await wechatIdentity.reusableWechatPaymentIdentity(user,async()=>({appId:app,allowSessionCache:true}),read)).openid,'')
  assert.equal((await wechatIdentity.reusableWechatPaymentIdentity('one',async()=>({appId:'wxA',allowSessionCache:false}),read)).openid,'')
  assert.equal((await wechatIdentity.reusableWechatPaymentIdentity('one',async()=>{throw Error('old server')},read)).openid,'')
  assert.equal(calls.includes('wx_oa_openid'),false)
})
test('真实微信支付页已有同公众号登录身份时不请求第二次OAuth', async () => {
  const urls=[]
  const ensure = realFunction('pkg-shop/paying/index.vue','ensureOaOpenid','H5', {
    ...wechatIdentity,getUserInfo:()=>({id:'one'}),window:{location:{search:''}},URLSearchParams,readWechatOauthCode:()=>'',
    sessionStorage:{getItem:()=>null},apiGet:async url=>{urls.push(url);return {appId:'wx-payment',openid:'logged-in-oa'}},
  })
  assert.equal(await ensure(),'logged-in-oa');assert.equal(urls.length,1);assert.ok(urls[0].startsWith('/auth/wechat/payment-identity?'))
})

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
      ...config, ...policy, shopApi: { createOrder: async () => { count++; return { id: 'original-one', amount: 0.01 } } }, uni: { showToast() {} }, redirectTo: p => paths.push(p), ...api,
    })
    await fn(); submitting.value = false; await fn()
    assert.equal(count, 1); assert.equal(paths.length, 2); assert.ok(paths.every(p => p === api.existingOrderCashierRoute('original-one', method, true)))
  }
})
test('详情真实去支付选择渠道；原订单ID不变，取消不发请求', async () => {
  let options; const paths = []
  const fn = realFunction('pkg-order/detail/index.vue', 'goPay', 'H5', { order: { value: { id: 'old-one', orderType: 'PRODUCT', status: 'pending_pay', payAmount: 0.01 } }, choosingPayment: false, uni: { showActionSheet(v) { options = v } }, navigateTo: p => paths.push(p), ...api, ...device, ...policy, ...config })
  await fn(); assert.equal(paths.length, 0); assert.equal(options.itemList.length, 2)
  options.success({ tapIndex: 1 }); assert.equal(paths[0], api.existingOrderCashierRoute('old-one', 'unionpay', true))
})
test('iOS和小程序checkout与详情保留原有支付分支', () => {
  for (const target of ['APP-PLUS', 'MP-WEIXIN']) {
    const code = platform(file('lib/shop-data.ts'), target); const tree = ts.createSourceFile('data.ts', code, ts.ScriptTarget.Latest, true)
    const declaration = tree.statements.filter(ts.isVariableStatement).flatMap(s => [...s.declarationList.declarations]).find(n => n.name.getText(tree) === 'checkoutPayMethods')
    const options = compile('exports.options=' + declaration.initializer.getText(tree)).options
    assert.deepEqual(Array.from(options, x => x.id), ['wechat'])
    let old = 0; realFunction('pkg-order/detail/index.vue', 'goPay', target, { order: { value: { id: 'one' } }, uni: { getSystemInfoSync: () => ({ platform: 'ios' }) }, isAndroidPaymentPlatform: p => p === 'android', goLegacyPay: () => { old++ } })(); assert.equal(old, 1)
    assert.equal(platform(file('pages.json'), target).includes('"huifu-paying/index"'), false)
  }
})

test('安卓真实checkout、原订单、购买弹层均进入支付宝，未开通渠道建单前拦截', async () => {
  const native=compile(file('utils/android-payment-options.ts'))
  const paths=[], errors=[]; let creates=0
  const uni={getSystemInfoSync:()=>({platform:'android'}),showToast:x=>errors.push(x.title)}
  assert.deepEqual(Array.from(native.androidPaymentMethods(),x=>x.id),['alipay'])
  const refs={submitting:{value:false},items:{value:[{productId:'product',quantity:1}]},currentAddress:{value:{id:'address'}},estimate:{value:{}},selectedCoupon:{value:null},createdOrders:new Map(),contentSource:{value:{}},payMethod:{value:'wechat'}}
  const checkout=realFunction('pkg-shop/checkout/index.vue','submitOrder','APP-PLUS',{...refs,...native,uni,shopApi:{createOrder:async()=>{creates++;return{id:'order-one',amount:0.01}}},redirectTo:p=>paths.push(p)})
  await checkout(); assert.equal(creates,0); assert.equal(errors.length,1)
  refs.payMethod.value='alipay'; await checkout(); assert.equal(creates,1); assert.match(paths.pop(),/orderId=order-one&method=alipay/)
  const order={value:{id:'order-one',status:'pending_pay'}}
  const detail=realFunction('pkg-order/detail/index.vue','goPay','APP-PLUS',{order,uni,...native,navigateTo:p=>paths.push(p),goLegacyPay:()=>{throw Error('wrong branch')}})
  await detail(); assert.equal(paths.pop(),'/shop/paying?orderId=order-one&method=alipay')
  order.value.status='completed'; await detail(); assert.equal(paths.length,0)
  const state={paying:{value:false},props:{product:{id:'product'},bizType:'PRODUCT'},hasSku:{value:false},selectedSku:{value:null},quantity:{value:1},total:{value:0.01},payMethod:{value:'wechat'}}
  const sheet=realFunction('components/common/purchase-sheet.vue','onPay','APP-PLUS',{...state,...native,uni,purchaseApi:{createOrder:async()=>{creates++;return{id:'order-sheet'}}},onClose:()=>{},navigateTo:p=>paths.push(p)})
  await sheet(); assert.equal(creates,1)
  state.payMethod.value='alipay'; await sheet(); assert.equal(creates,2); assert.match(paths.pop(),/orderId=order-sheet&method=alipay/)
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
    '@/utils/payment-device': device,
    '@/utils/h5-payment-options': policy,
    '@/lib/remote-config': config,
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
  assert.equal(initialized, 1); assert.equal(paints, 0); assert.equal(timers.size, 1)
  assert.equal(paints, 0) // 手机不显示扫码入口
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

function cashierPage(state, ua = mobileUa) {
  const hooks={}, timers=new Map(), listeners=new Map(), paths=[], opened=[]; let timer=0, paints=0
  const browser={ location:{assign:url=>opened.push(url)}, addEventListener:(n,f)=>listeners.set(n,f), removeEventListener:n=>listeners.delete(n) }; browser.self=browser;browser.top=browser
  const doc={visibilityState:'visible',addEventListener:(n,f)=>listeners.set(n,f),removeEventListener:n=>listeners.delete(n)}
  const modules={
    vue:{ref:value=>({value}),nextTick:async()=>{},getCurrentInstance:()=>({})},
    '@dcloudio/uni-app':Object.fromEntries(['onLoad','onShow','onHide','onUnload'].map(n=>[n,f=>hooks[n]=f])),
    '@/utils/router':{redirectTo:p=>paths.push(p)},
    '@/utils/request':{apiGet:async url=>{state.reads.push(url);if(state.denied)throw Error('只能查看自己的订单');return {...state.order,status:url.endsWith('/current')?state.dbStatus:state.order.status}}},
    '@/utils/storage':{getUserInfo:()=>({id:state.account})},
    '@/lib/purchase-data':{purchaseApi:{payByChannel:async()=>{state.creates++; if(state.fail)throw Error('结果未知');return {outTradeNo:'HF-one',qrCode:'https://qr.alipay.com/test'}},queryHuifuPayment:async()=>({trans_stat:state.channelStatus})}},
    '@/utils/qrcode':{drawQrToCanvas:()=>{paints++;return true}},
    '@/utils/existing-order-huifu':api,'@/utils/huifu-alipay-h5':alipayH5,'@/utils/payment-device':device,'@/utils/h5-payment-options':policy,
    '@/lib/remote-config':{getRemoteConfig:()=>({features:state.flags||{}}),hydrateRemoteConfig:()=>state.hydrate||Promise.resolve()},
  }
  const page=compile(script('pkg-shop/huifu-paying/index.vue')+'\nexports.check=checkPayment;exports.open=openAlipay;exports.getView=()=>view.value;',{
    require:n=>{assert.ok(modules[n],n);return modules[n]},navigator:{userAgent:ua},window:browser,document:doc,
    setTimeout:f=>{timers.set(++timer,f);return timer},clearTimeout:n=>timers.delete(n),
    Date:class extends Date{static now(){return state.now}},
    uni:{getStorageSync:k=>state.storage.get(k),setStorageSync:(k,v)=>state.storage.set(k,JSON.parse(JSON.stringify(v))),createCanvasContext:()=>({draw:(_,cb)=>cb()})},
  })
  return {page,hooks,timers,listeners,paths,opened,doc,get paints(){return paints}}
}
function cashierState(){return {account:'owner',order:{id:'one',status:'PENDING',amount:0.01,type:'PRODUCT'},dbStatus:'PENDING',channelStatus:'P',storage:new Map(),creates:0,reads:[],now:100000}}

test('真实收银confirmed首次自动准备一次，手机不自动scheme，刷新仅恢复，服务端到账自动回原单一次',async()=>{
  const state=cashierState(), first=cashierPage(state)
  await first.hooks.onLoad({orderId:'one',method:'alipay',confirmed:'1'});await new Promise(r=>setImmediate(r))
  assert.equal(state.creates,1);assert.equal(first.paints,0);assert.equal(first.opened.length,0)
  first.page.open();assert.equal(first.opened.length,1)
  first.hooks.onUnload()
  const second=cashierPage(state)
  await second.hooks.onLoad({orderId:'one',method:'alipay',confirmed:'1'})
  assert.equal(state.creates,1);assert.equal(second.page.getView().phase,'pending')
  state.channelStatus='S';await second.page.check();assert.equal(second.paths.length,0)
  state.now+=15000;state.dbStatus='PAID';await second.page.check()
  assert.deepEqual(second.paths,['/orders/one?paymentReturn=1']);assert.equal(second.timers.size,0);assert.equal(second.listeners.size,0)
  second.hooks.onShow();await second.page.check();assert.equal(second.paths.length,1);assert.equal(state.creates,1)
})

test('真实桌面确认后直接绘制二维码；隐藏期间确认到账等页面可见才回单',async()=>{
  const state=cashierState(), p=cashierPage(state,'Windows NT Chrome')
  await p.hooks.onLoad({orderId:'one',method:'alipay',confirmed:'1'});await new Promise(r=>setImmediate(r));assert.ok(p.paints>0)
  p.hooks.onHide();state.dbStatus='PAID';await p.page.check();assert.equal(p.paths.length,0)
  p.hooks.onShow();assert.deepEqual(p.paths,['/orders/one?paymentReturn=1'])
})

test('confirmed不能绕过归属、有效金额、终态、渠道禁用或未知持久标记，加载离开也不初始化',async()=>{
  for(const mode of ['denied','invalid','paid','disabled','unknown','wechat']){
    const state=cashierState();if(mode==='denied')state.denied=true
    if(mode==='invalid')state.order.amount=-1
    if(mode==='paid')state.order.status='PAID'
    if(mode==='disabled')state.flags={client_pay_h5_alipay_mobile:false}
    if(mode==='unknown')state.storage.set('huifu:h5:existing:owner:one',{orderId:'one',channel:'alipay',requestedAt:100000})
    const p=cashierPage(state,mode==='wechat'?mobileUa+' MicroMessenger/8':mobileUa)
    await p.hooks.onLoad({orderId:'one',method:'alipay',confirmed:'1'});assert.equal(state.creates,0,mode);p.hooks.onUnload()
  }
  const state=cashierState();let resolve;state.hydrate=new Promise(r=>resolve=r)
  const p=cashierPage(state),pending=p.hooks.onLoad({orderId:'one',method:'alipay',confirmed:'1'})
  p.hooks.onUnload();resolve();await pending;assert.equal(state.creates,0);assert.equal(p.listeners.size,0)
  const unknown=cashierState();unknown.fail=true
  const first=cashierPage(unknown);await first.hooks.onLoad({orderId:'one',method:'alipay',confirmed:'1'});first.hooks.onUnload()
  await cashierPage(unknown).hooks.onLoad({orderId:'one',method:'alipay',confirmed:'1'});assert.equal(unknown.creates,1)
})

test('订单返回首次直读，后续缓存不回退同账号原单；退款和不同账号状态不冻结',async()=>{
  for (const target of ['H5','APP-PLUS']) {
  const order={value:null},calls=[];let account='owner',next={id:'one',status:'pending_ship'}
  const load=realFunction('pkg-order/detail/index.vue','loadData',target,{
    uni:{getSystemInfoSync:()=>({platform:'android'})},isAndroidPaymentPlatform:p=>p==='android',
    loading:{value:false},error:{value:''},freshAfterPayment:true,lastOrderAccount:'',order,orderId:{value:'one'},getUserInfo:()=>({id:account}),
    orderApi:{detail:async(id,fresh)=>{calls.push(fresh);return {...next}}},
  })
  await load();next.status='pending_pay';await load();assert.equal(order.value.status,'pending_ship');assert.deepEqual(calls,[true,false])
  next.status='refunded';await load();assert.equal(order.value.status,'refunded')
  account='other';next.status='pending_pay';await load();assert.equal(order.value.status,'pending_pay')
  }
})

test('安卓真实付款完成只回原订单一次，账号变化不跳转',async()=>{
  for (const owner of ['owner','other']) {
    const paths=[];let settles=0
    const paid=realFunction('pkg-shop/paying/index.vue','onHuifuAlipayPaid','APP-PLUS',{
      alipayReturned:false,nativePageActive:true,paymentOwner:'owner',orderId:{value:'one'},getUserInfo:()=>({id:owner}),
      settleCircleIfNeeded:async()=>{settles++},redirectTo:p=>paths.push(p),
    })
    await paid({id:'one',status:'PAID'});await paid({id:'one',status:'PAID'})
    assert.deepEqual(paths,owner==='owner'?['/orders/one?paymentReturn=1']:[]);assert.equal(settles,owner==='owner'?1:0)
  }
})

test('真实checkout禁用渠道在业务建单前拦截；原单仅一个可用渠道时直接进入',async()=>{
  let created=0;const toast=[],paths=[]
  const submit=realFunction('pkg-shop/checkout/index.vue','submitOrder','H5',{
    submitting:{value:false},items:{value:[{}]},currentAddress:{value:{}},estimate:{value:{}},payMethod:{value:'wechat'},
    ...policy,...config,navigator:{userAgent:mobileUa},uni:{showToast:x=>toast.push(x.title)},shopApi:{createOrder:()=>created++},
  })
  await submit();assert.equal(created,0);assert.ok(toast[0].includes('微信'))
  const browser={};browser.self=browser;browser.top=browser
  const pay=realFunction('pkg-order/detail/index.vue','goPay','H5',{
    order:{value:{id:'one',status:'pending_pay',orderType:'PRODUCT',payAmount:0.01}},choosingPayment:false,...api,...policy,...config,
    navigator:{userAgent:mobileUa},window:browser,uni:{showActionSheet:()=>assert.fail('仅一个可用渠道不再多弹一次')},navigateTo:x=>paths.push(x),
  })
  await pay();assert.deepEqual(paths,[api.existingOrderCashierRoute('one','alipay',true)])
})

test('真实微信轮询：收银返回只是有限直读提示，订单PAID才回单；APP保持原成功页',async()=>{
  for(const target of ['H5','APP-PLUS']){
    let scheduled,now=100000,paid=false;const paths=[],reads=[],status={value:'paying'}
    const globals={
      pollCount:0,pollTimer:null,maxPolls:70,isRecharge:{value:false},status,orderId:{value:'one'},amount:{value:0.01},payMethod:{value:'wechat'},returnLiveRoomId:{value:''},
      h5PaymentConfirmed:true,lastH5CurrentRead:-Infinity,Date:class extends Date{static now(){return now}},
      setTimeout:fn=>{scheduled=fn;return 1},clearTimers:()=>{},track:{purchase:()=>{}},settleCircleIfNeeded:async()=>{},redirectTo:x=>paths.push(x),
      shopApi:{getOrderPayState:async(id,fresh)=>{reads.push(fresh);return {paid}}},console,
    }
    const poll=realFunction('pkg-shop/paying/index.vue','startPolling',target,globals)
    poll();await scheduled();assert.equal(paths.length,0);assert.equal(reads[0],target==='H5')
    await scheduled();assert.equal(reads[1],false)
    now+=30000;paid=true;await scheduled();assert.equal(status.value,'success')
    if(target==='APP-PLUS')await scheduled()
    assert.deepEqual(paths,[target==='H5'?'/orders/one?paymentReturn=1':'/shop/pay-success?orderId=one'])
  }
})
