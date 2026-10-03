/** 本人发布审核台账的本地只读分页验收。 */
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'

const { chromium } = createRequire(import.meta.url)(resolve(process.env.QA_NODE_MODULES, 'playwright'))
const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:5198'
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const errors = []
let secondFails = true
let writes = 0
const json = (data, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify({ code: status, data, message: status === 200 ? 'ok' : '模拟失败' }) })

try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await context.addInitScript(() => localStorage.setItem('auth_token', JSON.stringify({ type: 'string', data: 'local-fixture-only' })))
  await context.route('**/*', route => {
    const url = new URL(route.request().url())
    if (!url.pathname.includes('/api/v1/')) return url.origin === origin ? route.continue() : route.abort()
    if (route.request().method() !== 'GET') writes++
    if (!url.pathname.endsWith('/audit/content-audits/mine')) return route.fulfill(json(null, 404))
    const page = Number(url.searchParams.get('page') || 1)
    if (page === 2 && secondFails) { secondFails = false; return route.fulfill(json(null, 503)) }
    const n = page === 1 ? 20 : 3
    const records = Array.from({ length: n }, (_, i) => ({
      id: `audit-${(page - 1) * 20 + i + 1}`, contentType: 'POST', contentTitle: `审核内容${(page - 1) * 20 + i + 1}`,
      finalStatus: 'PENDING', createdAt: '2026-09-22T08:00:00Z',
    }))
    return route.fulfill(json({ records, total: 23 }))
  })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${origin}/h5/pkg-circle/circles/my-audits`)
  await page.getByText('审核内容20').waitFor({ timeout: 15000 })
  await page.getByText('查看更多审核记录').click()
  await page.getByText('加载失败，点击重试').click()
  await page.getByText('审核内容23').waitFor()
  assert.equal(await page.getByText('查看更多审核记录').count(), 0)
  await page.setViewportSize({ width: 320, height: 720 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true)
  assert.equal(writes, 0)
  assert.deepEqual(errors, [])
  console.log('圈子发布审核：23 条记录分页、下一页失败保留并恢复、320px 无溢出：通过')
} finally {
  await browser.close()
}
