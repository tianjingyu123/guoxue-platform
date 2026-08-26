import { onMounted, onUnmounted, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'

interface SystemInfoWithSafeArea {
  statusBarHeight?: number
  screenWidth?: number
  screenHeight?: number
  windowWidth?: number
  windowHeight?: number
  safeArea?: { left?: number; right?: number; top?: number; bottom?: number }
  safeAreaInsets?: { left?: number; right?: number; top?: number; bottom?: number }
}

function readNativeStatusBarHeight() {
  // #ifdef APP-PLUS
  const navigator = (globalThis as typeof globalThis & {
    plus?: { navigator?: { getStatusbarHeight?: () => number } }
  }).plus?.navigator
  const height = Number(navigator?.getStatusbarHeight?.() || 0)
  if (Number.isFinite(height) && height > 0) return height
  // #endif
  return 0
}

function readAppSafeArea() {
  try {
    const info = uni.getSystemInfoSync() as SystemInfoWithSafeArea
    const safeArea = info.safeArea || {}
    const insets = info.safeAreaInsets || {}
    const viewportWidth = info.windowWidth || info.screenWidth || 0
    const viewportHeight = info.windowHeight || info.screenHeight || 0
    return {
      safeTop: Math.max(0, info.statusBarHeight || 0, insets.top || 0, safeArea.top || 0, readNativeStatusBarHeight()),
      safeRight: Math.max(0, insets.right || 0, viewportWidth && safeArea.right != null
        ? viewportWidth - safeArea.right
        : 0),
      safeBottom: Math.max(0, insets.bottom || 0, viewportHeight && safeArea.bottom != null
        ? viewportHeight - safeArea.bottom
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
  onShow(refreshSafeArea)

  // #ifdef APP-PLUS
  onUnmounted(() => uni.offWindowResize?.(handleResize))
  // #endif

  return { safeTop, safeRight, safeBottom, safeLeft }
}
