/** 咨询订单读取与分页本地验收：只模拟 GET，不涉及金币或真实订单。 */
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'

const { chromium } = createRequire(import.meta.url)(resolve(process.env.QA_NODE_MODULES, 'playwright'))
const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:5198'
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const errors = []
let firstCallFails = true
let writes = 0
const json = (data, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify({ code: status, data, message: status === 200 ? 'ok' : '模拟读取失败' }) })

try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await context.addInitScript(() => {
    localStorage.setItem('auth_token', JSON.stringify({ type: 'string', data: 'local-fixture-only' }))
    localStorage.setItem('userInfo', JSON.stringify({ type: 'object', data: { id: 'qa-user' } }))
  })
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (!url.pathname.includes('/api/v1/')) return url.origin === origin ? route.continue() : route.abort()
    if (route.request().method() !== 'GET') writes++
    const path = url.pathname.split('/api/v1')[1]
    const page = Number(url.searchParams.get('page') || 1)
    if (path === '/question/my') {
      const n = page === 1 ? 20 : 3
      const questions = Array.from({ length: n }, (_, i) => ({
        id: `qa-${(page - 1) * 20 + i + 1}`, circleId: 'qa-circle', askerId: 'qa-user', answererId: 'expert',
        question: `【图文咨询${(page - 1) * 20 + i + 1}】测试内容`, status: 'ANSWERED', priceCoin: 8,
        createdAt: '2026-09-22T08:00:00Z',
      }))
      return route.fulfill(json({ questions, total: 23, page, pageSize: 20 }))
    }
    if (path === '/consult-calls/my-page') {
      if (firstCallFails) { firstCallFails = false; return route.fulfill(json(null, 503)) }
      const n = page === 1 ? 20 : 2
      const items = Array.from({ length: n }, (_, i) => ({
        id: `call-${(page - 1) * 20 + i + 1}`, circleId: 'qa-circle', callerId: 'qa-user', expertId: 'expert',
        type: 'VOICE', status: 'ENDED', durationSec: 80, pricePerMinute: 3, prepaidCoin: 12, settledCoin: 6,
        createdAt: '2026-09-22T07:00:00Z',
      }))
      return route.fulfill(json({ items, total: 22, page, pageSize: 20 }))
    }
    return route.fulfill(json(null, 404))
  })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${origin}/h5/pkg-circle/circles/consult-orders?circleId=qa-circle`)
  await page.getByText('通话记录未加载：模拟读取失败').waitFor({ timeout: 15000 })
  assert.equal(await page.getByText('暂无咨询订单').count(), 0)
  await page.getByText('图文咨询20', { exact: true }).waitFor()
  await page.getByText('查看更多图文咨询').click()
  await page.getByText('图文咨询23', { exact: true }).waitFor()
  await page.getByText('重试', { exact: true }).click()
  await page.getByText('语音连麦 2 分钟').first().waitFor()
  await page.getByText('查看更多通话记录').click()
  await page.getByText('咨询总笔数').waitFor()
  await page.getByText('45').first().waitFor()
  await page.setViewportSize({ width: 320, height: 720 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, '320px 不应横向溢出')
  assert.equal(await page.getByText('查看更多通话记录').count(), 0)
  assert.equal(writes, 0)
  assert.deepEqual(errors, [])
  console.log('圈子咨询订单：双来源失败可重试、23 条图文和 22 条通话完整分页、总数仅完成后展示：通过')
} finally {
  await browser.close()
}
