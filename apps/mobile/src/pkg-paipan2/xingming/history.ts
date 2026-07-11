/**
 * 姓名解析 · 本地历史（key: rebu:xingming-history · 上限 50 · 同名同生辰去重置顶）
 * V0 history 页砍成入口页内嵌卡。
 */

export interface XingmingHistoryRecord {
  id: number
  name: string
  gender: '男' | '女'
  /** 出生时间 "YYYY-MM-DD HH:mm" */
  birth: string
  city?: string
  district?: string
  score: number
  dateText: string
}

const KEY = 'rebu:xingming-history'
const LIMIT = 50

export function loadXingmingHistory(): XingmingHistoryRecord[] {
  try {
    const raw = uni.getStorageSync(KEY) as string
    const list = raw ? (JSON.parse(raw) as XingmingHistoryRecord[]) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function saveXingmingHistory(rec: Omit<XingmingHistoryRecord, 'id' | 'dateText'>): void {
  try {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const full: XingmingHistoryRecord = {
      ...rec,
      id: Date.now(),
      dateText: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`,
    }
    const next = [
      full,
      ...loadXingmingHistory().filter((x) => !(x.name === rec.name && x.gender === rec.gender && x.birth === rec.birth)),
    ].slice(0, LIMIT)
    uni.setStorageSync(KEY, JSON.stringify(next))
  } catch {
    /* 存储异常忽略（非关键路径） */
  }
}

export function clearXingmingHistory(): void {
  try {
    uni.setStorageSync(KEY, '[]')
  } catch {
    /* 忽略 */
  }
}
