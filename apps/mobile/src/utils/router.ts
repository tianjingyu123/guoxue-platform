/**
 * 路由封装（替代 next/navigation）
 * Next router.push/replace/back → uni.navigateTo/redirectTo/navigateBack。
 * 主 tab 页之间用 reLaunch（采用自定义底部导航，非原生 tabBar）。
 *
 * 路由映射 ROUTE_MAP：原型路径(/paipan/bazi) → uni 页面路径(/pkg-paipan/bazi/index)。
 * 保持 tools-data 等数据源沿用原型 href，路径差异在适配层统一翻译，迁移一页登记一条。
 *
 * 渐进迁移期保障：未登记/未迁移目标页跳转会 fail，统一 toast「功能开发中」防白屏，
 * 与原型 coming-soon 占位语义一致。
 */

const MAIN_TABS = ['/pages/index/index', '/pages/circles/index', '/pages/paipan/index', '/pages/discover/index', '/pages/profile/index']

// 原型路径 → uni 实际页面路径（已迁移页面登记于此）
const ROUTE_MAP: Record<string, string> = {
  '/paipan': '/pages/paipan/index',
  '/paipan/bazi': '/pages/paipan/bazi/index',
  '/paipan/bazi/result': '/pages/paipan/bazi/result',
  // 商城
  '/mall': '/pages/mall/home/index',
  '/mall/category': '/pages/mall/category/index',
  '/shop': '/shop/home/index',
  '/shop/compare': '/shop/compare/index',
  // 营销活动
  '/shop/flash-sale': '/shop/flash-sale/index',
  '/shop/group-buy': '/shop/group-buy/index',
  '/shop/group-buy-success': '/shop/group-buy/success',
  '/shop/group-buy-fail': '/shop/group-buy/fail',
  '/shop/coupons': '/shop/coupons/index',
  '/shop/coupon-detail': '/shop/coupon-detail/index',
  // 购物车 / 结算 / 支付（双轨：根 /cart /checkout 与 /shop/cart /shop/checkout 是两套不同设计）
  '/cart': '/shop/cart/index',
  '/shop/cart': '/shop/cart/sku',
  '/checkout': '/shop/checkout/order',
  '/shop/checkout': '/shop/checkout/index',
  '/shop/paying': '/shop/paying/index',
  '/shop/pay-success': '/shop/pay-success/index',
  '/shop/pay-fail': '/shop/pay-fail/index',
  '/shop/pay-timeout': '/shop/pay-timeout/index',
  '/shop/payment-methods': '/shop/payment-methods/index',
  '/payment/result': '/shop/pay-success/index',
  // 订单中心
  '/orders': '/pages/order/list/index',
  '/orders/center': '/pages/order/center/index',
  '/orders/logistics': '/pages/order/logistics/index',
  '/orders/invoice': '/pages/order/invoice/index',
  '/orders/refund-progress': '/pages/order/refund/index',
  '/orders/dispute': '/pages/order/dispute/index',
}

/**
 * 动态路由映射：原型 /mall/product/123 → uni /pkg-mall/product/detail?id=123
 * 每条 [正则, 目标页, 参数名]，命中后把捕获组拼为 query。迁移含 :id 的页登记于此。
 * 注意顺序：更具体的 /reviews 必须在通用 detail 之前匹配。
 */
const DYNAMIC_ROUTES: Array<[RegExp, string, string]> = [
  [/^\/mall\/product\/([^/?]+)\/reviews$/, '/pages/mall/product/reviews', 'id'],
  [/^\/mall\/product\/([^/?]+)$/, '/pages/mall/product/detail', 'id'],
  [/^\/shop\/group-buy\/([^/?]+)$/, '/shop/group-buy/detail', 'id'],
  // 订单详情 / 评价（/reviews 规则更具体，须在通用 detail 之前）
  [/^\/orders\/([^/?]+)\/review$/, '/pages/order/review/index', 'id'],
  [/^\/orders\/([^/?]+)$/, '/pages/order/detail/index', 'id'],
]

function normalize(url: string): string {
  return url.startsWith('/') ? url : `/${url}`
}

/** 解析原型路径到 uni 路径，保留 query 串 */
function resolve(url: string): string {
  const u = normalize(url)
  const qIdx = u.indexOf('?')
  const path = qIdx >= 0 ? u.slice(0, qIdx) : u
  const query = qIdx >= 0 ? u.slice(qIdx) : ''
  const mapped = ROUTE_MAP[path]
  if (mapped) return mapped + query
  // 动态路由：路径参数转 query
  for (const [re, to, key] of DYNAMIC_ROUTES) {
    const m = path.match(re)
    if (m) {
      const sep = query ? '&' : '?'
      return `${to}?${key}=${m[1]}${query ? sep + query.slice(1) : ''}`
    }
  }
  return u
}

export function toastComingSoon() {
  uni.showToast({ title: '功能开发中', icon: 'none' })
}

export function navigateTo(url: string) {
  const target = resolve(url)
  const path = target.split('?')[0]
  if (MAIN_TABS.includes(path)) { uni.reLaunch({ url: target }); return }
  uni.navigateTo({ url: target, fail: () => toastComingSoon() })
}
export function redirectTo(url: string) { uni.redirectTo({ url: resolve(url), fail: () => toastComingSoon() }) }
export function reLaunch(url: string) { uni.reLaunch({ url: resolve(url) }) }
export function navigateBack(delta = 1) { uni.navigateBack({ delta }) }
/** 返回上一页（语义别名，等价 navigateBack；首页无上一页时回首页兜底） */
export function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack({ delta: 1 })
  else uni.reLaunch({ url: '/pages/index/index' })
}
