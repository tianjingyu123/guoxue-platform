const assert = require('node:assert/strict')
const path = require('node:path')
const puppeteer = require('puppeteer')

async function run() {
  const browser = await puppeteer.launch({ headless: true, executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' })
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 320, height: 760 })
    await page.setRequestInterception(true)
    page.on('request', (request) => {
      if (request.url().startsWith('http://127.0.0.1:') || /^(data:|blob:|about:)/.test(request.url())) request.continue()
      else request.abort()
    })
    await page.goto('http://127.0.0.1:5178/h5/', { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => Boolean(window.uni))
    await page.evaluate(() => {
      window.uni.setStorageSync('auth_token', 'synthetic-token')
      window.uni.navigateTo({ url: '/pkg-course/work-submit/index?workId=work-1' })
    })
    await page.waitForFunction(() => document.body.innerText.includes('笔画起笔稳'), { timeout: 30000 })
    const graded = await page.evaluate(() => ({ text: document.body.innerText, width: document.documentElement.scrollWidth, viewport: window.innerWidth }))
    assert(graded.text.includes('已批改'))
    assert(!graded.text.includes('AI 已批改'))
    assert(!graded.text.includes('讲师会复核'))
    assert(graded.width <= graded.viewport + 2)
    const screenshot = path.join(process.env.TEMP || '/tmp', 'rebu-work-graded-320.png')
    await page.screenshot({ path: screenshot, fullPage: true })
    await page.evaluate(() => window.uni.navigateTo({ url: '/pkg-course/work-submit/index?workId=work-pending' }))
    await page.waitForFunction(() => document.body.innerText.includes('等待批改的练习'), { timeout: 30000 })
    const pending = await page.evaluate(() => document.body.innerText)
    assert(pending.includes('待批改'))
    assert(!pending.includes('系统正在批改中'))
    process.stdout.write(`work review synthetic HTTP: graded and pending copy match known facts, 320px fits; screenshot=${screenshot}\n`)
  } finally {
    await browser.close()
  }
}
run().catch((error) => { console.error(error); process.exitCode = 1 })
