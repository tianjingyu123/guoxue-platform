/**
 * 阴盘奇门排盘记录（本地存储）
 * 存排盘输入（YinpanParams），上限 50 条；结果页排盘成功后写入，入口页历史卡展示。
 */

export interface YinpanParams {
  matter: string
  year: number
  month: number
  day: number
  hour: number
  minute: number
  panType: 'year' | 'hour' | 'ke'
  /** 自定义局数（如「阳遁3局」；空=自动拆补定局） */
  customJu: string
  trueSolar: boolean
  lat: number
  lng: number
}

export interface YinpanHistoryItem {
  params: YinpanParams
  /** 盘面摘要，如「时盘·阴遁3局」 */
  summary: string
  ts: number
}

const HISTORY_KEY = 'rebu:yinpan-history'
const MAX_ITEMS = 50

export function loadYinpanHistory(): YinpanHistoryItem[] {
  try {
    const raw = uni.getStorageSync(HISTORY_KEY)
    return raw ? (JSON.parse(raw) as YinpanHistoryItem[]) : []
  } catch {
    return []
  }
}

export function saveYinpanHistory(params: YinpanParams, summary: string) {
  try {
    const key = JSON.stringify(params)
    const list = loadYinpanHistory().filter((it) => JSON.stringify(it.params) !== key)
    list.unshift({ params, summary, ts: Date.now() })
    uni.setStorageSync(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_ITEMS)))
  } catch {
    /* 本地存储失败不阻断排盘 */
  }
}

export function clearYinpanHistory() {
  try {
    uni.setStorageSync(HISTORY_KEY, '[]')
  } catch {
    /* noop */
  }
}

export function formatParamsTime(p: YinpanParams): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${p.year}年${p.month}月${p.day}日 ${pad(p.hour)}时${pad(p.minute)}分`
}
