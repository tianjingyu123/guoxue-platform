/** 退款页状态与返回刷新：仅用隔离 GET 夹具，不提交退款或资金操作。 */
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'

const { chromium } = createRequire(import.meta.url)(resolve(process.env.QA_NODE_MODULES, 'playwright'))
const origin = process.env.QA_ORIGIN
if (!origin) throw new Error('缺少隔离 H5 地址')
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
let refundStatus = 'pending'
let reads = 0
let writes = 0
const errors = []
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await context.addInitScript(() => {
    localStorage.setItem('auth_token', JSON.stringify({ type: 'string', data: 'local-fixture-only' }))
    localStorage.setItem('userInfo', JSON.stringify({ type: 'object', data: { id: 'member1' } }))
  })
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.includes('/api/v1/')) {
      if (route.request().method() !== 'GET') writes++
      const path = url.pathname.split('/api/v1')[1]
      let data = {}
      if (path === '/circle-refund/my') {
        reads++
        data = [{ id: 'refund-fixture-1', circleId: 'c1', circleName: '测试圈子', ownerStatus: 'approved', adminStatus: 'approved', refundStatus, actualRefund: 18, createdAt: '2026-09-21T00:00:00Z' }]
      } else if (path === '/circle-refund/wallet') data = { balance: refundStatus === 'refunded' ? 18 : 0, transactions: [] }
      else if (path === '/circles/my') data = []
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, data, message: 'ok' }) })
    }
    if (url.origin === origin || url.protocol === 'data:') return route.continue()
    return route.abort()
  })
  const page = await context.newPage()
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${origin}/h5/pkg-circle/circles/my-refunds`)
  await page.getByText('平台审核中').waitFor()
  refundStatus = 'failed'
  await page.locator('.rf-wallet-btn').click()
  await page.waitForURL(/withdraw/)
  await page.goBack()
  await page.getByText('退款未完成').waitFor()
  await page.getByText('请联系平台客服核对退款，提供申请编号：').waitFor()
  assert.equal(await page.getByText('平台审核中').count(), 0)
  assert.ok(reads >= 2, '返回退款页后应重新读取状态')
  assert.equal(writes, 0)
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ passed: 7, reads, writes, errors }))
} finally {
  await browser.close()
}
