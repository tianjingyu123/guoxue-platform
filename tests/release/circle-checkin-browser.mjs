/** 签到榜隔离回归：只接受服务端独立连签榜，旧接口须显式失败。 */
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'

const { chromium } = createRequire(import.meta.url)(resolve(process.env.QA_NODE_MODULES, 'playwright'))
const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:5198'
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const json = data => ({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, data, message: 'ok' }) })
const first = { rank: 1, userId: 'me', nickname: '连续签到成员', avatar: '', checkinStreak: 7, checkinExp: 90, level: 1, levelName: '初入门径' }
let updatedApi = false
try {
  const context = await browser.newContext({ viewport: { width: 320, height: 720 } })
  await context.addInitScript(() => localStorage.setItem('auth_token', JSON.stringify({ type: 'string', data: 'local-fixture-only' })))
  let writes = 0
  await context.route('**/*', route => {
    const url = new URL(route.request().url())
    if (!url.pathname.includes('/api/v1/')) return url.origin === origin || url.protocol === 'data:' ? route.continue() : route.abort()
    if (route.request().method() !== 'GET') writes++
    const path = url.pathname.split('/api/v1')[1]
    if (path === '/circles/qa/growth') return route.fulfill(json({ me: { checkinStreak: 7, checkinExp: 90, rank: 22 }, leaderboard: [], ...(updatedApi ? { checkinLeaderboard: [first], myCheckinRank: 1 } : {}) }))
    if (path === '/circles/qa/checkin/calendar') return route.fulfill(json({ month: '2026-09', today: '2026-09-22', checkedToday: true, totalCheckins: 7, days: [] }))
    return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' })
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${origin}/h5/pkg-circle/circles/checkin?id=qa`)
  await page.getByText('加载失败', { exact: true }).waitFor()
  updatedApi = true
  await page.getByText('重试', { exact: true }).click()
  await page.getByText('连续签到成员', { exact: true }).waitFor()
  assert.equal(await page.locator('.ck-stat').last().locator('.ck-stat-num').innerText(), '#1')
  assert.equal(await page.locator('.ck-rank-no').first().innerText(), '1')
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
  assert.equal(writes, 0)
  assert.deepEqual(errors, [])
  console.log('签到榜隔离回归通过：旧接口显式失败，新接口显示独立连签名次')
} finally {
  await browser.close()
}
