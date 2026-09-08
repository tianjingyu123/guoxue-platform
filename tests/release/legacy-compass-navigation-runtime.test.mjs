import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import { createRequire } from 'node:module'
const ts = createRequire(new URL('../../apps/mobile/package.json', import.meta.url))('typescript')
const source = fs.readFileSync('apps/mobile/src/pkg-common/legacy-paipan/index.vue', 'utf8')
const code = source.slice(source.indexOf('function stopLegacyCompass('), source.indexOf('function installLegacyNavigationBridge('))
function fixture() {
  const scripts = [], sensors = [], toasts = []
  const child = { getURL: () => 'https://www.yrydai.cn/tool.php', evalJS: code => scripts.push(code) }
  const context = vm.createContext({ legacyChildWebview: child, legacyPageVisible: true,
    legacyCompassSession: null, legacyDocumentVersion: 0,
    isTrustedLegacyUrl: url => url.startsWith('https://www.yrydai.cn/'),
    createCompass: options => { const handle = { starts: 0, stops: 0, start() { this.starts++ }, stop() { this.stops++ } }; sensors.push({ options, handle }); return handle },
    uni: { navigateTo: () => assert.fail('不得跳走第三方罗盘'), showToast: options => toasts.push(options) } })
  vm.runInContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, context)
  return { context, child, scripts, sensors, toasts, open: () => context.openNativeCompass(child) }
}
test('按原版协议把原生北向读数持续回传当前网页，不跳转', () => {
  const f = fixture(); f.open()
  for (const value of [0, 90.15, 180, 270, 359.9]) f.sensors[0].options.onHeading(value)
  const received = []
  const page = vm.createContext({ window: { compassChange: value => received.push(value) } })
  f.scripts.forEach(code => vm.runInContext(code, page))
  assert.deepEqual(received, [0, 90.2, 180, -90, -0.1])
})
test('重复消息复用监听，隐藏、换文档、换地址及停止后均拒绝迟到读数', () => {
  for (const mutate of [f => { f.context.legacyPageVisible = false }, f => { f.context.legacyDocumentVersion++ },
    f => { f.child.getURL = () => 'https://www.yrydai.cn/other.php' }, f => f.context.stopLegacyCompass()]) {
    const f = fixture(); f.open(); f.open(); assert.equal(f.sensors.length, 1)
    mutate(f); f.sensors[0].options.onHeading(90); assert.equal(f.scripts.length, 0)
  }
})
test('非法读数和非信任网页不得执行脚本', () => {
  const f = fixture(); f.open()
  for (const value of [NaN, Infinity, -1, 360, '90);alert(1)']) f.sensors[0].options.onHeading(value)
  assert.equal(f.scripts.length, 0)
  f.context.stopLegacyCompass(); f.child.getURL = () => 'https://example.com/'
  f.open(); assert.equal(f.sensors.length, 1)
})
test('重启后旧回调不能写页面，错误不引导不存在的方向权限', () => {
  const f = fixture(); f.open(); f.context.stopLegacyCompass(); f.open()
  f.sensors[0].options.onHeading(30); assert.equal(f.scripts.length, 0)
  f.sensors[1].options.onHeading(40); assert.equal(f.scripts.length, 1)
  f.sensors[1].options.onStatus('unavailable'); f.sensors[1].options.onStatus('unavailable')
  assert.equal(f.toasts.length, 1); assert.doesNotMatch(f.toasts[0].title, /应用管理|方向权限/)
})
