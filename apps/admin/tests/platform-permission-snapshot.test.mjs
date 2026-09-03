import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createSnapshotLoader } from '../src/utils/topic-screen.ts'
import { createPlatformSignalsLoader, emptyPlatformSignals } from '../src/utils/platform-signals.ts'

const keys = ['transactions', 'content', 'ai', 'offline', 'growth', 'alerts']
const denied = status => ({ response: { status } })
const tick = () => new Promise(resolve => setImmediate(resolve))
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
function fixture() {
  let state = emptyPlatformSignals(), active = true, operations = true, deniedCalls = 0
  const calls = [], actions = {}
  const requests = Object.fromEntries(keys.map(key => [key, async () => {
    calls.push(key)
    return actions[key] ? actions[key]() : { data: key === 'growth' ? { trends: [{ date: '2026-09-03', newUsers: 8 }] } : { marker: `private-${key}` } }
  }]))
  const loader = createPlatformSignalsLoader(requests, next => { state = next }, () => active, () => operations, () => { deniedCalls++ })
  return { loader, actions, calls, get state() { return state }, get deniedCalls() { return deniedCalls }, set active(value) { active = value }, set operations(value) { operations = value } }
}

for (const key of keys) for (const status of [401, 403]) {
  test(`${key}返回${status}清空全部附属指标、时间与状态`, async () => {
    const f = fixture()
    await f.loader.refresh(true)
    assert.ok(f.state.states.content.receivedAt)
    f.actions[key] = async () => { throw denied(status) }
    await f.loader.refresh(true)
    assert.deepEqual(f.state, emptyPlatformSignals())
    assert.equal(f.deniedCalls, 1)
  })
}

test('单源断网只保留该源旧数据并标过期，其余来源继续更新', async () => {
  const f = fixture()
  await f.loader.refresh(true)
  const old = f.state.transactions
  f.actions.transactions = async () => { throw new Error('offline') }
  f.actions.content = async () => ({ data: { totalPosts: 12 } })
  await f.loader.refresh(true)
  assert.deepEqual(f.state.transactions, old)
  assert.equal(f.state.states.transactions.status, 'stale')
  assert.equal(f.state.content.totalPosts, 12)
  assert.equal(f.deniedCalls, 0)
  assert.equal(f.state.refreshing, false)
})

test('首次断网不伪造快照，禁用不发请求，普通账号不读取内部运营指标', async () => {
  const f = fixture()
  f.active = false
  await f.loader.refresh(true)
  assert.equal(f.calls.length, 0)
  f.active = true
  f.operations = false
  f.actions.transactions = async () => { throw new Error('offline') }
  await f.loader.refresh(true)
  assert.equal(f.calls.length, 4)
  assert.equal(f.state.states.transactions.status, 'error')
  assert.deepEqual(f.state.transactions, {})
  assert.deepEqual(f.state.growth, [])
})

test('权限拒绝先到、其他成功响应晚到时不能重新填入旧数据', async () => {
  const f = fixture()
  await f.loader.refresh(true)
  const pending = Object.fromEntries(keys.map(key => [key, deferred()]))
  keys.forEach(key => { f.actions[key] = () => pending[key].promise })
  const run = f.loader.refresh(true)
  pending.content.reject(denied(403))
  await tick()
  assert.deepEqual(f.state, emptyPlatformSignals())
  keys.filter(key => key !== 'content').forEach(key => pending[key].resolve({ data: { marker: 'late-secret' } }))
  await run
  assert.deepEqual(f.state, emptyPlatformSignals())
})

test('换账号后旧成功、旧403和旧finally均不能覆盖新请求', async () => {
  const f = fixture()
  const old = Object.fromEntries(keys.map(key => [key, deferred()]))
  keys.forEach(key => { f.actions[key] = () => old[key].promise })
  const first = f.loader.refresh(true)
  f.loader.reset()
  const fresh = Object.fromEntries(keys.map(key => [key, deferred()]))
  keys.forEach(key => { f.actions[key] = () => fresh[key].promise })
  const second = f.loader.refresh(true)
  old.transactions.reject(denied(403))
  keys.filter(key => key !== 'transactions').forEach(key => old[key].resolve({ data: { marker: 'old-account' } }))
  await first
  assert.equal(f.state.refreshing, true)
  assert.deepEqual(f.state.content, {})
  assert.equal(f.deniedCalls, 0)
  keys.forEach(key => fresh[key].resolve({ data: { marker: 'new-account' } }))
  await second
  assert.equal(f.state.content.marker, 'new-account')
  assert.equal(f.state.refreshing, false)
})

