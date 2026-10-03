/** 收益页全部请求均为隔离夹具，不读取真实资金数据。 */
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
const { chromium } = createRequire(import.meta.url)(resolve(process.env.QA_NODE_MODULES, 'playwright'))
const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:5197'
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
let failParts = true, writes = 0
const revenueTargets = [], errors = []
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await context.addInitScript(() => {
    localStorage.setItem('auth_token', JSON.stringify({ type: 'string', data: 'local-fixture-only' }))
    localStorage.setItem('userInfo', JSON.stringify({ type: 'object', data: { id: 'qa-owner' } }))
  })
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (!url.pathname.includes('/api/v1/')) return url.origin === origin ? route.continue() : route.abort()
    const path = url.pathname.split('/api/v1')[1]
    let data = [], status = 200
    if (route.request().method() !== 'GET') writes++
    if (path === '/circle-backend/revenue') {
      const id = url.searchParams.get('circleId')
      revenueTargets.push(id)
      data = { totalAmount: id === 'a' ? 123 : 456, ownerRevenue: 100, totalTransactions: 1, period: '2026-09' }
    } else if (path.includes('revenue-breakdown') || path.includes('invite-codes') || path.includes('invitation-stats')) {
      if (failParts) status = 503
      if (path.includes('revenue-breakdown')) data = { breakdown: [] }
      if (path.includes('invitation-stats')) data = { total: 0 }
    }
    return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ code: status, data, message: status === 200 ? 'ok' : '模拟失败' }) })
  })
  const page = await context.newPage()
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${origin}/h5/pkg-circle/circles/earnings?id=a`)
  await page.getByText('暂未确认', { exact: true }).waitFor()
  assert.equal(await page.locator('.hero-num').first().innerText(), '¥123')
  assert.deepEqual(await page.locator('.invite-n').allTextContents(), ['—', '—', '—', '—'])
  failParts = false
  await page.getByRole('button', { name: '重试收益附属数据' }).click()
  await page.waitForFunction(() => document.querySelector('.hero-num.plain')?.textContent === '¥0')
  assert.deepEqual(await page.locator('.invite-n').allTextContents(), ['0', '0', '0', '0'])
  await page.goto(`${origin}/h5/pkg-circle/circles/earnings?id=b`)
  await page.getByText('¥456', { exact: true }).waitFor()
  assert.equal(revenueTargets.at(-1), 'b')
  assert.ok(revenueTargets.includes('a'))
  const count = revenueTargets.length
  await page.goto(`${origin}/h5/pkg-circle/circles/earnings`)
  await page.getByText('加载失败（需圈主身份访问）', { exact: true }).waitFor()
  assert.equal(revenueTargets.length, count)
  assert.equal(writes, 0)
  assert.deepEqual(errors, [])
  console.log('4组通过：收益目标随圈切换、附属失败不假零、重试恢复真实零、缺少圈子不请求。真实业务写入0。')
} finally { await browser.close() }
