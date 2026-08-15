import { onMounted, onUnmounted, ref } from 'vue'

interface SystemInfoWithSafeArea {
  statusBarHeight?: number
  screenWidth?: number
  screenHeight?: number
  safeArea?: { left?: number; right?: number; top?: number; bottom?: number }
  safeAreaInsets?: { left?: number; right?: number; top?: number; bottom?: number }
}

function readAppSafeArea() {
  try {
    const info = uni.getSystemInfoSync() as SystemInfoWithSafeArea
    const safeArea = info.safeArea || {}
    const insets = info.safeAreaInsets || {}
    return {
      safeTop: Math.max(0, info.statusBarHeight || 0, insets.top || 0, safeArea.top || 0),
      safeRight: Math.max(0, insets.right || 0, info.screenWidth && safeArea.right != null
        ? info.screenWidth - safeArea.right
        : 0),
      safeBottom: Math.max(0, insets.bottom || 0, info.screenHeight && safeArea.bottom != null
        ? info.screenHeight - safeArea.bottom
        : 0),
      safeLeft: Math.max(0, insets.left || 0, safeArea.left || 0),
    }
  } catch {
    return { safeTop: 0, safeRight: 0, safeBottom: 0, safeLeft: 0 }
  }
}

/** 沉浸式直播页面安全区状态；App 窗口旋转后自动刷新。 */
export function useAppSafeArea() {
  const initial = readAppSafeArea()
  const safeTop = ref(initial.safeTop)
  const safeRight = ref(initial.safeRight)
  const safeBottom = ref(initial.safeBottom)
  const safeLeft = ref(initial.safeLeft)

  function refreshSafeArea() {
    const current = readAppSafeArea()
    safeTop.value = current.safeTop
    safeRight.value = current.safeRight
    safeBottom.value = current.safeBottom
    safeLeft.value = current.safeLeft
  }

  // #ifdef APP-PLUS
  const handleResize = () => refreshSafeArea()
  // #endif

  onMounted(() => {
    refreshSafeArea()
    // #ifdef APP-PLUS
    uni.onWindowResize?.(handleResize)
    // #endif
  })

  // #ifdef APP-PLUS
  onUnmounted(() => uni.offWindowResize?.(handleResize))
  // #endif

  return { safeTop, safeRight, safeBottom, safeLeft }
}
