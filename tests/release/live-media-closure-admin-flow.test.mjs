import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const ts = createRequire(resolve('apps/admin/package.json'))('typescript')
const response = id => ({ data: { room: { id }, outcome: { reason: 'COMPLETED', title: '媒体资源已收尾', nextStep: '无需重复操作' }, worker: { state: 'FINISHED' }, providers: [] } })
function setup() {
  const exports = {}, props = { modelValue: true, roomId: 'room-a' }, events = []
  let changed, unmount
  const api = { mediaClosure: async id => { events.push(id); return response(id) } }
  const source = fs.readFileSync('apps/admin/src/views/lives/LiveMediaClosureDialog.vue', 'utf8').split('<script setup lang="ts">')[1].split('</script>')[0]
  const code = ts.transpileModule(source + '\nexport { load, data, failed, loading };', { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText
  vm.runInNewContext(code, { exports, defineProps: () => props, defineEmits: () => () => {}, require: name => {
    if (name === '@/api') return { liveApi: api }
    if (name === 'vue') return { ref: value => ({ value }), watch: (_getter, callback) => { changed = callback }, onBeforeUnmount: callback => { unmount = callback } }
    throw new Error(name)
  } })
  return { ...exports, props, api, events, changed: () => changed(), unmount: () => unmount() }
}
test('打开核验只读，失败清空旧结果并显示重试状态', async () => {
  const s = setup(); await s.load(); assert.equal(s.data.value.room.id, 'room-a')
  s.api.mediaClosure = async () => { throw new Error('offline') }; await s.load()
  assert.equal(s.data.value, null); assert.equal(s.failed.value, true); assert.equal(s.loading.value, false)
})
test('重复刷新被合并，关窗后迟到响应不能恢复旧数据', async () => {
  const s = setup(); let finish; let count = 0
  s.api.mediaClosure = () => { count++; return new Promise(resolve => { finish = resolve }) }
  const request = s.load(); await s.load(); assert.equal(count, 1)
  s.props.modelValue = false; s.changed(); finish(response('room-a')); await request
  assert.equal(s.data.value, null); assert.equal(s.loading.value, false)
})
test('快速换房只显示当前房间，旧响应不覆盖', async () => {
  const s = setup(); let finish
  s.api.mediaClosure = id => id === 'room-a' ? new Promise(resolve => { finish = resolve }) : Promise.resolve(response(id))
  const old = s.load(); s.props.roomId = 'room-b'; s.changed(); await new Promise(setImmediate)
  assert.equal(s.data.value.room.id, 'room-b'); finish(response('room-a')); await old
  assert.equal(s.data.value.room.id, 'room-b')
})
test('错误房间或缺字段响应显示错误，不猜测完成', async () => {
  for (const payload of [response('wrong'), { data: {} }]) {
    const s = setup(); s.api.mediaClosure = async () => payload; await s.load()
    assert.equal(s.failed.value, true); assert.equal(s.data.value, null)
  }
})
