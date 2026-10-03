/**
 * 直播礼物反馈 L1/L2 编排层验证
 *
 * 运行：node --test tests/release/live-gift-feed.test.mjs
 *
 * 口径说明：
 * - 这是**编排逻辑**的验证，用本地构造的事件跑 pkg-live/gift-feed.ts。
 *   它不证明真实 IM 消息链路贯通，也不代表 nvue 真机表现。
 * - 被测源码直接从 apps/mobile/src 读取，用仓库已安装的 TypeScript 转译后导入，
 *   不写共享 node_modules、不改锁文件、不产生临时文件。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = join(HERE, '..', '..')
const SRC = join(REPO, 'apps', 'mobile', 'src', 'pkg-live', 'gift-feed.ts')
const WATCH_VUE = join(REPO, 'apps', 'mobile', 'src', 'pkg-live', 'watch', 'index.vue')
const WATCH_NVUE = join(REPO, 'apps', 'mobile', 'src', 'pkg-live', 'watch', 'index.nvue')
const API_TS = join(REPO, 'apps', 'mobile', 'src', 'pkg-live', 'live-interaction-api.ts')

const require = createRequire(import.meta.url)
const ts = require(join(REPO, 'apps', 'mobile', 'node_modules', 'typescript'))

const transpiled = ts.transpileModule(readFileSync(SRC, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText
const mod = await import(
  'data:text/javascript;base64,' + Buffer.from(transpiled, 'utf8').toString('base64')
)
const { GiftFeed, normalizeFromSendResponse, normalizeFromTimMessage, tierOfLevel, normalizeLevel } = mod

// ───────── 测试替身 ─────────

function recordingRenderer() {
  const calls = []
  const lights = new Set()
  const combos = new Map()
  let overflow = 0
  return {
    calls,
    get lights() { return [...lights] },
    get combos() { return new Map(combos) },
    get overflow() { return overflow },
    showLight(e) { calls.push(['showLight', e.recordId]); lights.add(e.recordId) },
    hideLight(id) { calls.push(['hideLight', id]); lights.delete(id) },
    showCombo(key, e, count) { calls.push(['showCombo', key, count]); combos.set(key, count) },
    updateCombo(key, count) { calls.push(['updateCombo', key, count]); combos.set(key, count) },
    hideCombo(key) { calls.push(['hideCombo', key]); combos.delete(key) },
    showOverflow(n) { overflow = n },
    clearAll() { calls.push(['clearAll']); lights.clear(); combos.clear(); overflow = 0 },
  }
}

/** 可控时钟：编排层的时间判断全走它 */
function makeClock(start = 1_700_000_000_000) {
  let t = start
  return { now: () => t, advance(ms) { t += ms }, set(v) { t = v } }
}

function makeFeed(overrides = {}, clock = makeClock()) {
  const renderer = recordingRenderer()
  const feed = new GiftFeed({ renderer, config: overrides, now: clock.now })
  return { feed, renderer, clock }
}

let seq = 0
function evt(over = {}) {
  seq += 1
  return {
    recordId: over.recordId || `rec-${seq}`,
    roomId: over.roomId || 'room-A',
    userId: over.userId || 'u-1',
    userName: over.userName || '青松客',
    avatar: '',
    giftId: over.giftId || 'gift-1',
    giftName: over.giftName || '梅花',
    icon: '',
    level: over.level || 'BASIC',
    tier: over.tier || (over.level && over.level !== 'BASIC' ? 2 : 1),
    quantity: over.quantity === undefined ? 1 : over.quantity,
    at: over.at,
    source: over.source || 'broadcast',
  }
}

// ───────── 1. 成功事件的归一化与真实性 ─────────

test('送礼响应缺 recordId 时不产生事件（不拼假标识）', () => {
  const ctx = { roomId: 'room-A' }
  assert.equal(normalizeFromSendResponse(null, ctx), null)
  assert.equal(normalizeFromSendResponse({}, ctx), null)
  assert.equal(normalizeFromSendResponse({ quantity: 1 }, ctx), null)
  assert.equal(normalizeFromSendResponse({ id: 'rec-1', quantity: 0 }, ctx), null)
})

test('送礼响应归一化：recordId、数量、层级、房间取服务端值', () => {
  const out = normalizeFromSendResponse({
    id: 'rec-abc',
    userId: 'u-me',
    liveRoomId: 'room-A',
    giftId: 'g-7',
    quantity: 3,
    createdAt: new Date(1_700_000_000_000).toISOString(),
    user: { id: 'u-me', nickname: '我', avatar: 'a.png' },
    gift: { id: 'g-7', name: '如意', icon: 'i.png', level: 'MID' },
  }, { roomId: 'room-A', selfUserId: 'u-me' })
  assert.equal(out.recordId, 'rec-abc')
  assert.equal(out.roomId, 'room-A')
  assert.equal(out.quantity, 3)
  assert.equal(out.level, 'MID')
  assert.equal(out.tier, 2)
  assert.equal(out.source, 'response')
  assert.equal(out.at, 1_700_000_000_000)
})

