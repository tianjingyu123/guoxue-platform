import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const ts = createRequire(resolve('apps/mobile/package.json'))('typescript')
const flush = () => new Promise(resolve => setImmediate(resolve))
function fixture() {
  let allowed = true, token = 'A', response, reads = 0, posts = 0, modals = 0, failPost = false
  const hooks = {}
  const modules = {
    vue: { ref: value => ({ value }) },
    '@dcloudio/uni-app': Object.fromEntries(['onShow', 'onHide', 'onUnload'].map(name => [name, fn => { hooks[name] = fn }])),
    '@/utils/storage': { getToken: () => token },
    '@/utils/router': { navigateTo: () => {} },
    '@/lib/legacy-paipan-data': { legacyPaipanApi: { nativeQaAccess: async () => ({ allowed, subjectId: '00000000-0000-4000-8000-000000000001' }) } },
    '@/utils/request': {
      apiGet: async () => { reads++; return response ? await response : { items: [{ id: 'synthetic', name: '合成资料' }] } },
      apiPost: async () => { posts++; if (failPost) throw Error('合成额度不足'); return response ? await response : { content: '合成解读' } },
    },
  }
  function load(source) {
    const exports = {}
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
      { exports, uni: { showToast: () => {}, showModal: () => { modals++ } }, require: name => { if (!(name in modules)) throw Error(name); return modules[name] } })
    return exports
  }
  modules['@/lib/paipan/native-history-scope'] = load(fs.readFileSync('apps/mobile/src/lib/paipan/native-history-scope.ts', 'utf8'))
  modules['@/composables/useNativePreviewPage'] = load(fs.readFileSync('apps/mobile/src/composables/useNativePreviewPage.ts', 'utf8'))
  const source = fs.readFileSync('apps/mobile/src/pkg-paipan/ai/index.vue', 'utf8')
  const page = load(source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1] + '\nexport { preview, loadRecords, analyze, records, picked, school, result, failed };')
  return { page, hooks, deny: () => { allowed = false }, switch: () => { token = 'B' }, delay: value => { response = value }, fail: () => { failPost = true }, counts: () => ({ reads, posts, modals }) }
}

test('AI页不在setup裸读记录，进入核验通过后加载，双击分析只提交一次', async () => {
  const f = fixture(); assert.equal(f.counts().reads, 0)
  f.hooks.onShow(); await flush(); assert.equal(f.counts().reads, 1)
  f.page.picked.value = f.page.records.value[0]; f.page.school.value = 'ziping'
  await Promise.all([f.page.analyze(), f.page.analyze()])
  assert.equal(f.counts().posts, 1); assert.equal(f.page.result.value.content, '合成解读')
  assert.equal(f.page.picked.value.id, 'synthetic'); assert.equal(f.page.school.value, 'ziping')
})
for (const kind of ['records', 'analysis']) for (const cancel of ['hide', 'account', 'deny']) test(`AI页${kind}在${cancel}后不恢复个人记录/解读`, async () => {
  const f = fixture(); await f.page.loadRecords(); f.page.picked.value = f.page.records.value[0]
  let finish; f.delay(new Promise(resolve => { finish = resolve }))
  const work = kind === 'records' ? f.page.loadRecords() : f.page.analyze()
  await flush()
  if (cancel === 'hide') f.hooks.onHide()
  else if (cancel === 'account') f.switch()
  else f.deny()
  finish(kind === 'records' ? { items: [{ id: 'late' }] } : { content: '迟到' })
  await work
  assert.equal(f.page.records.value.length, 0); assert.equal(f.page.result.value, null)
  assert.equal(f.page.picked.value, null); assert.equal(f.counts().modals, 0)
})
test('整套关闭阻止AI消费，当前业务错误可见且保留已选记录', async () => {
  const f = fixture(); await f.page.loadRecords(); f.page.picked.value = f.page.records.value[0]
  f.fail(); await f.page.analyze()
  assert.equal(f.counts().modals, 1); assert.equal(f.page.picked.value.id, 'synthetic')
  f.deny(); await f.page.analyze(); assert.equal(f.counts().posts, 1)
})
