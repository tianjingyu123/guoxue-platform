import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import test from 'node:test'

const ts = createRequire(new URL('../../apps/mobile/package.json', import.meta.url))('typescript')
const page = readFileSync(new URL('../../apps/mobile/src/pkg-workspace/report/index.vue', import.meta.url), 'utf8')
const source = page.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '')
const compiled = ts.transpileModule(source + '\nglobalThis.page={id,report,chapters,dirty,isPro,save,onEdit,refreshReportOnShow};', { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText
const snapshot = (name) => ({ id: 'r1', updatedAt: name, title: name, status: 'draft', chapters: [{ key: 'c1', title: '解读', body: name }] })
function setup() {
  const requests = [], hooks = {}
  const ctx = {
    ref: value => ({ value }), computed: getter => ({ get value() { return getter() } }),
    onLoad: () => {}, onBackPress: () => {}, onShow: fn => { hooks.show = fn },
    onHide: fn => { hooks.hide = fn }, onUnload: fn => { hooks.unload = fn },
    wsApi: { getReport: () => new Promise(resolve => requests.push(resolve)), pro: async () => ({ isPro: true }), updateReport: async () => snapshot('saved') },
    uni: { showToast: () => {} }, setTimeout,
  }
  vm.runInNewContext(compiled, ctx)
  const p = ctx.page; p.id.value = 'r1'; p.report.value = snapshot('initial'); p.chapters.value = p.report.value.chapters.map(x => ({ ...x }))
  return { p, hooks, requests }
}
test('正常回页刷新仍更新报告和权益状态', async () => {
  const { p, hooks, requests } = setup(); const pending = hooks.show(); requests[0](snapshot('fresh')); await pending
  assert.equal(p.report.value.title, 'fresh'); assert.equal(p.isPro.value, true)
})
test('刷新期间编辑并保存完成，迟到旧响应不能覆盖已保存稿', async () => {
  const { p, hooks, requests } = setup(); const pending = hooks.show()
  p.onEdit(0, { detail: { value: 'new draft' } }); assert.equal(await p.save(), true)
  assert.equal(p.dirty.value, false); requests[0](snapshot('old')); await pending
  assert.equal(p.report.value.title, 'saved'); assert.equal(p.chapters.value[0].body, 'saved')
})
test('未保存输入不被回页刷新覆盖', async () => {
  const { p, hooks, requests } = setup(); const pending = hooks.show()
  p.onEdit(0, { detail: { value: 'unsaved' } }); requests[0](snapshot('old')); await pending
  assert.equal(p.chapters.value[0].body, 'unsaved'); assert.equal(p.dirty.value, true)
})
test('连续回页的旧请求不能抢先覆盖最新请求', async () => {
  const { p, hooks, requests } = setup(); const old = hooks.show(); const current = hooks.show()
  requests[0](snapshot('stale')); await old; assert.equal(p.report.value.title, 'initial')
  requests[1](snapshot('latest')); await current; assert.equal(p.report.value.title, 'latest')
})
for (const event of ['hide', 'unload']) test(`页面${event}后忽略迟到的报告及权益状态`, async () => {
  const { p, hooks, requests } = setup(); const pending = hooks.show(); hooks[event]()
  requests[0](snapshot('old')); await pending
  assert.equal(p.report.value.title, 'initial'); assert.equal(p.isPro.value, false)
})
