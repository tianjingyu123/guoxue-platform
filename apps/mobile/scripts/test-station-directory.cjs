const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict'), crypto = require('node:crypto')
const ts = require('typescript'), vue = require('vue')
const root = path.resolve(__dirname, '..'), source = fs.readFileSync(path.join(root, 'src/composables/use-station-directory.ts'), 'utf8')
const cases = [], deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
const rows = (prefix, n = 20) => Array.from({ length: n }, (_, i) => ({ id: prefix + i }))
function fixture(options = {}) {
  const calls = []
  const api = { discoverCities: options.cities || (async () => ['北京市', '保定市']), searchStationPage: async query => {
    calls.push({ ...query }); return options.page ? options.page(query) : { stations: rows(query.city || '全国'), total: 121 }
  } }
  const context = { exports: {}, require: name => name === 'vue' ? vue : name === '@/lib/offline-data' ? { offlineApi: api } : (() => { throw Error(name) })() }
  vm.createContext(context); vm.runInContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context)
  return { state: context.exports.useStationDirectory(), calls }
}
async function check(name, action) { try { await action(); cases.push({ name, passed: true }) } catch (error) { cases.push({ name, passed: false, error: error.message }) } }
async function main() {
  await check('切城后仍有其他城市，目录独立于列表和空结果', async () => {
    const t = fixture(); await t.state.loadCities(); await t.state.selectCity('北京市');
    assert.deepEqual(Array.from(t.state.cityOptions.value), ['全部', '北京市', '保定市']); await t.state.selectCity('保定市'); assert.equal(t.calls[1].city, '保定市')
  })
  await check('121家不在前100家截止；第二页仍带完整搜索/类型/城市', async () => {
    const t = fixture(); await t.state.loadCities(); t.state.keyword.value = '莲池'; await t.state.selectType('academy'); await t.state.selectCity('保定市');
    await t.state.loadMore(); assert.equal(t.state.total.value, 121); assert(t.state.hasMore.value)
    assert.deepEqual(t.calls.at(-1), { city: '保定市', type: 'academy', keyword: '莲池', page: 2, pageSize: 20 })
  })
  await check('目录故障不阻全国浏览，重试目录不改变当前分页结果', async () => {
    let fail = true; const t = fixture({ cities: async () => { if (fail) throw Error('合成目录故障'); return ['保定市'] } });
    await t.state.loadCities(); await t.state.load(); assert(t.state.directoryError.value); assert.equal(t.state.stations.value.length, 20)
    fail = false; await t.state.loadCities(); assert.equal(t.state.directoryError.value, false); assert.equal(t.calls.length, 1)
  })
  await check('连续七页能够展示第121家，最后一页才显示已加载全部', async () => {
    const t = fixture({ page: async q => ({ stations: rows('第' + q.page + '页', q.page === 7 ? 1 : 20), total: 121 }) })
    await t.state.load(); for (let i = 0; i < 6; i++) await t.state.loadMore()
    assert.equal(t.state.stations.value.length, 121); assert.equal(t.calls.at(-1).page, 7); assert.equal(t.state.hasMore.value, false)
    await t.state.loadMore(); assert.equal(t.calls.length, 7)
  })
  await check('慢旧筛选失败不会覆盖新筛选结果和加载态', async () => {
    const slow = deferred(); const t = fixture({ page: q => q.city === '北京市' ? slow.promise : Promise.resolve({ stations: rows('新城'), total: 20 }) })
    await t.state.loadCities(); const old = t.state.selectCity('北京市'); await t.state.selectCity('保定市'); slow.reject(Error('旧城失败')); await old
    assert.equal(t.state.stations.value[0].id, '新城0'); assert.equal(t.state.errMsg.value, ''); assert.equal(t.state.loading.value, false)
  })
  await check('分页失败保留列表，重试同一页且去重', async () => {
    let fail = true; const t = fixture({ page: async q => { if (q.page === 1) return { stations: rows('一'), total: 21 }; if (fail) { fail = false; throw Error('合成分页故障') } return { stations: [{ id: '一0' }, { id: '二' }], total: 21 } } })
    await t.state.load(); await t.state.loadMore(); assert.equal(t.state.stations.value.length, 20); assert(t.state.moreError.value); await t.state.loadMore()
    assert.deepEqual(t.calls.map(q => q.page), [1, 2, 2]); assert.equal(t.state.stations.value.length, 21); assert.equal(t.state.hasMore.value, false)
  })
  await check('切换类型后旧分页响应不能混入新目录', async () => {
    const slow = deferred(); const t = fixture({ page: q => q.page === 2 ? slow.promise : Promise.resolve({ stations: rows(q.type || '全部'), total: 21 }) })
    await t.state.load(); const old = t.state.loadMore(); await t.state.selectType('studio'); slow.resolve({ stations: [{ id: '旧页' }], total: 21 }); await old
    assert.equal(t.state.stations.value.length, 20); assert.equal(t.state.stations.value[0].id, 'studio0'); assert.equal(t.state.loadingMore.value, false)
  })
  await check('清空筛选恢复全国；无效城市不发送请求', async () => {
    const t = fixture(); await t.state.loadCities(); await t.state.selectCity('未知市'); assert.equal(t.calls.length, 0)
    t.state.keyword.value = '搜索'; await t.state.selectCity('北京市'); await t.state.clearFilter(); assert.equal(t.calls.at(-1).city, undefined); assert.equal(t.calls.at(-1).keyword, undefined); assert.equal(t.state.hasFilter.value, false)
  })
  await check('重复加载更多只发一次，退出后迟到响应无效', async () => {
    const slow = deferred(); const t = fixture({ page: q => q.page === 2 ? slow.promise : Promise.resolve({ stations: rows('一'), total: 21 }) });
    await t.state.load(); const pending = t.state.loadMore(); await t.state.loadMore(); assert.equal(t.calls.length, 2); t.state.dispose(); slow.resolve({ stations: [{ id: '迟到' }], total: 21 }); await pending; assert.equal(t.state.stations.value.length, 20)
  })
  await check('当前页面使用原生城市picker、提交搜索及触底分页，没有ActionSheet或100条客户端筛选', async () => {
    const sfc = fs.readFileSync(path.join(root, 'src/pkg-offline/stations/index.vue'), 'utf8')
    assert(sfc.includes(':range="cityOptions"')); assert(sfc.includes('@confirm="load"')); assert(sfc.includes('@scrolltolower="loadMore"')); assert(!sfc.includes('showActionSheet')); assert(!sfc.includes('filteredStations'))
  })
  const report = { testedAt: new Date().toISOString(), passed: cases.filter(c => c.passed).length, failed: cases.filter(c => !c.passed).length,
    sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), scope: '实际Vue组合逻辑，接口替身，未代表真机', cases }
  const output = path.resolve(root, '../../artifacts/safety55-intake-20261003/f3-directory-state.json'); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report)); if (report.failed) process.exitCode = 1
}
main().catch(e => { console.error(e.message); process.exitCode = 1 })
