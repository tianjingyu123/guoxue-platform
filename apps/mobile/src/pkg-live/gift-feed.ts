/**
 * 直播礼物反馈编排（L1 轻量 / L2 连击）
 *
 * 这是与渲染无关的纯逻辑层，nvue 与 vue 共用；显示层各自按端能力实现。
 *
 * ── 边界 ──────────────────────────────────────────────────────────
 * 本模块只负责“表现”。它不判断送礼成败、不扣费、不改余额、不发 IM、不写公屏业务记录。
 * 展示数量不是财务统计，任何时候都不能拿它当账。
 *
 * ── 成功事件的两条来源（均为服务端已确认成功）──────────────────────
 * ① 送礼响应：`POST /live/rooms/:id/gifts` 返回的 giftRecord。
 *    服务端在 `live.service.ts::sendGift` 的 `$transaction`（扣币 + giftRecord + 主播分账）
 *    提交成功后才返回该记录，因此拿到响应即等于交易已确认。
 * ② 房间广播：`im.service.ts::relayLiveGift` 发出的 TIMCustomElem
 *    `{ type:'LIVE_GIFT', recordId, giftId, giftName, quantity }`，
 *    只在首次创建成功（`created === true`）时发一次，幂等重放不再广播。
 *
 * 自己送礼时两条路径会带着**同一个 recordId** 先后到达，靠 recordId 去重只展示一次。
 * 点击发送、请求发出、动画播完都不是成功依据，本模块不接受这类输入。
 *
 * ── 广播缺字段的处理（不改后端，客户端补齐）────────────────────────
 * 广播 payload 只有 recordId / giftId / giftName / quantity：
 * - 房间：由订阅方按当前群 `message.to === groupId` 限定，并在归一化时注入 roomId；
 * - 发送者：取消息信封 `message.from` 与 `message.nick`；
 * - 时间：取信封 `message.time`（秒，×1000，与 lib/im-data.ts 口径一致）；
 * - 图标与层级：用 giftId 回查本房间已拉取的礼物清单（`/live/gifts` 返回含 level）。
 *   查不到时按 BASIC 降级，不猜测、不拼假数据。
 */

/** 展示层级。本轮只做 L1/L2；后端 level 为 HIGH/TOP 的礼物暂按 L2 呈现，L3 独占特效未接入。 */
export type GiftTier = 1 | 2

/** 后端 Gift.level 取值（schema.prisma: BASIC / MID / HIGH / TOP，默认 BASIC） */
export type GiftLevel = 'BASIC' | 'MID' | 'HIGH' | 'TOP'

export interface NormalizedGiftEvent {
  /** 服务端 giftRecord.id，唯一且稳定，是去重的唯一依据 */
  recordId: string
  roomId: string
  userId: string
  userName: string
  avatar: string
  giftId: string
  giftName: string
  icon: string
  level: GiftLevel
  tier: GiftTier
  /** 本条记录的**单次**数量（giftRecord.quantity），不是累计值 */
  quantity: number
  /** 毫秒时间戳 */
  at: number
  source: 'response' | 'broadcast'
}

export const GIFT_FEED_DEFAULTS = {
  /**
   * 队列上限。L1/L2 各 3 条车道、单条最长驻留 3.2 秒，24 条约合 12 秒积压；
   * 超过这个时长再播已经失去“实时反馈”的意义，因此在此封顶。
   */
  queueLimit: 24,
  /** 去重缓存条数上限（先进先出淘汰） */
  dedupeLimit: 512,
  /** 去重缓存有效期：超过此时长的记录允许被淘汰，避免长场直播无限增长 */
  dedupeTtlMs: 10 * 60 * 1000,
  /** 连击合并窗口 */
  comboWindowMs: 3000,
  /** 事件过期阈值：比当前时间早于此值的消息（迟到、重连补发）直接丢弃 */
  staleEventMs: 15 * 1000,
  /** L1 同屏车道数 */
  lightLanes: 3,
  /** L2 同屏车道数 */
  comboLanes: 3,
  /** L1 单条驻留 */
  lightHoldMs: 2200,
  /** L2 连击条在无新连击后驻留 */
  comboHoldMs: 3200,
  /** 后台超过此时长再回前台，积压事件不补播 */
  backgroundStaleMs: 8000,
}

