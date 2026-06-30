/**
 * 全平台统一数据埋点（行为追踪）。
 * 千人千面推荐与运营分析的基础。统一格式、异步批量上报、端点未就绪时静默降级（不阻塞体验）。
 *
 * 用法：
 *   import { track } from '@/composables/useTrack'
 *   track.pageView('/mall/home')
 *   track.click('product_card', { productId: 123 })
 *   track.purchase({ orderId, amount })
 *   track.search('八字')
 *   track.share('course', courseId)
 */
import { apiPost } from '@/utils/request'

interface TrackEvent {
  action: string
  payload?: Record<string, any>
  /** 页面路径 */
  path?: string
  /** 毫秒时间戳 */
  ts: number
}

const queue: TrackEvent[] = []
let flushing = false
let timer: ReturnType<typeof setTimeout> | null = null

function currentPath(): string {
  try {
    const pages = getCurrentPages()
    const cur = pages[pages.length - 1] as any
    return cur?.route ? `/${cur.route}` : ''
  } catch {
    return ''
  }
}

function scheduleFlush() {
  if (timer) return
  timer = setTimeout(() => {
    timer = null
    void flush()
  }, 3000)
}

async function flush() {
  if (flushing || !queue.length) return
  flushing = true
  const batch = queue.splice(0, queue.length)
  try {
    await apiPost('/track/batch', { events: batch })
  } catch {
    // 端点未就绪/网络异常：静默丢弃，埋点永不阻塞或报错给用户
  } finally {
    flushing = false
  }
}

function enqueue(action: string, payload?: Record<string, any>) {
  queue.push({ action, payload, path: currentPath(), ts: Date.now() })
  if (queue.length >= 20) void flush()
  else scheduleFlush()
}

export const track = {
  pageView: (path?: string) => enqueue('page_view', { path: path ?? currentPath() }),
  click: (target: string, extra?: Record<string, any>) => enqueue('click', { target, ...extra }),
  purchase: (extra: Record<string, any>) => enqueue('purchase', extra),
  search: (keyword: string, extra?: Record<string, any>) => enqueue('search', { keyword, ...extra }),
  share: (type: string, id: string | number, extra?: Record<string, any>) =>
    enqueue('share', { type, id, ...extra }),
  custom: enqueue,
  /** 退出/切后台时主动 flush */
  flushNow: flush,
}

export function useTrack() {
  return track
}
