import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const ts = createRequire(resolve('apps/admin/package.json'))('typescript')
function setup(confirm = async () => {}) {
  const writes = []; const messages = []; const exports = {}
  const api = {
    get: async () => ({ data: [] }),
    post: async (url, body) => {
      if (url.endsWith('/preview')) return { data: { previewOnly: true, published: false, baseFingerprint: 'a'.repeat(64), enabled: true, percentage: 20, targetUserCount: 0, anonymousEnabled: false, clientVisible: true } }
      writes.push({ url, body }); return { data: {} }
    },
    put: async (url, body) => { writes.push({ url, body }); return { data: {} } },
    delete: async (url, body) => { writes.push({ url, body }); return { data: {} } },
  }
  const source = fs.readFileSync('apps/admin/src/views/system/FeatureFlagList.vue', 'utf8').split('<script setup lang="ts">')[1].split('</script>')[0]
  const code = ts.transpileModule(source + '\nexport { openHistory, historyRows, historyLoading, historyError, fetchList, list, page, total, loadError, loading, openArchived, archivedRows, archivedLoading, del, save, form, openCreate, openEdit, saving, historyFlag, rollbackHistory, requiresReload, reloadEditor };', {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText
  vm.runInNewContext(code, { exports, require: name => {
    if (name === 'vue') return { ref: value => ({ value }), reactive: value => value, onMounted: () => {} }
    if (name === 'element-plus') return { ElMessage: { warning: text => messages.push(text), error: text => messages.push(text), success: text => messages.push(text) }, ElMessageBox: { confirm } }
    if (name === '@/api') return { api }
    if (name === '@/lib/confirm-message') return { createConfirmMessage: value => value }
    throw new Error(name)
  } })
  exports.openEdit({ key: 'client_test', name: '测试功能', enabled: true, percentage: 20 })
  return { ...exports, writes, api, messages }
}
test('已删除配置入口只读加载，异常返回清空旧记录并提示', async () => {
  const state = setup()
  state.api.get = async url => { assert.equal(url, '/admin/feature-flags/archived/list'); return { data: [{ key: 'client_deleted' }] } }
  await state.openArchived()
  assert.equal(state.archivedRows.value[0].key, 'client_deleted')
  state.api.get = async () => ({ data: {} })
  await state.openArchived()
  assert.equal(state.archivedRows.value.length, 0)
  assert.equal(state.archivedLoading.value, false)
  assert.equal(state.writes.length, 0)
  assert.ok(state.messages.some(message => message.includes('已删除配置加载失败')))
})
test('删除确认锁定对象且携带指纹，重复点击不增写', async () => {
  let release
  const state = setup(() => new Promise(resolve => { release = resolve }))
  const row = { key: 'client_test', name: '测试' }
  const pending = state.del(row)
  await Promise.resolve(); await Promise.resolve()
  row.key = 'other'
  await state.del(row)
  release(); await pending
  assert.equal(state.writes.length, 1)
  assert.equal(state.writes[0].url, '/admin/feature-flags/client_test')
  assert.equal(state.writes[0].body.data.expectedFingerprint, 'a'.repeat(64))
  assert.equal(state.saving.value, false)
})
test('删除取消不写；删除失败明确告警而非静默吞错', async () => {
  const cancelled = setup(async () => { throw 'cancel' })
  await cancelled.del({ key: 'client_test' })
  assert.equal(cancelled.writes.length, 0)
  assert.equal(cancelled.messages.length, 0)
  const failed = setup()
  failed.api.delete = async () => { throw new Error('conflict') }
  await failed.del({ key: 'client_test' })
  assert.ok(failed.messages.some(message => message.includes('删除未完成')))
  assert.equal(failed.saving.value, false)
})
test('取消预览确认不会发布，保留编辑内容', async () => {
  const state = setup(async () => { throw new Error('cancel') })
  await state.save()
  assert.equal(state.writes.length, 0)
  assert.equal(state.form.name, '测试功能')
  assert.equal(state.saving.value, false)
})
test('确认后携带预览指纹发布，不发送显示用技术结果', async () => {
  const state = setup()
  await state.save()
  assert.equal(state.writes.length, 1)
  assert.equal(state.writes[0].body.expectedFingerprint, 'a'.repeat(64))
  assert.equal(state.writes[0].body.previewOnly, undefined)
})
test('确认中重复点击和切换对象不能增加写请求', async () => {
  let release
  const state = setup(() => new Promise(resolve => { release = resolve }))
  const first = state.save()
  await Promise.resolve(); await Promise.resolve()
  await state.save()
  state.openCreate()
  state.openEdit({ key: 'other', name: '其他' })
  assert.equal(state.form.key, 'client_test')
  release(); await first
  assert.equal(state.writes.length, 1)
})
test('预览响应异常或服务失败不尝试发布', async () => {
  for (const preview of [async () => ({ data: {} }), async () => { throw new Error('offline') }]) {
    const state = setup(); state.api.post = preview
    await state.save()
    assert.equal(state.writes.length, 0)
    assert.equal(state.saving.value, false)
    assert.ok(state.messages.length > 0)
  }
})

test('回滚确认期间锁定对象，重复点击只产生一次请求且带指纹', async () => {
  let release
  const state = setup(() => new Promise(resolve => { release = resolve }))
  state.historyFlag.value = { key: 'client_test', name: '测试' }
  const first = state.rollbackHistory({ version: 2 })
  await Promise.resolve(); await Promise.resolve()
  state.historyFlag.value = { key: 'other', name: '其他' }
  await state.rollbackHistory({ version: 3 })
  release(); await first
  assert.equal(state.writes.length, 1)
  assert.equal(state.writes[0].url, '/admin/feature-flags/client_test/rollback/2')
  assert.equal(state.writes[0].body.expectedFingerprint, 'a'.repeat(64))
})

test('取消回滚不写入且解除忙碌状态', async () => {
  const state = setup(async () => { throw new Error('cancel') })
  state.historyFlag.value = { key: 'client_test', name: '测试' }
  await state.rollbackHistory({ version: 2 })
  assert.equal(state.writes.length, 0)
  assert.equal(state.saving.value, false)
})

test('结果不明后不能再次提交，重新加载并核对后才恢复', async () => {
  const state = setup()
  let attempts = 0
  state.api.put = async () => { attempts++; throw new Error('409') }
  await state.save(); await state.save()
  assert.equal(attempts, 1)
  assert.equal(state.requiresReload.value, true)
  state.api.get = async url => { assert.equal(url, '/admin/feature-flags/client_test'); return { data: { key: 'client_test', name: '最新配置', percentage: 40, enabled: false } } }
  await state.reloadEditor()
  assert.equal(state.requiresReload.value, false)
  assert.equal(state.form.name, '最新配置')
  assert.equal(state.form.percentage, 40)
})

test('全量开关列表正确分页，删除末页后回到仍存在的页', async () => {
  const state = setup()
  state.api.get = async () => ({ data: Array.from({ length: 21 }, (_, i) => ({ key: `flag_${i}` })) })
  state.page.value = 2
  await state.fetchList()
  assert.equal(state.total.value, 21)
  assert.equal(state.list.value.length, 1)
  assert.equal(state.list.value[0].key, 'flag_20')
  state.api.get = async () => ({ data: [{ key: 'remaining' }] })
  await state.fetchList()
  assert.equal(state.page.value, 1)
  assert.equal(state.list.value[0].key, 'remaining')
})

test('慢列表响应不能覆盖后一次请求，异常响应不伪装为空列表', async () => {
  const state = setup()
  let release
  state.api.get = () => new Promise(resolve => { release = resolve })
  const first = state.fetchList()
  state.api.get = async () => ({ data: [{ key: 'new' }] })
  await state.fetchList()
  release({ data: [{ key: 'old' }] }); await first
  assert.equal(state.list.value[0].key, 'new')
  state.api.get = async () => ({ data: {} })
  await state.fetchList()
  assert.equal(state.loadError.value, true)
  assert.equal(state.total.value, 0)
  assert.equal(state.loading.value, false)
})

test('重新加载失败或错对象时仍禁止再次发布', async () => {
  for (const get of [async () => { throw new Error('offline') }, async () => ({ data: { key: 'other', enabled: true } })]) {
    const state = setup()
    state.requiresReload.value = true
    state.api.get = get
    await state.reloadEditor()
    assert.equal(state.requiresReload.value, true)
    assert.equal(state.saving.value, false)
    assert.equal(state.writes.length, 0)
  }
})

test('切换历史对象后旧请求不能覆盖新历史，加载失败不允许回滚', async () => {
  const state = setup()
  let release
  state.api.get = () => new Promise(resolve => { release = resolve })
  const old = state.openHistory({ key: 'old' })
  state.api.get = async () => ({ data: [{ id: 'new-history', version: 3 }] })
  await state.openHistory({ key: 'new' })
  release({ data: [{ id: 'old-history', version: 1 }] }); await old
  assert.equal(state.historyFlag.value.key, 'new')
  assert.equal(state.historyRows.value[0].id, 'new-history')
  state.api.get = async () => ({ data: {} })
  await state.openHistory({ key: 'new' })
  await state.rollbackHistory({ version: 3 })
  assert.equal(state.historyError.value, true)
  assert.equal(state.historyRows.value.length, 0)
  assert.equal(state.writes.length, 0)
})
