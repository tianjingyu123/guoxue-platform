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

function runtime(services) {
  const calls=[]; const exports={}
  const plus={share:{getServices:ok=>ok(services(calls))}}
  vm.runInNewContext(compiled,{exports,plus,Promise})
  return {api:exports,calls}
}

test('App只把订单定位交给正式版小程序，金额由服务端重读', async () => {
  const {api,calls}=runtime(calls=>[{id:'weixin',nativeClient:true,launchMiniProgram:(options,ok)=>{calls.push(options);ok()}}])
  await api.launchWechatMiniPayment({orderId:'order_12345678',amount:'9999',originalId:'gh_123456789abc'})
  assert.equal(calls.length,1)
  assert.equal(calls[0].id,'gh_123456789abc')
  assert.equal(calls[0].type,0)
  assert.match(calls[0].path,/orderId=order_12345678/u)
  assert.doesNotMatch(calls[0].path,/9999/u)
})

test('无原始ID、非法订单或无微信客户端时拒绝拉起', async () => {
  const {api}=runtime(()=>[])
  await assert.rejects(api.launchWechatMiniPayment({orderId:'order_12345678',originalId:''}),/关联配置/u)
  assert.throws(()=>api.wechatMiniPaymentPath('../bad'),/订单信息无效/u)
  await assert.rejects(api.launchWechatMiniPayment({orderId:'order_12345678',originalId:'gh_123456789abc'}),/微信客户端/u)
})

test('App 支付页不再被旧安卓总开关拦截', () => {
  assert.match(payingPage, /launchWechatMiniPayment/u)
  assert.doesNotMatch(payingPage, /当前请返回订单使用支付宝支付/u)
})
