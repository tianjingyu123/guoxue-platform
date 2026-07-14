/**
 * 八字·本地排盘记录
 *
 * 原 bazi/history 页是硬编码的 6 条假记录（孙哥儿子/王雷…），八字排完根本不落盘。
 * 现改为真实记录：result 页排盘成功后写入，记录页只读本地存储，无记录即空态。
 */
import { createHistory, createGroupNames, type HistoryItem } from '@/lib/paipan/history-core'

export interface BaziParams {
  name: string
  gender: string
  year: number
  month: number
  day: number
  hour: number
  minute: number
  city?: string
  /** 四柱八字（写入时由排盘结果带上，记录卡直接展示，不必重算） */
  pillars?: {
    yearGan: string; yearZhi: string
    monthGan: string; monthZhi: string
    dayGan: string; dayZhi: string
    hourGan: string; hourZhi: string
  }
}

export type BaziHistoryItem = HistoryItem<BaziParams>

/** 同一个人同一时刻只留一条 */
const store = createHistory<BaziParams>('rebu:bazi-history', {
  max: 50,
  sameAs: (a, b) =>
    a.name === b.name && a.gender === b.gender &&
    a.year === b.year && a.month === b.month && a.day === b.day &&
    a.hour === b.hour && a.minute === b.minute,
})

/** 记录存储本体（分组管理页需要 setGroup 做记录迁移） */
export const baziStore = store

/** 分组名（用户可增删改，落本地存储；记录里的 group 存的是名字） */
export const baziGroups = createGroupNames('rebu:bazi-groups', ['全部', '家人', '朋友', '客户'])
/** 默认分组名（首次进入用） */
export const BAZI_GROUPS = ['全部', '家人', '朋友', '客户']

export const loadBaziHistory = store.load
export const saveBaziHistory = store.save
export const removeBaziHistory = store.remove
export const pinBaziHistory = store.togglePin
export const groupBaziHistory = store.setGroup
export const clearBaziHistory = store.clear
