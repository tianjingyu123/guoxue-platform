import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import test from 'node:test'

const source = fs.readFileSync('apps/mobile/src/utils/wechat-mini-payment.ts', 'utf8')
const ts = createRequire(resolve('apps/mobile/package.json'))('typescript')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText
const payingPage = fs.readFileSync('apps/mobile/src/pkg-shop/paying/index.vue', 'utf8')
const androidOptionsSource = fs.readFileSync('apps/mobile/src/utils/android-payment-options.ts', 'utf8')
const shopController = fs.readFileSync('apps/server/src/modules/shop/shop.controller.ts', 'utf8')

const androidOptionsCompiled = ts.transpileModule(androidOptionsSource, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText
const androidOptions = {}
vm.runInNewContext(androidOptionsCompiled, { exports: androidOptions })

function runtime(services) {
  const calls=[]; const exports={}
  const plus={share:{getServices:ok=>ok(services(calls))}}
  vm.runInNewContext(compiled,{exports,plus,Promise})
  return {api:exports,calls}
}

test('App使用服务端生成的微信短链接拉起小程序，金额不进入启动参数', async () => {
  const {api,calls}=runtime(calls=>[{id:'weixin',nativeClient:true,launchMiniProgram:(options,ok)=>{calls.push(options);ok()}}])
  await api.launchWechatMiniPayment({orderId:'order_12345678',amount:'9999',shortLink:'https://wxaurl.cn/AbCd1234'})
  assert.equal(calls.length,1)
  assert.equal(calls[0].shortLink,'https://wxaurl.cn/AbCd1234')
  assert.doesNotMatch(JSON.stringify(calls[0]),/9999|order_12345678/u)
})

test('非法短链接、非法订单或无微信客户端时拒绝拉起', async () => {
  const {api}=runtime(()=>[])
  await assert.rejects(api.launchWechatMiniPayment({orderId:'order_12345678',shortLink:'https://evil.example/a'}),/链接无效/u)
  assert.throws(()=>api.wechatMiniPaymentPath('../bad'),/订单信息无效/u)
  await assert.rejects(api.launchWechatMiniPayment({orderId:'order_12345678',shortLink:'https://wxaurl.cn/AbCd1234'}),/微信客户端/u)
})

test('App 支付页不再被旧安卓总开关拦截', () => {
  assert.match(payingPage, /launchWechatMiniPayment/u)
  assert.doesNotMatch(payingPage, /当前请返回订单使用支付宝支付/u)
})

test('安卓收银台默认支付宝，同时允许用户选择微信小程序支付', () => {
  const methods = androidOptions.androidPaymentMethods()
  assert.equal(Array.from(methods, item => item.id).join(','), 'alipay,wechat')
  assert.doesNotThrow(() => androidOptions.assertAndroidPaymentMethod('android', 'alipay'))
  assert.doesNotThrow(() => androidOptions.assertAndroidPaymentMethod('android', 'wechat'))
  assert.throws(() => androidOptions.assertAndroidPaymentMethod('android', 'unionpay'), /支付宝或微信/u)
})

test('服务端先校验本人待付订单，再生成不含金额的小程序短链接', () => {
  const start = shopController.indexOf('async miniProgramPayLink')
  const end = shopController.indexOf('\n  @Get("orders/:id")', start)
  const method = start >= 0 && end > start ? shopController.slice(start, end) : ''
  assert.match(method, /getCurrentOrder\(id, req\.user\.id\)/u)
  assert.match(method, /order\.status !== "PENDING"/u)
  assert.match(method, /generateShortLink/u)
  assert.match(method, /orderId=\$\{encodeURIComponent\(id\)\}/u)
  assert.doesNotMatch(method, /amount/u)
})
