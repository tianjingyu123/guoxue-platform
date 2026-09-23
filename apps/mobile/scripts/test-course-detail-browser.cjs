const assert = require('node:assert/strict')
const path = require('node:path')
const puppeteer = require('puppeteer')

const pageUrl = 'http://127.0.0.1:5178/h5/'
const screenshot = path.join(process.env.TEMP || '/tmp', 'rebu-course-detail-320.png')

async function run() {
  await fetch('http://127.0.0.1:3989/__reset')
  const browser = await puppeteer.launch({ headless: true, executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' })
  try {
    const page = await browser.newPage()
    page.on('pageerror', (error) => process.stderr.write(`browser error: ${error.message}\n`))
    await page.setViewport({ width: 320, height: 760, deviceScaleFactor: 1 })
    await page.setRequestInterception(true)
    page.on('request', (request) => {
      const url = request.url()
      if (url.startsWith('http://127.0.0.1:')) request.continue()
      else if (/^(data:|blob:|about:)/.test(url)) request.continue()
      else request.abort()
    })
    await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForFunction(() => Boolean(window.uni), { timeout: 30000 })
    await page.evaluate(() => window.uni.setStorageSync('auth_token', 'synthetic-token'))
    await page.evaluate(() => window.uni.navigateTo({ url: '/pkg-course/detail/index?id=free-1' }))
    await page.waitForFunction(() => document.body.innerText.includes('书法入门：从第一笔开始'), { timeout: 60000 })
    await page.waitForFunction(() => document.body.innerText.includes('评价暂时无法加载'), { timeout: 30000 })
    await page.waitForFunction(() => document.body.innerText.includes('加入我的课程'), { timeout: 30000 })
    for (const width of [320, 375, 430]) {
      await page.setViewport({ width, height: 760, deviceScaleFactor: 1 })
      const state = await page.evaluate(() => ({
        text: document.body.innerText,
        viewport: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        join: [...document.querySelectorAll('[role="button"]')].find((element) => element.textContent?.includes('加入我的课程'))?.getBoundingClientRect().toJSON(),
      }))
      assert(state.text.includes('继续学习'))
      assert(state.scrollWidth <= state.viewport + 2, `${width}px 不得横向溢出`)
      assert(state.join && state.join.right <= state.viewport + 2, `${width}px 加入课程按钮必须可见`)
      if (width === 320) await page.screenshot({ path: screenshot, fullPage: true })
    }
    await page.evaluate(() => {
      const button = [...document.querySelectorAll('[role="button"]')].find((element) => element.textContent?.includes('加入我的课程'))
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await page.waitForFunction(() => !document.body.innerText.includes('加入我的课程'), { timeout: 30000 })
    process.stdout.write(`course detail synthetic HTTP: review failure isolated, free enrollment works, 320/375/430px fit; screenshot=${screenshot}\n`)
  } finally {
    await browser.close()
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1 })