test('广播归一化：普通文本不可能被当成礼物；非法数量被拒', () => {
  const ctx = { roomId: 'room-A' }
  assert.equal(normalizeFromTimMessage({ payload: { text: '送出 金龙献瑞 x1' } }, ctx), null)
  assert.equal(normalizeFromTimMessage({ payload: { data: '不是 JSON' } }, ctx), null)
  assert.equal(normalizeFromTimMessage({ payload: { data: JSON.stringify({ type: 'CHAT', recordId: 'r' }) } }, ctx), null)
  for (const bad of [0, -1, 1000, 1.5, null, 'abc']) {
    const msg = { payload: { data: JSON.stringify({ type: 'LIVE_GIFT', recordId: 'r', giftId: 'g', giftName: '梅花', quantity: bad }) } }
    assert.equal(normalizeFromTimMessage(msg, ctx), null, `quantity=${bad} 应被拒`)
  }
  // recordId 必须是字符串，不接受数字等其他类型伪装
  const numId = { payload: { data: JSON.stringify({ type: 'LIVE_GIFT', recordId: 123, giftId: 'g', giftName: '梅花', quantity: 1 }) } }
  assert.equal(normalizeFromTimMessage(numId, ctx), null)
})

test('数量解析口径与 live-tim-events.ts 一致，避免公屏与动效不同步', () => {
  // 服务端发的是数字；这里对数字串保持与既有 readLiveGiftTimEvent 相同的容忍度，
  // 两个解析器口径必须一致，否则 nvue 页会出现"公屏有这条、动效没有"。
  const msg = { payload: { data: JSON.stringify({ type: 'LIVE_GIFT', recordId: 'r', giftId: 'g', giftName: '梅花', quantity: '3' }) } }
  const out = normalizeFromTimMessage(msg, { roomId: 'room-A' })
  assert.equal(out.quantity, 3)
})

test('广播缺图标与层级时按 BASIC 降级，不猜测', () => {
  const msg = {
    from: 'u-9', nick: '洛水人家', time: 1_700_000_000,
    payload: { data: JSON.stringify({ type: 'LIVE_GIFT', recordId: 'r-1', giftId: 'g-unknown', giftName: '新礼物', quantity: 2 }) },
  }
  const out = normalizeFromTimMessage(msg, { roomId: 'room-A', lookupGift: () => undefined })
  assert.equal(out.level, 'BASIC')
  assert.equal(out.tier, 1)
  assert.equal(out.icon, '')
  assert.equal(out.userId, 'u-9')
  assert.equal(out.userName, '洛水人家')
  assert.equal(out.roomId, 'room-A')
  // TIM 信封 time 为秒，与 lib/im-data.ts 同口径 ×1000
  assert.equal(out.at, 1_700_000_000_000)
})

test('层级映射：BASIC→L1，MID/HIGH/TOP→L2；未知值降级 BASIC', () => {
  assert.equal(tierOfLevel('BASIC'), 1)
  assert.equal(tierOfLevel('MID'), 2)
  assert.equal(tierOfLevel('HIGH'), 2)
  assert.equal(tierOfLevel('TOP'), 2)
  assert.equal(normalizeLevel('mid'), 'MID')
  assert.equal(normalizeLevel('LEGENDARY'), 'BASIC')
  assert.equal(normalizeLevel(undefined), 'BASIC')
})

// ───────── 2. 去重 ─────────

test('同一 recordId 连发 8 次只认 1 次', () => {
  const { feed, renderer } = makeFeed()
  feed.enterRoom('room-A')
  const results = []
  for (let i = 0; i < 8; i++) results.push(feed.push(evt({ recordId: 'rec-dup', at: Date.now() })))
  assert.equal(results.filter((r) => r === 'accepted').length, 1)
  assert.equal(results.filter((r) => r === 'deduped').length, 7)
  assert.equal(renderer.lights.length, 1)
  assert.equal(feed.snapshot().deduped, 7)
})

test('响应先到、广播后到：同 recordId 只展示一次', () => {
  const { feed, renderer, clock } = makeFeed()
  feed.enterRoom('room-A')
  assert.equal(feed.push(evt({ recordId: 'rec-x', source: 'response', at: clock.now() })), 'accepted')
  clock.advance(600)
  assert.equal(feed.push(evt({ recordId: 'rec-x', source: 'broadcast', at: clock.now() })), 'deduped')
  assert.equal(renderer.calls.filter((c) => c[0] === 'showLight').length, 1)
})