export type GiftFeedConfig = typeof GIFT_FEED_DEFAULTS

/** 后端 giftRecord（送礼响应体）里本模块用到的字段 */
export interface RawGiftRecord {
  id?: string
  userId?: string
  liveRoomId?: string
  giftId?: string
  quantity?: number
  createdAt?: string
  user?: { id?: string; nickname?: string; avatar?: string } | null
  gift?: { id?: string; name?: string; icon?: string | null; level?: string } | null
}

/** 归一化时用来回查图标与层级的礼物条目 */
export interface GiftCatalogEntry {
  id: string
  name: string
  icon?: string
  level?: string
}

export interface NormalizeContext {
  /** 当前房间 id；广播 payload 不带房间，由订阅方注入 */
  roomId: string
  /** 按 giftId 回查礼物清单，查不到返回 undefined */
  lookupGift?: (giftId: string) => GiftCatalogEntry | undefined
  /** 当前登录用户 id，用于把自己的广播回声标成“我” */
  selfUserId?: string
}

const LEVELS: GiftLevel[] = ['BASIC', 'MID', 'HIGH', 'TOP']

export function normalizeLevel(value: unknown): GiftLevel {
  const upper = String(value || '').toUpperCase() as GiftLevel
  return LEVELS.indexOf(upper) >= 0 ? upper : 'BASIC'
}

/** BASIC → L1；MID/HIGH/TOP → L2。HIGH/TOP 的独占特效属 L3，本轮未接入。 */
export function tierOfLevel(level: GiftLevel): GiftTier {
  return level === 'BASIC' ? 1 : 2
}

/**
 * 数量校验口径与 `live-tim-events.ts::readLiveGiftTimEvent` 保持一致（同样用 Number 转换）。
 * 两者必须一致：nvue 页公屏走前者、礼物反馈走后者，口径不同会出现"公屏有、动效没有"。
 */
function safeQuantity(value: unknown): number {
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1 || n > 999) return 0
  return n
}

/**
 * 送礼响应 → 归一化事件。
 * 响应体缺 recordId 时返回 null：宁可不播，也不拼假标识。
 */
export function normalizeFromSendResponse(
  record: RawGiftRecord | null | undefined,
  ctx: NormalizeContext,
): NormalizedGiftEvent | null {
  if (!record) return null
  const recordId = String(record.id || '')
  const quantity = safeQuantity(record.quantity)
  if (!recordId || !quantity) return null

  const catalog = record.giftId && ctx.lookupGift ? ctx.lookupGift(String(record.giftId)) : undefined
  const level = normalizeLevel(record.gift?.level ?? catalog?.level)
  const createdAt = record.createdAt ? Date.parse(record.createdAt) : NaN

  return {
    recordId,
    roomId: String(record.liveRoomId || ctx.roomId || ''),
    userId: String(record.userId || ctx.selfUserId || ''),
    userName: '我',
    avatar: String(record.user?.avatar || ''),
    giftId: String(record.giftId || ''),
    giftName: String(record.gift?.name || catalog?.name || '心意'),
    icon: String(record.gift?.icon || catalog?.icon || ''),
    level,
    tier: tierOfLevel(level),
    quantity,
    at: Number.isFinite(createdAt) ? createdAt : Date.now(),
    source: 'response',
  }
}

/** TIM 群消息信封里本模块用到的字段（与 composables/useTim.ts 的 TimMessage 对齐） */
export interface GiftTimEnvelope {
  from?: string
  nick?: string
  avatar?: string
  time?: number
  payload?: { data?: string }
}

