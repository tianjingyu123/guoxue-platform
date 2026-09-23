/** 圈主知识库读取与分页本地验收，不触发提炼、确认或删除。 */
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
    const candidate = path.endsWith('/knowledge/candidates')
    if (!path.endsWith('/knowledge') && !candidate) return route.fulfill(json(null, 404))
    const page = Number(url.searchParams.get('page') || 1)
    if (!candidate && firstFails) { firstFails = false; return route.fulfill(json(null, 503)) }
    if (candidate && page === 2 && nextFails) { nextFails = false; return route.fulfill(json(null, 503)) }
    const count = page === 1 ? 20 : 3
    const items = Array.from({ length: count }, (_, i) => ({
      id: `${candidate ? 'candidate' : 'knowledge'}-${(page - 1) * 20 + i + 1}`,
      content: `${candidate ? '候选' : '入库'}观点${(page - 1) * 20 + i + 1}\n从原典核对语境。`,
      sourceType: 'manual', createdAt: '2026-09-22T08:00:00Z',
    }))
    return route.fulfill(json({ items, total: 23, page, pageSize: 20 }))
  })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${origin}/h5/pkg-circle/circles/knowledge?id=qa`)
  await page.getByText('加载失败（需圈主身份访问）').waitFor({ timeout: 15000 })
  assert.equal(await page.getByText('知识库还是空的').count(), 0, '读取失败不能伪装为空知识库')
  await page.getByText('重试', { exact: true }).click()
  await page.getByText('知识库 23 条').waitFor()
  await page.getByRole('button', { name: '加载更多知识条目' }).click()
  await page.getByText('已入库 · 23').waitFor()
  await page.getByText('入库观点23', { exact: true }).waitFor()
  await page.getByText('待确认', { exact: true }).first().click()
  await page.getByText('候选观点20', { exact: true }).waitFor()
  await page.getByRole('button', { name: '加载更多知识候选' }).click()
  await page.getByRole('button', { name: '重试加载更多知识候选' }).waitFor()
  assert.equal(await page.getByText('候选观点20', { exact: true }).count(), 1)
  await page.getByRole('button', { name: '重试加载更多知识候选' }).click()
  await page.getByText('候选观点23', { exact: true }).waitFor()
  assert.equal(writes, 0)
  assert.deepEqual(errors, [])
  console.log('圈主知识库：读取失败可重试、已入库与候选各 23 条完整分页：通过')
} finally {
  await browser.close()
}
