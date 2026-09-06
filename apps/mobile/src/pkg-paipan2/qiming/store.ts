/**
 * 周易起名 · 本地存储（历史 + 收藏）
 * 历史：走统一底座 lib/paipan/history-core（带 id/pinned，支持删单条/置顶，V0 起名记录页依赖）；
 *       公共旧记录保留原样，不自动认领到当前账号。
 * 收藏 key: rebu:qiming-favorites（上限 50 · 按全名去重）——结果页星标/详批收藏共用
 */
import type { HistoryItem } from '@/lib/paipan/history-core'
import { createPrivateHistory } from '@/lib/paipan/private-history'
import { nativeHistoryKey } from '@/lib/paipan/native-history-scope'

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
const FAVORITES_KEY = 'rebu:qiming-favorites'
const LIMIT = 50

function nowText(): string {
  const n = new Date()
  const pad = (x: number) => String(x).padStart(2, '0')
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())} ${pad(n.getHours())}:${pad(n.getMinutes())}`
}

function loadList<T>(key: string): T[] {
  const scoped = nativeHistoryKey(key)
  if (!scoped) return []
  try {
    const raw = uni.getStorageSync(scoped) as string
    const list = raw ? (JSON.parse(raw) as T[]) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function saveList<T>(key: string, list: T[]): void {
  const scoped = nativeHistoryKey(key)
  if (!scoped) throw new Error('账号无法确认')
  // 写入失败必须交给调用方处理，不能显示虚假的收藏成功。
  uni.setStorageSync(scoped, JSON.stringify(list.slice(0, LIMIT)))
}

/* ── 起名历史（统一底座） ── */

const historyStore = createPrivateHistory<QimingParams>(HISTORY_KEY, {
  max: LIMIT,
  sameAs: (a, b) =>
    a.surname === b.surname && a.gender === b.gender && a.nameType === b.nameType &&
    a.style === b.style && a.birth === b.birth && (a.fixChar ?? '') === (b.fixChar ?? '') &&
    (a.blockChars ?? '') === (b.blockChars ?? ''),
})

export function loadQimingHistory(): QimingHistoryRecord[] {
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
