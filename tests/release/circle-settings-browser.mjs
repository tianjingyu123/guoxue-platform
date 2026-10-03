/** 设置编辑隔离验收；所有业务接口均为夹具。 */
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
const { chromium } = createRequire(import.meta.url)(resolve(process.env.QA_NODE_MODULES, 'playwright'))
const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:5197', out = resolve('artifacts/circle-settings-20260922')
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
let overviewReads = 0, failOverview = false, failSave = true, failAnnouncement = true, saves = 0
const results = [], errors = []
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await context.addInitScript(() => {
    localStorage.setItem('auth_token', JSON.stringify({ type: 'string', data: 'local-fixture-only' }))
    localStorage.setItem('userInfo', JSON.stringify({ type: 'object', data: { id: 'qa-owner' } }))
  })
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (!url.pathname.includes('/api/v1/')) return url.origin === origin ? route.continue() : route.abort()
    const path = url.pathname.split('/api/v1')[1]
    let data = [], status = 200
    if (path === '/circles/qa-circle') {
      if (route.request().method() === 'GET') {
        overviewReads++
        data = { id: 'qa-circle', name: '古籍共读社', intro: '每日分享读书心得', type: 'FREE', tags: [], memberCount: 1 }
        if (failOverview) status = 503
      } else {
        saves++
        await new Promise(r => setTimeout(r, 200))
        if (failSave) status = 503
      }
    }
    if (path.endsWith('/announcement')) { data = { content: '欢迎一起共读' }; if (failAnnouncement) status = 503 }
    return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ code: status, data, message: status === 200 ? 'ok' : '模拟失败' }) })
  })
  const page = await context.newPage()
  page.on('pageerror', e => errors.push(e.message))
  const open = () => page.goto(`${origin}/h5/pkg-circle/circles/manage?id=qa-circle&tab=settings`)
  await open()
  const name = page.locator('.field-input input')
  await name.waitFor()
  assert.equal(overviewReads, 1)
  await name.fill('尚未保存的新圈名')
  await page.getByRole('tab', { name: '成员', exact: true }).click()
  await page.getByRole('tab', { name: '设置', exact: true }).click()
  assert.equal(await name.inputValue(), '尚未保存的新圈名')
  assert.equal(overviewReads, 1)
  results.push('设置初次只读取一次，切换分区保留未保存输入')
  await page.getByRole('button', { name: '返回管理概览' }).click()
  await page.getByText('继续编辑', { exact: true }).click()
  assert.equal(await name.inputValue(), '尚未保存的新圈名')
  results.push('未保存返回提示，继续编辑保留内容')
  await page.getByRole('button', { name: '重试读取公告' }).waitFor({ state: 'attached' })
  failAnnouncement = false
  await page.getByRole('button', { name: '重试读取公告' }).click()
  await page.getByText('「欢迎一起共读」', { exact: false }).waitFor()
  assert.equal(await name.inputValue(), '尚未保存的新圈名')
  results.push('公告失败独立恢复，不覆盖设置输入')
  await page.getByRole('button', { name: '保存圈子设置' }).dblclick()
  await page.getByText('模拟失败', { exact: true }).waitFor()
  assert.equal(saves, 1)
  assert.equal(await name.inputValue(), '尚未保存的新圈名')
  results.push('保存失败不丢输入，连续点击只发一次请求')
  failSave = false
  await page.getByRole('button', { name: '保存圈子设置' }).click()
  await page.getByText('当前设置没有待保存修改', { exact: true }).waitFor()
  assert.equal(saves, 2)
  await page.screenshot({ path: resolve(out, 'settings.png') })
  results.push('保存重试成功更新未保存状态')
  failOverview = true
  await open()
  await page.getByText('设置加载失败', { exact: true }).waitFor()
  assert.equal(await name.count(), 0)
  results.push('设置读取失败不显示可提交的空表单')
  assert.deepEqual(errors, [])
  await writeFile(resolve(out, 'results.json'), JSON.stringify({ results, errors, simulatedSaves: saves }, null, 2))
  console.log(JSON.stringify({ passed: results.length, results, errors }, null, 2))
} finally { await browser.close() }