test('广播先到、响应后到：同 recordId 仍只展示一次', () => {
  const { feed, renderer, clock } = makeFeed()
  feed.enterRoom('room-A')
  assert.equal(feed.push(evt({ recordId: 'rec-y', source: 'broadcast', at: clock.now() })), 'accepted')
  clock.advance(300)
  assert.equal(feed.push(evt({ recordId: 'rec-y', source: 'response', at: clock.now() })), 'deduped')
  assert.equal(renderer.calls.filter((c) => c[0] === 'showLight').length, 1)
})

// ───────── 3. 连击合并 ─────────

test('不同 recordId 的真实记录才合并，数量按单次量累加不翻倍', () => {
  const { feed, renderer, clock } = makeFeed()
  feed.enterRoom('room-A')
  // quantity 是 giftRecord.quantity（单次数量），不是累计值
  feed.push(evt({ recordId: 'r1', level: 'MID', quantity: 2, at: clock.now() }))
  clock.advance(400)
  feed.push(evt({ recordId: 'r2', level: 'MID', quantity: 3, at: clock.now() }))
  clock.advance(400)
  feed.push(evt({ recordId: 'r3', level: 'MID', quantity: 1, at: clock.now() }))
  const combos = renderer.combos
  assert.equal(combos.size, 1, '同人同礼物窗口内只应有 1 条')
  assert.equal([...combos.values()][0], 6, '2+3+1=6，不应翻倍')
})

test('重复广播混在连击中不会把数量算多', () => {
  const { feed, renderer, clock } = makeFeed()
  feed.enterRoom('room-A')
  feed.push(evt({ recordId: 'r1', level: 'MID', quantity: 2, at: clock.now() }))
  clock.advance(200)
  feed.push(evt({ recordId: 'r1', level: 'MID', quantity: 2, at: clock.now() })) // 重复广播
  clock.advance(200)
  feed.push(evt({ recordId: 'r2', level: 'MID', quantity: 2, at: clock.now() }))
  assert.equal([...renderer.combos.values()][0], 4, '重复的那条不计入')
})

test('超出合并窗口后另起一条，不把跨窗口的量并进旧条', () => {
  const { feed, renderer, clock } = makeFeed({ comboWindowMs: 3000, comboHoldMs: 60_000 })
  feed.enterRoom('room-A')
  feed.push(evt({ recordId: 'r1', level: 'MID', quantity: 4, at: clock.now() }))
  assert.equal([...renderer.combos.values()][0], 4)
  clock.advance(3500) // 超窗口
  feed.push(evt({ recordId: 'r2', level: 'MID', quantity: 1, at: clock.now() }))
  const counts = [...renderer.combos.values()]
  assert.equal(counts.length, 1, '同一组合同时只占一条车道')
  assert.equal(counts[0], 1, '新一轮从头计数，不是 5，也不是把旧条静默改写')
  // 旧条被显式收掉，而不是被同键覆盖
  const hides = renderer.calls.filter((c) => c[0] === 'hideCombo')
  assert.equal(hides.length, 1)
  const shows = renderer.calls.filter((c) => c[0] === 'showCombo')
  assert.equal(shows.length, 2)
  assert.notEqual(shows[0][1], shows[1][1], '两轮的渲染键必须不同，展示层才不会撞 key')
})

test('不跨用户、不跨礼物、不跨房间合并', () => {
  const { feed, renderer, clock } = makeFeed()
  feed.enterRoom('room-A')
  feed.push(evt({ recordId: 'a1', level: 'MID', userId: 'u-1', giftId: 'g-1', at: clock.now() }))
  feed.push(evt({ recordId: 'a2', level: 'MID', userId: 'u-2', giftId: 'g-1', at: clock.now() }))
  feed.push(evt({ recordId: 'a3', level: 'MID', userId: 'u-1', giftId: 'g-2', at: clock.now() }))
  assert.equal(renderer.combos.size, 3, '三条互不相同的组合各占一条')
  // 跨房间事件直接拒绝
  assert.equal(feed.push(evt({ recordId: 'a4', level: 'MID', roomId: 'room-B', at: clock.now() })), 'cross-room')
  assert.equal(renderer.combos.size, 3)
})

// ───────── 4. 乱序、迟到、过期 ─────────

test('迟到超过阈值的消息直接丢弃，不补播', () => {
  const { feed, renderer, clock } = makeFeed({ staleEventMs: 15_000 })
  feed.enterRoom('room-A')
  assert.equal(feed.push(evt({ recordId: 'old', at: clock.now() - 20_000 })), 'stale')
  assert.equal(renderer.lights.length, 0)
  assert.equal(feed.push(evt({ recordId: 'fresh', at: clock.now() - 1_000 })), 'accepted')
  assert.equal(renderer.lights.length, 1)
})

test('乱序到达：窗口内的都算数，合并条取较新时间', () => {
  const { feed, renderer, clock } = makeFeed()
  feed.enterRoom('room-A')
  const base = clock.now()
  feed.push(evt({ recordId: 'r2', level: 'MID', at: base - 100 }))
  feed.push(evt({ recordId: 'r1', level: 'MID', at: base - 900 })) // 更早的后到
  feed.push(evt({ recordId: 'r3', level: 'MID', at: base }))
  assert.equal(renderer.combos.size, 1)
  assert.equal([...renderer.combos.values()][0], 3)
})

