import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import test from 'node:test'

const ts = createRequire(resolve('apps/mobile/package.json'))('typescript')
// 按 App 条件抽取真实适配层；使用合成传感器，不伪造真机验收。
const source = fs.readFileSync('apps/mobile/src/pkg-common/compass/compass.ts', 'utf8')
test('原站未主动启动时按方向接收协议启动，同一文档不重复请求', () => {
  const preload = fs.readFileSync('apps/mobile/src/static/legacy-paipan-preload.js', 'utf8')
  const body = preload.match(/function startReadyLegacyCompass\(\) \{([\s\S]*?)\n  \}/)[1]
  const window = {}, calls = []
  const ctx = vm.createContext({ window, openNativeCompass: () => calls.push('start') })
  vm.runInContext('function probe(){' + body + '}', ctx)
  ctx.probe(); assert.equal(calls.length, 0)
  window.compassChange = () => {}
  ctx.probe(); ctx.probe(); assert.deepEqual(calls, ['start'])
  const bridge = fs.readFileSync('apps/mobile/src/pkg-common/legacy-paipan/index.vue', 'utf8')
  assert.ok(bridge.indexOf("typeof window.compassChange==='function'") < bridge.indexOf('if(window.__rebuLegacyNavigationBridgeInstalled)return'))
})
test('第三方桥复用方向数据源并回传原网页，独立罗盘不依赖自研预览资格', () => {
  const page = fs.readFileSync('apps/mobile/src/pkg-common/compass/index.vue', 'utf8')
  const alias = fs.readFileSync('apps/mobile/src/pkg-paipan3/luopan/index.vue', 'utf8')
  const bridge = fs.readFileSync('apps/mobile/src/pkg-common/legacy-paipan/index.vue', 'utf8')
  assert.doesNotMatch(page, /useNativePreviewPage|nativeQaAccess|allowNative/)
  assert.doesNotMatch(page, /当前设备不支持罗盘感应/)
  assert.match(page, /手动读数不代表手机实际朝向/)
  assert.match(alias, /uni\.redirectTo\(\{ url: '\/pkg-common\/compass\/index'/)
  assert.match(bridge, /from '@\/pkg-common\/compass\/compass'/)
  assert.match(bridge, /window\.compassChange\(/)
  assert.doesNotMatch(bridge, /url: '\/pkg-common\/compass\/index\?source=paipan'/)
  assert.doesNotMatch(bridge, /url: '\/pkg-paipan3\/luopan/)
})
const stack = [true]

test('Harmony未接入原生数据源时明确不可用，不永久等待或伪造北向', () => {
  const enabled = [true]
  const harmonySource = source.split('\n').filter(line => {
    const start = line.match(/\/\/ #ifdef (.+)/)
    if (start) { enabled.push(enabled.at(-1) && start[1].split(/\s*\|\|\s*/).includes('APP-HARMONY')); return false }
    if (/\/\/ #endif/.test(line)) { enabled.pop(); return false }
    return enabled.at(-1)
  }).join('\n')
  const exports = {}, headings = [], statuses = []
  vm.runInNewContext(ts.transpileModule(harmonySource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, setTimeout() { throw new Error('不可创建没有数据源的等待计时') }, clearTimeout() {},
  })
  const handle = exports.createCompass({ onHeading: value => headings.push(value), onStatus: value => statuses.push(value) })
  handle.start(); handle.start(); handle.stop(); handle.start()
  assert.deepEqual(statuses, ['unavailable', 'unavailable'])
  assert.deepEqual(headings, [])
})
test('兼容页失败后允许重试，正在打开时不重复跳转', () => {
  const page = fs.readFileSync('apps/mobile/src/pkg-paipan3/luopan/index.vue', 'utf8')
  const script = page.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1].replace(/^import.*$/gm, '')
  const calls = []; let start
  const context = { ref: value => ({ value }), onLoad: callback => { start = callback }, uni: { redirectTo: options => calls.push(options) } }
  vm.createContext(context)
  vm.runInContext(ts.transpileModule(script, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, context)
  start(); context.openCompass(); assert.equal(calls.length, 1)
  calls[0].fail(); assert.equal(vm.runInContext('failed.value', context), true)
  context.openCompass(); assert.equal(calls.length, 2)
  assert.equal(vm.runInContext('failed.value', context), false)
})
const appSource = source.split('\n').filter((line) => {
  const start = line.match(/\/\/ #ifdef (.+)/)
  if (start) { stack.push(stack.at(-1) && start[1].includes('APP-PLUS')); return false }
  if (/\/\/ #endif/.test(line)) { stack.pop(); return false }
  return stack.at(-1)
}).join('\n')
function fixture(throwOnRegister = false) {
  const exports = {}, headings = [], statuses = [], cleared = []
  const nativeCallbacks = [], uniCallbacks = [], timers = []
  vm.runInNewContext(ts.transpileModule(appSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, setTimeout: callback => { timers.push(callback); return timers.length }, clearTimeout() {},
    uni: {
      onCompassChange(callback) { if (throwOnRegister) throw new Error('unsupported'); uniCallbacks.push(callback) },
      startCompass() {}, offCompassChange() {}, stopCompass() {},
    },
    plus: { orientation: {
      watchOrientation(callback) { nativeCallbacks.push(callback); return 7 },
      clearWatch(id) { cleared.push(id) },
    } },
  })
  const handle = exports.createCompass({ throttle: 0, onHeading: n => headings.push(n), onStatus: s => statuses.push(s) })
  return { handle, headings, statuses, cleared, nativeCallbacks, uniCallbacks, timers,
    native: value => nativeCallbacks.at(-1)(value), uni: value => uniCallbacks.at(-1)(value) }
}
test('uni 监听注册失败仍启动备用原生罗盘', () => {
  const f = fixture(true)
  assert.doesNotThrow(() => f.handle.start())
  f.native({ magneticHeading: 90 })
  assert.deepEqual(f.headings, [90])
  assert.equal(f.statuses.at(-1), 'active')
})

test('原生读数断流会失效，非法帧不续期，恢复帧重新激活，旧超时不能覆盖新读数', () => {
  const f = fixture(); f.handle.start()
  const startupTimeout = f.timers.at(-1)
  f.native({ magneticHeading: 90 }); const sampleTimeout = f.timers.at(-1)
  startupTimeout(); assert.equal(f.statuses.at(-1), 'active')
  const count = f.timers.length
  f.native({ magneticHeading: NaN }); f.uni({ direction: -1 })
  assert.equal(f.timers.length, count)
  sampleTimeout(); assert.equal(f.statuses.at(-1), 'unavailable')
  f.uni({ direction: 120 }); assert.equal(f.statuses.at(-1), 'active')
  sampleTimeout(); assert.equal(f.statuses.at(-1), 'active')
  assert.deepEqual(f.headings, [90, 120])
  f.handle.stop(); const before = [...f.statuses]
  f.timers.at(-1)(); assert.deepEqual(f.statuses, before)
})
test('离开页面停止后，两个来源的迟到读数不得恢复 active 或转动盘面', () => {
  const f = fixture()
  f.handle.start(); f.native({ magneticHeading: 90 }); f.handle.stop()
  const before = [...f.statuses]
  f.native({ magneticHeading: 180 }); f.uni({ direction: 270 })
  assert.deepEqual(f.headings, [90])
  assert.deepEqual(f.statuses, before)
  assert.deepEqual(f.cleared, [7])
})

test('重新进入后，上一轮原生和 uni 回调不能污染当前读数', () => {
  const f = fixture(); f.handle.start()
  const oldNative = f.nativeCallbacks[0], oldUni = f.uniCallbacks[0]
  f.handle.stop(); f.handle.start()
  oldNative({ magneticHeading: 180 }); oldUni({ direction: 270 })
  assert.deepEqual(f.headings, [])
  f.native({ magneticHeading: 45 }); assert.deepEqual(f.headings, [45])
})

test('原生相对旋转 alpha 不能冒充北向，非法磁北值不能覆盖有效真北', () => {
  const f = fixture(); f.handle.start()
  f.native({ alpha: 90 }); f.native({ magneticHeading: -1, trueHeading: NaN })
  f.uni({ direction: -1 }); f.uni({ direction: Infinity })
  assert.deepEqual(f.headings, [])
  assert.ok(!f.statuses.includes('active'))
  f.native({ magneticHeading: -1, trueHeading: 120 })
  assert.deepEqual(f.headings, [120])
})
