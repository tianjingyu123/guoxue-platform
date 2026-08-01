/**
 * 阴盘奇门排盘记录（本地存储）
 * 存排盘输入（YinpanParams），上限 50 条；结果页排盘成功后写入，入口页历史卡展示。
 */
import { createHistory, type HistoryItem } from '@/lib/paipan/history-core'

export interface YinpanParams {
  matter: string
  year: number
  month: number
  day: number
  hour: number
  minute: number
  panType: 'year' | 'hour' | 'ke'
  /** 自定义局数（如「阳遁3局」；空=自动拆补定局） */
  customJu: string
  trueSolar: boolean
  lat: number
  lng: number
}

export interface YinpanRecord {
  params: YinpanParams
  /** 盘面摘要，如「时盘·阴遁3局」 */
  summary: string
}

export type YinpanHistoryItem = HistoryItem<YinpanRecord>

const KEY = 'rebu:yinpan-records'
const LEGACY_KEY = 'rebu:yinpan-history'

const store = createHistory<YinpanRecord>(KEY, {
  max: 50,
  sameAs: (a, b) => JSON.stringify(a.params) === JSON.stringify(b.params),
})

/** 老记录（JSON 字符串数组、无 id）一次性迁入新库 */
function migrateLegacy(): void {
  try {
    const raw = uni.getStorageSync(LEGACY_KEY)
    if (!raw) return
    const old = (typeof raw === 'string' ? JSON.parse(raw) : raw) as any[]
    if (Array.isArray(old)) {
      for (const r of [...old].reverse()) {
        if (r?.params) store.save({ params: r.params, summary: r.summary ?? '' } as YinpanRecord)
      }
    }
    uni.removeStorageSync(LEGACY_KEY)
  } catch {
    /* 迁移失败不阻断 */
  }
}

export function loadYinpanHistory(): YinpanHistoryItem[] {
  migrateLegacy()
  return store.load()
}

/** 写入一条记录（签名与旧版一致，调用方无需改） */
export function saveYinpanHistory(params: YinpanParams, summary: string) {
  store.save({ params, summary } as YinpanRecord)
}

export const removeYinpanHistory = store.remove
export const pinYinpanHistory = store.togglePin
export const clearYinpanHistory = store.clear

export function formatParamsTime(p: YinpanParams): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${p.year}年${p.month}月${p.day}日 ${pad(p.hour)}时${pad(p.minute)}分`
}
