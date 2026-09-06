/** 全部输入/输出均为逻辑像素；窗口原点与设备安全区不能重复扣减。 */
export function legacyWebviewLayout(info: {
  windowHeight?: number; windowTop?: number; statusBarHeight?: number;
  safeAreaInsets?: { top?: number };
}): { top: string; height: string } | null {
  const height = info.windowHeight
  const origin = info.windowTop ?? 0
  const status = info.statusBarHeight ?? 0
  const safeTop = info.safeAreaInsets?.top ?? 0
  if (![height, origin, status, safeTop].every(value => typeof value === 'number' && Number.isFinite(value) && value >= 0)) return null
  const top = Math.max(0, status, safeTop) - Math.min(Math.max(0, status, safeTop), origin)
  if (height! <= top) return null
  // 显式高度使原生容器和网页视口使用同一尺寸；不再由 top/bottom 推导两次。
  return { top: `${top}px`, height: `${height! - top}px` }
}
