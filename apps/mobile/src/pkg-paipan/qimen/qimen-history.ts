/**
 * 奇门遁甲·本地起局记录
 * 原 qimen/history 页是硬编码假记录；现改为 result 页起局成功后落盘的真实记录。
 */
import { createHistory, createGroupNames, type HistoryItem } from '@/lib/paipan/history-core'

export interface QimenParams {
  /** 所问之事 */
  matter: string
  year: number
  month: number
  day: number
  hour: number
  /** 以下与 QimenInput 对齐：分钟/流派选项在 Input 里可缺省，此处同为可选 */
  minute?: number
  panMethod: string
  flyMethod?: string
  startMethod?: string
  anganMethod?: string
  customJu?: string
  useTrueSolar?: boolean
  lat?: number
  lng?: number
  /** 起局摘要（阳遁三局 / 值符天心 / 值使开门），记录卡直接展示 */
  juLabel?: string
  zhiFu?: string
  zhiShiMen?: string
  jieQi?: string
}

export type QimenHistoryItem = HistoryItem<QimenParams>

const store = createHistory<QimenParams>('rebu:qimen-history', {
  max: 50,
  sameAs: (a, b) =>
    a.matter === b.matter && a.year === b.year && a.month === b.month &&
    a.day === b.day && a.hour === b.hour && a.minute === b.minute && a.panMethod === b.panMethod,
})

/** 记录存储本体（分组管理页需要 setGroup 做记录迁移） */
export const qimenStore = store

/** 分组名（用户可增删改，落本地存储；记录里的 group 存的是名字） */
export const qimenGroups = createGroupNames('rebu:qimen-groups', ['全部', '工作事业', '财运投资', '感情婚姻', '健康出行', '其他'])
/** 默认分组名（首次进入用） */
export const QIMEN_GROUPS = ['全部', '工作事业', '财运投资', '感情婚姻', '健康出行', '其他']

export const loadQimenHistory = store.load
export const saveQimenHistory = store.save
export const removeQimenHistory = store.remove
export const pinQimenHistory = store.togglePin
export const groupQimenHistory = store.setGroup
export const clearQimenHistory = store.clear
