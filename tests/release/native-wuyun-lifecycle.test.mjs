import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const ts = createRequire(resolve('apps/mobile/package.json'))('typescript')
test('五运六气仅整套准入后初始化，退出清除体质选择，迟到watch不重算', async () => {
  let allowed = false, calculations = 0, watcher
  const hooks = {}, modules = {
    vue: { ref: value => ({ value }), computed: fn => ({ get value() { return fn() } }), watch: (_, fn) => { watcher = fn } },
    '@dcloudio/uni-app': Object.fromEntries(['onShow', 'onHide', 'onUnload'].map(name => [name, fn => { hooks[name] = fn }])),
    '@/utils/storage': { getToken: () => 'A' }, '@/utils/router': { navigateTo: () => {} },
    '@/lib/legacy-paipan-data': { legacyPaipanApi: { nativeQaAccess: async () => ({ allowed, subjectId: '00000000-0000-4000-8000-000000000001' }) } },
    '@/pkg-paipan/lib/wuyunliuqi-engine': { computeWuyun: () => { calculations++; return {} }, currentStepIndex: () => 4 },
    '@/pkg-paipan/lib/constitution': {},
  }
  function load(source) {
    const exports = {}
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
      { exports, require: name => { if (!(name in modules)) throw Error(name); return modules[name] } })
    return exports
  }
  modules['@/lib/paipan/native-history-scope'] = load(fs.readFileSync('apps/mobile/src/lib/paipan/native-history-scope.ts', 'utf8'))
  modules['@/composables/useNativePreviewPage'] = load(fs.readFileSync('apps/mobile/src/composables/useNativePreviewPage.ts', 'utf8'))
  const source = fs.readFileSync('apps/mobile/src/pkg-paipan/wuyunliuqi/index.vue', 'utf8')
  const page = load(source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1] + '\nexport { preview, year, selectedStep, consKey, shiftYear };')
  assert.equal(calculations, 0); await page.preview.run(); assert.equal(calculations, 0)
  allowed = true; await page.preview.run(); assert.equal(calculations, 1); assert.equal(page.selectedStep.value, 4)
  page.shiftYear(1); watcher(); assert.equal(page.selectedStep.value, 3)
  page.consKey.value = 'synthetic'; hooks.onHide(); watcher()
  assert.equal(calculations, 1); assert.equal(page.consKey.value, 'pinghe')
  assert.equal(page.year.value, new Date().getFullYear())
  page.shiftYear(1); assert.equal(page.year.value, new Date().getFullYear())
})
