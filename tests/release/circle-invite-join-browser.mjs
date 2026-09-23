/** 邀请码分享至入圈的隔离 H5 回归：真实页面，所有接口由本地数据拦截。 */
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'

const { chromium } = createRequire(import.meta.url)(resolve(process.env.QA_NODE_MODULES, 'playwright'))
const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:5198'
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const errors = []
const writes = []
let codesFail = true
let acknowledged = false
let joined = false
let circleType = 'FREE'
const circle = { id: 'circle-invite', name: '共读经典', intro: '一起交流古籍', type: 'FREE', status: 'ACTIVE', memberCount: 12, postCount: 1, owner: { id: 'owner', nickname: '领读人' } }
const ok = data => ({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, data, message: 'ok' }) })
const fail = (message, status = 403) => ({ status, contentType: 'application/json', body: JSON.stringify({ code: status, data: null, message }) })

try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['clipboard-read', 'clipboard-write'] })
  await context.addInitScript(() => localStorage.setItem('auth_token', JSON.stringify({ type: 'string', data: 'local-fixture-only' })))
  await context.route('**/*', route => {
    const url = new URL(route.request().url())
    if (!url.pathname.includes('/api/v1/')) return url.origin === origin ? route.continue() : route.abort()
    const path = url.pathname.split('/api/v1')[1]
    if (route.request().method() !== 'GET') writes.push({ path, body: route.request().postDataJSON() })
    if (path === '/circles/circle-invite') return route.fulfill(ok({ ...circle, type: circleType, price: circleType === 'FREE' ? 0 : 99 }))
    if (path === '/circles/circle-invite/invite-codes') {
      if (codesFail) { codesFail = false; return route.fulfill(fail('读取失败', 503)) }
      return route.fulfill(ok([{ id: 'code-1', code: 'ABC123', maxUses: 0, useCount: 0, createdAt: '2026-09-22T00:00:00Z' }]))
    }
    if (path === '/circles/circle-invite/invitation-stats') return route.fulfill(ok({ total: 0, records: [] }))
    if (path === '/circles/circle-invite/posts') return route.fulfill(ok({ posts: [], total: 0 }))
    if (path === '/circles/circle-invite/join/status') return route.fulfill(ok({ joined }))
    if (path === '/circles/join-by-code') {
      if (!acknowledged) return route.fulfill(fail('RULE_ACK_REQUIRED：请先阅读并确认圈规'))
      joined = true
      return route.fulfill(ok({ success: true, circleId: 'circle-invite' }))
    }
    if (path === '/circle-governance/circle-invite/rules') return route.fulfill(ok({ requireRuleAck: true, rules: [{ id: 'rule-1', text: '尊重每一位圈友，讨论请围绕古籍内容。', sortOrder: 1 }] }))
    if (path === '/circle-governance/circle-invite/rules/ack') { acknowledged = true; return route.fulfill(ok({ success: true, ruleCount: 1 })) }
    return route.fulfill(ok([]))
  })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${origin}/h5/pkg-circle/circles/invite-codes?id=circle-invite`)
  await page.getByText('加载失败，请重试').waitFor({ timeout: 15000 })
  await page.getByText('重试', { exact: true }).click()
  await page.getByText('ABC123', { exact: true }).waitFor()
  await page.getByText('复制邀请链接', { exact: true }).click()
  const clipboard = await page.evaluate(() => navigator.clipboard.readText())
  assert.match(clipboard, /\/pkg-circle\/circles\/preview\?id=circle-invite&code=ABC123/)
  await page.goto(`${origin}/h5/pkg-circle/circles/preview?id=circle-invite&code=ABC123`)
  await page.getByRole('button', { name: '免费加入' }).click()
  await page.getByRole('dialog', { name: '确认圈规' }).waitFor()
  await page.getByText('尊重每一位圈友，讨论请围绕古籍内容。').waitFor()
  await page.getByText('我已阅读并同意本圈规则').click()
  await page.getByText('确认并继续加入').click()
  await page.waitForURL(/\/h5\/pkg-circle\/circles\/detail\?id=circle-invite/, { timeout: 15000 })
  assert.equal(writes.filter(item => item.path === '/circles/join-by-code').length, 2)
  assert.deepEqual(writes.filter(item => item.path === '/circles/join-by-code').map(item => item.body), [
    { code: 'ABC123', circleId: 'circle-invite' },
    { code: 'ABC123', circleId: 'circle-invite' },
  ])
  assert.equal(writes.filter(item => item.path === '/circle-governance/circle-invite/rules/ack').length, 1)
  assert.equal(writes.some(item => item.path === '/circles/circle-invite/join'), false)
  circleType = 'PAID'
  await page.goto(`${origin}/h5/pkg-circle/circles/invite-codes?id=circle-invite`)
  await page.getByText('分享不会跳过付款。', { exact: false }).waitFor()
  assert.equal(await page.getByText('我的专属邀请码').count(), 0)
  await page.getByText('复制邀请链接', { exact: true }).click()
  const paidClipboard = await page.evaluate(() => navigator.clipboard.readText())
  assert.match(paidClipboard, /\/pkg-circle\/circles\/preview\?id=circle-invite/)
  assert.equal(paidClipboard.includes('code='), false)
  assert.deepEqual(errors, [])
  console.log('圈子邀请：失败重试、免费圈自动带码、确认圈规与直达圈内、付费圈仅分享预览：通过')
} finally {
  await browser.close()
}
