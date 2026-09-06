import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const ts = createRequire(resolve('apps/mobile/package.json'))('typescript')
function setup() {
  const exports = {}, calls = [], paths = []
  const api = {
    getManageList: async strict => { calls.push(['list', strict]); return { list: [
      { id: 'a', title: '可选', orientation: 'landscape', status: 'preview' },
      { id: 'b', orientation: 'portrait', status: 'preview' },
      { id: 'c', orientation: 'landscape', status: 'ended' },
      { id: 'd', orientation: 'landscape', status: 'live', removed: true },
    ] } },
    getStreamConfig: async id => { calls.push(['sign', id]); return { roomId: id, streamUrl: 'synthetic-server', streamKey: 'synthetic-key' } },
  }
  const source = fs.readFileSync('apps/mobile/src/pkg-live/stream-config/index.vue', 'utf8').split('<script setup lang="ts">')[1].split('</script>')[0]
  const code = ts.transpileModule(source + '\nexport { fetchData, handleRefresh, selectRoom, chooseAnother, openManage, roomId, rooms, error, config, loading, checking };', {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText
  vm.runInNewContext(code, { exports, require: name => {
    if (name === 'vue') return { ref: value => ({ value }), computed: fn => ({ get value() { return fn() } }) }
    if (name === '@dcloudio/uni-app') return { onLoad: () => {} }
    if (name === '@/utils/router') return { goBack() {}, navigateTo: path => paths.push(path) }
    if (name === '@/lib/live-data') return { liveApi: api, obsConfigSteps: [], streamConfigFaq: [] }
    throw new Error(name)
  }, uni: { getSystemInfoSync: () => ({}), showToast() {} } })
  return { ...exports, api, calls, paths }
}
test('无房间只读加载本人可用横屏场次，不签发；提供管理创建入口', async () => {
  const s = setup(); await s.fetchData()
  assert.deepEqual(s.calls, [['list', true]])
  assert.deepEqual(Array.from(s.rooms.value, room => room.id), ['a'])
  s.openManage(); assert.deepEqual(s.paths, ['/pkg-live/manage/index'])
})
test('加载失败明确提示，不把网络失败冒充没有场次', async () => {
  const s = setup(); s.api.getManageList = async () => { throw new Error('合成网络失败') }
  await s.fetchData(); assert.equal(s.error.value, '合成网络失败'); assert.equal(s.loading.value, false)
})
test('刷新失败清空旧凭据，不能继续复制陈旧信息', async () => {
  const s = setup(); s.roomId.value = 'a'; await s.fetchData()
  assert.equal(s.config.value.streamKey, 'synthetic-key')
  s.api.getStreamConfig = async () => { throw new Error('授权已撤销') }
  await s.handleRefresh(); assert.equal(s.config.value.streamKey, '')
  assert.equal(s.error.value, '授权已撤销'); assert.equal(s.checking.value, false)
})
test('更新中不能切房或重复签发，完成后清旧凭据再选房', async () => {
  const s = setup(); s.roomId.value = 'a'; await s.fetchData()
  let release; s.api.getStreamConfig = () => new Promise(resolve => { release = resolve })
  const pending = s.handleRefresh()
  s.selectRoom('b'); s.chooseAnother(); await s.handleRefresh()
  assert.equal(s.roomId.value, 'a')
  release({ roomId: 'a', streamKey: 'fresh' }); await pending
  s.chooseAnother(); assert.equal(s.roomId.value, ''); assert.equal(s.config.value.streamKey, '')
})
