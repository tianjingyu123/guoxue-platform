/**
 * 八宅排盘·本地排盘记录（uni.storage，最近 50 条）
 * 存排盘输入（BazhaiParams），结果页排盘成功后写入，入口页历史卡展示（点击重看）。
 * 去重键忽略客户名称：结果页改名后可原位覆盖同参记录。
 */
import { createHistory, type HistoryItem } from '@/lib/paipan/history-core'

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

export interface BazhaiRecord {
  params: BazhaiParams
  /** 盘面摘要，如「坎宅 壬山丙向 · 巽命」 */
  summary: string
}

export type BazhaiHistoryItem = HistoryItem<BazhaiRecord>

const KEY = 'rebu:bazhai-records'
const LEGACY_KEY = 'rebu:bazhai-history'

/** 去重键（沿用原规则） */
function dedupeKey(p: BazhaiParams): string {
  return JSON.stringify({ ...p, customer: '' })
}

const store = createHistory<BazhaiRecord>(KEY, {
  max: 50,
  sameAs: (a, b) => dedupeKey(a.params) === dedupeKey(b.params),
})

/** 老记录（JSON 字符串数组、无 id）一次性迁入新库 */
function migrateLegacy(): void {
  try {
    const raw = uni.getStorageSync(LEGACY_KEY)
    if (!raw) return
    const old = (typeof raw === 'string' ? JSON.parse(raw) : raw) as any[]
    if (Array.isArray(old)) {
      for (const r of [...old].reverse()) {
        if (r?.params) store.save({ params: r.params, summary: r.summary ?? '' } as BazhaiRecord)
      }
    }
    uni.removeStorageSync(LEGACY_KEY)
  } catch {
    /* 迁移失败不阻断 */
  }
}

export function loadBazhaiHistory(): BazhaiHistoryItem[] {
  migrateLegacy()
  return store.load()
}

/** 写入一条记录（签名与旧版一致，调用方无需改） */
export function saveBazhaiHistory(params: BazhaiParams, summary: string) {
  store.save({ params, summary } as BazhaiRecord)
}

export const removeBazhaiHistory = store.remove
export const pinBazhaiHistory = store.togglePin
export const clearBazhaiHistory = store.clear

export function formatHistoryTime(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}年${pad(d.getMonth() + 1)}月${pad(d.getDate())}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