/**
 * 房间广播 → 归一化事件。
 * 只认 `type === 'LIVE_GIFT'` 且带合法 recordId 的结构化消息；普通文本不可能被当成礼物。
 * 调用方必须先按当前群过滤消息（`message.to === groupId`），本函数不做房间过滤。
 */
export function normalizeFromTimMessage(
  message: GiftTimEnvelope,
  ctx: NormalizeContext,
): NormalizedGiftEvent | null {
  const raw = message?.payload?.data
  if (typeof raw !== 'string' || !raw) return null
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }
  if (parsed.type !== 'LIVE_GIFT') return null

  const recordId = String(parsed.recordId || '')
  const quantity = safeQuantity(parsed.quantity)
  if (!recordId || typeof parsed.recordId !== 'string' || !quantity) return null

  const giftId = String(parsed.giftId || '')
  const catalog = giftId && ctx.lookupGift ? ctx.lookupGift(giftId) : undefined
  const level = normalizeLevel(catalog?.level)
  const fromId = String(message.from || '')
  const isSelf = !!ctx.selfUserId && fromId === ctx.selfUserId
  // TIM 信封 time 为秒，与 lib/im-data.ts 同口径换算
  const at = Number(message.time) > 0 ? Number(message.time) * 1000 : Date.now()

  return {
    recordId,
    roomId: ctx.roomId,
    userId: fromId,
    userName: isSelf ? '我' : String(message.nick || '观众'),
    avatar: String(message.avatar || ''),
    giftId,
    giftName: String(parsed.giftName || catalog?.name || '心意'),
    icon: String(catalog?.icon || ''),
    level,
    tier: tierOfLevel(level),
    quantity,
    at,
    source: 'broadcast',
  }
}

/** 有界 + 带有效期的去重记录 */
class DedupeCache {
  private map = new Map<string, number>()
  constructor(private limit: number, private ttlMs: number) {}

  /** 新记录返回 true 并登记；已存在（未过期）返回 false */
  admit(key: string, now: number): boolean {
    const seenAt = this.map.get(key)
    if (seenAt !== undefined && now - seenAt < this.ttlMs) return false
    if (seenAt !== undefined) this.map.delete(key)
    this.map.set(key, now)
    this.evict(now)
    return true
  }

  private evict(now: number) {
    if (this.map.size <= this.limit) return
    for (const [key, at] of this.map) {
      if (now - at >= this.ttlMs) this.map.delete(key)
      if (this.map.size <= this.limit) return
    }
    // TTL 内仍超限：按插入顺序淘汰最旧的（Map 保序）
    while (this.map.size > this.limit) {
      const oldest = this.map.keys().next()
      if (oldest.done) break
      this.map.delete(oldest.value)
    }
  }

  clear() {
    this.map.clear()
  }

  get size() {
    return this.map.size
  }
}

/** 展示层需要实现的方法。nvue 与 vue 各写一份。 */
export interface GiftFeedRenderer {
  showLight(event: NormalizedGiftEvent): void
  hideLight(recordId: string): void
  showCombo(key: string, event: NormalizedGiftEvent, count: number): void
  updateCombo(key: string, count: number): void
  hideCombo(key: string): void
  /** 队列溢出合并了多少份；0 表示隐藏摘要 */
  showOverflow(dropped: number): void
  clearAll(): void
}

/**
 * 房间进入**确定**的终态。只有这两种才清展示：
 * - ended：房间已结束或转回放
 * - unavailable：房间加载失败、画面重试耗尽，页面已给出「重新连接」出口
 *
 * 画面缓冲与重试中（playerNotice / playerRetryTimer）**不是终态**，不能据此清理，
 * 否则一次正常卡顿就会把用户刚送出的礼物反馈一并抹掉。
 */
export type RoomCloseReason = 'ended' | 'unavailable'

