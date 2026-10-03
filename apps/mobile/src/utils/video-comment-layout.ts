/** 键盘覆盖与系统已缩小窗口两种模式只扣一次，标题/关闭留在安全区以内。 */
export function videoCommentLayout(windowHeight: number, baseHeight: number, keyboardHeight: number, safeTop: number) {
  const viewport = Math.max(0, Number.isFinite(windowHeight) ? windowHeight : 0)
  const base = Math.max(viewport, Number.isFinite(baseHeight) ? baseHeight : viewport)
  const keyboard = Math.max(0, Math.min(base, Number.isFinite(keyboardHeight) ? keyboardHeight : 0))
  const resized = Math.max(0, base - viewport)
  const bottom = Math.max(0, keyboard - resized)
  const top = Math.max(0, Number.isFinite(safeTop) ? safeTop : 0) + 8
  return { bottom, height: Math.max(0, Math.min(base * 0.68, viewport - top - bottom)) }
}
