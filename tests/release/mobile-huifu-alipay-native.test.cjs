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
  let record = { id: 'order-one', amount: '0.01', status: 'PENDING' }, saved = null, view = {}, failOpen, creates = 0, opened = 0, paid = 0, queries = 0
  const d = {
    orderId: 'order-one', platform: 'Android', now: () => 100000, active: () => true,
    readOrder: async () => ({ ...record }),
    createPayment: async () => { creates++; record = { ...record, payMethod: 'HUIFU', payTransactionId: 'HF-one' }; return { outTradeNo: 'HF-one', qrCode: qr } },
    queryPayment: async () => { queries++; return { trans_stat: 'P' } },
    load: () => saved, save: (v) => { saved = JSON.parse(JSON.stringify(v)) },
    openUrl: (url, fail) => { opened++; assert.equal(url, buildAlipayNativeUrl(qr)); failOpen = fail },
    update: (v) => { view = v }, paid: () => { paid++ }, ...overrides,
  }
  return { d, flow: createAlipayNativePayment(d), setOrder: (v) => { record = { id: 'order-one', amount: '0.01', ...v } }, get view() { return view }, get saved() { return saved }, fail: () => failOpen(), counts: () => ({ creates, opened, paid, queries }) }
}

test('二维码整体编码，不把内层查询参数注入支付宝 scheme', () => {
  assert.equal(buildAlipayNativeUrl(qr), 'alipays://platformapi/startapp?saId=10000007&qrcode=' + encodeURIComponent(qr))
})

test('支付宝SDK可用时拦截汇付URL，不再打开浏览器或手工scheme', () => {
  const opened=[]; let returned=0
  const runtime={
    android:{
      importClass:name=>{ assert.equal(name,'com.alipay.sdk.app.PayTask'); return class { payInterceptorWithUrl(url,loading,callback){ assert.equal(url,qr); assert.equal(loading,true); callback.onPayResult({}); return true } } },
      runtimeMainActivity:()=>({}),
      implements:(name,methods)=>{ assert.equal(name,'com.alipay.sdk.app.H5PayCallback'); return methods },
    },
    runtime:{openURL:url=>opened.push(url)},
  }
  assert.equal(mod.exports.openHuifuAlipayWithSdk(qr,runtime,()=>{},()=>returned++),'sdk')
  assert.equal(returned,1); assert.deepEqual(opened,[])
})

test('旧包无支付宝SDK时退回已验证scheme且不经过浏览器', () => {
  const opened=[]
  const runtime={runtime:{openURL:url=>opened.push(url)}}
  assert.equal(mod.exports.openHuifuAlipayWithSdk(qr,runtime,()=>{}),'scheme')
  assert.equal(opened[0],mod.exports.buildAlipayNativeUrl(qr))
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
  active = true; f.d.readOrder = async () => ({ id: 'order-one', amount: '0.01', status: 'PAID' }); await f.flow.check(); assert.equal(f.counts().paid, 1)
})

test('初始化前后直读订单，旧缓存缺流水也能打开且金额不使用路由参数', async () => {
  const reads = []; let created = false
  const f = fixture({
    readOrder: async fresh => { reads.push(fresh); return { id: 'order-one', amount: '0.01', status: 'PENDING', ...(fresh && created ? { payMethod: 'HUIFU', payTransactionId: 'HF-one' } : {}) } },
    createPayment: async () => { created = true; return { outTradeNo: 'HF-one', qrCode: qr } },
  })
  await f.flow.start(); assert.equal(f.counts().opened, 1); assert.deepEqual(reads, [true, true])
})

test('缓存一直待付时有限直读仍能发现到账，查询S不能单独判成功', async () => {
  let now = 100000, created = false, dbPaid = false; const reads = []
  const f = fixture({ now: () => now,
    readOrder: async fresh => { reads.push({ now, fresh }); return { id: 'order-one', amount: '0.01', status: fresh && dbPaid ? 'PAID' : 'PENDING', ...(created ? { payMethod: 'HUIFU', payTransactionId: 'HF-one' } : {}) } },
    createPayment: async () => { created = true; return { outTradeNo: 'HF-one', qrCode: qr } }, queryPayment: async () => ({ trans_stat: 'S' }),
  })
  await f.flow.start()
  for (let i=0;i<19;i++) { now+=3000; await f.flow.check() }
  assert.ok(reads.filter(r=>r.fresh).length <= 8); assert.equal(f.counts().paid,0)
  dbPaid=true; now+=12000; await f.flow.check(); assert.equal(f.counts().paid,1)
})

