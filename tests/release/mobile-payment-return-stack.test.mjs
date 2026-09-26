import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'

const root = process.cwd()
const source = file => readFileSync(resolve(root, file), 'utf8')

test('支付成功、取消和结果页使用根路由结束交易栈', () => {
  const paying = source('apps/mobile/src/pkg-shop/paying/index.vue')
  const success = source('apps/mobile/src/pkg-shop/pay-success/index.vue')
  const huifu = source('apps/mobile/src/pkg-shop/huifu-paying/index.vue')

  assert.match(paying, /reLaunch\(paidBusinessTarget\(order\)\)/u)
  assert.match(paying, /reLaunch\(paidBusinessTarget\(st\)\)/u)
  assert.match(paying, /reLaunch\(returnTarget\(\)\)/u)
  assert.match(success, /reLaunch\(`\/orders\/\$\{orderInfo\.orderId\}\?paymentReturn=1`\)/u)
  assert.match(success, /reLaunch\('\/mall'\)/u)
  assert.match(huifu, /reLaunch\(orderId \? `\/orders\/\$\{encodeURIComponent\(orderId\)\}\?paymentReturn=1` : '\/orders'\)/u)
})

test('服务端确认圈子订单已付后直接进圈子，普通订单仍走核验结果页', async () => {
  const paying = source('apps/mobile/src/pkg-shop/paying/index.vue')
  const queryString = source('apps/mobile/src/utils/query-string.ts').replace('export function queryString', 'function queryString')
  const startTarget = paying.indexOf('function paidBusinessTarget(')
  const endTarget = paying.indexOf('\nfunction startCountdown(', startTarget)
  const startComplete = paying.indexOf('async function completePaidOrder(')
  const endComplete = paying.indexOf('\nfunction clearTimers(', startComplete)
  assert.ok(startTarget >= 0 && endTarget > startTarget && startComplete >= 0 && endComplete > startComplete)
  const requireMobile = createRequire(resolve(root, 'apps/mobile/package.json'))
  const ts = requireMobile('typescript')
  const executable = ts.transpileModule(
    `${queryString}\n${paying.slice(startTarget, endTarget)}\n${paying.slice(startComplete, endComplete)}\nglobalThis.runPaid = completePaidOrder`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } },
  ).outputText

  for (const [state, expected] of [
    [{ type: 'CIRCLE_JOIN', targetId: 'circle 1' }, '/circles/circle%201?paymentSuccess=1&paymentOrderId=order-1'],
    [{ type: 'CIRCLE_RENEW', targetId: 'circle 1' }, '/circles/circle%201?paymentSuccess=1&paymentOrderId=order-1'],
    [{ type: 'GOODS', targetId: 'goods-1' }, '/shop/pay-success?orderId=order-1'],
  ]) {
    const routes = []
    let settlementCalls = 0
    const context = {
      orderId: { value: 'order-1' }, status: { value: 'paying' }, amount: { value: '1' },
      payMethod: { value: 'wechat' }, leaving: false,
      returnLiveRoomId: { value: '' }, returnRecordId: { value: '' },
      returnVoiceScene: { value: '' }, returnVoiceContextId: { value: '' }, returnVoiceSectionId: { value: '' },
      settleCircleIfNeeded: async () => { settlementCalls += 1 },
      clearTimers: () => {}, track: { purchase: () => {} },
      reLaunch: (route) => routes.push(['reLaunch', route]),
      redirectTo: (route) => routes.push(['redirectTo', route]),
      setTimeout: (callback) => callback(),
    }
    runInNewContext(executable, context)
    await context.runPaid(state, true)
    assert.equal(settlementCalls, 1)
    assert.deepEqual(routes, [[state.type === 'GOODS' ? 'redirectTo' : 'reLaunch', expected]])
  }
})

test('支付后订单详情返回订单中心，订单中心再返回商城', () => {
  const detail = source('apps/mobile/src/pkg-order/detail/index.vue')
  const list = source('apps/mobile/src/pkg-order/list/index.vue')

  assert.match(detail, /custom-back @back="handleBack"/u)
  assert.match(detail, /if \(fromPayment\.value\) \{ reLaunch\('\/orders\?paymentReturn=1'\); return \}/u)
  assert.match(list, /custom-back @back="handleBack"/u)
  assert.match(list, /if \(fromPayment\.value\) \{ reLaunch\('\/mall'\); return \}/u)
})
