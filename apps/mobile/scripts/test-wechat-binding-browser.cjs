const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')
const assert = require('node:assert/strict')
const puppeteer = require('puppeteer')
const root = path.resolve(__dirname, '../dist/build/h5')
const output = path.resolve(__dirname, '../../../artifacts/channel-intake-20260930/binding-browser')
const userId = '123e4567-e89b-42d3-a456-426614174000'
const cases = []
const check = (name, condition) => { assert(condition, name); cases.push(name) }

async function main() {
  fs.mkdirSync(output, { recursive: true })
  const server = http.createServer((req, res) => {
    const requested = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/h5\/?/, '')
    const candidate = path.resolve(root, requested || 'index.html')
    if (!candidate.startsWith(root + path.sep) && candidate !== root) { res.writeHead(403).end(); return }
    const file = fs.existsSync(candidate) && fs.statSync(candidate).isFile() ? candidate : path.join(root, 'index.html')
    const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' }[path.extname(file)] || 'application/octet-stream'
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-store' }); fs.createReadStream(file).pipe(res)
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const origin = 'http://127.0.0.1:' + server.address().port
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-first-run', '--disable-background-networking'] })
  let bound = false
  let bindCount = 0
  let deleteCount = 0
  let rejectUnbind = true
  const errors = []
  const page = await browser.newPage()
  await page.setUserAgent('Mozilla/5.0 Synthetic MicroMessenger/8.0.58')
  await page.evaluateOnNewDocument(id => {
    // 使用 SDK 的正式 H5 存储格式，不依赖开发模式全局 uni。
    localStorage.setItem('auth_token', 'synthetic-session')
    localStorage.setItem('userInfo', JSON.stringify({ type: 'object', data: { id, nickname: '合成用户' } }))
  }, userId)
  await page.setRequestInterception(true)
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', async req => {
    const url = new URL(req.url())
    if (url.origin === origin || ['data:', 'blob:', 'about:'].includes(url.protocol)) { await req.continue(); return }
    const respond = input => req.respond({ ...input, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': req.headers()['access-control-request-headers'] || '*', 'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS' } })
    if (req.method() === 'OPTIONS') { await respond({ status: 204 }); return }
    // 对所有外网请求先截断；接口仅用合成响应，未发送真实授权或账号写入。
    if (url.pathname.endsWith('/users/bound-accounts')) {
      await respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, data: [{ provider: 'wechat', name: '微信', color: '#16a34a', isBound: bound, accountInfo: bound ? '微信_user***001' : undefined }, { provider: 'qq', name: 'QQ', color: '#2677cb', isBound: false }, { provider: 'apple', name: 'Apple', color: '#333333', isBound: false }] }) }); return
    }
    if (url.pathname.endsWith('/auth/wechat/oauth-url')) {
      await respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, data: { url: 'https://open.weixin.qq.com/connect/oauth2/authorize?synthetic=1' } }) }); return
    }
    if (url.pathname.endsWith('/auth/bind/wechat')) {
      bindCount++
      const body = JSON.parse(req.postData())
      check('浏览器真实绑定请求带发起主体', body.expectedUserId === userId && body.loginType === 'h5')
      bound = true
      await respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, data: { success: true } }) }); return
    }
    if (url.pathname.endsWith('/users/bound-accounts/wechat') && req.method() === 'DELETE') {
      deleteCount++
      check('解绑请求带主体防切账号', url.searchParams.get('expectedUserId') === userId)
      if (!rejectUnbind) bound = false
      await respond({ status: rejectUnbind ? 400 : 200, contentType: 'application/json', body: JSON.stringify(rejectUnbind ? { code: 400, message: '至少保留一种登录方式，无法解绑最后一个账号' } : { code: 200, data: { success: true } }) }); return
    }
    if (url.pathname.endsWith('/auth/me')) {
      await respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, data: { id: userId, nickname: '合成用户', roles: [], interestGuideCompleted: true } }) }); return
    }
    if (['xhr', 'fetch'].includes(req.resourceType())) {
      await respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, data: {} }) }); return
    }
    await req.abort()
  })
  const click = async text => {
    await page.evaluate(label => {
      const element = [...document.querySelectorAll('uni-button,button')].find(node => node.textContent.trim() === label)
      if (!element) throw new Error('未找到按钮 ' + label)
      element.click()
    }, text)
  }
  try {
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 })
    await page.goto(origin + '/h5/pkg-mine/bind-accounts/index', { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => document.body.innerText.includes('已绑定 0 个账号'), { timeout: 30000 })
    check('微信绑定可点击，QQ与Apple诚实展示暂不可用', (await page.evaluate(() => document.body.innerText)).includes('新绑定暂未开放'))
    for (const width of [320, 375, 390]) {
      await page.setViewport({ width, height: 844, deviceScaleFactor: 1 })
      await new Promise(resolve => setTimeout(resolve, 100))
      const layout = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: innerWidth, text: document.body.innerText }))
      check(width + 'px 页面无横向溢出', layout.width <= layout.viewport + 2)
      check(width + 'px 移除无依据积分承诺', !layout.text.includes('绑定送积分'))
      await page.screenshot({ path: path.join(output, 'binding-' + width + '.png'), fullPage: true })
    }
    await click('绑定')
    await page.waitForFunction(() => document.body.innerText.includes('继续微信授权'))
    check('授权准备不异步跳到微信', page.url().startsWith(origin))
    await click('取消')
    check('取消后清理一次性状态', await page.evaluate(() => sessionStorage.getItem('wechat:h5:binding-attempt') === null))
    await click('绑定')
    await page.waitForFunction(() => document.body.innerText.includes('继续微信授权'))
    const state = await page.evaluate(() => JSON.parse(sessionStorage.getItem('wechat:h5:binding-attempt')).state)
    await page.goto(origin + '/h5/pkg-mine/bind-accounts/index?wx_bind=1&code=synthetic-code&state=' + state, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => document.body.innerText.includes('微信已绑定') && document.body.innerText.includes('已绑定 1 个账号'))
    check('授权回调只请求一次绑定', bindCount === 1)
    check('完成后移除URL票据', !page.url().includes('code=') && !page.url().includes('state='))
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => document.body.innerText.includes('已绑定 1 个账号'))
    check('刷新页面不重放授权', bindCount === 1)
    await click('解绑')
    await page.waitForFunction(() => document.body.innerText.includes('确认解绑'))
    await click('确认解绑')
    await page.waitForFunction(() => document.body.innerText.includes('无法解绑最后一个账号'))
    check('服务端拒绝后保留权威绑定状态', bound && (await page.evaluate(() => document.body.innerText)).includes('已绑定 1 个账号'))
    rejectUnbind = false
    await click('解绑'); await page.waitForFunction(() => document.body.innerText.includes('确认解绑')); await click('确认解绑')
    await page.waitForFunction(() => document.body.innerText.includes('微信已解绑') && document.body.innerText.includes('已绑定 0 个账号'))
    check('成功解绑重新加载列表', deleteCount === 2)
    await page.screenshot({ path: path.join(output, 'binding-result.png'), fullPage: true })
    check('浏览器运行无页面异常', errors.length === 0)
    fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({ scope: '本地实际H5产物与合成HTTP，全部非本地网络已拦截；非真机、非真实微信授权', passed: cases.length, cases, pageErrors: errors, bindCount, deleteCount }, null, 2))
    console.log(JSON.stringify({ passed: cases.length, output }))
  } catch (error) {
    fs.writeFileSync(path.join(output, 'failure.json'), JSON.stringify({ error: error.message, cases, pageErrors: errors, text: await page.evaluate(() => document.body.innerText) }, null, 2))
    await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true })
    throw error
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)) }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
