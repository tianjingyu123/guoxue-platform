/**
 * 阳盘奇门·本地排盘记录
 * 原 yangpan/history 页是硬编码假记录；现改为 result 页排盘成功后落盘的真实记录。
 */
import { createHistory, createGroupNames, type HistoryItem } from '@/lib/paipan/history-core'

export interface YangpanParams {
  name: string
  gender: string
  year: number
  month: number
  day: number
  hour: number
  /** 与 YangpanInput 对齐：分钟/流派选项可缺省 */
  minute?: number
  panMethod: string
  jigongMethod?: string
  startMethod?: string
  anganMethod?: string
  place?: string
  trueSolar?: boolean
  earlyLateZi?: boolean
  daylightSaving?: boolean
  /** 排盘摘要（记录卡展示） */
  juLabel?: string
  zhiFu?: string
  zhiShiMen?: string
}

export type YangpanHistoryItem = HistoryItem<YangpanParams>

const store = createHistory<YangpanParams>('rebu:yangpan-history', {
  max: 50,
  sameAs: (a, b) =>
    a.name === b.name && a.gender === b.gender && a.year === b.year && a.month === b.month &&
    a.day === b.day && a.hour === b.hour && a.minute === b.minute && a.panMethod === b.panMethod,
})

/** 记录存储本体（分组管理页需要 setGroup 做记录迁移） */
export const yangpanStore = store

/** 分组名（用户可增删改，落本地存储；记录里的 group 存的是名字） */
export const yangpanGroups = createGroupNames('rebu:yangpan-groups', ['全部', '家人', '朋友', '客户'])
/** 默认分组名（首次进入用） */
export const YANGPAN_GROUPS = ['全部', '家人', '朋友', '客户']

export const loadYangpanHistory = store.load
export const saveYangpanHistory = store.save
export const removeYangpanHistory = store.remove
export const pinYangpanHistory = store.togglePin
export const groupYangpanHistory = store.setGroup
export const clearYangpanHistory = store.clear
