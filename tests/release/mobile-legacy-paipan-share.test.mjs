import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import test from 'node:test'

const source = fs.readFileSync('apps/mobile/src/lib/legacy-paipan-share.ts', 'utf8')
const page = fs.readFileSync('apps/mobile/src/pkg-common/legacy-paipan/index.vue', 'utf8')
const preload = fs.readFileSync('apps/mobile/src/static/legacy-paipan-preload.js', 'utf8')
const ts = createRequire(resolve('apps/mobile/package.json'))('typescript')
const compile = (text, base = 'https://api.rebugx.cn/h5/') => ts.transpileModule(text.replaceAll('import.meta.env.VITE_PUBLIC_H5_URL', JSON.stringify(base)), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText

test('分享入口绑定构建环境，缺失配置阻断，不采信网页跨环境入口', () => {
  for (const base of ['https://pre-api.rebugx.cn/h5/', 'https://api.rebugx.cn/h5/']) {
    const exports = {}
    vm.runInNewContext(compile(source, base), { exports })
    const expected = base + 'pages/paipan/index'
    assert.equal(exports.PUBLIC_PAIPAN_SHARE_URL, expected)
    const other = base.includes('pre-api') ? 'https://api.rebugx.cn/h5/pages/paipan/index' : 'https://pre-api.rebugx.cn/h5/pages/paipan/index'
    assert.equal(exports.publicLegacyShareUrl(other), '')
    assert.equal(exports.parseLegacyShareBridgeUrl(bridgeUrl({ kind: 'page', url: other })).url, expected)
  }
  for (const base of ['', 'http://example.com/h5', 'https://user:pass@example.com/h5', 'https://example.com/h5?token=secret']) {
    assert.throws(() => vm.runInNewContext(compile(source, base), { exports: {} }), /PUBLIC_H5_SHARE_CONFIG_INVALID/)
  }
})
const bridgeUrl = data => 'rebu://legacy-share?payload=' + encodeURIComponent(JSON.stringify(data))
const plain = value => JSON.parse(JSON.stringify(value))
const fixture = () => ({ kind: 'page', title: '八字排盘', text: '测试分享', url: '', imageUrl: '' })

// 仅使用合成页面/图片，所有原生 SDK 都是内存桩，不连接手机、不外发、不保存真实照片。
function runtime(overrides = {}, plusOverrides = {}, clock = Date) {
  const calls = []
  const uni = {
    getSystemInfoSync: () => ({ platform: 'android' }),
    showActionSheet: o => { calls.push(['menu', o.itemList]); o.success({ tapIndex: 0 }) },
    showModal: o => { calls.push(['confirm']); o.success({ confirm: true }) },
    share: o => { calls.push(['share', o]); o.success() },
    setClipboardData: o => { calls.push(['copy', o.data]); o.success() },
    saveImageToPhotosAlbum: o => { calls.push(['save', o.filePath]); o.success() },
    downloadFile: o => { calls.push(['download', o]); o.success({ statusCode: 200, tempFilePath: '_doc/fixture-download.jpg' }) },
    getFileInfo: o => o.success({ size: 1024 }),
    getImageInfo: o => o.success({ width: 600, height: 800 }),
    ...overrides,
  }
  const plus = {
    io: { resolveLocalFileSystemURL: (path, ok) => ok({ isFile: true, remove: ok => { calls.push(['remove', path]); ok() } }) },
    nativeObj: { Bitmap: class { save(_path, _options, ok) { calls.push(['bitmap-save']); ok() } recycle() { calls.push(['recycle']) } } },
    ...plusOverrides,
    share: {
      getServices: ok => { calls.push(['services']); ok([{ id: 'weixin', nativeClient: true }]) },
      sendWithSystem: (message, ok) => { calls.push(['system', message]); ok() },
      ...plusOverrides.share,
    },
  }
  const exports = {}
  vm.runInNewContext(compile(source), { exports, uni, plus, setTimeout, clearTimeout, Date: clock })
  const options = {
    canProceed: () => true,
    capture: async () => { calls.push(['capture']); return '_doc/fixture-capture.jpg' },
  }
  return { api: exports, calls, options }
}

test('海报交接一次性消费且只承载过滤后的公开链接', () => {
  const { api } = runtime()
  const input = { ...fixture(), url: 'https://www.yrydai.cn/share.php?shareId=fixture-1' }
  assert.equal(api.stageLegacyPoster(input), true)
  input.url = 'https://evil.example/'
  assert.equal(api.consumeLegacyPoster().url, 'https://www.yrydai.cn/share.php?shareId=fixture-1')
  assert.equal(api.consumeLegacyPoster(), null)
})

test('海报交接到期即清除，不允许重复打开复用旧内容', () => {
  let now = 1000
  const { api } = runtime({}, {}, { now: () => now })
  api.stageLegacyPoster(fixture())
  now += 15_000
  assert.equal(api.consumeLegacyPoster(), null)
  assert.equal(api.consumeLegacyPoster(), null)
})

test('海报菜单真实导航且URL不携带内容，绝不截图、复制或自动外发', async () => {
  let route
  const { api, calls, options } = runtime({
    showActionSheet: o => o.success({ tapIndex: o.itemList.findIndex(item => item === '生成页面二维码海报') }),
    navigateTo: o => { route = o.url; o.success() },
  })
  const url = 'https://www.yrydai.cn/share.php?shareId=fixture-1'
  assert.equal(await api.shareLegacyPaipan({ ...fixture(), url }, options), 'requested')
  assert.equal(route, '/pkg-circle/common/share-poster/index?source=paipan')
  assert.equal(api.consumeLegacyPoster().url, url)
  assert.equal(calls.some(c => ['capture', 'share', 'save', 'copy', 'download'].includes(c[0])), false)
})

test('海报导航失败清理交接，失败后可重新请求且换页不再打开', async () => {
  let count = 0
  const { api, options } = runtime({
    showActionSheet: o => o.success({ tapIndex: o.itemList.findIndex(item => /二维码海报/.test(item)) }),
    navigateTo: o => { count++; o.fail({ errMsg: 'navigateTo:fail' }) },
  })
  for (let i = 0; i < 2; i++) {
    await assert.rejects(api.shareLegacyPaipan({ ...fixture(), url: api.PUBLIC_PAIPAN_SHARE_URL }, options), /分享未完成/)
    assert.equal(api.consumeLegacyPoster(), null)
  }
  assert.equal(count, 2)
  options.canProceed = () => false
  await assert.rejects(api.shareLegacyPaipan({ ...fixture(), url: api.PUBLIC_PAIPAN_SHARE_URL }, options))
  assert.equal(count, 2)
})

test('私有结果海报只能明确回落工具入口，不泄露摘要或签名', () => {
  const { api } = runtime()
  api.stageLegacyPoster({ ...fixture(), title: '私人结果', text: '出生资料', url: 'https://www.yrydai.cn/guoxueApp.php?key=SECRET' })
  const payload = api.consumeLegacyPoster()
  assert.equal(payload.isToolEntry, true)
  assert.match(payload.description, /不包含当前排盘结果/)
  assert.doesNotMatch(JSON.stringify(payload), /SECRET|私人|出生/)
  api.stageLegacyPoster(fixture())
  assert.equal(api.stageLegacyPoster({ ...fixture(), kind: 'save' }), false)
  assert.equal(api.consumeLegacyPoster(), null)
})

test('原版工具分享仅转换已知路径，双桥与原生过滤一致且不改变参数', () => {
  const { api } = runtime()
  const late = page.match(/function legacyNavigationBridgeScript\(\): string \{\s*return `([\s\S]*?)`\s*\}/u)[1]
  const examples = [
    ['https://www.yrydai.cn/app_tool.php?id=app_fixture', 'https://www.yrydai.cn/tool.php?id=app_fixture'],
    ['https://www.yrydai.cn/tool.php?id=app_fixture', 'https://www.yrydai.cn/tool.php?id=app_fixture'],
    ['https://www.yrydai.cn/app_unknown.php?id=fixture', 'https://www.yrydai.cn/app_unknown.php?id=fixture'],
    ['https://www.yrydai.cn/app_tool.php?token=SECRET', ''],
    ['https://www.yrydai.cn/app_tool.php?mod=index&act=bazi', ''],
    ['https://www.yrydai.cn/app_login.php?id=fixture', ''],
  ]
  assert.equal(api.publicLegacyShareUrl('https://www.yrydai.cn/app_tool.png', true), 'https://www.yrydai.cn/app_tool.png')
  for (const [href, expected] of examples) {
    assert.equal(api.publicLegacyShareUrl(href), expected)
    for (const script of [preload, late]) {
      for (const method of ['shareWX', 'sharePicture']) {
        const assigned = []
        const window = { location: { hostname: 'www.yrydai.cn', href, assign: value => assigned.push(value) }, history: { length: 1 } }
        vm.runInNewContext(script, { URL, window, document: { documentElement: {}, querySelectorAll: () => [], addEventListener() {}, readyState: 'complete' } })
        if (method === 'shareWX') window.webviewJS.shareWX(2, 0, '', '合成测试', '合成摘要')
        else window.webviewJS.sharePicture('https://www.yrydai.cn/share.png')
        const result = api.parseLegacyShareBridgeUrl(assigned.at(-1))
        assert.equal(result.url, expected || api.PUBLIC_PAIPAN_SHARE_URL)
        assert.doesNotMatch(JSON.stringify(result), /SECRET/)
      }
    }
  }
})

test('图片分享双桥保留合规页面链接，私有会话仍不转发', () => {
  const { api } = runtime()
  const late = page.match(/function legacyNavigationBridgeScript\(\): string \{\s*return `([\s\S]*?)`\s*\}/u)[1]
  for (const script of [preload, late]) {
    for (const href of ['https://www.yrydai.cn/share.php?shareId=fixture-1', 'https://www.yrydai.cn/guoxueApp.php?key=SECRET']) {
      const assigned = []
      const window = { location: { hostname: 'www.yrydai.cn', href, assign: value => assigned.push(value) }, history: { length: 1 } }
      vm.runInNewContext(script, { URL, window, document: { documentElement: {}, querySelectorAll: () => [], addEventListener() {}, readyState: 'complete' } })
      window.webviewJS.sharePicture('https://www.yrydai.cn/share.png')
      const result = api.parseLegacyShareBridgeUrl(assigned.at(-1))
      assert.equal(result.url, href.includes('SECRET') ? api.PUBLIC_PAIPAN_SHARE_URL : href)
      assert.equal(result.imageUrl, 'https://www.yrydai.cn/share.png')
      assert.doesNotMatch(JSON.stringify(result), /SECRET/)
    }
  }
})

test('入口回落卡片不冒充当前结果或沿用敏感结果标题', async () => {
  const { api, calls, options } = runtime()
  const request = api.parseLegacyShareBridgeUrl(bridgeUrl({ ...fixture(), title: '某人排盘结果', text: '私人摘要' }))
  await api.shareLegacyPaipan(request, options)
  const payload = calls.find(call => call[0] === 'share')[1]
  assert.equal(payload.title, '热卜排盘工具')
  assert.match(payload.summary, /不包含当前排盘结果/)
  assert.doesNotMatch(JSON.stringify(payload), /某人|私人摘要/)
  assert.equal(calls.some(call => call[0] === 'capture'), false)
})

test('拒绝本地文件、非HTTPS、伪域名、登录签名、嵌套链接和未知查询参数', () => {
  const { api } = runtime()
  assert.equal(api.publicLegacyShareUrl('https://www.yrydai.cn/share.php?id=abc-123'), 'https://www.yrydai.cn/share.php?id=abc-123')
  for (const url of [
    'file:///private/photo.jpg', 'data:image/png;base64,AAAA', 'javascript:alert(1)',
    'http://www.yrydai.cn/share.php?id=1', 'https://www.yrydai.cn.evil.example/share.php',
    'https://www.yrydai.cn@evil.example/share.php', 'https://www.yrydai.cn:443/share.php',
    'https://www.yrydai.cn/guoxueApp.php?key=SECRET', 'https://www.yrydai.cn/my.php?mod=member',
    'https://www.yrydai.cn/share.php?token=SECRET', 'https://www.yrydai.cn/share.php?id=1&sign=SECRET',
    'https://www.yrydai.cn/share.php?id=https%3A%2F%2Fevil.example',
    'https://www.yrydai.cn/share.php?id=1&id=2', 'https://www.yrydai.cn/a/../login.php',
    'https://www.yrydai.cn/%2e%2e/login.php', 'https://www.yrydai.cn/share.php#token=SECRET',
  ]) assert.equal(api.publicLegacyShareUrl(url), '', url)
})

test('桥参数尺寸/结构受限，元信息不能携带登录链接，图片不能指定本机文件', () => {
  const { api } = runtime()
  assert.equal(api.parseLegacyShareBridgeUrl(bridgeUrl({ ...fixture(), imageUrl: 'file:///private/a.jpg', kind: 'image' })), null)
  assert.equal(api.parseLegacyShareBridgeUrl(bridgeUrl([])), null)
  assert.equal(api.parseLegacyShareBridgeUrl(bridgeUrl({ ...fixture(), kind: 'unknown' })), null)
  assert.equal(api.parseLegacyShareBridgeUrl(bridgeUrl(fixture()) + '&extra=1'), null)
  assert.equal(api.parseLegacyShareBridgeUrl('rebu://legacy-share?payload=%'), null)
  assert.equal(api.parseLegacyShareBridgeUrl(bridgeUrl({ ...fixture(), text: 'a'.repeat(25000) })), null)
  const result = api.parseLegacyShareBridgeUrl(bridgeUrl({ ...fixture(), title: 'https://www.yrydai.cn/?token=SECRET', text: 'access_token=SECRET', url: 'https://www.yrydai.cn/guoxueApp.php?key=SECRET' }))
  assert.equal(result.url, 'https://api.rebugx.cn/h5/pages/paipan/index')
  assert.doesNotMatch(JSON.stringify(result), /SECRET|access_token/u)
  const printable = api.parseLegacyShareBridgeUrl(bridgeUrl({ ...fixture(), title: '八字\u0000测试\u001f分享\u007f' }))
  assert.equal(printable.title, '八字 测试 分享')
})

test('双桥转发正确协议，不把旧APK的类型/场景/小程序ID错当链接', () => {
  const { api } = runtime()
  const late = page.match(/function legacyNavigationBridgeScript\(\): string \{\s*return `([\s\S]*?)`\s*\}/u)[1]
  for (const script of [preload, late]) {
    const assigned = []
    const window = { location: { hostname: 'www.yrydai.cn', href: 'https://www.yrydai.cn/guoxueApp.php?key=SECRET', assign: u => assigned.push(u) }, history: { length: 1 } }
    vm.runInNewContext(script, { URL, window, document: { documentElement: {}, querySelectorAll: () => [], addEventListener: () => {}, readyState: 'complete' } })
    window.webviewJS.shareWX(1, 2, 'gh_fixture', '八字', '测试')
    assert.doesNotMatch(assigned.at(-1), /SECRET|guoxueApp|key/u)
    let result = api.parseLegacyShareBridgeUrl(assigned.at(-1))
    assert.equal(result.title, '八字')
    assert.equal(result.url, 'https://api.rebugx.cn/h5/pages/paipan/index')
    assert.equal(result.kind, 'page')
    window.webUni.postMessage({ data: { action: 'share', payload: { title: '奇门', remark: '说明', path: 'https://www.yrydai.cn/share.php?id=1', shareImgUrl: 'https://www.yrydai.cn/images/result.jpg' } } })
    result = api.parseLegacyShareBridgeUrl(assigned.at(-1))
    assert.equal(result.title, '奇门')
    assert.equal(result.text, '说明')
    assert.equal(result.imageUrl, 'https://www.yrydai.cn/images/result.jpg')
    window.webkit.messageHandlers.shareWX.postMessage([3, 0, '', '测试标题', '描述'])
    assert.equal(api.parseLegacyShareBridgeUrl(assigned.at(-1)).title, '测试标题')
    window.webviewJS.sharePicture('https://www.yrydai.cn/images/result.jpg', 0)
    assert.equal(api.parseLegacyShareBridgeUrl(assigned.at(-1)).kind, 'image')
    window.webkit.messageHandlers.savePicture.postMessage('https://www.yrydai.cn/images/result.jpg')
    assert.equal(api.parseLegacyShareBridgeUrl(assigned.at(-1)).kind, 'save')
    assert.equal(assigned.some(x => x === 'rebu://unsupported'), false)
    window.webUni.postMessage({ action: 'share', payload: { path: 'https://www.yrydai.cn/share.php?token=SECRET', remark: 'key=SECRET', title: 'https://www.yrydai.cn/?token=SECRET' } })
    assert.doesNotMatch(decodeURIComponent(assigned.at(-1)), /SECRET|token=|key=/u, '敏感字段在进入自定义scheme之前即被丢弃')
  }
  assert.match(page, /action === 'legacy-share'\) void requestLegacyShare\(url, child\)/u)
})

