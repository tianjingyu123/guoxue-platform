/** 默认分享只重建公开内容定位，不传播当前页面完整登录/支付查询串。 */
const PUBLIC_ROUTES = new Set([
  'pages/index/index', 'pages/discover/index',
  'pkg-circle/circles/detail', 'pkg-circle/circles/post', 'pkg-circle/articles/detail',
  'pkg-circle/common/share-poster/index', 'pkg-circle/user/profile',
  'pkg-video/detail/index', 'pkg-live/watch/index',
  'pkg-course/detail/index', 'pkg-mall/product/detail', 'pkg-classics/detail/index',
  'pkg-shop/group-buy/detail', 'pkg-competition/detail/index',
  'pkg-creator/teacher-profile/index', 'pkg-operator/station-home/index', 'pkg-common/content/index',
])
const PUBLIC_QUERY_KEYS = new Set(['id', 'circleId', 'userId', 'targetId', 'type', 'slug', 'ref', 'source', 'stationId', 'code', 's', 'station'])

export function publicShareContext(route: string, query: Record<string, unknown> = {}) {
  const cleanRoute = String(route || '').replace(/^\//, '')
  if (!PUBLIC_ROUTES.has(cleanRoute)) throw new Error('此页面未提供公开分享入口')
  const params: Record<string, string> = {}
  for (const [key, value] of Object.entries(query)) {
    // 分站的公开标识单独处理；普通页面上的 OAuth code 不能出现在分享里。
    if (!PUBLIC_QUERY_KEYS.has(key) || (['code', 's', 'station'].includes(key) && cleanRoute !== 'pkg-operator/station-home/index')) continue
    if (typeof value !== 'string' && typeof value !== 'number') continue
    const text = String(value)
    if (text && text.length <= 160 && ![...text].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) params[key] = text
  }
  // 具体页面必须能还原同一内容；无参数的个人分站预览不能作为公开落地页。
  let hasTarget = !!params.id
  if (cleanRoute === 'pages/index/index' || cleanRoute === 'pages/discover/index') hasTarget = true
  else if (cleanRoute === 'pkg-operator/station-home/index') hasTarget = !!(params.ref || params.s || params.code || params.station)
  else if (cleanRoute === 'pkg-creator/teacher-profile/index') hasTarget = !!params.userId
  else if (cleanRoute === 'pkg-common/content/index') hasTarget = !!(params.slug || params.id)
  else if (cleanRoute === 'pkg-circle/common/share-poster/index') hasTarget = !!(params.type && params.targetId)
  else if (cleanRoute === 'pkg-circle/circles/post') hasTarget = !!(params.id && params.circleId)
  if (!hasTarget) throw new Error('缺少公开分享内容定位')
  return { route: cleanRoute, params }
}

export function parseShareQuery(search: string): Record<string, string> {
  const result: Record<string, string> = Object.create(null)
  // 默认分享不解析超长查询串；定位缺失由公开页面处理，不透传截断后的凭据。
  if (search.length > 8192) return result
  for (const pair of search.replace(/^\?/, '').split('&')) {
    const equal = pair.indexOf('=')
    if (equal < 0) continue
    try {
      const key = decodeURIComponent(pair.slice(0, equal).replace(/\+/g, ' '))
      const value = decodeURIComponent(pair.slice(equal + 1).replace(/\+/g, ' '))
      result[key] = value
    } catch { /* 损坏参数不透传，其他可解析定位参数仍可使用。 */ }
  }
  return result
}

/** 取消就是结束本次动作，不能再打开另一个分享面板或写剪贴板。 */
export function isShareCancelled(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const detail = error as { name?: unknown; errMsg?: unknown; message?: unknown }
  return detail.name === 'AbortError' || /cancel(?:led|ed)?|用户取消|取消分享/i.test(String(detail.errMsg || detail.message || ''))
}
