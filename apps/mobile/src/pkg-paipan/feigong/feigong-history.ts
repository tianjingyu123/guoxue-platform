/**
 * 飞宫小奇门排盘记录（本地存储）
 * 存起局输入（FeigongParams），上限 50 条；结果页起局成功后写入，入口页内嵌历史卡展示。
 */

export interface FeigongParams {
  topic: string
  year: number
  month: number
  day: number
  hour: number
  minute: number
  /** 起局方式：hour=时辰 number=报数 random=随机 */
  m: 'hour' | 'number' | 'random'
  /** 报数/随机落定之数（random 在入口页提交时落定，保证重开一致） */
  n?: number
}

export interface FeigongHistoryItem {
  params: FeigongParams
  /** 盘面摘要，如「青龙落卯 · 时辰起局」 */
  summary: string
  ts: number
}

const HISTORY_KEY = 'rebu:feigong-history'
const MAX_ITEMS = 50

export function loadFeigongHistory(): FeigongHistoryItem[] {
  try {
    const raw = uni.getStorageSync(HISTORY_KEY)
    return raw ? (JSON.parse(raw) as FeigongHistoryItem[]) : []
  } catch {
    return []
  }
}

export function saveFeigongHistory(params: FeigongParams, summary: string) {
  try {
    const key = JSON.stringify(params)
    const list = loadFeigongHistory().filter((it) => JSON.stringify(it.params) !== key)
    list.unshift({ params, summary, ts: Date.now() })
    uni.setStorageSync(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_ITEMS)))
  } catch {
    /* 本地存储失败不阻断排盘 */
  }
}

export function clearFeigongHistory() {
  try {
    uni.setStorageSync(HISTORY_KEY, '[]')
  } catch {
    /* noop */
  }
}

export function formatFeigongTime(p: FeigongParams): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${p.year}年${pad(p.month)}月${pad(p.day)}日 ${pad(p.hour)}:${pad(p.minute)}`
}
