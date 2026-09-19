/**
 * 直播礼物展示编排器（与渲染框架无关，可整段移植到 uni-app / nvue）
 *
 * 边界（重要）：
 * - 本模块只负责“表现”。它不判断送礼是否成功、不参与扣费、不回写余额。
 *   调用方只在**服务端已确认**的礼物事件上调用 push()。动画播不出来，送礼结果照旧。
 * - 不读写订单、余额、礼物定价、支付、IM 协议。
 *
 * 能力：
 * - 按 recordId 去重（有界记录，切房清空）
 * - 有界队列 + 溢出合并为一条摘要，不无限堆积
 * - 同人同礼物连击窗口内合并，只更新数量不新起动画
 * - 三层级分轨：L1 轻量气泡 / L2 连击条 / L3 全屏特效（独占 + 时长上限 + 可跳过）
 * - 页面隐藏暂停、恢复时丢弃过期 L3
 * - 素材加载失败、减少动态效果 → 降级为文字条，不影响业务反馈
 * - destroy() 释放全部定时器与播放器实例
 */

export const TIER = { LIGHT: 1, COMBO: 2, PREMIUM: 3 }

export const DEFAULTS = {
  /** 队列上限：超出按优先级丢弃并合并摘要 */
  queueLimit: 20,
  /** 去重记录上限 */
  dedupeLimit: 500,
  /** 连击合并窗口（毫秒） */
  comboWindowMs: 3000,
  /** L1 同屏并发条数 */
  lightLanes: 3,
  /** L2 同屏并发条数 */
  comboLanes: 3,
  /** L1 单条停留 */
  lightHoldMs: 2200,
  /** L2 连击条在无新连击后停留 */
  comboHoldMs: 3200,
  /** L3 硬时长上限：素材再长也强制收尾 */
  premiumMaxMs: 5000,
  /** L3 之间最小间隔，避免连续全屏糊脸 */
  premiumGapMs: 400,
  /** 页面隐藏超过该时长后，恢复时不再补播 L3 */
  staleAfterMs: 8000,
}

/** 有界去重集合：先进先出淘汰，避免长时间直播内存增长 */
class BoundedKeySet {
  constructor(limit) {
    this.limit = limit
    this.set = new Set()
    this.order = []
  }
  has(key) {
    return this.set.has(key)
  }
  add(key) {
    if (this.set.has(key)) return false
    this.set.add(key)
    this.order.push(key)
    if (this.order.length > this.limit) {
      this.set.delete(this.order.shift())
    }
    return true
  }
  clear() {
    this.set.clear()
    this.order.length = 0
  }
}

export class GiftStage {
  /**
   * @param {object} opts
   * @param {object} opts.renderer 渲染适配层，见 README「移植说明」
   * @param {object} [opts.config]
   * @param {(evt:object)=>void} [opts.onMetric] 观测回调，仅用于样例统计
   */
  constructor({ renderer, config = {}, onMetric } = {}) {
    this.cfg = { ...DEFAULTS, ...config }
    this.renderer = renderer
    this.onMetric = onMetric || (() => {})

    this.seen = new BoundedKeySet(this.cfg.dedupeLimit)
    this.queue = []
    this.dropped = 0

    /** 连击槽：key = `${userId}:${giftId}` */
    this.combos = new Map()
    this.lightActive = new Map()
    this.premium = null
    this.premiumReadyAt = 0

    this.timers = new Set()
    this.paused = false
    this.hiddenSince = 0
    this.reducedMotion = false
    this.destroyed = false

    this.stats = { accepted: 0, deduped: 0, merged: 0, droppedByLimit: 0, premiumPlayed: 0, premiumSkipped: 0, fallback: 0 }
  }

  // ── 定时器统一登记，destroy 时一次清干净 ──
  _later(fn, ms) {
    const id = setTimeout(() => {
      this.timers.delete(id)
      if (!this.destroyed) fn()
    }, ms)
    this.timers.add(id)
    return id
  }
  _cancel(id) {
    if (id == null) return
    clearTimeout(id)
    this.timers.delete(id)
  }

  setReducedMotion(on) {
    this.reducedMotion = !!on
    if (on && this.premium) this.skipPremium('reduced-motion')
  }

  /**
   * 接收层去重闸。新事件登记并返回 true，重复返回 false。
   * 调用方应在**渲染公屏、系统横幅之前**先过这道闸——重复广播不该产生两条业务反馈，
   * 而不是只在动画层拦一下。push() 复用同一份记录，不会重复计数。
   * @param {string} recordId
   */
  admit(recordId) {
    if (this.destroyed || !recordId) return false
    if (this.seen.add(recordId)) return true
    this.stats.deduped += 1
    this.onMetric({ type: 'deduped', recordId })
    return false
  }

