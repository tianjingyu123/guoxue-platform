/**
 * 大六壬排盘记录（本地存储）
 * 存起课输入（DaliurenParams），上限 50 条；结果页起课成功后写入，入口页历史卡展示。
 */

export interface DaliurenParams {
  matter: string
  year: number
  month: number
  day: number
  hour: number
  minute: number
  birthYear: number
  gender: '男' | '女'
  jiangMethod: 'zhongqi' | 'jiaojie'
  guirenMethod: 'standard' | 'alt'
  guishenType: 'auto' | 'day' | 'night'
  shehaiType: 'mengzhongji' | 'shenqian'
}

export interface DaliurenHistoryItem {
  params: DaliurenParams
  /** 课式摘要，如「丁丑日 未将午时」 */
  summary: string
  ts: number
}

const HISTORY_KEY = 'rebu:daliuren-history'
const MAX_ITEMS = 50

export function loadDaliurenHistory(): DaliurenHistoryItem[] {
  try {
    const raw = uni.getStorageSync(HISTORY_KEY)
    return raw ? (JSON.parse(raw) as DaliurenHistoryItem[]) : []
  } catch {
    return []
  }
}

export function saveDaliurenHistory(params: DaliurenParams, summary: string) {
  try {
    const key = JSON.stringify(params)
    const list = loadDaliurenHistory().filter((it) => JSON.stringify(it.params) !== key)
    list.unshift({ params, summary, ts: Date.now() })
    uni.setStorageSync(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_ITEMS)))
  } catch {
    /* 本地存储失败不阻断排盘 */
  }
}

export function clearDaliurenHistory() {
  try {
    uni.setStorageSync(HISTORY_KEY, '[]')
  } catch {
    /* noop */
  }
}

export function formatParamsTime(p: DaliurenParams): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${p.year}年${p.month}月${p.day}日 ${pad(p.hour)}时${pad(p.minute)}分`
}
