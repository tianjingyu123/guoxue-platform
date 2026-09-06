import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const ts = createRequire(resolve('apps/mobile/package.json'))('typescript')

test('节气时钟仅获准后启动，隐藏和重复进入不残留计时器', async () => {
  let allowed = false, tick, timers = 0
  const hooks = {}
  const modules = {
    vue: { ref: value => ({ value }), computed: fn => ({ get value() { return fn() } }), onUnmounted: fn => { hooks.unmount = fn } },
    '@dcloudio/uni-app': Object.fromEntries(['onShow', 'onHide', 'onUnload'].map(name => [name, fn => { hooks[name] = fn }])),
    '@/utils/storage': { getToken: () => 'token' },
    '@/lib/legacy-paipan-data': { legacyPaipanApi: { nativeQaAccess: async () => ({ allowed, subjectId: '00000000-0000-4000-8000-000000000001' }) } },
    '@/pkg-paipan/lib/jieqi-data': {}, '@/pkg-paipan/lib/jieqi-engine': {},
  }
  function load(source) {
    const exports = {}
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
      exports, setInterval: fn => { tick = fn; timers++; return timers }, clearInterval: () => { timers-- },
      require: name => { if (!(name in modules)) throw Error(name); return modules[name] },
    })
    return exports
  }
  modules['@/lib/paipan/native-history-scope'] = load(fs.readFileSync('apps/mobile/src/lib/paipan/native-history-scope.ts', 'utf8'))
  modules['@/composables/useNativePreviewPage'] = load(fs.readFileSync('apps/mobile/src/composables/useNativePreviewPage.ts', 'utf8'))
  const source = fs.readFileSync('apps/mobile/src/pkg-paipan/jieqi/index.vue', 'utf8')
  const page = load(source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1] + '\nexport { preview, now, selected, activeModule };')
  assert.equal(timers, 0); await page.preview.run(); assert.equal(timers, 0)
  allowed = true; await page.preview.run(); assert.equal(timers, 1)
  const late = tick
  page.selected.value = '冬至'; page.activeModule.value = 'poster'
  hooks.onHide(); const before = page.now.value; late()
  assert.equal(page.now.value, before); assert.equal(timers, 0)
  assert.equal(page.selected.value, null); assert.equal(page.activeModule.value, 'culture')
  await page.preview.run(); await page.preview.run(); assert.equal(timers, 1)
  const current = page.now.value; late(); assert.equal(page.now.value, current)
  hooks.onUnload(); assert.equal(timers, 0)
})

for (const tool of ['jinqianke', 'kongming']) test(`${tool}隐藏停止计时，迟到回调和重复点击不恢复旧结果`, async () => {
  let allowed = false, tick, timers = 0
  const hooks = {}
  const modules = {
    vue: { ref: value => ({ value }), computed: fn => ({ get value() { return fn() } }), onUnmounted: fn => { hooks.unmount = fn } },
    '@dcloudio/uni-app': Object.fromEntries(['onShow', 'onHide', 'onUnload'].map(name => [name, fn => { hooks[name] = fn }])),
    '@/utils/storage': { getToken: () => 'token' },
    '@/lib/legacy-paipan-data': { legacyPaipanApi: { nativeQaAccess: async () => ({ allowed, subjectId: '00000000-0000-4000-8000-000000000001' }) } },
    '../lib/jinqianke-data': {},
  }
  function load(source) {
    const exports = {}
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
      exports, setInterval: fn => { tick = fn; timers++; return timers }, clearInterval: () => { timers-- },
      require: name => { if (!(name in modules)) throw Error(name); return modules[name] },
    })
    return exports
  }
  for (const [name, file] of [
    ['@/lib/paipan/native-history-scope', 'lib/paipan/native-history-scope.ts'],
    ['@/composables/useNativePreviewPage', 'composables/useNativePreviewPage.ts'],
  ]) modules[name] = load(fs.readFileSync(`apps/mobile/src/${file}`, 'utf8'))
  const source = fs.readFileSync(`apps/mobile/src/pkg-paipan3/${tool}/index.vue`, 'utf8')
  const page = load(source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1] + '\nexport { preview, phase, coins, castResult, startShake, stopShake };')
  await page.preview.run(); page.startShake(); assert.equal(timers, 0)
  allowed = true; await page.preview.run(); page.startShake(); page.startShake()
  assert.equal(timers, 1)
  const late = tick
  hooks.onHide(); assert.equal(timers, 0)
  late(); page.stopShake()
  assert.equal(page.phase.value, 'idle'); assert.equal(page.castResult.value, null)
  assert.ok(page.coins.value.every(value => value === null))
  await page.preview.run(); page.startShake(); late()
  assert.ok(page.coins.value.every(value => value === null))
  page.stopShake(); assert.equal(page.phase.value, 'done'); assert.equal(timers, 0)
  hooks.onUnload(); assert.equal(page.castResult.value, null)
})
