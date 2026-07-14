/**
 * 八字合盘·本地排盘记录（uni.storage，最近 50 条）
 * 存合盘输入（HepanParams），结果页排盘成功后写入，入口页历史卡展示（点击重看）。
 * 去重键忽略双方姓名：结果页改名后可原位覆盖同参记录。
 */

export interface HepanPersonParams {
  name: string
  gender: '男' | '女'
  year: number
  month: number
  day: number
  hour: number
  minute: number
  city?: string
}

export interface HepanParams {
  /** 场景 key：marriage / business / parent / friend */
  scene: string
  a: HepanPersonParams
  b: HepanPersonParams
}

export interface HepanHistoryItem {
  params: HepanParams
  /** 盘面摘要，如「上上之配 · 88分」 */
  summary: string
  ts: number
}

const HISTORY_KEY = 'rebu:hepan-history'
const MAX_ITEMS = 50

/** 去重键：同生辰不同姓名视为同一盘（改名覆盖） */
function dedupeKey(p: HepanParams): string {
  return JSON.stringify({
    scene: p.scene,
    a: { ...p.a, name: '' },
    b: { ...p.b, name: '' },
  })
}

export function loadHepanHistory(): HepanHistoryItem[] {
  try {
    const raw = uni.getStorageSync(HISTORY_KEY)
    return raw ? (JSON.parse(raw) as HepanHistoryItem[]) : []
  } catch {
    return []
  }
}

/** 写入一条记录（同参去重置顶，截断 50 条；存储失败不阻断排盘） */
export function saveHepanHistory(params: HepanParams, summary: string) {
  try {
    const key = dedupeKey(params)
    const list = loadHepanHistory().filter((it) => dedupeKey(it.params) !== key)
    list.unshift({ params, summary, ts: Date.now() })
    uni.setStorageSync(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_ITEMS)))
  } catch {
    /* 本地存储失败不阻断排盘 */
  }
}

export function clearHepanHistory() {
  try {
    uni.setStorageSync(HISTORY_KEY, '[]')
  } catch {
    /* noop */
  }
}

export function formatPersonTime(p: HepanPersonParams): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${p.year}-${pad(p.month)}-${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)}`
}
