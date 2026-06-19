/**
 * 保真比对基础设施
 * 对 route-map.json 中每一对 (原型路由, uni-app H5 路由) 在 514×1111 视口下截图，
 * 用 pixelmatch 生成像素 diff，输出：
 *   - output/<slug>__proto.png / __vue.png / __diff.png
 *   - output/report.json  (结构化结果，按差异比例排序)
 *   - output/report.html  (并排可视化报告)
 *
 * 用法（在项目根目录运行，需先启动两端 dev 服务）：
 *   node vue3/compare/capture-and-diff.mjs                # 跑全部
 *   node vue3/compare/capture-and-diff.mjs --owner=B      # 只跑 B 的待审页
 *   node vue3/compare/capture-and-diff.mjs --status=review
 *   node vue3/compare/capture-and-diff.mjs --filter=circles
 */
import { chromium } from 'playwright'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, 'output')
const map = JSON.parse(fs.readFileSync(path.join(__dirname, 'route-map.json'), 'utf8'))
const { protoBase, vueBase } = map._meta
const viewport = { ...map._meta.viewport }

// ---- 命令行过滤 ----
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=')
    return [k, v ?? true]
  }),
)
let pairs = map.pairs
if (args.owner) pairs = pairs.filter((p) => p.owner === args.owner)
if (args.status) pairs = pairs.filter((p) => p.status === args.status)
if (args.filter) pairs = pairs.filter((p) => (p.proto + p.vue).includes(args.filter))
// 视口覆盖：--width / --height（uni-app rpx 按 375 标定，原型固定 px，375 宽下两端尺寸一致）
if (args.width) viewport.width = Number(args.width)
if (args.height) viewport.height = Number(args.height)

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

const slug = (p) => p.vue.replace(/^\/#\//, '').replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '')

const DIFF_THRESHOLD = 0.1 // pixelmatch 每像素颜色容差（0-1，越小越严格）
const PASS_RATIO = 0.005 // 差异像素占比 < 0.5% 视为通过（仅余字体次像素差）

// 注入页面：禁用动画/过渡、隐藏已知动态浮层，确保两端状态一致后再截图
const STABILIZE_CSS = `
  *,*::before,*::after{
    animation-duration:0s!important;animation-delay:0s!important;
    transition-duration:0s!important;transition-delay:0s!important;
    animation-iteration-count:1!important;caret-color:transparent!important;
  }
  [class*="float-tip"],[class*="floatTip"],[class*="daily-tip"],[class*="dailyTip"],
  [class*="toast"],[class*="Toast"],
  [class*="skeleton"] [class*="shimmer"],[class*="skeleton"]::after{
    visibility:hidden!important;animation:none!important;
  }
  /* 每日小语浮层（一次性文化浮层）：vue 用 .verse-overlay；原型用 z-[55] 固定浮层。两端统一隐藏，避免显隐时序污染 diff */
  .verse-overlay, [class~="z-[55]"]{ display:none!important; }
  /* 图片中和：原型 mock 图在 dev 下回退 placeholder、vue 显示真实图，属资源差异非结构问题。
     真实照片(封面/头像)统一 visibility:hidden（保留盒模型尺寸，露出相同容器背景）。
     但图标必须保留：原型图标是内联 SVG、vue 图标是 <image class="app-icon">，
     若一并隐藏会让两端图标不对称(vue 空白/原型有图)，制造全页虚假 diff。 */
  img:not(.app-icon), image:not(.app-icon), uni-image:not(.app-icon){ visibility:hidden!important; }
  .app-icon, .app-icon img, uni-image.app-icon img{ visibility:visible!important; }
`

// 截图前的稳定化：滚动归顶、注入禁动画样式、等字体与图片就绪
async function stabilizeAndShoot(page, file) {
  await page.addStyleTag({ content: STABILIZE_CSS }).catch(() => {})
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {})
  // 先逐段滚到底再回顶，触发 IntersectionObserver 懒加载图片（两端图片状态一致）
  await page
    .evaluate(async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
      const h = document.body.scrollHeight
      for (let y = 0; y <= h; y += Math.round(window.innerHeight * 0.8)) {
        window.scrollTo(0, y)
        await sleep(120)
      }
      window.scrollTo(0, 0)
      await sleep(200)
    })
    .catch(() => {})
  await page
    .evaluate(async () => {
      window.scrollTo(0, 0)
      const imgs = Array.from(document.images)
      await Promise.all(
        imgs.map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise((res) => {
                img.onload = img.onerror = res
                setTimeout(res, 3000)
              }),
        ),
      )
    })
    .catch(() => {})
  await page.waitForTimeout(600)
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width: viewport.width, height: viewport.height } })
}