test('重连重复：同 recordId 再次到达且仍在有效期内，一律去重', () => {
  const { feed, clock } = makeFeed()
  feed.enterRoom('room-A')
  feed.push(evt({ recordId: 'rec-1', at: clock.now() }))
  clock.advance(9 * 60 * 1000) // 仍在去重有效期（10 分钟）内
  assert.equal(feed.push(evt({ recordId: 'rec-1', at: clock.now() })), 'deduped')
})

test('去重缓存过期后，事件过期闸仍然兜底（双保险）', () => {
  const { feed, clock } = makeFeed()
  feed.enterRoom('room-A')
  const at = clock.now()
  feed.push(evt({ recordId: 'rec-1', at }))
  clock.advance(11 * 60 * 1000) // 去重记录已过有效期
  // 但这条消息本身也早就过期了，仍然不会重播
  assert.equal(feed.push(evt({ recordId: 'rec-1', at })), 'stale')
})

// ───────── 5. 容量受限 ─────────

test('洪峰：队列不超过上限，溢出计入合并摘要', () => {
  const { feed, renderer, clock } = makeFeed({ queueLimit: 20 })
  feed.enterRoom('room-A')
  for (let i = 0; i < 200; i++) {
    feed.push(evt({ recordId: `f-${i}`, userId: `u-${i % 7}`, giftId: `g-${i % 5}`, at: clock.now() }))
  }
  const snap = feed.snapshot()
  assert.ok(snap.queued <= 20, `队列 ${snap.queued} 应 ≤ 20`)
  assert.ok(snap.droppedByLimit > 0)
  assert.equal(renderer.overflow, snap.droppedByLimit)
  assert.ok(renderer.lights.length <= 3, 'L1 同屏不超过车道数')
  assert.ok(renderer.combos.size <= 3, 'L2 同屏不超过车道数')
})

test('洪峰：去重缓存有容量上限，不无限增长', () => {
  const { feed, clock } = makeFeed({ dedupeLimit: 64 })
  feed.enterRoom('room-A')
  for (let i = 0; i < 1000; i++) feed.push(evt({ recordId: `d-${i}`, at: clock.now() }))
  assert.ok(feed.snapshot().dedupeSize <= 64, `去重缓存 ${feed.snapshot().dedupeSize} 应 ≤ 64`)
})

// ───────── 6. 生命周期 ─────────

test('切房：清空旧房间展示，并拒绝旧房间的迟到事件', () => {
  const { feed, renderer, clock } = makeFeed()
  feed.enterRoom('room-A')
  feed.push(evt({ recordId: 'a1', level: 'MID', at: clock.now() }))
  feed.push(evt({ recordId: 'a2', at: clock.now() }))
  assert.ok(renderer.combos.size + renderer.lights.length > 0)

  feed.enterRoom('room-B')
  assert.equal(renderer.combos.size, 0)
  assert.equal(renderer.lights.length, 0)
  assert.equal(feed.snapshot().queued, 0)

  // 旧房间迟到消息
  assert.equal(feed.push(evt({ recordId: 'a3', roomId: 'room-A', at: clock.now() })), 'cross-room')
  // 切房后去重记录已清，同一 recordId 在新房间是新事件（但房间不符仍被拒）
  assert.equal(feed.push(evt({ recordId: 'a1', roomId: 'room-B', at: clock.now() })), 'accepted')
})

test('进后台：暂停派发；恢复时不集中补播积压', () => {
  const { feed, renderer, clock } = makeFeed({ backgroundStaleMs: 8000 })
  feed.enterRoom('room-A')
  feed.pause()
  for (let i = 0; i < 6; i++) feed.push(evt({ recordId: `bg-${i}`, at: clock.now() }))
  assert.equal(renderer.lights.length, 0, '后台期间不应派发')
  assert.equal(feed.snapshot().queued, 6)

  clock.advance(12_000) // 后台超过阈值
  feed.resume()
  assert.equal(feed.snapshot().queued, 0, '积压应被丢弃')
  assert.equal(renderer.lights.length, 0, '不集中补播')
})

test('短暂切后台：恢复后正常继续派发', () => {
  const { feed, renderer, clock } = makeFeed({ backgroundStaleMs: 8000 })
  feed.enterRoom('room-A')
  feed.pause()
  feed.push(evt({ recordId: 'bg-1', at: clock.now() }))
  clock.advance(2_000)
  feed.resume()
  assert.equal(renderer.lights.length, 1)
})

