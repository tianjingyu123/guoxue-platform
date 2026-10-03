/**
 * 排盘记录 · 通用本地存储底座（uni.storage）
 *
 * 15 个工具原先各写一份 load/save/clear，都只有「读全部 / 追加 / 清空」三招，
 * 没有 id、没有置顶、不能删单条——撑不起 V0 的记录页（搜索 + 置顶 + 批量管理）。
 * 这里收敛为一份带 id/pinned/group 的底座，各工具的 history 模块只声明自己的字段与去重规则。
 *
 * 兼容：老记录没有 id/pinned，load 时按 ts 补 id 并回写，不丢用户已有数据。
 */

export interface HistoryMeta {
  /** 稳定主键（批量选择/删除/置顶依赖它） */
  id: string
  /** 写入时刻 */
  ts: number
  /** 置顶（V0 记录页的置顶分组） */
  pinned?: boolean
  /** 分组（八字/奇门/阳盘的分组标签） */
  group?: string
}

export type HistoryItem<T> = T & HistoryMeta

export interface HistoryStore<T> {
  /** 读全部：置顶在前，其次按写入时间倒序 */
  load(): HistoryItem<T>[]
  /** 写入一条（按 sameAs 去重后置顶插入，超出 max 截断；置顶记录不参与截断淘汰） */
  save(item: T): HistoryItem<T>
  /** 删除指定 id */
  remove(ids: string[]): void
  /** 切换置顶（每条各自取反） */
  togglePin(ids: string[]): void
  /** 设置分组 */
  setGroup(ids: string[], group: string): void
  /** 清空 */
  clear(): void
}

let seq = 0
function newId(): string {
  seq = (seq + 1) % 1000
  return `${Date.now().toString(36)}${seq.toString(36).padStart(2, '0')}`
}

function readRaw(key: string): any[] {
  try {
    const v = uni.getStorageSync(key)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

function writeRaw(key: string, list: any[]): void {
  try {
    uni.setStorageSync(key, list)
  } catch {
    // 存储写失败不阻断排盘主流程
  }
}

/** 置顶优先，其次按时间倒序 */
function sortRecords<T>(list: HistoryItem<T>[]): HistoryItem<T>[] {
  return [...list].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1
    return b.ts - a.ts
  })
}

export function createHistory<T extends object>(
  key: string,
  opts: {
    /** 上限（默认 50）；置顶记录不计入淘汰 */
    max?: number
    /** 同参判定（命中则视为同一条，覆盖旧记录并置顶） */
    sameAs?: (a: T, b: T) => boolean
  } = {},
): HistoryStore<T> {
  const max = opts.max ?? 50

  function loadAll(): HistoryItem<T>[] {
    const raw = readRaw(key)
    let patched = false
    const list = raw.map((r: any) => {
      if (!r.id) {
        patched = true
        return { ...r, id: newId(), ts: typeof r.ts === 'number' ? r.ts : Date.now() }
      }
      return r
    }) as HistoryItem<T>[]
    if (patched) writeRaw(key, list) // 老记录补 id 后回写，保证后续操作有稳定主键
    return list
  }

  return {
    load() {
      return sortRecords(loadAll())
    },

    save(item: T) {
      const list = loadAll()
      const kept = opts.sameAs ? list.filter((h) => !opts.sameAs!(h as unknown as T, item)) : list
      const rec = { ...item, id: newId(), ts: Date.now() } as HistoryItem<T>
      kept.unshift(rec)
      // 淘汰只砍未置顶的尾巴：用户置顶的记录不该被新排盘挤掉
      const pinned = kept.filter((h) => h.pinned)
      const normal = kept.filter((h) => !h.pinned)
      writeRaw(key, [...pinned, ...normal.slice(0, Math.max(0, max - pinned.length))])
      return rec
    },

    remove(ids: string[]) {
      const set = new Set(ids)
      writeRaw(key, loadAll().filter((h) => !set.has(h.id)))
    },

    togglePin(ids: string[]) {
      const set = new Set(ids)
      writeRaw(key, loadAll().map((h) => (set.has(h.id) ? { ...h, pinned: !h.pinned } : h)))
    },

    setGroup(ids: string[], group: string) {
      const set = new Set(ids)
      writeRaw(key, loadAll().map((h) => (set.has(h.id) ? { ...h, group } : h)))
    },

    clear() {
      try {
        uni.removeStorageSync(key)
      } catch {
        // 忽略
      }
    },
  }
}

/* ══════════ 分组名（八字/奇门/阳盘的分组标签，可增删改） ══════════ */

export interface GroupNameStore {
  /** 读分组名（首项恒为「全部」） */
  load(): string[]
  /** 覆盖写入（调用方保证首项为「全部」） */
  save(list: string[]): void
}

/**
 * 分组名存储。原分组页是写死的 4 个分组 + 内存改名（退出即失效、条数还是假的）。
 * 注意：记录里的 group 存的是分组「名字」，故改名/删除分组时必须同步迁移记录
 *（见 components/paipan/history-groups.vue）。
 */
export function createGroupNames(key: string, defaults: string[]): GroupNameStore {
  return {
    load() {
      try {
        const v = uni.getStorageSync(key)
        const list = Array.isArray(v) && v.length ? (v as string[]) : defaults
        return list[0] === '全部' ? list : ['全部', ...list.filter((g) => g !== '全部')]
      } catch {
        return defaults
      }
    },
    save(list: string[]) {
      try {
        uni.setStorageSync(key, ['全部', ...list.filter((g) => g !== '全部')])
      } catch {
        // 忽略
      }
    },
  }
}

/** 记录时间显示：今天/昨天显示时分，本年显示月日，跨年显示年月日 */
export function formatRecordTime(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return `今天 ${pad(d.getHours())}:${pad(d.getMinutes())}`
  const y = new Date(now.getTime() - 86400000)
  if (d.toDateString() === y.toDateString()) return `昨天 ${pad(d.getHours())}:${pad(d.getMinutes())}`
  if (d.getFullYear() === now.getFullYear()) return `${pad(d.getMonth() + 1)}月${pad(d.getDate())}日`
  return `${d.getFullYear()}年${pad(d.getMonth() + 1)}月${pad(d.getDate())}日`
}
