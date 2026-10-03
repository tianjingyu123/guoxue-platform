/** 邀请统计局部故障与邀请码过期：隔离 H5 夹具，不生成真实邀请码。 */
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'

const { chromium } = createRequire(import.meta.url)(resolve(process.env.QA_NODE_MODULES, 'playwright'))
const origin = process.env.QA_ORIGIN
if (!origin) throw new Error('缺少隔离 H5 地址')
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
let statsFail = true
let codeUsed = false
let codeReads = 0
let writes = 0
const errors = []
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['clipboard-read', 'clipboard-write'] })
  await context.addInitScript(() => localStorage.setItem('auth_token', JSON.stringify({ type: 'string', data: 'local-fixture-only' })))
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.includes('/api/v1/')) {
      if (route.request().method() !== 'GET') writes++
      const path = url.pathname.split('/api/v1')[1]
      const ok = data => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, data, message: 'ok' }) })
      if (path === '/circles/circle-invite') return ok({ id: 'circle-invite', name: '共读经典', type: 'FREE', status: 'ACTIVE', memberCount: 12, postCount: 1, owner: { id: 'owner', nickname: '领读人' } })
      if (path === '/circles/circle-invite/invite-codes') {
        codeReads++
        return ok([{ id: 'code-1', code: 'INVITE123', maxUses: 1, useCount: codeUsed ? 1 : 0, createdAt: '2026-09-22T00:00:00Z' }])
      }
      if (path === '/circles/circle-invite/invitation-stats') {
        if (statsFail) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ code: 503, message: '本地模拟统计读取失败' }) })
        return ok({ total: 1, records: [{ id: 'invite-1', invitee: { nickname: '测试新成员' }, joinedAt: '2026-09-23T00:00:00Z' }] })
      }
      if (path === '/audit/content-audits/mine') return ok({ records: [], total: 0 })
      return ok({})
    }
    if (url.origin === origin || url.protocol === 'data:') return route.continue()
    return route.abort()
  })
  const page = await context.newPage()
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${origin}/h5/pkg-circle/circles/invite-codes?id=circle-invite`)
  await page.getByText('INVITE123').waitFor()
  await page.getByText('邀请统计暂时无法加载，邀请码仍可正常分享').waitFor()
  await page.getByText('复制邀请链接').click()
  assert.match(await page.evaluate(() => navigator.clipboard.readText()), /code=INVITE123/)
  statsFail = false
  codeUsed = true
  // 正式 H5 构建不把 uni 挂在 window；这里验证重新进入页面，SPA onShow 另待真机核验。
  await page.goto(`${origin}/h5/pkg-circle/circles/my-audits`)
  await page.getByText('暂无审核记录').waitFor()
  await page.goto(`${origin}/h5/pkg-circle/circles/invite-codes?id=circle-invite`)
  await page.getByText('测试新成员').waitFor()
  await page.getByText('生成邀请码').waitFor()
  assert.ok(codeReads >= 2)
  assert.deepEqual(errors, [])
  assert.equal(writes, 0)
  console.log(JSON.stringify({ passed: 8, codeReads, writes, errors }))
} finally {
  await browser.close()
}
