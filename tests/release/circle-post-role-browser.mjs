/** 帖子治理菜单权限查询失败态的本地只读验收。 */
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'

const { chromium } = createRequire(import.meta.url)(resolve(process.env.QA_NODE_MODULES, 'playwright'))
const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:5198'
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
let firstRoleFails = true
let writes = 0
const errors = []
const json = (data, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify({ code: status, data, message: status === 200 ? 'ok' : '模拟失败' }) })

try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await context.addInitScript(() => {
    localStorage.setItem('auth_token', JSON.stringify({ type: 'string', data: 'local-fixture-only' }))
    localStorage.setItem('userInfo', JSON.stringify({ type: 'object', data: { id: 'qa-owner' } }))
  })
  await context.route('**/*', route => {
    const url = new URL(route.request().url())
    if (!url.pathname.includes('/api/v1/')) return url.origin === origin ? route.continue() : route.abort()
    if (route.request().method() !== 'GET') writes++
    const path = url.pathname.split('/api/v1')[1]
    if (path === '/circles/qa-circle/posts/qa-post') return route.fulfill(json({ id: 'qa-post', circleId: 'qa-circle', title: '测试帖子', content: '测试正文', userId: 'another-user', createdAt: '2026-09-22T08:00:00Z' }))
    if (path === '/circles/qa-circle/join/status') {
      if (firstRoleFails) { firstRoleFails = false; return route.fulfill(json(null, 503)) }
      return route.fulfill(json({ joined: true, role: 'OWNER', expired: false }))
    }
    if (path === '/comment/count') return route.fulfill(json(0))
    if (path === '/interaction/like/check') return route.fulfill(json({}))
    if (path === '/comment') return route.fulfill(json([]))
    return route.fulfill(json(null, 404))
  })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${origin}/h5/pkg-circle/circles/post?circleId=qa-circle&id=qa-post`)
  await page.getByText('测试帖子').waitFor({ timeout: 15000 })
  await page.getByRole('button', { name: '帖子操作' }).click()
  await page.getByText('权限暂无法确认，点击重试').waitFor()
  assert.equal(await page.getByText('举报', { exact: true }).count(), 0, '查询失败不能把圈主误当普通成员')
  await page.getByText('权限暂无法确认，点击重试').click()
  await page.getByText('置顶帖子').waitFor()
  assert.equal(writes, 0)
  assert.deepEqual(errors, [])
  console.log('圈子帖子：权限未知不误示举报，重试后恢复圈主菜单：通过')
} finally {
  await browser.close()
}
