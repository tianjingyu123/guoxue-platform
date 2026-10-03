/**
 * 八字合盘·本地排盘记录（uni.storage，最近 50 条）
 * 存合盘输入（HepanParams），结果页排盘成功后写入，入口页历史卡展示（点击重看）。
 * 去重键忽略双方姓名：结果页改名后可原位覆盖同参记录。
 */
import { createHistory, type HistoryItem } from '@/lib/paipan/history-core'

export interface HepanPersonParams {
  name: string
  gender: '男' | '女'
  year: number
  month: number
  day: number
  hour: number
  minute: number
  city?: string
}

export interface HepanParams {
  /** 场景 key：marriage / business / parent / friend */
  scene: string
  a: HepanPersonParams
  b: HepanPersonParams
}

export interface HepanRecord {
  params: HepanParams
  /** 盘面摘要，如「上上之配 · 88分」 */
  summary: string
}

export type HepanHistoryItem = HistoryItem<HepanRecord>

const KEY = 'rebu:hepan-records'
const LEGACY_KEY = 'rebu:hepan-history'

/** 去重键（沿用原规则） */
function dedupeKey(p: HepanParams): string {
  return JSON.stringify({
    scene: p.scene,
    a: { ...p.a, name: '' },
    b: { ...p.b, name: '' },
  })
}

const store = createHistory<HepanRecord>(KEY, {
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
        if (r?.params) store.save({ params: r.params, summary: r.summary ?? '' } as HepanRecord)
      }
    }
    uni.removeStorageSync(LEGACY_KEY)
  } catch {
    /* 迁移失败不阻断 */
  }
}

export function loadHepanHistory(): HepanHistoryItem[] {
  migrateLegacy()
  return store.load()
}

/** 写入一条记录（签名与旧版一致，调用方无需改） */
export function saveHepanHistory(params: HepanParams, summary: string) {
  store.save({ params, summary } as HepanRecord)
}

export const removeHepanHistory = store.remove
export const pinHepanHistory = store.togglePin
export const clearHepanHistory = store.clear

export function formatPersonTime(p: HepanPersonParams): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${p.year}-${pad(p.month)}-${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)}`
}