export type GiftFeedMetric =
  | { type: 'deduped'; recordId: string; source: NormalizedGiftEvent['source'] }
  | { type: 'merged'; key: string; count: number }
  | { type: 'stale'; recordId: string; ageMs: number }
  | { type: 'cross-room'; recordId: string }
  | { type: 'overflow'; dropped: number }
  | { type: 'background-drop'; dropped: number }
  | { type: 'room-closed'; reason: RoomCloseReason; dropped: number }
  | { type: 'room-reopened' }
  | { type: 'closed-drop'; recordId: string }

interface ComboSlot {
  /** 合并键：房间 + 用户 + 礼物 */
  key: string
  /** 渲染键：合并键 + 连击轮次，保证同一组合的新一轮在展示层是新节点 */
  renderKey: string
  event: NormalizedGiftEvent
  count: number
  lastAt: number
  timer: unknown
}

export class GiftFeed {
  readonly cfg: GiftFeedConfig
  private renderer: GiftFeedRenderer
  private onMetric: (m: GiftFeedMetric) => void
  private now: () => number

  private dedupe: DedupeCache
  private queue: NormalizedGiftEvent[] = []
  private combos = new Map<string, ComboSlot>()
  private comboRun = 0
  private lightActive = new Map<string, unknown>()
  private timers = new Set<unknown>()

  private roomId = ''
  /** 切房自增，用来拒绝旧房间的迟到事件 */
  private epoch = 0
  private dropped = 0
  private paused = false
  private roomClosed = false
  private closeReason: RoomCloseReason | null = null
  private hiddenSince = 0
  private reducedMotion = false
  private destroyed = false

  stats = { accepted: 0, deduped: 0, merged: 0, stale: 0, crossRoom: 0, droppedByLimit: 0, droppedByClose: 0 }

  constructor(options: {
    renderer: GiftFeedRenderer
    config?: Partial<GiftFeedConfig>
    onMetric?: (m: GiftFeedMetric) => void
    /** 便于测试注入时钟 */
    now?: () => number
  }) {
    this.cfg = { ...GIFT_FEED_DEFAULTS, ...(options.config || {}) }
    this.renderer = options.renderer
    this.onMetric = options.onMetric || (() => undefined)
    this.now = options.now || (() => Date.now())
    this.dedupe = new DedupeCache(this.cfg.dedupeLimit, this.cfg.dedupeTtlMs)
  }

  // ── 定时器统一登记 ──
  private later(fn: () => void, ms: number) {
    const id = setTimeout(() => {
      this.timers.delete(id)
      if (!this.destroyed) fn()
    }, ms)
    this.timers.add(id)
    return id
  }

  private cancel(id: unknown) {
    if (id == null) return
    clearTimeout(id as ReturnType<typeof setTimeout>)
    this.timers.delete(id)
  }

  /**
   * 减少动态效果。展示层据此改为静态呈现；编排逻辑（去重、合并、队列）不变，
   * 因为“少动”不等于“可以丢业务反馈”。
   */
  setReducedMotion(on: boolean) {
    this.reducedMotion = !!on
  }

  get isReducedMotion() {
    return this.reducedMotion
  }

  /** 进入房间 / 切房。清空上一房间的展示状态与去重记录，并拒绝旧房间迟到事件。 */
  enterRoom(roomId: string) {
    this.clearRoomState()
    this.dedupe.clear()
    this.roomId = String(roomId || '')
    this.epoch += 1
    this.dropped = 0
    this.roomClosed = false
    this.closeReason = null
    this.renderer.showOverflow(0)
  }

