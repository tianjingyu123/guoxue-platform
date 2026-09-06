import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const ts = createRequire(resolve('apps/mobile/package.json'))('typescript')
const flush = () => new Promise(resolve => setImmediate(resolve))
const base = 'rebu:shanxiang-history'
function fixture(file, storage = new Map(), account = 'A') {
  let allowed = false, token = account, modal, calculations = 0, writes = 0
  const hooks = {}, modules = {
    vue: { ref: value => ({ value }), computed: fn => ({ get value() { return fn() } }) },
    '@dcloudio/uni-app': Object.fromEntries(['onLoad', 'onShow', 'onHide', 'onUnload'].map(name => [name, fn => { hooks[name] = fn }])),
    '@/utils/storage': { getToken: () => token }, '@/utils/router': { navigateTo: () => {} },
    '@/lib/legacy-paipan-data': { legacyPaipanApi: { nativeQaAccess: async () => ({ allowed, subjectId: `00000000-0000-4000-8000-00000000000${token === 'A' ? 1 : 2}` }) } },
    '@/pkg-paipan/lib/shanxiang-engine': { FACING_SEQ: [], paiShanxiang: () => { calculations++; return { label: '合成山向', ju: { label: '合成局' }, degree: 10 } } },
  }
  function load(source) {
    const exports = {}
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
      { exports, uni: { getStorageSync: k => storage.get(k), setStorageSync: (k,v) => { writes++; storage.set(k,v) }, showModal: value => { modal = value } }, require: name => { if (!(name in modules)) throw Error(name); return modules[name] } })
    return exports
  }
  modules['@/lib/paipan/native-history-scope'] = load(fs.readFileSync('apps/mobile/src/lib/paipan/native-history-scope.ts', 'utf8'))
  modules['@/composables/useNativePreviewPage'] = load(fs.readFileSync('apps/mobile/src/composables/useNativePreviewPage.ts', 'utf8'))
  const source = fs.readFileSync(`apps/mobile/src/pkg-paipan/shanxiang/${file}.vue`, 'utf8')
  const page = load(source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1] + (file === 'index' ? '\nexport { gate, records, name, openHistory, clearHistory };' : '\nexport { gate, result, custName };'))
  return { page, hooks, storage, permit: () => { allowed = true }, switch: () => { token = 'B' }, confirm: () => modal.success({ confirm: true }), counts: () => ({ calculations, writes }) }
}
test('山向结果仅核验后计算且同页返回不重复保存，历史按账号隔离', async () => {
  const storage = new Map([[base, '[{"name":"历史未确认归属"}]']])
  const f = fixture('result', storage)
  f.hooks.onLoad({ payload: encodeURIComponent(JSON.stringify({ name: '合成客户', deg: 10, y: 2026 })) })
  f.hooks.onShow(); await flush(); assert.deepEqual(f.counts(), { calculations: 0, writes: 0 })
  f.permit(); await f.page.gate.run(); assert.deepEqual(f.counts(), { calculations: 1, writes: 1 })
  f.hooks.onHide(); assert.equal(f.page.result.value, null); assert.equal(f.page.custName.value, '')
  f.hooks.onShow(); await flush(); assert.deepEqual(f.counts(), { calculations: 2, writes: 1 })
  const a = fixture('index', storage); a.permit(); await a.page.gate.run(); assert.equal(a.page.records.value.length, 1)
  a.page.name.value = '尚未提交'; a.page.openHistory(); await flush(); assert.equal(a.page.name.value, '尚未提交')
  const b = fixture('index', storage, 'B'); b.permit(); await b.page.gate.run(); assert.equal(b.page.records.value.length, 0)
  b.page.clearHistory(); b.confirm(); await flush()
  await a.page.gate.run(); assert.equal(a.page.records.value.length, 1)
  assert.equal(storage.get(base), '[{"name":"历史未确认归属"}]')
})
for (const cancel of ['hide', 'account', 'reshow']) test(`山向清空弹窗${cancel}后确认不写`, async () => {
  const f = fixture('index'); f.permit(); await f.page.gate.run(); f.page.clearHistory()
  if (cancel === 'hide') f.hooks.onHide(); else if (cancel === 'account') f.switch(); else { f.hooks.onHide(); await f.page.gate.run() }
  f.confirm(); await flush(); assert.equal(f.counts().writes, 0)
})