for (const platform of ['ios', 'android']) {
  test(`${platform} 缺少结果链接时明确区分工具入口卡片与当前页图片`, async () => {
    const { api, calls, options } = runtime({
      getSystemInfoSync: () => ({ platform }),
      showActionSheet: o => {
        calls.push(['menu', o.itemList])
        o.success({ tapIndex: 2 })
      },
    })
    const request = api.parseLegacyShareBridgeUrl(bridgeUrl({ ...fixture(), kind: 'image' }))
    assert.equal(await api.shareLegacyPaipan(request, options), 'requested')
    assert.deepEqual(calls.map(x => x[0]), ['services', 'menu', 'capture', 'share', 'remove'])
    assert.deepEqual(plain(calls.find(x => x[0] === 'menu')[1].slice(0, 4)), [
      '微信好友（工具入口）', '朋友圈（工具入口）',
      '微信好友（当前页图片）', '朋友圈（当前页图片）',
    ])
    const native = calls.find(x => x[0] === 'share')[1]
    assert.equal(native.provider, 'weixin')
    assert.equal(native.scene, 'WXSceneSession')
    assert.equal(native.type, 2)
    assert.equal(native.href, undefined)
    assert.equal(native.imageUrl, '_doc/fixture-capture.jpg')
  })
}

