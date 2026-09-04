import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'

const page = fs.readFileSync('apps/mobile/src/pkg-common/legacy-paipan/index.vue', 'utf8')
const preload = fs.readFileSync('apps/mobile/src/static/legacy-paipan-preload.js', 'utf8')
const paipanPage = fs.readFileSync('apps/mobile/src/pages/paipan/index.vue', 'utf8')
const legacyData = fs.readFileSync('apps/mobile/src/lib/legacy-paipan-data.ts', 'utf8')
const pages = fs.readFileSync('apps/mobile/src/pages.json', 'utf8')
const videoPage = fs.readFileSync('apps/mobile/src/pkg-video/detail/index.vue', 'utf8')
const manifest = fs.readFileSync('apps/mobile/src/manifest.json', 'utf8')
const nativeCompass = fs.readFileSync('apps/mobile/src/pkg-paipan3/luopan/compass.ts', 'utf8')
const nativeCompassPage = fs.readFileSync('apps/mobile/src/pkg-paipan3/luopan/index.vue', 'utf8')

test('H5 旧排盘由用户手势新窗口打开并保留可见返回入口', () => {
  assert.match(page, /window\.open\('', '_blank'\)/u)
  assert.match(page, /opened\.opener = null/u)
  assert.match(page, /opened\.location\.replace\(legacyUrl\.value\)/u)
  assert.match(page, /window\.location\.assign\(legacyUrl\.value\)/u)
  assert.doesNotMatch(page, /window\.location\.replace\(entry\.url\)/u)
  assert.match(page, />返回热卜首页</u)
})

