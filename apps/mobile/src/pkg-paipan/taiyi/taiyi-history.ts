/**
 * 太乙神数·本地排盘记录（uni.storage，最近 50 条）
 * 存起课输入（TaiyiParams），结果页起课成功后写入，入口页历史卡展示（点击重看）。
 */

export type TaiyiPanShi = 'year' | 'month' | 'day' | 'hour'
export type TaiyiSuanFa = 'tongzong' | 'zhijin' | 'jinjing'

export interface TaiyiParams {
  /** 所占事项（选填，≤30 字） */
  topic: string
  year: number
  month: number
  day: number
  hour: number
  minute: number
  panShi: TaiyiPanShi
  suanFa: TaiyiSuanFa
}

export interface TaiyiHistoryItem {
  params: TaiyiParams
  /** 课式摘要，如「阴遁36局 · 太乙六宫」 */
  summary: string
  ts: number
}

const HISTORY_KEY = 'rebu:taiyi-history'
const MAX_ITEMS = 50

export const PAN_SHI_LABELS: Record<TaiyiPanShi, string> = {
  year: '年太乙',
  month: '月太乙',
  day: '日太乙',
  hour: '时太乙',
}

export const SUAN_FA_LABELS: Record<TaiyiSuanFa, string> = {
  tongzong: '统宗',
  zhijin: '指津',
  jinjing: '金镜',
}

export function loadTaiyiHistory(): TaiyiHistoryItem[] {
  try {
    const raw = uni.getStorageSync(HISTORY_KEY)
    return raw ? (JSON.parse(raw) as TaiyiHistoryItem[]) : []
  } catch {
    return []
  }
}

/** 写入一条记录（同参去重置顶，截断 50 条；存储失败不阻断排盘） */
export function saveTaiyiHistory(params: TaiyiParams, summary: string) {
  try {
    const key = JSON.stringify(params)
    const list = loadTaiyiHistory().filter((it) => JSON.stringify(it.params) !== key)
    list.unshift({ params, summary, ts: Date.now() })
    uni.setStorageSync(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_ITEMS)))
  } catch {
    /* 本地存储失败不阻断排盘 */
  }
}

export function clearTaiyiHistory() {
  try {
    uni.setStorageSync(HISTORY_KEY, '[]')
  } catch {
    /* noop */
  }
}

export function formatParamsTime(p: TaiyiParams): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${p.year}年${p.month}月${p.day}日 ${pad(p.hour)}时${pad(p.minute)}分`
}
