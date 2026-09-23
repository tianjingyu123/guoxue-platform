/** 圈子排行榜隔离回归：错误、少量真实记录和综合指标的展示。 */
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'

const { chromium } = createRequire(import.meta.url)(resolve(process.env.QA_NODE_MODULES, 'playwright'))
const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:5198'
const out = resolve('artifacts/circle-ranking-20260922')
await mkdir(out, { recursive: true })
const entries = [
  { id: 'a', rank: 1, name: '古籍共读社', memberCount: 100, postCount: 1 },
  { id: 'b', rank: 2, name: '诗词研习社', memberCount: 40, postCount: 90 },
  { id: 'c', rank: 3, name: '山水讲堂', memberCount: 10, postCount: 5 },
]
let status = 503
let count = 1
let writes = 0
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await context.route('**/*', route => {
    const url = new URL(route.request().url())
    if (!url.pathname.includes('/api/v1/')) return url.origin === origin ? route.continue() : route.abort()
    if (route.request().method() !== 'GET') writes++
    if (url.pathname.endsWith('/circles/ranking')) {
      const sortBy = url.searchParams.get('sortBy')
      const items = (sortBy === 'activityScore' ? [entries[1], entries[0], entries[2]] : entries).map((entry, index) => ({ ...entry, rank: index + 1 }))
      return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ code: status, data: { items: items.slice(0, count) }, message: status === 200 ? 'ok' : '模拟失败' }) })
    }
    return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ code: 404, data: null }) })
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${origin}/h5/pkg-circle/circles/ranking`)
  await page.getByText('加载失败', { exact: true }).waitFor()
  assert.equal(await page.getByText('暂无排行数据', { exact: true }).count(), 0)
  status = 200
  await page.getByText('重试', { exact: true }).click()
  await page.getByText('古籍共读社', { exact: true }).waitFor()
  assert.equal(await page.locator('.rk-pod').count(), 1, '一个圈子不能画出第二、三名空卡')
  await page.screenshot({ path: resolve(out, 'one-circle-390.png') })
  count = 2
  await page.reload()
  await page.locator('.rk-pod').nth(1).waitFor()
  assert.equal(await page.locator('.rk-pod').count(), 2)
  count = 3
  await page.reload()
  await page.locator('.rk-pod').nth(2).waitFor()
  await page.getByText('综合', { exact: true }).click()
  await page.locator('.rk-pod-1 .rk-pod-value').getByText('130', { exact: true }).waitFor()
  assert.equal(await page.locator('.rk-pod-1 .rk-pod-name').innerText(), '诗词研习社')
  await page.screenshot({ path: resolve(out, 'combined-390.png') })
  await page.setViewportSize({ width: 320, height: 720 })
  await page.screenshot({ path: resolve(out, 'combined-320.png') })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, '窄屏不应横向溢出')
  await page.getByRole('button', { name: '查看第1名诗词研习社' }).click()
  await page.waitForURL(/pkg-circle\/circles\/detail\?id=b/)
  assert.equal(writes, 0)
  assert.deepEqual(errors, [])
  console.log('圈子排行榜隔离回归通过：错误恢复、1/2/3名、综合分展示')
} finally {
  await browser.close()
}
