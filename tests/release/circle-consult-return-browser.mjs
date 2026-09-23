/** 咨询详情返回后的状态刷新：隔离 GET 夹具，不触发真实金币与回答。 */
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'

const { chromium } = createRequire(import.meta.url)(resolve(process.env.QA_NODE_MODULES, 'playwright'))
const origin = process.env.QA_ORIGIN
if (!origin) throw new Error('缺少隔离 H5 地址')
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
let writes = 0
let detailOpened = false
let listReads = 0
const errors = []
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await context.addInitScript(() => {
    localStorage.setItem('auth_token', JSON.stringify({ type: 'string', data: 'local-fixture-only' }))
    localStorage.setItem('userInfo', JSON.stringify({ type: 'object', data: { id: 'qa-expert' } }))
  })
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.includes('/api/v1/')) {
      if (route.request().method() !== 'GET') writes++
      const path = url.pathname.split('/api/v1')[1]
      const question = { id: 'q1', circleId: 'c1', askerId: 'qa-asker', answererId: 'qa-expert', question: '【测试题】正文', priceCoin: 10, status: detailOpened ? 'ANSWERED' : 'PENDING', createdAt: '2026-09-21T00:00:00Z', asker: { id: 'qa-asker', nickname: '提问者' }, answerer: { id: 'qa-expert', nickname: '达人' } }
      let data = {}
      if (path === '/question/my') { listReads++; data = { questions: [question], total: 1, page: 1, pageSize: 20 } }
      else if (path === '/question/q1') { detailOpened = true; data = { ...question, status: 'ANSWERED' } }
      else if (path === '/consult-calls/my-page') data = { items: [], total: 0, page: 1, pageSize: 20 }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, data, message: 'ok' }) })
    }
    if (url.origin === origin || url.protocol === 'data:') return route.continue()
    return route.abort()
  })
  const page = await context.newPage()
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${origin}/h5/pkg-circle/circles/consult-orders?circleId=c1`)
  await page.getByText('待我回答').waitFor()
  await page.getByText('测试题').click()
  await page.waitForURL(/question-detail\?id=q1/)
  await page.locator('.qd-back').click()
  await page.waitForURL(/consult-orders\?circleId=c1/)
  await page.getByText('按平台分成结算').waitFor({ timeout: 10000 })
  assert.ok(listReads >= 2)
  await page.getByRole('tab', { name: '已退款' }).click()
  await page.getByText('当前没有此状态的咨询订单').waitFor()
  await page.getByRole('button', { name: '查看全部' }).click()
  await page.getByText('按平台分成结算').waitFor()

  detailOpened = false
  await page.evaluate(() => localStorage.setItem('userInfo', JSON.stringify({ type: 'object', data: { id: 'qa-asker' } })))
  await page.goto(`${origin}/h5/pkg-circle/circles/my-questions?circleId=c1`)
  await page.getByText('10 金币托管中').waitFor()
  await page.getByText('测试题').click()
  await page.waitForURL(/question-detail\?id=q1/)
  await page.locator('.qd-back').click()
  await page.waitForURL(/my-questions\?circleId=c1/)
  await page.getByText('已回答').first().waitFor({ timeout: 10000 })
  await page.getByRole('tab', { name: '待回答' }).click()
  await page.getByText('当前没有此状态的问答').waitFor()
  await page.getByRole('button', { name: '查看全部' }).click()
  await page.getByText('已回答').first().waitFor()
  assert.equal(writes, 0)
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ passed: 11, listReads, writes, errors }))
} finally {
  await browser.close()
}
