/** 圈子成员分页与失败恢复；全部接口由本地夹具提供，不触碰线上数据。 */
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'

const { chromium } = createRequire(import.meta.url)(resolve(process.env.QA_NODE_MODULES, 'playwright'))
const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:5198'
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const errors = []
let firstFails = true
let secondFails = true
let writes = 0

try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (!url.pathname.includes('/api/v1/')) return url.origin === origin ? route.continue() : route.abort()
    const method = route.request().method()
    if (method !== 'GET') writes++
    if (url.pathname.endsWith('/circles/qa-circle/members')) {
      const page = Number(url.searchParams.get('page'))
      const fail = page === 1 ? firstFails : secondFails
      if (page === 1) firstFails = false
      if (page === 2) secondFails = false
      const members = Array.from({ length: page === 1 ? 20 : 3 }, (_, i) => {
        const number = (page - 1) * 20 + i + 1
        return { userId: `member-${number}`, user: { id: `member-${number}`, nickname: `共读成员${number}` }, role: number === 1 ? 'OWNER' : 'MEMBER', postCount: number }
      })
      return route.fulfill({
        status: fail ? 503 : 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: fail ? 503 : 200, message: fail ? '模拟网络故障' : 'ok', data: fail ? null : { members, total: 23, page, pageSize: 20 } }),
      })
    }
    return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ code: 404, message: 'fixture only' }) })
  })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${origin}/h5/pkg-circle/circles/members?id=qa-circle`)
  await page.getByText('成员暂时无法加载，请重试').waitFor({ timeout: 15000 })
  assert.equal(await page.getByText('暂无成员').count(), 0, '接口故障不能伪装成暂无成员')
  await page.getByRole('button', { name: '重新加载成员' }).click()
  await page.getByText('已显示 20 / 23 位成员').waitFor({ timeout: 10000 })
  await page.getByText('共读成员20').waitFor()
  await page.getByRole('button', { name: '加载更多成员' }).click()
  await page.getByRole('button', { name: '重试加载更多成员' }).waitFor()
  assert.equal(await page.getByText('共读成员20').count(), 1, '续页失败不能清空已加载成员')
  await page.getByRole('button', { name: '重试加载更多成员' }).click()
  await page.getByText('已显示 23 / 23 位成员').waitFor()
  assert.equal(await page.getByText('共读成员23').count(), 1)
  assert.equal(await page.getByRole('button', { name: '加载更多成员' }).count(), 0)
  await page.setViewportSize({ width: 320, height: 700 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, '页面不应横向溢出')
  assert.ok((await page.getByRole('button', { name: '返回圈子' }).boundingBox()).height >= 44, '返回按钮触达区至少 44px')
  assert.equal(writes, 0, '成员列表测试不应发出写请求')
  assert.deepEqual(errors, [], '页面不应出现未捕获错误')
  console.log('圈子成员：首次失败可重试、续页失败保留内容、重试后 23/23、无写请求：通过')
} finally {
  await browser.close()
}
