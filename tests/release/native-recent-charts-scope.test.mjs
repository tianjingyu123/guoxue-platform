import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
// 同一发布专项同时覆盖记录聚合与结果页真实生命周期，防止只验存储不验消费方。
import './taiyi-result-lifecycle.test.mjs'
const ts = createRequire(resolve('apps/mobile/package.json'))('typescript')

test('聚合历史只读本次账号命名空间，不回退设备公共旧记录', () => {
  let scope = null
  const reads = [], data = new Map(), exports = {}
  const source = fs.readFileSync('apps/mobile/src/lib/paipan/recent-charts.ts', 'utf8')
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports,
    require: name => name.includes('native-history-scope')
      ? { nativeHistoryKey: key => scope ? `${key}:account:${scope}` : null }
      : { formatRecordTime: () => '测试时间' },
    uni: { getStorageSync: key => { reads.push(key); return data.get(key) } },
  })
  const spec = exports.RECENT_TOOLS.find(t => t.key === 'bazi')
  assert.ok(spec)
  data.set(spec.storageKey, [{ name: '公共遗留记录', ts: 1 }])
  data.set(`${spec.storageKey}:account:A`, [{ name: '账号A记录', ts: 2 }])
  assert.equal(exports.recentCharts().length, 0)
  assert.equal(reads.length, 0)
  scope = 'A'
  assert.equal(exports.recentCharts()[0].title, '账号A记录')
  assert.equal(exports.chartCounts().bazi, 1)
  scope = 'B'
  assert.equal(exports.recentCharts().length, 0)
  assert.equal(reads.includes(spec.storageKey), false)
})

test('两个聚合消费方均复用整套核验，历史页不在挂载时裸读取', () => {
  const history = fs.readFileSync('apps/mobile/src/pkg-paipan/history/index.vue', 'utf8')
  const workspace = fs.readFileSync('apps/mobile/src/pkg-workspace/components/paipan-center.vue', 'utf8')
  for (const source of [history, workspace]) {
    assert.match(source, /useNativePreviewPage\(load,/)
    assert.doesNotMatch(source, /onMounted\(load\)|onShow\(load\)/)
  }
  assert.match(history, /!preview.allowed.value/)
  assert.match(history, /all.value = \[\]/)
  assert.match(workspace, /recents.value = \[\]/)
})

for (const [tool, name] of [['taiyi', 'Taiyi'], ['feigong', 'Feigong'], ['chuanren', 'Chuanren'], ['yinpan-mingli', 'Mingli']]) test(`${tool}保存到当前账号后总历史可读，切号和撤销不读写公共旧记录`, () => {
  let scope = null
  const data = new Map(), modules = {
    '@/lib/paipan/native-history-scope': { nativeHistoryKey: key => scope ? `${key}:account:${scope}` : null },
    './history-core': { formatRecordTime: () => '测试' },
  }
  modules['./native-history-scope'] = modules['@/lib/paipan/native-history-scope']
  const uni = { getStorageSync: key => data.get(key), setStorageSync: (key, value) => data.set(key, value) }
  const load = file => {
    const exports = {}
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
      { exports, uni, require: key => modules[key] })
    return exports
  }
  const sourceStore = load(`apps/mobile/src/pkg-paipan/${tool}/${tool}-history.ts`)
  const store = { saveTaiyiHistory: sourceStore[`save${name}History`], loadTaiyiHistory: sourceStore[`load${name}History`], clearTaiyiHistory: sourceStore[`clear${name}History`] }
  const aggregate = load('apps/mobile/src/lib/paipan/recent-charts.ts')
  const params = { name: '合成记录', topic: '合成记录', year: 2026, month: 9, day: 5, hour: 12, minute: 0, panShi: 'hour', suanFa: 'zhijin' }
  data.set(`rebu:${tool}-history`, '旧设备数据不自动认领')
  assert.throws(() => store.saveTaiyiHistory(params, '合成摘要'))
  scope = 'A'; store.saveTaiyiHistory(params, '合成摘要'); store.saveTaiyiHistory(params, '更新摘要')
  assert.equal(store.loadTaiyiHistory().length, 1)
  assert.equal(aggregate.recentCharts(10, [tool])[0].title, '合成记录')
  scope = 'B'; assert.equal(store.loadTaiyiHistory().length, 0)
  store.clearTaiyiHistory()
  scope = 'A'; assert.equal(store.loadTaiyiHistory().length, 1)
  scope = null; assert.throws(() => store.clearTaiyiHistory())
  assert.equal(data.get(`rebu:${tool}-history`), '旧设备数据不自动认领')
})
import './native-shake-lifecycle.test.mjs'
import './native-dictionary-lifecycle.test.mjs'
import './native-ai-lifecycle.test.mjs'
import './native-case-list-lifecycle.test.mjs'
import './native-case-detail-lifecycle.test.mjs'
import './native-case-submit-lifecycle.test.mjs'
import './native-wuyun-lifecycle.test.mjs'
import './native-shanxiang-lifecycle.test.mjs'
import './native-bazhai-lifecycle.test.mjs'
import './native-lijichi-lifecycle.test.mjs'
import './native-zhuge-lifecycle.test.mjs'
import './native-shuzi-lifecycle.test.mjs'
import './native-xingming-lifecycle.test.mjs'
import './native-qiming-lifecycle.test.mjs'
import './compass-readout-source.test.mjs'
