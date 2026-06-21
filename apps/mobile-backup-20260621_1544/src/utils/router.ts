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
  '/paipan/bazi/result': '/pkg-paipan/bazi/result',
  '/paipan/bazi/history': '/pkg-paipan/bazi/history/index',
  '/paipan/bazi/history/celebrities': '/pkg-paipan/bazi/history/celebrities',
  '/paipan/bazi/history/groups': '/pkg-paipan/bazi/history/groups',
  '/paipan/qimen': '/pkg-paipan/qimen/index',
  '/paipan/qimen/result': '/pkg-paipan/qimen/result',
  '/paipan/qimen/history': '/pkg-paipan/qimen/history/index',
  '/paipan/qimen/history/groups': '/pkg-paipan/qimen/history/groups',
  '/paipan/yangpan': '/pkg-paipan/yangpan/index',
  '/paipan/yangpan/result': '/pkg-paipan/yangpan/result',
  '/paipan/yangpan/history': '/pkg-paipan/yangpan/history/index',
  '/paipan/yangpan/history/groups': '/pkg-paipan/yangpan/history/groups',
  '/paipan/tools': '/pkg-paipan/tools/coming-soon',
  // 商城
  '/mall': '/pkg-mall/home/index',
  '/mall/category': '/pkg-mall/category/index',
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
  '/orders': '/pkg-order/list/index',
  '/orders/center': '/pkg-order/center/index',
  '/orders/logistics': '/pkg-order/logistics/index',
  '/orders/invoice': '/pkg-order/invoice/index',
  '/orders/refund-progress': '/pkg-order/refund/index',
  '/orders/dispute': '/pkg-order/dispute/index',
  // 设置中心（第①套，/profile 主页链接的活套）
  '/settings': '/pkg-settings/index/index',
  '/settings/notifications': '/pkg-settings/notifications/index',
  '/settings/privacy': '/pkg-settings/privacy/index',
  '/settings/phone': '/pkg-settings/phone/index',
  '/settings/password': '/pkg-settings/password/index',
  '/settings/payment-password': '/pkg-settings/payment-password/index',
  '/settings/payment-methods': '/pkg-settings/payment-methods/index',
  '/settings/blacklist': '/pkg-settings/blacklist/index',
  '/settings/bindaccount': '/pkg-settings/bindaccount/index',
  '/settings/delete-account': '/pkg-settings/delete-account/index',
  // 旧套设置页（保留兼容，待切换后废弃）
  '/mine/settings': '/pkg-mine/settings/index',
  // 钱包中心（第①套，/profile 主页链接的活套）
  '/wallet': '/pkg-wallet/index/index',
  '/wallet/bank-cards': '/pkg-wallet/bank-cards/index',
  '/wallet/bill': '/pkg-wallet/bill/index',
  // 钱包旧套（保留兼容）
  '/mine/wallet': '/pkg-mine/wallet/index',
  '/wallet/recharge': '/pkg-mine/wallet/recharge',
  '/wallet/withdraw': '/pkg-mine/wallet/withdraw',
  '/wallet/transactions': '/pkg-mine/wallet/transactions',
  // 个人中心活页（第①套，/profile 菜单链接的活套）
  '/downloads': '/pkg-profile/downloads/index',
  '/follows': '/pkg-profile/follows/index',
  '/learning': '/pkg-profile/learning/index',
  '/invite': '/pkg-profile/invite/index',
  '/invite/history': '/pkg-profile/invite/history/index',
  // 智能体广场
  '/agents': '/pkg-agent/agents/index',
  '/agents/history': '/pkg-agent/agents/history',
  '/agents/questions': '/pkg-agent/agents/questions',
  '/agents/ranking': '/pkg-agent/agents/ranking',
  // 诗词
  '/poetry': '/pkg-poetry/index/index',
  '/poetry/categories': '/pkg-poetry/categories/index',
  '/poetry/collections': '/pkg-poetry/collections/index',
  '/poetry/detail': '/pkg-poetry/detail/index',
  // 电子书
  '/ebooks': '/pkg-ebook/store/index',
  '/ebooks/shelf': '/pkg-ebook/bookshelf/index',
  '/ebooks/notes': '/pkg-ebook/notes/index',
  '/ebooks/bookmarks': '/pkg-ebook/bookmarks/index',
}

/**
 * 动态路由映射：原型 /mall/product/123 → uni /pkg-mall/product/detail?id=123
 * 每条 [正则, 目标页, 参数名]，命中后把捕获组拼为 query。迁移含 :id 的页登记于此。
 * 注意顺序：更具体的 /reviews 必须在通用 detail 之前匹配。
 */
const DYNAMIC_ROUTES: Array<[RegExp, string, string]> = [
  [/^\/mall\/product\/([^/?]+)\/reviews$/, '/pkg-mall/product/reviews', 'id'],
  [/^\/mall\/product\/([^/?]+)$/, '/pkg-mall/product/detail', 'id'],
  [/^\/shop\/group-buy\/([^/?]+)$/, '/shop/group-buy/detail', 'id'],
  // 订单详情 / 评价（/reviews 规则更具体，须在通用 detail 之前）
  [/^\/orders\/([^/?]+)\/review$/, '/pkg-order/review/index', 'id'],
  [/^\/orders\/([^/?]+)$/, '/pkg-order/detail/index', 'id'],
  // 电子书 / 诗词详情
  [/^\/ebooks\/([^/?]+)$/, '/pkg-ebook/detail/index', 'id'],
  [/^\/poetry\/([^/?]+)$/, '/pkg-poetry/detail/index', 'id'],
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
