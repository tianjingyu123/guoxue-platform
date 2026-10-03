/** 公告已读回访：隔离 GET 与本地拦截的已读 POST，不写真实账号。 */
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'

const { chromium } = createRequire(import.meta.url)(resolve(process.env.QA_NODE_MODULES, 'playwright'))
const origin = process.env.QA_ORIGIN
if (!origin) throw new Error('缺少隔离 H5 地址')
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
let serverRead = false
let statusFails = true
let statusReads = 0
let writes = 0
const errors = []
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await context.addInitScript(() => {
    localStorage.setItem('auth_token', JSON.stringify({ type: 'string', data: 'local-fixture-only' }))
    localStorage.setItem('userInfo', JSON.stringify({ type: 'object', data: { id: 'qa-member' } }))
  })
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.includes('/api/v1/')) {
      const path = url.pathname.split('/api/v1')[1]
      let data = {}
      if (path === '/circles/c1') data = { id: 'c1', name: '测试圈' }
      else if (path === '/circles/c1/announcements/a1/read-status') {
        statusReads++
        if (statusFails) {
          statusFails = false
          return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ code: 503, message: '暂不可用' }) })
        }
        data = { isRead: serverRead }
      } else if (path === '/circles/c1/announcements/a1/read') {
        assert.equal(route.request().method(), 'POST')
        writes++
        serverRead = true
        data = { success: true }
      } else if (path === '/circles/c1/announcements/a1') {
        data = { id: 'a1', circleId: 'c1', content: '公告标题\n公告正文', isTop: true, createdAt: '2026-09-23T00:00:00Z' }
      } else if (path === '/circles/c1/announcements') data = { list: [], total: 1 }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, data, message: 'ok' }) })
    }
    if (url.origin === origin || url.protocol === 'data:') return route.continue()
    return route.abort()
  })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  const path = `${origin}/h5/pkg-circle/circles/announcements?circleId=c1&id=a1`
  await page.goto(path)
  await page.getByText('状态未确认，点此重试').waitFor()
  assert.equal(writes, 0)
  await page.getByText('状态未确认，点此重试').click()
  await page.getByText('确认已读', { exact: true }).waitFor()
  await page.getByText('确认已读', { exact: true }).click()
  await page.getByText('已确认阅读').waitFor()
  assert.equal(writes, 1)
  await page.reload()
  await page.getByText('已确认阅读').waitFor()
  assert.ok(statusReads >= 3)
  assert.equal(writes, 1)

  const guest = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await guest.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.includes('/api/v1/')) {
      const path = url.pathname.split('/api/v1')[1]
      const data = path === '/circles/c1' ? { id: 'c1', name: '测试圈' }
        : path === '/circles/c1/announcements/a1' ? { id: 'a1', content: '公告标题\n公告正文' }
        : { list: [] }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, data, message: 'ok' }) })
    }
    if (url.origin === origin || url.protocol === 'data:') return route.continue()
    return route.abort()
  })
  const guestPage = await guest.newPage()
  guestPage.on('pageerror', error => errors.push(error.message))
  await guestPage.goto(path)
  await guestPage.getByText('登录后确认已读').waitFor()

  const nonmember = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await nonmember.addInitScript(() => localStorage.setItem('auth_token', JSON.stringify({ type: 'string', data: 'local-fixture-only' })))
  await nonmember.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.includes('/api/v1/')) {
      const apiPath = url.pathname.split('/api/v1')[1]
      if (apiPath === '/circles/c1/announcements/a1/read-status') {
        return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ code: 403, message: '请先加入圈子' }) })
      }
      const data = apiPath === '/circles/c1' ? { id: 'c1', name: '测试圈' }
        : apiPath === '/circles/c1/announcements/a1' ? { id: 'a1', content: '公告标题\n公告正文' }
        : { list: [] }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, data, message: 'ok' }) })
    }
    if (url.origin === origin || url.protocol === 'data:') return route.continue()
    return route.abort()
  })
  const nonmemberPage = await nonmember.newPage()
  nonmemberPage.on('pageerror', error => errors.push(error.message))
  await nonmemberPage.goto(path)
  await nonmemberPage.getByText('加入圈子后可确认已读').waitFor()
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ passed: 8, statusReads, writes, errors }))
} finally {
  await browser.close()
}
