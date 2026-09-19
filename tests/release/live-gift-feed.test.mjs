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
