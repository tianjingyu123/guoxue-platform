import { chromium } from 'playwright'

// 测量首页各区块在两端的真实 Y 坐标，定位累积位移来源
const PROTO = 'http://localhost:3000'
const VUE = 'http://localhost:5173'
const W = 375,
  H = 812

const browser = await chromium.launch()

async function measure(page, label) {
  const r = await page.evaluate(() => {
    const byText = (txt) => {
      const all = [...document.querySelectorAll('*')]
      const el = all.find((e) => e.children.length === 0 && e.textContent.trim() === txt)
      if (!el) return null
      return Math.round(el.getBoundingClientRect().top)
    }
    return { 课程: byText('课程'), 诗词: byText('诗词'), 已经到底了: byText('已经到底了') }
  })
  console.log(label, JSON.stringify(r))
}

const p1 = await (await browser.newContext({ viewport: { width: W, height: H }, isMobile: true })).newPage()
await p1.goto(PROTO + '/', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {})
await p1.waitForTimeout(2000)
await measure(p1, 'PROTO')

const p2 = await (await browser.newContext({ viewport: { width: W, height: H }, isMobile: true })).newPage()
await p2.goto(VUE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
await p2.waitForFunction(() => typeof window.uni !== 'undefined', { timeout: 20000 }).catch(() => {})
await p2.waitForTimeout(2500)
await measure(p2, 'VUE  ')

await browser.close()
