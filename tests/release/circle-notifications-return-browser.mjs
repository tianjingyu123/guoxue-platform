/** 圈内通知回访和分类：全部使用本地只读接口夹具。 */
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'

const { chromium } = createRequire(import.meta.url)(resolve(process.env.QA_NODE_MODULES, 'playwright'))
const origin = process.env.QA_ORIGIN
if (!origin) throw new Error('缺少隔离 H5 地址')
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
let isRead = false
let reads = 0
let writes = 0
const errors = []
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await context.addInitScript(() => {
    localStorage.setItem('auth_token', JSON.stringify({ type: 'string', data: 'local-fixture-only' }))
  })
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.includes('/api/v1/')) {
      if (route.request().method() !== 'GET') writes++
      const path = url.pathname.split('/api/v1')[1]
      if (path === '/notifications/notice-1/read') {
        await new Promise(resolve => setTimeout(resolve, 250))
        return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ code: 503, message: '本地模拟已读写入失败' }) })
      }
      let data = {}
      if (path === '/notifications/circle') {
        reads++
        const category = url.searchParams.get('category')
        const items = category && category !== 'INTERACT' ? [] : [{ id: 'notice-1', type: 'POST_REPLY', category: 'INTERACT', circleId: 'circle-1', title: '测试回复通知', content: '有人回复了你的帖子', targetType: null, targetId: null, isRead, createdAt: '2026-09-23T07:00:00Z' }]
        data = { items, total: items.length, page: 1, pageSize: 20, unread: { ALL: isRead ? 0 : 1, INTERACT: isRead ? 0 : 1, TRADE: 0, GOVERN: 0, LIVE: 0 } }
      } else if (path === '/audit/content-audits/mine') {
        data = { records: [], total: 0 }
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, data, message: 'ok' }) })
    }
    if (url.origin === origin || url.protocol === 'data:') return route.continue()
    return route.abort()
  })
  const page = await context.newPage()
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${origin}/h5/pkg-circle/circles/notifications`)
  await page.getByText('测试回复通知').waitFor()
  assert.equal(await page.locator('.cn-dot').count(), 1)
  isRead = true
  await page.evaluate(() => window.uni.navigateTo({ url: '/pkg-circle/circles/my-audits' }))
  await page.getByText('暂无审核记录').waitFor()
  await page.evaluate(() => window.uni.navigateBack())
  await page.getByText('测试回复通知').waitFor()
  assert.equal(await page.locator('.cn-dot').count(), 0)
  assert.ok(reads >= 2)
  await page.getByText('交易').first().click()
  await page.getByText('此分类暂无通知').waitFor()
  await page.getByText('可切换其他分类查看圈内消息。').waitFor()
  isRead = false
  await page.getByText('全部', { exact: true }).click()
  await page.locator('.cn-dot').waitFor()
  await page.getByText('测试回复通知').click()
  await page.waitForFunction(() => document.querySelectorAll('.cn-dot').length === 0)
  await page.locator('.cn-dot').waitFor()
  assert.deepEqual(errors, [])
  assert.equal(writes, 1)
  console.log(JSON.stringify({ passed: 9, reads, fixtureWrites: writes, errors }))
} finally {
  await browser.close()
}
