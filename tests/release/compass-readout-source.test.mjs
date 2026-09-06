import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const ts = createRequire(resolve('apps/mobile/package.json'))('typescript')

test('罗盘无测量不显示默认角度，手动明确标记，离页清除旧读数', () => {
  const hooks = {}; let callbacks
  const modules = {
    vue: { ref: value => ({ value }), computed: fn => ({ get value() { return fn() } }), onUnmounted: () => {} },
    '@dcloudio/uni-app': Object.fromEntries(['onShow','onHide','onUnload'].map(k => [k, fn => { hooks[k] = fn }])),
    './compass': { createCompass: cb => { callbacks = cb; return { start: () => {}, stop: () => {} } } },
    '@/pkg-paipan3/lib/luopan-data': { sittingFacing: deg => ({ deg }), bearingToDirection: () => '测试方向', PLATE_STYLES: [] },
  }
  const text = fs.readFileSync('apps/mobile/src/pkg-common/compass/index.vue', 'utf8'), exports = {}
  vm.runInNewContext(ts.transpileModule(text.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1] + '\nexport { readingSource, heading, locked, onSlider, toggleLock };',
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, require: k => { if (!(k in modules)) throw Error(k); return modules[k] } })
  assert.equal(exports.readingSource.value, 'none'); exports.toggleLock(); assert.equal(exports.locked.value, false)
  callbacks.onHeading(NaN); assert.equal(exports.readingSource.value, 'none')
  callbacks.onHeading(45); callbacks.onStatus('active'); assert.equal(exports.readingSource.value, 'sensor')
  callbacks.onStatus('unavailable'); assert.equal(exports.readingSource.value, 'none')
  exports.onSlider({ detail: { value: 90 } }); assert.equal(exports.readingSource.value, 'manual')
  exports.toggleLock(); callbacks.onHeading(20); assert.equal(exports.heading.value, 90)
  hooks.onHide(); assert.equal(exports.readingSource.value, 'none'); assert.equal(exports.locked.value, false)
  hooks.onShow(); assert.equal(exports.readingSource.value, 'none')
  callbacks.onHeading(60); callbacks.onStatus('active'); exports.toggleLock()
  callbacks.onStatus('unavailable')
  assert.equal(exports.readingSource.value, 'sensor') // 锁定保留历史判读
  assert.equal(exports.locked.value, true)
  exports.toggleLock()
  assert.equal(exports.readingSource.value, 'none') // 解锁不能把断流前的角度冒充实时方向
  callbacks.onHeading(75); callbacks.onStatus('active')
  assert.equal(exports.readingSource.value, 'sensor')
  assert.equal(exports.heading.value, 75)
  assert.ok(text.includes('等待有效方向读数')); assert.ok(text.includes('手动设定')); assert.ok(text.includes('盘面示意，尚未定向'))
})