test('后台积压的同一组合，恢复后并成一条连击，不并排出现多条', () => {
  const { feed, renderer, clock } = makeFeed({ backgroundStaleMs: 8000 })
  feed.enterRoom('room-A')
  feed.pause()
  // 锁屏/切后台期间同一个人连送同一份礼物：三条同组合的 L2 都堆在队列里
  for (let i = 0; i < 3; i++) {
    feed.push(evt({ recordId: `cb-${i}`, userId: 'u-9', giftId: 'g-9', level: 'MID', at: clock.now() }))
  }
  assert.equal(feed.snapshot().queued, 3)

  clock.advance(1_000) // 短暂后台，积压保留
  feed.resume()

  const shown = renderer.calls.filter((c) => c[0] === 'showCombo')
  assert.equal(shown.length, 1, '同一个人送的同一份礼物只应有一条连击条')
  assert.equal(renderer.combos.size, 1)
  assert.equal([...renderer.combos.values()][0], 3, '三笔真实记录应合并为 x3，而不是三条各 x1')
})

test('派发阶段不会用同一 key 覆盖在屏连击条（覆盖后旧条永远收不到隐藏）', () => {
  const { feed, renderer, clock } = makeFeed({ backgroundStaleMs: 8000 })
  feed.enterRoom('room-A')
  feed.pause()
  for (let i = 0; i < 4; i++) {
    feed.push(evt({ recordId: `ov-${i}`, userId: 'u-7', giftId: 'g-7', level: 'HIGH', at: clock.now() }))
  }
  clock.advance(500)
  feed.resume()
  // 展示层节点必须与编排层车道一一对应：多出来的节点没有任何定时器会来收它，
  // 会永久留在礼物层上（nvue 端还会让 55ms 帧驱动停不下来）。
  assert.equal(renderer.combos.size, feed.snapshot().comboActive,
    '展示层连击条数量必须等于编排层车道数')
  assert.equal(renderer.calls.filter((c) => c[0] === 'showCombo').length, 1)
})

test('车道占满时同组合的后续记录并入在屏连击条，不被车道数挡住', () => {
  const { feed, renderer, clock } = makeFeed({ comboLanes: 2 })
  feed.enterRoom('room-A')
  feed.push(evt({ recordId: 'ln-1', userId: 'u-1', giftId: 'g-1', level: 'MID', at: clock.now() }))
  feed.push(evt({ recordId: 'ln-2', userId: 'u-2', giftId: 'g-1', level: 'MID', at: clock.now() }))
  assert.equal(renderer.combos.size, 2, '两条车道已占满')

  // 第三位观众只能排队
  feed.push(evt({ recordId: 'ln-3', userId: 'u-3', giftId: 'g-1', level: 'MID', at: clock.now() }))
  assert.equal(feed.snapshot().queued, 1)

  // u-1 的第二笔属于已在屏的组合，应直接并入，不排队也不新开车道
  assert.equal(feed.push(evt({ recordId: 'ln-4', userId: 'u-1', giftId: 'g-1', level: 'MID', at: clock.now() })), 'merged')
  assert.equal(feed.snapshot().queued, 1, '并入不应让排队的第三位观众受影响')
  assert.equal(renderer.combos.get('room-A|u-1|g-1#1'), 2)
})

test('destroy：定时器归零、队列清空、展示层被清理', () => {
  const { feed, renderer, clock } = makeFeed()
  feed.enterRoom('room-A')
  for (let i = 0; i < 10; i++) feed.push(evt({ recordId: `z-${i}`, userId: `u-${i}`, level: i % 2 ? 'MID' : 'BASIC', at: clock.now() }))
  feed.destroy()
  const snap = feed.snapshot()
  assert.equal(snap.timers, 0)
  assert.equal(snap.queued, 0)
  assert.equal(snap.destroyed, true)
  assert.equal(renderer.lights.length, 0)
  assert.equal(renderer.combos.size, 0)
  // 销毁后继续投递不再产生任何展示
  assert.equal(feed.push(evt({ recordId: 'after', at: clock.now() })), 'ignored')
})

test('减少动态效果不改变编排结果，只交给展示层做静态呈现', () => {
  const { feed, renderer, clock } = makeFeed()
  feed.enterRoom('room-A')
  feed.setReducedMotion(true)
  feed.push(evt({ recordId: 'rm-1', at: clock.now() }))
  feed.push(evt({ recordId: 'rm-2', level: 'MID', at: clock.now() }))
  assert.equal(feed.isReducedMotion, true)
  assert.equal(renderer.lights.length, 1, '信息照常展示，不因少动而丢反馈')
  assert.equal(renderer.combos.size, 1)
})

// ───────── 6b. 房间终态：结束 / 不可访问 ─────────

