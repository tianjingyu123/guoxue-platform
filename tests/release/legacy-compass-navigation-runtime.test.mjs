import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import { createRequire } from 'node:module'
const ts = createRequire(new URL('../../apps/mobile/package.json', import.meta.url))('typescript')
const source = fs.readFileSync('apps/mobile/src/pkg-common/legacy-paipan/index.vue', 'utf8')
const code = source.slice(source.indexOf('function openNativeCompass(child:'), source.indexOf('function installLegacyNavigationBridge('))
function fixture() {
  const routes = [], callbacks = [], backs = [], toasts = []
  const child = { getURL: () => 'https://www.yrydai.cn/tool.php', canBack: cb => callbacks.push(cb), back: () => backs.push(true) }
  const context = vm.createContext({ legacyChildWebview: child, legacyPageVisible: true,
    legacyCompassOpening: false, legacyDocumentVersion: 0,
    uni: { navigateTo: options => routes.push(options), showToast: options => toasts.push(options) } })
  vm.runInContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, context)
  return { context, child, routes, callbacks, backs, toasts, open: () => context.openNativeCompass(child) }
}
test('重复桥消息只打开一次罗盘；失败可重试', () => {
  const f = fixture(); f.open(); f.open()
  assert.equal(f.routes.length, 1)
  f.routes[0].fail(); f.open()
  assert.equal(f.routes.length, 2)
})
test('离页后的历史查询回调不能修改隐藏的排盘页面', () => {
  const f = fixture(); f.open(); f.context.legacyPageVisible = false
  f.callbacks[0]({ canBack: true })
  assert.equal(f.backs.length, 0)
})
test('查询期间网页已换文档，不得后退新的页面', () => {
  const f = fixture(); f.open(); f.context.legacyDocumentVersion++
  f.callbacks[0]({ canBack: true })
  assert.equal(f.backs.length, 0)
})
test('同一可见文档允许后退；隐藏时失败不弹提示', () => {
  const f = fixture(); f.open(); f.callbacks[0]({ canBack: true })
  assert.equal(f.backs.length, 1)
  f.context.legacyPageVisible = false; f.routes[0].fail()
  assert.equal(f.toasts.length, 0)
})
