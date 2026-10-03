const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const ts = require('typescript')
const vue = require('vue')
const source = fs.readFileSync(path.join(__dirname, '../src/composables/use-same-city.ts'), 'utf8')
const results = []
const tick = () => new Promise(resolve => setImmediate(resolve))
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
function fixture(options = {}) {
  const calls = []
  const storage = new Map(options.preferred ? [['discovery:selected-city:v1', options.preferred]] : [])
  const offline = {
    discoverCities: options.directory || (async () => ['北京市', '保定市']),
    discoverStationPage: async (city, page, size) => {
      calls.push({ city, page, size })
      return options.stations ? options.stations(city, page) : { stations: [{ id: city, name: city }], total: 1 }
    },
  }
  const recommendations = { getSameCity: options.recommendations || (async city => [{ id: city, title: city }]) }
  const context = { exports: {}, uni: { setStorageSync: (key, value) => storage.set(key, value), getStorageSync: key => storage.get(key) }, require: name => {
    if (name === 'vue') return vue
    if (name === '@/lib/offline-data') return { offlineApi: offline }
    if (name === '@/lib/recommend-data') return { recommendApi: recommendations }
    throw Error('未声明依赖' + name)
  } }
  vm.createContext(context)
  vm.runInContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context)
  return { state: context.exports.useSameCity(), calls, storage }
}
async function check(name, action) {
  try { await action(); results.push({ name, passed: true }) }
  catch (error) { results.push({ name, passed: false, error: error.message }) }
}
async function main() {
  await check('不猜位置，初次进入只取目录而不发全国查询', async () => {
    const t = fixture(); await t.state.loadDirectory(); assert.equal(t.state.city.value, ''); assert.equal(t.calls.length, 0); assert.equal(t.state.cities.value.length, 2)
  })
  await check('有效手选偏好恢复且目录不因选城缩成一个城市', async () => {
    const t = fixture({ preferred: '北京市' }); await t.state.loadDirectory(); await t.state.selectCity('保定市')
    assert.equal(t.state.city.value, '保定市'); assert.equal(t.state.cities.value.length, 2); assert.equal(t.storage.get('discovery:selected-city:v1'), '保定市')
  })
  await check('旧城市已停用时清空选择与内容，不退到全国推荐', async () => {
    const t = fixture({ preferred: '不存在市' }); await t.state.loadDirectory(); assert.equal(t.state.city.value, ''); assert.equal(t.calls.length, 0)
  })
  await check('目录空结果和目录错误分别展示', async () => {
    const empty = fixture({ directory: async () => [] }); await empty.state.loadDirectory(); assert.equal(empty.state.directoryError.value, false)
    const failure = fixture({ directory: async () => { throw Error('合成') } }); await failure.state.loadDirectory(); assert.equal(failure.state.directoryError.value, true); assert.equal(failure.calls.length, 0)
  })
  await check('目录以外的输入不提交查询', async () => {
    const t = fixture(); await t.state.loadDirectory(); await t.state.selectCity('伪造市'); assert.equal(t.calls.length, 0)
  })
  await check('慢旧城市不覆盖新城市、内容、错误或加载状态', async () => {
    const slow = deferred(); const t = fixture({ stations: city => city === '北京市' ? slow.promise : Promise.resolve({ stations: [{ id: 'b' }], total: 1 }) })
    await t.state.loadDirectory(); const old = t.state.selectCity('北京市'); await t.state.selectCity('保定市'); slow.reject(Error('旧城失败')); await old
    assert.equal(t.state.stations.value[0].id, 'b'); assert.equal(t.state.stationError.value, false); assert.equal(t.state.loading.value, false)
  })
  await check('驿站失败仍保留成功推荐，推荐失败仍保留驿站', async () => {
    const a = fixture({ stations: async () => { throw Error('合成') } }); await a.state.loadDirectory(); await a.state.selectCity('北京市'); assert(a.state.stationError.value); assert.equal(a.state.recommendations.value.length, 1)
    const b = fixture({ recommendations: async () => { throw Error('合成') } }); await b.state.loadDirectory(); await b.state.selectCity('北京市'); assert(b.state.recommendationError.value); assert.equal(b.state.stations.value.length, 1)
  })
  await check('分页失败不跳过页码，重试去重后按总数停止', async () => {
    let fail = true; const t = fixture({ stations: async (_city, page) => {
      if (page === 1) return { stations: [{ id: 'one' }], total: 2 }
      if (fail) { fail = false; throw Error('合成分页失败') }
      return { stations: [{ id: 'one' }, { id: 'two' }], total: 2 }
    } })
    await t.state.loadDirectory(); await t.state.selectCity('北京市'); await t.state.loadMore(); assert(t.state.moreError.value)
    await t.state.loadMore(); assert.deepEqual(t.calls.map(c => c.page), [1, 2, 2]); assert.equal(t.state.stations.value.length, 2); assert.equal(t.state.hasMore.value, false)
  })
  await check('切城时正在加载更多的旧页不能污染新结果', async () => {
    const slow = deferred(); const t = fixture({ stations: async (city, page) => page > 1 ? slow.promise : { stations: [{ id: city }], total: city === '北京市' ? 2 : 1 } })
    await t.state.loadDirectory(); await t.state.selectCity('北京市'); const old = t.state.loadMore(); await t.state.selectCity('保定市'); slow.resolve({ stations: [{ id: 'old' }], total: 2 }); await old
    assert.equal(t.state.stations.value.length, 1); assert.equal(t.state.stations.value[0].id, '保定市'); assert.equal(t.state.loadingMore.value, false)
  })
  await check('重复翻页只发起一次，卸载后迟到响应不写入', async () => {
    const slow = deferred(); const t = fixture({ stations: async (_city, page) => page > 1 ? slow.promise : { stations: [{ id: 'one' }], total: 2 } })
    await t.state.loadDirectory(); await t.state.selectCity('北京市'); const old = t.state.loadMore(); await t.state.loadMore(); assert.equal(t.calls.length, 2)
    t.state.dispose(); slow.resolve({ stations: [{ id: 'two' }], total: 2 }); await old; assert.equal(t.state.stations.value.length, 1)
  })
  await check('目录乱序返回只接受最新目录', async () => {
    const slow = deferred(); let first = true; const t = fixture({ directory: () => first ? (first = false, slow.promise) : Promise.resolve(['保定市']) })
    const old = t.state.loadDirectory(); await t.state.loadDirectory(); slow.resolve(['北京市']); await old; assert.equal(t.state.cities.value[0], '保定市')
  })
  await tick()
  const report = { testedAt: new Date().toISOString(), passed: results.filter(x => x.passed).length, failed: results.filter(x => !x.passed).length, sourceSha256: require('node:crypto').createHash('sha256').update(source).digest('hex'), scope: '实际Vue响应式组合逻辑，接口/存储替身，非真机与真实渠道', cases: results }
  const output = path.resolve(__dirname, '../../../artifacts/channel-intake-20260930/same-city-ui-state.json')
  fs.writeFileSync(output, JSON.stringify(report, null, 2)); console.log(JSON.stringify(report))
  if (report.failed) process.exitCode = 1
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