test('取消菜单和取消微信均不复制、不保存、不换渠道或重试', async () => {
  for (const overrides of [
    { showActionSheet: o => o.fail({ errMsg: 'showActionSheet:fail cancel' }) },
    { share: o => o.fail({ errCode: -2 }) },
  ]) {
    const { api, calls, options } = runtime(overrides)
    assert.equal(await api.shareLegacyPaipan(fixture(), options), 'cancelled')
    assert.equal(calls.some(x => ['copy', 'save', 'system', 'download'].includes(x[0])), false)
  }
  assert.match(source, /setClipboardData/u)
  assert.doesNotMatch(source, /setStorage|console\./u)
})

test('复制完整 H5 链接是独立用户动作，不依赖微信 SDK 或截图', async () => {
  const { api, calls, options } = runtime({ showActionSheet: o => o.success({ tapIndex: 6 }) })
  const request = api.parseLegacyShareBridgeUrl(bridgeUrl(fixture()))
  assert.equal(await api.shareLegacyPaipan(request, options), 'copied')
  assert.deepEqual(calls.find(x => x[0] === 'copy'), ['copy', 'https://api.rebugx.cn/h5/pages/paipan/index'])
  assert.equal(calls.some(x => ['capture', 'share', 'save', 'system'].includes(x[0])), false)
})

