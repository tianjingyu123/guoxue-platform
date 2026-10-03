/** 圈子管理隔离验收：全部接口使用本地夹具，不读取或写入真实业务。 */
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
const require = createRequire(import.meta.url)
const { chromium } = require(resolve(process.env.QA_NODE_MODULES, 'playwright'))
const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:5197'
const out = resolve('artifacts/circle-management-20260922')
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const results = [], errors = []
let mode = 'pending', writes = 0
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
      let data = [], status = 200
      if (path === '/circles/my') data = ['一号', '二号'].map((name, index) => ({ circle: { id: `qa-${index}`, name: `${name}研习社`, type: 'FREE' }, role: mode === 'member' ? 'MEMBER' : 'OWNER' }))
      if (path === '/circles/my-stats') data = { joinedCount: 2, postCount: 7 }
      if (mode === 'me-failure' && ['/circles/my', '/circles/my-stats', '/circle-refund/my'].includes(path)) status = 503
      if (path.endsWith('/dashboard/overview')) {
        data = { name: '古籍共读与日常研习长名称测试圈子', memberCount: 1 }
        if (mode === 'denied') status = 403
      }
      if (path.endsWith('/join-requests')) data = mode === 'pending' ? [{ id: 'qa-request', status: 'PENDING', createdAt: '2026-09-20T00:00:00Z' }] : []
      if (path.endsWith('/dashboard/trends')) data = { trends: [] }
      if (path.endsWith('/dashboard/pending-questions')) data = { questions: [] }
      if (path === '/circles/qa-circle') data = { id: 'qa-circle', name: '古籍共读社', memberCount: 1 }
      if (mode === 'failure' && (path.includes('owner-pending') || path.includes('/knowledge/candidates') || path.includes('/invite-codes'))) status = 503
      return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ code: status, data, message: status === 200 ? 'ok' : '模拟查询失败' }) })
    }
    if (url.origin === origin || url.protocol === 'data:') return route.continue()
    return route.abort()
  })
  const page = await context.newPage()
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${origin}/h5/pkg-circle/circles/dashboard?id=qa-circle`)
  await page.getByText('待审核加入申请', { exact: true }).waitFor()
  await page.getByText('成员管理', { exact: true }).waitFor({ state: 'attached' })
  assert.equal(await page.getByText('暂无待办', { exact: true }).count(), 0)
  await page.screenshot({ path: resolve(out, '01-pending.png') })
  results.push('单成员新圈子保留真实待办与管理入口，待办首屏可见')
  mode = 'failure'
  await page.getByRole('button', { name: '刷新管理概览' }).click()
  await page.getByText('起步进度暂未确认，请刷新后查看。', { exact: true }).waitFor({ state: 'attached' })
  assert.match(await page.locator('.load-notice').first().innerText(), /退款申请、知识库候选暂时无法确认/)
  assert.equal(await page.getByText('暂无待办', { exact: true }).count(), 0)
  assert.equal(await page.getByText('待审核加入申请', { exact: true }).count(), 0)
  await page.screenshot({ path: resolve(out, '02-unconfirmed.png') })
  results.push('部分接口失败不伪装空待办或起步进度，并清除已失效申请计数')
  mode = 'empty'
  await page.getByRole('button', { name: '刷新管理概览' }).click()
  await page.getByText('暂无待办', { exact: true }).waitFor()
  assert.equal(await page.locator('.load-notice').count(), 0)
  results.push('重试恢复成功后才显示真实空态')
  for (const width of [320, 768]) {
    await page.setViewportSize({ width, height: 844 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    const back = await page.getByRole('button', { name: '返回圈子' }).boundingBox()
    assert.ok(back.width >= 44 && back.height >= 44)
  }
  results.push('320/768宽度无页面横向溢出，返回触达区至少44px')
  mode = 'denied'
  await page.getByRole('button', { name: '刷新管理概览' }).click()
  await page.getByText('加载失败', { exact: true }).waitFor()
  assert.equal(await page.getByText('成员管理', { exact: true }).count(), 0)
  results.push('概览权限拒绝后不继续展示旧管理区')
  mode = 'owner'
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${origin}/h5/pkg-circle/circles/me`)
  await page.getByRole('button', { name: '管理一号研习社' }).waitFor()
  await page.getByRole('button', { name: '管理二号研习社' }).waitFor()
  await page.screenshot({ path: resolve(out, '03-my-affairs.png') })
  results.push('个人事务展示两个独立管理入口，不只保留第一个圈子')
  mode = 'me-failure'
  await page.reload()
  await page.getByRole('button', { name: '重试圈子事务' }).waitFor()
  assert.equal(await page.getByRole('button', { name: '管理一号研习社' }).count(), 0)
  assert.equal(await page.locator('.content-num').innerText(), '—')
  mode = 'member'
  await page.getByRole('button', { name: '重试圈子事务' }).click()
  await page.waitForFunction(() => document.querySelector('.content-num')?.textContent === '7')
  assert.equal(await page.getByText('我管理的圈子', { exact: true }).count(), 0)
  assert.equal(await page.locator('.load-notice').count(), 0)
  results.push('个人事务失败不显示虚假零值，重试可恢复；普通成员没有管理入口')
  assert.deepEqual(errors, [])
  assert.equal(writes, 0)
  await writeFile(resolve(out, 'results.json'), JSON.stringify({ results, errors, writes }, null, 2))
  console.log(JSON.stringify({ passed: results.length, results, errors, writes }, null, 2))
} finally { await browser.close() }