test('账号改变或页面离开后初始化迟到不会拉起，服务端原流水阻止重建', async () => {
  let release, active = true
  const f = fixture({ active:()=>active, createPayment:()=>new Promise(r=>{release=r}) })
  const task=f.flow.start(); await new Promise(r=>setImmediate(r)); active=false
  release({outTradeNo:'HF-one',qrCode:qr}); await task; assert.equal(f.counts().opened,0)
  assert.ok(f.saved); active=true; f.setOrder({status:'PENDING',payMethod:'HUIFU',payTransactionId:'HF-one'})
  await f.flow.reopen(); assert.equal(f.counts().opened,1)
})

test('错误订单、非法金额、存储读取失败时不建支付单', async () => {
  for (const row of [{id:'other',amount:'0.01'},{id:'order-one',amount:'invalid'}]) {
    const f=fixture({readOrder:async()=>({...row,status:'PENDING'})}); await f.flow.start(); assert.equal(f.counts().creates,0)
  }
  const f=fixture({load:()=>{throw Error('storage denied')}}); await f.flow.start(); assert.equal(f.counts().creates,0)
})

function componentFixture() {
  const storage=new Map(), paths=[], opened=[], events=[], hooks={}, exported={exports:{}}
  let account='account-one', now=100000, row={id:'order-one',amount:'0.01',status:'PENDING'}, delayPay=null
  const modules={
    vue:{ref:value=>({value}),onMounted:fn=>{hooks.mount=fn},onUnmounted:fn=>{hooks.unmount=fn}},
    '@/utils/request':{apiGet:async path=>{paths.push(path);return {...row}}},
    '@/utils/storage':{getUserInfo:()=>({id:account})},
    '@/utils/huifu-alipay-native':mod.exports,
    '@/lib/purchase-data':{purchaseApi:{payByChannel:async()=>{if(delayPay)await delayPay;row={...row,payMethod:'HUIFU',payTransactionId:'HF-one'};return{outTradeNo:'HF-one',qrCode:qr}},queryHuifuPayment:async()=>({trans_stat:'P'})}},
  }
  const src=fs.readFileSync('apps/mobile/src/components/common/huifu-alipay-payment.vue','utf8').split('<script setup lang="ts">')[1].split('</script>')[0]
  vm.runInNewContext(ts.transpileModule(src+'\nexports.view=view;exports.displayAmount=displayAmount;', {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
    exports:exported.exports,require:name=>modules[name],defineProps:()=>({orderId:'order-one',amount:'999'}),defineEmits:()=>((...v)=>events.push(v)),defineExpose:api=>{hooks.api=api},Date:{now:()=>now},setTimeout:()=>1,clearTimeout:()=>{},
    plus:{os:{name:'Android'},runtime:{openURL:url=>opened.push(url)}},uni:{getStorageSync:key=>storage.get(key),setStorageSync:(key,value)=>storage.set(key,JSON.parse(JSON.stringify(value)))},
  })
  return {hooks,storage,paths,opened,events,ui:exported.exports,setAccount:v=>{account=v},setNow:v=>{now=v},paid:()=>{row.status='PAID'},delay:v=>{delayPay=v}}
}

test('真实安卓组件读取/current和服务器金额，账号订单独立持久化，恢复到账只通知一次', async () => {
  const f=componentFixture();await f.hooks.mount()
  assert.deepEqual(f.paths,['/shop/orders/order-one/current','/shop/orders/order-one/current'])
  assert.equal(f.ui.displayAmount.value,'0.01');assert.equal(f.opened.length,1)
  assert.ok(f.storage.has('rebu:huifu-alipay:account-one:order-one'))
  f.hooks.api.pause();f.paid();f.setNow(115000);await f.hooks.api.resume();await f.hooks.api.resume()
  assert.equal(f.events.filter(v=>v[0]==='paid').length,1)
})

test('真实组件跨账号迟到的初始化响应不保存二维码、不拉起或发成功事件', async () => {
  const f=componentFixture();let release;f.delay(new Promise(r=>{release=r}))
  const pending=f.hooks.mount();await new Promise(r=>setImmediate(r));f.setAccount('account-two');release();await pending
  assert.equal(f.opened.length,0);assert.equal(f.events.length,0)
  assert.equal(f.storage.get('rebu:huifu-alipay:account-one:order-one').qrCode,undefined)
  await f.hooks.api.resume();assert.equal(f.ui.view.value.phase,'closed')
})
