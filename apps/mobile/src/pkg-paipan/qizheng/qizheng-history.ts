/**
 * 七政四余·本地排盘记录（uni.storage，最近 50 条）
 * 存排盘输入（QizhengParams），结果页排盘成功后写入，入口页历史卡展示（点击重看）。
 * 去重键忽略姓名：结果页改名后可原位覆盖同参记录。
 */

export interface QizhengParams {
  /** 姓名（选填，≤20 字） */
  name: string
  gender: '男' | '女'
  /** 注意：isLunar 为 true 时 year/month/day 是农历值，进引擎前必须转公历（见 result.vue） */
  year: number
  month: number
  day: number
  hour: number
  minute: number
  /** 输入的是否为农历日期（引擎入参为公历，结果页负责转换） */
  isLunar?: boolean
  /** 出生城市（用于真太阳时与命宫经纬度修正——七政盘以实测天象为准，地点会影响结果） */
  city: string
}

export interface QizhengHistoryItem {
  params: QizhengParams
  /** 盘面摘要，如「立命亥宫 室宿 · 恩金用木」 */
  summary: string
  ts: number
}

const HISTORY_KEY = 'rebu:qizheng-history'
const MAX_ITEMS = 50

/** 去重键：同生辰同地点不同姓名视为同一盘（改名覆盖） */
function dedupeKey(p: QizhengParams): string {
  return JSON.stringify({ ...p, name: '' })
}

export function loadQizhengHistory(): QizhengHistoryItem[] {
  try {
    const raw = uni.getStorageSync(HISTORY_KEY)
    return raw ? (JSON.parse(raw) as QizhengHistoryItem[]) : []
  } catch {
    return []
  }
}

/** 写入一条记录（同参去重置顶，截断 50 条；存储失败不阻断排盘） */
export function saveQizhengHistory(params: QizhengParams, summary: string) {
  try {
    const key = dedupeKey(params)
    const list = loadQizhengHistory().filter((it) => dedupeKey(it.params) !== key)
    list.unshift({ params, summary, ts: Date.now() })
    uni.setStorageSync(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_ITEMS)))
  } catch {
    /* 本地存储失败不阻断排盘 */
  }
}

export function clearQizhengHistory() {
  try {
    uni.setStorageSync(HISTORY_KEY, '[]')
  } catch {
    /* noop */
  }
}

export function formatParamsTime(p: QizhengParams): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${p.year}年${p.month}月${p.day}日 ${pad(p.hour)}时${pad(p.minute)}分`
}
