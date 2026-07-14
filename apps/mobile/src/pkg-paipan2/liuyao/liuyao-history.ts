/**
 * 六爻·本地排盘记录（uni.storage，最近 50 条）
 * 存起卦输入（LiuyaoParams），结果页装卦成功后写入，入口页历史卡展示（点击重看）。
 * 去重键忽略事项名：结果页改名后可原位覆盖同参记录。
 */
import { createHistory, type HistoryItem } from '@/lib/paipan/history-core'
import type { QiguaMethodKey } from '@/pkg-paipan2/lib/liuyao-data'

export interface LiuyaoParams {
  /** 所占事项（选填，≤30 字） */
  matter: string
  methodKey: QiguaMethodKey
  year: number
  month: number
  day: number
  hour: number
  minute: number
  /** 摇卦/自动起卦的六次掷值，如 "7,8,9,6,7,8"（自下而上） */
  coins?: string
  /** 数字起卦输入 */
  numberInput?: string
  /** 卦名起卦的上下卦 */
  guaPick?: { benUp: string; benDown: string; bianUp: string; bianDown: string }
}

export interface LiuyaoRecord {
  params: LiuyaoParams
  /** 盘面摘要，如「乾为天 → 天风姤 · 二爻动」 */
  summary: string
}

export type LiuyaoHistoryItem = HistoryItem<LiuyaoRecord>

const KEY = 'rebu:liuyao-records'
const LEGACY_KEY = 'rebu:liuyao-history'

/** 去重键（沿用原规则） */
function dedupeKey(p: LiuyaoParams): string {
  return JSON.stringify({ ...p, matter: '' })
}

const store = createHistory<LiuyaoRecord>(KEY, {
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
        if (r?.params) store.save({ params: r.params, summary: r.summary ?? '' } as LiuyaoRecord)
      }
    }
    uni.removeStorageSync(LEGACY_KEY)
  } catch {
    /* 迁移失败不阻断 */
  }
}

export function loadLiuyaoHistory(): LiuyaoHistoryItem[] {
  migrateLegacy()
  return store.load()
}

/** 写入一条记录（签名与旧版一致，调用方无需改） */
export function saveLiuyaoHistory(params: LiuyaoParams, summary: string) {
  store.save({ params, summary } as LiuyaoRecord)
}

export const removeLiuyaoHistory = store.remove
export const pinLiuyaoHistory = store.togglePin
export const clearLiuyaoHistory = store.clear

export function formatParamsTime(p: LiuyaoParams): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${p.year}年${p.month}月${p.day}日 ${pad(p.hour)}时${pad(p.minute)}分`
}