test('正常去重及运营节流保留，重置后新账号立即获取完整来源', async () => {
  const f = fixture()
  await Promise.all([f.loader.refresh(), f.loader.refresh(), f.loader.refresh()])
  assert.equal(f.calls.length, 6)
  await f.loader.refresh()
  assert.equal(f.calls.length, 10)
  f.loader.reset()
  await f.loader.refresh()
  assert.equal(f.calls.length, 16)
})

test('卸载后忽略响应、不通知鉴权失败且不再发请求', async () => {
  const f = fixture(), pending = deferred()
  f.actions.content = () => pending.promise
  const run = f.loader.refresh()
  f.loader.dispose()
  const before = f.state
  pending.reject(denied(401))
  await run
  await f.loader.refresh()
  assert.equal(f.state, before)
  assert.equal(f.deniedCalls, 0)
  assert.equal(f.calls.length, 6)
})

test('附属源撤权同时清空汇总，并阻止较晚汇总200重新显示', async () => {
  let summary, signalState, signalLoader, summaryReply = async () => ({ totalUsers: 15 })
  const loader = createSnapshotLoader(() => summaryReply(), state => { summary = state; if (state.forbidden) signalLoader.reset() })
  let signalReply = async () => ({ data: { marker: 'old-private' } })
  signalLoader = createPlatformSignalsLoader(Object.fromEntries(keys.map(key => [key, () => signalReply()])), state => { signalState = state }, () => true, () => true, loader.forbid)
  await loader.refresh()
  await signalLoader.refresh(true)
  const late = deferred()
  summaryReply = () => late.promise
  const summaryRun = loader.refresh()
  signalReply = async () => { throw denied(403) }
  await signalLoader.refresh(true)
  assert.equal(summary.data, null)
  assert.equal(summary.forbidden, true)
  assert.equal(summary.receivedAt, undefined)
  assert.deepEqual(signalState, emptyPlatformSignals())
  late.resolve({ totalUsers: 999 })
  await summaryRun
  assert.equal(summary.data, null)
  assert.equal(summary.refreshing, false)
})

test('汇总撤权使附属源在途请求作废；恢复授权后可以重新获取', async () => {
  let summary, signalState, signalLoader, rejectSummary = false
  const loader = createSnapshotLoader(async () => { if (rejectSummary) throw denied(401); return { totalUsers: 15 } }, state => { summary = state; if (state.forbidden) signalLoader.reset() })
  const late = deferred()
  signalLoader = createPlatformSignalsLoader(Object.fromEntries(keys.map(key => [key, () => late.promise])), state => { signalState = state }, () => true, () => true, loader.forbid)
  await loader.refresh()
  const pending = signalLoader.refresh(true)
  rejectSummary = true
  await loader.refresh()
  late.resolve({ data: { marker: 'too-late' } })
  await pending
  assert.deepEqual(signalState, emptyPlatformSignals())
  assert.equal(summary.data, null)
  rejectSummary = false
  await loader.refresh()
  assert.equal(summary.data.totalUsers, 15)
  assert.equal(summary.forbidden, false)
})

test('真实页面接入统一清空、权限提示与账号/角色/令牌上下文隔离', async () => {
  const page = await readFile(new URL('../src/views/dashboard/PlatformBigscreen.vue', import.meta.url), 'utf8')
  const context = await readFile(new URL('../src/composables/useBigscreenContext.ts', import.meta.url), 'utf8')
  const topic = await readFile(new URL('../src/composables/useTopicSnapshot.ts', import.meta.url), 'utf8')
  assert.match(page, /createSnapshotLoader<PlatformScreen>/)
  assert.match(page, /value\.forbidden[\s\S]*?clearSignals\(\)/)
  assert.match(page, /\(\) => loader\.forbid\(\)/)
  assert.match(page, /已清空本页数据/)
  assert.match(page, /watch\(context\.key[\s\S]*?loader\.reset\(\)[\s\S]*?clearSignals\(\)[\s\S]*?flush: 'sync'/)
  assert.match(context, /auth\.user\?\.id/)
  assert.match(context, /auth\.roles/)
  assert.match(context, /auth\.token/)
  assert.match(context, /route\.query\.token/)
  assert.match(context, /addEventListener\('storage'/)
  assert.match(context, /removeEventListener\('storage'/)
  assert.match(topic, /watch\(context\.key[\s\S]*?loader\.reset\(\)[\s\S]*?flush: 'sync'/)
  assert.match(topic, /invalidScopedToken\.value[\s\S]*?loader\.forbid\(\)/)
  assert.match(page, /invalidScopedToken\.value[\s\S]*?loader\.forbid\(\)/)
})