test('公开链接使用系统支持的text类型，不生成图片、不带网页签名', async () => {
  const { api, calls, options } = runtime({ showActionSheet: o => o.success({ tapIndex: 5 }) })
  const request = api.parseLegacyShareBridgeUrl(bridgeUrl({ ...fixture(), url: 'https://www.yrydai.cn/share.php?id=1' }))
  assert.equal(await api.shareLegacyPaipan(request, options), 'requested')
  const message = calls.find(x => x[0] === 'system')[1]
  assert.equal(message.type, 'text')
  assert.equal(message.href, request.url)
  assert.equal(calls.some(x => ['capture', 'share', 'save'].includes(x[0])), false)
})

test('公开页面优先提供微信好友和朋友圈可打开网页，不把截图冒充页面分享', async () => {
  for (const [tapIndex, scene] of [[0, 'WXSceneSession'], [1, 'WXSceneTimeline']]) {
    const { api, calls, options } = runtime({ showActionSheet: o => o.success({ tapIndex }) })
    const request = api.parseLegacyShareBridgeUrl(bridgeUrl({ ...fixture(), url: 'https://api.rebugx.cn/h5/pages/paipan/index' }))
    assert.equal(await api.shareLegacyPaipan(request, options), 'requested')
    const native = calls.find(x => x[0] === 'share')[1]
    assert.equal(native.type, 0)
    assert.equal(native.scene, scene)
    assert.equal(native.href, request.url)
    assert.equal(native.imageUrl, '/static/logo.webp')
    assert.equal(calls.some(x => ['capture', 'save', 'system'].includes(x[0])), false)
  }
})

