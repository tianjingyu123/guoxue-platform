/**
 * 六爻·本地排盘记录（uni.storage，最近 50 条）
 * 存起卦输入（LiuyaoParams），结果页装卦成功后写入，入口页历史卡展示（点击重看）。
 * 去重键忽略事项名：结果页改名后可原位覆盖同参记录。
 */
import type { QiguaMethodKey } from '@/pkg-paipan2/lib/liuyao-data'

export interface LiuyaoParams {
  /** 所占事项（选填，≤30 字） */
  matter: string
  methodKey: QiguaMethodKey
  year: number
  month: number
  day: number
  hour: number
  minute: number
  /** 摇卦/自动起卦的六次掷值，如 "7,8,9,6,7,8"（自下而上） */
  coins?: string
  /** 数字起卦输入 */
  numberInput?: string
  /** 卦名起卦的上下卦 */
  guaPick?: { benUp: string; benDown: string; bianUp: string; bianDown: string }
}

export interface LiuyaoHistoryItem {
  params: LiuyaoParams
  /** 盘面摘要，如「乾为天 → 天风姤 · 二爻动」 */
  summary: string
  ts: number
}

const HISTORY_KEY = 'rebu:liuyao-history'
const MAX_ITEMS = 50

/** 去重键：同参不同事项名视为同一盘（改名覆盖） */
function dedupeKey(p: LiuyaoParams): string {
  return JSON.stringify({ ...p, matter: '' })
}

export function loadLiuyaoHistory(): LiuyaoHistoryItem[] {
  try {
    const raw = uni.getStorageSync(HISTORY_KEY)
    return raw ? (JSON.parse(raw) as LiuyaoHistoryItem[]) : []
  } catch {
    return []
  }
}

/** 写入一条记录（同参去重置顶，截断 50 条；存储失败不阻断排盘） */
export function saveLiuyaoHistory(params: LiuyaoParams, summary: string) {
  try {
    const key = dedupeKey(params)
    const list = loadLiuyaoHistory().filter((it) => dedupeKey(it.params) !== key)
    list.unshift({ params, summary, ts: Date.now() })
    uni.setStorageSync(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_ITEMS)))
  } catch {
    /* 本地存储失败不阻断排盘 */
  }
}

export function clearLiuyaoHistory() {
  try {
    uni.setStorageSync(HISTORY_KEY, '[]')
  } catch {
    /* noop */
  }
}

export function formatParamsTime(p: LiuyaoParams): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${p.year}年${p.month}月${p.day}日 ${pad(p.hour)}时${pad(p.minute)}分`
}
