const assert = require('node:assert/strict')
const puppeteer = require('puppeteer')

async function run() {
  await fetch('http://127.0.0.1:3989/__group_result_status?status=REFUNDED')
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
      window.uni.navigateTo({ url: '/pkg-shop/group-buy/fail?id=group-1' })
    })
    await page.waitForFunction(() => document.body.innerText.includes('拼团未成功') || document.body.innerText.includes('拼团尚未失败') || document.body.innerText.includes('加载失败'), { timeout: 30000 })
    const failed = await page.evaluate(() => ({ text: document.body.innerText, width: document.documentElement.scrollWidth, viewport: innerWidth }))
    assert(failed.text.includes('退款处理中'))
    assert(!failed.text.includes('1-3个工作日'))
    assert(!failed.text.includes('1-3 个工作日'))
    assert(!failed.text.includes('2026-09-21'))
    assert(failed.width <= failed.viewport + 2)

    await fetch('http://127.0.0.1:3989/__group_result_status?status=WAITING')
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => document.body.innerText.includes('拼团尚未失败'), { timeout: 30000 })
    const waiting = await page.evaluate(() => document.body.innerText)
    assert(!waiting.includes('拼团未成功'))
    assert(waiting.includes('返回'))
    await fetch('http://127.0.0.1:3989/__group_result_status?status=SUCCESS')
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => document.body.innerText.includes('拼团尚未失败'), { timeout: 30000 })
    assert(!(await page.evaluate(() => document.body.innerText)).includes('拼团未成功'))
    process.stdout.write('group-buy failure synthetic HTTP: refund timing honest; WAITING/SUCCESS do not render failure; 320px fits\n')
  } finally {
    await browser.close()
  }
}
run().catch((error) => { console.error(error); process.exitCode = 1 })
