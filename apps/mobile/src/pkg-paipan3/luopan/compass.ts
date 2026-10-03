/**
 * 电子罗盘·多端指南针适配层（自 V0 app/luopan/page.tsx 传感器逻辑抽取改造）
 *
 * 各端实现：
 * - 小程序/App：uni.onCompassChange + startCompass/stopCompass（部分平台注册回调即自动 start，故 startCompass 做防御包裹）
 * - H5：deviceorientationabsolute / deviceorientation 双监听，iOS Safari 优先 webkitCompassHeading（真北顺时针），
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
  let gotReading = false
  let lastEmit = 0
  let fallbackTimer: ReturnType<typeof setTimeout> | null = null

  const emit = (deg: number) => {
    if (!Number.isFinite(deg)) return
    if (!gotReading) {
      gotReading = true
      clearFallback()
      opts.onStatus('active')
    }
    const now = Date.now()
    if (now - lastEmit < interval) return
    lastEmit = now
    opts.onHeading(((deg % 360) + 360) % 360)
  }

  /** 3 秒收不到任何读数 → 判定不可用（监听保留，之后来了读数仍会自动转 active） */
  const armFallback = () => {
    clearFallback()
    fallbackTimer = setTimeout(() => {
      if (!gotReading) opts.onStatus('unavailable')
    }, 3000)
  }
  const clearFallback = () => {
    if (fallbackTimer) {
      clearTimeout(fallbackTimer)
      fallbackTimer = null
    }
  }

  // ─── H5：DeviceOrientation ───
  // #ifdef H5
  let h5Attached = false
  let h5Granted = false
  /** 读数来源优先级：webkitCompassHeading（iOS 真北）> absolute alpha > 相对 alpha */
  let h5Source: 'webkit' | 'absolute' | 'relative' | null = null

  const h5Handler = (e: DeviceOrientationEvent) => {
    const wk = (e as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading
    if (typeof wk === 'number' && Number.isFinite(wk)) {
      h5Source = 'webkit'
      emit(wk)
      return
    }
    if (h5Source === 'webkit' || e.alpha == null) return
    const isAbs = e.type === 'deviceorientationabsolute' || e.absolute === true
    if (isAbs) {
      h5Source = 'absolute'
    } else if (h5Source === 'absolute') {
      return // 已有绝对方位来源，忽略相对读数，避免两个事件互相打架
    } else {
      h5Source = 'relative'
    }
    // alpha 为逆时针，转换为顺时针方位角
    emit((360 - e.alpha) % 360)
  }

  const h5Attach = () => {
    if (h5Attached) return
    h5Attached = true
    window.addEventListener('deviceorientationabsolute', h5Handler as EventListener)
    window.addEventListener('deviceorientation', h5Handler as EventListener)
    armFallback()
  }
  const h5Detach = () => {
    if (!h5Attached) return
    h5Attached = false
    window.removeEventListener('deviceorientationabsolute', h5Handler as EventListener)
    window.removeEventListener('deviceorientation', h5Handler as EventListener)
  }
  // #endif

  // ─── 小程序 / App：uni compass ───
  // #ifdef MP-WEIXIN || APP-PLUS
  const mpHandler = (res: { direction: number }) => {
    if (res && typeof res.direction === 'number') emit(res.direction)
  }
  // #endif

  const start = () => {
    if (running) return
    running = true
    gotReading = false

    // #ifdef H5
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
    uni.onCompassChange(mpHandler)
    try {
      // 部分平台 onCompassChange 已自动 start，这里显式 start 做兜底
      uni.startCompass({
        fail: () => {
          if (!gotReading) opts.onStatus('unavailable')
        },
      })
    } catch {
      // 防御：个别运行时 startCompass 缺失/抛错，仍等 onCompassChange 回调
    }
    armFallback()
    // #endif
  }

  const requestPermission = async () => {
    // #ifdef H5
    const DOE = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>
    }
    try {
      if (typeof DOE?.requestPermission === 'function') {
        const res = await DOE.requestPermission()
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
      opts.onStatus('unavailable')
    }
    // #endif
  }

  const stop = () => {
    if (!running) return
    running = false
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
      u.offCompassChange?.(mpHandler)
    } catch {
      // App 端个别版本不支持 off，忽略
    }
    try {
      u.stopCompass?.({})
    } catch {
      // 防御
    }
    // #endif
  }

  return { start, stop, requestPermission }
}