test('旧页面不传链接时仍回落到可打开的正式 H5 排盘入口', async () => {
  const { api, calls, options } = runtime()
  const request = api.parseLegacyShareBridgeUrl(bridgeUrl(fixture()))
  assert.equal(request.url, 'https://api.rebugx.cn/h5/pages/paipan/index')
  assert.equal(await api.shareLegacyPaipan(request, options), 'requested')
  const menu = calls.find(x => x[0] === 'menu')[1]
  assert.deepEqual(plain(menu.slice(0, 2)), ['微信好友（工具入口）', '朋友圈（工具入口）'])
  const native = calls.find(x => x[0] === 'share')[1]
  assert.equal(native.type, 0)
  assert.equal(native.href, request.url)
})

test('旧页面调用图片桥时不再只能分享图片', async () => {
  const { api, calls, options } = runtime()
  const request = api.parseLegacyShareBridgeUrl(bridgeUrl({ ...fixture(), kind: 'image' }))
  assert.equal(request.url, 'https://api.rebugx.cn/h5/pages/paipan/index')
  assert.equal(await api.shareLegacyPaipan(request, options), 'requested')
  assert.deepEqual(plain(calls.find(x => x[0] === 'menu')[1].slice(0, 2)), ['微信好友（工具入口）', '朋友圈（工具入口）'])
  const native = calls.find(x => x[0] === 'share')[1]
  assert.equal(native.type, 0)
  assert.equal(native.href, request.url)
})

