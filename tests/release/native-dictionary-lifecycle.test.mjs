import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const ts = createRequire(resolve('apps/mobile/package.json'))('typescript')
const flush = () => new Promise(resolve => setImmediate(resolve))
function fixture() {
  let allowed = true, token = 'A', response, calls = 0, posts = 0
  const hooks = {}
  const modules = {
    vue: { ref: value => ({ value }), computed: fn => ({ get value() { return fn() } }) },
    '@dcloudio/uni-app': Object.fromEntries(['onShow', 'onHide', 'onUnload'].map(name => [name, fn => { hooks[name] = fn }])),
    '@/utils/storage': { getToken: () => token },
    '@/lib/legacy-paipan-data': { legacyPaipanApi: { nativeQaAccess: async () => ({ allowed, subjectId: '00000000-0000-4000-8000-000000000001' }) } },
    '../lib/zidian-engine': { plazaFacets: () => ({}) },
    '../lib/zidian-data': { queryText: async () => { calls++; return response ? await response : [{ char: '福' }] } },
    '@/utils/request': { apiPost: async () => { posts++; return response ? await response : { ai: { poetic: '合成测试' } } } },
  }
  function load(source) {
    const exports = {}
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
      { exports, require: name => { if (!(name in modules)) throw Error(name); return modules[name] } })
    return exports
  }
  modules['@/lib/paipan/native-history-scope'] = load(fs.readFileSync('apps/mobile/src/lib/paipan/native-history-scope.ts', 'utf8'))
  modules['@/composables/useNativePreviewPage'] = load(fs.readFileSync('apps/mobile/src/composables/useNativePreviewPage.ts', 'utf8'))
  const source = fs.readFileSync('apps/mobile/src/pkg-paipan2/zidian/index.vue', 'utf8')
  const page = load(source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1] + '\nexport { preview, submit, runAi, input, birth, query, results, ai, aiError };')
  return { page, hooks, deny: () => { allowed = false }, switch: () => { token = 'B' }, delay: value => { response = value }, counts: () => ({ calls, posts }) }
}

test('字典正常查询及AI保留当前输入，重复点击不重复消耗请求', async () => {
  const f = fixture(); await f.page.preview.run()
  const first = f.page.submit('福'); const duplicate = f.page.submit('福')
  await Promise.all([first, duplicate]); assert.equal(f.counts().calls, 1)
  f.page.birth.value = '合成出生信息'
  await f.page.runAi('福')
  assert.equal(f.counts().posts, 1); assert.equal(f.page.ai.value.poetic, '合成测试')
  assert.equal(f.page.query.value, '福'); assert.equal(f.page.birth.value, '合成出生信息')
})

for (const kind of ['lookup', 'ai']) for (const cancel of ['hide', 'account', 'deny']) test(`字典${kind}在${cancel}后返回不得恢复内容`, async () => {
  const f = fixture(); await f.page.preview.run(); await f.page.submit('福')
  let finish; f.delay(new Promise(resolve => { finish = resolve }))
  const work = kind === 'lookup' ? f.page.submit('新') : f.page.runAi('福')
  await flush()
  if (cancel === 'hide') f.hooks.onHide()
  else if (cancel === 'account') f.switch()
  else f.deny()
  finish(kind === 'lookup' ? [{ char: '新' }] : { ai: { poetic: '迟到结果' } })
  await work
  assert.equal(f.page.results.value.length, 0); assert.equal(f.page.ai.value, null)
  assert.equal(f.page.birth.value, ''); assert.equal(f.page.preview.allowed.value, false)
})

test('整套被关闭后不发出AI请求', async () => {
  const f = fixture(); await f.page.preview.run(); f.deny()
  await f.page.runAi('福'); assert.equal(f.counts().posts, 0)
})
