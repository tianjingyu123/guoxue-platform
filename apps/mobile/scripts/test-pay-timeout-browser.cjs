const assert = require('node:assert/strict')
const path = require('node:path')
const puppeteer = require('puppeteer')

async function run() {
  await fetch('http://127.0.0.1:3989/__payment_order_status?status=PENDING')
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
      window.uni.navigateTo({ url: '/pkg-shop/pay-timeout/index?orderId=pay-timeout-1&amount=999' })
    })
    await page.waitForFunction(() => document.body.innerText.includes('订单仍待支付'), { timeout: 30000 })
    const pending = await page.evaluate(() => ({ text: document.body.innerText, width: document.documentElement.scrollWidth, viewport: innerWidth }))
    assert(pending.text.includes('¥48'))
    assert(!pending.text.includes('¥999'))
    assert(!pending.text.includes('1-3个工作日'))
    assert(!pending.text.includes('重新支付'))
    assert(pending.width <= pending.viewport + 2)
    const screenshot = path.join(process.env.TEMP || '/tmp', 'rebu-pay-result-pending-320.png')
    await page.screenshot({ path: screenshot, fullPage: true })

    await fetch('http://127.0.0.1:3989/__payment_order_status?status=ERROR')
    await page.evaluate(() => { document.querySelector('.btn.primary')?.click() })
    await page.waitForFunction(() => document.body.innerText.includes('暂无法核对'), { timeout: 30000 })
    const error = await page.evaluate(() => document.body.innerText)
    assert(!error.includes('订单仍待支付'))
    assert(!error.includes('¥48'))

    await fetch('http://127.0.0.1:3989/__payment_order_status?status=PAID')
    await page.evaluate(() => { document.querySelector('.btn.primary')?.click() })
    await page.waitForFunction(() => document.body.innerText.includes('支付成功'), { timeout: 30000 })
    assert(!(await page.evaluate(() => document.body.innerText)).includes('支付结果待确认'))
    process.stdout.write(`payment timeout synthetic HTTP: server amount shown; API error stays uncertain; paid recheck redirects to verified success; 320px fits; screenshot=${screenshot}\n`)
  } finally {
    await browser.close()
  }
}
run().catch((error) => { console.error(error); process.exitCode = 1 })
