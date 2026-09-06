/**
 * 姓名解析 · 本地历史
 * 走统一底座 lib/paipan/history-core（带 id/pinned，支持删单条/置顶，V0 解析记录页依赖）；
 * 公共旧记录归属不明，保留原样，不自动归入当前账号。
 */
import type { HistoryItem } from '@/lib/paipan/history-core'
import { createPrivateHistory } from '@/lib/paipan/private-history'

export interface XingmingParams {
  name: string
  gender: '男' | '女'
  /** 出生时间 "YYYY-MM-DD HH:mm" */
  birth: string
  city?: string
  district?: string
  score: number
  dateText: string
}

export type XingmingHistoryRecord = HistoryItem<XingmingParams>

const KEY = 'rebu:xingming-records'
const LIMIT = 50

const store = createPrivateHistory<XingmingParams>(KEY, {
  max: LIMIT,
  sameAs: (a, b) => a.name === b.name && a.gender === b.gender && a.birth === b.birth,
})

function nowText(): string {
  const n = new Date()
  const pad = (x: number) => String(x).padStart(2, '0')
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())} ${pad(n.getHours())}:${pad(n.getMinutes())}`
}

export function loadXingmingHistory(): XingmingHistoryRecord[] {
  return store.load()
}

export function saveXingmingHistory(rec: Omit<XingmingParams, 'dateText'>): void {
  store.save({ ...rec, dateText: nowText() } as XingmingParams)
}

export const removeXingmingHistory = store.remove
export const pinXingmingHistory = store.togglePin
export const clearXingmingHistory = store.clear
