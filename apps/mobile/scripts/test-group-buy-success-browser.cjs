const assert = require('node:assert/strict')
const path = require('node:path')
const puppeteer = require('puppeteer')

async function run() {
  await fetch('http://127.0.0.1:3989/__group_result_status?status=SUCCESS')
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
      window.uni.navigateTo({ url: '/pkg-shop/group-buy/success?id=group-1' })
    })
    await page.waitForFunction(() => document.body.innerText.includes('拼团成功'), { timeout: 30000 })
    const success = await page.evaluate(() => ({ text: document.body.innerText, width: document.documentElement.scrollWidth, viewport: innerWidth }))
    assert(success.text.includes('付款时间'))
    assert(!success.text.includes('成团时间'))
    assert(!success.text.includes('3 个工作日'))
    assert(!success.text.includes('分享得优惠券'))
    assert(!success.text.includes('省¥'))
    assert(success.width <= success.viewport + 2)
    const screenshot = path.join(process.env.TEMP || '/tmp', 'rebu-group-success-320.png')
    await page.screenshot({ path: screenshot, fullPage: true })

    for (const status of ['WAITING', 'REFUNDED']) {
      await fetch(`http://127.0.0.1:3989/__group_result_status?status=${status}`)
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => document.body.innerText.includes('拼团尚未成功') || document.body.innerText.includes('拼团未成功'), { timeout: 30000 })
      const text = await page.evaluate(() => document.body.innerText)
      assert(!text.includes('恭喜您，已成功拼团'))
      assert(text.includes('返回'))
    }
    process.stdout.write(`group-buy success synthetic HTTP: SUCCESS factual; WAITING/REFUNDED rejected; 320px fits; screenshot=${screenshot}\n`)
  } finally {
    await browser.close()
  }
}
run().catch((error) => { console.error(error); process.exitCode = 1 })
