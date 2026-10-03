const assert = require('node:assert/strict')
const path = require('node:path')
const puppeteer = require('puppeteer')

async function run() {
  await fetch('http://127.0.0.1:3989/__reset')
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
      window.uni.navigateTo({ url: '/pkg-order/refund/index?orderId=order-1' })
    })
    await page.waitForFunction(() => document.body.innerText.includes('申请未通过'), { timeout: 30000 })
    const rejected = await page.evaluate(() => ({ text: document.body.innerText, width: document.documentElement.scrollWidth, viewport: window.innerWidth }))
    assert(!rejected.text.includes('退款已到账'))
    assert(!rejected.text.includes('预计 2026'))
    assert(rejected.width <= rejected.viewport + 2)
    const screenshot = path.join(process.env.TEMP || '/tmp', 'rebu-refund-rejected-320.png')
    await page.screenshot({ path: screenshot, fullPage: true })
    await fetch('http://127.0.0.1:3989/__refund_status?status=COMPLETED')
    await page.evaluate(() => window.uni.redirectTo({ url: '/pkg-order/refund/index?orderId=order-1' }))
    await page.waitForFunction(() => document.body.innerText.includes('退款处理完成'), { timeout: 30000 })
    const completed = await page.evaluate(() => document.body.innerText)
    assert(!completed.includes('退款已到账'))
    process.stdout.write(`refund synthetic HTTP: rejected and completed status honest, 320px fits; screenshot=${screenshot}\n`)
  } finally {
    await browser.close()
  }
}
run().catch((error) => { console.error(error); process.exitCode = 1 })
