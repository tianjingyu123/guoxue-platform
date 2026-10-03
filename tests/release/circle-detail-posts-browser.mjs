/** 圈内推荐与精华分页：本地夹具覆盖首屏截断、续页失败和独立精华查询。 */
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { mkdir } from 'node:fs/promises'
import assert from 'node:assert/strict'

const { chromium } = createRequire(import.meta.url)(resolve(process.env.QA_NODE_MODULES, 'playwright'))
const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:5198'
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
let nextFails = true
let essenceQueries = 0
let articleQueries = 0
let articlePageTwoFails = true
let qaAttempts = 0
let discoverAttempts = 0
let paginateDiscover = false
let moreFailed = false
let ignoreOffset = false
const discoverOffsets = []
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
    if (path === '/articles') {
      articleQueries++
      const articlePage = Number(url.searchParams.get('page') || 1)
      if (articleQueries === 1 || (articlePage === 2 && articlePageTwoFails)) {
        if (articlePage === 2) articlePageTwoFails = false
        return route.fulfill(json(null, 503))
      }
      const rows = articlePage === 1 ? Array.from({ length: 6 }, (_, i) => ({ id: `article-${i + 1}`, title: `共读文章 ${i + 1}`, cover: '/static/images/default-cover.png' }))
        : [{ id: 'article-7', title: '共读文章 7' }, { id: 'article-8', title: '共读文章 8' }]
      return route.fulfill(json({ rows, total: 8 }))
    }
    if (path === '/circles/qa/experts') {
      qaAttempts++
      if (qaAttempts === 1 || qaAttempts === 3 || qaAttempts === 5) return route.fulfill(json(null, 503))
      return route.fulfill(json([{ userId: 'expert', user: { id: 'expert', nickname: '问答达人' }, questionPriceCoin: 20, callPricePerMinuteCoin: 5 }]))
    }
    if (path === '/circles/experts/discover') {
      if (paginateDiscover) {
        const offset = Number(url.searchParams.get('offset') || 0)
        discoverOffsets.push(offset)
        if (offset === 20 && !moreFailed) { moreFailed = true; return route.fulfill(json(null, 503)) }
        const rows = offset === 0 || ignoreOffset
          ? Array.from({ length: 20 }, (_, i) => ({ userId: `user-${i + 1}`, user: { id: `user-${i + 1}`, nickname: `达人${i + 1}` }, questionPriceCoin: 20, circleId: 'qa', circle: { id: 'qa', name: '古籍共读社' } }))
          : [{ userId: 'user-1', user: { id: 'user-1', nickname: '达人1' }, questionPriceCoin: 10, circleId: 'other', circle: { id: 'other', name: '另一圈' } }, { userId: 'user-21', user: { id: 'user-21', nickname: '达人21' }, questionPriceCoin: 10, circleId: 'qa', circle: { id: 'qa', name: '古籍共读社' } }]
        return route.fulfill(json(rows))
      }
      discoverAttempts++
      if (discoverAttempts === 1) return route.fulfill(json(null, 503))
      return route.fulfill(json([{ userId: 'expert', user: { id: 'expert', nickname: '问答达人' }, questionPriceCoin: 20, callPricePerMinuteCoin: 5, circleId: 'qa', circle: { id: 'qa', name: '古籍共读社' } }]))
    }
    return route.fulfill(json([]))
  })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${origin}/h5/pkg-circle/circles/detail?id=qa`)
  await page.getByText('共读笔记 regular-20', { exact: true }).waitFor({ timeout: 15000 })
  assert.equal(await page.getByText('圈子还没有内容').count(), 0, '有续页的推荐流不得显示空圈提示')
  await page.getByRole('button', { name: '加载更多圈内动态' }).click()
  await page.getByRole('button', { name: '重试加载更多动态' }).waitFor()
  assert.equal(await page.getByText('共读笔记 regular-20', { exact: true }).count(), 1, '续页故障应保留首批内容')
  await page.getByRole('button', { name: '重试加载更多动态' }).click()
  await page.getByText('共读笔记 regular-23', { exact: true }).waitFor()
  assert.equal(await page.getByRole('button', { name: '加载更多圈内动态' }).count(), 0)
  await page.getByRole('tab', { name: '文章' }).click()
  await page.getByText('文章暂时无法加载，尚不能确认本圈是否有文章').waitFor()
  assert.equal(await page.getByText('本圈还没有文章').count(), 0, '文章读取失败不得伪装为空')
  await page.getByRole('button', { name: '重试加载圈内文章' }).click()
  await page.getByText('共读文章 6', { exact: true }).waitFor()
  assert.equal(articleQueries, 2)
  await page.getByRole('button', { name: '加载更多圈内文章' }).click()
  await page.getByRole('button', { name: '重试加载更多圈内文章' }).waitFor()
  assert.equal(await page.getByText('共读文章 6', { exact: true }).count(), 1)
  await page.getByRole('button', { name: '重试加载更多圈内文章' }).click()
  await page.getByText('共读文章 8', { exact: true }).waitFor()
  assert.equal(await page.getByRole('button', { name: '加载更多圈内文章' }).count(), 0)
  assert.equal(articleQueries, 4)
  await page.getByRole('tab', { name: '精华' }).click()
  await page.getByText('共读笔记 essence-21', { exact: true }).waitFor()
  assert.ok(essenceQueries >= 1, '精华栏目必须请求独立筛选，不得仅过滤推荐首屏')
  assert.equal(await page.getByText('本圈还没有精华内容').count(), 0)
  await page.getByRole('tab', { name: '问答' }).click()
  await page.getByText('问答服务暂时无法加载，已开通的达人信息尚未确认。').waitFor()
  assert.equal(await page.getByText('本圈暂无开通问答的达人').count(), 0)
  await page.getByRole('button', { name: '重试加载问答达人' }).click()
  await page.getByText('问答达人').waitFor()
  assert.equal(qaAttempts, 2)
  await page.goto(`${origin}/h5/pkg-circle/circles/consult-experts?circleId=qa`)
  await page.getByText('加载失败', { exact: true }).waitFor()
  assert.equal(await page.getByText('本圈暂无开通咨询的达人').count(), 0)
  await page.getByText('重试', { exact: true }).click()
  await page.getByText('问答达人').waitFor()
  assert.equal(qaAttempts, 4)
  await page.goto(`${origin}/h5/pkg-circle/circles/consult-experts`)
  await page.getByText('加载失败', { exact: true }).waitFor()
  assert.equal(await page.getByText('平台暂无开通咨询的达人').count(), 0)
  await page.getByText('重试', { exact: true }).click()
  await page.getByText('问答达人').waitFor()
  assert.equal(discoverAttempts, 2)
  await page.goto(`${origin}/h5/pkg-circle/circles/booking?circleId=qa&expertId=expert&price=1`)
  await page.getByText('暂时无法核实连麦服务与价格，请重试').waitFor()
  assert.equal(await page.getByText('1 金币/分钟').count(), 0, '链接中的旧价格不得充当当前报价')
  await page.getByText('重试', { exact: true }).click()
  await page.getByText('5 金币/分钟', { exact: false }).first().waitFor()
  await page.getByText('连麦服务准备中').waitFor()
  await mkdir(resolve('artifacts/circle-consult-availability-20260923'), { recursive: true })
  await page.screenshot({ path: resolve('artifacts/circle-consult-availability-20260923/booking-h5.png'), fullPage: true })
  assert.equal(qaAttempts, 6)
  await page.getByText('先看看达人的图文咨询').click()
  await page.waitForURL(/\/h5\/pkg-circle\/circles\/consult-experts\?circleId=qa/)
  await page.getByText('了解连麦').click()
  await page.waitForURL(/\/h5\/pkg-circle\/circles\/booking\?circleId=qa/)
  await page.getByText('先看看达人的图文咨询').click()
  await page.waitForURL(/\/h5\/pkg-circle\/circles\/consult-experts\?circleId=qa/)
  paginateDiscover = true
  await page.goto(`${origin}/h5/pkg-circle/circles/consult-experts`)
  await page.getByText('咨询服务 · 已展示 20 项').waitFor()
  await page.getByRole('button', { name: '加载更多达人服务' }).click()
  await page.getByRole('button', { name: '重试加载更多达人服务' }).waitFor()
  assert.equal(await page.getByText('咨询服务 · 已展示 20 项').count(), 1)
  await page.getByRole('button', { name: '重试加载更多达人服务' }).click()
  await page.getByText('咨询服务 · 已展示 22 项').waitFor()
  assert.deepEqual(discoverOffsets, [0, 20, 20])
  assert.equal(await page.getByText('达人1', { exact: true }).count(), 2, '同一达人在不同圈子应保留不同报价卡')
  ignoreOffset = true
  await page.goto(`${origin}/h5/pkg-circle/circles/consult-experts`)
  await page.getByRole('button', { name: '加载更多达人服务' }).click()
  await page.getByRole('button', { name: '加载更多达人服务' }).waitFor({ state: 'hidden' })
  await page.getByText('咨询服务 · 已展示 20 项').waitFor()
  assert.equal(await page.getByRole('button', { name: '加载更多达人服务' }).count(), 0, '旧服务端重复首页时不得无限续页')
  assert.equal(writes, 0)
  assert.deepEqual(errors, [])
  console.log('圈子详情：推荐、文章与达人续页，精华、故障重试、跨圈服务及连麦报价：通过')
} finally {
  await browser.close()
}
