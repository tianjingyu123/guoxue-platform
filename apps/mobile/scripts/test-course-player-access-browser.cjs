const assert = require('node:assert/strict')
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
      window.uni.navigateTo({ url: '/pkg-course/player/index?id=paid-1&lesson=paid-intro' })
    })
    await page.waitForFunction(() => document.body.innerText.includes('这是试看章节。'), { timeout: 30000 })
    await page.waitForFunction(() => document.body.innerText.includes('课程权益暂无法确认'), { timeout: 30000 })
    const unknown = await page.evaluate(() => document.body.innerText)
    assert(!unknown.includes('购买解锁全部'), '权限查询失败不能显示未购购买提示')
    await fetch('http://127.0.0.1:3989/__access_granted')
    await page.evaluate(() => {
      const button = [...document.querySelectorAll('[role="button"]')].find((element) => element.getAttribute('aria-label') === '重试核验课程权益')
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await page.waitForFunction(() => !document.body.innerText.includes('课程权益暂无法确认'), { timeout: 30000 })
    process.stdout.write('course player synthetic HTTP: access unknown stays distinct from denied, retry grants access\n')
  } finally {
    await browser.close()
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1 })
