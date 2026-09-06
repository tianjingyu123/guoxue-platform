import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const ts = createRequire(resolve('apps/mobile/package.json'))('typescript')
const flush = () => new Promise(resolve => setImmediate(resolve))
test('八宅真实存储按账号隔离，结果返回不重复保存，改名在同账号原位更新', async () => {
  let token = 'A', allowed = false, writes = 0
  const data = new Map([['rebu:bazhai-history', [{ privateLegacy: true }]], ['rebu:bazhai-records', [{ privateLegacy: true }]]])
  const hooks = {}, modules = {
    vue: { ref: value => ({ value }), computed: fn => ({ get value() { return fn() } }) },
    '@dcloudio/uni-app': Object.fromEntries(['onLoad', 'onShow', 'onHide', 'onUnload'].map(name => [name, fn => { hooks[name] = fn }])),
    '@/utils/storage': { getToken: () => token }, '@/utils/router': { navigateTo: () => {} },
    '@/lib/legacy-paipan-data': { legacyPaipanApi: { nativeQaAccess: async () => ({ allowed, subjectId: '00000000-0000-4000-8000-000000000001' }) } },
    '@/pkg-paipan3/lib/xuankong-data': { MOUNTAINS: Array(24).fill('合成') },
    '@/pkg-paipan3/lib/bazhai-data': { sittingGua: () => '坎', mingGua: () => null },
  }
  function load(source) {
    const exports = {}
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
      exports, uni: { getStorageSync: k => structuredClone(data.get(k)), setStorageSync: (k,v) => { writes++; data.set(k,structuredClone(v)) }, removeStorageSync: k => { data.delete(k) } },
      require: name => { if (!(name in modules)) throw Error(name); return modules[name] },
    })
    return exports
  }
  modules['@/lib/paipan/native-history-scope'] = modules['./native-history-scope'] = load(fs.readFileSync('apps/mobile/src/lib/paipan/native-history-scope.ts','utf8'))
  modules['@/lib/paipan/history-core'] = modules['./history-core'] = load(fs.readFileSync('apps/mobile/src/lib/paipan/history-core.ts','utf8'))
  modules['@/lib/paipan/private-history'] = load(fs.readFileSync('apps/mobile/src/lib/paipan/private-history.ts','utf8'))
  modules['@/composables/useNativePreviewPage'] = load(fs.readFileSync('apps/mobile/src/composables/useNativePreviewPage.ts','utf8'))
  const store = modules['./bazhai-history'] = load(fs.readFileSync('apps/mobile/src/pkg-paipan3/bazhai/bazhai-history.ts','utf8'))
  const source = fs.readFileSync('apps/mobile/src/pkg-paipan3/bazhai/result.vue','utf8')
  const page = load(source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1] + '\nexport { preview, params, customer, onNameDone };')
  hooks.onLoad({ payload: encodeURIComponent(JSON.stringify({ customer: '合成客户', sitting: 0, birthYear: 0, gender: 'male' })) })
  hooks.onShow(); await flush(); assert.equal(writes, 0)
  allowed = true; await page.preview.run(); assert.equal(writes, 1)
  hooks.onHide(); assert.equal(page.params.value, null); hooks.onShow(); await flush(); assert.equal(writes, 1)
  page.customer.value = '合成改名'; page.onNameDone(); await flush(); assert.equal(writes, 2)
  hooks.onHide(); hooks.onShow(); await flush(); assert.equal(page.customer.value, '合成改名')
  const scope = modules['./native-history-scope']
  scope.withNativeHistoryScope('00000000-0000-4000-8000-000000000001','A', () => {
    assert.equal(store.loadBazhaiHistory().length, 1); assert.equal(store.loadBazhaiHistory()[0].params.customer, '合成改名')
  })
  token = 'B'; scope.withNativeHistoryScope('00000000-0000-4000-8000-000000000002','B', () => {
    assert.equal(store.loadBazhaiHistory().length, 0); store.clearBazhaiHistory()
  })
  assert.deepEqual(data.get('rebu:bazhai-history'), [{ privateLegacy: true }])
  assert.deepEqual(data.get('rebu:bazhai-records'), [{ privateLegacy: true }])
  assert.throws(() => store.clearBazhaiHistory(), /重新核验/)
})