// 原型端：普通 goto 导航
async function shootProto(page, url, file) {
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
  } catch {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
  }
  await stabilizeAndShoot(page, file)
}

// uni-app H5 端：必须用 uni.reLaunch 导航，直接 goto hash 会回退首页
// vueHash 形如 "/#/pkg-paipan/bazi/index" -> reLaunch 需要 "/pkg-paipan/bazi/index"
async function shootVue(page, vueHash, file) {
  const uniPath = vueHash.replace(/^\/#/, '')
  const nav = await page
    .evaluate(
      (url) =>
        new Promise((resolve) => {
          if (!window.uni || !window.uni.reLaunch) return resolve('no-uni')
          window.uni.reLaunch({
            url,
            success: () => resolve('ok'),
            fail: (e) => resolve('fail:' + JSON.stringify(e)),
          })
          setTimeout(() => resolve('timeout'), 8000)
        }),
      uniPath,
    )
    .catch((e) => 'err:' + e.message)
  await page.waitForTimeout(1600)
  await stabilizeAndShoot(page, file)
  return nav
}

// 让 vue 页就绪：加载首页并等待 uni 全局可用
async function ensureVueReady(page) {
  await page.goto(vueBase + '/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
  await page.waitForFunction(() => typeof window.uni !== 'undefined', { timeout: 20000 }).catch(() => {})
  await page.waitForTimeout(1000)
}

function diffPair(protoFile, vueFile, diffFile) {
  const a = PNG.sync.read(fs.readFileSync(protoFile))
  const b = PNG.sync.read(fs.readFileSync(vueFile))
  const width = Math.min(a.width, b.width)
  const height = Math.min(a.height, b.height)
  const diff = new PNG({ width, height })
  // 尺寸不一致时裁剪到公共区域比对
  const crop = (img) => {
    if (img.width === width && img.height === height) return img
    const out = new PNG({ width, height })
    PNG.bitblt(img, out, 0, 0, width, height, 0, 0)
    return out
  }
  const ca = crop(a)
  const cb = crop(b)
  const mismatch = pixelmatch(ca.data, cb.data, diff.data, width, height, {
    threshold: DIFF_THRESHOLD,
    includeAA: false,
  })
  fs.writeFileSync(diffFile, PNG.sync.write(diff))
  const total = width * height
  return {
    mismatch,
    total,
    ratio: mismatch / total,
    sizeMismatch: a.width !== b.width || a.height !== b.height,
    protoSize: `${a.width}x${a.height}`,
    vueSize: `${b.width}x${b.height}`,
  }
}

async function main() {
  console.log(`[compare] 待比对 ${pairs.length} 对 | 视口 ${viewport.width}x${viewport.height}`)
  const browser = await chromium.launch()
  const ctxOpts = {
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  }
  // 原型与 vue 各用独立页：vue 页保持 uni app 常驻，用 reLaunch 切路由
  const protoPage = await (await browser.newContext(ctxOpts)).newPage()
  const vuePage = await (await browser.newContext(ctxOpts)).newPage()
  await ensureVueReady(vuePage)
  const results = []

  for (const pair of pairs) {
    const s = slug(pair)
    const protoFile = path.join(OUT, `${s}__proto.png`)
    const vueFile = path.join(OUT, `${s}__vue.png`)
    const diffFile = path.join(OUT, `${s}__diff.png`)
    const rec = { ...pair, slug: s }
    try {
      // 部分原型详情页依赖 query 参数(如 ?id=1)，无参会渲染空白(return null)；route-map 可配 protoQuery 补全
      await shootProto(protoPage, protoBase + pair.proto + (pair.protoQuery || ''), protoFile)
      rec.nav = await shootVue(vuePage, pair.vue, vueFile)
      const d = diffPair(protoFile, vueFile, diffFile)
      Object.assign(rec, d)
      rec.pass = d.ratio < PASS_RATIO
      console.log(
        `[${rec.pass ? 'PASS' : 'FAIL'}] ${(d.ratio * 100).toFixed(2)}% (nav:${rec.nav}) ${pair.proto} -> ${pair.vue}`,
      )
    } catch (e) {
      rec.error = String(e.message || e)
      rec.pass = false
      console.log(`[ERR ] ${pair.proto} -> ${pair.vue} :: ${rec.error}`)
    }
    results.push(rec)
  }

  await browser.close()

  // 按差异比例降序排序（错误/未通过排前面）
  results.sort((a, b) => (b.error ? 2 : b.ratio || 0) - (a.error ? 2 : a.ratio || 0))
  // 过滤运行（单页/分组）只写 partial，避免覆盖全量 report.json
  const isFiltered = args.filter || args.owner || args.status
  const outName = isFiltered ? 'report.partial.json' : 'report.json'
  fs.writeFileSync(path.join(OUT, outName), JSON.stringify(results, null, 2))
  writeHtml(results)

  const failed = results.filter((r) => !r.pass)
  console.log(`\n[compare] 完成：${results.length} 对，${failed.length} 对未通过（差异≥${PASS_RATIO * 100}%）`)
  console.log(`[compare] 报告：vue3/compare/output/report.html`)
}

function writeHtml(results) {
  const rows = results
    .map((r) => {
      const pct = r.error ? 'ERROR' : (r.ratio * 100).toFixed(2) + '%'
      const color = r.error ? '#b00' : r.pass ? '#2a7' : '#c70'
      const imgs = r.error
        ? `<td colspan="3" style="color:#b00">${r.error}</td>`
        : `<td><img src="${r.slug}__proto.png"></td><td><img src="${r.slug}__vue.png"></td><td><img src="${r.slug}__diff.png"></td>`
      return `<tr>
        <td class="meta">
          <div class="pct" style="color:${color}">${pct}</div>
          <div class="owner owner-${r.owner}">${r.owner}</div>
          <div class="route">${r.proto}</div>
          <div class="route vue">${r.vue}</div>
          <div class="note">${r.note || ''}</div>
        </td>
        ${imgs}
      </tr>`
    })
    .join('\n')
  const html = `<!doctype html><html lang="zh"><head><meta charset="utf-8">
<title>保真比对报告</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:16px;background:#f5f3ef;color:#222}
  h1{font-size:18px}
  .summary{margin:8px 0 16px;font-size:13px;color:#555}
  table{border-collapse:collapse;width:100%}
  td{border:1px solid #ddd;padding:6px;vertical-align:top;background:#fff}
  td.meta{width:220px;font-size:12px}
  .pct{font-size:20px;font-weight:700}
  .owner{display:inline-block;padding:1px 6px;border-radius:4px;font-size:11px;color:#fff;margin:4px 0}
  .owner-A{background:#2a7}.owner-B{background:#c70}.owner-NONE{background:#999}
  .route{font-family:monospace;font-size:11px;word-break:break-all;color:#333}
  .route.vue{color:#06c}
  .note{margin-top:4px;color:#777}
  img{width:257px;height:auto;display:block;border:1px solid #eee}
  th{position:sticky;top:0;background:#eee;padding:6px;font-size:12px}
</style></head><body>
<h1>保真比对报告（原型 vs uni-app H5 · 514×1111）</h1>
<div class="summary">共 ${results.length} 对 · 通过 ${results.filter((r) => r.pass).length} · 未通过 ${results.filter((r) => !r.pass).length} · 按差异降序</div>
<table><thead><tr><th>信息</th><th>原型</th><th>vue3 (H5)</th><th>diff</th></tr></thead>
<tbody>${rows}</tbody></table></body></html>`
  fs.writeFileSync(path.join(OUT, 'report.html'), html)
}

main()
