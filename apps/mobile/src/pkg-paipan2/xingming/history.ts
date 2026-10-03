/**
 * 姓名解析 · 本地历史
 * 走统一底座 lib/paipan/history-core（带 id/pinned，支持删单条/置顶，V0 解析记录页依赖）；
 * 老 key「rebu:xingming-history」的 JSON 字符串记录首次读取时自动迁入新 key。
 */
import { createHistory, type HistoryItem } from '@/lib/paipan/history-core'

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
const LEGACY_KEY = 'rebu:xingming-history'
const LIMIT = 50

const store = createHistory<XingmingParams>(KEY, {
  max: LIMIT,
  sameAs: (a, b) => a.name === b.name && a.gender === b.gender && a.birth === b.birth,
})

function nowText(): string {
  const n = new Date()
  const pad = (x: number) => String(x).padStart(2, '0')
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())} ${pad(n.getHours())}:${pad(n.getMinutes())}`
}

/** 老格式（JSON 字符串、数字 id）一次性迁入新库 */
function migrateLegacy(): void {
  try {
    const raw = uni.getStorageSync(LEGACY_KEY)
    if (!raw) return
    const old = (typeof raw === 'string' ? JSON.parse(raw) : raw) as any[]
    if (Array.isArray(old)) {
      for (const r of [...old].reverse()) {
        const { id: _id, ...rest } = r || {}
        store.save(rest as XingmingParams)
      }
    }
    uni.removeStorageSync(LEGACY_KEY)
  } catch {
    /* 迁移失败不阻断 */
  }
}

export function loadXingmingHistory(): XingmingHistoryRecord[] {
  migrateLegacy()
  return store.load()
}

export function saveXingmingHistory(rec: Omit<XingmingParams, 'dateText'>): void {
  store.save({ ...rec, dateText: nowText() } as XingmingParams)
}

export const removeXingmingHistory = store.remove
export const pinXingmingHistory = store.togglePin
export const clearXingmingHistory = store.clear
