/**
 * 立极尺·本地记录
 * 原先 index/result 各自裸操作 uni.storage（JSON 字符串、无 id、不能删单条），现收敛到统一底座；
 * 无归属旧格式保留，不自动迁入当前账号。
 */
import { type HistoryItem } from '@/lib/paipan/history-core'
import { createPrivateHistory } from '@/lib/paipan/private-history'

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

const store = createPrivateHistory<LijichiParams>(KEY, {
  max: 50,
  sameAs: (a, b) => a.client === b.client && a.sitting === b.sitting && a.dateText === b.dateText,
})

export function loadLijichiHistory(): LijichiHistoryItem[] {
  return store.load()
}
export const saveLijichiHistory = store.save
export const removeLijichiHistory = store.remove
export const pinLijichiHistory = store.togglePin
export const clearLijichiHistory = store.clear
