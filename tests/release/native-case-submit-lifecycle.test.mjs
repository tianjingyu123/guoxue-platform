import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const ts = createRequire(resolve('apps/mobile/package.json'))('typescript')
const flush = () => new Promise(resolve => setImmediate(resolve))
function fixture() {
  let allowed = true, token = 'A', response, failing = false, modal, backs = 0
  const hooks = {}, sent = []
  const modules = {
    vue: { ref: value => ({ value }), computed: fn => ({ get value() { return fn() } }) },
    '@dcloudio/uni-app': Object.fromEntries(['onShow', 'onHide', 'onUnload'].map(name => [name, fn => { hooks[name] = fn }])),
    '@/utils/storage': { getToken: () => token }, '@/utils/router': { navigateBack: () => { backs++ } },
    '@/pkg-paipan/lib/bazi-engine': { computeBazi: () => ({}) },
    '@/lib/legacy-paipan-data': { legacyPaipanApi: { nativeQaAccess: async () => ({ allowed, subjectId: '00000000-0000-4000-8000-000000000001' }) } },
    '@/pkg-paipan/lib/case-data': { LIFE_DIMENSIONS: [{ key: 'career' }], caseApi: {
      rewardPlan: async () => ({ enabled: false, tiers: [] }),
      submit: async value => { sent.push(value); if (failing) throw Error('合成失败'); return response ? await response : { quality: 80 } },
    } },
  }
  function load(source) {
    const exports = {}
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
      { exports, uni: { showModal: value => { modal = value } }, require: name => { if (!(name in modules)) throw Error(name); return modules[name] } })
    return exports
  }
  modules['@/lib/paipan/native-history-scope'] = load(fs.readFileSync('apps/mobile/src/lib/paipan/native-history-scope.ts', 'utf8'))
  modules['@/composables/useNativePreviewPage'] = load(fs.readFileSync('apps/mobile/src/composables/useNativePreviewPage.ts', 'utf8'))
  const source = fs.readFileSync('apps/mobile/src/pkg-paipan/cases/submit.vue', 'utf8')
  const page = load(source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1] + '\nexport { preview, loadReward, submit, mode, title, pillars, life, consent };')
  const fill = () => {
    page.mode.value = 'pillars'; page.title.value = '合成匿名案例'
    page.pillars.value = { year: '甲子', month: '甲子', day: '甲子', hour: '甲子' }
    page.life.value = { career: '合成经历' }; page.consent.value = true
  }
  return { page, hooks, sent, fill, confirm: () => modal.success({ confirm: true }), deny: () => { allowed = false }, switch: () => { token = 'B' }, delay: value => { response = value }, fail: () => { failing = true }, backs: () => backs, modal: () => modal }
}
test('投稿双击只提交一次，成功清表单，确认只返回一次', async () => {
  const f = fixture(); await f.page.loadReward(); f.fill()
  await Promise.all([f.page.submit(), f.page.submit()])
  assert.equal(f.sent.length, 1); assert.equal(f.sent[0].title, '合成匿名案例')
  assert.equal(f.sent[0].life.career, '合成经历'); assert.equal(f.page.title.value, '')
  f.confirm(); f.confirm(); assert.equal(f.backs(), 1)
})
test('投稿失败保留当前表单，允许用户明确重试', async () => {
  const f = fixture(); await f.page.loadReward(); f.fill(); f.fail(); await f.page.submit()
  assert.equal(f.page.title.value, '合成匿名案例'); assert.equal(f.page.consent.value, true)
  assert.equal(f.modal().title, '投稿未成功')
})
for (const cancel of ['hide', 'account', 'deny']) test(`投稿进行中${cancel}后响应不弹窗、不恢复、不自动重试`, async () => {
  const f = fixture(); await f.page.loadReward(); f.fill()
  let finish; f.delay(new Promise(resolve => { finish = resolve })); const work = f.page.submit(); await flush()
  if (cancel === 'hide') f.hooks.onHide(); else if (cancel === 'account') f.switch(); else f.deny()
  finish({ quality: 80 }); await work
  assert.equal(f.sent.length, 1); assert.equal(f.modal(), undefined); assert.equal(f.page.title.value, '')
})
test('成功弹窗离页后确认不劫持返回，未同意授权不投稿', async () => {
  const f = fixture(); await f.page.loadReward(); f.fill(); f.page.consent.value = false
  await f.page.submit(); assert.equal(f.sent.length, 0)
  f.page.consent.value = true; await f.page.submit(); f.hooks.onHide(); f.confirm(); assert.equal(f.backs(), 0)
})
