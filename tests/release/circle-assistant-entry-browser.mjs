/** 圈主助理入口与场景返回：只用本地响应夹具，不请求线上接口。 */
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'

const { chromium } = createRequire(import.meta.url)(resolve(process.env.QA_NODE_MODULES, 'playwright'))
const origin = 'http://127.0.0.1:5197'
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const errors = []
let member = false
let expired = false
let statusFails = false
let writes = 0

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
    if (path === '/circles/qa-circle/assistant/stream' && method === 'POST') {
      const question = JSON.parse(route.request().postData() || '{}').question || ''
      const empty = question.includes('入门')
      const failed = question.includes('概念') || question.includes('额度')
      const longAnswer = question.includes('长篇')
      const events = failed
        ? [{ type: 'meta', knowledgeMatches: { circle: 1, global: 0 } }, { type: 'error', message: question.includes('额度') ? '模拟额度耗尽' : '模拟流式失败' }]
        : [{ type: 'meta', knowledgeMatches: empty ? { circle: 0, global: 0 } : { circle: 2, global: 1 } },
          { type: 'chunk', content: empty ? '可先从基础内容读起。' : longAnswer ? '本圈的共读路径从经典原文开始，再配合注释与讨论理解语境。'.repeat(8) : '本圈从古籍共读入门。' }, { type: 'done' }]
      return route.fulfill({ status: 200, contentType: 'text/event-stream', body: events.map(event => `data: ${JSON.stringify(event)}\n\n`).join('') })
    }
    let data = []
    let status = 200
    if (path === '/circles/qa-circle') data = { id: 'qa-circle', name: '古籍共读社', type: 'PAID', price: 88, owner: { id: 'owner' }, isJoined: member }
    if (path === '/circles/qa-circle/posts') data = { posts: Array.from({ length: 8 }, (_, i) => ({
      id: `post-${i}`, content: `第${i + 1}篇共读笔记：从本圈学习资料进入，再返回继续阅读。`,
      author: { id: 'author', nickname: '共读成员' }, createdAt: '2026-09-22T08:00:00Z',
      likeCount: 0, commentCount: 0,
    })) }
    if (path.endsWith('/join/status')) {
      if (statusFails) status = 503
      else data = { joined: member, expired, role: member ? 'MEMBER' : null }
    }
    if (method !== 'GET' && path !== '/track/batch') writes++
    return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ code: status, data, message: status === 200 ? 'ok' : '模拟状态查询失败' }) })
  })
  const page = await context.newPage()
  page.on('pageerror', e => errors.push(e.message))
  const entry = page.getByRole('link', { name: '向圈主助理提问' })

  await page.goto(`${origin}/h5/pkg-circle/circles/detail?id=qa-circle`)
  await page.getByText('加入后可用', { exact: true }).waitFor({ timeout: 15000 })
  await entry.click()
  await page.getByText('选择加入方式', { exact: false }).first().waitFor({ timeout: 5000 }).catch(async () => {
    assert.ok(!page.url().includes('/assistant'))
  })
  assert.ok(!page.url().includes('/assistant'), '未入圈不应先进入助理对话')

  member = true
  await page.goto(`${origin}/h5/pkg-circle/circles/detail?id=qa-circle`)
  await page.getByText('圈内专属', { exact: true }).waitFor({ timeout: 15000 })
  const scroller = page.locator('.body .uni-scroll-view').last()
  await scroller.evaluate(el => { el.scrollTop = 500 })
  assert.ok(await scroller.evaluate(el => el.scrollTop) > 400)
  await page.waitForTimeout(1100) // 超过页面刷新防抖，让返回时实际重拉数据
  await entry.dispatchEvent('click')
  await page.waitForURL('**/pkg-circle/circles/assistant?circleId=qa-circle**')
  await page.getByText('古籍共读社 · 圈主助理', { exact: true }).first().waitFor({ timeout: 5000 })
  await page.getByText('这个圈子主要讲什么？', { exact: true }).click()
  await page.getByText('本次检索到本圈 2 条、通用 1 条；检索命中不代表回答已逐条引用。', { exact: true }).waitFor({ timeout: 10000 })
  assert.equal(await page.locator('.answer-art').count(), 0, '欢迎语与短回答不应占用整幅答卷卡')
  if (process.env.QA_SCREENSHOT) {
    await page.screenshot({ path: process.env.QA_SCREENSHOT, fullPage: true })
  }
  await page.locator('textarea').fill('请给我长篇解释')
  await page.getByRole('button', { name: '发送消息' }).click()
  await page.locator('.answer-art').waitFor({ timeout: 10000 })
  await page.getByText('推荐一些入门内容', { exact: true }).click()
  await page.getByText('未检索到直接相关的资料，本次回答来自通用知识。', { exact: true }).waitFor({ timeout: 10000 })
  await page.getByText('帮我解释一个概念', { exact: true }).click()
  await page.getByText('模拟流式失败', { exact: false }).waitFor({ timeout: 10000 })
  assert.equal(await page.locator('.knowledge-note').count(), 3, '失败回答不应继续展示检索摘要')
  await page.locator('textarea').fill('模拟额度问题')
  await page.getByRole('button', { name: '发送消息' }).click()
  await page.getByText('模拟额度耗尽', { exact: false }).waitFor({ timeout: 10000 })
  assert.equal(await page.locator('.quota-recovery').count(), 0, '圈主助理未设付费额度时不应诱导购买会员')
  const refreshed = page.waitForResponse(resp => resp.url().includes('/api/v1/circles/qa-circle') && resp.url().split('?')[0].endsWith('/qa-circle'))
  await page.getByRole('button', { name: '返回上一页' }).click()
  await page.waitForURL('**/pkg-circle/circles/detail?id=qa-circle')
  await refreshed
  assert.ok(await scroller.evaluate(el => el.scrollTop) > 400, '返回原圈并刷新数据后应保留阅读位置')

  expired = true
  await page.goto(`${origin}/h5/pkg-circle/circles/detail?id=qa-circle`)
  await page.getByText('续费后可用', { exact: true }).waitFor({ timeout: 15000 })
  await entry.click()
  await page.waitForURL('**/pkg-circle/circles/renew?id=qa-circle')

  expired = false
  member = true
  await page.goto(`${origin}/h5/pkg-circle/circles/assistant?circleId=qa-circle`)
  await page.getByRole('button', { name: '返回上一页' }).click()
  await page.waitForURL('**/pkg-circle/circles/detail?id=qa-circle')

  statusFails = true
  await page.goto(`${origin}/h5/pkg-circle/circles/detail?id=qa-circle`)
  await page.getByText('成员状态待确认', { exact: true }).waitFor({ timeout: 15000 })
  await entry.click()
  assert.ok(!page.url().includes('/assistant'), '成员状态读取失败不应乐观放行')
  statusFails = false

  assert.equal(writes, 0)
  assert.deepEqual(errors, [])
  console.log('12组通过：成员引导与返回滚动、长短回答层级、流式命中/零命中/失败摘要、无付费额度不诱导购买、过期续费与状态失败保护；真实业务写入0。')
} finally { await browser.close() }
