import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const ts = createRequire(resolve('apps/mobile/package.json'))('typescript')
const flush = () => new Promise(resolve => setImmediate(resolve))
function fixture() {
  let allowed = true, token = 'A', response, fail = false, mineCalls = 0
  const pages = [], hooks = {}
  const modules = {
    vue: { ref: value => ({ value }), computed: fn => ({ get value() { return fn() } }) },
    '@dcloudio/uni-app': Object.fromEntries(['onLoad', 'onShow', 'onHide', 'onUnload'].map(name => [name, fn => { hooks[name] = fn }])),
    '@/utils/storage': { getToken: () => token }, '@/utils/router': { navigateTo: () => {} },
    '@/lib/legacy-paipan-data': { legacyPaipanApi: { nativeQaAccess: async () => ({ allowed, subjectId: '00000000-0000-4000-8000-000000000001' }) } },
    '@/pkg-paipan/lib/case-data': { CASE_METHODS: [{ key: 'ALL' }, { key: 'ZIWEI' }], caseApi: {
      mine: async () => { mineCalls++; return { badge: '合成称号', approved: 1 } },
      list: async q => { pages.push(q.page); if (fail) throw Error('合成失败'); return response ? await response : { items: [{ id: q.page }], total: 3 } },
      leaderboard: async () => { if (fail) throw Error('合成失败'); return response ? await response : [{ rank: 1 }] },
    } },
  }
  function load(source) {
    const exports = {}
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
      { exports, require: name => { if (!(name in modules)) throw Error(name); return modules[name] } })
    return exports
  }
  modules['@/lib/paipan/native-history-scope'] = load(fs.readFileSync('apps/mobile/src/lib/paipan/native-history-scope.ts', 'utf8'))
  modules['@/composables/useNativePreviewPage'] = load(fs.readFileSync('apps/mobile/src/composables/useNativePreviewPage.ts', 'utf8'))
  const source = fs.readFileSync('apps/mobile/src/pkg-paipan/cases/index.vue', 'utf8')
  const page = load(source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1] + '\nexport { preview, load, more, onTab, tab, list, page, rank, myBadge, method, failed };')
  return { page, hooks, pages, deny: () => { allowed = false }, switch: () => { token = 'B' }, delay: v => { response = v }, fail: v => { fail = v }, mineCalls: () => mineCalls }
}
test('案例列表仅进入后加载一次，分页失败不跳页，成功保留前页', async () => {
  const f = fixture(); assert.equal(f.mineCalls(), 0)
  f.hooks.onLoad({ method: 'ZIWEI' }); f.hooks.onShow(); await flush()
  assert.equal(f.mineCalls(), 1); assert.equal(f.page.method.value, 'ZIWEI')
  f.fail(true); f.page.more(); await flush(); assert.equal(f.page.page.value, 1)
  f.fail(false); f.page.more(); f.page.more(); await flush()
  assert.deepEqual(f.pages, [1, 2, 2]); assert.equal(f.page.page.value, 2)
  assert.equal(f.page.list.value.length, 2)
})
for (const kind of ['lib', 'rank']) for (const cancel of ['hide', 'account', 'deny']) test(`案例${kind}迟到结果在${cancel}后不恢复称号和列表`, async () => {
  const f = fixture(); await f.page.load(true)
  let finish; f.delay(new Promise(resolve => { finish = resolve }))
  f.page.tab.value = kind; const work = f.page.load(true); await flush()
  if (cancel === 'hide') f.hooks.onHide(); else if (cancel === 'account') f.switch(); else f.deny()
  finish(kind === 'lib' ? { items: [{ id: 'late' }], total: 1 } : [{ rank: 1 }]); await work
  assert.equal(f.page.myBadge.value, null); assert.equal(f.page.list.value.length, 0); assert.equal(f.page.rank.value.length, 0)
})
test('贡献榜失败明确标记失败，不视为空榜成功', async () => {
  const f = fixture(); await f.page.load(true); f.fail(true); f.page.onTab('rank'); await flush()
  assert.equal(f.page.tab.value, 'rank'); assert.equal(f.page.failed.value, true)
})
