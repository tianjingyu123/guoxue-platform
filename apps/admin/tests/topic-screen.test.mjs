import test from 'node:test'
import assert from 'node:assert/strict'
import { compactMetric, contentMosaic, coveredCityCount, distribution, metric, metricNumber, percent, proportion, quotient, filterStations, selectedDistribution, createSnapshotLoader } from '../src/utils/topic-screen.ts'

test('计数、金额与缺失分别展示，零营收保留两位小数', () => {
  assert.equal(metric(0), '0')
  assert.equal(metric(0, true), '¥0.00')
  assert.equal(metric(123456.7, true), '¥123,456.70')
  for (const value of [undefined, null, -1, Infinity, NaN, '19']) {
    assert.equal(metricNumber(value), null)
    assert.equal(metric(value, true), '—')
  }
})
test('客单价与占比不混用，分母为零和不一致数据不制造百分比', () => {
  assert.equal(quotient(1200, 3), 400)
  assert.equal(proportion(3, 12), 25)
  assert.equal(proportion(0, 12), 0)
  assert.equal(proportion(20, 12), null)
  assert.equal(proportion(0, 0), null)
  assert.equal(quotient(0, undefined), null)
  assert.equal(percent(null), '—')
})
test('图心大额数值使用万/亿单位，保持明细精确数值格式不变', () => {
  assert.equal(compactMetric(1286430.5, true), '¥128.64万')
  assert.equal(compactMetric(128643050, true), '¥1.29亿')
  assert.equal(compactMetric(0, true), '¥0.00')
  assert.equal(compactMetric(undefined), '—')
  assert.equal(metric(1286430.5, true), '¥1,286,430.50')
})
test('构成按数值降序且不修改输入，圆环段偏移与总量准确', () => {
  const input = [{ key: 'a', label: '文章', value: 2 }, { key: 'b', label: '课程', value: 6 }]
  const result = distribution(input)
  assert.equal(result.total, 8)
  assert.deepEqual(result.items.map(item => [item.key, item.share, item.offset]), [['b', 75, 0], ['a', 25, 75]])
  assert.equal(input[0].key, 'a')
})
test('不完整构成暂停占比，空列表为真实零，未提供列表仍未知', () => {
  const result = distribution([{ key: 'a', label: 'a', value: 12 }, { key: 'b', label: 'b', value: undefined }])
  assert.equal(result.total, null)
  assert.ok(result.items.every(item => item.share === null))
  assert.equal(distribution([]).total, 0)
  assert.equal(distribution(undefined).total, null)
})
test('内容矩阵面积等于实际占比，没有最小面积伪造', () => {
  const result = contentMosaic({ totalArticles: 70, totalPosts: 20, totalCourses: 9, totalVideos: 1 })
  assert.equal(result.total, 100)
  for (const block of result.blocks) assert.ok(Math.abs(block.width * block.height / (640 * 300) - block.value / 100) < 1e-10)
  assert.equal(result.blocks.length, 4)
  assert.equal(result.blocks.reduce((sum, block) => sum + block.width * block.height, 0), 192000)
})
test('零内容仍保留四类入口但不画彩色占比；单类型内容占满实际面积', () => {
  const zero = { totalArticles: 0, totalPosts: 0, totalCourses: 0, totalVideos: 0 }
  assert.equal(contentMosaic(zero).items.length, 4)
  assert.equal(contentMosaic(zero).blocks.length, 0)
  assert.equal(contentMosaic({ ...zero, totalArticles: undefined }).blocks.length, 0)
  const single = contentMosaic({ ...zero, totalVideos: 6 }).blocks[0]
  assert.equal(single.width * single.height, 192000)
})
test('名录支持城市和搜索交叉筛选、空格及大小写，未填写城市单独可选', () => {
  const stations = [{ id: 'a', name: '体验驿站', city: '深圳', address: '科技路 A' }, { id: 'b', name: '体验驿站', city: '北京' }, { id: 'c', name: '待完善' }]
  assert.deepEqual(filterStations(stations, '深圳', '  科技路 a ').map(item => item.id), ['a'])
  assert.equal(filterStations(stations, '北京', '科技路').length, 0)
  assert.equal(filterStations(stations, null, '').length, 3)
  assert.deepEqual(filterStations(stations, '', '').map(item => item.id), ['c'])
  assert.equal(filterStations(undefined, null, '').length, 0)
})
test('数百个城市与超长站名只筛选数据，不截断或改写用户内容', () => {
  const stations = Array.from({ length: 500 }, (_, index) => ({ id: String(index), city: `城市${index}`, name: '长'.repeat(100) }))
  const result = filterStations(stations, '城市499', '长'.repeat(80))
  assert.equal(result.length, 1)
  assert.equal(result[0].name.length, 100)
  assert.equal(stations.length, 500)
})
test('历史成交品类今日未成交时显示该品类的零值，不显示全部合计', () => {
  const result = distribution([{ key: 'COURSE', label: '课程', value: 900 }])
  assert.equal(selectedDistribution(result, 'PRODUCT', '商品').value, 0)
  assert.equal(selectedDistribution(result, 'PRODUCT', '商品').share, 0)
  assert.equal(selectedDistribution(distribution(undefined), 'PRODUCT', '商品').value, null)
  assert.equal(selectedDistribution(result, null, ''), undefined)
})
test('城市统计排除空名称与零节点，非法数量不假装为已知覆盖数', () => {
  assert.equal(coveredCityCount([{ city: '深圳', count: 2 }, { city: '', count: 1 }, { city: '北京', count: 0 }]), 1)
  assert.equal(coveredCityCount([{ city: '深圳', count: Infinity }]), null)
  assert.equal(coveredCityCount(undefined), null)
  assert.equal(coveredCityCount([]), 0)
})
test('刷新请求去重；网络失败保留快照并标记延迟；恢复后清除失败', async () => {
  let calls = 0, rejectRequest = false, state
  const loader = createSnapshotLoader(async () => { calls++; if (rejectRequest) throw new Error('offline'); return { count: calls } }, value => { state = value })
  await Promise.all([loader.refresh(), loader.refresh(), loader.refresh()])
  assert.equal(calls, 1)
  assert.equal(state.data.count, 1)
  assert.ok(state.receivedAt)
  rejectRequest = true
  await loader.refresh()
  assert.equal(state.failed, true)
  assert.equal(state.data.count, 1)
  assert.equal(state.refreshing, false)
  rejectRequest = false
  await loader.refresh()
  assert.equal(state.failed, false)
  assert.equal(state.data.count, 3)
})
test('首次失败没有模拟快照，非法响应不显示已同步', async () => {
  for (const data of [null, [], {}, 'invalid']) {
    let state
    const loader = createSnapshotLoader(async () => data, value => { state = value })
    await loader.refresh()
    assert.equal(state.data, null)
    assert.equal(state.failed, true)
  }
})
test('401/403 清除上一次快照和时间，不再展示权限失效的数据', async () => {
  for (const status of [401, 403]) {
    let denied = false, state
    const loader = createSnapshotLoader(async () => { if (denied) throw { response: { status } }; return { count: 99 } }, value => { state = value })
    await loader.refresh()
    denied = true
    await loader.refresh()
    assert.equal(state.data, null)
    assert.equal(state.forbidden, true)
    assert.equal(state.receivedAt, undefined)
  }
})
test('令牌切换后忽略旧请求，旧 finally 不打断新请求状态', async () => {
  const resolvers = []; let state
  const loader = createSnapshotLoader(() => new Promise(resolve => resolvers.push(resolve)), value => { state = value })
  const first = loader.refresh()
  loader.reset()
  const second = loader.refresh()
  resolvers[0]({ scope: 'old' }); await first
  assert.equal(state.data, null)
  assert.equal(state.refreshing, true)
  resolvers[1]({ scope: 'new' }); await second
  assert.equal(state.data.scope, 'new')
})
test('卸载后不更新状态，也不发起新的请求', async () => {
  let resolve, changes = 0
  const loader = createSnapshotLoader(() => new Promise(done => { resolve = done }), () => { changes++ })
  const pending = loader.refresh()
  loader.dispose()
  resolve({ count: 1 }); await pending
  await loader.refresh()
  assert.equal(changes, 1)
})
