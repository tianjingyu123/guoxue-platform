/**
 * 小六壬·本地起课记录（原页取舍里明写「历史记录本批不还原」，此处补齐 V0 的记录页）
 */
import { createHistory, type HistoryItem } from '@/lib/paipan/history-core'

export interface XiaoliurenParams {
  /** 所占之事 */
  matter: string
  year: number
  month: number
  day: number
  hour: number
  minute: number
  /** 流派：daojia / jiangshi / jiangshi2 */
  school: string
  /** 起课方式：time / number */
  qikeMode: string
  /** 报数起课的数字串 */
  numbers?: string
  /** 落宫结果（速喜/留连…），记录卡直接展示 */
  palace?: string
}

export type XiaoliurenHistoryItem = HistoryItem<XiaoliurenParams>

const store = createHistory<XiaoliurenParams>('rebu:xiaoliuren-history', {
  max: 50,
  sameAs: (a, b) =>
    a.matter === b.matter && a.year === b.year && a.month === b.month && a.day === b.day &&
    a.hour === b.hour && a.minute === b.minute && a.school === b.school &&
    a.qikeMode === b.qikeMode && (a.numbers ?? '') === (b.numbers ?? ''),
})

export const loadXiaoliurenHistory = store.load
export const saveXiaoliurenHistory = store.save
export const removeXiaoliurenHistory = store.remove
export const pinXiaoliurenHistory = store.togglePin
export const clearXiaoliurenHistory = store.clear
