/** 公告打开指定条目、失败恢复与已读真实性；请求全部本地拦截。 */
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'

const { chromium } = createRequire(import.meta.url)(resolve(process.env.QA_NODE_MODULES, 'playwright'))
const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:5198'
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const errors = []
let firstFails = true
let readFails = true
let writeCalls = 0
const first = { id: 'a1', content: '置顶公告\n置顶公告正文', isTop: true, createdAt: '2026-09-22T08:00:00Z' }
const second = { id: 'a2', content: '另一则公告\n另一则正文', isTop: false, createdAt: '2026-09-21T08:00:00Z' }
const json = (data, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify({ code: status, data, message: status === 200 ? 'ok' : '模拟失败' }) })

try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (!url.pathname.includes('/api/v1/')) return url.origin === origin ? route.continue() : route.abort()
    const path = url.pathname.split('/api/v1')[1]
    if (path === '/circles/qa') return route.fulfill(json({ id: 'qa', name: '共读圈' }))
    if (path === '/circles/qa/announcement') {
      if (firstFails) { firstFails = false; return route.fulfill(json(null, 503)) }
      return route.fulfill(json(first))
    }
    if (path === '/circles/qa/announcements') return route.fulfill(json({ list: [first, second], total: 2 }))
    if (path === '/circles/qa/announcements/a2') return route.fulfill(json(second))
    if (path === '/circles/qa/announcements/a2/read') {
      writeCalls++
      if (readFails) { readFails = false; return route.fulfill(json(null, 503)) }
      return route.fulfill(json({ success: true }))
    }
    return route.fulfill(json(null, 404))
  })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${origin}/h5/pkg-circle/circles/announcements?circleId=qa`)
  await page.getByText('公告暂时无法加载，请重试').waitFor({ timeout: 15000 })
  assert.equal(await page.getByText('该圈子暂无公告').count(), 0, '读取失败不能显示空公告')
  await page.getByRole('button', { name: '重新加载公告' }).click()
  await page.getByText('置顶公告正文').waitFor()
  await page.getByText('另一则公告', { exact: true }).click()
  await page.waitForURL('**/announcements?id=a2&circleId=qa')
  await page.getByText('另一则正文').waitFor()
  assert.equal(await page.getByText('置顶公告正文').count(), 0, '点击相关公告应打开对应 ID')
  await page.getByText('确认已读', { exact: true }).click()
  await page.getByText('未能同步已读状态，请稍后重试').waitFor()
  assert.equal(await page.getByText('已确认阅读').count(), 0, '已读上报失败不能假报成功')
  await page.getByText('确认已读', { exact: true }).click()
  await page.getByText('已确认阅读').waitFor()
  assert.equal(writeCalls, 2)
  assert.deepEqual(errors, [])
  console.log('圈子公告：错误恢复、指定公告、已读失败不假报成功：通过（写入全部拦截）')
} finally {
  await browser.close()
}