test('房间结束：清掉在播与排队中的展示，交易与公屏不归本模块管', () => {
  const { feed, renderer, clock } = makeFeed({ queueLimit: 50 })
  feed.enterRoom('room-A')
  for (let i = 0; i < 8; i++) {
    feed.push(evt({ recordId: `e-${i}`, userId: `u-${i}`, level: i % 2 ? 'MID' : 'BASIC', at: clock.now() }))
  }
  assert.ok(renderer.lights.length + renderer.combos.size > 0)
  const queuedBefore = feed.snapshot().queued

  feed.closeRoom('ended')
  const snap = feed.snapshot()
  assert.equal(snap.roomClosed, true)
  assert.equal(snap.closeReason, 'ended')
  assert.equal(snap.queued, 0, '排队中的事件必须清空')
  assert.equal(renderer.lights.length, 0, '在播 L1 必须收掉')
  assert.equal(renderer.combos.size, 0, '在播 L2 必须收掉')
  assert.equal(renderer.overflow, 0, '溢出摘要也要收掉，否则会压在重连出口上')
  assert.ok(queuedBefore >= 0)
})

test('房间不可访问：同样清展示，原因记为 unavailable', () => {
  const { feed, renderer, clock } = makeFeed()
  feed.enterRoom('room-A')
  feed.push(evt({ recordId: 'e-1', at: clock.now() }))
  feed.closeRoom('unavailable')
  assert.equal(feed.snapshot().closeReason, 'unavailable')
  assert.equal(renderer.lights.length, 0)
})

test('终态期间到达的成功事件不展示，且房间恢复后也不补播', () => {
  const { feed, renderer, clock } = makeFeed()
  feed.enterRoom('room-A')
  feed.closeRoom('ended')

  assert.equal(feed.push(evt({ recordId: 'late-1', at: clock.now() })), 'room-closed')
  assert.equal(feed.push(evt({ recordId: 'late-2', level: 'MID', at: clock.now() })), 'room-closed')
  assert.equal(renderer.lights.length, 0)
  assert.equal(renderer.combos.size, 0)
  assert.equal(feed.snapshot().queued, 0, '终态事件连队都不进')
  assert.equal(feed.snapshot().droppedByClose, 2)

  // 房间恢复后，终态期间那两条已计入去重，不会补播
  feed.reopenRoom()
  assert.equal(feed.snapshot().roomClosed, false)
  assert.equal(feed.push(evt({ recordId: 'late-1', at: clock.now() })), 'deduped')
  assert.equal(renderer.lights.length, 0, '旧事件不补播')

  // 恢复后的新事件正常展示
  assert.equal(feed.push(evt({ recordId: 'fresh-1', at: clock.now() })), 'accepted')
  assert.equal(renderer.lights.length, 1)
})

test('重复调用 closeRoom 同一原因不重复清理', () => {
  const { feed, renderer, clock } = makeFeed()
  feed.enterRoom('room-A')
  feed.push(evt({ recordId: 'x-1', at: clock.now() }))
  feed.closeRoom('ended')
  const clears = renderer.calls.filter((c) => c[0] === 'clearAll').length
  feed.closeRoom('ended')
  feed.closeRoom('ended')
  assert.equal(renderer.calls.filter((c) => c[0] === 'clearAll').length, clears)
})

test('切房会解除终态，新房间可以正常展示', () => {
  const { feed, renderer, clock } = makeFeed()
  feed.enterRoom('room-A')
  feed.closeRoom('unavailable')
  feed.enterRoom('room-B')
  assert.equal(feed.snapshot().roomClosed, false)
  assert.equal(feed.push(evt({ recordId: 'b-1', roomId: 'room-B', at: clock.now() })), 'accepted')
  assert.equal(renderer.lights.length, 1)
})

test('终态与后台叠加：恢复前台不会把终态期间的事件补出来', () => {
  const { feed, renderer, clock } = makeFeed()
  feed.enterRoom('room-A')
  feed.pause()
  feed.push(evt({ recordId: 'bg-1', at: clock.now() }))
  feed.closeRoom('ended')
  clock.advance(2000)
  feed.resume()
  assert.equal(renderer.lights.length, 0)
  assert.equal(feed.snapshot().queued, 0)
})

// ───────── 6d. 画面重试不得清掉反馈（接收评审补充）─────────

test('同房间重复 enterRoom（画面重试重载）不清展示、不清去重', () => {
  const { feed, renderer, clock } = makeFeed()
  feed.enterRoom('room-A')
  feed.push(evt({ recordId: 'r-1', userId: 'u-a', giftId: 'g-a', at: clock.now() }))
  feed.push(evt({ recordId: 'r-2', userId: 'u-b', giftId: 'g-b', level: 'MID', at: clock.now() }))
  assert.equal(renderer.lights.length, 1)
  assert.equal(renderer.combos.size, 1)

  // nvue 的 onPlayerError 退避重试会调 loadRoom()，loadRoom() 开头就是 enterRoom(同一个房间)
  feed.enterRoom('room-A')

  assert.equal(renderer.lights.length, 1, '一次正常缓冲重试不该把 L1 抹掉')
  assert.equal(renderer.combos.size, 1, '一次正常缓冲重试不该把 L2 抹掉')
  // 去重必须保留，否则重连后同一条广播会重复展示
  assert.equal(feed.push(evt({ recordId: 'r-1', userId: 'u-a', giftId: 'g-a', at: clock.now() })), 'deduped')
})

