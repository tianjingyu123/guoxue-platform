import { onUnmounted } from 'vue'
import { onShow, onHide, onUnload } from '@dcloudio/uni-app'

/** 页面显示时立即同步；停留期间静默轮询，离开页面或切到后台时停止。 */
export function usePageRefresh(refresh: () => Promise<unknown>, intervalMs = 10000) {
  let visible = false
  let disposed = false
  let running = false
  let pending = false
  let timer: ReturnType<typeof setTimeout> | undefined
  const active = () => visible && !disposed && (typeof document === 'undefined' || !document.hidden)
  function clear() { if (timer !== undefined) clearTimeout(timer); timer = undefined }
  async function tick() {
    clear()
    if (!active()) return
    if (running) { pending = true; return }
    running = true
    try { await refresh() } catch { /* 轮询失败保留当前内容，下次继续同步 */ }
    finally {
      running = false
      if (active()) {
        if (pending) { pending = false; void tick() }
        else timer = setTimeout(() => { void tick() }, intervalMs)
      }
    }
  }
  function hide() { visible = false; pending = false; clear() }
  function visibilityChanged() { if (active()) void tick(); else clear() }
  function dispose() {
    disposed = true
    hide()
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', visibilityChanged)
  }
  onShow(() => { visible = true; void tick() })
  onHide(hide)
  onUnload(dispose)
  onUnmounted(dispose)
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', visibilityChanged)
}
