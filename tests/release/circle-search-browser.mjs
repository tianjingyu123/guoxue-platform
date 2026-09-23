/** 圈子搜索错误、错序及分页本地验收；禁止外部请求与业务写入。 */
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'

const { chromium } = createRequire(import.meta.url)(resolve(process.env.QA_NODE_MODULES, 'playwright'))
const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:5198'
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
let failOnce = true
let moreFailsOnce = true
let writes = 0
const errors = []
const json = (data, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify({ code: status, data, message: status === 200 ? 'ok' : '模拟网络故障' }) })

try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (!url.pathname.includes('/api/v1/')) return url.origin === origin ? route.continue() : route.abort()
    const path = url.pathname.split('/api/v1')[1]
    if (path === '/circles/search/ai') return route.fulfill(json({}))
    if (route.request().method() !== 'GET') writes++
    if (path === '/circles/ranking') return route.fulfill(json({ items: [] }))
    if (path !== '/circles') return route.fulfill(json(null, 404))
    const keyword = url.searchParams.get('keyword') || ''
    const page = Number(url.searchParams.get('page') || 1)
    if (keyword === '故障词' && failOnce) { failOnce = false; return route.fulfill(json(null, 503)) }
    if (keyword === '新词' && page === 2 && moreFailsOnce) { moreFailsOnce = false; return route.fulfill(json(null, 503)) }
    if (keyword === '旧词') await new Promise(resolve => setTimeout(resolve, 700))
    const length = page === 1 ? 20 : 3
    const circles = Array.from({ length }, (_, i) => ({
      id: `${keyword}-${(page - 1) * 20 + i + 1}`, name: `${keyword}圈子${(page - 1) * 20 + i + 1}`,
      intro: '本地测试圈子', type: 'FREE', memberCount: 12, price: 0,
    }))
    return route.fulfill(json({ circles, total: 23, page, pageSize: 20 }))
  })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${origin}/h5/pkg-circle/circles/search`)
  const input = page.locator('input[type="search"]')
  await input.fill('故障词')
  await input.press('Enter')
  await page.getByText('搜索失败，请重试').waitFor({ timeout: 15000 })
  assert.equal(await page.getByText('没有找到「故障词」相关的圈子').count(), 0, '搜索故障不能展示无结果')
  await page.getByText('重试', { exact: true }).click()
  await page.getByText('圈子 · 20 / 23 个').waitFor()
  await input.fill('旧词')
  await page.waitForTimeout(100)
  await input.press('Enter')
  await input.fill('新词')
  await page.waitForTimeout(100)
  await input.press('Enter')
  await page.getByText('新词圈子1', { exact: true }).waitFor()
  await page.waitForTimeout(900)
  assert.equal(await page.getByText('旧词圈子1', { exact: true }).count(), 0, '慢返回的旧词不能覆盖新词结果')
  await page.getByRole('button', { name: '加载更多圈子' }).click()
  await page.getByRole('button', { name: '重试加载更多圈子' }).waitFor()
  assert.equal(await page.getByText('新词圈子20', { exact: true }).count(), 1, '续页失败不能清空结果')
  await page.getByRole('button', { name: '重试加载更多圈子' }).click()
  await page.getByText('圈子 · 23 / 23 个').waitFor()
  assert.equal(await page.getByText('新词圈子23', { exact: true }).count(), 1)
  await page.setViewportSize({ width: 320, height: 700 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, '搜索页不应横向溢出')
  assert.ok((await page.getByRole('button', { name: '返回圈子' }).boundingBox()).height >= 44, '返回按钮触达区至少 44px')
  assert.equal(writes, 0)
  assert.deepEqual(errors, [])
  console.log('圈子搜索：故障重试、关键词错序、分页失败恢复、无业务写入：通过')
} finally {
  await browser.close()
}
