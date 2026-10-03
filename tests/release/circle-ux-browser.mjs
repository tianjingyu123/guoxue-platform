/** 本地 H5 交互验收：全部业务请求拦截为测试数据，拒绝外网与真实写入。 */
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.QA_NODE_MODULES ? resolve(process.env.QA_NODE_MODULES, 'playwright') : 'playwright')
const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:5197'
const out = resolve('artifacts/circle-experience-20260922')
await mkdir(out, { recursive: true })
const circle = { id: 'qa-circle', name: '古籍共读社', intro: '一起读懂经典，分享阅读中的发现与疑问。', tags: ['国学'], memberCount: 128, postCount: 16, type: 'FREE', owner: { id: 'qa-owner', nickname: '共读领读人' } }
const other = { ...circle, id: 'qa-discover', name: '山水诗词研习社', intro: '从一首诗开始，读懂山川与生活。', type: 'YEARLY', price: 99 }
const post = { id: 'qa-post', content: '今天读到“学而时习之”，你会怎样把书中的一句话用在生活里？欢迎分享你的阅读笔记。', user: { id: 'qa-writer', nickname: '读书的阿宁' }, createdAt: '2026-09-22T10:00:00Z', likeCount: 8, commentCount: 3, images: [] }
let failMine = false
const results = []
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
console.log('本地测试浏览器已启动')
let diagnosticPage
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  await context.addInitScript(() => {
    if (!sessionStorage.getItem('qa-fixture-installed')) {
      localStorage.setItem('auth_token', JSON.stringify({ type: 'string', data: 'local-fixture-only' }))
      sessionStorage.setItem('qa-fixture-installed', 'yes')
    }
  })
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.includes('/api/v1/')) {
      const path = url.pathname.split('/api/v1')[1]
      let data = []
      let status = 200
      if (path === '/circles') data = [other]
      if (path === '/circles/my') { data = [{ circle, role: 'MEMBER' }]; if (failMine) status = 503 }
      if (path === '/circles/my-stats') data = { joinedCount: 1, postCount: 2, likeReceived: 8 }
      if (path === '/circles/qa-circle') data = circle
      if (path.endsWith('/posts')) data = url.searchParams.get('isEssence') === 'true' ? { posts: [], total: 0 } : { posts: [post], total: 1 }
      if (path.endsWith('/join/status')) data = { joined: true, role: 'MEMBER' }
      if (path === '/courses') data = [{ id: 'qa-course', title: '从论语开始读经典', price: 29, user: { nickname: '共读领读人' } }]
      if (path === '/shop/products') data = [{ id: 'qa-product', title: '阅读笔记本', price: 19 }]
      if (path.includes('/user/profile') || path === '/users/me') data = { id: 'qa-member', nickname: '本地测试成员' }
      return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ code: status, data, message: status === 200 ? 'ok' : '测试网络失败' }) })
    }
    if (url.origin === origin || url.protocol === 'data:') return route.continue()
    return route.abort()
  })
  const page = await context.newPage()
  diagnosticPage = page
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(origin + '/h5/pages/circles/index', { waitUntil: 'domcontentloaded' })
  console.log('圈子入口已打开')
  await page.getByText('选择一个圈子，继续交流', { exact: true }).waitFor({ timeout: 60000 })
  await page.screenshot({ path: resolve(out, '01-my-circles-390.png') })
  results.push('登录成员默认进入我的圈子')
  await page.getByRole('tab', { name: '发现圈子', exact: true }).click()
  await page.getByText('山水诗词研习社', { exact: true }).waitFor()
  await page.screenshot({ path: resolve(out, '02-discover-390.png') })
  results.push('发现分区可切换，真实组件展示年费和详情入口')
  await page.getByRole('tab', { name: '圈内动态', exact: true }).click()
  assert.equal(await page.locator('.discover-list').isVisible(), false)
  await page.getByText(post.content, { exact: true }).waitFor()
  results.push('圈内动态切换后展示成员内容')
  await page.getByRole('tab', { name: '我的圈子', exact: true }).click()
  await page.locator('.mine-card').first().click()
  await page.getByText('问问圈主助理', { exact: true }).waitFor()
  await page.screenshot({ path: resolve(out, '03-circle-390.png') })
  await page.locator('.mini-entry').filter({ hasText: '课堂' }).click()
  await page.getByRole('dialog', { name: '圈内课程' }).waitFor()
  await page.screenshot({ path: resolve(out, '04-circle-resources-390.png') })
  results.push('课堂展开当前圈子资源抽屉，未跳到全平台首页')
  await page.getByRole('button', { name: '关闭资源列表' }).click()
  await page.getByRole('tab', { name: '精华', exact: true }).click()
  await page.getByText('本圈还没有精华内容', { exact: true }).waitFor()
  await page.getByRole('button', { name: '返回推荐栏目' }).click()
  assert.equal(await page.getByRole('tab', { name: '推荐', exact: true }).getAttribute('aria-selected'), 'true')
  results.push('空栏目可一键回推荐')
  for (const width of [320, 768]) {
    await page.setViewportSize({ width, height: 844 })
    await page.screenshot({ path: resolve(out, `05-circle-${width}.png`) })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    assert.equal(overflow, false, `${width}px 页面横向溢出`)
    results.push(`${width}px 详情页面无横向溢出`)
  }
  await page.goto(origin + '/h5/pages/circles/index?hub=activity')
  await page.getByRole('tab', { name: '圈内动态', exact: true }).waitFor()
  assert.equal(await page.getByRole('tab', { name: '圈内动态', exact: true }).getAttribute('aria-selected'), 'true')
  results.push('快捷入口可直接进入真实圈内动态分区')
  failMine = true
  await page.goto(origin + '/h5/pages/circles/index')
  await page.reload()
  await page.getByText('暂时无法加载你的圈子', { exact: true }).waitFor()
  results.push('成员列表失败显示错误与重试，不冒充尚未加入')
  failMine = false
  await page.getByRole('button', { name: '重新加载', exact: true }).click()
  await page.locator('.mine-card').first().waitFor()
  results.push('错误态可原位重试恢复')
  await page.evaluate(() => localStorage.removeItem('auth_token'))
  await page.reload()
  await page.getByRole('tab', { name: '发现圈子', exact: true }).waitFor()
  assert.equal(await page.getByRole('tab', { name: '发现圈子', exact: true }).getAttribute('aria-selected'), 'true')
  await page.getByRole('tab', { name: '我的圈子', exact: true }).click()
  await page.getByText('登录后，继续你的圈内交流', { exact: true }).waitFor()
  results.push('游客默认发现，访问我的圈子有登录说明')
  assert.deepEqual(errors, [], '浏览器运行时异常')
  await writeFile(resolve(out, 'results.json'), JSON.stringify({ environment: '本地 H5 + 全量请求拦截，不是真机或线上验收', results, errors }, null, 2))
  console.log(JSON.stringify({ passed: results.length, results, errors }, null, 2))
} catch (error) {
  if (diagnosticPage) {
    await diagnosticPage.screenshot({ path: resolve(out, 'failure.png') })
    console.log((await diagnosticPage.locator('body').innerText()).slice(0, 3000))
  }
  throw error
} finally {
  await browser.close()
}
