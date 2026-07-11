/**
 * 玄空飞星·本地排盘记录（uni.storage，最近 50 条）
 * 存排盘输入（XuankongParams），结果页排盘成功后写入，入口页历史卡展示（点击重看）。
 * 去重键忽略客户名称：结果页改名后可原位覆盖同参记录。
 */

export interface XuankongParams {
  /** 客户名称（选填，≤20 字） */
  customer: string
  year: number
  month: number
  day: number
  hour: number
  minute: number
  /** 大运 1-9 */
  period: number
  /** 坐山索引（MOUNTAINS 0-23） */
  sitting: number
  /** 水口索引（MOUNTAINS 0-23） */
  shuikou: number
  /** 是否替卦（false=下卦） */
  ti: boolean
}

export interface XuankongHistoryItem {
  params: XuankongParams
  /** 盘面摘要，如「八运 癸山丁向 下卦 · 旺山旺向」 */
  summary: string
  ts: number
}

const HISTORY_KEY = 'rebu:xuankong-history'
const MAX_ITEMS = 50

/** 去重键：同参不同客户名视为同一盘（改名覆盖） */
function dedupeKey(p: XuankongParams): string {
  return JSON.stringify({ ...p, customer: '' })
}

export function loadXuankongHistory(): XuankongHistoryItem[] {
  try {
    const raw = uni.getStorageSync(HISTORY_KEY)
    return raw ? (JSON.parse(raw) as XuankongHistoryItem[]) : []
  } catch {
    return []
  }
}

/** 写入一条记录（同参去重置顶，截断 50 条；存储失败不阻断排盘） */
export function saveXuankongHistory(params: XuankongParams, summary: string) {
  try {
    const key = dedupeKey(params)
    const list = loadXuankongHistory().filter((it) => dedupeKey(it.params) !== key)
    list.unshift({ params, summary, ts: Date.now() })
    uni.setStorageSync(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_ITEMS)))
  } catch {
    /* 本地存储失败不阻断排盘 */
  }
}

export function clearXuankongHistory() {
  try {
    uni.setStorageSync(HISTORY_KEY, '[]')
  } catch {
    /* noop */
  }
}

export function formatParamsTime(p: XuankongParams): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${p.year}年${p.month}月${p.day}日 ${pad(p.hour)}时${pad(p.minute)}分`
}
