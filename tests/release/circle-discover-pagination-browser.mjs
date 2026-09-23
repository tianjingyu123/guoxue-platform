/** 发现圈子服务端分页与“首批均已加入”的本地只读验收。 */
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'

const { chromium } = createRequire(import.meta.url)(resolve(process.env.QA_NODE_MODULES, 'playwright'))
const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:5198'
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const errors = []
let pageTwoFails = true
let writes = 0
const first = Array.from({ length: 20 }, (_, i) => ({ id: `joined-${i + 1}`, name: `已加入圈子${i + 1}`, intro: '一起阅读与交流经典', tags: ['国学'], type: 'FREE', memberCount: 30 }))
const next = Array.from({ length: 3 }, (_, i) => ({ id: `new-${i + 1}`, name: `新发现圈子${i + 1}`, intro: '继续认识更多同好', tags: ['国学'], type: 'FREE', memberCount: 12 }))
const json = (data, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify({ code: status, data, message: status === 200 ? 'ok' : '模拟失败' }) })

try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await context.addInitScript(() => localStorage.setItem('auth_token', JSON.stringify({ type: 'string', data: 'local-fixture-only' })))
  await context.route('**/*', route => {
    const url = new URL(route.request().url())
    if (!url.pathname.includes('/api/v1/')) return url.origin === origin ? route.continue() : route.abort()
    if (route.request().method() !== 'GET') writes++
    const path = url.pathname.split('/api/v1')[1]
    if (path === '/circles') {
      const page = Number(url.searchParams.get('page') || 1)
      if (page === 2 && pageTwoFails) { pageTwoFails = false; return route.fulfill(json(null, 503)) }
      return route.fulfill(json({ circles: page === 1 ? first : next, total: 23, page, pageSize: 20 }))
    }
    if (path === '/circles/my') return route.fulfill(json(first.map(circle => ({ circle }))))
    if (path === '/circles/my-stats') return route.fulfill(json({ joinedCount: 20, postCount: 0, likeReceived: 0 }))
    if (path.includes('/posts')) return route.fulfill(json({ posts: [], total: 0 }))
    return route.fulfill(json([]))
  })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${origin}/h5/pages/circles/index`)
  await page.getByRole('tab', { name: '发现圈子', exact: true }).click()
  await page.getByText('已展示的圈子都加入了，继续看看后面的圈子').waitFor({ timeout: 15000 })
  await page.getByRole('button', { name: '继续发现圈子' }).click()
  await page.getByRole('button', { name: '重试加载更多圈子' }).waitFor()
  await page.getByRole('button', { name: '重试加载更多圈子' }).click()
  await page.getByText('新发现圈子3', { exact: true }).waitFor()
  assert.equal(await page.getByText('圈子还在筹备中，稍后再来看看').count(), 0)
  await page.setViewportSize({ width: 320, height: 720 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true)
  assert.equal(writes, 0)
  assert.deepEqual(errors, [])
  console.log('圈子发现：首批 20 个均已加入时继续发现、下一页失败恢复、23 个圈子完整分页：通过')
} finally {
  await browser.close()
}
