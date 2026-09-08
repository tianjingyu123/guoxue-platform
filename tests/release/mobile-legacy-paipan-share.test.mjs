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
const compile = (text, base = 'https://api.rebugx.cn/h5/') => ts.transpileModule(text.replaceAll('import.meta.env.VITE_PUBLIC_H5_URL', JSON.stringify(base)).replaceAll('import.meta.env.VITE_LEGACY_BRIDGE_DIAGNOSTICS', '"false"'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText

test('诊断只保留结构和参数名，不包含第三方会话或结果参数值', () => {
  const exports = {}
  vm.runInNewContext(compile(fs.readFileSync('apps/mobile/src/lib/legacy-share-diagnostics.ts', 'utf8')), { exports })
  const value = exports.legacyShareDiagnosticShape('https://user:SECRET@www.yrydai.cn/app_result.php?token=PRIVATE&year=1990#SECRET')
  assert.deepEqual(JSON.parse(value), { protocol: 'https:', path: '/app_result.php', pathShape: '/a_a.a', keys: ['token', 'year'], hashPresent: true })
  assert.doesNotMatch(value, /SECRET|PRIVATE|1990|user|yrydai/)
  assert.doesNotMatch(exports.legacyShareDiagnosticShape('https://a.example/private-id-123?q=SECRET'), /private-id|SECRET/)
  assert.equal(JSON.parse(exports.legacyShareDiagnosticShape('https://www.yrydai.cn/app_result2.php?ruid=123456')).path, '/app_result2.php')
  assert.doesNotMatch(exports.legacyShareDiagnosticShape('https://www.yrydai.cn/app_result2.php?ruid=123456'), /123456/)
  assert.equal(JSON.parse(exports.legacyShareDiagnosticShape('https://www.yrydai.cn/user123456.php')).path, '[非固定PHP路径]')
})

test('分享入口绑定构建环境，缺失配置阻断，不采信网页跨环境入口', () => {
  for (const base of ['https://pre-api.rebugx.cn/h5/', 'https://api.rebugx.cn/h5/']) {
    const exports = {}
    vm.runInNewContext(compile(source, base), { exports })
    const expected = base + 'pages/paipan/index'
    assert.equal(exports.PUBLIC_PAIPAN_SHARE_URL, expected)
    const other = base.includes('pre-api') ? 'https://api.rebugx.cn/h5/pages/paipan/index' : 'https://pre-api.rebugx.cn/h5/pages/paipan/index'
    assert.equal(exports.publicLegacyShareUrl(other), '')
    assert.equal(exports.parseLegacyShareBridgeUrl(bridgeUrl({ kind: 'page', url: other })).url, '')
  }
  for (const base of ['', 'http://example.com/h5', 'https://user:pass@example.com/h5', 'https://example.com/h5?token=secret']) {
    assert.throws(() => vm.runInNewContext(compile(source, base), { exports: {} }), /PUBLIC_H5_SHARE_CONFIG_INVALID/)
  }
})
const bridgeUrl = data => 'rebu://legacy-share?payload=' + encodeURIComponent(JSON.stringify(data))
const plain = value => JSON.parse(JSON.stringify(value))
const fixture = () => ({ kind: 'page', title: '八字排盘', text: '测试分享', url: 'https://www.yrydai.cn/share.php?shareId=fixture-1', imageUrl: '' })

// 仅使用合成页面/图片，所有原生 SDK 都是内存桩，不连接手机、不外发、不保存真实照片。
function runtime(overrides = {}, plusOverrides = {}, clock = Date, timers = { setTimeout, clearTimeout }) {
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
  vm.runInNewContext(compile(source), { exports, uni, plus, ...timers, Date: clock })
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
    showActionSheet: o => o.success({ tapIndex: o.itemList.findIndex(item => item === '生成二维码海报') }),
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
    await assert.rejects(api.shareLegacyPaipan(fixture(), options), /分享未完成/)
    assert.equal(api.consumeLegacyPoster(), null)
  }
  assert.equal(count, 2)
  options.canProceed = () => false
  await assert.rejects(api.shareLegacyPaipan(fixture(), options))
  assert.equal(count, 2)
})

