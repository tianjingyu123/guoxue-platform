/** 退款申请与成员权益时序文案：所有接口均为本地夹具，不触碰真实资金。 */
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'

const { chromium } = createRequire(import.meta.url)(resolve(process.env.QA_NODE_MODULES, 'playwright'))
const origin = process.env.QA_ORIGIN
if (!origin) throw new Error('缺少隔离 H5 地址')
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const errors = []
let applyCount = 0
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await context.addInitScript(() => localStorage.setItem('auth_token', JSON.stringify({ type: 'string', data: 'local-fixture-only' })))
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.includes('/api/v1/')) {
      const path = url.pathname.split('/api/v1')[1]
      let data = {}
      if (path === '/circles/c1') data = { id: 'c1', name: '共读经典', description: '一起读书。', type: 'YEARLY', status: 'ACTIVE', memberCount: 12, postCount: 3, owner: { id: 'owner', nickname: '领读人' } }
      else if (path === '/circles/c1/join/status') data = { joined: true, role: 'member', joinedAt: '2026-09-01T00:00:00Z', expireAt: '2027-09-01T00:00:00Z' }
      else if (path === '/circle-refund/preview/c1') data = { orderId: 'local-order', paidAmount: 365, dailyCost: 1, usedDays: 22, refundBase: 343, feeRate: 0.2, feeAmount: 68.6, actualRefund: 274.4 }
      else if (path === '/circle-refund/apply/c1' && route.request().method() === 'POST') { applyCount++; data = { id: 'local-refund', actualRefund: 274.4 } }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, data, message: 'ok' }) })
    }
    if (url.origin === origin || url.protocol === 'data:') return route.continue()
    return route.abort()
  })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${origin}/h5/pkg-circle/circles/exit?id=c1`)
  await page.getByText('退款完成后你将失去').waitFor()
  await page.getByText('成员身份在退款完成后取消').waitFor()
  assert.equal(await page.getByText('成员身份即刻取消').count(), 0)
  await page.getByText('仍要申请退款').click()
  await page.getByText('等待圈主处理').waitFor()
  await page.getByText('等待平台处理').waitFor()
  await page.getByText('以上为当前测算', { exact: false }).waitFor()
  await page.getByText('提交退款申请').click()
  await page.getByText('申请期间仍可使用现有圈内权益', { exact: false }).waitFor()
  assert.equal(applyCount, 1)
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ passed: 8, simulatedApplications: applyCount, errors }))
} finally {
  await browser.close()
}
