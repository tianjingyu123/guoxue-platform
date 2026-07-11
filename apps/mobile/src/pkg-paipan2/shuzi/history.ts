/**
 * 数字能量解读测算历史（本地存储 key: rebu:shuzi-history · 上限 50 条）
 * 入口页弹层展示 / 解读成功后写入（同类型同数字去重置顶）。沿用诸葛神数历史范式。
 */
import type { InputKind } from '@/pkg-paipan2/lib/shuzi-data'

export interface ShuziHistoryRecord {
  id: number
  kind: InputKind
  kindLabel: string
  /** 原始输入（车牌含字母） */
  raw: string
  /** 提取后的数字串 */
  digits: string
  dateText: string
}

const KEY = 'rebu:shuzi-history'
const LIMIT = 50

export function loadShuziHistory(): ShuziHistoryRecord[] {
  try {
    const raw = uni.getStorageSync(KEY) as string
    const list = raw ? (JSON.parse(raw) as ShuziHistoryRecord[]) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function saveShuziHistory(rec: Omit<ShuziHistoryRecord, 'id' | 'dateText'>): void {
  try {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const full: ShuziHistoryRecord = {
      ...rec,
      id: Date.now(),
      dateText: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`,
    }
    const next = [
      full,
      ...loadShuziHistory().filter((x) => !(x.kind === rec.kind && x.digits === rec.digits)),
    ].slice(0, LIMIT)
    uni.setStorageSync(KEY, JSON.stringify(next))
  } catch {
    /* 存储异常忽略（历史非关键路径） */
  }
}

export function clearShuziHistory(): void {
  try {
    uni.setStorageSync(KEY, '[]')
  } catch {
    /* 忽略 */
  }
}
