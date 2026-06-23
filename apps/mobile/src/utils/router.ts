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
  // 账号鉴权（登录/注册/找回密码）
  '/login': '/pkg-auth/login/index',
  '/register': '/pkg-auth/register/index',
  '/forgot-password': '/pkg-auth/forgot-password/index',
  '/paipan': '/pages/paipan/index',
  '/paipan/bazi': '/pkg-paipan/bazi/index',
  // 智能客服（首页 Header 入口）
  '/customer-service': '/pkg-agent/agent/customer-service',
  // AI 智能体广场（排盘首页「AI 智能体」更多入口）
  '/agents': '/pkg-agent/agents/index',
  // 智能体主对话页（广场「热卜智能助手」入口）
  '/agent/main': '/pkg-agent/agent/main',
  // 智能体广场下游：对话历史 / 常见问题 / 热度榜
  '/agents/history': '/pkg-agent/agents/history',
  '/agents/questions': '/pkg-agent/agents/questions',
  '/agents/ranking': '/pkg-agent/agents/ranking',
  // 全局搜索（主页 + 结果页，结果页携带 ?keyword= 由 resolve 透传）
  '/search': '/pkg-search/search/index',
  '/search/result': '/pkg-search/search/result',
  // 课程列表（携带 ?category= / ?sort= / ?filter= 由 resolve 透传）
  '/courses-list': '/pkg-course/courses-list/index',
  // 课程限时特惠（静态须优先于动态 /courses/:id，否则被误判为课程详情 id=flash-sale）
  '/courses/flash-sale': '/pkg-course/flash-sale/index',
  // 消息会话列表
  '/im/conversations': '/pkg-im/im/conversations/index',
  // 消息中心（系统/互动/交易/客服通知）
  '/im/messages': '/pkg-im/im/messages/index',
  // 添加好友（搜索手机号/智玄号/昵称）
  '/im/add-friend': '/pkg-im/im/add-friend/index',
  // 创建群聊（选好友→设群名两步）
  '/im/create-group': '/pkg-im/im/create-group/index',
  // 通讯录（按拼音首字母分组+字母索引+搜索弹层）
  '/im/contacts': '/pkg-im/im/contacts/index',
  // 群聊列表（置顶/免打扰/退群+搜索+浮动创建）
  '/im/group-list': '/pkg-im/im/group-list/index',
  // 好友请求（待处理/已处理+同意/拒绝+全部同意）
  '/im/friend-requests': '/pkg-im/im/friend-requests/index',
  // 邀请好友（链接/二维码/海报Tab+奖励说明+分享渠道+邀请记录入口）
  '/im/invite': '/pkg-im/im/invite/index',
  // 分享海报（圈子/帖子/文章/直播/邀请，type+targetId）
  '/pkg-circle/common/share-poster': '/pkg-circle/common/share-poster/index',
  '/common/share-poster': '/pkg-circle/common/share-poster/index',
  '/paipan/bazi/result': '/pkg-paipan/bazi/result',
  // 八字历史记录簇（案例库 celebrities / 分组编辑 groups 须先于通配匹配）
  '/paipan/bazi/history/celebrities': '/pkg-paipan/bazi/history/celebrities',
  '/paipan/bazi/history/groups': '/pkg-paipan/bazi/history/groups',
  '/paipan/bazi/history': '/pkg-paipan/bazi/history/index',
  // 六爻排盘簇（入口/结果）
  '/paipan/liuyao': '/pkg-paipan/liuyao/index',
  '/paipan/liuyao/result': '/pkg-paipan/liuyao/result',
  // 奇门遁甲簇（入口/结果/历史/分组）
  '/paipan/qimen': '/pkg-paipan/qimen/index',
  '/paipan/qimen/result': '/pkg-paipan/qimen/result',
  '/paipan/qimen/history': '/pkg-paipan/qimen/history/index',
  '/paipan/qimen/history/groups': '/pkg-paipan/qimen/history/groups',
  // 阳盘奇门簇（入口/结果/历史/分组）
  '/paipan/yangpan': '/pkg-paipan/yangpan/index',
  '/paipan/yangpan/result': '/pkg-paipan/yangpan/result',
  '/paipan/yangpan/history': '/pkg-paipan/yangpan/history/index',
  '/paipan/yangpan/history/groups': '/pkg-paipan/yangpan/history/groups',
  // 工具占位页（30+ 未上线工具入口，name 参数透传；命理/中医两个前缀同指一页）
  '/paipan/tools/coming-soon': '/pkg-paipan/tools/coming-soon',
  '/tools/coming-soon': '/pkg-paipan/tools/coming-soon',
  // 诗词雅集（静态首页/分类/集锦须优先于动态 /poetry/:id 详情）
  '/poetry': '/pkg-poetry/index/index',
  '/poetry/categories': '/pkg-poetry/categories/index',
  '/poetry/collections': '/pkg-poetry/collections/index',
  // 商城
  '/mall': '/pkg-mall/home/index',
  '/mall/category': '/pkg-mall/category/index',
  // 商品评价（入口不带 id，静态须优先于动态 /mall/product/:id/reviews）
  '/mall/product/reviews': '/pkg-mall/product/reviews',
  '/shop': '/pkg-shop/home/index',
  '/shop/compare': '/pkg-shop/compare/index',
  // shop 商品板块（详情/分类/评价/换货）
  '/shop/categories': '/pkg-shop/categories/index',
  // 为你推荐"更多"入口（原型无独立商品列表页，复用分类浏览页；静态须优先于动态 /shop/:id）
  '/shop/products': '/pkg-shop/categories/index',
  // 商城内搜索入口（原型无独立 shop 搜索页，复用全局搜索页）
  '/shop/search': '/pkg-search/search/index',
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
  // 退款进度别名（拼团失败页入口 /mine/refunds?orderId=xxx 与 refund-progress 同源）
  '/mine/refunds': '/pkg-order/refund/index',
  '/orders/dispute': '/pkg-order/dispute/index',
  // 售后与账户
  '/shop/after-sale': '/pkg-account/after-sale/index',
  '/shop/after-sale-rejected': '/pkg-account/after-sale-rejected/index',
  '/shop/my-after-sales': '/pkg-account/my-after-sales/index',
  '/shop/addresses': '/pkg-account/addresses/index',
  '/shop/addresses/edit': '/pkg-account/address-edit/index',
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
  // 个人中心 - 设置与账号安全（第②套，旧版，待废弃）
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
  // 钱包中心（第①套，/profile 主页 href="/wallet" 链接的活套）
  '/wallet': '/pkg-wallet/index/index',
  '/wallet/bank-cards': '/pkg-wallet/bank-cards/index',
  '/wallet/bill': '/pkg-wallet/bill/index',
  // 个人中心 - 资产与互动（第②套，旧版 pkg-mine/wallet，待评估降级）
  '/mine/wallet': '/pkg-mine/wallet/index',
  '/wallet/recharge': '/pkg-mine/wallet/recharge',
  '/wallet/withdraw': '/pkg-mine/wallet/withdraw',
  '/wallet/transactions': '/pkg-mine/wallet/transactions',
  '/mine/points': '/pkg-mine/points/index',
  '/mine/history': '/pkg-mine/history/index',
  '/mine/my-likes': '/pkg-mine/my-likes/index',
  '/mine/my-comments': '/pkg-mine/my-comments/index',
  '/mine/received-comments': '/pkg-mine/received-comments/index',
  '/mine/edit-profile': '/pkg-mine/edit-profile/index',
  '/mine/achievements': '/pkg-mine/achievements/index',
  '/mine/memberships': '/pkg-mine/memberships/index',
  '/mine/my-courses': '/pkg-mine/my-courses/index',
  '/mine/learning-dashboard': '/pkg-mine/learning-dashboard/index',
  '/mine/follows': '/pkg-mine/follows/index',
  '/mine/downloads': '/pkg-mine/downloads/index',
  '/mine/bookings': '/pkg-mine/bookings/index',
  '/mine/applications': '/pkg-mine/applications/index',
  '/mine/invite-records': '/pkg-mine/invite-records/index',
  '/mine/submissions': '/pkg-mine/submissions/index',
  // 帮助与反馈 / 关于我们（设置主页"其他"分区）
  '/feedback': '/pkg-mine/feedback/index',
  '/about': '/pkg-mine/about/index',
  // 「我的」个人中心活套（profile 菜单直链顶级路由，与 pkg-mine 旧套物理隔离于 pkg-profile）
  // 旧套 /mine/{downloads,follows,my-courses,edit-profile,memberships,invite-records} 已 deprecated，见 compare/DEPRECATED.md
  '/downloads': '/pkg-profile/downloads/index',
  '/follows': '/pkg-profile/follows/index',
  '/learning': '/pkg-profile/learning/index',
  '/invite': '/pkg-profile/invite/index',
  '/invite/history': '/pkg-profile/invite/history/index',
  '/vip': '/pkg-profile/vip/index',
  '/vip/records': '/pkg-profile/vip/records/index',
  // 悬赏广场（列表/发布/回答/我的；静态须优先于动态 /bounty/:id 详情）
  '/bounty': '/pkg-bounty/index/index',
  '/bounty/create': '/pkg-bounty/create/index',
  '/bounty/answer': '/pkg-bounty/answer/index',
  '/bounty/my': '/pkg-bounty/my/index',
  // 付费问答（列表/提问/待回答；静态须优先于动态 /qa/:id 详情）
  '/qa': '/pkg-qa/index/index',
  '/qa/ask': '/pkg-qa/ask/index',
  '/qa/pending': '/pkg-qa/pending/index',
  // 帮助中心（B级展示页，profile菜单入口）
  '/help': '/pkg-help/index/index',
  // 专家/讲师列表（experts��������=列表页��expert单数=详情走动态路由 /expert/:id）
  '/experts': '/pkg-expert/index/index',
  // 举报（表单/记录列表；result/:id 结果详情走动态路由，须优先于动态匹配）
  '/report': '/pkg-report/index/index',
  '/report/result': '/pkg-report/result/index',
  // 活动（日历/落地页静态；activity/:id 详情走动态路由，须优先于动态匹配）
  '/activity/calendar': '/pkg-activity/calendar/index',
  '/activity/landing': '/pkg-activity/landing/index',
  // 平台公告（列表/版本升级静态；notices/:id 详情走动态路由，须优先于动态匹配）
  '/notices': '/pkg-notices/index/index',
  '/notices/upgrade': '/pkg-notices/upgrade/index',
  // AI 封面生成（从创作/发帖页带 ?title=&summary=&contentId= query 调起，query 由 resolve 透传）
  '/ai/cover-generate': '/pkg-ai/cover-generate/index',
  // 作者列表（authors/:id 详情页暂未迁，点击走 navigateTo 未注册时 toast 兜底）
  '/authors': '/pkg-author/index/index',
  // 创作编辑器（发帖/写文章，接 ?id=&circleId= query，从 creator/submissions 调起）
  '/editor': '/pkg-circle/circles/editor',
  // 草稿箱（从 profile/creator 调起，点击草稿带 ?draft= 跳 publish）
  '/drafts': '/pkg-mine/drafts/index',
  // 我的收藏（从 profile 调起，6类型筛选+编辑模式批量取消收藏）
  '/favorites': '/pkg-mine/favorites/index',
  // 注册成功欢迎仪式（峰值时刻，3s倒计时自动进首页/兴趣引导）
  '/welcome': '/pkg-auth/welcome/index',
  // 实名认证（4状态机：未认证表单/审核中/已认证/失败，fallback /settings）
  '/verification': '/pkg-settings/verification/index',
  // 兴趣引导（注册流 welcome→interests-guide→首页，选3-8个兴趣领域）
  '/interests-guide': '/pkg-auth/interests-guide/index',
  // 扫码结果（接 ?content= query，9种类型解析，从 offline/checkin 等扫码入口调起）
  '/common/scan': '/pkg-common/scan/index',
  // 全屏图片查看器（接 ?images=&index= query，缩放/旋转/切换/手势）
  '/common/image-viewer': '/pkg-common/image-viewer/index',
  // 交易申诉（3步表单：选订单/选类型/填详情→提交进度时间线，fallback /orders）
  '/appeal': '/pkg-order/appeal/index',
  // 成为合作伙伴（讲师招募：intro权益介绍→apply申请表单→success提交成功）
  '/become-partner': '/pkg-operator/become-partner/index',
  // 平台公告（驿站站长面板入口，分类筛选+置顶/普通分组，详情复用 notices 兜底）
  '/announcements': '/pkg-operator/announcements/index',
  // 智能体广场（全站 AI Bot 应用市场，区别于 circles/bots 圈子内机器人列表）
  '/bots': '/pkg-agent/bots/index',
  // Bot 对话页（接 ?id= query，流式回复，circles/bots 和 bots 广场都跳此）
  '/bots/chat': '/pkg-agent/bots/chat/index',
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
  // 订单详情 / 评价（/reviews 规则��具体，须在通用 detail 之前）
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
  [/^\/courses\/([^/?]+)\/purchase$/, '/pkg-course/purchase-confirm/index', 'id'],
  [/^\/courses\/([^/?]+)$/, '/pkg-course/detail/index', 'id'],
  // 课程卡片 /course/:id（单数）暂复用课程详情
  [/^\/course\/([^/?]+)$/, '/pkg-course/detail/index', 'id'],
  // ��章详情 /articles/:id（复数为真源，单数 /article/:id 原型为重定向，统一指向详情）
  [/^\/articles\/([^/?]+)$/, '/pkg-circle/articles/detail', 'id'],
  [/^\/article\/([^/?]+)$/, '/pkg-circle/articles/detail', 'id'],
  // 单聊 /im/chat/:id
  [/^\/im\/chat\/([^/?]+)$/, '/pkg-im/im/chat/index', 'id'],
  // 群聊 /im/group-chat/:id
  [/^\/im\/group-chat\/([^/?]+)$/, '/pkg-im/im/group-chat/index', 'id'],
  // 群聊设置 /im/group-detail/:id
  [/^\/im\/group-detail\/([^/?]+)$/, '/pkg-im/im/group-detail/index', 'id'],
  // ���师详情 /instructor/:id（课程详情页讲师卡入口）
  [/^\/instructor\/([^/?]+)$/, '/pkg-course/instructor/index', 'id'],
  // 圈子详情 /circles/:id（原型风格路径，搜索结果等入口使用��
  [/^\/circles\/([^/?]+)$/, '/pkg-circle/circles/detail', 'id'],
  // 直播间观看页 /live/:id（直播卡片入口；静态 /live/xxx 均用内部完整路径，不冲突）
  [/^\/live\/([^/?]+)$/, '/pkg-live/watch/index', 'id'],
  // 诗词详情 /poetry/:id（静态 /poetry、/poetry/categories、/poetry/collections 已在 ROUTE_MAP 优先命中）
  [/^\/poetry\/([^/?]+)$/, '/pkg-poetry/detail/index', 'id'],
  // 悬赏���情 /bounty/:id（静态 /bounty、/bounty/create、/bounty/answer、/bounty/my 已在 ROUTE_MAP 优先命中）
  [/^\/bounty\/([^/?]+)$/, '/pkg-bounty/detail/index', 'id'],
  // 问答详情 /qa/:id（静态 /qa、/qa/ask、/qa/pending 已在 ROUTE_MAP ���先命中）
  [/^\/qa\/([^/?]+)$/, '/pkg-qa/detail/index', 'id'],
  // 专家详情 /expert/:id（单数；列表页为复数 /experts 已在 ROUTE_MAP 命中）
  [/^\/expert\/([^/?]+)$/, '/pkg-expert/detail/index', 'id'],
  // 举报结果详情 /report/result/:id（静态 /report、/report/result 已在 ROUTE_MAP 优先命中）
  [/^\/report\/result\/([^/?]+)$/, '/pkg-report/detail/index', 'id'],
  // 活动详情 /activity/:id（静态 /activity/calendar、/activity/landing 已在 ROUTE_MAP 优先命中）
  [/^\/activity\/([^/?]+)$/, '/pkg-activity/detail/index', 'id'],
  // 公告详情 /notices/:id（静态 /notices、/notices/upgrade 已在 ROUTE_MAP 优先命中）
  [/^\/notices\/([^/?]+)$/, '/pkg-notices/detail/index', 'id'],
  // 话题详情 /topics/:id（复数，红渐变头图版；与 /topic/:tag 单数标签聚合页区分）
  [/^\/topics\/([^/?]+)$/, '/pkg-circle/circles/topic-detail', 'id'],
  // 话题标签聚合 /topic/:tag（单数，内容流版；article/video/post 三类型卡）
  [/^\/topic\/([^/?]+)$/, '/pkg-circle/circles/topic-tag', 'tag'],
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
