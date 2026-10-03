import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import test from 'node:test'
const ts = createRequire(new URL('../../apps/mobile/package.json', import.meta.url))('typescript')
const vue = readFileSync(new URL('../../apps/mobile/src/pkg-workspace/components/client-manager.vue', import.meta.url), 'utf8')
const source = vue.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '')
const js = ts.transpileModule(source + '\nglobalThis.page={detail,detailLoading,openDetail,completeReminder,completingReminder};', { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText
function setup() {
  const reads = [], writes = [], messages = [], hooks = {}
  const ctx = { ref: value => ({ value }), defineProps: () => ({}), defineEmits: () => () => {}, useOverlayScrollLock: () => {}, onMounted: () => {}, onShow: () => {}, onUnmounted: fn => { hooks.unmount = fn },
    wsApi: { getClient: id => new Promise((resolve,reject) => reads.push({ id,resolve,reject })), markReminderDone: id => new Promise(resolve => writes.push({ id,resolve })) },
    uni: { showToast: message => messages.push(message) } }
  vm.runInNewContext(js, ctx)
  return { p: ctx.page, reads,writes,messages,hooks }
}
test('切换客户时，旧详情响应和错误都不能覆盖当前详情', async () => {
  const {p,reads,messages} = setup(); const a=p.openDetail('a'); const b=p.openDetail('b')
  reads[0].reject(new Error('旧请求失败')); await a
  assert.equal(p.detail.value.id,'b'); assert.equal(p.detailLoading.value,true); assert.equal(messages.length,0)
  reads[1].resolve({id:'b',name:'测试乙'}); await b; assert.equal(p.detail.value.name,'测试乙')
})
test('关闭弹层后迟到详情不能重新打开', async () => {
  const {p,reads} = setup(); const a=p.openDetail('a'); p.detail.value=null; reads[0].resolve({id:'a'}); await a; assert.equal(p.detail.value,null)
})
test('同一客户重新打开也必须只接受最新请求', async () => {
  const {p,reads} = setup(); const a=p.openDetail('a'); const b=p.openDetail('a')
  reads[0].resolve({id:'a',name:'旧'}); await a; assert.equal(p.detail.value.name,undefined)
  reads[1].resolve({id:'a',name:'新'}); await b; assert.equal(p.detail.value.name,'新')
})
test('回访处理中切换客户，不刷新另一客户或重复写入', async () => {
  const {p,reads,writes,messages} = setup(); p.detail.value={id:'a'}
  const pending=p.completeReminder('r1'); await p.completeReminder('r1'); assert.equal(writes.length,1)
  const other=p.openDetail('b'); writes[0].resolve(); await pending
  assert.equal(reads.length,1); assert.equal(p.detail.value.id,'b'); assert.equal(messages.length,0)
  reads[0].resolve({id:'b'}); await other
})
test('正常回访完成刷新原客户并释放操作锁', async () => {
  const {p,reads,writes,messages} = setup(); p.detail.value={id:'a'}
  const pending=p.completeReminder('r1'); writes[0].resolve(); await new Promise(setImmediate)
  assert.equal(reads[0].id,'a'); reads[0].resolve({id:'a',reminders:[]}); await pending
  assert.equal(p.completingReminder.value,''); assert.equal(messages[0].title,'已完成回访')
})
test('卸载组件后迟到响应被丢弃', async () => {
  const {p,reads,hooks} = setup(); const pending=p.openDetail('a'); hooks.unmount(); reads[0].resolve({id:'a'}); await pending; assert.equal(p.detail.value,null)
})
