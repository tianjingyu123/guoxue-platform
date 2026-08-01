/**
 * 紫微斗数·本地排盘记录
 * 走统一底座 lib/paipan/history-core（带 id/pinned，支持删单条/置顶，V0 排盘记录页依赖）。
 * 老 key「rebu:ziwei-history」存的是裸数组（无 id），底座 load 时会自动补 id 回写，故沿用同一 key。
 */
import { createHistory, type HistoryItem } from '@/lib/paipan/history-core'

export interface ZiweiParams {
  name: string
  gender: '男' | '女'
  y: number
  m: number
  d: number
  /** 时辰代表钟点：早子=0 丑=2 … 亥=22 晚子=23；真太阳时模式下为精确小时 */
  hour: number
  /** 精确分钟（真太阳时模式），默认 0 */
  minute?: number
  /** 出生城市（真太阳时模式） */
  city?: string
  /** 出生地东经（真太阳时模式） */
  lng?: number
  /** 是否启用真太阳时 */
  useTrueSolar?: boolean
}

export type ZiweiHistoryItem = HistoryItem<ZiweiParams>

const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

/** 钟点 → 时辰文本（0 点显示早子时、23 点显示晚子时） */
export function shichenLabel(hour: number): string {
  if (hour === 23) return '晚子时'
  if (hour === 0) return '早子时'
  return `${ZHI[Math.floor(((hour + 1) % 24) / 2)]}时`
}

const store = createHistory<ZiweiParams>('rebu:ziwei-history', {
  max: 50,
  sameAs: (a, b) =>
    a.name === b.name && a.gender === b.gender && a.y === b.y && a.m === b.m && a.d === b.d && a.hour === b.hour,
})

export const loadZiweiHistory = store.load
export const saveZiweiHistory = store.save
export const removeZiweiHistory = store.remove
export const pinZiweiHistory = store.togglePin
export const clearZiweiHistory = store.clear