test('真正切房仍然全清：展示、队列与去重都不带到新房间', () => {
  const { feed, renderer, clock } = makeFeed()
  feed.enterRoom('room-A')
  feed.push(evt({ recordId: 's-1', userId: 'u-a', giftId: 'g-a', at: clock.now() }))
  feed.enterRoom('room-B')
  assert.equal(renderer.lights.length, 0)
  assert.equal(feed.snapshot().queued, 0)
  assert.equal(feed.snapshot().dedupeSize, 0, '切房必须清去重，否则新房间会误判重复')
  assert.equal(feed.push(evt({ recordId: 's-1', roomId: 'room-B', at: clock.now() })), 'accepted')
})

test('重试重载会解除终态：error 清空后房间恢复可展示', () => {
  const { feed, renderer, clock } = makeFeed()
  feed.enterRoom('room-A')
  feed.closeRoom('unavailable')
  feed.enterRoom('room-A')   // 重载同房间
  assert.equal(feed.snapshot().roomClosed, false)
  assert.equal(feed.push(evt({ recordId: 'after-retry', at: clock.now() })), 'accepted')
  assert.equal(renderer.lights.length, 1)
})

test('nvue 的画面重试链路确实会走到 enterRoom（源码断言，说明为何必须幂等）', () => {
  const nvue = readFileSync(WATCH_NVUE, 'utf8')
  const NL3 = String.fromCharCode(10)
  const lines = nvue.split(NL3)
  const errIdx = lines.findIndex((l) => l.includes('function onPlayerError()'))
  assert.ok(errIdx > 0)
  const errBody = lines.slice(errIdx, errIdx + 20).join(NL3)
  assert.ok(errBody.includes('loadRoom()'), 'onPlayerError 退避后会重载房间')
  const loadIdx = lines.findIndex((l) => l.includes('async function loadRoom()'))
  const loadHead = lines.slice(loadIdx, loadIdx + 8).join(NL3)
  assert.ok(loadHead.includes('giftFeed.enterRoom('), 'loadRoom 开头会调 enterRoom')
})

// ───────── 6c. 缓冲 / 重试不是终态 ─────────

test('页面只在确定终态调 closeRoom：两端 watch 都不取缓冲与重试标志', () => {
  const nvue = readFileSync(WATCH_NVUE, 'utf8')
  const vue = readFileSync(WATCH_VUE, 'utf8')
  const NL = String.fromCharCode(10)

  // 取 watch 的响应式来源那一行，看它到底读了哪些标志
  const nvueSrc = nvue.split(NL).find((line) => line.includes('() => ({ ended: roomEnded.value'))
  assert.ok(nvueSrc, 'nvue 应有终态 watch')
  assert.ok(nvueSrc.includes('roomEnded.value') && nvueSrc.includes('error.value'))
  assert.equal(/playerNotice|playerRetryTimer|playerRetryCount|loading/.test(nvueSrc), false,
    'nvue：缓冲、重试与加载中标志不得进入终态判定')

  const vueSrc = vue.split(NL).find((line) => line.includes('() => ({ ended: endingLiveSession.value'))
  assert.ok(vueSrc, 'vue 应有终态 watch')
  assert.ok(vueSrc.includes('endingLiveSession.value') && vueSrc.includes('error.value'))
  assert.equal(/loading|playerNotice|retry/i.test(vueSrc), false,
    'vue：加载中与画面波动不得进入终态判定')
})

test('缓冲态不会清展示：只要没调 closeRoom，队列与在播都保留', () => {
  const { feed, renderer, clock } = makeFeed()
  feed.enterRoom('room-A')
  feed.push(evt({ recordId: 'buf-1', userId: 'u-a', giftId: 'g-a', at: clock.now() }))
  feed.push(evt({ recordId: 'buf-2', userId: 'u-b', giftId: 'g-b', level: 'MID', at: clock.now() }))
  // 模拟画面缓冲/重试：页面不调用 closeRoom，编排层不该有任何反应
  assert.equal(feed.snapshot().roomClosed, false)
  assert.equal(renderer.lights.length, 1)
  assert.equal(renderer.combos.size, 1)
  // 缓冲期间新事件照常展示
  // 换一个发送者与礼物，避免落进上面那条连击槽
  assert.equal(feed.push(evt({ recordId: 'buf-3', userId: 'u-c', giftId: 'g-c', at: clock.now() })), 'accepted')
  assert.equal(renderer.lights.length, 2)
})

