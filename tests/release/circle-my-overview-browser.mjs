/** 圈子个人概览的隔离交互回归：只读请求使用夹具，拒绝真实业务写入。 */
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'

const { chromium } = createRequire(import.meta.url)(resolve(process.env.QA_NODE_MODULES, 'playwright'))
const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:5198'
const out = resolve('artifacts/circle-my-overview-20260922')
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const errors = []
let failStats = true
let failCircles = false
let writes = 0
const cover = `${origin}/qa-cover.svg`
const circleFixtures = [
  { circle: { id: 'qa-a', name: '古籍共读社', cover, memberCount: 16, postCount: 3 }, role: 'OWNER' },
  { circle: { id: 'qa-b', name: '诗词研习社', memberCount: 8, postCount: 2 }, role: 'MEMBER' },
]
let circles = circleFixtures
const json = (data, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify({ code: status, data, message: status === 200 ? 'ok' : '模拟读取失败' }) })

try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await context.addInitScript(() => localStorage.setItem('auth_token', JSON.stringify({ type: 'string', data: 'local-fixture-only' })))
  await context.route('**/*', route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/qa-cover.svg') return route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#345e68"/></svg>' })
    if (!url.pathname.includes('/api/v1/')) return url.origin === origin || url.protocol === 'data:' ? route.continue() : route.abort()
    if (route.request().method() !== 'GET') writes++
    const path = url.pathname.split('/api/v1')[1]
    if (path === '/circles/my') return route.fulfill(json(circles, failCircles ? 503 : 200))
    if (path === '/circles/my-stats') return route.fulfill(json({ joinedCount: 2, postCount: 7, likeReceived: 12 }, failStats ? 503 : 200))
    if (path === '/circle-refund/my') return route.fulfill(json([]))
    return route.fulfill(json([], 404))
  })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${origin}/h5/pkg-circle/my-circles/index`)
  await page.getByText('内容统计暂时无法读取', { exact: true }).waitFor()
  assert.equal(await page.locator('.overview-stats .stat-num').allTextContents().then(x => x.map(s => s.trim()).join(',')), '2,—,—')
  assert.equal(await page.locator('.circle-card').count(), 2, '统计接口失败不应遮住圈子列表')
  await page.locator('.circle-card').first().locator('.circle-cover img').waitFor()
  assert.equal(await page.locator('.circle-card').first().locator('.circle-cover img').getAttribute('src'), cover)
  await page.locator('.circle-card').first().locator('.circle-cover img').evaluate(async image => {
    if (!image.complete) await new Promise(resolve => image.addEventListener('load', resolve, { once: true }))
  })
  await page.waitForFunction(() => {
    const cover = document.querySelector('.circle-card .circle-cover')
    return cover && getComputedStyle(cover).opacity === '1'
  })
  const imageState = await page.locator('.circle-card').first().locator('.circle-cover img').evaluate(image => ({ complete: image.complete, width: image.naturalWidth, opacity: getComputedStyle(image.parentElement).opacity }))
  assert.equal(imageState.width, 100)
  assert.equal(imageState.opacity, '1', '已加载封面不可继续透明')
  await page.screenshot({ path: resolve(out, 'my-circles-initial-390.png') })
  await page.locator('.search-input input').fill('不存在的圈子')
  await page.getByText('没有符合条件的圈子', { exact: true }).waitFor()
  await page.getByText('清除筛选', { exact: true }).click()
  assert.equal(await page.locator('.circle-card').count(), 2)
  assert.equal(await page.locator('.search-input input').inputValue(), '', '清除筛选后输入框不能残留旧关键词')
  failStats = false
  await page.getByText('重试', { exact: true }).click()
  await page.locator('.overview-stats .stat-num').nth(1).getByText('7', { exact: true }).waitFor()
  await page.waitForFunction(() => {
    const cover = document.querySelector('.circle-card .circle-cover')
    return cover && getComputedStyle(cover).opacity === '1' && cover.querySelector('img')?.complete
  })
  assert.equal(await page.locator('.overview-stats .stat-num').allTextContents().then(x => x.map(s => s.trim()).join(',')), '2,7,12')
  await page.screenshot({ path: resolve(out, 'my-circles-390.png') })
  failCircles = true
  await page.reload()
  await page.getByText('加载失败，请稍后重试', { exact: true }).waitFor()
  assert.equal(await page.locator('.overview-stats .stat-num').first().innerText(), '—', '列表失败不能伪装为零圈子')
  assert.equal(await page.locator('.search-wrap').count(), 0, '列表失败时不显示不可用的搜索和筛选')
  assert.equal(await page.locator('.filter-scroll').count(), 0)
  failCircles = false
  circles = []
  await page.reload()
  await page.getByText('你还没有加入任何圈子', { exact: true }).waitFor()
  assert.equal(await page.locator('.search-wrap').count(), 0, '尚未加入圈子时不显示无效搜索')
  await page.getByText('去圈子广场逛逛', { exact: true }).waitFor()

  circles = circleFixtures
  failStats = true
  await page.goto(`${origin}/h5/pkg-circle/circles/me`)
  await page.getByText('加入 2 个圈子 · 创建 1 个', { exact: true }).waitFor()
  assert.equal(await page.getByText('发布审核与草稿', { exact: true }).count(), 0)
  await page.getByText('发布审核', { exact: true }).waitFor()
  await page.screenshot({ path: resolve(out, 'me-390.png') })
  await page.locator('.content-stat').click()
  assert.match(page.url(), /pkg-circle\/circles\/me/, '发帖数不能误跳圈子列表')
  assert.equal(writes, 0)
  assert.deepEqual(errors, [])
  console.log('圈子概览隔离回归通过：部分失败、封面、筛选恢复、重试、误导入口')
} finally {
  await browser.close()
}