  /**
   * 接收一条**已确认**的礼物事件。
   * @param {{recordId:string,userId:string,userName:string,avatar?:string,giftId:string,giftName:string,icon?:string,quantity:number,tier:1|2|3,asset?:string}} evt
   * @param {{preAdmitted?:boolean}} [opts] 调用方已经过 admit() 时传 true，避免重复计数
   * @returns {'accepted'|'deduped'|'merged'|'dropped'}
   */
  push(evt, { preAdmitted = false } = {}) {
    if (this.destroyed) return 'dropped'
    if (!evt || !evt.recordId) return 'dropped'

    // 1) 去重：同一 recordId 只认一次（本地回声 + 群广播重复都挡在这里）
    if (!preAdmitted && !this.admit(evt.recordId)) return 'deduped'
    this.stats.accepted += 1

    // 2) 连击合并：同人同礼物在窗口内，只累加数量
    const comboKey = `${evt.userId}:${evt.giftId}`
    const slot = this.combos.get(comboKey)
    if (slot && Date.now() - slot.lastAt < this.cfg.comboWindowMs) {
      slot.count += evt.quantity
      slot.lastAt = Date.now()
      this._cancel(slot.timer)
      slot.timer = this._later(() => this._closeCombo(comboKey), this.cfg.comboHoldMs)
      this.renderer.updateCombo(comboKey, slot.count)
      this.stats.merged += 1
      this.onMetric({ type: 'merged', comboKey, count: slot.count })
      // 连击期间 L3 不重复起大动画，只在首次或跨窗口时起
      return 'merged'
    }

    // 3) 入队
    this.queue.push({ ...evt, at: Date.now() })
    this._trimQueue()
    this._drain()
    return 'accepted'
  }

  /** 队列超限：优先丢低层级、最旧的，并累计成一条摘要 */
  _trimQueue() {
    if (this.queue.length <= this.cfg.queueLimit) return
    while (this.queue.length > this.cfg.queueLimit) {
      let idx = this.queue.findIndex((e) => e.tier === TIER.LIGHT)
      if (idx < 0) idx = 0
      this.queue.splice(idx, 1)
      this.dropped += 1
      this.stats.droppedByLimit += 1
    }
    this.renderer.showOverflow(this.dropped)
    this.onMetric({ type: 'overflow', dropped: this.dropped })
  }

  _drain() {
    if (this.destroyed || this.paused) return
    for (let i = 0; i < this.queue.length; ) {
      const evt = this.queue[i]
      if (evt.tier === TIER.PREMIUM) {
        if (this.premium || Date.now() < this.premiumReadyAt) {
          i += 1 // 大动画独占中，留在队列里等
          continue
        }
        this.queue.splice(i, 1)
        this._playPremium(evt)
        continue
      }
      if (evt.tier === TIER.COMBO) {
        if (this.combos.size >= this.cfg.comboLanes) {
          i += 1
          continue
        }
        this.queue.splice(i, 1)
        this._openCombo(evt)
        continue
      }
      // L1
      if (this.lightActive.size >= this.cfg.lightLanes) {
        i += 1
        continue
      }
      this.queue.splice(i, 1)
      this._playLight(evt)
    }
  }

  // ── L1 轻量：右下气泡，短促，不进公屏区域 ──
  _playLight(evt) {
    const id = evt.recordId
    this.renderer.showLight(evt)
    const timer = this._later(() => {
      this.lightActive.delete(id)
      this.renderer.hideLight(id)
      this._drain()
    }, this.cfg.lightHoldMs)
    this.lightActive.set(id, timer)
  }

  // ── L2 连击：一条可合并的横幅，数量滚动 ──
  _openCombo(evt) {
    const comboKey = `${evt.userId}:${evt.giftId}`
    const slot = { key: comboKey, evt, count: evt.quantity, lastAt: Date.now(), timer: null }
    slot.timer = this._later(() => this._closeCombo(comboKey), this.cfg.comboHoldMs)
    this.combos.set(comboKey, slot)
    this.renderer.showCombo(comboKey, evt, evt.quantity)
  }

  _closeCombo(comboKey) {
    const slot = this.combos.get(comboKey)
    if (!slot) return
    this._cancel(slot.timer)
    this.combos.delete(comboKey)
    this.renderer.hideCombo(comboKey)
    this._drain()
  }

