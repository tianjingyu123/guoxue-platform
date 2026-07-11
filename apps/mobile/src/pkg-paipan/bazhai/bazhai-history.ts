/**
 * 八宅排盘·本地排盘记录（uni.storage，最近 50 条）
 * 存排盘输入（BazhaiParams），结果页排盘成功后写入，入口页历史卡展示（点击重看）。
 * 去重键忽略客户名称：结果页改名后可原位覆盖同参记录。
 */

export type BazhaiGender = 'male' | 'female'

export interface BazhaiParams {
  /** 客户名称（选填，≤20 字） */
  customer: string
  /** 坐山索引（MOUNTAINS 0-23） */
  sitting: number
  gender: BazhaiGender
  /** 出生年份（选填，0=未填） */
  birthYear: number
}

export interface BazhaiHistoryItem {
  params: BazhaiParams
  /** 盘面摘要，如「坎宅 壬山丙向 · 巽命」 */
  summary: string
  ts: number
}

const HISTORY_KEY = 'rebu:bazhai-history'
const MAX_ITEMS = 50

/** 去重键：同参不同客户名视为同一盘（改名覆盖） */
function dedupeKey(p: BazhaiParams): string {
  return JSON.stringify({ ...p, customer: '' })
}

export function loadBazhaiHistory(): BazhaiHistoryItem[] {
  try {
    const raw = uni.getStorageSync(HISTORY_KEY)
    return raw ? (JSON.parse(raw) as BazhaiHistoryItem[]) : []
  } catch {
    return []
  }
}

/** 写入一条记录（同参去重置顶，截断 50 条；存储失败不阻断排盘） */
export function saveBazhaiHistory(params: BazhaiParams, summary: string) {
  try {
    const key = dedupeKey(params)
    const list = loadBazhaiHistory().filter((it) => dedupeKey(it.params) !== key)
    list.unshift({ params, summary, ts: Date.now() })
    uni.setStorageSync(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_ITEMS)))
  } catch {
    /* 本地存储失败不阻断排盘 */
  }
}

export function clearBazhaiHistory() {
  try {
    uni.setStorageSync(HISTORY_KEY, '[]')
  } catch {
    /* noop */
  }
}

export function formatHistoryTime(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}年${pad(d.getMonth() + 1)}月${pad(d.getDate())}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
