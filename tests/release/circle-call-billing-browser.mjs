/** 通话账单双角色回归：使用隔离 GET 数据，不操作真实通话与金币。 */
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'

const { chromium } = createRequire(import.meta.url)(resolve(process.env.QA_NODE_MODULES, 'playwright'))
const origin = process.env.QA_ORIGIN
if (!origin) throw new Error('缺少隔离 H5 地址')
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
let writes = 0
let listReads = 0
let waitingStatus = 'WAITING'
const errors = []
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await context.addInitScript(() => {
    localStorage.setItem('auth_token', JSON.stringify({ type: 'string', data: 'local-fixture-only' }))
    localStorage.setItem('userInfo', JSON.stringify({ type: 'object', data: { id: 'qa-expert' } }))
  })
  const handleRoute = async route => {
    const url = new URL(route.request().url())
    if (url.pathname.includes('/api/v1/')) {
      if (route.request().method() !== 'GET') writes++
      if (url.pathname.endsWith('/consult-calls/my')) listReads++
      const data = url.pathname.endsWith('/consult-calls/my') ? [
        { id: 'waiting-call', callerId: 'qa-asker', expertId: 'qa-expert', status: waitingStatus, type: 'VOICE', pricePerMinute: 10, prepaidCoin: 30, settledCoin: waitingStatus === 'ENDED' ? 10 : 0, refundedCoin: waitingStatus === 'ENDED' ? 20 : 0, durationSec: waitingStatus === 'ENDED' ? 45 : 0, createdAt: '2026-09-21T00:00:00Z' },
        { id: 'ended-call', callerId: 'qa-asker', expertId: 'qa-expert', status: 'ENDED', type: 'VOICE', pricePerMinute: 10, prepaidCoin: 30, settledCoin: 10, refundedCoin: 20, durationSec: 45, endAt: '2026-09-21T00:01:00Z', createdAt: '2026-09-21T00:00:00Z' },
        { id: 'missed-call', callerId: 'qa-asker', expertId: 'qa-expert', status: 'MISSED', type: 'VOICE', pricePerMinute: 10, prepaidCoin: 30, settledCoin: 0, refundedCoin: 30, createdAt: '2026-09-20T00:00:00Z' },
      ] : {}
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, data, message: 'ok' }) })
    }
    if (url.origin === origin || url.protocol === 'data:') return route.continue()
    return route.abort()
  }
  await context.route('**/*', handleRoute)
  const page = await context.newPage()
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${origin}/h5/pkg-circle/circles/my-calls`)
  await page.getByText('发起方预扣中，你尚无收入').waitFor()
  await page.getByText('订单金额 · 分成请以收益账户为准').waitFor()
  assert.equal(await page.getByText('分账 50% 已入账').count(), 0)
  await page.locator('.mcl-item').filter({ hasText: '订单金额 · 分成请以收益账户为准' }).click()
  await page.waitForURL(/call-end\?id=ended-call/)
  await page.getByText('订单金额').waitFor()
  await page.getByText('达人按 50% 记录收益，到账以收益账户为准').waitFor()
  assert.equal(await page.getByText('分账入账（50%）').count(), 0)
  waitingStatus = 'ENDED'
  await page.getByText('完成', { exact: true }).click()
  await page.waitForURL(/my-calls/)
  await page.getByText('发起方预扣中，你尚无收入').waitFor({ state: 'detached' })
  assert.ok(listReads >= 3, '从结算单返回后应重新读取通话列表')
  const callerContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await callerContext.addInitScript(() => {
    localStorage.setItem('auth_token', JSON.stringify({ type: 'string', data: 'local-fixture-only' }))
    localStorage.setItem('userInfo', JSON.stringify({ type: 'object', data: { id: 'qa-asker' } }))
  })
  await callerContext.route('**/*', handleRoute)
  const callerPage = await callerContext.newPage()
  callerPage.on('pageerror', e => errors.push(e.message))
  await callerPage.goto(`${origin}/h5/pkg-circle/circles/call-end?id=ended-call`)
  await callerPage.getByText('实际支付').waitFor()
  await callerPage.getByText('差额退回').waitFor()
  assert.equal(await callerPage.getByText('到账以收益账户为准').count(), 0)
  await callerPage.goto(`${origin}/h5/pkg-circle/circles/call-end?id=missed-call`)
  await callerPage.getByText('通话未接通').waitFor()
  await callerPage.getByText('通话记录', { exact: true }).waitFor()
  assert.equal(await callerPage.getByText('通话已结束', { exact: true }).count(), 0)
  assert.equal(writes, 0)
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ passed: 14, listReads, writes, errors }))
} finally {
  await browser.close()
}
