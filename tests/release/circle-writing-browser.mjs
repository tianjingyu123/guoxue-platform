/** 全量接口拦截的圈子写作/阅读验收，不读取线上用户或发布真实内容。 */
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
const require = createRequire(import.meta.url)
const { chromium } = require(resolve(process.env.QA_NODE_MODULES, 'playwright'))
const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:5197'
const out = resolve('artifacts/circle-writing-20260922')
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
let page, writes = 0, failPublish = true
const results = [], errors = []
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await context.addInitScript(() => {
    if (!localStorage.getItem('userInfo')) localStorage.setItem('userInfo', JSON.stringify({ type: 'object', data: { id: 'qa-writer', nickname: '测试读者' } }))
    localStorage.setItem('auth_token', JSON.stringify({ type: 'string', data: 'local-fixture-only' }))
  })
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.includes('/api/v1/')) {
      const path = url.pathname.split('/api/v1')[1]
      let data = [], status = 200
      if (path === '/circles/my') data = ['qa-a', 'qa-b'].map(id => ({ circle: { id, name: id === 'qa-a' ? '古籍共读社' : '诗词研习社', type: 'FREE', owner: { id: 'owner' } }, role: 'MEMBER' }))
      if (path.endsWith('/join/status')) data = { joined: true, role: 'MEMBER' }
      if (/\/circles\/qa-[ab]$/.test(path)) data = { id: path.split('/').pop(), name: '古籍共读社', type: 'FREE', owner: { id: 'owner' } }
      if (path.endsWith('/posts') && route.request().method() === 'POST') {
        writes++
        await new Promise(r => setTimeout(r, 400))
        if (failPublish) status = 503
        else data = { id: 'qa-post' }
      } else if (path.endsWith('/posts')) data = { posts: [], total: 0 }
      if (path.endsWith('/posts/qa-post')) data = { id: 'qa-post', circleId: 'qa-a', content: '读经典不必急于寻找答案。\n\n从今天的一句感受开始，和同好分享你的发现。', user: { id: 'qa-author', nickname: '领读人' }, createdAt: '2026-09-22T10:00:00Z' }
      if (path === '/comment/count') data = 0
      if (path === '/comment' && route.request().method() === 'POST') status = 503
      return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ code: status, data, message: status === 200 ? 'ok' : '模拟提交失败' }) })
    }
    if (url.origin === origin || url.protocol === 'data:') return route.continue()
    return route.abort()
  })
  page = await context.newPage()
  page.on('pageerror', e => errors.push(e.message))
  const editor = id => page.goto(`${origin}/h5/pkg-circle/circles/editor?circleId=${id}`)
  await editor('qa-a')
  const content = page.locator('.content-input textarea')
  await content.fill('今天读到的一句话，让我重新理解了学习。'.repeat(12))
  await page.getByText('草稿已保存到本机', { exact: true }).waitFor()
  assert.ok((await content.inputValue()).length > 140)
  await page.screenshot({ path: resolve(out, '01-writing.png') })
  await page.getByRole('button', { name: '保存草稿', exact: true }).click()
  assert.equal(writes, 0)
  results.push('超过140字的正文完整保留，动态草稿只保存本机、不发出发布请求')
  await editor('qa-b')
  await content.waitFor()
  assert.equal(await content.inputValue(), '')
  assert.equal(await page.getByText('恢复未完成的内容', { exact: true }).count(), 0)
  results.push('另一圈子不恢复原圈草稿')
  await editor('qa-a')
  await page.getByText('恢复未完成的内容', { exact: true }).waitFor()
  await page.getByText('恢复', { exact: true }).click()
  await page.waitForFunction(() => document.querySelector('.content-input textarea')?.value.length > 140)
  assert.ok((await content.inputValue()).length > 140)
  await page.getByRole('button', { name: '发布内容', exact: true }).dblclick()
  await page.getByText('模拟提交失败', { exact: true }).waitFor()
  assert.equal(writes, 1)
  assert.ok((await content.inputValue()).length > 140)
  results.push('恢复完整草稿，连续发布只提交一次；失败保留输入')
  failPublish = false
  await page.getByRole('button', { name: '发布内容', exact: true }).click()
  await page.waitForURL('**/circles/detail?id=qa-a')
  assert.equal(writes, 2)
  const saved = await page.evaluate(() => localStorage.getItem('draft:circle-editor:qa-writer:qa-a:new'))
  assert.equal(saved, null)
  results.push('成功发布清理本机草稿，独立打开编辑器也能直接回到原圈子')
  await editor('qa-a')
  await content.fill('账号一的未完成文字')
  await page.getByText('草稿已保存到本机', { exact: true }).waitFor()
  await page.evaluate(() => localStorage.setItem('userInfo', JSON.stringify({ type: 'object', data: { id: 'qa-other' } })))
  await editor('qa-a')
  await content.waitFor()
  assert.equal(await content.inputValue(), '')
  assert.equal(await page.getByText('恢复未完成的内容', { exact: true }).count(), 0)
  results.push('切换账号不读取另一账号草稿')
  await page.goto(`${origin}/h5/pkg-circle/circles/post?circleId=qa-a&id=qa-post`)
  await page.getByRole('button', { name: '写评论', exact: true }).waitFor()
  assert.equal(await page.locator('.cib').isVisible(), false)
  await page.screenshot({ path: resolve(out, '02-reading.png') })
  await page.getByRole('button', { name: '写评论', exact: true }).click()
  await page.locator('.cib__field input').fill('暂时收起后还要继续写的评论')
  await page.locator('.cib__dismiss').click()
  assert.equal(await page.locator('.cib').isVisible(), false)
  await page.getByRole('button', { name: '写评论', exact: true }).click()
  assert.equal(await page.locator('.cib__field input').inputValue(), '暂时收起后还要继续写的评论')
  await page.locator('.cib__send').click()
  await page.getByText('模拟提交失败', { exact: true }).waitFor()
  assert.equal(await page.locator('.cib__field input').inputValue(), '暂时收起后还要继续写的评论')
  results.push('阅读无常驻评论条；按需打开、收起重开和失败回填均保留文字')
  for (const width of [320, 768]) {
    await page.setViewportSize({ width, height: 844 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
  }
  assert.deepEqual(errors, [])
  await writeFile(resolve(out, 'results.json'), JSON.stringify({ environment: '本地H5，全部业务请求拦截，不是真机/线上验收', results, errors }, null, 2))
  console.log(JSON.stringify({ passed: results.length, results, errors }, null, 2))
} catch (error) {
  if (page) { await page.screenshot({ path: resolve(out, 'failure.png') }); console.log((await page.locator('body').innerText()).slice(0, 2000)) }
  throw error
} finally { await browser.close() }