test('私有结果不得替换成首页海报，不泄露摘要或签名', () => {
  const { api } = runtime()
  api.stageLegacyPoster({ ...fixture(), title: '私人结果', text: '出生资料', url: 'https://www.yrydai.cn/guoxueApp.php?key=SECRET' })
  const payload = api.consumeLegacyPoster()
  assert.equal(payload, null)
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
    ['https://www.yrydai.cn/app_tool.php?mod=index&act=bazi', 'https://www.yrydai.cn/tool.php?mod=index&act=bazi'],
    ['https://www.yrydai.cn/app_tool.php?mod=index&act=bazi&token=SECRET', ''],
    ['https://www.yrydai.cn/app_tool.php?act=bazi&act=qimen', ''],
    ['https://www.yrydai.cn/app_login.php?id=fixture', ''],
    ['https://www.yrydai.cn/app_p1.php?mod=qimen&act=result&id=&dateTime=2026-09-07%2003%3A18%3A00&realTime=&ziXuan=0&ju=-7&type=1&ruid=123456', 'https://www.yrydai.cn/p1.php?mod=qimen&act=result&id=&dateTime=2026-09-07%2003%3A18%3A00&realTime=&ziXuan=0&ju=-7&type=1'],
    ['https://www.yrydai.cn/p1.php?dateTime=2026-09-07+03%3A18&ruid=123456', 'https://www.yrydai.cn/p1.php?dateTime=2026-09-07+03%3A18'],
    ['https://www.yrydai.cn/app_p1.php?dateTime=2026&token=SECRET', ''],
    ['https://www.yrydai.cn/app_p1.php?dateTime=2026&dateTime=2025', ''],
    ['https://www.yrydai.cn/app_p1.php?ruid=1&ruid=2', ''],
    ['https://www.yrydai.cn/app_p1.php?dateTime=%2526token%253DSECRET', ''],
    ['https://www.yrydai.cn/app_p1.php?dateTime=%', ''],
    ['https://www.yrydai.cn/app_p1.php?dateTime=2026&&ju=1', ''],
    ['https://www.yrydai.cn/app_p1.php?%72uid=1', ''],
    ['https://www.yrydai.cn/app_p1.php?ruid=abc', ''],
    ['https://www.yrydai.cn/app_p1.php?ju=-', ''],
    ['https://www.yrydai.cn/app_tool.php?dateTime=2026', ''],
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
        assert.equal(result.url, expected)
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
      assert.equal(result.url, href.includes('SECRET') ? '' : href)
      assert.equal(result.imageUrl, 'https://www.yrydai.cn/share.png')
      assert.doesNotMatch(JSON.stringify(result), /SECRET/)
    }
  }
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
  assert.equal(result.url, '')
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
    assert.equal(result.url, '')
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
test('微信无回调时返回释放分享锁，旧回调不能结束新一轮分享', async () => {
  const native = []
  const { api, options } = runtime({ share: o => native.push(o) })
  const first = api.shareLegacyPaipan(fixture(), options)
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(native.length, 1)
  api.notifyLegacyShareVisibility(true)
  await assert.rejects(api.shareLegacyPaipan(fixture(), options), e => e.code === 'BUSY')
  api.notifyLegacyShareVisibility(false)
  api.notifyLegacyShareVisibility(true)
  assert.equal(await first, 'cancelled')
  const second = api.shareLegacyPaipan(fixture(), options)
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(native.length, 2)
  native[0].success()
  await assert.rejects(api.shareLegacyPaipan(fixture(), options), e => e.code === 'BUSY')
  api.abandonLegacyShare()
  assert.equal(await second, 'cancelled')
  assert.match(page, /notifyLegacyShareVisibility\(false\)/)
  assert.match(page, /notifyLegacyShareVisibility\(true\)/)
  assert.match(page, /abandonLegacyShare\(\)/)
})

test('系统未派发返回事件且SDK无回调时超时释放，不永久显示处理中', async () => {
  const pending = new Map()
  let seq = 0
  const { api, options } = runtime({ share: () => {} }, {}, Date, {
    setTimeout: (fn, ms) => { const id = ++seq; pending.set(id, { fn, ms }); return id },
    clearTimeout: id => pending.delete(id),
  })
  const first = api.shareLegacyPaipan(fixture(), options)
  const rejected = assert.rejects(first, e => e.code === 'UNAVAILABLE')
  await new Promise(resolve => setImmediate(resolve))
  const timeout = [...pending.values()].find(timer => timer.ms === 60000)
  assert.ok(timeout)
  timeout.fn()
  await rejected
  const next = api.shareLegacyPaipan(fixture(), options)
  await new Promise(resolve => setImmediate(resolve))
  api.abandonLegacyShare()
  assert.equal(await next, 'cancelled')
})

test('最终原生外发使用公开结果地址，不回传原始App路径或推广标识', async () => {
  const { api, calls, options } = runtime()
  await api.shareLegacyPaipan({ ...fixture(), url: 'https://www.yrydai.cn/app_p1.php?dateTime=2026-09-07&ju=-7&ruid=123456' }, options)
  const sent = calls.find(call => call[0] === 'share')[1]
  assert.equal(sent.href, 'https://www.yrydai.cn/p1.php?dateTime=2026-09-07&ju=-7')
  assert.equal(sent.type, 0)
})

