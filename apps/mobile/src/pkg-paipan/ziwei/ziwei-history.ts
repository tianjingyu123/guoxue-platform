/**
 * 紫微斗数·本地排盘记录（uni.storage，最近 20 条）
 * 仅供 ziwei 页面使用：index 读取展示回填 / result 计算成功后写入。
 */

export interface ZiweiHistoryItem {
  name: string
  gender: '男' | '女'
  y: number
  m: number
  d: number
  /** 时辰代表钟点：早子=0 丑=2 … 亥=22 晚子=23 */
  hour: number
  ts: number
}

const KEY = 'rebu:ziwei-history'
const MAX = 20

const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

/** 钟点 → 时辰文本（0 点显示早子时、23 点显示晚子时） */
export function shichenLabel(hour: number): string {
  if (hour === 23) return '晚子时'
  if (hour === 0) return '早子时'
  return `${ZHI[Math.floor(((hour + 1) % 24) / 2)]}时`
}

export function loadZiweiHistory(): ZiweiHistoryItem[] {
  try {
    const v = uni.getStorageSync(KEY)
    return Array.isArray(v) ? (v as ZiweiHistoryItem[]) : []
  } catch {
    return []
  }
}

/** 写入一条记录（同参去重置顶，截断 20 条） */
export function saveZiweiHistory(item: Omit<ZiweiHistoryItem, 'ts'>): void {
  const list = loadZiweiHistory().filter(
    (h) => !(h.name === item.name && h.gender === item.gender && h.y === item.y && h.m === item.m && h.d === item.d && h.hour === item.hour),
  )
  list.unshift({ ...item, ts: Date.now() })
  try {
    uni.setStorageSync(KEY, list.slice(0, MAX))
  } catch {
    // 存储失败不阻断排盘
  }
}

export function clearZiweiHistory(): void {
  try {
    uni.removeStorageSync(KEY)
  } catch {
    // 忽略
  }
}
