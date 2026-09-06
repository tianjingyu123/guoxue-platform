/**
 * 共用电子罗盘·多端指南针适配层
 *
 * 各端实现：
 * - 小程序/App：uni.onCompassChange + startCompass/stopCompass（部分平台注册回调即自动 start，故 startCompass 做防御包裹）
 * - H5：deviceorientationabsolute / deviceorientation 双监听，iOS Safari 优先 webkitCompassHeading（北向方位角），
 *   iOS 13+ 必须在用户手势内调用 DeviceOrientationEvent.requestPermission()
 * - 均不可用/被拒 → status = unavailable，页面诚实降级为手动定向（不假装有指南针）
 *
 * 回调节流：默认 50ms（传感器高频回调，直接驱动大盘面旋转会掉帧）
 */

export type CompassStatus =
  /** 已启动，等待第一帧读数 */
  | 'starting'
  /** iOS H5 需要用户点击授权 */
  | 'need-permission'
  /** 正在持续收到读数 */
  | 'active'
  /** 无传感器 / 被拒授权 / 超时无读数 → 手动模式 */
  | 'unavailable'

export interface CompassOptions {
  /** 朝向读数（已归一化 0~360，正北 0° 顺时针） */
  onHeading: (deg: number) => void
  onStatus: (status: CompassStatus) => void
  /** 节流间隔 ms，默认 50 */
  throttle?: number
}

export interface CompassHandle {
  start: () => void
  stop: () => void
  /** iOS H5 授权入口（必须在点击事件内调用；其余端为空操作） */
  requestPermission: () => Promise<void>
}

