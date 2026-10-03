/**
 * 玄空飞星·本地排盘记录（uni.storage，最近 50 条）
 * 存排盘输入（XuankongParams），结果页排盘成功后写入，入口页历史卡展示（点击重看）。
 * 去重键忽略客户名称：结果页改名后可原位覆盖同参记录。
 */
import { createHistory, type HistoryItem } from '@/lib/paipan/history-core'

export interface XuankongParams {
  /** 客户名称（选填，≤20 字） */
  customer: string
  year: number
  month: number
  day: number
  hour: number
  minute: number
  /** 大运 1-9 */
  period: number
  /** 坐山索引（MOUNTAINS 0-23） */
  sitting: number
  /** 水口索引（MOUNTAINS 0-23） */
  shuikou: number
  /** 是否替卦（false=下卦） */
  ti: boolean
}

export interface XuankongRecord {
  params: XuankongParams
  /** 盘面摘要，如「八运 癸山丁向 下卦 · 旺山旺向」 */
  summary: string
}

export type XuankongHistoryItem = HistoryItem<XuankongRecord>

const KEY = 'rebu:xuankong-records'
const LEGACY_KEY = 'rebu:xuankong-history'

/** 去重键（沿用原规则） */
function dedupeKey(p: XuankongParams): string {
  return JSON.stringify({ ...p, customer: '' })
}

const store = createHistory<XuankongRecord>(KEY, {
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
        if (r?.params) store.save({ params: r.params, summary: r.summary ?? '' } as XuankongRecord)
      }
    }
    uni.removeStorageSync(LEGACY_KEY)
  } catch {
    /* 迁移失败不阻断 */
  }
}

export function loadXuankongHistory(): XuankongHistoryItem[] {
  migrateLegacy()
  return store.load()
}

/** 写入一条记录（签名与旧版一致，调用方无需改） */
export function saveXuankongHistory(params: XuankongParams, summary: string) {
  store.save({ params, summary } as XuankongRecord)
}

export const removeXuankongHistory = store.remove
export const pinXuankongHistory = store.togglePin
export const clearXuankongHistory = store.clear

export function formatParamsTime(p: XuankongParams): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${p.year}年${p.month}月${p.day}日 ${pad(p.hour)}时${pad(p.minute)}分`
}
