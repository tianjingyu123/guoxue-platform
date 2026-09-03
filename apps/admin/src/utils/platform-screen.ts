/** 大屏只呈现接口给出的数值：零值、缺失和非法值不能混为一谈。 */
export interface PlatformScreen {
  totalUsers?: number
  todayNewUsers?: number
  /** 历史字段名，服务端实际返回 WebSocket 当前在线人数。 */
  dailyActiveUsers?: number
  totalCourses?: number
  totalCircles?: number
  totalProducts?: number
  totalClassicBooks?: number
  totalArticles?: number
  totalGmv?: number
  updatedAt?: string
}

export const platformAssets = [
  { key: 'totalCourses', label: '课程', scope: '已通过审核', glyph: '学', color: '#74DDCF', x: 50, y: 10 },
  { key: 'totalCircles', label: '圈子', scope: '平台圈子', glyph: '聚', color: '#91BBEF', x: 86, y: 38 },
  { key: 'totalProducts', label: '商品', scope: '在售商品', glyph: '物', color: '#DFC48D', x: 73, y: 82 },
  { key: 'totalClassicBooks', label: '古籍', scope: '收录古籍', glyph: '典', color: '#ADA4DE', x: 27, y: 82 },
  { key: 'totalArticles', label: '文章', scope: '已通过审核', glyph: '文', color: '#85C7AA', x: 14, y: 38 },
] as const

export type PlatformAssetKey = typeof platformAssets[number]['key']

export function screenNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

export function formatScreenNumber(value: unknown): string {
  const number = screenNumber(value)
  return number === null ? '—' : number.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

export function platformComposition(data: PlatformScreen) {
  const values = platformAssets.map(asset => screenNumber(data[asset.key]))
  const complete = values.every(value => value !== null)
  const total = complete ? values.reduce<number>((sum, value) => sum + (value ?? 0), 0) : null
  return {
    total, complete,
    items: platformAssets.map((asset, index) => ({
      ...asset, value: values[index],
      // 资料不完整或总量为零时，不声称已知构成比例。
      percent: total !== null && total > 0 ? (values[index]! / total) * 100 : null,
    })),
  }
}

export function formatScreenTime(value?: string): string {
  if (!value || Number.isNaN(Date.parse(value))) return '暂未提供'
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

export function sourceLabel(state: { status: string }): string {
  return ({ ready: '已同步', stale: '保留上次数据', error: '暂不可用', waiting: '读取中' } as Record<string, string>)[state.status] ?? '待确认'
}

export function orderTypeLabel(type: string): string {
  return ({ COURSE: '课程', PRODUCT: '商品', MEMBER: '会员', MEMBERSHIP: '会员', CIRCLE: '圈子', CONSULTATION: '咨询', RECHARGE: '充值', GIFT: '礼物', LIVESTREAM: '直播', OFFLINE_COURSE: '线下课程' } as Record<string, string>)[type] ?? '其他业务'
}

export function buildGrowthSeries(input: { date: string; newUsers?: number }[], days: number) {
  const points = input.slice(-days)
  const complete = points.length > 0 && points.every(point => screenNumber(point.newUsers) !== null)
  const total = complete ? points.reduce((sum, point) => sum + point.newUsers!, 0) : null
  const peak = complete ? Math.max(...points.map(point => point.newUsers!)) : null
  const scale = Math.max(peak ?? 0, 1)
  const path = complete ? points.map((point, index) => `${index ? 'L' : 'M'}${28 + (index / Math.max(points.length - 1, 1)) * 294} ${96 - point.newUsers! / scale * 80}`).join(' ') : ''
  return { points, complete, total, peak, scale, path }
}
