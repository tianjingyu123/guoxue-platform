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
  '/paipan/bazi': '/pkg-paipan/bazi/index',
  // 智能客服（首页 Header 入口；/search 与 /im/conversations 页面尚未迁移，走 coming-soon 兜底）
  '/customer-service': '/pkg-agent/agent/customer-service',
  '/paipan/bazi/result': '/pkg-paipan/bazi/result',
  // 商城
  '/mall': '/pkg-mall/home/index',
  '/mall/category': '/pkg-mall/category/index',
  '/shop': '/pkg-shop/home/index',
  '/shop/compare': '/pkg-shop/compare/index',
  // shop 商品板块（详情/分类/评价/换货）
  '/shop/categories': '/pkg-shop/categories/index',
  '/shop/reviews': '/pkg-shop/reviews/index',
  '/shop/exchange': '/pkg-shop/exchange/index',
  // 营销活动
  '/shop/flash-sale': '/pkg-shop/flash-sale/index',
  '/shop/group-buy': '/pkg-shop/group-buy/index',
  '/shop/group-buy-success': '/pkg-shop/group-buy/success',
  '/shop/group-buy-fail': '/pkg-shop/group-buy/fail',
  '/shop/coupons': '/pkg-shop/coupons/index',
  '/shop/coupon-detail': '/pkg-shop/coupon-detail/index',
  // 购物车 / 结算 / 支付（双轨：根 /cart /checkout 与 /shop/cart /shop/checkout 是两套不同设计）
  '/cart': '/pkg-shop/cart/index',
  '/shop/cart': '/pkg-shop/cart/sku',
  '/checkout': '/pkg-shop/checkout/order',
  '/shop/checkout': '/pkg-shop/checkout/index',
  '/shop/paying': '/pkg-shop/paying/index',
  '/shop/pay-success': '/pkg-shop/pay-success/index',
  '/shop/pay-fail': '/pkg-shop/pay-fail/index',
  '/shop/pay-timeout': '/pkg-shop/pay-timeout/index',
  '/shop/payment-methods': '/pkg-shop/payment-methods/index',
  '/payment/result': '/pkg-shop/pay-success/index',
  // 订单中心
  '/orders': '/pkg-order/list/index',
  '/orders/center': '/pkg-order/center/index',
  '/orders/logistics': '/pkg-order/logistics/index',
  '/orders/invoice': '/pkg-order/invoice/index',
  '/orders/refund-progress': '/pkg-order/refund/index',
  '/orders/dispute': '/pkg-order/dispute/index',
  // 售后与账户
  '/shop/after-sale': '/pkg-account/after-sale/index',
  '/shop/after-sale-rejected': '/pkg-account/after-sale-rejected/index',
  '/shop/my-after-sales': '/pkg-account/my-after-sales/index',
  '/shop/addresses': '/pkg-account/addresses/index',
  '/shop/addresses/edit': '/pkg-account/address-edit/index',
  // 个人中心 - 设置与账号安全
  '/mine/settings': '/pkg-mine/settings/index',
  '/mine/security': '/pkg-mine/security/index',
  '/mine/change-password': '/pkg-mine/change-password/index',
  '/mine/change-phone': '/pkg-mine/change-phone/index',
  '/mine/payment-password': '/pkg-mine/payment-password/index',
  '/mine/bind-accounts': '/pkg-mine/bind-accounts/index',
  // 个人中心 - 隐私与账号管理
  '/mine/privacy-authorization': '/pkg-mine/privacy-authorization/index',
  '/mine/blacklist': '/pkg-mine/blacklist/index',
  '/mine/teen-mode': '/pkg-mine/teen-mode/index',
  '/mine/data-export': '/pkg-mine/data-export/index',
  '/mine/delete-account': '/pkg-mine/delete-account/index',
  '/mine/delete-account-result': '/pkg-mine/delete-account-result/index',
  // 个人中心 - 资产与互动
  '/mine/wallet': '/pkg-mine/wallet/index',
  '/mine/points': '/pkg-mine/points/index',
  '/mine/history': '/pkg-mine/history/index',
  '/mine/my-likes': '/pkg-mine/my-likes/index',
  '/mine/my-comments': '/pkg-mine/my-comments/index',
  '/mine/received-comments': '/pkg-mine/received-comments/index',
}

/**
 * 动态路由映射：原型 /mall/product/123 → uni /pkg-mall/product/detail?id=123
 * 每条 [正则, 目标页, 参数名]，命中后把捕获组拼为 query。迁移含 :id 的页登记于此。
 * 注意顺序：更具体的 /reviews 必须在通用 detail 之前匹配。
 */
const DYNAMIC_ROUTES: Array<[RegExp, string, string]> = [
  [/^\/mall\/product\/([^/?]+)\/reviews$/, '/pkg-mall/product/reviews', 'id'],
  [/^\/mall\/product\/([^/?]+)$/, '/pkg-mall/product/detail', 'id'],
  [/^\/shop\/group-buy\/([^/?]+)$/, '/pkg-shop/group-buy/detail', 'id'],
  // 订单详情 / 评价（/reviews 规则更具体，须在通用 detail 之前）
  [/^\/orders\/([^/?]+)\/review$/, '/pkg-order/review/index', 'id'],
  [/^\/orders\/([^/?]+)$/, '/pkg-order/detail/index', 'id'],
  // 售后详情（/shop/after-sale/:id；静态 /shop/after-sale 已在 ROUTE_MAP 优先命中）
  [/^\/shop\/after-sale\/([^/?]+)$/, '/pkg-account/after-sale-detail/index', 'id'],
  // shop 商品评价（/shop/:id/reviews 更具体，须在通用商品详情之前）
  [/^\/shop\/([^/?]+)\/reviews$/, '/pkg-shop/reviews/index', 'id'],
  // shop 商品详情（/shop/:id，兜底；所有 /shop/xxx 静态页已在 ROUTE_MAP 优先命中）
  [/^\/shop\/([^/?]+)$/, '/pkg-shop/product/index', 'id'],
  // 课程详情系列（/courses/:id/xxx 更具体须在通用详情之前；静态 /courses/xxx 已在 ROUTE_MAP 优先命中）
  [/^\/courses\/([^/?]+)\/chapters$/, '/pkg-course/chapters/index', 'id'],
  [/^\/courses\/([^/?]+)\/learn$/, '/pkg-course/learn/index', 'id'],
  [/^\/courses\/([^/?]+)\/player$/, '/pkg-course/player/index', 'id'],
  [/^\/courses\/([^/?]+)$/, '/pkg-course/detail/index', 'id'],
  // 课程卡片 /course/:id（单数）暂复用课程详情
  [/^\/course\/([^/?]+)$/, '/pkg-course/detail/index', 'id'],
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
