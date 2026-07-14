/**
 * 立极尺·本地记录
 * 原先 index/result 各自裸操作 uni.storage（JSON 字符串、无 id、不能删单条），现收敛到统一底座；
 * 老 key「rebu:lijichi-history」的旧格式（JSON 字符串）首次读取时自动迁移。
 */
import { createHistory, type HistoryItem } from '@/lib/paipan/history-core'

export interface LijichiParams {
  /** 客户/项目名 */
  client: string
  dateText: string
  /** 坐山朝向文案（子山午向） */
  shanxiang: string
  /** 坐山度数 */
  sitting: number
  heading?: number
  plate?: string
  note?: string
}

export type LijichiHistoryItem = HistoryItem<LijichiParams>

const KEY = 'rebu:lijichi-records'
const LEGACY_KEY = 'rebu:lijichi-history'

const store = createHistory<LijichiParams>(KEY, {
  max: 50,
  sameAs: (a, b) => a.client === b.client && a.sitting === b.sitting && a.dateText === b.dateText,
})

function migrateLegacy(): void {
  try {
    const raw = uni.getStorageSync(LEGACY_KEY)
    if (!raw) return
    const old = (typeof raw === 'string' ? JSON.parse(raw) : raw) as any[]
    if (Array.isArray(old)) {
      for (const r of [...old].reverse()) {
        store.save({
          client: r?.client ?? '未命名',
          dateText: r?.dateText ?? '',
          shanxiang: r?.shanxiang ?? '',
          sitting: Number(r?.sitting) || 0,
          heading: typeof r?.heading === 'number' ? r.heading : undefined,
          plate: r?.plate,
          note: r?.note,
        })
      }
    }
    uni.removeStorageSync(LEGACY_KEY)
  } catch {
    // 迁移失败不阻断
  }
}

export function loadLijichiHistory(): LijichiHistoryItem[] {
  migrateLegacy()
  return store.load()
}
export const saveLijichiHistory = store.save
export const removeLijichiHistory = store.remove
export const pinLijichiHistory = store.togglePin
export const clearLijichiHistory = store.clear
