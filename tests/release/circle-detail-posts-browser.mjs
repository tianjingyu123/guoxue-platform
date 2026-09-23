/** 圈内推荐与精华分页：本地夹具覆盖首屏截断、续页失败和独立精华查询。 */
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'

const { chromium } = createRequire(import.meta.url)(resolve(process.env.QA_NODE_MODULES, 'playwright'))
const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:5198'
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
let nextFails = true
let essenceQueries = 0
let writes = 0
const errors = []
const post = (id, essence = false) => ({ id, content: `共读笔记 ${id}`, createdAt: '2026-09-22T08:00:00Z', isEssence: essence, user: { id: 'author', nickname: '共读成员' }, likeCount: 0, commentCount: 0 })
const json = (data, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify({ code: status, data, message: status === 200 ? 'ok' : '模拟加载失败' }) })

try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (!url.pathname.includes('/api/v1/')) return url.origin === origin ? route.continue() : route.abort()
    const path = url.pathname.split('/api/v1')[1]
    if (route.request().method() !== 'GET') writes++
    if (path === '/circles/qa') return route.fulfill(json({ id: 'qa', name: '古籍共读社', type: 'FREE', price: 0, memberCount: 23, owner: { id: 'owner', nickname: '圈主' } }))
    if (path === '/circles/qa/posts') {
      if (url.searchParams.get('isEssence') === 'true') {
        essenceQueries++
        return route.fulfill(json({ posts: [post('essence-21', true), post('essence-22', true)], total: 2 }))
      }
      const page = Number(url.searchParams.get('page') || 1)
      if (page === 2 && nextFails) { nextFails = false; return route.fulfill(json(null, 503)) }
      return route.fulfill(json({ posts: page === 1 ? Array.from({ length: 20 }, (_, i) => post(`regular-${i + 1}`)) : [post('regular-21'), post('regular-22'), post('regular-23')], total: 23 }))
    }
    if (path === '/circles/qa/members') return route.fulfill(json({ members: [], total: 0 }))
    return route.fulfill(json([]))
  })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${origin}/h5/pkg-circle/circles/detail?id=qa`)
  await page.getByText('共读笔记 regular-20', { exact: true }).waitFor({ timeout: 15000 })
  await page.getByRole('button', { name: '加载更多圈内动态' }).click()
  await page.getByRole('button', { name: '重试加载更多动态' }).waitFor()
  assert.equal(await page.getByText('共读笔记 regular-20', { exact: true }).count(), 1, '续页故障应保留首批内容')
  await page.getByRole('button', { name: '重试加载更多动态' }).click()
  await page.getByText('共读笔记 regular-23', { exact: true }).waitFor()
  assert.equal(await page.getByRole('button', { name: '加载更多圈内动态' }).count(), 0)
  await page.getByRole('tab', { name: '精华' }).click()
  await page.getByText('共读笔记 essence-21', { exact: true }).waitFor()
  assert.ok(essenceQueries >= 1, '精华栏目必须请求独立筛选，不得仅过滤推荐首屏')
  assert.equal(await page.getByText('本圈还没有精华内容').count(), 0)
  assert.equal(writes, 0)
  assert.deepEqual(errors, [])
  console.log('圈子详情：推荐续页失败可恢复、精华独立筛选，不误报空态：通过')
} finally {
  await browser.close()
}
