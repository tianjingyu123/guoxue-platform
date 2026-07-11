/**
 * 诸葛神数测算历史（本地存储 key: rebu:zhuge-history · 上限 50 条）
 * 入口页弹层展示 / 结果页起卦成功后写入（同一输入去重置顶）。
 */
export interface ZhugeHistoryRecord {
  id: number
  /** 所测三字 */
  input: string
  signNumber: number
  luck: string
  dateText: string
}

const KEY = 'rebu:zhuge-history'
const LIMIT = 50

export function loadZhugeHistory(): ZhugeHistoryRecord[] {
  try {
    const raw = uni.getStorageSync(KEY) as string
    const list = raw ? (JSON.parse(raw) as ZhugeHistoryRecord[]) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function saveZhugeHistory(rec: Omit<ZhugeHistoryRecord, 'id' | 'dateText'>): void {
  try {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const full: ZhugeHistoryRecord = {
      ...rec,
      id: Date.now(),
      dateText: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`,
    }
    const next = [full, ...loadZhugeHistory().filter((x) => x.input !== rec.input)].slice(0, LIMIT)
    uni.setStorageSync(KEY, JSON.stringify(next))
  } catch {
    /* 存储异常忽略（历史非关键路径） */
  }
}

export function clearZhugeHistory(): void {
  try {
    uni.setStorageSync(KEY, '[]')
  } catch {
    /* 忽略 */
  }
}
