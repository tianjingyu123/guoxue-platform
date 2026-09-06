/**
 * 阴盘命理奇门排盘记录（本地存储）
 * 存排盘输入（MingliParams），上限 50 条；结果页排盘成功后写入，入口页历史卡展示。
 */

import { nativeHistoryKey } from '@/lib/paipan/native-history-scope'

export interface MingliParams {
  name: string
  gender: 'male' | 'female'
  year: number
  month: number
  day: number
  hour: number
  minute: number
  /** 自定义局数（如「阳遁3局」；空=数理自动定局） */
  customJu: string
  trueSolar: boolean
  earlyZi: boolean
  lat: number
  lng: number
}

export interface MingliHistoryItem {
  params: MingliParams
  /** 盘面摘要，如「阳遁6局」 */
  summary: string
  ts: number
}

const HISTORY_KEY = 'rebu:yinpan-mingli-history'
const MAX_ITEMS = 50

export function loadMingliHistory(): MingliHistoryItem[] {
  const storageKey = nativeHistoryKey(HISTORY_KEY)
  if (!storageKey) return []
  try {
    const raw = uni.getStorageSync(storageKey)
    const list = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(list) ? list.filter(item => item?.params && typeof item.params === 'object') : []
  } catch {
    return []
  }
}

export function saveMingliHistory(params: MingliParams, summary: string) {
  const storageKey = nativeHistoryKey(HISTORY_KEY)
  if (!storageKey) throw new Error('请重新确认排盘访问状态')
  try {
    const key = JSON.stringify(params)
    const list = loadMingliHistory().filter((it) => JSON.stringify(it.params) !== key)
    list.unshift({ params, summary, ts: Date.now() })
    uni.setStorageSync(storageKey, JSON.stringify(list.slice(0, MAX_ITEMS)))
  } catch {
    /* 本地存储失败不阻断排盘 */
  }
}

export function clearMingliHistory() {
  const storageKey = nativeHistoryKey(HISTORY_KEY)
  if (!storageKey) throw new Error('请重新确认排盘访问状态')
  try {
    uni.setStorageSync(storageKey, '[]')
  } catch {
    /* noop */
  }
}

export function formatParamsTime(p: MingliParams): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${p.year}年${p.month}月${p.day}日 ${pad(p.hour)}时${pad(p.minute)}分`
}