  /**
   * 接收一条**服务端已确认成功**的礼物事件。
   * @returns 处理结果，便于调用方记录与验证
   */
  push(
    event: NormalizedGiftEvent | null,
  ): 'accepted' | 'merged' | 'deduped' | 'stale' | 'cross-room' | 'room-closed' | 'ignored' {
    if (this.destroyed || !event || !event.recordId) return 'ignored'

    // 1) 跨房间：切房后迟到的旧房间消息一律不展示
    if (this.roomId && event.roomId && event.roomId !== this.roomId) {
      this.stats.crossRoom += 1
      this.onMetric({ type: 'cross-room', recordId: event.recordId })
      return 'cross-room'
    }

    const now = this.now()

    // 2) 过期：迟到、重连补发的老消息不再播
    const age = now - event.at
    if (age > this.cfg.staleEventMs) {
      this.stats.stale += 1
      this.onMetric({ type: 'stale', recordId: event.recordId, ageMs: age })
      return 'stale'
    }

    // 3) 去重：同一 recordId 无论从响应还是广播先到，都只认第一次
    if (!this.dedupe.admit(event.recordId, now)) {
      this.stats.deduped += 1
      this.onMetric({ type: 'deduped', recordId: event.recordId, source: event.source })
      return 'deduped'
    }

    // 4) 房间已结束或不可访问：事件仍计入去重（房间恢复后不会补播这条），
    //    但不进入任何展示，避免反馈盖住「重新连接」「返回」等出口。
    //    公屏与交易记录不受影响——那是业务反馈，由页面自己保留。
    if (this.roomClosed) {
      this.stats.droppedByClose += 1
      this.onMetric({ type: 'closed-drop', recordId: event.recordId })
      return 'room-closed'
    }
    this.stats.accepted += 1

    // 5) 连击合并：同房间 + 同发送者 + 同礼物，窗口内累加。
    //    quantity 是单次数量（giftRecord.quantity），累加不会翻倍。
    const key = this.comboKeyOf(event)
    const slot = this.combos.get(key)
    if (slot) {
      if (now - slot.lastAt < this.cfg.comboWindowMs) {
        slot.count += event.quantity
        slot.lastAt = now
        if (event.at > slot.event.at) slot.event = event
        this.cancel(slot.timer)
        slot.timer = this.later(() => this.closeCombo(key), this.cfg.comboHoldMs)
        this.renderer.updateCombo(slot.renderKey, slot.count)
        this.stats.merged += 1
        this.onMetric({ type: 'merged', key: slot.renderKey, count: slot.count })
        return 'merged'
      }
      // 超出合并窗口但旧条还在屏上：先收掉旧条，让新一轮从头计数，
      // 不能直接覆盖——那样上一轮的累计数会凭空消失。
      // 这里不触发 drain（本次 push 末尾会统一 drain），避免重入。
      this.closeCombo(key, false)
    }

    this.queue.push(event)
    this.trimQueue()
    this.drain()
    return 'accepted'
  }

  private comboKeyOf(event: NormalizedGiftEvent) {
    // 房间 + 用户 + 礼物三者都相同才合并，不跨房间、不跨用户、不跨礼物
    return `${event.roomId}|${event.userId}|${event.giftId}`
  }

  /** 队列封顶：优先丢最旧的 L1，累计成一条摘要；只丢“视觉效果”，公屏与交易记录不受影响。 */
  private trimQueue() {
    if (this.queue.length <= this.cfg.queueLimit) return
    while (this.queue.length > this.cfg.queueLimit) {
      let idx = -1
      for (let i = 0; i < this.queue.length; i++) {
        if (this.queue[i].tier === 1) { idx = i; break }
      }
      if (idx < 0) idx = 0
      this.queue.splice(idx, 1)
      this.dropped += 1
      this.stats.droppedByLimit += 1
    }
    this.renderer.showOverflow(this.dropped)
    this.onMetric({ type: 'overflow', dropped: this.dropped })
  }

  private drain() {
    if (this.destroyed || this.paused) return
    for (let i = 0; i < this.queue.length;) {
      const event = this.queue[i]
      if (event.tier === 2) {
        if (this.combos.size >= this.cfg.comboLanes) { i += 1; continue }
        this.queue.splice(i, 1)
        this.openCombo(event)
        continue
      }
      if (this.lightActive.size >= this.cfg.lightLanes) { i += 1; continue }
      this.queue.splice(i, 1)
      this.playLight(event)
    }
  }

