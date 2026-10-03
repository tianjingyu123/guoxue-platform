const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict'), puppeteer = require('puppeteer')
const root = path.resolve(__dirname, '../dist/build/h5'), output = path.resolve(__dirname, '../../../artifacts/channel-intake-20260930/same-city-browser')
const cases = [], calls = [], errors = [], detailRequests = []
const check = (name, condition) => { assert(condition, name); cases.push(name) }
let mode = 'normal'
async function main() {
  fs.mkdirSync(output, { recursive: true })
  const server = http.createServer((req, res) => {
    const relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/h5\/?/, '')
    const candidate = path.resolve(root, relative || 'index.html')
    if (!candidate.startsWith(root + path.sep) && candidate !== root) { res.writeHead(403).end(); return }
    const file = fs.existsSync(candidate) && fs.statSync(candidate).isFile() ? candidate : path.join(root, 'index.html')
    const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' }[path.extname(file)] || 'application/octet-stream'
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-store' }); fs.createReadStream(file).pipe(res)
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const origin = 'http://127.0.0.1:' + server.address().port
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-first-run', '--disable-background-networking'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 })
  await page.setRequestInterception(true)
  page.on('pageerror', e => errors.push(e.message))
  page.on('request', async request => {
    const url = new URL(request.url())
    if (url.origin === origin || ['data:', 'blob:', 'about:'].includes(url.protocol)) { await request.continue(); return }
    const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': request.headers()['access-control-request-headers'] || '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' }
    if (request.method() === 'OPTIONS') { await request.respond({ status: 204, headers }); return }
    const station = (id, city) => ({ id, city, name: city + '读书驿站' + id, address: '合成阅读空间', cover: '', images: [], status: 'ACTIVE' })
    let data = null, status = 200
    if (url.pathname.endsWith('/offline/stations/cities')) {
      data = { cities: mode === 'empty' ? [] : ['北京市', '保定市'] }; if (mode === 'directory-error') status = 503
    } else if (url.pathname.endsWith('/offline/stations/discover')) {
      const city = url.searchParams.get('city'), pageNumber = Number(url.searchParams.get('page'))
      calls.push({ kind: 'stations', city, page: pageNumber })
      if (mode === 'station-error') status = 503
      data = { stations: mode === 'no-resources' ? [] : pageNumber === 1 ? Array.from({ length: 12 }, (_, index) => station(city + '-' + index, city)) : [station(city + '-12', city)], total: mode === 'no-resources' ? 0 : 13 }
    } else if (url.pathname.endsWith('/recommend/same_city')) {
      const city = url.searchParams.get('city'); calls.push({ kind: 'recommendations', city })
      if (mode === 'recommendation-error') status = 503
      data = { items: mode === 'no-resources' ? [] : [{ id: 'synthetic-course', type: 'COURSE', title: city + '关联课程', metadata: { price: 29 } }, { id: 'synthetic-product', type: 'PRODUCT', title: city + '关联好物', metadata: { price: 19 } }], recommendId: 'synthetic-city-only' }
    } else if (/synthetic-(course|product)/.test(url.pathname + url.search)) {
      detailRequests.push(url.pathname + url.search); status = 404
    } else if (url.pathname.endsWith('/config/public')) data = {}
    else if (url.pathname.includes('/recommend/log')) data = { success: true }
    else if (!url.pathname.includes('/api/')) { await request.respond({ status: 204, headers }); return }
    await request.respond({ status, contentType: 'application/json', headers, body: JSON.stringify({ code: status, data, message: status === 503 ? '合成加载失败' : undefined }) })
  })
  const go = () => page.goto(origin + '/h5/pkg-discover/same-city/feed', { waitUntil: 'networkidle0' })
  const text = () => page.evaluate(() => document.body.innerText)
  async function choose(city) {
    await new Promise(resolve => setTimeout(resolve, 400))
    const current = await page.$eval('.city-picker-text', item => item.textContent)
    await page.click('.city-picker'); await page.waitForSelector('.uni-picker-view-group', { visible: true }); await new Promise(resolve => setTimeout(resolve, 400))
    const desired = ['北京市', '保定市'].indexOf(city), selected = Math.max(0, ['北京市', '保定市'].indexOf(current))
    const group = await page.$('.uni-picker-view-group'), box = await group.boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    for (let index = 0; index < Math.abs(desired - selected); index++) await page.mouse.wheel({ deltaY: desired > selected ? 40 : -40 })
    await new Promise(resolve => setTimeout(resolve, 400))
    await page.click('.uni-picker-action-confirm')
    await page.waitForFunction(value => document.querySelector('.city-picker-text')?.textContent === value && !document.body.innerText.includes('正在寻找'), {}, city)
    await new Promise(resolve => setTimeout(resolve, 400))
  }
  try {
    await go(); check('初次访问可手选城市且没有全国资源请求', (await text()).includes('选择你想逛的城市') && calls.length === 0)
    await page.click('.city-picker'); await page.waitForSelector('.uni-picker-action-cancel', { visible: true }); await new Promise(resolve => setTimeout(resolve, 400)); await page.click('.uni-picker-action-cancel'); await new Promise(resolve => setTimeout(resolve, 400))
    check('取消选城不请求或猜测位置', calls.length === 0)
    await choose('北京市'); await page.waitForSelector('.station-card')
    check('当前城市名称与首批资源请求一致', calls.every(item => item.city === '北京市') && (await text()).includes('北京市读书驿站'))
    await page.screenshot({ path: path.join(output, 'mobile-city.png'), fullPage: true })
    await choose('保定市'); check('换城后旧城市文本消失', !(await text()).includes('北京市读书驿站') && (await text()).includes('保定市读书驿站'))
    await page.click('.load-more'); await page.waitForFunction(() => document.querySelectorAll('.station-card').length === 13)
    check('真实分页请求第二页后显示新增驿站', calls.some(item => item.city === '保定市' && item.page === 2))
    check('全部载入后不显示误导的更多按钮', !(await text()).includes('查看更多驿站'))
    await page.reload({ waitUntil: 'networkidle0' }); check('正式H5存储格式可恢复手选城市', (await text()).includes('保定市读书驿站'))
    mode = 'no-resources'; await page.reload({ waitUntil: 'networkidle0' }); check('资源真空时不混入全国推荐', (await text()).includes('暂时没有可浏览的驿站') && (await text()).includes('暂无可展示的关联课程'))
    mode = 'station-error'; await page.reload({ waitUntil: 'networkidle0' }); check('驿站故障独立展示且关联推荐继续可读', (await text()).includes('驿站加载失败') && (await text()).includes('保定市关联课程'))
    mode = 'recommendation-error'; await page.reload({ waitUntil: 'networkidle0' }); check('推荐故障不冒充空结果且驿站继续可读', (await text()).includes('关联课程与好物暂时无法加载') && (await text()).includes('保定市读书驿站'))
    mode = 'directory-error'; await page.reload({ waitUntil: 'networkidle0' }); check('城市目录故障提供重试', (await text()).includes('城市目录暂时无法加载'))
    mode = 'empty'; await page.reload({ waitUntil: 'networkidle0' }); check('空目录诚实展示与全国独立入口', (await text()).includes('暂时没有开放的同城驿站') && (await text()).includes('去发现内容'))
    mode = 'normal'; await page.setViewport({ width: 1024, height: 768 }); await page.reload({ waitUntil: 'networkidle0' })
    await page.screenshot({ path: path.join(output, 'tablet-city.png'), fullPage: true })
    check('宽屏内容收束且无横向溢出', await page.evaluate(() => document.querySelector('.city-content').getBoundingClientRect().width <= 750 && document.documentElement.scrollWidth <= innerWidth))
    await page.setViewport({ width: 390, height: 844 }); await page.reload({ waitUntil: 'networkidle0' })
    await page.$eval('.rec__grid', element => element.scrollIntoView({ block: 'center' }))
    check('无封面推荐卡有实际可见兜底而非空白占位', await page.evaluate(() => [...document.querySelectorAll('.rec__cover .sc-gen')].length === 2 && [...document.querySelectorAll('.rec__cover .sc-gen')].every(element => element.getBoundingClientRect().height > 80)))
    await page.screenshot({ path: path.join(output, 'resource-covers.png'), fullPage: true })
    const courseRead = page.waitForRequest(request => !request.url().startsWith(origin) && request.url().includes('synthetic-course'), { timeout: 10000 })
    await (await page.$$('.rec__card'))[0].click(); await page.waitForFunction(() => location.pathname.includes('/pkg-course/detail/index') && location.search.includes('synthetic-course')); await courseRead
    check('课程使用平台真实ID并到实际注册详情路由', page.url().includes('id=synthetic-course'))
    await go(); await page.$eval('.rec__grid', element => element.scrollIntoView({ block: 'center' }))
    const productRead = page.waitForRequest(request => !request.url().startsWith(origin) && request.url().includes('synthetic-product'), { timeout: 10000 }); await (await page.$$('.rec__card'))[1].click()
    await page.waitForFunction(() => location.pathname.includes('/pkg-mall/product/detail') && location.search.includes('synthetic-product')); await productRead
    check('商品使用平台真实ID并到实际注册详情路由', page.url().includes('id=synthetic-product'))
    await page.goto(origin + '/h5/pages/index/index', { waitUntil: 'networkidle0' }); await page.waitForSelector('.tab')
    const tabs = await page.$$('.tab'); let local
    for (const tab of tabs) if ((await tab.evaluate(item => item.textContent.trim())) === '同城') local = tab
    assert(local, '首页同城入口不存在'); check('首页同城入口不再禁用', await local.evaluate(item => item.getAttribute('aria-disabled') === 'false'))
    await local.click(); await page.waitForFunction(() => location.pathname.includes('/pkg-discover/same-city/feed'))
    check('首页实际点击直接进入同城页', page.url().includes('/pkg-discover/same-city/feed'))
    check('实际浏览器无页面异常', errors.length === 0)
    fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({ testedAt: new Date().toISOString(), passed: cases.length, cases, calls, detailRequests, errors, scope: '实际构建H5/独立Chrome；合成HTTP，全部非本地网络拦截，非真机与真实上线配置' }, null, 2)); console.log(JSON.stringify({ passed: cases.length, output }))
  } catch (error) {
    fs.writeFileSync(path.join(output, 'failure.json'), JSON.stringify({ error: error.stack, cases, calls, errors, text: await text() }, null, 2)); await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }); throw error
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)) }
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
