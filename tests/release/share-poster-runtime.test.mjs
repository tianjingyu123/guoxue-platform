import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import test from 'node:test'

const ts = createRequire(resolve('apps/mobile/package.json'))('typescript')
function load(file, dependencies = {}) {
  const exports = {}
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8').replaceAll('import.meta.env.VITE_PUBLIC_H5_URL', JSON.stringify('https://api.rebugx.cn/h5/')), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText
  vm.runInNewContext(code, { exports, require: id => {
    if (id in dependencies) return dependencies[id]
    throw new Error(`未声明依赖 ${id}`)
  } })
  return exports
}
const exportApi = load('apps/mobile/src/lib/poster-export-state.ts')

test('真实二维码编码点阵完整保留，四码元静区位于画布内，过密或非有限尺寸拒绝绘制', () => {
  const UQRCode = createRequire(resolve('apps/mobile/package.json'))('uqrcodejs')
  const api = load('apps/mobile/src/utils/qrcode.ts', { uqrcodejs: { default: UQRCode } })
  for (const link of ['https://api.rebugx.cn/h5/pages/paipan/index', 'https://www.yrydai.cn/share.php?shareId=synthetic-poster']) {
    const qr = new UQRCode(); qr.data = link; qr.make()
    for (const size of [80, 100]) {
      const rectangles = []
      const ctx = new Proxy({}, { get: (_target, key) => key === 'fillRect' ? (...args) => rectangles.push(args) : () => {} })
      assert.equal(api.drawQrToCanvas(ctx, link, 0, 0, size, { contained: true }), true)
      const cell = Math.floor(size / (qr.moduleCount + 8))
      const inset = (size - qr.moduleCount * cell) / 2
      assert.ok(inset >= cell * 4)
      const expected = []
      qr.modules.forEach((row, r) => row.forEach((module, c) => {
        if (module.isBlack) expected.push([inset + c * cell, inset + r * cell, cell, cell])
      }))
      assert.deepEqual(rectangles, expected)
      for (const [x, y, w, h] of rectangles) {
        assert.ok(w >= 1 && h >= 1 && x >= cell * 4 && y >= cell * 4)
        assert.ok(x + w <= size - cell * 4 && y + h <= size - cell * 4)
      }
    }
  }
  const noDrawing = new Proxy({}, { get() { throw new Error('不能绘制损坏二维码') } })
  assert.equal(api.drawQrToCanvas(noDrawing, 'synthetic', 0, 0, 10, { contained: true }), false)
  assert.equal(api.drawQrToCanvas(noDrawing, 'synthetic', 0, 0, NaN, { contained: true }), false)
})

test('排盘长链接二维码码点起点为整数，四码元静区完整，其他海报默认不变', () => {
  const UQRCode = createRequire(resolve('apps/mobile/package.json'))('uqrcodejs')
  const api = load('apps/mobile/src/utils/qrcode.ts', { uqrcodejs: { default: UQRCode } })
  const link = 'https://www.yrydai.cn/p1.php?mod=qimen&act=result&id=&dateTime=2026-09-07%2003%3A18%3A00&realTime=&ziXuan=0&ju=-7&type=1'
  const qr = new UQRCode(); qr.data = link; qr.make()
  for (const size of [80, 100, 140]) {
    const rectangles = []
    const ctx = new Proxy({}, { get: (_target, key) => key === 'fillRect' ? (...args) => rectangles.push(args) : () => {} })
    assert.equal(api.drawQrToCanvas(ctx, link, 0, 0, size, { contained: true, pixelAligned: true }), true)
    const cell = Math.floor(size / (qr.moduleCount + 8))
    if (size === 140) assert.ok(cell >= 2, '排盘长结果链接至少两个逻辑像素一个码元')
    assert.ok(rectangles.length > 0)
    for (const [x, y, w, h] of rectangles) {
      assert.ok([x, y, w, h].every(Number.isInteger))
      assert.ok(x >= cell * 4 && y >= cell * 4)
      assert.ok(x + w <= size - cell * 4 && y + h <= size - cell * 4)
    }
  }
  const page = fs.readFileSync('apps/mobile/src/pkg-circle/common/share-poster/index.vue', 'utf8')
  assert.equal((page.match(/pixelAligned: isPaipanPoster.value/g) || []).length, 2)
  assert.match(page, /const QR = isPaipanPoster.value \? 140 : 100/)
  assert.match(page, /isPaipanPoster.value \? 140 : 80/)
  assert.match(page, /v-if="!isPaipanPoster" class="poster-card__seal"/)
})

