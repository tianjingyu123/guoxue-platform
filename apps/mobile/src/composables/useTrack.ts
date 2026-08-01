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
import { getToken } from '@/utils/storage'

const BASE_URL = (import.meta as any).env?.VITE_API_URL || ''
const PREFIX = '/api/v1'
const TRACK_TIMEOUT = 10000

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

/**
 * 埋点专用直传通道。
 * 不复用 utils/request：请求层本身会记录 api_error，若相互 import 会形成循环依赖；
 * 埋点是旁路能力，失败时无需刷新 token、重试或触发全局登录跳转。
 */
function postTrackBatch(events: TrackEvent[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const token = getToken()
    uni.request({
      url: `${BASE_URL}${PREFIX}/track/batch`,
      method: 'POST',
      data: { events },
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      timeout: TRACK_TIMEOUT,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve()
        else reject(new Error(`track request failed (${res.statusCode})`))
      },
      fail: reject,
    })
  })
}

async function flush() {
  if (flushing || !queue.length) return
  flushing = true
  const batch = queue.splice(0, queue.length)
  try {
    await postTrackBatch(batch)
  } catch {
    // 端点未就绪/网络异常：静默丢弃，埋点永不阻塞或报错给用户
  } finally {
    flushing = false
    // flush 期间可能又有新事件入队，确保尾批不会因并发窗口永久滞留。
    if (queue.length) scheduleFlush()
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
