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
    await page.evaluate(() => window.uni.navigateTo({ url: '/pkg-course/instructor/index?id=teacher-1' }))
    await page.waitForFunction(() => document.body.innerText.includes('书法入门：从第一笔开始'), { timeout: 30000 })
    const state = await page.evaluate(() => ({
      text: document.body.innerText,
      viewport: window.innerWidth,
      width: document.documentElement.scrollWidth,
    }))
    assert(!state.text.includes('暂无公开课程'))
    assert(state.width <= state.viewport + 2, '320px 不得横向溢出')
    const screenshot = path.join(process.env.TEMP || '/tmp', 'rebu-instructor-courses-320.png')
    await page.screenshot({ path: screenshot, fullPage: true })
    process.stdout.write(`instructor synthetic HTTP: public course visible, no false empty state, 320px fits; screenshot=${screenshot}\n`)
  } finally {
    await browser.close()
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1 })
