/**
 * 奇门穿壬排盘记录（本地存储）
 * 存起课输入（ChuanrenParams），上限 50 条；结果页起课成功后写入，入口页内嵌历史卡展示。
 */

export interface ChuanrenParams {
  topic: string
  year: number
  month: number
  day: number
  hour: number
  minute: number
  /** 用神：day=日柱 month=月柱 custom=自选 */
  ys: 'day' | 'month' | 'custom'
  /** 自选用神干支（ys=custom 时） */
  cys?: string
  /** 贵人：auto=按昼夜 yang=阳贵(昼) yin=阴贵(夜) */
  gr: 'auto' | 'yang' | 'yin'
  /** 年命生肖（可选） */
  nm?: string
}

export interface ChuanrenHistoryItem {
  params: ChuanrenParams
  /** 盘面摘要，如「阴遁9局 · 午将申时」 */
  summary: string
  ts: number
}

const HISTORY_KEY = 'rebu:chuanren-history'
const MAX_ITEMS = 50

export function loadChuanrenHistory(): ChuanrenHistoryItem[] {
  try {
    const raw = uni.getStorageSync(HISTORY_KEY)
    return raw ? (JSON.parse(raw) as ChuanrenHistoryItem[]) : []
  } catch {
    return []
  }
}

export function saveChuanrenHistory(params: ChuanrenParams, summary: string) {
  try {
    const key = JSON.stringify(params)
    const list = loadChuanrenHistory().filter((it) => JSON.stringify(it.params) !== key)
    list.unshift({ params, summary, ts: Date.now() })
    uni.setStorageSync(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_ITEMS)))
  } catch {
    /* 本地存储失败不阻断排盘 */
  }
}

export function clearChuanrenHistory() {
  try {
    uni.setStorageSync(HISTORY_KEY, '[]')
  } catch {
    /* noop */
  }
}

export function formatChuanrenTime(p: ChuanrenParams): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${p.year}年${pad(p.month)}月${pad(p.day)}日 ${pad(p.hour)}:${pad(p.minute)}`
}
