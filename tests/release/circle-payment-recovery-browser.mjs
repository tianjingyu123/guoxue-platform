/** 已付圈子订单的本地恢复验收。所有请求使用夹具，无真实付款或成员写入。 */
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
const { chromium } = createRequire(import.meta.url)(resolve(process.env.QA_NODE_MODULES, 'playwright'))
const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:5197'
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
let member = false, attempts = 0, renewAttempts = 0, failFirst = true, orderReads = 0, invalidOrder = false, otherWrites = 0
let orderType = 'CIRCLE_JOIN'
const errors = []
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await context.addInitScript(() => {
    localStorage.setItem('auth_token', JSON.stringify({ type: 'string', data: 'local-fixture-only' }))
    localStorage.setItem('userInfo', JSON.stringify({ type: 'object', data: { id: 'qa-member' } }))
  })
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (!url.pathname.includes('/api/v1/')) return url.origin === origin ? route.continue() : route.abort()
    const path = url.pathname.split('/api/v1')[1]
    const method = route.request().method()
    let status = 200, data = []
    if (path === '/circles/qa-circle') data = { id: 'qa-circle', name: '古籍共读社', type: 'PAID', price: 88, owner: { id: 'owner' }, isJoined: member }
    if (path.endsWith('/join/status')) data = { joined: member, expired: false, role: member ? 'MEMBER' : null }
    if (path === '/shop/orders/paid/current') { orderReads++; data = { status: 'PAID', type: orderType, targetId: invalidOrder ? 'other-circle' : 'qa-circle' } }
    if (path === '/circles/qa-circle/join/confirm' && method === 'POST') {
      attempts++
      if (failFirst) status = 503
      else { member = true; data = { id: 'member' } }
    } else if (path === '/circles/qa-circle/renew/confirm' && method === 'POST') { renewAttempts++; data = { newExpireAt: '2027-09-22T00:00:00Z' } }
    else if (method !== 'GET') otherWrites++
    return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ code: status, data, message: status === 200 ? 'ok' : '模拟确认失败' }) })
  })
  const page = await context.newPage()
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${origin}/h5/pkg-circle/circles/detail?id=qa-circle&paymentSuccess=1&paymentOrderId=paid`)
  await page.getByText('模拟确认失败', { exact: false }).waitFor({ timeout: 15000 })
  assert.equal(attempts, 1)
  assert.equal(otherWrites, 0)
  failFirst = false
  await page.getByText('重新确认入圈权益', { exact: true }).click()
  await page.waitForFunction(() => !document.querySelector('.membership-notice'))
  assert.equal(attempts, 2)
  assert.ok(orderReads >= 2)
  assert.equal(otherWrites, 0)
  member = false; invalidOrder = true; attempts = 0
  await page.goto(`${origin}/h5/pkg-circle/circles/detail?id=qa-circle&paymentSuccess=1&paymentOrderId=paid`)
  await page.getByText('订单状态尚未确认，请稍后重试', { exact: false }).waitFor({ timeout: 15000 })
  assert.equal(attempts, 0)
  invalidOrder = false; member = true; orderType = 'CIRCLE_RENEW'
  const renewResponse = page.waitForResponse(resp => resp.url().includes('/circles/qa-circle/renew/confirm'))
  await page.goto(`${origin}/h5/pkg-circle/circles/detail?id=qa-circle&paymentSuccess=1&paymentOrderId=paid`)
  await renewResponse
  await page.waitForFunction(() => !document.querySelector('.membership-notice'))
  assert.equal(renewAttempts, 1)
  assert.equal(attempts, 0)
  assert.deepEqual(errors, [])
  console.log('4组通过：首次兑现失败保留重试、重试确认后解锁、目标圈子不匹配拒绝兑现、已加入成员的续费仍需确认；真实业务写入0。')
} finally { await browser.close() }
