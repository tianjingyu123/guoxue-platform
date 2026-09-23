/** 圈子加入与续费的本地交互验收：所有接口拦截，禁止真实订单和外网。 */
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
const require = createRequire(import.meta.url)
const { chromium } = require(resolve(process.env.QA_NODE_MODULES, 'playwright'))
const origin = 'http://127.0.0.1:5197'
const out = resolve('artifacts/circle-admission-20260922')
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
let page
const results = []
const errors = []
let failStatus = false, failRequests = false, joined = false, expired = false, approval = false, pending = false, yearly = false
let joinWrites = 0, renewWrites = 0, failJoin = false
const circle = () => ({ id: 'qa-circle', name: '古籍共读社', intro: '一起读懂经典，分享阅读中的发现。', memberCount: 128, postCount: 16, type: yearly ? 'YEARLY' : 'FREE', needApproval: approval, price: 99, owner: { id: 'qa-owner', nickname: '领读人' } })
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await context.addInitScript(() => localStorage.setItem('auth_token', JSON.stringify({ type: 'string', data: 'local-fixture-only' })))
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.includes('/api/v1/')) {
      const path = url.pathname.split('/api/v1')[1]
      let data = [], status = 200
      if (path === '/circles/qa-circle') data = circle()
      if (path.endsWith('/posts')) data = { posts: [], total: 0 }
      if (path.endsWith('/join/status')) { data = { joined, expired, role: joined ? 'MEMBER' : null, expireAt: yearly && (joined || expired) ? expired ? '2026-01-01T00:00:00Z' : '2026-10-01T00:00:00Z' : null }; if (failStatus) status = 503 }
      if (path === '/circles/my-join-requests') { data = pending ? [{ id: 'qa-request', circleId: 'qa-circle', status: 'PENDING' }] : []; if (failRequests) status = 503 }
      if (path === '/circles/qa-circle/join' && route.request().method() === 'POST') {
        joinWrites++
        await new Promise(r => setTimeout(r, 350))
        if (failJoin) status = 503
        else if (approval) { pending = true; data = { status: 'pending' } }
        else { joined = true; data = { success: true } }
      }
      if (path.endsWith('/renew/quote')) data = { priceYuan: 99, originalPriceYuan: 99, twoYear: { priceYuan: 198, originalPriceYuan: 198 } }
      if (path === '/circles/qa-circle/renew' && route.request().method() === 'POST') { renewWrites++; data = { orderId: 'qa-renew-order', priceYuan: 89 } }
      return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ code: status, data, message: status === 200 ? 'ok' : '本地模拟网络错误' }) })
    }
    if (url.origin === origin || url.protocol === 'data:') return route.continue()
    return route.abort()
  })
  page = await context.newPage()
  page.on('pageerror', e => errors.push(e.message))
  const open = async (path = 'preview', query = '') => page.goto(`${origin}/h5/pkg-circle/circles/${path}?id=qa-circle${query}`)
  failStatus = true
  await open()
  await page.getByRole('button', { name: '状态未确认 · 重试', exact: true }).waitFor()
  assert.equal(joinWrites, 0)
  await page.screenshot({ path: resolve(out, '01-membership-error.png') })
  results.push('成员查询失败保持内容可读，加入按钮显示重试，不建单')
  failStatus = false
  await page.getByRole('button', { name: '状态未确认 · 重试', exact: true }).click()
  await page.getByRole('button', { name: '免费加入', exact: true }).waitFor()
  failJoin = true
  await page.getByRole('button', { name: '免费加入', exact: true }).dblclick()
  await page.getByRole('button', { name: '免费加入', exact: true }).waitFor()
  assert.equal(joinWrites, 1)
  results.push('连续点击只提交一次，失败不授予成员身份')
  failJoin = false
  await page.getByRole('button', { name: '免费加入', exact: true }).click()
  await page.waitForURL('**/circles/detail?id=qa-circle')
  await page.getByRole('button', { name: '发动态', exact: true }).waitFor()
  results.push('免费加入以服务端成员状态确认，自动替换预览页进入圈子')
  joined = false; approval = true; pending = true
  await open()
  await page.getByRole('button', { name: '查看申请进度', exact: true }).waitFor()
  results.push('重新进入预览页保留待审核状态，不重复申请')
  failRequests = true
  await open()
  await page.getByRole('button', { name: '状态未确认 · 重试', exact: true }).waitFor()
  results.push('审批记录查询失败不冒充没有申请')
  failRequests = false; approval = false; pending = false; yearly = true
  await open()
  await page.getByRole('button', { name: '加入圈子', exact: true }).click()
  await page.locator('.ps-sheet').waitFor()
  assert.equal(await page.locator('.jp-overlay').count(), 0)
  results.push('付费预览直接打开购买组件，不叠加重复权益确认弹层')
  await open('detail', '&paymentSuccess=1')
  await page.getByRole('button', { name: '重新确认入圈权益', exact: true }).waitFor()
  assert.equal(await page.locator('.fab').count(), 0)
  await page.screenshot({ path: resolve(out, '02-payment-access-pending.png') })
  joined = true
  await page.getByRole('button', { name: '重新确认入圈权益', exact: true }).click()
  await page.getByRole('button', { name: '发动态', exact: true }).waitFor()
  results.push('支付回跳标记不授予权益，不再次付款，刷新确认成员后解锁')
  joined = false; expired = true
  await open()
  await page.getByRole('button', { name: '续费后继续交流', exact: true }).click()
  await page.waitForURL('**/circles/renew?id=qa-circle')
  await page.getByRole('button', { name: '续费一年', exact: true }).waitFor()
  await page.screenshot({ path: resolve(out, '03-renewal.png') })
  for (const width of [320, 768]) {
    await page.setViewportSize({ width, height: 844 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
  }
  await page.getByRole('button', { name: '续费一年', exact: true }).click()
  await page.waitForURL('**/pkg-shop/paying/index?**')
  assert.equal(new URL(page.url()).searchParams.get('amount'), '89')
  assert.equal(new URL(page.url()).searchParams.get('orderId'), 'qa-renew-order')
  assert.equal(renewWrites, 1)
  results.push('已过期直达续费，服务端订单金额传入统一收银页，320/768px 无横向溢出')
  failStatus = true
  await open('renew')
  await page.getByText('加载失败，请重试', { exact: true }).waitFor()
  assert.equal(await page.locator('.rn-bar-btn').count(), 0)
  results.push('续费成员身份查询失败不给出错误的未加入结论，不展示付款按钮')
  assert.deepEqual(errors, [])
  await writeFile(resolve(out, 'results.json'), JSON.stringify({ environment: '本地 H5 + 全接口拦截，无真实支付，无线上验收', results, errors }, null, 2))
  console.log(JSON.stringify({ passed: results.length, results, errors }, null, 2))
} catch (error) {
  if (page) { await page.screenshot({ path: resolve(out, 'failure.png') }); console.log((await page.locator('body').innerText()).slice(0, 2500)) }
  throw error
} finally { await browser.close() }
