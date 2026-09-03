/** 专题大屏的纯数据变换；缺失值不能替代为真实零值。 */
export interface TransactionScreen {
  todayOrders?: number; todayRevenue?: number; hourOrders?: number; updatedAt?: string
  typeBreakdown?: { type: string; amount?: number; count?: number }[]
  recentOrders?: { id: string; type: string; amount?: number; at?: string }[]
}
export interface ContentScreen {
  totalContent?: number; totalArticles?: number; totalPosts?: number; totalCourses?: number; totalVideos?: number
  monthGrowth?: { articles?: number; posts?: number }
  topCreators?: { userId: string; nickname?: string; articleCount?: number }[]
  updatedAt?: string
}
export interface AiScreen {
  totalApiCalls?: number; todayApiCalls?: number; monthApiCalls?: number
  botConversations?: number; knowledgeBaseSize?: number
  sceneDistribution?: { scene: string | null; count?: number }[]
  modelDistribution?: { model: string | null; count?: number }[]
  updatedAt?: string
}
export interface Station { id: string; name?: string; city?: string; address?: string }
export interface OfflineScreen {
  totalStations?: number; totalCourses?: number; totalStudents?: number; totalRevenue?: number; totalOrders?: number
  cityDistribution?: { city: string; count?: number }[]; stations?: Station[]; updatedAt?: string
}
export const topicColors = ['#69DFD0', '#94BFFF', '#C5B8F2', '#F0C58A', '#8CC7AB', '#DCABCE']
export const contentKinds = [
  { key: 'totalArticles', label: '文章', scope: '审核通过', color: topicColors[0] },
  { key: 'totalPosts', label: '帖子', scope: '已发布', color: topicColors[1] },
  { key: 'totalCourses', label: '课程', scope: '审核通过', color: topicColors[2] },
  { key: 'totalVideos', label: '视频', scope: '全部视频记录', color: topicColors[3] },
] as const

export function metricNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}
export function metric(value: unknown, money = false) {
  const number = metricNumber(value)
  return number === null ? '—' : `${money ? '¥' : ''}${number.toLocaleString('zh-CN', { minimumFractionDigits: money ? 2 : 0, maximumFractionDigits: money ? 2 : 0 })}`
}
/** 仅用于空间有限的图心，精确数值仍保留在明细及可访问名称中。 */
export function compactMetric(value: unknown, money = false) {
  const number = metricNumber(value)
  if (number === null || number < 10000) return metric(value, money)
  const unit = number >= 100000000 ? 100000000 : 10000
  return `${money ? '¥' : ''}${(number / unit).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}${unit === 100000000 ? '亿' : '万'}`
}
export function quotient(value: unknown, denominator: unknown): number | null {
  const a = metricNumber(value), b = metricNumber(denominator)
  return a !== null && b !== null && b > 0 ? a / b : null
}
export function proportion(value: unknown, denominator: unknown): number | null {
  const result = quotient(value, denominator)
  // 不把不一致的接口数据钳成 100%，而是明确无法计算。
  return result !== null && result <= 1 ? result * 100 : null
}
export function percent(value: number | null) { return value === null ? '—' : `${value.toLocaleString('zh-CN', { maximumFractionDigits: 1 })}%` }
export interface DistributionInput { key: string; label: string; value: unknown; color?: string }
export function distribution(input: DistributionInput[] | undefined) {
  const items = (input ?? []).map((item, index) => ({ ...item, value: metricNumber(item.value), color: item.color ?? topicColors[index % topicColors.length] }))
  const complete = input !== undefined && items.every(item => item.value !== null)
  const total = complete ? items.reduce((sum, item) => sum + item.value!, 0) : null
  let offset = 0
  return {
    total, complete,
    items: items.sort((a, b) => (b.value ?? -1) - (a.value ?? -1)).map(item => {
      const share = proportion(item.value, total)
      const result = { ...item, share, offset }
      offset += share ?? 0
      return result
    }),
  }
}

/** 两行分区的面积严格按数量分配；零值不伪造最小占比，入口由图外按钮保留。 */
export function contentMosaic(data: ContentScreen) {
  const result = distribution(contentKinds.map(kind => ({ ...kind, value: data[kind.key] })))
  if (!result.total) return { ...result, blocks: [] }
  const positive = result.items.filter(item => item.value! > 0)
  const rows = [positive.slice(0, 2), positive.slice(2)]
  let y = 0
  const blocks = rows.flatMap(row => {
    const sum = row.reduce((value, item) => value + item.value!, 0)
    const height = sum / result.total! * 300
    let x = 0
    const blocks = row.map(item => {
      const width = item.value! / sum * 640
      const block = { ...item, x, y, width, height }
      x += width
      return block
    })
    y += height
    return blocks
  })
  return { ...result, blocks }
}
export function filterStations(stations: Station[] | undefined, city: string | null, query: string) {
  const term = query.trim().toLocaleLowerCase()
  return (stations ?? []).filter(station => (city === null || (station.city ?? '') === city) && (!term || [station.name, station.city, station.address].some(value => value?.toLocaleLowerCase().includes(term))))
}
export function coveredCityCount(cities: OfflineScreen['cityDistribution']) {
  if (!Array.isArray(cities) || cities.some(city => metricNumber(city.count) === null)) return null
  return new Set(cities.filter(city => city.city?.trim() && city.count! > 0).map(city => city.city)).size
}

export function selectedDistribution(result: ReturnType<typeof distribution>, key: string | null, label: string) {
  if (key === null) return undefined
  // 最近订单可能包含今日没有成交的品类；选中后不能误显示“全部品类”的合计。
  return result.items.find(item => item.key === key) ?? { label, value: result.complete ? 0 : null, share: result.complete ? proportion(0, result.total) : null }
}

export interface SnapshotState<T> { data: T | null; refreshing: boolean; failed: boolean; forbidden: boolean; receivedAt?: string }
export function isScreenAccessDenied(error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status
  return status === 401 || status === 403
}
/** 单一数据源刷新器：去重、卸载隔离、令牌切换隔离和权限失效清空。 */
export function createSnapshotLoader<T>(request: () => Promise<T>, changed: (state: SnapshotState<T>) => void) {
  let state: SnapshotState<T> = { data: null, refreshing: false, failed: false, forbidden: false }
  let generation = 0
  let disposed = false
  function publish(patch: Partial<SnapshotState<T>>) { state = { ...state, ...patch }; changed(state) }
  async function refresh() {
    if (disposed || state.refreshing) return
    const current = generation
    publish({ refreshing: true })
    try {
      const data = await request()
      if (disposed || current !== generation) return
      if (data === null || typeof data !== 'object' || Array.isArray(data) || !Object.keys(data).length) throw new Error('无有效快照')
      publish({ data, failed: false, forbidden: false, receivedAt: new Date().toISOString() })
    } catch (error) {
      if (disposed || current !== generation) return
      if (isScreenAccessDenied(error)) forbid()
      else publish({ failed: true, forbidden: false })
    } finally {
      if (!disposed && current === generation) publish({ refreshing: false })
    }
  }
  function reset() {
    generation++
    if (!disposed) publish({ data: null, refreshing: false, failed: false, forbidden: false, receivedAt: undefined })
  }
  // 关联数据源发现权限失效时也必须取消尚未返回的汇总请求。
  function forbid() {
    generation++
    if (!disposed) publish({ data: null, refreshing: false, failed: true, forbidden: true, receivedAt: undefined })
  }
  return { refresh, reset, forbid, dispose: () => { disposed = true; generation++ } }
}
