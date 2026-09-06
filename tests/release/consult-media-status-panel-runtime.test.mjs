import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import test from 'node:test'

const require = createRequire(resolve('apps/admin/package.json')), ts = require('typescript'), vue = require('vue')
const id = '00000000-0000-4000-8000-000000000001', other = '00000000-0000-4000-8000-000000000002'
function setup() {
  const auth = vue.reactive({ token: 'synthetic-token', user: { id: 'admin' }, roles: ['OPERATION_ADMIN'] })
  const api = { mediaStatus: async callId => ({ data: { callId, canRelease: false, notice: '仅记录' } }) }, hooks = {}, exports = {}
  const text = fs.readFileSync('apps/admin/src/views/circles/ConsultMediaStatusPanel.vue', 'utf8').split('<script setup lang="ts">')[1].split('</script>')[0]
  const compiled = ts.transpileModule(text + '\nexport { callId, loading, error, result, inspect, invalidate, label };', {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  vm.runInNewContext(compiled, { exports, defineExpose() {}, require: name => {
    if (name === 'vue') return { ...vue, onBeforeUnmount: fn => { hooks.unmount = fn } }
    if (name === '@/api') return { callDisputeApi: api }
    if (name === '@/store/auth') return { useAuthStore: () => auth }
    throw new Error(name)
  } })
  return { ...exports, api, hooks, auth }
}
test('无效ID不查询，有效ID只读取并展示对应记录', async () => {
  const s = setup(); let calls = 0
  s.api.mediaStatus = async callId => { calls++; return { data: { callId, canRelease: false } } }
  await s.inspect('bad'); assert.equal(calls, 0); assert.match(s.error.value, /有效/)
  await s.inspect(id); assert.equal(calls, 1); assert.equal(s.result.value.callId, id); assert.equal(s.loading.value, false)
})
test('换记录时迟到响应不覆盖新目标', async () => {
  const s = setup(); let finish
  s.api.mediaStatus = () => new Promise(resolve => { finish = resolve })
  const first = s.inspect(id)
  s.api.mediaStatus = async callId => ({ data: { callId, canRelease: false } })
  await s.inspect(other); finish({ data: { callId: id, canRelease: false } }); await first
  assert.equal(s.result.value.callId, other)
})
test('输入变更和卸载均丢弃未完成请求', async () => {
  for (const action of ['invalidate', 'unmount']) {
    const s = setup(); let finish
    s.api.mediaStatus = () => new Promise(resolve => { finish = resolve })
    const pending = s.inspect(id); action === 'unmount' ? s.hooks.unmount() : s.invalidate()
    finish({ data: { callId: id, canRelease: false } }); await pending
    assert.equal(s.result.value, null); assert.equal(s.loading.value, false)
  }
})
test('失败或错误记录不保留旧成功，重试后恢复', async () => {
  const s = setup(); await s.inspect(id)
  s.api.mediaStatus = async () => { throw new Error('NETWORK') }
  await s.inspect(id); assert.equal(s.result.value, null); assert.match(s.error.value, /查询未完成/)
  s.api.mediaStatus = async () => ({ data: { callId: other, canRelease: false } })
  await s.inspect(id); assert.equal(s.result.value, null)
  s.api.mediaStatus = async callId => ({ data: { callId, canRelease: false } })
  await s.inspect(id); assert.equal(s.result.value.callId, id); assert.equal(s.error.value, '')
})
test('受理和退房文案不能冒充完成，不接受释放入口响应', async () => {
  const s = setup()
  assert.match(s.label('ACKNOWLEDGED'), /不代表已停流/); assert.match(s.label('OFFLINE_OBSERVED'), /不代表可释放/)
  s.api.mediaStatus = async callId => ({ data: { callId, canRelease: true } })
  await s.inspect(id); assert.equal(s.result.value, null)
})
test('账号或权限变更同步清空，并丢弃迟到结果', async () => {
  const s = setup(); await s.inspect(id)
  s.auth.user.id = 'other-admin'; assert.equal(s.result.value, null); assert.equal(s.callId.value, '')
  let finish
  s.api.mediaStatus = () => new Promise(resolve => { finish = resolve })
  const pending = s.inspect(id); s.auth.roles = []
  finish({ data: { callId: id, canRelease: false } }); await pending
  assert.equal(s.result.value, null)
  await s.inspect(id); assert.match(s.error.value, /没有媒体核查权限/)
})

test('逐项收尾提示保留且只读，缺失时不冒充完成，畸形结果不展示', async () => {
  const s = setup()
  s.api.mediaStatus = async callId => ({ data: { callId, canRelease: false, closureChecks: [
    { code: 'REENTRY_WINDOW_OPEN', message: '票据有效期内仍可能重新进入。' },
    { code: 'FINAL_PROOF_REQUIRED', message: '等待最终范围和媒体证据。' },
  ] } })
  await s.inspect(id)
  assert.equal(s.result.value.closureChecks.length, 2)
  s.api.mediaStatus = async callId => ({ data: { callId, canRelease: false, closureChecks: [{ code: 'bad' }] } })
  await s.inspect(id); assert.equal(s.result.value, null); assert.match(s.error.value, /查询未完成/)
  const page = fs.readFileSync('apps/admin/src/views/circles/ConsultMediaStatusPanel.vue', 'utf8')
  assert.match(page, /资源收尾待核验项/)
  assert.match(page, /不能据此认定资源已释放/)
  assert.doesNotMatch(page, /callDisputeApi\.(?:resolve|refund|stop|release)/)
})