test('排盘真实海报页消费本次链接，预览和导出使用同一二维码目标，返回后不可复用', async () => {
  const shareApi = load('apps/mobile/src/lib/legacy-paipan-share.ts')
  const dataApi = load('apps/mobile/src/lib/legacy-poster-data.ts', { './legacy-paipan-share': shareApi })
  const url = 'https://www.yrydai.cn/share.php?shareId=synthetic-poster'
  shareApi.stageLegacyPoster({ kind: 'page', title: '合成排盘', text: '合成内容摘要', url, imageUrl: '' })
  const pageSource = fs.readFileSync('apps/mobile/src/pkg-circle/common/share-poster/index.vue', 'utf8').match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]
  const hooks = {}, qrLinks = [], timers = []
  const dependencies = {
    vue: { ref: value => ({ value }), computed: getter => ({ get value() { return getter() } }), watch() {} },
    '@dcloudio/uni-app': { onLoad: fn => { hooks.load = fn }, onUnload: fn => { hooks.unload = fn }, onShareAppMessage() {}, onShareTimeline() {} },
    '@/pkg-circle/lib/poster-data': {
      POSTER_THEMES: [{ bg: '#fff', gold: '#000', ink: '#000', sub: '#555', accent: '#333', headerStyle: 'light' }],
      SHARE_TONES: [{ build: title => title }],
      getPosterData() { throw new Error('排盘不可调用默认邀请海报') },
      getPosterTypeTitle: () => '邀请好友', recordPosterShare: async () => ({ code: 200 }),
    },
    '@/lib/brand': { BRAND: { name: '热卜', nameShort: '热卜' } },
    '@/utils/qrcode': { drawQrToCanvas: (_ctx, link) => { qrLinks.push(link); return true } },
    '@/utils/router': { goBack() {} },
    '@/composables/useShare': { useShare: () => ({}) },
    '@/lib/poster-export-state': exportApi,
    '@/lib/legacy-paipan-share': shareApi,
    '@/lib/legacy-poster-data': dataApi,
  }
  const ctx = new Proxy({}, { get: (_target, key) => key === 'measureText' ? text => ({ width: text.length * 6 }) : key === 'draw' ? (_reserve, done) => done?.() : () => {} })
  const exports = {}
  const code = ts.transpileModule(pageSource + '\nexport { posterData, loadError, typeTitle, shareKind, loadData, drawPoster, posterExport };', { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText
  vm.runInNewContext(code, {
    exports,
    require: id => { if (id.endsWith('.vue')) return {}; if (id in dependencies) return dependencies[id]; throw new Error(`未声明依赖 ${id}`) },
    setTimeout: fn => { timers.push(fn); return timers.length }, clearTimeout() {},
    uni: { getSystemInfoSync: () => ({ statusBarHeight: 24 }), showToast() {}, createCanvasContext: () => ctx,
      canvasToTempFilePath: o => o.success({ tempFilePath: '/synthetic/generated-poster.png' }) },
  })
  hooks.load({ source: 'paipan' })
  assert.equal(exports.posterData.value.link, url)
  assert.equal(exports.posterData.value.title, '合成排盘')
  assert.equal(exports.typeTitle.value, '排盘分享海报')
  assert.equal(exports.shareKind.value, 'tool')
  assert.equal(shareApi.consumeLegacyPoster(), null)
  exports.drawPoster()
  assert.deepEqual(qrLinks, [url, url])
  // 重试复用页面持有的同一次公开内容，不重新消费交接或使用其他页面。
  await exports.loadData()
  assert.equal(exports.posterData.value.link, url)
  hooks.unload()
  assert.equal(exports.posterData.value, null)
  assert.equal(exports.posterExport.readyPath(), '')
  hooks.load({ source: 'paipan' })
  assert.equal(exports.posterData.value, null)
  assert.match(exports.loadError.value, /已过期/)
})

test('海报页面接入错误态、重试、超时和卸载取消，不能无限转圈或导出旧图', () => {
  const page = fs.readFileSync('apps/mobile/src/pkg-circle/common/share-poster/index.vue', 'utf8')
  assert.match(page, /v-if="loadError"/)
  assert.match(page, /@tap="loadData"/)
  assert.match(page, /posterExport\.fail\(state\.revision, '海报生成超时，请重试'\), 10_000/)
  assert.match(page, /if \(!drawQrToCanvas/)
  assert.match(page, /if \(!posterExport\.isCurrent\(revision\)\) return/)
  assert.match(page, /const path = posterExport\.readyPath\(\)/)
  assert.match(page, /onUnload\(\(\) => \{ loadRevision \+= 1; posterExport\.invalidate\(\)/)
})

test('新海报开始即清旧图，失败后不可保存，重试成功后才能保存', () => {
  let state
  const api = exportApi.createPosterExportState(s => { state = s })
  const first = api.begin(); api.complete(first, '/synthetic/first.png')
  assert.equal(api.readyPath(), '/synthetic/first.png')
  const second = api.begin(); assert.equal(api.readyPath(), '')
  api.fail(second, '二维码失败'); assert.equal(api.readyPath(), ''); assert.equal(state.status, 'failed')
  const third = api.begin(); api.complete(third, '/synthetic/third.png')
  assert.equal(api.readyPath(), '/synthetic/third.png')
})

test('旧导出迟到、重复回调、卸载后回调均不能污染新图', () => {
  const api = exportApi.createPosterExportState(() => {})
  const a = api.begin(); const b = api.begin()
  api.complete(a, '/synthetic/old.png'); assert.equal(api.readyPath(), '')
  api.complete(b, '/synthetic/new.png'); api.fail(b, '重复错误')
  assert.equal(api.readyPath(), '/synthetic/new.png')
  api.invalidate(); api.complete(b, '/synthetic/stale.png'); assert.equal(api.readyPath(), '')
})

test('空导出路径不可判为完成', () => {
  let state; const api = exportApi.createPosterExportState(s => { state = s })
  api.complete(api.begin(), '')
  assert.equal(state.status, 'failed'); assert.equal(api.readyPath(), '')
})

test('小程序分享使用实际注册路由，动态路径id与归因参数保留', () => {
  const router = load('apps/mobile/src/utils/router.ts', {
    '@/utils/content-detail-layer': {}, '@/lib/client-module-policy': {},
    // 此用例是小程序：实际维护策略的条件块应执行，而非空函数替身。
    '@/lib/mp-paipan-maintenance': load('apps/mobile/src/lib/mp-paipan-maintenance.ts'),
  })
  const api = load('apps/mobile/src/composables/useShare.ts', {
    '@/utils/router': router, '@/composables/useTrack': { track: { share() {} } },
    '@/utils/referral': { withRef: path => `${path}${path.includes('?') ? '&' : '?'}ref=synthetic` },
  }).useShare()
  const message = api.toAppMessage({ title: '测试课程', path: '/courses/synthetic-id?source=share', cover: 'synthetic-cover' })
  assert.equal(message.path, '/pkg-course/detail/index?id=synthetic-id&source=share&ref=synthetic')
  const timeline = api.toTimeline({ title: '测试海报', path: '/pkg-circle/common/share-poster/index?type=post&targetId=p1&circleId=c1' })
  assert.equal(timeline.query, 'type=post&targetId=p1&circleId=c1&ref=synthetic')
})

test('具体内容缺失标识不能退化为平台邀请海报', async () => {
  const source = fs.readFileSync('apps/mobile/src/pkg-circle/lib/poster-data.ts', 'utf8')
  const dependencies = Object.fromEntries([...source.matchAll(/from ['"]([^'"]+)['"]/g)].map(m => [m[1], {}]))
  dependencies['@/lib/brand'] = { BRAND: { name: '测试品牌', nameShort: '测试' } }
  dependencies['@/utils/share'] = { buildH5Url: route => `https://example.test/${route}` }
  dependencies['@/utils/storage'] = { getStorage: () => null }
  const api = load('apps/mobile/src/pkg-circle/lib/poster-data.ts', dependencies)
  for (const kind of ['circle', 'post', 'article', 'video', 'live', 'product', 'course', 'classic']) {
    await assert.rejects(api.getPosterData(kind), /缺少分享内容/)
  }
  await assert.rejects(api.getPosterData('unknown', 'id'), /不支持的海报类型/)
  await assert.rejects(api.getPosterData('post', 'id'), /缺少圈子信息/)
  const invite = await api.getPosterData('invite')
  assert.equal(invite.data.type, 'invite')
})
