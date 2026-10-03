/** 页面可见时串行刷新；隐藏后的迟到响应必须通过 isCurrent 校验后才能写入页面。 */
export function createVisiblePoller(
  task: (isCurrent: () => boolean) => Promise<void>,
  interval: () => number,
) {
  let active = false
  let disposed = false
  let running = false
  let pending = false
  let generation = 0
  let timer: ReturnType<typeof setTimeout> | undefined

  function clearTimer() {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
  }

  function capture() {
    const currentGeneration = generation
    return () => active && !disposed && currentGeneration === generation
  }

  async function run() {
    if (!active || disposed) return
    clearTimer()
    if (running) {
      pending = true
      return
    }
    running = true
    pending = false
    try {
      await task(capture())
    } catch {
      // 页面负责展示错误；单次失败仍保留下次刷新机会，避免未处理的 Promise 拒绝。
    } finally {
      running = false
      if (active && !disposed) {
        if (pending) void run()
        else timer = setTimeout(() => { void run() }, interval())
      }
    }
  }

  function stop() {
    active = false
    pending = false
    generation++
    clearTimer()
  }

  return {
    start() {
      if (active || disposed) return
      active = true
      generation++
      void run()
    },
    refresh() { void run() },
    stop,
    dispose() { stop(); disposed = true },
    capture,
    isActive: () => active && !disposed,
  }
}
