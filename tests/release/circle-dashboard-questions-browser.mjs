/** 圈主待回复队列隔离验证：只读夹具，不触发真实答题或支付。 */
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'

const { chromium } = createRequire(import.meta.url)(resolve(process.env.QA_NODE_MODULES, 'playwright'))
const origin = process.env.QA_ORIGIN
if (!origin) throw new Error('缺少隔离 H5 地址')
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const errors = []
let writes = 0
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
      let data = {}
      if (path === '/circles/qa-circle/dashboard/overview') data = { name: '测试圈子', memberCount: 3, monthRevenue: 0, interactionRate: '0%' }
      else if (path === '/circles/qa-circle/dashboard/pending-questions') data = { questions: [
        { id: 'old', questionTitle: '先提交的问题', createdAt: '2026-09-19T00:00:00Z', asker: { nickname: '甲' } },
        { id: 'new', questionTitle: '后提交的问题', createdAt: '2026-09-20T00:00:00Z', asker: { nickname: '乙' } },
      ] }
      else if (path === '/circles/qa-circle/dashboard/trends') data = { trends: [] }
      else if (path === '/circles/qa-circle/join-requests') data = []
      else if (path === '/circle-refund/owner-pending') data = []
      else if (path === '/circles/qa-circle/dashboard/knowledge-candidates') data = { items: [], total: 0 }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, data, message: 'ok' }) })
    }
    if (url.origin === origin || url.protocol === 'data:') return route.continue()
    return route.abort()
  })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${origin}/h5/pkg-circle/circles/dashboard?id=qa-circle`)
  const toggle = page.getByRole('button', { name: /待我回复的付费提问/ })
  await toggle.waitFor()
  assert.equal(await page.getByText('先提交的问题').count(), 0)
  await toggle.click()
  await page.getByText('先提交的问题').waitFor()
  await page.getByText('后提交的问题').waitFor()
  assert.equal(await page.locator('.question-row').count(), 2)
  await page.getByRole('button', { name: /回复乙的提问：后提交的问题/ }).click()
  await page.waitForURL(/question-detail\?id=new/)
  assert.equal(writes, 0)
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ passed: 6, writes, errors }))
} finally {
  await browser.close()
}
