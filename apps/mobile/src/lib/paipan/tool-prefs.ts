// 排盘工具本地偏好：收藏（为你推荐）/ 自定义排序 / 使用频次
// 自 V0 lib/{tool-favorites,tool-order,tool-usage}.ts 还原，localStorage → uni.storage。
// 注：后续并入账号系统后，可替换为服务端账号级同步。

const FAV_KEY = 'rebu:tool-favorites'
const ORDER_KEY = 'rebu:tool-order'
const USAGE_KEY = 'rebu:tool-usage'

/** 默认常用工具（无收藏记录时的初始推荐，全部为已上线工具） */
export const defaultFavoriteToolIds = ['bazi', 'qimen', 'yangming', 'ziwei', 'meihua', 'compass', 'calendar', 'kongming']

function readJson<T>(key: string): T | null {
  try {
    const raw = uni.getStorageSync(key)
    if (!raw) return null
    return typeof raw === 'string' ? (JSON.parse(raw) as T) : (raw as T)
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown) {
  try {
    uni.setStorageSync(key, JSON.stringify(value))
  } catch {
    // 忽略写入失败
  }
}

// ── 收藏（为你推荐） ──

/** 读取收藏的工具 id（无记录时回退默认常用工具） */
export function getFavorites(): string[] {
  return readJson<string[]>(FAV_KEY) ?? [...defaultFavoriteToolIds]
}

/** 保存收藏顺序 */
export function saveFavorites(ids: string[]) {
  writeJson(FAV_KEY, ids)
}

/** 加入收藏（去重，追加到末尾）。返回新的收藏列表 */
export function addFavorite(id: string): string[] {
  const list = getFavorites()
  if (list.includes(id)) return list
  const next = [...list, id]
  saveFavorites(next)
  return next
}

/** 移除收藏。返回新的收藏列表 */
export function removeFavorite(id: string): string[] {
  const next = getFavorites().filter((x) => x !== id)
  saveFavorites(next)
  return next
}

// ── 自定义排序 ──

/** 读取已保存的工具顺序（可能为空数组） */
export function getToolOrder(): string[] {
  return readJson<string[]>(ORDER_KEY) ?? []
}

/** 保存用户自定义的工具顺序 */
export function saveToolOrder(ids: string[]) {
  writeJson(ORDER_KEY, ids)
}

/**
 * 依据已保存顺序对工具排序：已保存的按序在前，新增工具按默认顺序追加末尾。
 */
export function applyToolOrder<T extends { id: string }>(items: T[], order: string[]): T[] {
  if (order.length === 0) return items
  const map = new Map(items.map((it) => [it.id, it]))
  const result: T[] = []
  for (const id of order) {
    const it = map.get(id)
    if (it) {
      result.push(it)
      map.delete(id)
    }
  }
  for (const it of items) {
    if (map.has(it.id)) result.push(it)
  }
  return result
}

// ── 使用频次 ──

type UsageMap = Record<string, number>

/** 记录一次工具点击 */
export function recordToolUsage(id: string) {
  const map = readJson<UsageMap>(USAGE_KEY) ?? {}
  map[id] = (map[id] ?? 0) + 1
  writeJson(USAGE_KEY, map)
}

/** 读取使用频次映射 */
export function getToolUsage(): UsageMap {
  return readJson<UsageMap>(USAGE_KEY) ?? {}
}
