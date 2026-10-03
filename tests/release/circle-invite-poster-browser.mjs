/** 免费圈邀请海报必须带有效邀请码；无效码明确报错，普通圈子海报保持介绍链接。 */
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { mkdir } from 'node:fs/promises'
import assert from 'node:assert/strict'

const { chromium } = createRequire(import.meta.url)(resolve(process.env.QA_NODE_MODULES, 'playwright'))
const origin = process.env.QA_ORIGIN
if (!origin) throw new Error('缺少隔离 H5 地址')
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const errors = []
let codeUsed = false
const writes = []
const telemetry = []
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['clipboard-read', 'clipboard-write'] })
  await context.addInitScript(() => localStorage.setItem('auth_token', JSON.stringify({ type: 'string', data: 'local-fixture-only' })))
  const routeFixture = async route => {
    const url = new URL(route.request().url())
    if (url.pathname.includes('/api/v1/')) {
      const path = url.pathname.split('/api/v1')[1]
      if (route.request().method() !== 'GET') {
        const target = `${route.request().method()} ${url.pathname}`
        if (path === '/track/batch') telemetry.push(target)
        else writes.push(target)
      }
      let data = {}
      if (path === '/system/public/brand-config') {
        await new Promise(resolve => setTimeout(resolve, 800))
        data = { h5Url: 'https://share.example.test/h5/' }
      }
      else if (path === '/circles/c1') data = { id: 'c1', name: '共读经典', description: '以古籍共读为中心，讨论真实读书收获。', category: '经典', type: 'FREE', status: 'ACTIVE', memberCount: 12, postCount: 3, owner: { id: 'owner', nickname: '领读人' } }
      else if (path === '/circles/c1/invite-codes') data = [{ id: 'code-1', code: 'JOIN123', maxUses: 1, useCount: codeUsed ? 1 : 0, createdAt: '2026-09-23T00:00:00Z' }]
      else if (path === '/circles/c1/invitation-stats') data = { total: 0, records: [] }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, data, message: 'ok' }) })
    }
    if (url.origin === origin || url.protocol === 'data:') return route.continue()
    return route.abort()
  }
  await context.route('**/*', routeFixture)
  const page = await context.newPage()
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${origin}/h5/pkg-circle/circles/invite-codes?id=c1`)
  await page.getByText('JOIN123').waitFor()
  await page.getByText('生成海报', { exact: true }).click()
  await page.waitForURL(/share-poster\/index\?type=circle&targetId=c1&code=JOIN123/)
  await page.getByText('扫码入圈').waitFor()
  await page.waitForTimeout(500)
  const artifactDir = resolve('artifacts/circle-invite-poster-20260923')
  await mkdir(artifactDir, { recursive: true })
  await page.screenshot({ path: resolve(artifactDir, 'invite-poster-h5.png'), fullPage: true })
  const savedPoster = page.waitForEvent('download')
  await page.getByText('保存到相册').click()
  await (await savedPoster).saveAs(resolve(artifactDir, 'invite-poster-export.png'))
  await page.getByText('立即分享').click()
  await page.getByRole('button', { name: '复制分享链接' }).click()
  const invited = await page.evaluate(() => navigator.clipboard.readText())
  assert.match(invited, /\/pkg-circle\/circles\/preview\?id=c1&code=JOIN123/)
  const invitedUrl = new URL(invited)
  assert.equal(invitedUrl.host, 'share.example.test')
  const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await guestContext.route('**/*', routeFixture)
  const landing = await guestContext.newPage()
  await landing.goto(`${origin}${invitedUrl.pathname}${invitedUrl.search}`)
  await landing.getByText('共读经典', { exact: true }).first().waitFor()
  await landing.getByText('已填写邀请码 JOIN123 · 点击修改').waitFor()
  await landing.getByText('免费加入', { exact: true }).waitFor()
  await guestContext.close()

  // 冷启动直达海报：品牌入口故意延迟，二维码与复制链接不能抢先采用编译期旧地址。
  const coldContext = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['clipboard-read', 'clipboard-write'] })
  await coldContext.addInitScript(() => localStorage.setItem('auth_token', JSON.stringify({ type: 'string', data: 'local-fixture-only' })))
  await coldContext.route('**/*', routeFixture)
  const coldPage = await coldContext.newPage()
  await coldPage.goto(`${origin}/h5/pkg-circle/common/share-poster/index?type=circle&targetId=c1&code=JOIN123`)
  await coldPage.getByText('扫码入圈').waitFor()
  await coldPage.getByText('立即分享').click()
  await coldPage.getByRole('button', { name: '复制分享链接' }).click()
  assert.equal(new URL(await coldPage.evaluate(() => navigator.clipboard.readText())).host, 'share.example.test')
  await coldContext.close()

  codeUsed = true
  await page.goto(`${origin}/h5/pkg-circle/common/share-poster/index?type=circle&targetId=c1&code=JOIN123`)
  await page.locator('.poster-error__detail').getByText('邀请码已失效，请返回邀请页重新生成').waitFor()
  await page.getByText('重试', { exact: true }).waitFor()
  assert.equal(await page.getByText('立即分享').count(), 0)

  await page.goto(`${origin}/h5/pkg-circle/common/share-poster/index?type=circle&targetId=c1`)
  await page.getByText('扫码查看').waitFor()
  await page.getByText('立即分享').click()
  await page.getByRole('button', { name: '复制分享链接' }).click()
  const generic = await page.evaluate(() => navigator.clipboard.readText())
  assert.match(generic, /\/pkg-circle\/circles\/detail\?id=c1/)
  assert.equal(generic.includes('code='), false)
  assert.deepEqual(writes, [])
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ passed: 17, writes, telemetry: telemetry.length, errors, inviteHost: invitedUrl.host, screenshot: resolve(artifactDir, 'invite-poster-h5.png'), export: resolve(artifactDir, 'invite-poster-export.png') }))
} finally {
  await browser.close()
}
