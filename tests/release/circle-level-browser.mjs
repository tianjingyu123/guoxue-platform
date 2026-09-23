/** 圈子成长页隔离回归：奖励加成不能抬高累计签到次数。 */
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'

const { chromium } = createRequire(import.meta.url)(resolve(process.env.QA_NODE_MODULES, 'playwright'))
const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:5198'
const out = resolve('artifacts/circle-level-20260922')
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const json = data => ({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, data, message: 'ok' }) })
const me = {
  userId: 'local-user', rank: 3, memberCount: 20, joinedDays: 8, posts: 0, likes: 0,
  checkinExp: 90, checkinStreak: 7, badgesCount: 0, level: 1, levelName: '初入门径',
  totalExp: 90, currentLevelMinExp: 0, nextLevelMinExp: 100, expIntoLevel: 90,
  expForNextLevel: 100, progressPercent: 90, isMax: false,
}
try {
  const context = await browser.newContext({ viewport: { width: 320, height: 720 } })
  await context.addInitScript(() => localStorage.setItem('auth_token', JSON.stringify({ type: 'string', data: 'local-fixture-only' })))
  let writes = 0
  await context.route('**/*', route => {
    const url = new URL(route.request().url())
    if (!url.pathname.includes('/api/v1/')) return url.origin === origin || url.protocol === 'data:' ? route.continue() : route.abort()
    if (route.request().method() !== 'GET') writes++
    const path = url.pathname.split('/api/v1')[1]
    if (path === '/circles/qa/growth') return route.fulfill(json({ me, leaderboard: [{ ...me, nickname: '测试成员', avatar: '' }] }))
    if (path === '/circles/qa/badges') return route.fulfill(json({ badges: [] }))
    if (path === '/circles/qa/checkin/calendar') return route.fulfill(json({ month: '2026-09', today: '2026-09-22', checkedToday: false, checkinStreak: 7, totalCheckins: 7, days: [] }))
    return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' })
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${origin}/h5/pkg-circle/circles/level?id=qa`)
  await page.getByRole('tab', { name: '获取经验' }).click()
  await page.getByText('累计签到 7 次 · 签到经验 90', { exact: true }).waitFor()
  assert.equal(await page.getByText('立即签到 (+10经验)', { exact: true }).count(), 0)
  assert.equal(await page.getByText('立即签到', { exact: true }).count(), 1)
  await page.screenshot({ path: resolve(out, 'experience-320.png') })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
  assert.equal(writes, 0)
  assert.deepEqual(errors, [])
  console.log('圈子成长页隔离回归通过：累计次数与奖励经验分离，320px 不溢出')
} finally {
  await browser.close()
}
