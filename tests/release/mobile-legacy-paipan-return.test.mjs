import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const page = fs.readFileSync('apps/mobile/src/pkg-common/legacy-paipan/index.vue', 'utf8')
const paipanPage = fs.readFileSync('apps/mobile/src/pages/paipan/index.vue', 'utf8')
const legacyData = fs.readFileSync('apps/mobile/src/lib/legacy-paipan-data.ts', 'utf8')
const pages = fs.readFileSync('apps/mobile/src/pages.json', 'utf8')
const videoPage = fs.readFileSync('apps/mobile/src/pkg-video/detail/index.vue', 'utf8')

test('H5 旧排盘由用户手势新窗口打开并保留可见返回入口', () => {
  assert.match(page, /window\.open\('', '_blank'\)/u)
  assert.match(page, /opened\.opener = null/u)
  assert.match(page, /opened\.location\.replace\(legacyUrl\.value\)/u)
  assert.match(page, /window\.location\.assign\(legacyUrl\.value\)/u)
  assert.doesNotMatch(page, /window\.location\.replace\(entry\.url\)/u)
  assert.match(page, />返回热卜首页</u)
})

test('App 与小程序排盘工具使用统一标题、默认原生导航安全区、硬件返回和受控消息桥', () => {
  assert.match(pages, /"path": "legacy-paipan\/index"[\s\S]*?"navigationBarTitleText": "排盘工具"/u)
  const routeConfig = pages.slice(pages.indexOf('"path": "legacy-paipan/index"'), pages.indexOf('"path": "legacy-paipan/index"') + 320)
  assert.doesNotMatch(routeConfig, /"navigationStyle": "custom"/u)
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
  assert.match(page, /window\.location\.assign\(url\)/u)
  assert.match(page, /child\.evalJS\(legacyNavigationBridgeScript\(\)\)/u)
  assert.match(page, /\$scope\?\.\$getAppWebview\?\.\(\)/u)
  assert.match(page, /page\?\.\$getAppWebview\?\.\(\)/u)
  assert.doesNotMatch(page, /plus\.webview\.currentWebview\(\)/u)
  assert.match(page, /child\.addEventListener\?\.\('loading', reinject\)/u)
  assert.match(page, /child\.addEventListener\?\.\('loaded', reinject\)/u)
  assert.match(page, /\[0, 250, 700, 1500, 3000, 5000, 8000, 12000\]/u)
  assert.match(page, /overrideUrlLoading/u)
  assert.match(page, /plus\.runtime\.openURL\(url\)/u)
  assert.match(page, /let legacyChildWebview: any \| null = null/u)
  assert.match(page, /legacyChildWebview = child/u)
  assert.match(page, /legacyChildWebview\.getURL\?\.\(\); return legacyChildWebview/u)
  assert.match(page, /child\.canBack/u)
  assert.match(page, /if \(event\?\.canBack\) child\.back\(\)/u)
  assert.match(page, /touch\.clientX<=24/u)
  assert.match(page, /dx>=80/u)
  assert.match(page, /window\.history\.back\(\)/u)
  assert.doesNotMatch(page, /legacy-right-back-gesture/u)
  assert.doesNotMatch(page, /rightGestureActive/u)
})

test('旧排盘兼容桥真实接管新窗口链接、表单和 iOS 左边缘返回手势', () => {
  const scriptMatch = page.match(/function legacyNavigationBridgeScript\(\): string \{\s*return `([\s\S]*?)`\s*\}/u)
  assert.ok(scriptMatch, '应能提取旧排盘桥接脚本')

  const listeners = new Map()
  const assigned = []
  const link = { tagName: 'A', href: 'https://www.yrydai.cn/tool', target: '_blank', getAttribute: () => link.target, setAttribute: (_key, value) => { link.target = value }, parentNode: null }
  const form = { tagName: 'FORM', target: '_new', getAttribute: () => form.target, setAttribute: (_key, value) => { form.target = value } }
  let backCount = 0
  const sandbox = {
    window: {
      location: { assign: (url) => assigned.push(url) },
      history: { length: 2, back: () => { backCount += 1 } },
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

  const dynamicLink = { tagName: 'A', href: 'https://www.yrydai.cn/bazi', target: '_blank', getAttribute: () => dynamicLink.target, parentNode: null }
  let prevented = false
  listeners.get('click')({ target: dynamicLink, preventDefault: () => { prevented = true } })
  assert.equal(prevented, true)
  assert.equal(assigned.at(-1), 'https://www.yrydai.cn/bazi')

  listeners.get('touchstart')({ touches: [{ clientX: 12, clientY: 240 }] })
  listeners.get('touchend')({ changedTouches: [{ clientX: 120, clientY: 250 }] })
  assert.equal(backCount, 1)
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
