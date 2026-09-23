/** 售后与圈主审核的查询失败态；不发出真实审核或退款操作。 */
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'

const { chromium } = createRequire(import.meta.url)(resolve(process.env.QA_NODE_MODULES, 'playwright'))
const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:5198'
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
let refundsFail = true
let ownerFail = true
let circlesCalls = 0
let writes = 0
const errors = []
const json = (data, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify({ code: status, data, message: status === 200 ? 'ok' : '模拟接口故障' }) })

try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (!url.pathname.includes('/api/v1/')) return url.origin === origin ? route.continue() : route.abort()
    const path = url.pathname.split('/api/v1')[1]
    if (route.request().method() !== 'GET') writes++
    if (path === '/circle-refund/my') {
      if (refundsFail) { refundsFail = false; return route.fulfill(json(null, 503)) }
      return route.fulfill(json({ data: [] }))
    }
    if (path === '/circle-refund/wallet') return route.fulfill(json({ balance: 23, transactions: [] }))
    if (path === '/circles/my') {
      if (++circlesCalls === 2) return route.fulfill(json(null, 503))
      return route.fulfill(json([]))
    }
    if (path === '/circles/qa/join-requests') return route.fulfill(json([]))
    if (path === '/circle-refund/owner-pending') {
      if (ownerFail) { ownerFail = false; return route.fulfill(json(null, 503)) }
      return route.fulfill(json({ data: [] }))
    }
    return route.fulfill(json(null, 404))
  })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${origin}/h5/pkg-circle/circles/my-refunds`)
  await page.getByText('加载失败', { exact: true }).waitFor({ timeout: 15000 })
  assert.equal(await page.getByText('暂无退款记录').count(), 0, '售后接口故障不能展示暂无退款')
  assert.equal(await page.getByText('暂未确认').count(), 1, '查询失败不能展示默认 0 元余额')
  await page.getByText('重试', { exact: true }).click()
  await page.getByText('暂无退款记录').waitFor()
  await page.getByText('会员事项暂时无法加载').waitFor()
  await page.getByRole('button', { name: '重试加载会员事项' }).click()
  await page.getByText('会员事项暂时无法加载').waitFor({ state: 'detached' })

  await page.goto(`${origin}/h5/pkg-circle/circles/join-requests?id=qa&type=refund`)
  await page.getByText('退款申请暂时无法加载，未确认是否有待审事项').waitFor()
  assert.equal(await page.getByText('暂无待审退款').count(), 0, '待审退款查询失败不能显示无待审')
  await page.getByRole('button', { name: '重新加载退款申请' }).click()
  await page.getByText('暂无待审退款').waitFor()
  assert.equal(writes, 0)
  assert.deepEqual(errors, [])
  console.log('圈子售后与退款审核：失败不伪装空记录、余额不显示假零、重试恢复：通过')
} finally {
  await browser.close()
}
