/** 游客打开圈子介绍时，帖子预览失败不得伪装空圈或遮住入圈入口。 */
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { mkdir } from 'node:fs/promises'
import assert from 'node:assert/strict'

const { chromium } = createRequire(import.meta.url)(resolve(process.env.QA_NODE_MODULES, 'playwright'))
const origin = process.env.QA_ORIGIN
if (!origin) throw new Error('缺少隔离 H5 地址')
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
let previewAttempts = 0
const writes = []
const errors = []
const ok = data => ({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, data, message: 'ok' }) })
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (!url.pathname.includes('/api/v1/')) return url.origin === origin ? route.continue() : route.abort()
    if (route.request().method() !== 'GET') writes.push(`${route.request().method()} ${url.pathname}`)
    const path = url.pathname.split('/api/v1')[1]
    if (path === '/circles/c1') return route.fulfill(ok({ id: 'c1', name: '共读经典', intro: '一起交流古籍', type: 'FREE', memberCount: 12, postCount: 1, owner: { id: 'owner', nickname: '领读人' } }))
    if (path === '/circles/c1/posts') {
      previewAttempts++
      if (previewAttempts === 1) {
        await new Promise(resolve => setTimeout(resolve, 1200))
        return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ code: 503, message: '预览暂不可用' }) })
      }
      return route.fulfill(ok({ posts: [{ id: 'p1', content: '一起读史记', user: { id: 'u1', nickname: '圈友' }, isEssence: true }], total: 1 }))
    }
    if (path === '/circles/c1/join/status') {
      await new Promise(resolve => setTimeout(resolve, 1200))
      return route.fulfill(ok({ joined: false }))
    }
    return route.fulfill(ok([]))
  })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${origin}/h5/pkg-circle/circles/preview?id=c1`)
  await page.getByText('共读经典').first().waitFor()
  await page.getByText('正在读取圈内内容…').waitFor()
  await page.getByRole('button', { name: '免费加入' }).waitFor()
  await page.getByText('圈内内容暂时无法预览，仍可了解圈子与加入方式。').waitFor()
  await page.getByRole('button', { name: '免费加入' }).waitFor()
  assert.equal(await page.getByText('加载失败，请重试').count(), 0)
  await mkdir(resolve('artifacts/circle-preview-partial-failure-20260923'), { recursive: true })
  await page.screenshot({ path: resolve('artifacts/circle-preview-partial-failure-20260923/preview-390.png'), fullPage: true })
  await page.getByRole('button', { name: '重试加载圈内内容' }).click()
  await page.getByText('一起读史记').waitFor()
  assert.equal(await page.getByText('圈内内容暂时无法预览，仍可了解圈子与加入方式。').count(), 0)
  assert.equal(previewAttempts, 2)
  await page.evaluate(() => localStorage.setItem('auth_token', JSON.stringify({ type: 'string', data: 'local-fixture-only' })))
  await page.goto(`${origin}/h5/pkg-circle/circles/preview?id=c1`)
  const checking = page.getByRole('button', { name: '正在确认成员状态…' })
  await checking.waitFor()
  assert.equal(await checking.getAttribute('aria-disabled'), 'true')
  await page.getByRole('button', { name: '免费加入' }).waitFor()
  assert.deepEqual(writes, [])
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ passed: 9, previewAttempts, writes, errors }))
} finally {
  await browser.close()
}