  // ── L3 高价值：独占、有时长上限、可跳过、可降级 ──
  _playPremium(evt) {
    const ticket = { evt, startedAt: Date.now(), timer: null, handle: null, done: false }
    this.premium = ticket

    const finish = (reason) => {
      if (ticket.done) return
      ticket.done = true
      this._cancel(ticket.timer)
      try {
        this.renderer.destroyPremium(ticket.handle)
      } catch (_) {
        /* 释放失败不阻断后续播放 */
      }
      this.premium = null
      this.premiumReadyAt = Date.now() + this.cfg.premiumGapMs
      this.renderer.hidePremium(reason)
      this.onMetric({ type: 'premium-end', reason, ms: Date.now() - ticket.startedAt, gift: evt.giftName })
      this._drain()
    }
    ticket.finish = finish

    // 减少动态效果：直接走文字横幅，不加载素材
    if (this.reducedMotion) {
      this.stats.fallback += 1
      this.renderer.showPremiumFallback(evt, 'reduced-motion')
      ticket.timer = this._later(() => finish('fallback'), 1800)
      return
    }

    this.stats.premiumPlayed += 1
    // 无论素材多长、是否回调，硬上限到点强制收尾
    ticket.timer = this._later(() => finish('timeout'), this.cfg.premiumMaxMs)

    this.renderer
      .showPremium(evt, {
        onComplete: () => finish('complete'),
        onError: (err) => {
          this.stats.fallback += 1
          this.renderer.showPremiumFallback(evt, 'asset-error')
          this.onMetric({ type: 'asset-error', gift: evt.giftName, message: String(err && err.message ? err.message : err) })
          this._cancel(ticket.timer)
          ticket.timer = this._later(() => finish('fallback'), 1800)
        },
      })
      .then((handle) => {
        if (ticket.done) {
          // 已经收尾了才拿到实例：立刻释放，别泄漏
          try {
            this.renderer.destroyPremium(handle)
          } catch (_) {}
          return
        }
        ticket.handle = handle
      })
      .catch(() => {
        /* showPremium 内部已回调 onError */
      })
  }

  /** 用户点“跳过” */
  skipPremium(reason = 'user-skip') {
    if (!this.premium) return false
    if (reason === 'user-skip') this.stats.premiumSkipped += 1
    this.premium.finish(reason)
    return true
  }

  // ── 生命周期 ──

  /** 页面切到后台 */
  pause() {
    if (this.paused || this.destroyed) return
    this.paused = true
    this.hiddenSince = Date.now()
    if (this.premium && this.premium.handle) {
      try {
        this.renderer.pausePremium(this.premium.handle)
      } catch (_) {}
    }
  }

  /** 页面回到前台 */
  resume() {
    if (!this.paused || this.destroyed) return
    const hiddenMs = Date.now() - this.hiddenSince
    this.paused = false
    // 后台停留过久：当前大动画已无意义，收掉；队列里过期的大礼物也不补播
    if (this.premium) {
      if (hiddenMs > this.cfg.staleAfterMs) {
        this.premium.finish('stale')
      } else if (this.premium.handle) {
        try {
          this.renderer.resumePremium(this.premium.handle)
        } catch (_) {}
      }
    }
    if (hiddenMs > this.cfg.staleAfterMs) {
      const before = this.queue.length
      this.queue = this.queue.filter((e) => e.tier !== TIER.PREMIUM)
      const skipped = before - this.queue.length
      if (skipped > 0) this.onMetric({ type: 'stale-skip', skipped })
    }
    this._drain()
  }

  /** 切房：清空展示状态，但不动业务数据 */
  reset() {
    this.queue.length = 0
    this.dropped = 0
    this.seen.clear()
    for (const [key, slot] of this.combos) {
      this._cancel(slot.timer)
      this.renderer.hideCombo(key)
    }
    this.combos.clear()
    for (const [id, timer] of this.lightActive) {
      this._cancel(timer)
      this.renderer.hideLight(id)
    }
    this.lightActive.clear()
    if (this.premium) this.premium.finish('reset')
    this.premiumReadyAt = 0
    this.renderer.showOverflow(0)
  }

  /** 页面卸载 */
  destroy() {
    if (this.destroyed) return
    this.reset()
    this.destroyed = true
    for (const id of this.timers) clearTimeout(id)
    this.timers.clear()
    try {
      this.renderer.destroyAll()
    } catch (_) {}
  }

  snapshot() {
    return {
      ...this.stats,
      queued: this.queue.length,
      lightActive: this.lightActive.size,
      comboActive: this.combos.size,
      premiumActive: !!this.premium,
      paused: this.paused,
      timers: this.timers.size,
    }
  }
}
