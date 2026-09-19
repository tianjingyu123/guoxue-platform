/**
 * 样例自动化验证（真实 Chromium，手机视口）
 *
 * 只读使用主项目已安装的 puppeteer，不写共享 node_modules、不改锁文件。
 * 用法：node tools/verify.cjs [baseUrl]
 * 默认 http://127.0.0.1:18790/
 *
 * 结论口径：桌面 Chromium 手机视口 ≠ 真机性能结论，只能验证逻辑与链路。
 */
const path = require('path')
const fs = require('fs')

const PUPPETEER = path.join('D:', 'gx-deploy-91', 'node_modules', 'puppeteer')
const puppeteer = require(PUPPETEER)

const BASE = process.argv[2] || 'http://127.0.0.1:18790/'
const OUT = path.join(__dirname, '..', 'evidence')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const results = []
function check(name, pass, detail) {
  results.push({ name, pass: !!pass, detail })
  console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`)
}

/** 本机可用的 Chromium：优先系统 Chrome，其次 puppeteer 缓存里已下载的版本 */
function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    path.join(process.env.USERPROFILE || '', '.cache/puppeteer/chrome/win64-121.0.6167.85/chrome-win64/chrome.exe'),
  ].filter(Boolean)
  for (const p of candidates) if (fs.existsSync(p)) return p
  return undefined
}

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const executablePath = findChrome()
  console.log('浏览器：' + (executablePath || 'puppeteer 内置'))
  const browser = await puppeteer.launch({ headless: 'new', executablePath, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1180, height: 980, deviceScaleFactor: 2 })

  const pageErrors = []
  const requests = []
  page.on('pageerror', (e) => pageErrors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') pageErrors.push('console: ' + m.text()) })
  page.on('request', (r) => requests.push(r.url()))

  const t0 = Date.now()
  await page.goto(BASE, { waitUntil: 'networkidle0' })
  const loadMs = Date.now() - t0
  await page.waitForFunction('window.__giftSample !== undefined', { timeout: 10000 })

  // ── 1. 首屏不加载播放器 ──
  const lottieOnLoad = requests.filter((u) => u.includes('lottie')).length
  check('首屏零动画依赖：未请求 lottie 播放器', lottieOnLoad === 0, `首屏 lottie 请求 ${lottieOnLoad} 次，页面加载 ${loadMs}ms`)
  await page.screenshot({ path: path.join(OUT, '01-baseline.png') })

  // ── 2. L1 轻量 ──
  await page.evaluate(() => {
    const s = window.__giftSample
    for (let i = 0; i < 4; i++) s.receive(s.makeEvent(s.GIFTS[0], { user: '青松客' + i }))
  })
  await sleep(500)
  const lightCount = await page.$$eval('.light', (n) => n.length)
  check('L1 车道有上限：4 连发最多同屏 3 条', lightCount <= 3, `同屏 ${lightCount} 条`)
  await page.screenshot({ path: path.join(OUT, '02-tier1-light.png') })

  // ── 3. L2 连击合并 ──
  await page.evaluate(() => {
    const s = window.__giftSample
    for (let i = 0; i < 6; i++) s.receive(s.makeEvent(s.GIFTS[3], { user: '守拙斋主' }))
  })
  await sleep(400)
  const combo = await page.evaluate(() => {
    const nodes = document.querySelectorAll('.combo')
    return { bars: nodes.length, text: nodes[0] ? nodes[0].querySelector('[data-count]').textContent : '' }
  })
  check('L2 连击合并：6 次同人同礼物只有 1 条横幅', combo.bars === 1, `横幅 ${combo.bars} 条，计数 ${combo.text}`)
  check('L2 数量累加正确', combo.text === '×6', `显示 ${combo.text}`)
  await page.screenshot({ path: path.join(OUT, '03-tier2-combo.png') })

  // ── 4. 去重 ──
  const dedupBefore = await page.evaluate(() => window.__giftSample.stage.snapshot().deduped)
  await page.evaluate(() => {
    const s = window.__giftSample
    const rid = 'rec-fixed-001'
    for (let i = 0; i < 8; i++) s.receive(s.makeEvent(s.GIFTS[4], { user: '洛水人家', recordId: rid }))
  })
  await sleep(200)
  const dedupAfter = await page.evaluate(() => window.__giftSample.stage.snapshot().deduped)
  check('重复广播去重：同 recordId ×8 只认 1 次', dedupAfter - dedupBefore === 7, `本轮去重 ${dedupAfter - dedupBefore} 次`)

  // ── 5. L3 播放 + 按需加载 ──
  await page.evaluate(() => { window.__giftSample.stage.reset() })
  await sleep(300)
  const tL3 = Date.now()
  await page.evaluate(() => {
    const s = window.__giftSample
    s.receive(s.makeEvent(s.GIFTS[7], { user: '半山问道' }))
  })
  await page.waitForSelector('#premiumStage svg', { timeout: 8000 })
  const firstFrameMs = Date.now() - tL3
  const loader = await page.evaluate(() => window.__giftSample.loaderStats)
  check('L3 按需加载播放器并出画', true, `首帧 ${firstFrameMs}ms（含播放器加载 ${loader.loadMs}ms）`)
  await sleep(1500) // 取星耀定星后的峰值帧
  await page.screenshot({ path: path.join(OUT, '04-tier3-premium.png') })

  // 关键操作不被遮挡：特效播放中点击关闭与举报
  const hitTest = await page.evaluate(() => {
    const probe = (sel) => {
      const el = document.querySelector(sel)
      const r = el.getBoundingClientRect()
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      return el.contains(top) || top === el
    }
    return { close: probe('#btnClose'), report: probe('#btnReport'), gift: probe('#btnGift') }
  })
  check('L3 播放中关键操作可点：退出 / 举报 / 送礼',
    hitTest.close && hitTest.report && hitTest.gift,
    JSON.stringify(hitTest))

  // ── 6. L3 独占与排队 ──
  await page.evaluate(() => {
    const s = window.__giftSample
    for (let i = 0; i < 4; i++) s.receive(s.makeEvent(s.GIFTS[6], { user: 'Q' + i }))
  })
  await sleep(300)
  const stages = await page.$$eval('#premiumStage svg', (n) => n.length)
  const queued = await page.evaluate(() => window.__giftSample.stage.snapshot().queued)
  check('L3 独占：同时只播 1 个，其余排队', stages === 1 && queued >= 3, `在播 ${stages} 个，排队 ${queued} 个`)

  // ── 7. 跳过 ──
  const skipped = await page.evaluate(() => window.__giftSample.stage.skipPremium())
  await sleep(200)
  check('L3 可跳过', skipped === true)

  // ── 8a. 素材自然播完时的实际时长 ──
  await page.evaluate(() => { window.__giftSample.stage.reset() })
  await sleep(300)
  const natural = await page.evaluate(() => new Promise((resolve) => {
    const s = window.__giftSample
    const orig = s.stage.onMetric
    s.stage.onMetric = (m) => { orig(m); if (m.type === 'premium-end') resolve({ ms: m.ms, reason: m.reason }) }
    s.receive(s.makeEvent(s.GIFTS[7], { user: '时长测试' }))
  }))
  check('L3 自然播完并自行收尾', natural.reason === 'complete' && natural.ms <= 5200,
    `紫微星耀 ${natural.ms}ms，收尾原因 ${natural.reason}`)

  // ── 8b. 硬上限：素材播不完也必须到点强制收尾 ──
  await page.evaluate(() => { window.__giftSample.stage.reset() })
  await sleep(300)
  const capped = await page.evaluate(() => new Promise((resolve) => {
    const s = window.__giftSample
    const restore = s.stage.cfg.premiumMaxMs
    s.stage.cfg.premiumMaxMs = 1200 // 临时收紧，验证上限确实会触发
    const orig = s.stage.onMetric
    s.stage.onMetric = (m) => {
      orig(m)
      if (m.type === 'premium-end') { s.stage.cfg.premiumMaxMs = restore; s.stage.onMetric = orig; resolve({ ms: m.ms, reason: m.reason }) }
    }
    s.receive(s.makeEvent(s.GIFTS[7], { user: '上限测试' }))
  }))
  check('L3 硬时长上限会强制收尾', capped.reason === 'timeout' && capped.ms < 1600,
    `上限设 1200ms 时 ${capped.ms}ms 触发 ${capped.reason}`)

  // ── 9. 素材失败降级 ──
  await page.evaluate(() => { window.__giftSample.stage.reset() })
  await sleep(300)
  await page.evaluate(() => {
    const s = window.__giftSample
    const broken = { ...s.GIFTS[6], asset: '../assets/__missing__.json' }
    s.receive(s.makeEvent(broken, { user: '降级测试' }))
  })
  await sleep(900)
  const fb = await page.evaluate(() => {
    const el = document.getElementById('premiumFallback')
    return { shown: !el.hidden, text: el.textContent.trim() }
  })
  check('素材加载失败降级为文字条', fb.shown, fb.text.slice(0, 40))
  await page.screenshot({ path: path.join(OUT, '05-fallback.png') })

  // ── 10. 减少动态效果 ──
  await sleep(1200)
  await page.evaluate(() => { window.__giftSample.stage.setReducedMotion(true) })
  await page.evaluate(() => {
    const s = window.__giftSample
    s.receive(s.makeEvent(s.GIFTS[7], { user: '静态模式' }))
  })
  await sleep(400)
  const reduced = await page.evaluate(() => ({
    svg: document.querySelectorAll('#premiumStage svg').length,
    fallback: !document.getElementById('premiumFallback').hidden,
  }))
  check('减少动态效果：不加载素材、直接文字版', reduced.svg === 0 && reduced.fallback, JSON.stringify(reduced))
  await page.evaluate(() => { window.__giftSample.stage.setReducedMotion(false) })

  // ── 11. 混合洪峰：队列上限与合并摘要 ──
  await page.evaluate(() => { window.__giftSample.stage.reset() })
  await sleep(1400)
  await page.evaluate(() => {
    const s = window.__giftSample
    for (let i = 0; i < 120; i++) {
      const g = s.GIFTS[i % s.GIFTS.length]
      s.receive(s.makeEvent(g, { user: 'U' + (i % 9) }))
    }
  })
  await sleep(900)
  const flood = await page.evaluate(() => {
    const s = window.__giftSample.stage.snapshot()
    return {
      ...s,
      lightNodes: document.querySelectorAll('.light').length,
      comboNodes: document.querySelectorAll('.combo').length,
      overflowShown: !document.getElementById('overflowChip').hidden,
    }
  })
  check('洪峰 120 事件：队列不超上限', flood.queued <= 20, `队列 ${flood.queued}，丢弃合并 ${flood.droppedByLimit}`)
  check('洪峰：同屏节点不堆积', flood.lightNodes <= 3 && flood.comboNodes <= 3,
    `L1 节点 ${flood.lightNodes}，L2 节点 ${flood.comboNodes}`)
  check('洪峰：溢出显示合并摘要', flood.overflowShown, `摘要 ${flood.overflowShown ? '已显示' : '未显示'}`)
  await page.screenshot({ path: path.join(OUT, '06-flood.png') })

  // ── 12. 后台挂起与恢复 ──
  await page.evaluate(() => { window.__giftSample.stage.reset() })
  await sleep(1400)
  const bg = await page.evaluate(async () => {
    const s = window.__giftSample
    s.receive(s.makeEvent(s.GIFTS[7], { user: '后台测试' }))
    await new Promise((r) => setTimeout(r, 500))
    s.stage.pause()
    const pausedFrame = document.querySelector('#premiumStage svg') ? 'rendered' : 'none'
    // 模拟隐藏 12 秒：直接把隐藏起点往前推，避免真的等 12 秒
    s.stage.hiddenSince = Date.now() - 12000
    const queuedBefore = s.stage.snapshot().queued
    s.receive(s.makeEvent(s.GIFTS[6], { user: '后台排队' }))
    s.stage.resume()
    return { pausedFrame, queuedBefore, after: s.stage.snapshot() }
  })
  check('后台挂起后恢复：过期大礼物不补播，在播的被收掉',
    bg.after.premiumActive === false && bg.after.queued === 0,
    `恢复后 L3 占用=${bg.after.premiumActive}，队列=${bg.after.queued}`)

  // ── 13. 资源释放 ──
  const destroyed = await page.evaluate(() => {
    const s = window.__giftSample
    for (let i = 0; i < 20; i++) s.receive(s.makeEvent(s.GIFTS[i % 8], { user: 'D' + i }))
    s.stage.destroy()
    return {
      snap: s.stage.snapshot(),
      domLight: document.querySelectorAll('.light').length,
      domCombo: document.querySelectorAll('.combo').length,
      domSvg: document.querySelectorAll('#premiumStage svg').length,
    }
  })
  check('destroy 释放：定时器归零、队列清空、DOM 与播放器实例清干净',
    destroyed.snap.timers === 0 && destroyed.snap.queued === 0 &&
    destroyed.domLight === 0 && destroyed.domCombo === 0 && destroyed.domSvg === 0,
    JSON.stringify({ timers: destroyed.snap.timers, queued: destroyed.snap.queued, dom: [destroyed.domLight, destroyed.domCombo, destroyed.domSvg] }))

  // ── 14. 无页面异常（第 9 项故意请求不存在的素材，其 404 是被测行为本身，不计入）──
  const unexpected = pageErrors.filter((e) => !/404|Failed to load resource/.test(e))
  check('全程无页面异常', unexpected.length === 0,
    unexpected.slice(0, 3).join(' | ') || `0 条（另有 ${pageErrors.length} 条为素材失败用例的预期 404）`)

  const passed = results.filter((r) => r.pass).length
  const summary = {
    at: new Date().toISOString(),
    env: { base: BASE, viewport: '1180×980 @2x，直播页内 375×812', chromium: await browser.version() },
    pageLoadMs: loadMs,
    lottie: loader,
    l3FirstFrameMs: firstFrameMs,
    passed,
    total: results.length,
    results,
    pageErrors,
    note: '桌面 Chromium 结果，只验证逻辑与链路，不能当真机性能结论。',
  }
  fs.writeFileSync(path.join(OUT, 'verification.json'), JSON.stringify(summary, null, 2))
  console.log(`\n${passed}/${results.length} 通过，证据写入 evidence/`)

  await browser.close()
  process.exit(passed === results.length ? 0 : 1)
})().catch((e) => {
  console.error(e)
  process.exit(2)
})
