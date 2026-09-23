/** 图文提问报价核对：隔离接口夹具，不触发真实金币或订单。 */
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'

const { chromium } = createRequire(import.meta.url)(resolve(process.env.QA_NODE_MODULES, 'playwright'))
const origin = process.env.QA_ORIGIN
if (!origin) throw new Error('缺少隔离 H5 地址')
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
let currentPrice = 50
let askWrites = 0
let rejectOnce = false
const errors = []
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await context.addInitScript(() => {
    localStorage.setItem('auth_token', JSON.stringify({ type: 'string', data: 'local-fixture-only' }))
    localStorage.setItem('userInfo', JSON.stringify({ type: 'object', data: { id: 'qa-asker' } }))
  })
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.includes('/api/v1/')) {
      const path = url.pathname.split('/api/v1')[1]
      let data = {}
      if (path === '/circles/c1/expert/u2') data = { role: 'GUEST', questionPriceCoin: currentPrice, peekPriceCoin: 5 }
      else if (path === '/question/ask') {
        askWrites++
        const body = route.request().postDataJSON()
        assert.equal(body.expectedPriceCoin, currentPrice)
        if (rejectOnce) {
          rejectOnce = false
          currentPrice = 90
          return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ code: 409, message: '达人报价已变化，请刷新后确认再提问' }) })
        }
        data = { id: 'q1', circleId: 'c1', answererId: 'u2', askerId: 'qa-asker', question: '【测试问题】测试描述', priceCoin: currentPrice, status: 'PENDING' }
      } else if (path === '/question') data = { questions: [], total: 0, page: 1, pageSize: 20 }
      else if (path === '/coin/balance') data = { balance: 100 }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, data, message: 'ok' }) })
    }
    if (url.origin === origin || url.protocol === 'data:') return route.continue()
    return route.abort()
  })
  const page = await context.newPage()
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${origin}/h5/pkg-circle/circles/consult-ask?circleId=c1&answererId=u2&priceCoin=1&peekPriceCoin=1`)
  await page.getByText('确认支付 50 金币并提问').waitFor()
  assert.equal(await page.getByText('确认支付 1 金币并提问').count(), 0)
  await page.locator('.ca-input-title input').fill('测试问题')
  await page.locator('.ca-input-body textarea').fill('测试描述')
  currentPrice = 80
  await page.getByText('确认支付 50 金币并提问').click()
  await page.getByText('确认支付 80 金币并提问').waitFor()
  assert.equal(askWrites, 0)
  await page.getByText('确认支付 80 金币并提问').click()
  await page.waitForURL(/question-detail\?id=q1/)
  assert.equal(askWrites, 1)
  await page.goto(`${origin}/h5/pkg-circle/circles/consult-ask?circleId=c1&answererId=u2&priceCoin=1`)
  await page.getByText('确认支付 80 金币并提问').waitFor()
  await page.locator('.ca-input-title input').fill('测试问题')
  await page.locator('.ca-input-body textarea').fill('测试描述')
  rejectOnce = true
  await page.getByText('确认支付 80 金币并提问').click()
  await page.getByText('确认支付 90 金币并提问').waitFor()
  assert.equal(askWrites, 2)
  assert.match(page.url(), /consult-ask/)
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ passed: 7, askWrites, errors }))
} finally {
  await browser.close()
}
