/**
 * 周易起名 · 本地存储（历史 + 收藏）
 * 历史 key: rebu:qiming-history（上限 50 · 同参去重置顶）——V0 history 页砍成入口页内嵌卡
 * 收藏 key: rebu:qiming-favorites（上限 50 · 按全名去重）——结果页星标/详批收藏共用
 */

export interface QimingHistoryRecord {
  id: number
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

export interface QimingFavorite {
  /** 全名（姓+名） */
  name: string
  gender: '男' | '女'
  score: number
  subScores?: { yin: number; xing: number; yi: number; li: number }
  dateText: string
}

const HISTORY_KEY = 'rebu:qiming-history'
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

/* ── 起名历史 ── */

export function loadQimingHistory(): QimingHistoryRecord[] {
  return loadList<QimingHistoryRecord>(HISTORY_KEY)
}

export function saveQimingHistory(rec: Omit<QimingHistoryRecord, 'id' | 'dateText'>): void {
  const sameKey = (x: QimingHistoryRecord) =>
    x.surname === rec.surname && x.gender === rec.gender && x.nameType === rec.nameType &&
    x.style === rec.style && x.birth === rec.birth && (x.fixChar ?? '') === (rec.fixChar ?? '') &&
    (x.blockChars ?? '') === (rec.blockChars ?? '')
  const full: QimingHistoryRecord = { ...rec, id: Date.now(), dateText: nowText() }
  saveList(HISTORY_KEY, [full, ...loadQimingHistory().filter((x) => !sameKey(x))])
}

export function clearQimingHistory(): void {
  saveList(HISTORY_KEY, [])
}

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
