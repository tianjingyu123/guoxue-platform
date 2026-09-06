import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const ts = createRequire(resolve('apps/mobile/package.json'))('typescript')
const flush = () => new Promise(resolve => setImmediate(resolve))
function fixture() {
  let allowed = true, token = 'A', saveResponse, modal, scoreFails = false
  const hooks = {}, calls = []
  const modules = {
    vue: { ref: value => ({ value }), computed: fn => ({ get value() { return fn() } }) },
    '@dcloudio/uni-app': Object.fromEntries(['onLoad', 'onShow', 'onHide', 'onUnload'].map(name => [name, fn => { hooks[name] = fn }])),
    '@/utils/storage': { getToken: () => token }, '@/utils/router': { navigateTo: () => {} },
    '@/lib/legacy-paipan-data': { legacyPaipanApi: { nativeQaAccess: async () => ({ allowed, subjectId: '00000000-0000-4000-8000-000000000001' }) } },
    '@/pkg-paipan/lib/case-data': { LIFE_DIMENSIONS: [{ key: 'career' }], caseApi: {
      detail: async () => ({ id: 'synthetic', availableMethods: ['BAZI'] }),
      myAttempt: async () => ({ guess: {}, revealed: false, selfScore: null }),
      saveGuess: async () => { calls.push('save'); if (saveResponse) await saveResponse },
      reveal: async () => { calls.push('reveal'); return { life: { career: '合成经历' }, events: [] } },
      selfScore: async () => { calls.push('score'); if (scoreFails) throw Error('合成失败') },
    } },
  }
  function load(source) {
    const exports = {}
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
      { exports, uni: { showToast: () => {}, showModal: value => { modal = value } }, require: name => { if (!(name in modules)) throw Error(name); return modules[name] } })
    return exports
  }
  modules['@/lib/paipan/native-history-scope'] = load(fs.readFileSync('apps/mobile/src/lib/paipan/native-history-scope.ts', 'utf8'))
  modules['@/composables/useNativePreviewPage'] = load(fs.readFileSync('apps/mobile/src/composables/useNativePreviewPage.ts', 'utf8'))
  const source = fs.readFileSync('apps/mobile/src/pkg-paipan/cases/detail.vue', 'utf8')
  const page = load(source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1] + '\nexport { preview, load, saveGuess, confirmReveal, doReveal, setScore, c, guess, answer, selfScore };')
  hooks.onLoad({ id: 'synthetic' })
  return { page, hooks, calls, confirm: () => modal.success({ confirm: true }), deny: () => { allowed = false }, switch: () => { token = 'B' }, delaySave: value => { saveResponse = value }, failScore: () => { scoreFails = true } }
}
test('公布答案先存断语再公布，双击只执行一次，失败自评不显示已保存', async () => {
  const f = fixture(); await f.page.load(); f.page.guess.value = { career: '合成判断' }
  f.page.confirmReveal(); f.confirm(); f.confirm(); await flush()
  assert.deepEqual(f.calls, ['save', 'reveal']); assert.ok(f.page.answer.value)
  f.failScore(); await f.page.setScore(2); assert.equal(f.page.selfScore.value, null)
  assert.equal(f.page.guess.value.career, '合成判断')
})
for (const cancel of ['hide', 'account', 'deny', 'reshow']) test(`旧公布确认在${cancel}后不写入`, async () => {
  const f = fixture(); await f.page.load(); f.page.confirmReveal()
  if (cancel === 'hide') f.hooks.onHide()
  else if (cancel === 'account') f.switch()
  else if (cancel === 'deny') f.deny()
  else { f.hooks.onHide(); await f.page.load() }
  f.confirm(); await flush(); assert.deepEqual(f.calls, [])
})
for (const cancel of ['hide', 'account', 'deny']) test(`断语保存期间${cancel}停止后续公布且不恢复资料`, async () => {
  const f = fixture(); await f.page.load(); f.page.guess.value = { career: '合成判断' }
  let finish; f.delaySave(new Promise(resolve => { finish = resolve }))
  const work = f.page.doReveal(); await flush(); assert.deepEqual(f.calls, ['save'])
  if (cancel === 'hide') f.hooks.onHide(); else if (cancel === 'account') f.switch(); else f.deny()
  finish(); await work
  assert.deepEqual(f.calls, ['save']); assert.equal(f.page.c.value, null); assert.equal(f.page.answer.value, null)
})
