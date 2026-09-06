/**
 * 梅花易数·本地排盘记录
 *
 * 原先 index/result 各自裸操作 uni.storage（JSON 字符串数组，无 id、不能删单条、不能置顶），
 * 现按核验账号隔离存储；无归属老 key 保留，不自动迁移或删除。
 */
import type { HistoryItem } from '@/lib/paipan/history-core'
import { createPrivateHistory as createHistory } from '@/lib/paipan/private-history'

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

const store = createHistory<MeihuaParams>(KEY, {
  max: 100,
  sameAs: (a, b) => a.matter === b.matter && a.dateText === b.dateText && a.guaText === b.guaText,
})

/** 无归属旧记录保留原样，不自动读入当前账号。 */
export function loadMeihuaHistory(): MeihuaHistoryItem[] {
  return store.load()
}
export const saveMeihuaHistory = store.save
export const removeMeihuaHistory = store.remove
export const pinMeihuaHistory = store.togglePin
export const clearMeihuaHistory = store.clear
