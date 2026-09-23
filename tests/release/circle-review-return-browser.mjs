/** 圈子审核回访：仅使用本地接口夹具，不触及真实退款或审核。 */
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'

const { chromium } = createRequire(import.meta.url)(resolve(process.env.QA_NODE_MODULES, 'playwright'))
const origin = process.env.QA_ORIGIN
if (!origin) throw new Error('缺少隔离 H5 地址')
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
let auditStatus = 'PENDING'
let auditReads = 0
let exitReads = 0
let writes = 0
let joinFailure = false
const errors = []
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
      if (route.request().method() === 'POST' && path === '/circle-refund/exit-1/owner-review') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, data: {}, message: 'ok' }) })
      }
      if (path === '/circles/circle-1/join-requests' && joinFailure) {
        return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ code: 500, message: '本地模拟加入申请读取失败' }) })
      }
      if (path === '/audit/content-audits/mine') {
        auditReads++
        const status = url.searchParams.get('finalStatus')
        const records = status === 'ALL' || status === auditStatus ? [{ id: 'audit-1', contentType: 'POST', contentId: 'post-1', contentTitle: '测试审核内容', finalStatus: auditStatus, createdAt: '2026-09-22T00:00:00Z' }] : []
        data = { records, total: records.length }
      } else if (path === '/circle-refund/owner-pending') {
        exitReads++
        data = [{ id: 'exit-1', circleId: 'circle-1', userId: 'member-1', userNickname: '测试成员', paidAmount: 100, refundBase: 90, actualRefund: 90, usedDays: 10, dailyCost: 1, ownerStatus: 'pending', createdAt: '2026-09-22T00:00:00Z' }]
      } else if (path === '/circles/circle-1/join-requests') {
        data = [{ id: 'join-1', circleId: 'circle-1', userId: 'member-1', userNickname: '测试成员', status: 'PENDING', createdAt: '2026-09-22T00:00:00Z' }]
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, data, message: 'ok' }) })
    }
    if (url.origin === origin || url.protocol === 'data:') return route.continue()
    return route.abort()
  })
  const page = await context.newPage()
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${origin}/h5/pkg-circle/circles/my-audits`)
  await page.getByText('测试审核内容').waitFor()
  await page.getByText('审核中').last().waitFor()
  auditStatus = 'APPROVED'
  // H5 内使用真实页面导航周期，确认返回触发 onShow，而非刷新整个网页。
  await page.evaluate(() => window.uni.navigateTo({ url: '/pkg-circle/circles/exit-requests' }))
  await page.getByText('测试成员').waitFor()
  await page.evaluate(() => window.uni.navigateBack())
  await page.getByText('已通过').last().waitFor()
  assert.ok(auditReads >= 2)
  await page.getByText('已驳回').first().click()
  await page.getByText('暂无已驳回记录').waitFor()

  await page.goto(`${origin}/h5/pkg-circle/circles/exit-requests`)
  await page.getByText('测试成员').waitFor()
  await page.getByText('本次已处理').first().waitFor()
  await page.getByText('同意退出').click()
  await page.getByText('本次已处理').last().click()
  await page.getByText('等待平台审核与退款处理').waitFor()
  await page.getByText('后续平台处理和退款到账状态不会在此更新。', { exact: false }).waitFor()
  await page.evaluate(() => window.uni.navigateTo({ url: '/pkg-circle/circles/my-audits' }))
  await page.getByText('测试审核内容').waitFor()
  await page.evaluate(() => window.uni.navigateBack())
  await page.getByText('等待平台审核与退款处理').waitFor()
  assert.ok(exitReads >= 2)
  joinFailure = true
  await page.goto(`${origin}/h5/pkg-circle/circles/join-requests?id=circle-1&type=refund`)
  await page.getByText('测试成员 · 退款申请').waitFor()
  await page.getByText('加入申请').first().click()
  await page.getByText('加载失败（需圈主身份访问）').waitFor()
  joinFailure = false
  await page.getByText('重试').click()
  await page.getByText('申请理由：').waitFor()
  assert.deepEqual(errors, [])
  assert.equal(writes, 1)
  console.log(JSON.stringify({ passed: 16, auditReads, exitReads, fixtureWrites: writes, errors }))
} finally {
  await browser.close()
}