test('旧排盘菜单严格只有四个选项，好友和朋友圈均为当前页网页卡片', async () => {
  for (const platform of ['android', 'ios']) {
    for (const index of [0, 1]) {
      const { api, calls, options } = runtime({
        getSystemInfoSync: () => ({ platform }),
        showActionSheet: o => {
          assert.deepEqual(plain(o.itemList), ['发给微信好友', '发朋友圈', '生成二维码海报', '更多平台'])
          o.success({ tapIndex: index })
        },
      })
      const request = fixture()
      assert.equal(await api.shareLegacyPaipan(request, options), 'requested')
      const message = calls.find(c => c[0] === 'share')[1]
      assert.equal(message.type, 0)
      assert.equal(message.href, request.url)
      assert.equal(message.scene, index === 0 ? 'WXSceneSession' : 'WXSceneTimeline')
      assert.equal(calls.some(c => ['capture', 'download', 'copy', 'save', 'system'].includes(c[0])), false)
    }
  }
})

test('无当前链接、私有链接、平台首页和保存图片请求均失败停止，不降级图片', async () => {
  for (const request of [
    { ...fixture(), url: '' },
    { ...fixture(), url: 'https://www.yrydai.cn/share.php?token=secret' },
    { ...fixture(), url: 'https://api.rebugx.cn/h5/pages/paipan/index' },
    { ...fixture(), kind: 'save' },
  ]) {
    const { api, calls, options } = runtime()
    await assert.rejects(api.shareLegacyPaipan(request, options), e => e.code === 'UNAVAILABLE')
    assert.equal(calls.length, 0)
  }
})

test('原站图片桥有当前公开地址时仍只发网页，不下载图片', async () => {
  const { api, calls, options } = runtime()
  await api.shareLegacyPaipan({ ...fixture(), kind: 'image', imageUrl: 'https://www.yrydai.cn/result.jpg' }, options)
  assert.equal(calls.find(c => c[0] === 'share')[1].type, 0)
  assert.equal(calls.some(c => ['download', 'capture', 'save'].includes(c[0])), false)
})

test('更多平台未接入时明确阻断，不用系统文本或图片冒充网页卡片', async () => {
  const { api, calls, options } = runtime({ showActionSheet: o => o.success({ tapIndex: 3 }) })
  await assert.rejects(api.shareLegacyPaipan(fixture(), options), /尚未接入其他网页卡片/)
  assert.equal(calls.some(c => ['share', 'capture', 'download', 'copy', 'save', 'system'].includes(c[0])), false)
})

test('未安装微信可生成同页二维码海报，选择微信则明确失败', async () => {
  for (const index of [0, 1, 2]) {
    const { api, calls, options } = runtime({
      showActionSheet: o => o.success({ tapIndex: index }),
      navigateTo: o => { calls.push(['poster', o.url]); o.success() },
    }, { share: { getServices: ok => ok([]) } })
    if (index === 2) {
      assert.equal(await api.shareLegacyPaipan(fixture(), options), 'requested')
      assert.equal(api.consumeLegacyPoster().url, fixture().url)
    } else {
      await assert.rejects(api.shareLegacyPaipan(fixture(), options), /安装微信/)
    }
    assert.equal(calls.some(c => ['share', 'capture', 'download', 'copy', 'save', 'system'].includes(c[0])), false)
  }
})

test('菜单取消、微信取消不换渠道；等待菜单时换页不外发', async () => {
  const cancelled = runtime({ showActionSheet: o => o.fail({ errMsg: 'cancel' }) })
  assert.equal(await cancelled.api.shareLegacyPaipan(fixture(), cancelled.options), 'cancelled')
  const wx = runtime({ share: o => o.fail({ errCode: -2 }) })
  assert.equal(await wx.api.shareLegacyPaipan(fixture(), wx.options), 'cancelled')
  let finish
  let current = true
  const delayed = runtime({ showActionSheet: o => { finish = () => o.success({ tapIndex: 0 }) } })
  const options = { canProceed: () => current }
  const pending = delayed.api.shareLegacyPaipan(fixture(), options)
  await assert.rejects(delayed.api.shareLegacyPaipan(fixture(), options), e => e.code === 'BUSY')
  current = false
  finish()
  await assert.rejects(pending, e => e.code === 'STALE_PAGE')
  assert.equal(delayed.calls.some(c => c[0] === 'share'), false)
})

test('微信能力检测期间换页不外发，图片/系统/剪贴板实现已从旧排盘删除', async () => {
  let finish
  let current = true
  const { api, calls } = runtime({}, { share: { getServices: ok => { finish = () => ok([{ id: 'weixin', nativeClient: true }]) } } })
  const pending = api.shareLegacyPaipan(fixture(), { canProceed: () => current })
  await Promise.resolve()
  current = false
  finish()
  await assert.rejects(pending, e => e.code === 'STALE_PAGE')
  assert.equal(calls.some(c => c[0] === 'share'), false)
  assert.doesNotMatch(source, /captureLegacyShareImage|prepareImage|saveImageToPhotosAlbum|setClipboardData|sendWithSystem|type: 2/)
  assert.doesNotMatch(page, /captureLegacyShareImage|图片已保存到相册/)
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