test('房间终态不触碰公屏与交易：两端都只在 closeRoom 里动展示层', () => {
  const nvue = readFileSync(WATCH_NVUE, 'utf8')
  const vue = readFileSync(WATCH_VUE, 'utf8')
  for (const [name, src] of [['nvue', nvue], ['vue', vue]]) {
    const idx = src.indexOf('giftFeed.closeRoom(')
    assert.ok(idx > 0, `${name} 应接入 closeRoom`)
    const around = src.slice(idx - 400, idx + 400)
    assert.equal(/comments\.value|coinBalance|sendLiveGift/.test(around), false,
      `${name}：终态处理不得顺带改公屏或余额`)
  }
  const feedSrc = readFileSync(SRC, 'utf8')
  const start = feedSrc.indexOf('  closeRoom(reason: RoomCloseReason)')
  const NL2 = String.fromCharCode(10)
  const body = feedSrc.slice(start, feedSrc.indexOf(NL2 + '  }', start))
  assert.equal(/comment|balance|coin|order/i.test(body), false,
    'closeRoom 只动展示状态，不碰业务记录')
})

// ───────── 7. 源码结构断言（不是行为测试）─────────

test('失败送礼不会产生成功反馈：只有拿到 giftRecord 才 push', () => {
  const nvue = readFileSync(WATCH_NVUE, 'utf8')
  const vue = readFileSync(WATCH_VUE, 'utf8')
  for (const [name, src] of [['nvue', nvue], ['vue', vue]]) {
    const idx = src.indexOf('await sendLiveGift(')
    assert.ok(idx > 0, `${name} 应通过 sendLiveGift 发送`)
    const pushIdx = src.indexOf('normalizeFromSendResponse', idx)
    const catchIdx = src.indexOf('} catch', idx)
    assert.ok(pushIdx > idx && pushIdx < catchIdx,
      `${name} 的成功反馈必须在 await 之后、catch 之前，即只有事务成功才播`)
  }
})

test('sendLiveGift 贯通 recordId，不再只取 totalCoin', () => {
  const api = readFileSync(API_TS, 'utf8')
  assert.match(api, /recordId: String\(value\?\.id \|\| ''\)/)
  assert.match(api, /record: value \|\| null/)
})

test('H5 不再保留第二套本地飘屏，礼物展示只有一条链路', () => {
  const vue = readFileSync(WATCH_VUE, 'utf8')
  assert.equal(vue.includes('giftFlyers'), false, '旧的本地飘屏应已移除')
  assert.equal(vue.includes('flyerId'), false)
  assert.ok(vue.includes('giftFeed.push('), '应统一走编排层')
})

test('H5 补齐了广播礼物接收（原来只筛 payload.text 会整条漏掉）', () => {
  const vue = readFileSync(WATCH_VUE, 'utf8')
  assert.ok(vue.includes('normalizeFromTimMessage'), '应解析 payload.data 里的 LIVE_GIFT')
  assert.equal(
    vue.includes("m.to === groupId && m.payload?.text)"), false,
    '不应再用 payload.text 作为群消息的准入条件',
  )
})

test('nvue 礼物层不吃触摸：模板里没有任何点击绑定', () => {
  const nvue = readFileSync(WATCH_NVUE, 'utf8')
  const start = nvue.indexOf('<cover-view v-if="giftCombos.length"')
  const end = nvue.indexOf('<cover-view class="comment-stack"')
  assert.ok(start > 0 && end > start)
  const layer = nvue.slice(start, end)
  assert.equal(/@click|@tap/.test(layer), false, '礼物反馈层不应有点击处理，避免挡住关键操作')
})

test('H5 礼物层声明 pointer-events:none，不挡退出/举报/送礼', () => {
  const vue = readFileSync(WATCH_VUE, 'utf8')
  for (const cls of ['.gift-combos', '.gift-lights', '.gift-overflow']) {
    const idx = vue.indexOf(cls + ' {')
    assert.ok(idx > 0, `应有 ${cls} 样式`)
    const block = vue.slice(idx, vue.indexOf('}', idx))
    assert.ok(block.includes('pointer-events: none'), `${cls} 应声明 pointer-events: none`)
  }
})

test('两端页面都在卸载时释放编排层与定时器', () => {
  const nvue = readFileSync(WATCH_NVUE, 'utf8')
  const vue = readFileSync(WATCH_VUE, 'utf8')
  assert.ok(nvue.includes('giftFeed.destroy()') && nvue.includes('stopGiftTicker()'))
  assert.ok(vue.includes('giftFeed.destroy()') && vue.includes('clearGiftExitTimers()'))
  assert.ok(nvue.includes('giftFeed.pause()') && nvue.includes('giftFeed.resume()'))
  assert.ok(vue.includes('giftFeed.pause()') && vue.includes('giftFeed.resume()'))
})

test('两端页面都在进房/切房时重置编排层', () => {
  const nvue = readFileSync(WATCH_NVUE, 'utf8')
  const vue = readFileSync(WATCH_VUE, 'utf8')
  assert.ok(nvue.includes('giftFeed.enterRoom(targetRoomId)'))
  assert.ok(vue.includes('giftFeed.enterRoom(roomId)'))
})