  private playLight(event: NormalizedGiftEvent) {
    this.renderer.showLight(event)
    const timer = this.later(() => {
      this.lightActive.delete(event.recordId)
      this.renderer.hideLight(event.recordId)
      this.drain()
    }, this.cfg.lightHoldMs)
    this.lightActive.set(event.recordId, timer)
  }

  private openCombo(event: NormalizedGiftEvent) {
    const key = this.comboKeyOf(event)
    this.comboRun += 1
    const slot: ComboSlot = {
      key,
      renderKey: `${key}#${this.comboRun}`,
      event,
      count: event.quantity,
      lastAt: this.now(),
      timer: null,
    }
    slot.timer = this.later(() => this.closeCombo(key), this.cfg.comboHoldMs)
    this.combos.set(key, slot)
    this.renderer.showCombo(slot.renderKey, event, event.quantity)
  }

  private closeCombo(key: string, redrain = true) {
    const slot = this.combos.get(key)
    if (!slot) return
    this.cancel(slot.timer)
    this.combos.delete(key)
    this.renderer.hideCombo(slot.renderKey)
    if (redrain) this.drain()
  }

  // ── 生命周期 ──

  /**
   * 房间进入确定终态：清掉在播与排队中的展示，并拒绝后续事件。
   *
   * **不碰公屏、不碰交易记录**——那两者是业务反馈，必须留在原地。
   * 调用方只能在终态触发，缓冲与重试中的画面波动不算终态。
   */
  closeRoom(reason: RoomCloseReason) {
    if (this.destroyed) return
    if (this.roomClosed && this.closeReason === reason) return
    const dropped = this.queue.length
    this.roomClosed = true
    this.closeReason = reason
    this.clearRoomState()
    this.dropped = 0
    this.renderer.showOverflow(0)
    this.onMetric({ type: 'room-closed', reason, dropped })
  }

  /** 房间恢复可用（重连成功 / 重新加载成功），允许继续展示新事件。 */
  reopenRoom() {
    if (this.destroyed || !this.roomClosed) return
    this.roomClosed = false
    this.closeReason = null
    this.onMetric({ type: 'room-reopened' })
  }

  get isRoomClosed() {
    return this.roomClosed
  }

  /** 页面隐藏 / 切后台 */
  pause() {
    if (this.paused || this.destroyed) return
    this.paused = true
    this.hiddenSince = this.now()
  }

  /** 回到前台。后台过久则丢掉全部积压，不集中补播。 */
  resume() {
    if (!this.paused || this.destroyed) return
    const hiddenMs = this.now() - this.hiddenSince
    this.paused = false
    if (hiddenMs > this.cfg.backgroundStaleMs && this.queue.length) {
      const dropped = this.queue.length
      this.queue.length = 0
      this.onMetric({ type: 'background-drop', dropped })
    }
    this.drain()
  }

  private clearRoomState() {
    this.queue.length = 0
    for (const slot of this.combos.values()) {
      this.cancel(slot.timer)
      this.renderer.hideCombo(slot.renderKey)
    }
    this.combos.clear()
    for (const [recordId, timer] of this.lightActive) {
      this.cancel(timer)
      this.renderer.hideLight(recordId)
    }
    this.lightActive.clear()
    this.renderer.clearAll()
  }

  /** 页面卸载：清订阅方之外的全部定时器与状态 */
  destroy() {
    if (this.destroyed) return
    this.clearRoomState()
    this.dedupe.clear()
    this.destroyed = true
    for (const id of this.timers) clearTimeout(id as ReturnType<typeof setTimeout>)
    this.timers.clear()
  }

  snapshot() {
    return {
      ...this.stats,
      roomId: this.roomId,
      epoch: this.epoch,
      queued: this.queue.length,
      lightActive: this.lightActive.size,
      comboActive: this.combos.size,
      dedupeSize: this.dedupe.size,
      timers: this.timers.size,
      paused: this.paused,
      roomClosed: this.roomClosed,
      closeReason: this.closeReason,
      reducedMotion: this.reducedMotion,
      destroyed: this.destroyed,
    }
  }
}
