/** 圈主管理分页隔离验证：所有业务接口均为本地夹具，无真实写入。 */
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'

const { chromium } = createRequire(import.meta.url)(resolve(process.env.QA_NODE_MODULES, 'playwright'))
const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:5197'
const out = resolve('artifacts/circle-management-20260922')
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const errors = []
const pageRequests = []
let writes = 0
let failSecondMemberPage = true

try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await context.addInitScript(() => {
    localStorage.setItem('auth_token', JSON.stringify({ type: 'string', data: 'local-fixture-only' }))
    localStorage.setItem('userInfo', JSON.stringify({ type: 'object', data: { id: 'qa-owner' } }))
  })
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.includes('/api/v1/')) {
      if (route.request().method() !== 'GET') writes++
      const path = url.pathname.split('/api/v1')[1]
      let data = {}, status = 200
      if (path === '/circles/qa-circle') data = { id: 'qa-circle', name: '测试圈子', type: 'FREE' }
      else if (path === '/circles/qa-circle/members') {
        const page = Number(url.searchParams.get('page'))
        pageRequests.push(`members:${page}`)
        if (page === 2 && failSecondMemberPage) { status = 503; failSecondMemberPage = false }
        else data = {
          members: Array.from({ length: page === 1 ? 50 : 3 }, (_, i) => ({
            id: `m-${(page - 1) * 50 + i}`,
            userId: `u-${(page - 1) * 50 + i}`,
            role: 'MEMBER',
            user: { nickname: `成员${(page - 1) * 50 + i}` },
          })), total: 53,
        }
      } else if (path === '/circles/qa-circle/posts') {
        const page = Number(url.searchParams.get('page'))
        pageRequests.push(`posts:${page}`)
        data = {
          posts: Array.from({ length: page === 1 ? 50 : 3 }, (_, i) => ({
            id: `p-${(page - 1) * 50 + i}`,
            content: `内容${(page - 1) * 50 + i}`,
            user: { nickname: '测试作者' },
          })), total: 53,
        }
      } else if (path === '/circle-backend/guests') data = { guests: [] }
      return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ code: status, data, message: status === 200 ? 'ok' : '模拟加载失败' }) })
    }
    if (url.origin === origin || url.protocol === 'data:') return route.continue()
    return route.abort()
  })

  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${origin}/h5/pkg-circle/circles/manage?id=qa-circle`)
  await page.getByText('成员列表 · 已加载 50/53').waitFor()
  await page.getByRole('button', { name: '加载更多成员' }).click()
  await page.getByRole('button', { name: '重试加载更多成员' }).waitFor()
  assert.equal(await page.getByText('成员列表 · 已加载 50/53').count(), 1)
  await page.getByRole('button', { name: '重试加载更多成员' }).click()
  await page.getByText('成员列表 · 已加载 53/53').waitFor()
  assert.equal(await page.getByRole('button', { name: '加载更多成员' }).count(), 0)

  await page.setViewportSize({ width: 320, height: 720 })
  await page.locator('.filters').first().getByRole('button', { name: '嘉宾' }).click()
  await page.getByText('已加载成员中没有匹配项').waitFor()
  await page.getByRole('button', { name: '清除筛选' }).click()
  await page.getByText('成员列表 · 已加载 53/53').waitFor()
  assert.ok((await page.locator('.filter').first().boundingBox()).height >= 44)
  await page.getByRole('button', { name: '管理成员成员0' }).click()
  assert.ok((await page.locator('.row-action').first().boundingBox()).height >= 44)

  await page.getByRole('tab', { name: '内容' }).click()
  await page.getByText('已加载 50/53 条内容').waitFor()
  await page.getByRole('button', { name: '加载更多内容' }).click()
  await page.getByText('已加载 53/53 条内容').waitFor()
  assert.equal(await page.getByRole('button', { name: '加载更多内容' }).count(), 0)
  await page.locator('.filters').last().getByRole('button', { name: '精华' }).click()
  await page.getByText('已加载内容中没有匹配项').waitFor()
  await page.getByRole('button', { name: '查看全部内容' }).click()
  await page.getByText('已加载 53/53 条内容').waitFor()
  assert.ok((await page.locator('.pa-btn').first().boundingBox()).height >= 44)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
  await page.screenshot({ path: resolve(out, 'content-actions-320.png') })

  assert.deepEqual(pageRequests, ['members:1', 'members:2', 'members:2', 'posts:1', 'posts:2'])
  assert.deepEqual(errors, [])
  assert.equal(writes, 0)
  console.log(JSON.stringify({ passed: 8, pageRequests, errors, writes }))
} finally {
  await browser.close()
}
