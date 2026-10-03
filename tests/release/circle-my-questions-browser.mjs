/** 我的问答分页与筛选空态本地验收；仅模拟读取。 */
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'

const { chromium } = createRequire(import.meta.url)(resolve(process.env.QA_NODE_MODULES, 'playwright'))
const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:5198'
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const errors = []
let writes = 0
let secondFails = true
const json = (data, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify({ code: status, data, message: status === 200 ? 'ok' : '模拟失败' }) })

try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await context.addInitScript(() => {
    localStorage.setItem('auth_token', JSON.stringify({ type: 'string', data: 'local-fixture-only' }))
    localStorage.setItem('userInfo', JSON.stringify({ type: 'object', data: { id: 'qa-user' } }))
  })
  await context.route('**/*', route => {
    const url = new URL(route.request().url())
    if (!url.pathname.includes('/api/v1/')) return url.origin === origin ? route.continue() : route.abort()
    if (route.request().method() !== 'GET') writes++
    if (!url.pathname.endsWith('/question/my')) return route.fulfill(json(null, 404))
    const page = Number(url.searchParams.get('page') || 1)
    if (page === 2 && secondFails) { secondFails = false; return route.fulfill(json(null, 503)) }
    const n = page === 1 ? 20 : 3
    const questions = Array.from({ length: n }, (_, i) => ({
      id: `question-${(page - 1) * 20 + i + 1}`, askerId: 'qa-user', answererId: 'expert', circleId: 'qa-circle',
      question: `【问题${(page - 1) * 20 + i + 1}】正文`, status: page === 1 ? 'PENDING' : 'ANSWERED',
      priceCoin: 6, isPublic: true, createdAt: '2026-09-22T08:00:00Z',
    }))
    return route.fulfill(json({ questions, total: 23, page, pageSize: 20 }))
  })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${origin}/h5/pkg-circle/circles/my-questions?circleId=qa-circle`)
  await page.getByText('问题20', { exact: true }).waitFor({ timeout: 15000 })
  await page.getByText('已回答', { exact: true }).first().click()
  await page.getByText('当前已加载记录中没有此状态，继续查看后续记录').waitFor()
  assert.equal(await page.getByText('暂无问答记录').count(), 0)
  await page.getByText('查看更多问答记录').click()
  await page.getByText('加载失败，点击重试').click()
  await page.getByText('问题23', { exact: true }).waitFor()
  await page.setViewportSize({ width: 320, height: 720 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, '320px 不应横向溢出')
  assert.equal(writes, 0)
  assert.deepEqual(errors, [])
  console.log('我的问答：分页、分组暂空说明、下一页失败恢复：通过')
} finally {
  await browser.close()
}
