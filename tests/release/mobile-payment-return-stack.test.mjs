import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const source = file => readFileSync(resolve(root, file), 'utf8')

test('支付成功、取消和结果页使用根路由结束交易栈', () => {
  const paying = source('apps/mobile/src/pkg-shop/paying/index.vue')
  const success = source('apps/mobile/src/pkg-shop/pay-success/index.vue')
  const huifu = source('apps/mobile/src/pkg-shop/huifu-paying/index.vue')

  assert.match(paying, /reLaunch\(paidBusinessTarget\(st\)\)/u)
  assert.match(paying, /reLaunch\(returnTarget\(\)\)/u)
  assert.match(success, /reLaunch\(`\/orders\/\$\{orderInfo\.orderId\}\?paymentReturn=1`\)/u)
  assert.match(success, /reLaunch\('\/mall'\)/u)
  assert.match(huifu, /reLaunch\(orderId \? `\/orders\/\$\{encodeURIComponent\(orderId\)\}\?paymentReturn=1` : '\/orders'\)/u)
})

test('支付后订单详情返回订单中心，订单中心再返回商城', () => {
  const detail = source('apps/mobile/src/pkg-order/detail/index.vue')
  const list = source('apps/mobile/src/pkg-order/list/index.vue')

  assert.match(detail, /custom-back @back="handleBack"/u)
  assert.match(detail, /if \(fromPayment\.value\) \{ reLaunch\('\/orders\?paymentReturn=1'\); return \}/u)
  assert.match(list, /custom-back @back="handleBack"/u)
  assert.match(list, /if \(fromPayment\.value\) \{ reLaunch\('\/mall'\); return \}/u)
})
