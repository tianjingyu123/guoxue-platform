/**
 * 微信小程序右上角胶囊按钮占用的右侧宽度（px）。
 * 自定义导航栏以胶囊真实左边界避让，非小程序环境自然返回 0。
 */
export function getMiniProgramMenuSafeRight(gap = 8): number {
  try {
    const runtime = uni as typeof uni & {
      getMenuButtonBoundingClientRect?: () => { left?: number }
      getWindowInfo?: () => { windowWidth?: number; screenWidth?: number }
    }
    if (typeof runtime.getMenuButtonBoundingClientRect !== 'function') return 0
    const rect = runtime.getMenuButtonBoundingClientRect()
    const legacy = uni.getSystemInfoSync()
    const modern = typeof runtime.getWindowInfo === 'function' ? runtime.getWindowInfo() : undefined
    const viewportWidth = Number(modern?.windowWidth || modern?.screenWidth || legacy.windowWidth || legacy.screenWidth || 0)
    const capsuleLeft = Number(rect?.left || 0)
    if (!viewportWidth || !capsuleLeft || capsuleLeft >= viewportWidth) return 0
    return Math.ceil(viewportWidth - capsuleLeft + Math.max(0, gap))
  } catch {
    return 0
  }
}
