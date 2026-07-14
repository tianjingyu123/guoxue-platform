/**
 * 周易起名 · 本地存储（历史 + 收藏）
 * 历史：走统一底座 lib/paipan/history-core（带 id/pinned，支持删单条/置顶，V0 起名记录页依赖）；
 *       老 key「rebu:qiming-history」的 JSON 字符串记录首次读取时自动迁入新 key。
 * 收藏 key: rebu:qiming-favorites（上限 50 · 按全名去重）——结果页星标/详批收藏共用
 */
import { createHistory, type HistoryItem } from '@/lib/paipan/history-core'

export interface QimingParams {
  surname: string
  gender: '男' | '女'
  nameType: 'double' | 'single'
  style: string
  /** 出生时间 "YYYY-MM-DD HH:mm" */
  birth: string
  city?: string
  district?: string
  fixChar?: string
  fixPosition?: 'middle' | 'last'
  blockChars?: string
  dateText: string
}

export type QimingHistoryRecord = HistoryItem<QimingParams>

export interface QimingFavorite {
  /** 全名（姓+名） */
  name: string
  gender: '男' | '女'
  score: number
  subScores?: { yin: number; xing: number; yi: number; li: number }
  dateText: string
}

const HISTORY_KEY = 'rebu:qiming-records'
const LEGACY_HISTORY_KEY = 'rebu:qiming-history'
const FAVORITES_KEY = 'rebu:qiming-favorites'
const LIMIT = 50

function nowText(): string {
  const n = new Date()
  const pad = (x: number) => String(x).padStart(2, '0')
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())} ${pad(n.getHours())}:${pad(n.getMinutes())}`
}

function loadList<T>(key: string): T[] {
  try {
    const raw = uni.getStorageSync(key) as string
    const list = raw ? (JSON.parse(raw) as T[]) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function saveList<T>(key: string, list: T[]): void {
  try {
    uni.setStorageSync(key, JSON.stringify(list.slice(0, LIMIT)))
  } catch {
    /* 存储异常忽略（非关键路径） */
  }
}

/* ── 起名历史（统一底座） ── */

const historyStore = createHistory<QimingParams>(HISTORY_KEY, {
  max: LIMIT,
  sameAs: (a, b) =>
    a.surname === b.surname && a.gender === b.gender && a.nameType === b.nameType &&
    a.style === b.style && a.birth === b.birth && (a.fixChar ?? '') === (b.fixChar ?? '') &&
    (a.blockChars ?? '') === (b.blockChars ?? ''),
})

/** 老格式（JSON 字符串、数字 id）一次性迁入新库 */
function migrateLegacyHistory(): void {
  try {
    const raw = uni.getStorageSync(LEGACY_HISTORY_KEY)
    if (!raw) return
    const old = (typeof raw === 'string' ? JSON.parse(raw) : raw) as any[]
    if (Array.isArray(old)) {
      for (const r of [...old].reverse()) {
        const { id: _id, ...rest } = r || {}
        historyStore.save(rest as QimingParams)
      }
    }
    uni.removeStorageSync(LEGACY_HISTORY_KEY)
  } catch {
    /* 迁移失败不阻断 */
  }
}

export function loadQimingHistory(): QimingHistoryRecord[] {
  migrateLegacyHistory()
  return historyStore.load()
}

export function saveQimingHistory(rec: Omit<QimingParams, 'dateText'>): void {
  historyStore.save({ ...rec, dateText: nowText() } as QimingParams)
}

export const removeQimingHistory = historyStore.remove
export const pinQimingHistory = historyStore.togglePin
export const clearQimingHistory = historyStore.clear

/* ── 名字收藏 ── */

export function loadQimingFavorites(): QimingFavorite[] {
  return loadList<QimingFavorite>(FAVORITES_KEY)
}

export function isQimingFavorite(name: string): boolean {
  return loadQimingFavorites().some((x) => x.name === name)
}

/** 切换收藏；返回切换后是否已收藏 */
export function toggleQimingFavorite(fav: Omit<QimingFavorite, 'dateText'>): boolean {
  const list = loadQimingFavorites()
  const exists = list.some((x) => x.name === fav.name)
  if (exists) {
    saveList(FAVORITES_KEY, list.filter((x) => x.name !== fav.name))
    return false
  }
  saveList(FAVORITES_KEY, [{ ...fav, dateText: nowText() }, ...list])
  return true
}
