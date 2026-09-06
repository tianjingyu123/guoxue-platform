import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import { createRequire } from 'node:module'
const require = createRequire(new URL('../../apps/mobile/package.json', import.meta.url))
const ts = require('typescript')
const exports = {}
const source = fs.readFileSync(new URL('../../apps/mobile/src/lib/legacy-webview-layout.ts', import.meta.url), 'utf8')
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports })
const layout = value => JSON.parse(JSON.stringify(exports.legacyWebviewLayout(value)))

test('整屏窗口只扣一次状态栏，底部不再重复缩短', () => {
  assert.deepEqual(layout({ windowHeight: 800, windowTop: 0, statusBarHeight: 34 }), { top: '34px', height: '766px' })
})
test('父窗口已避开状态栏时子窗口不二次扣减', () => {
  assert.deepEqual(layout({ windowHeight: 766, windowTop: 34, statusBarHeight: 34 }), { top: '0px', height: '766px' })
})
test('刘海安全区采用较大顶部值，不累计状态栏', () => {
  assert.deepEqual(layout({ windowHeight: 844, statusBarHeight: 20, safeAreaInsets: { top: 47 } }), { top: '47px', height: '797px' })
})
test('部分避让只补剩余顶部，保留分数逻辑像素', () => {
  assert.deepEqual(layout({ windowHeight: 780.5, windowTop: 20, statusBarHeight: 34.5 }), { top: '14.5px', height: '766px' })
})
test('横屏与窗口缩放使用当前尺寸而非初次缓存', () => {
  assert.deepEqual(layout({ windowHeight: 360, statusBarHeight: 0 }), { top: '0px', height: '360px' })
  assert.deepEqual(layout({ windowHeight: 260, statusBarHeight: 20 }), { top: '20px', height: '240px' })
})
test('缺失、非有限、负值或无剩余高度拒绝产生布局', () => {
  for (const input of [{}, { windowHeight: NaN }, { windowHeight: Infinity }, { windowHeight: '800' },
    { windowHeight: 0 }, { windowHeight: 30, statusBarHeight: 34 }, { windowHeight: 800, windowTop: -1 },
    { windowHeight: 800, safeAreaInsets: { top: NaN } }]) assert.equal(layout(input), null)
})
