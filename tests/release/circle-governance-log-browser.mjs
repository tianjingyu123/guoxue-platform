/** 治理记录查询失败和分页本地验收；没有真实治理写入。 */
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'

const { chromium } = createRequire(import.meta.url)(resolve(process.env.QA_NODE_MODULES, 'playwright'))
const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:5198'
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
let firstFails = true
let nextFails = true
let writes = 0
const errors = []
const json = (data, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify({ code: status, data, message: status === 200 ? 'ok' : '模拟读取失败' }) })

try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (!url.pathname.includes('/api/v1/')) return url.origin === origin ? route.continue() : route.abort()
    if (route.request().method() !== 'GET') writes++
    const path = url.pathname.split('/api/v1')[1]
    if (path === '/circle-governance/qa/rules') return route.fulfill(json({ rules: [], requireRuleAck: false }))
    if (path === '/circle-governance/qa/config') return route.fulfill(json(null, 403))
    if (path === '/circle-governance/qa/violations') return route.fulfill(json({ items: [], total: 70 }))
    if (path === '/circle-governance/qa/log') {
      const page = Number(url.searchParams.get('page') || 1)
      if (page === 1 && firstFails) { firstFails = false; return route.fulfill(json(null, 503)) }
      if (page === 2 && nextFails) { nextFails = false; return route.fulfill(json(null, 503)) }
      const count = page === 1 ? 20 : 3
      return route.fulfill(json({ items: Array.from({ length: count }, (_, i) => ({
        id: `log-${(page - 1) * 20 + i + 1}`, type: 'WARNING', status: 'ACTIVE', memberMasked: '成员***',
        ruleText: `规则${(page - 1) * 20 + i + 1}`, createdAt: '2026-09-22T08:00:00Z',
      })), total: 23, page, pageSize: 20 }))
    }
    return route.fulfill(json(null, 404))
  })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${origin}/h5/pkg-circle/circles/rules?id=qa`)
  await page.getByText('治理配置暂不可用，当前以只读展示；圈主可重试确认权限').waitFor()
  await page.getByText('违规处理记录').waitFor({ timeout: 15000 })
  await page.getByText('违规处理记录').click()
  await page.getByText('治理记录暂时无法加载，不能确认是否有记录').waitFor()
  assert.equal(await page.getByText('暂无治理记录').count(), 0, '查询失败不能称为无治理记录')
  await page.getByRole('button', { name: '重新加载治理记录' }).click()
  await page.getByText('查看更多记录 · 已显示 20/23').waitFor()
  await page.getByRole('button', { name: '加载更多治理记录' }).click()
  await page.getByRole('button', { name: '重试加载更多治理记录' }).waitFor()
  await page.getByRole('button', { name: '重试加载更多治理记录' }).click()
  await page.getByText('规则23').waitFor()
  assert.equal(await page.getByText('近 30 天处理', { exact: false }).count(), 0, '只有首 50 条时不能宣称 30 天准确计数')
  assert.equal(writes, 0)
  assert.deepEqual(errors, [])
  console.log('圈子治理记录：失败不伪装空记录、完整分页、局部统计不冒充全量：通过')
} finally {
  await browser.close()
}