test('微信未安装或能力检测失败时隐藏微信入口，取消时不截图或改权限', async () => {
  for (const getServices of [
    ok => ok([]),
    ok => ok([{ id: 'weixin', nativeClient: false }]),
    ok => ok([{ id: 'weixin' }]),
    (_ok, fail) => fail({ message: 'fixture failed' }),
  ]) {
    let items
    const { api, calls, options } = runtime({
      showActionSheet: o => { items = o.itemList; o.fail({ errMsg: 'cancel' }) },
    }, { share: { getServices } })
    assert.equal(await api.shareLegacyPaipan(fixture(), options), 'cancelled')
    assert.deepEqual(plain(items), ['保存当前页图片'])
    assert.equal(calls.some(x => ['capture', 'share', 'download', 'save'].includes(x[0])), false)
  }
  assert.doesNotMatch(source, /openSetting|authorize\(|requestPermissions/u)
})

test('未安装微信仍可由用户主动选择保存或系统链接，菜单索引不会串渠道', async () => {
  for (const action of ['save', 'link']) {
    const { api, calls, options } = runtime({ showActionSheet: o => o.success({ tapIndex: action === 'save' ? 0 : 1 }) }, {
      share: { getServices: ok => ok([{ id: 'weixin', nativeClient: false }]) },
    })
    const request = api.parseLegacyShareBridgeUrl(bridgeUrl({ ...fixture(), url: 'https://www.yrydai.cn/share.php?id=1' }))
    assert.equal(await api.shareLegacyPaipan(request, options), action === 'save' ? 'saved' : 'requested')
    assert.equal(calls.some(x => x[0] === 'share'), false)
    assert.equal(calls.some(x => x[0] === 'save'), action === 'save')
    assert.equal(calls.some(x => x[0] === 'system'), action === 'link')
  }
})

test('保存图片必须二次确认，取消时没有文件或相册写入', async () => {
  const { api, calls, options } = runtime({ showModal: o => o.success({ confirm: false }) })
  assert.equal(await api.shareLegacyPaipan({ ...fixture(), kind: 'save' }, options), 'cancelled')
  assert.equal(calls.length, 0)
  const accepted = runtime()
  assert.equal(await accepted.api.shareLegacyPaipan({ ...fixture(), kind: 'save' }, accepted.options), 'saved')
  assert.deepEqual(accepted.calls.map(x => x[0]), ['confirm', 'capture', 'save', 'remove'])
})

test('图片仅用受信公开地址，下载不携带账号Token并验证大小/像素', async () => {
  const { api, calls, options } = runtime({ showActionSheet: o => { calls.push(['menu', o.itemList]); o.success({ tapIndex: 2 }) } })
  const request = api.parseLegacyShareBridgeUrl(bridgeUrl({ ...fixture(), kind: 'image', imageUrl: 'https://www.yrydai.cn/images/test.jpg' }))
  assert.equal(await api.shareLegacyPaipan(request, options), 'requested')
  const download = calls.find(x => x[0] === 'download')[1]
  assert.deepEqual(plain(download.header), { Accept: 'image/*' })
  assert.equal(calls.some(x => x[0] === 'capture'), false)
  for (const overrides of [
    { downloadFile: o => o.success({ statusCode: 404, tempFilePath: '_doc/fixture.jpg' }) },
    { getFileInfo: o => o.success({ size: 10 * 1024 * 1024 }) },
    { getImageInfo: o => o.success({ width: 100000, height: 100000 }) },
  ]) {
    const failed = runtime({ ...overrides, showActionSheet: o => o.success({ tapIndex: 2 }) })
    await assert.rejects(failed.api.shareLegacyPaipan(request, failed.options), e => e.code === 'IMAGE_FAILED')
    assert.equal(failed.calls.some(x => x[0] === 'share'), false)
    assert.equal(failed.calls.filter(x => x[0] === 'remove').length, 1)
  }
})

test('快速重复请求互斥；等待菜单期间换页，不截图或分享', async () => {
  let choose
  let current = true
  const { api, calls, options } = runtime({ showActionSheet: o => { choose = o.success } })
  options.canProceed = () => current
  const first = api.shareLegacyPaipan(fixture(), options)
  await assert.rejects(api.shareLegacyPaipan(fixture(), options), e => e.code === 'BUSY')
  current = false
  choose({ tapIndex: 0 })
  await assert.rejects(first, e => e.code === 'STALE_PAGE')
  assert.deepEqual(calls.map(x => x[0]), ['services'])
})

test('能力检测期间页面已离开，不在其他页面弹出分享菜单', async () => {
  let resolveServices
  let current = true
  const { api, calls, options } = runtime({}, { share: { getServices: ok => { resolveServices = ok } } })
  options.canProceed = () => current
  const pending = api.shareLegacyPaipan(fixture(), options)
  current = false
  resolveServices([{ id: 'weixin', nativeClient: true }])
  await assert.rejects(pending, e => e.code === 'STALE_PAGE')
  assert.equal(calls.length, 0)
})

test('当前页截图也校验文件大小及像素，超限不分享或保存且清理本次图片', async () => {
  for (const overrides of [
    { getFileInfo: o => o.success({ size: 9 * 1024 * 1024 }) },
    { getImageInfo: o => o.success({ width: 100000, height: 100000 }) },
    { getFileInfo: o => o.success({ size: 0 }) },
  ]) {
    const { api, calls, options } = runtime(overrides)
    await assert.rejects(api.shareLegacyPaipan(fixture(), options), e => e.code === 'IMAGE_FAILED')
    assert.equal(calls.some(x => ['share', 'save'].includes(x[0])), false)
    assert.equal(calls.filter(x => x[0] === 'remove').length, 1)
  }
})

test('图片完成后换页立即终止并清理，仅截请求对应的子WebView', async () => {
  const { api, calls, options } = runtime()
  let current = true
  options.canProceed = () => current
  options.capture = async () => { current = false; return '_doc/fixture-stale.jpg' }
  await assert.rejects(api.shareLegacyPaipan(fixture(), options), e => e.code === 'STALE_PAGE')
  assert.equal(calls.some(x => x[0] === 'share'), false)
  assert.equal(calls.filter(x => x[0] === 'remove').length, 1)
  assert.match(page, /captureLegacyShareImage\(child, canProceed\)/u)
  assert.match(page, /documentVersion === legacyDocumentVersion/u)
})

test('截图成功回收Bitmap，失败不伪报成功、不截全局其他页面', async () => {
  const { api, calls } = runtime()
  const path = await api.captureLegacyShareImage({ draw: (_bitmap, ok) => { calls.push(['draw']); ok() } }, () => true)
  assert.match(path, /^_doc\/rebu-legacy-share-[A-Za-z0-9-]+\.jpg$/u)
  assert.deepEqual(calls.map(x => x[0]), ['draw', 'bitmap-save', 'recycle'])
  await assert.rejects(api.captureLegacyShareImage({ draw: (_b, _ok, fail) => fail() }, () => true), e => e.code === 'IMAGE_FAILED')
  assert.doesNotMatch(source, /currentWebview|getLaunchWebview|payOk|shareOk|award|reward/u)
})

test('iOS 提供仅添加相册的具体用途说明，不为分享申请读取整个相册权限', () => {
  const distribution = JSON.parse(fs.readFileSync('apps/mobile/src/manifest.json', 'utf8'))['app-plus'].distribute
  assert.match(distribution.ios.privacyDescription.NSPhotoLibraryAddUsageDescription, /主动点击保存图片/u)
  assert.match(distribution.ios.privacyDescription.NSPhotoLibraryAddUsageDescription, /不读取/u)
  assert.equal(distribution.ios.privacyDescription.NSPhotoLibraryUsageDescription, undefined)
  assert.equal(distribution.android.permissions.some(value => /READ_MEDIA_IMAGES|READ_EXTERNAL_STORAGE/u.test(value)), false)
})

function sharePageHarness(share) {
  const actions = []
  const { api } = runtime()
  const child = { getURL: () => 'https://www.yrydai.cn/paipan.php' }
  const context = {
    legacyChildWebview: child, legacyPageVisible: true, legacyDocumentVersion: 1, legacyShareBusy: false,
    parseLegacyShareBridgeUrl: api.parseLegacyShareBridgeUrl,
    LegacyShareError: api.LegacyShareError,
    isTrustedLegacyUrl: url => url.startsWith('https://www.yrydai.cn/'),
    shareLegacyPaipan: share,
    captureLegacyShareImage: async (target, canProceed) => {
      assert.equal(target, child)
      assert.equal(canProceed(), true)
      actions.push(['capture'])
      return '_doc/page-fixture.jpg'
    },
    uni: { showToast: options => actions.push(['toast', options.title]) },
  }
  vm.createContext(context)
  vm.runInContext(compile(page.slice(page.indexOf('async function requestLegacyShare'), page.indexOf('function bindLegacyChildWebview'))), context)
  return { context, child, actions }
}

test('页面分享只接受当前可见受信子窗口，畸形请求不进入原生层', async () => {
  let attempts = 0
  const { context, child } = sharePageHarness(async () => { attempts += 1; return 'requested' })
  const url = bridgeUrl(fixture())
  await context.requestLegacyShare(url, {})
  context.legacyPageVisible = false
  await context.requestLegacyShare(url, child)
  context.legacyPageVisible = true
  await context.requestLegacyShare('rebu://legacy-share?payload=%', child)
  child.getURL = () => 'https://untrusted.example/'
  await context.requestLegacyShare(url, child)
  child.getURL = () => { throw new Error('fixture closed') }
  await context.requestLegacyShare(url, child)
  assert.equal(attempts, 0)
})

test('页面请求互斥，截图绑定原窗口；仅实际保存成功显示相册提示', async () => {
  for (const outcome of ['requested', 'cancelled', 'saved']) {
    let complete
    let attempts = 0
    const { context, child, actions } = sharePageHarness(async (_request, options) => {
      attempts += 1
      assert.equal(await options.capture(), '_doc/page-fixture.jpg')
      return new Promise(resolve => { complete = resolve })
    })
    const pending = context.requestLegacyShare(bridgeUrl(fixture()), child)
    await context.requestLegacyShare(bridgeUrl(fixture()), child)
    assert.equal(attempts, 1)
    complete(outcome)
    await pending
    assert.equal(context.legacyShareBusy, false)
    assert.equal(actions.filter(action => action[0] === 'toast').length, outcome === 'saved' ? 1 : 0)
    if (outcome === 'saved') assert.match(actions.at(-1)[1], /已保存到相册/u)
  }
})

test('等待分享期间切页、同URL重载、隐藏或关闭窗口后不把结果反馈到别的页面', async () => {
  for (const change of [
    context => { context.legacyDocumentVersion += 1 },
    (_context, child) => { child.getURL = () => 'https://www.yrydai.cn/other.php' },
    context => { context.legacyChildWebview = {} },
    context => { context.legacyPageVisible = false },
    (_context, child) => { child.getURL = () => { throw new Error('fixture closed') } },
  ]) {
    for (const result of ['saved', 'error']) {
      let complete
      let options
      const { context, child, actions } = sharePageHarness((_request, value) => {
        options = value
        return new Promise((resolve, reject) => { complete = () => result === 'saved' ? resolve('saved') : reject(new Error('fixture')) })
      })
      const pending = context.requestLegacyShare(bridgeUrl(fixture()), child)
      assert.equal(options.canProceed(), true)
      change(context, child)
      assert.equal(options.canProceed(), false)
      complete()
      await pending
      assert.equal(actions.length, 0)
      assert.equal(context.legacyShareBusy, false)
    }
  }
})