test('App 与小程序排盘工具不叠加原生标题，并保留硬件返回和受控消息桥', () => {
  assert.match(pages, /"path": "legacy-paipan\/index"[\s\S]*?"navigationStyle": "custom"/u)
  const routeConfig = pages.slice(pages.indexOf('"path": "legacy-paipan/index"'), pages.indexOf('"path": "legacy-paipan/index"') + 320)
  assert.doesNotMatch(routeConfig, /"navigationBarTitleText"/u)
  assert.match(page, /@message="handleLegacyMessage"/u)
  assert.match(page, /message\.type === 'rebu:return'/u)
  assert.match(page, /message\.action === 'return-to-rebu'/u)
  assert.match(page, /onBackPress\(\(\) =>/u)
  assert.match(page, /navigateTo\('\/pages\/index\/index'\)/u)
})

test('旧排盘签名地址只在内存中一次性交接，承接页不会重复请求造成停顿', () => {
  assert.match(legacyData, /pendingLegacyEntry/u)
  assert.match(legacyData, /pendingLegacyEntry = null/u)
  assert.match(paipanPage, /stageLegacyPaipanEntry\(/u)
  assert.match(page, /consumeLegacyPaipanEntry\(\) \|\| await legacyPaipanApi\.entry\(\)/u)
  assert.doesNotMatch(page, />旧版排盘</u)
})

test('App 旧排盘只在受信域名内兼容新窗口工具，并保留子页面返回', () => {
  assert.match(page, /yrydai\\\.\(\?:cn\|com\)/u)
  assert.match(page, /querySelectorAll\('a\[target="_blank"\],a\[target="_new"\]'\)/u)
  assert.match(page, /querySelectorAll\('form\[target="_blank"\],form\[target="_new"\]'\)/u)
  assert.match(page, /document\.addEventListener\('submit'/u)
  assert.match(page, /window\.open=function\(url\)/u)
  assert.match(page, /openTrustedLegacyUrl\(url\)/u)
  assert.match(page, /if\(!window\.webviewJS\)/u)
  assert.match(page, /openUrl:function\(url\)\{openLegacyPayload\(url\);\}/u)
  assert.match(page, /payWX:function\(value\)\{openLegacyPayment\(value\);\}/u)
  assert.match(page, /errorBack:function\(\)\{if\(window\.history\.length>1\)window\.history\.back\(\);else openRebuAction\('home'\);\}/u)
  assert.match(page, /errorReload:function\(\)\{window\.location\.reload\(\);\}/u)
  assert.match(page, /webkit\.messageHandlers\|\|\(webkit\.messageHandlers=\{\}\)/u)
  assert.match(page, /add\('openUrl',function\(value\)\{openLegacyPayload\(value\);\}\)/u)
  assert.match(page, /window\.webUni=\{/u)
  assert.match(page, /postMessage:function\(message\)\{handleWebUniMessage\(message\);\}/u)
  assert.match(page, /\^\(rebu\|weixin\|alipays\|tel\|mailto\)/u)
  assert.match(page, /openRebuAction\('legacy-payment\?trade_no='\+tradeNo\)/u)
  assert.doesNotMatch(page, /paymentUrl\.searchParams\.set\('mod','pay'\)/u)
  assert.doesNotMatch(page, /旧排盘会员支付尚未接通/u)
  assert.match(page, /child\.evalJS\(legacyNavigationBridgeScript\(\)\)/u)
  assert.match(page, /plus\.webview\.create\('', `rebu-legacy-paipan-/u)
  assert.match(page, /child\.setJsFile\?\.\('_www\/static\/legacy-paipan-preload\.js'\)/u)
  assert.match(page, /parent\.append\(child\)/u)
  assert.match(page, /child\.loadURL\(legacyUrl\.value\)/u)
  assert.match(page, /top: `\$\{safeTop\.value\}px`/u)
  assert.match(page, /bottom: '0px'/u)
  assert.match(page, /__rebuNativeSafeBottom/u)
  assert.match(page, /data-rebu-native-bottom/u)
  assert.match(page, /Math\.max\(bodyPadding,inset\)/u)
  assert.match(page, /style\.position==='fixed'\|\|style\.position==='absolute'/u)
  assert.match(page, /looksLikeActionBar/u)
  assert.match(page, /plusrequire: 'none'/u)
  assert.match(page, /\$scope\?\.\$getAppWebview\?\.\(\)/u)
  assert.match(page, /page\?\.\$getAppWebview\?\.\(\)/u)
  assert.doesNotMatch(page, /plus\.webview\.currentWebview\(\)/u)
  assert.match(page, /child\.addEventListener\?\.\('loading', \(\) => \{[\s\S]*pendingLegacyPayment = null[\s\S]*reinject\(\)/u)
  assert.match(page, /child\.addEventListener\?\.\('loaded', reveal\)/u)
  assert.match(page, /child\.addEventListener\?\.\('error',/u)
  assert.match(page, /if \(!reinject\(\)\) return[\s\S]*setContentVisible\?\.\(true\)[\s\S]*legacyAppMounted\.value = true/u)
  assert.match(page, /\[0, 250, 700, 1500, 3000, 5000, 8000, 12000\]/u)
  assert.match(page, /overrideUrlLoading/u)
  assert.match(page, /plus\.runtime\.openURL\(url\)/u)
  assert.match(page, /let legacyChildWebview: any \| null = null/u)
  assert.match(page, /legacyChildWebview = child/u)
  assert.match(page, /legacyChildWebview\.getURL\?\.\(\); return legacyChildWebview/u)
  assert.match(page, /child\.canBack/u)
  assert.match(page, /if \(event\?\.canBack\) child\.back\(\)/u)
  assert.match(page, /touch\.clientX<=24/u)
  assert.match(page, /touch\.clientX>=viewportWidth-24/u)
  assert.match(page, /dx>=80/u)
  assert.match(page, /dx<=-80/u)
  assert.match(page, /window\.history\.back\(\)/u)
  assert.doesNotMatch(page, /legacy-right-back-gesture/u)
  assert.doesNotMatch(page, /rightGestureActive/u)
})

test('App 预载桥在旧站首屏执行前补齐旧 APK 的 webviewJS 导航接口', () => {
  assert.match(preload, /window\.__rebuLegacyNavigationPreloadInstalled/u)
  assert.match(preload, /window\.webviewJS = \{/u)
  assert.match(preload, /openUrl: function \(url\) \{ openLegacyPayload\(url\) \}/u)
  assert.match(preload, /payWX: function \(value\) \{ openLegacyPayment\(value\) \}/u)
  assert.match(preload, /serviceWX: function \(\) \{ openRebuAction\('customer-service'\) \}/u)
  assert.match(preload, /add\('openUrl', function \(value\) \{ openLegacyPayload\(value\) \}\)/u)
  assert.match(preload, /window\.webUni = \{/u)
  assert.match(preload, /postMessage: function \(message\) \{ handleWebUniMessage\(message\) \}/u)
  assert.match(preload, /errorBack: function \(\)/u)
  assert.match(preload, /errorReload: function \(\) \{ window\.location\.reload\(\) \}/u)
  assert.match(preload, /window\.open = sameWindowOpen/u)
  assert.match(preload, /location: function \(\) \{ openNativeLocation\(\) \}/u)
  assert.match(preload, /openCompass: function \(\) \{ openNativeCompass\(\) \}/u)
  assert.doesNotMatch(preload, /console\./u)
})

test('旧排盘保留定位桥，电子罗盘改为平台自有原生页面', () => {
  assert.match(page, /uni\.getLocation\(\{/u)
  assert.match(page, /window\.setLocation/u)
  assert.match(page, /callback\(\$\{latitude\},\$\{longitude\}\)/u)
  assert.match(page, /else if \(action === 'location'\) requestLegacyLocation\(\)/u)
  assert.match(page, /else if \(action === 'compass-start'\) openNativeCompass\(child\)/u)
  assert.match(page, /url: '\/pkg-paipan3\/luopan\/index\?source=paipan'/u)
  assert.match(nativeCompassPage, /createCompass\(\{/u)
  assert.match(nativeCompass, /uni\.onCompassChange\(mpHandler\)/u)
  assert.match(nativeCompass, /orientation\.watchOrientation/u)
  assert.match(manifest, /"Geolocation"\s*:\s*\{\}/u)
  assert.match(manifest, /"Orientation"\s*:\s*\{\}/u)
  assert.match(manifest, /android\.permission\.ACCESS_COARSE_LOCATION/u)
  assert.match(manifest, /android\.permission\.ACCESS_FINE_LOCATION/u)
  assert.match(manifest, /"NSLocationWhenInUseUsageDescription"/u)
})

test('系统底部安全区兼容旧版与新版字段，并传给排盘子窗口', () => {
  assert.match(page, /screenHeight > 0 && safeAreaBottom > 0 \? screenHeight - safeAreaBottom : 0/u)
  assert.match(page, /getSafeAreaInsets/u)
  assert.match(page, /insets\?\.deviceBottom/u)
  assert.match(page, /__rebuNativeSafeBottom/u)
})

test('第三方绝对定位与 fixed 购买栏都会抬到真实 WebView 安全区内', () => {
  const bridge = page.match(/function legacyNavigationBridgeScript\(\): string \{\s*return `([\s\S]*?)`\s*\}/u)[1]
  const makeBar = position => {
    const values = new Map()
    return {
      values,
      attrs: new Map(),
      style: { setProperty: (key, value) => values.set(key, value) },
      getAttribute(key) { return this.attrs.get(key) || '' },
      setAttribute(key, value) { this.attrs.set(key, value) },
      getBoundingClientRect: () => ({ bottom: 800, width: 360, height: 56 }),
      computed: { position, bottom: '0px', paddingBottom: '0px' },
    }
  }
  const fixed = makeBar('fixed')
  const absolute = makeBar('absolute')
  const ordinary = makeBar('static')
  const bodyValues = new Map()
  const body = { style: { setProperty: (key, value) => bodyValues.set(key, value) }, computed: { paddingBottom: '12px' } }
  const rootValues = new Map()
  const document = {
    body,
    documentElement: { clientHeight: 800, clientWidth: 360, style: { setProperty: (key, value) => rootValues.set(key, value) } },
    querySelectorAll: selector => selector === 'body *' ? [fixed, absolute, ordinary] : [],
    addEventListener: () => {},
  }
  const window = {
    __rebuNativeSafeBottom: 34,
    innerHeight: 800,
    innerWidth: 360,
    location: { href: 'https://www.yrydai.cn/member' },
    history: { length: 1 },
    getComputedStyle: node => node.computed,
  }
  window.window = window
  vm.runInNewContext(bridge, { URL, window, document })
  assert.equal(fixed.values.get('bottom'), '34px')
  assert.equal(absolute.values.get('bottom'), '34px')
  assert.equal(ordinary.values.has('bottom'), false)
  assert.equal(bodyValues.get('padding-bottom'), '34px')
  assert.equal(rootValues.get('--rebu-native-safe-bottom'), '34px')
})

test('预载桥只允许排盘官方 HTTPS 导航，支付交易号交给独立原生桥', () => {
  const assigned = []
  const listeners = new Map()
  let backCount = 0
  let reloadCount = 0
  const sandbox = {
    URL,
    window: {
      location: {
        hostname: 'www.yrydai.cn',
        href: 'https://www.yrydai.cn/guoxueApp.php',
        assign: (url) => assigned.push(url),
        reload: () => { reloadCount += 1 },
      },
      history: { length: 2, back: () => { backCount += 1 } },
      open: () => null,
    },
    document: {
      readyState: 'complete',
      documentElement: {},
      querySelectorAll: () => [],
      addEventListener: (name, handler) => listeners.set(name, handler),
    },
    MutationObserver: class { observe() {} },
  }
  sandbox.window.window = sandbox.window
  vm.runInNewContext(preload, sandbox)

  sandbox.window.webviewJS.openUrl('/tool/bazi')
  assert.equal(assigned.at(-1), 'https://www.yrydai.cn/tool/bazi')
  sandbox.window.webviewJS.openUrl('https://attacker.example/tool')
  assert.equal(assigned.at(-1), 'https://www.yrydai.cn/tool/bazi')
  sandbox.window.webkit.messageHandlers.openUrl.postMessage('/tool/qimen')
  assert.equal(assigned.at(-1), 'https://www.yrydai.cn/tool/qimen')
  sandbox.window.webUni.navigateTo({ url: '/pkg-common/webview?url=' + encodeURIComponent('https://www.yrydai.com/tool/liuyao') })
  assert.equal(assigned.at(-1), 'https://www.yrydai.com/tool/liuyao')
  sandbox.window.webviewJS.payWX('trade-number-1')
  assert.equal(assigned.at(-1), 'rebu://legacy-payment?trade_no=trade-number-1')
  sandbox.window.webUni.postMessage({ data: { action: 'pay', payload: { trade_no: 'trade-number-2' } } })
  assert.equal(assigned.at(-1), 'rebu://legacy-payment?trade_no=trade-number-2')
  sandbox.window.webviewJS.payWX('bad/trade')
  assert.equal(assigned.at(-1), 'rebu://unsupported')
  sandbox.window.webviewJS.location()
  assert.equal(assigned.at(-1), 'rebu://location')
  sandbox.window.webviewJS.openCompass()
  assert.equal(assigned.at(-1), 'rebu://compass-start')
  sandbox.window.webviewJS.errorBack()
  sandbox.window.webviewJS.errorReload()
  assert.equal(backCount, 1)
  assert.equal(reloadCount, 1)

  let externalPrevented = false
  listeners.get('click')({
    target: {
      tagName: 'A',
      href: 'https://attacker.example/redirect',
      getAttribute: () => '_self',
      parentNode: null,
    },
    preventDefault: () => { externalPrevented = true },
  })
  assert.equal(externalPrevented, true)
  assert.equal(assigned.at(-1), 'rebu://unsupported')

  let inertPrevented = false
  listeners.get('click')({
    target: {
      tagName: 'A',
      href: 'javascript:void(0)',
      getAttribute: (name) => name === 'href' ? 'javascript:void(0)' : '_self',
      parentNode: null,
    },
    preventDefault: () => { inertPrevented = true },
  })
  assert.equal(inertPrevented, false)
  assert.equal(assigned.at(-1), 'rebu://unsupported')
})

test('排盘兼容桥真实接管新窗口、原支付和 iOS 双侧边缘返回手势', () => {
  const scriptMatch = page.match(/function legacyNavigationBridgeScript\(\): string \{\s*return `([\s\S]*?)`\s*\}/u)
  assert.ok(scriptMatch, '应能提取旧排盘桥接脚本')

  const listeners = new Map()
  const assigned = []
  const link = { tagName: 'A', href: 'https://www.yrydai.cn/tool', target: '_blank', getAttribute: () => link.target, setAttribute: (_key, value) => { link.target = value }, parentNode: null }
  const form = { tagName: 'FORM', target: '_new', getAttribute: () => form.target, setAttribute: (_key, value) => { form.target = value } }
  let backCount = 0
  const sandbox = {
    URL,
    window: {
      location: { href: 'https://www.yrydai.cn/guoxueApp.php', assign: (url) => assigned.push(url) },
      history: { length: 2, back: () => { backCount += 1 } },
      innerWidth: 390,
    },
    document: {
      documentElement: {},
      querySelectorAll: (selector) => selector.startsWith('a[') ? [link] : [form],
      addEventListener: (name, handler) => listeners.set(name, handler),
    },
    MutationObserver: class { observe() {} },
  }
  sandbox.window.window = sandbox.window
  vm.runInNewContext(scriptMatch[1], sandbox)

  assert.equal(link.target, '_self')
  assert.equal(form.target, '_self')
  sandbox.window.open('https://www.yrydai.cn/qimen')
  assert.deepEqual(assigned, ['https://www.yrydai.cn/qimen'])

  sandbox.window.webviewJS.openUrl('https://www.yrydai.cn/bazi')
  assert.equal(assigned.at(-1), 'https://www.yrydai.cn/bazi')
  sandbox.window.webviewJS.openUrl('https://attacker.example/bazi')
  assert.equal(assigned.at(-1), 'https://www.yrydai.cn/bazi')
  sandbox.window.webviewJS.payWX('trade-number-3')
  assert.equal(assigned.at(-1), 'rebu://legacy-payment?trade_no=trade-number-3')
  sandbox.window.webviewJS.location()
  assert.equal(assigned.at(-1), 'rebu://location')
  sandbox.window.webkit.messageHandlers.openCompass.postMessage('')
  assert.equal(assigned.at(-1), 'rebu://compass-start')

  const dynamicLink = { tagName: 'A', href: 'https://www.yrydai.cn/bazi', target: '_blank', getAttribute: () => dynamicLink.target, parentNode: null }
  let prevented = false
  listeners.get('click')({ target: dynamicLink, preventDefault: () => { prevented = true } })
  assert.equal(prevented, true)
  assert.equal(assigned.at(-1), 'https://www.yrydai.cn/bazi')

  listeners.get('touchstart')({ touches: [{ clientX: 12, clientY: 240 }] })
  listeners.get('touchend')({ changedTouches: [{ clientX: 120, clientY: 250 }] })
  assert.equal(backCount, 1)
  listeners.get('touchstart')({ touches: [{ clientX: 380, clientY: 240 }] })
  listeners.get('touchend')({ changedTouches: [{ clientX: 280, clientY: 250 }] })
  assert.equal(backCount, 2)
})

test('异步定位不泄露给后续第三方收银页，原生罗盘自行管理传感器生命周期', () => {
  assert.match(page, /onHide\(\(\) => \{[\s\S]*?legacyPageVisible = false[\s\S]*?locationRequestId \+= 1/u)
  assert.match(page, /requestId !== locationRequestId[\s\S]*?child\.getURL\?\.\(\) !== requestUrl/u)
  assert.match(page, /child\.addEventListener\?\.\('loading', \(\) => \{[\s\S]*?locationRequestId \+= 1/u)
  assert.match(page, /function evalLegacyLocation[\s\S]*?isTrustedLegacyUrl\(String\(child\.getURL/u)
  assert.doesNotMatch(page, /function evalLegacyCompass|function startLegacyCompass/u)
})

test('空链接和锚点确认控件不被兼容桥拦成不支持，外链限制仍保留', () => {
  const lateBridge = page.match(/function legacyNavigationBridgeScript\(\): string \{\s*return `([\s\S]*?)`\s*\}/u)[1]
  for (const script of [preload, lateBridge]) {
    const assigned = []
    const listeners = new Map()
    const sandbox = {
      URL,
      window: {
        location: { hostname: 'www.yrydai.cn', href: 'https://www.yrydai.cn/tool', assign: (url) => assigned.push(url) },
        history: { length: 1 },
      },
      document: { readyState: 'complete', documentElement: {}, querySelectorAll: () => [], addEventListener: (name, handler) => listeners.set(name, handler) },
    }
    vm.runInNewContext(script, sandbox)
    for (const rawHref of ['', '#', '#confirm', 'javascript:void(0)', 'javascript:;']) {
      let prevented = false
      let selectionSaved = false
      listeners.get('click')({
        target: { tagName: 'SPAN', parentNode: { tagName: 'A', href: new URL(rawHref, sandbox.window.location.href).href, getAttribute: (name) => name === 'href' ? rawHref : '_self' } },
        preventDefault: () => { prevented = true },
      })
      // 模拟选择器既有确认处理器，兼容桥不得改写它的状态或导航。
      if (!prevented) selectionSaved = true
      assert.equal(selectionSaved, true, rawHref)
      assert.deepEqual(assigned, [])
    }
    let blocked = false
    listeners.get('click')({
      target: { tagName: 'A', href: 'https://untrusted.example/pay', getAttribute: () => 'https://untrusted.example/pay' },
      preventDefault: () => { blocked = true },
    })
    assert.equal(blocked, true)
    assert.deepEqual(assigned, ['rebu://unsupported'])
  }
})

test('原生罗盘并行监听 uni 与 HTML5+，且离页清理两条数据源', () => {
  assert.match(nativeCompass, /uni\.onCompassChange\(mpHandler\)/u)
  assert.match(nativeCompass, /orientation\.watchOrientation/u)
  assert.match(nativeCompass, /magneticHeading[\s\S]*trueHeading[\s\S]*alpha/u)
  assert.match(nativeCompass, /u\.offCompassChange\?\.\(mpHandler\)/u)
  assert.match(nativeCompass, /orientation\?\.clearWatch\?\.\(appOrientationWatchId\)/u)
  assert.match(nativeCompass, /if \(!gotReading\) opts\.onStatus\('unavailable'\)/u)
})

test('小程序构建排除 App 原生预载桥，不删其他运行时静态文件', () => {
  const temporaryRoot = fs.mkdtempSync(join(tmpdir(), 'rebu-mp-app-bridge-'))
  const staticRoot = join(temporaryRoot, 'dist/build/mp-weixin/static')
  try {
    fs.mkdirSync(staticRoot, { recursive: true })
    fs.writeFileSync(join(staticRoot, 'legacy-paipan-preload.js'), preload)
    fs.writeFileSync(join(staticRoot, 'keep.js'), 'window.keep = true')
    execFileSync(process.execPath, [resolve('apps/mobile/scripts/prune-mp-static.mjs')], { cwd: temporaryRoot })
    assert.equal(fs.existsSync(join(staticRoot, 'legacy-paipan-preload.js')), false)
    assert.equal(fs.readFileSync(join(staticRoot, 'keep.js'), 'utf8'), 'window.keep = true')
    assert.equal(fs.readFileSync('apps/mobile/src/static/legacy-paipan-preload.js', 'utf8'), preload)
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true })
  }
})

test('Android 短视频原生播放器不吞掉上下翻页手势', () => {
  assert.match(videoPage, /:enable-play-gesture="false"/u)
  assert.match(videoPage, /@touchstart\.stop="onPressStart"/u)
  assert.match(videoPage, /@touchmove\.stop="onPressMove"/u)
  assert.match(videoPage, /@touchend\.stop="onPressEnd"/u)
  assert.match(videoPage, /Math\.abs\(dy\) >= 56/u)
  assert.match(videoPage, /\(swipeStartIndex \+ delta \+ count\) % count/u)
  assert.match(videoPage, /currentIndex\.value === swipeStartIndex/u)
})
