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
const wechatService = fs.readFileSync('apps/server/src/modules/auth/wechat.service.ts', 'utf8')
const homePage = fs.readFileSync('apps/mobile/src/pages/index/index.vue', 'utf8')

const androidOptionsCompiled = ts.transpileModule(androidOptionsSource, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText
const androidOptions = {}
vm.runInNewContext(androidOptionsCompiled, { exports: androidOptions })

function runtime() {
  const calls=[]; const exports={}
  const plus={runtime:{openURL:(url,fail,identity)=>calls.push({url,fail,identity})}}
  vm.runInNewContext(compiled,{exports,plus,Promise,setTimeout:(fn)=>{fn();return 1}})
  return {api:exports,calls}
}

test('App使用服务端生成的微信 Scheme 拉起小程序，金额不进入启动参数', async () => {
  const {api,calls}=runtime()
  await api.launchWechatMiniPayment({orderId:'order_12345678',amount:'9999',scheme:'weixin://dl/business/?t=AbCd1234'})
  assert.equal(calls.length,1)
  assert.equal(calls[0].url,'weixin://dl/business/?t=AbCd1234')
  assert.equal(calls[0].identity,'com.tencent.mm')
  assert.doesNotMatch(JSON.stringify(calls[0]),/9999|order_12345678/u)
})

test('非法 Scheme 或非法订单时拒绝拉起', async () => {
  const {api}=runtime()
  await assert.rejects(api.launchWechatMiniPayment({orderId:'order_12345678',scheme:'https://evil.example/a'}),/入口无效/u)
  assert.throws(()=>api.wechatMiniPaymentPath('../bad'),/订单信息无效/u)
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

test('服务端先校验本人待付订单，再生成不含金额的小程序 Scheme', () => {
  const start = shopController.indexOf('async miniProgramPayLink')
  const end = shopController.indexOf('\n  @Get("orders/:id")', start)
  const method = start >= 0 && end > start ? shopController.slice(start, end) : ''
  assert.match(method, /getCurrentOrder\(id, req\.user\.id\)/u)
  assert.match(method, /order\.status !== "PENDING"/u)
  assert.match(method, /generateUrlScheme/u)
  assert.match(method, /miniPayOrderId=\$\{encodeURIComponent\(id\)\}/u)
  assert.doesNotMatch(method, /amount/u)
})

test('Scheme 只落到已发布首页，由小程序首页校验后转入支付分包', () => {
  assert.match(wechatService, /wxa\/generatescheme/u)
  assert.match(wechatService, /env_version: "release"/u)
  assert.match(homePage, /miniPayOrderId/u)
  assert.ok(homePage.includes('/^[A-Za-z0-9_-]{8,128}$/'))
  assert.match(homePage, /pkg-shop\/paying\/index\?orderId=/u)
})