export function createCompass(opts: CompassOptions): CompassHandle {
  const interval = opts.throttle ?? 50
  let running = false
  let generation = 0
  let gotReading = false
  let lastEmit = 0
  let fallbackTimer: ReturnType<typeof setTimeout> | null = null
  let fallbackRevision = 0

  const emit = (deg: number) => {
    if (!running || !Number.isFinite(deg) || deg < 0 || deg > 360) return
    if (!gotReading) {
      gotReading = true
      opts.onStatus('active')
    }
    armFallback()
    const now = Date.now()
    if (now - lastEmit < interval) return
    lastEmit = now
    opts.onHeading(((deg % 360) + 360) % 360)
  }

  /** 启动或最后有效读数后 3 秒无数据即失效；保留监听，恢复读数后重新 active。 */
  const armFallback = () => {
    clearFallback()
    const current = generation
    const revision = fallbackRevision
    fallbackTimer = setTimeout(() => {
      if (running && current === generation && revision === fallbackRevision) {
        fallbackTimer = null
        gotReading = false
        // #ifdef H5
        // 首选来源已断流，允许另一有效北向来源接管；相对旋转仍由入口拒绝。
        h5Source = null
        // #endif
        opts.onStatus('unavailable')
      }
    }, 3000)
  }
  const clearFallback = () => {
    fallbackRevision++
    if (fallbackTimer) {
      clearTimeout(fallbackTimer)
      fallbackTimer = null
    }
  }

  // ─── H5：DeviceOrientation ───
  // #ifdef H5
  let h5Attached = false
  let h5Granted = false
  /** 仅采信北向来源：webkitCompassHeading优先，其次绝对alpha；相对旋转不能作北向。 */
  let h5Source: 'webkit' | 'absolute' | null = null
  let h5Listener: EventListener | null = null

  const h5Handler = (e: DeviceOrientationEvent) => {
    const wk = (e as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading
    if (typeof wk === 'number' && Number.isFinite(wk) && wk >= 0 && wk < 360) {
      h5Source = 'webkit'
      emit(wk)
      return
    }
    if (h5Source === 'webkit' || e.alpha == null || !Number.isFinite(e.alpha) || e.alpha < 0 || e.alpha >= 360) return
    const isAbs = e.type === 'deviceorientationabsolute' || e.absolute === true
    if (!isAbs) return
    h5Source = 'absolute'
    // alpha 为逆时针，转换为顺时针方位角
    emit((360 - e.alpha) % 360)
  }

  const h5Attach = () => {
    if (h5Attached || !running) return
    h5Attached = true
    const current = generation
    h5Listener = ((event: DeviceOrientationEvent) => {
      if (running && current === generation) h5Handler(event)
    }) as EventListener
    window.addEventListener('deviceorientationabsolute', h5Listener)
    window.addEventListener('deviceorientation', h5Listener)
    armFallback()
  }
  const h5Detach = () => {
    if (!h5Attached) return
    h5Attached = false
    if (h5Listener) {
      window.removeEventListener('deviceorientationabsolute', h5Listener)
      window.removeEventListener('deviceorientation', h5Listener)
    }
    h5Listener = null
  }
  // #endif

  // ─── 小程序 / App：uni compass ───
  // #ifdef MP-WEIXIN || APP-PLUS
  let mpHandler: ((res: { direction: number }) => void) | null = null
  // #endif

  // #ifdef APP-PLUS
  let appOrientationWatchId: number | null = null
  // #endif

  const start = () => {
    if (running) return
    running = true
    const current = ++generation
    gotReading = false
    lastEmit = 0

    // #ifdef APP-HARMONY
    // 当前 uni-app Harmony 罗盘接口未支持，原生适配接入前不能永久显示正在感应。
    opts.onStatus('unavailable')
    // #endif

    // #ifdef H5
    h5Source = null
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
      opts.onStatus('unavailable')
      return
    }
    const DOE = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>
    }
    if (typeof DOE?.requestPermission === 'function' && !h5Granted) {
      // iOS 13+：权限请求必须由用户手势触发，等待页面「开启罗盘感应」按钮
      opts.onStatus('need-permission')
      return
    }
    opts.onStatus('starting')
    h5Attach()
    // #endif

    // #ifdef MP-WEIXIN || APP-PLUS
    opts.onStatus('starting')
    mpHandler = (res: { direction: number }) => {
      if (current === generation && res && typeof res.direction === 'number') emit(res.direction)
    }
    try {
      uni.onCompassChange(mpHandler)
    } catch {
      // uni 监听不可用时仍须继续启动 HTML5+ 备用来源。
    }
    try {
      // 部分平台 onCompassChange 已自动 start，这里显式 start 做兜底
      uni.startCompass({
        // App 端还会并行监听 HTML5+ Orientation；单一来源失败不能提前宣告不可用。
        fail: () => {},
      })
    } catch {
      // 防御：个别运行时 startCompass 缺失/抛错，仍等 onCompassChange 回调
    }
    armFallback()
    // #endif

    // #ifdef APP-PLUS
    try {
      const orientation = typeof plus === 'undefined' ? null : (plus as any).orientation
      if (orientation?.watchOrientation) {
        appOrientationWatchId = orientation.watchOrientation((reading: {
          magneticHeading?: number
          trueHeading?: number
        }) => {
          if (current !== generation) return
          // alpha 是相对初始方向的旋转角，不可作为指南针北向。只接受官方方位字段。
          const heading = [reading?.magneticHeading, reading?.trueHeading]
            .find((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 360)
          if (typeof heading === 'number') emit(heading)
        }, () => { /* 继续等待 uni 罗盘或统一超时 */ }, { frequency: interval })
      }
    } catch { /* 继续等待 uni 罗盘或统一超时 */ }
    // #endif
  }

  const requestPermission = async () => {
    // #ifdef H5
    if (!running) return
    const current = generation
    const DOE = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>
    }
    try {
      if (typeof DOE?.requestPermission === 'function') {
        const res = await DOE.requestPermission()
        if (!running || current !== generation) return
        if (res !== 'granted') {
          opts.onStatus('unavailable')
          return
        }
      }
      h5Granted = true
      opts.onStatus('starting')
      h5Attach()
    } catch {
      // 非 https / 非手势调用 / 用户拒绝 → 降级手动
      if (running && current === generation) opts.onStatus('unavailable')
    }
    // #endif
  }

  const stop = () => {
    if (!running) return
    running = false
    generation++
    clearFallback()

    // #ifdef H5
    h5Detach()
    // #endif

    // #ifdef MP-WEIXIN || APP-PLUS
    const u = uni as unknown as {
      offCompassChange?: (cb: (res: { direction: number }) => void) => void
      stopCompass?: (opts?: Record<string, unknown>) => void
    }
    try {
      if (mpHandler) u.offCompassChange?.(mpHandler)
    } catch {
      // App 端个别版本不支持 off，忽略
    }
    mpHandler = null
    try {
      u.stopCompass?.({})
    } catch {
      // 防御
    }
    // #endif

    // #ifdef APP-PLUS
    if (appOrientationWatchId !== null) {
      try { (plus as any).orientation?.clearWatch?.(appOrientationWatchId) } catch { /* 已停止时忽略 */ }
      appOrientationWatchId = null
    }
    // #endif
  }

  return { start, stop, requestPermission }
}
