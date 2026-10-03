/**
 * 梅花易数·本地排盘记录
 *
 * 原先 index/result 各自裸操作 uni.storage（JSON 字符串数组，无 id、不能删单条、不能置顶），
 * 现收敛到统一底座；老 key「rebu:meihua:history」的记录首次读取时自动迁移过来，不丢。
 */
import { createHistory, type HistoryItem } from '@/lib/paipan/history-core'

export interface MeihuaParams {
  /** 所占之事 */
  matter: string
  /** 排盘时间文案（1983年6月18日 14:31） */
  dateText: string
  /** 本卦之变卦（乾为天 之 天风姤） */
  guaText: string
  /** 重新起盘所需的完整参数（原样透传给 result 页） */
  params: Record<string, unknown>
}

export type MeihuaHistoryItem = HistoryItem<MeihuaParams>

const KEY = 'rebu:meihua-history'
const LEGACY_KEY = 'rebu:meihua:history'

const store = createHistory<MeihuaParams>(KEY, {
  max: 100,
  sameAs: (a, b) => a.matter === b.matter && a.dateText === b.dateText && a.guaText === b.guaText,
})

/** 老记录（JSON 字符串数组）一次性迁入新库 */
function migrateLegacy(): void {
  try {
    const raw = uni.getStorageSync(LEGACY_KEY)
    if (!raw) return
    const old = (typeof raw === 'string' ? JSON.parse(raw) : raw) as any[]
    if (Array.isArray(old)) {
      // 倒序写入，保证 save 的「新的在前」后仍与原顺序一致
      for (const r of [...old].reverse()) {
        store.save({
          matter: r?.matter ?? '',
          dateText: r?.dateText ?? '',
          guaText: r?.guaText ?? '',
          params: r?.params ?? {},
        })
      }
    }
    uni.removeStorageSync(LEGACY_KEY)
  } catch {
    // 迁移失败不阻断
  }
}

export function loadMeihuaHistory(): MeihuaHistoryItem[] {
  migrateLegacy()
  return store.load()
}
export const saveMeihuaHistory = store.save
export const removeMeihuaHistory = store.remove
export const pinMeihuaHistory = store.togglePin
export const clearMeihuaHistory = store.clear
