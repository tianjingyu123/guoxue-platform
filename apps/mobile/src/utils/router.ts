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
  '/workspace': '/pkg-workspace/index/index', // 从业者工作台
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
  // 课程 V0 重构（2026-07-11·17→10 页收敛）：列表/市场并入 P1 首页，courses-list 别名重定向到首页（兼容存量入站链接）
  '/courses-list': '/pkg-course/home/index',
  // 我的学习 P4（全局·吸收 study-plan）；须优先于动态 /courses/:id
  '/courses/my-learning': '/pkg-course/learn/index',
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
  // 八字历史记录簇（分组编辑 groups 须先于通配匹配）
  // 名人案例库已下线（2026-07-14）：原页的名人八字是编的——实证「康熙 1654-05-04」月柱应为戊辰，
  // 原页写丙寅；且把在世人物（马云）的虚构八字当案例展示，权威平台不能发。要重上须有可考生辰的策展数据。
  '/paipan/bazi/history/groups': '/pkg-paipan/bazi/history/groups',
  '/paipan/bazi/history': '/pkg-paipan/bazi/history/index',
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
  // V0 排盘工具批（2026-07-10 版还原）：万年历/梅花/小六壬/孔明/罗盘/紫微
  '/paipan/wannianli': '/pkg-paipan/wannianli/index',
  '/paipan/qizheng': '/pkg-paipan/qizheng/index',
  '/paipan/qizheng/result': '/pkg-paipan/qizheng/result',
  '/paipan/hepan': '/pkg-paipan/hepan/index',
  '/paipan/hepan/result': '/pkg-paipan/hepan/result',
  '/paipan/hepan/history': '/pkg-paipan/hepan/history/index',
  // 六爻：2026-07-14 重做为 V0 版并迁至 pkg-paipan2（与 liuyao-engine 同分包，本地装卦，73/73 黄金测试）。
  // 旧的 pkg-paipan/liuyao/* + lib/liuyao-result-data.ts 是 `if(true) return _mock` 假盘，已删除。
  '/paipan/liuyao': '/pkg-paipan2/liuyao/index',
  '/paipan/liuyao/result': '/pkg-paipan2/liuyao/result',
  '/paipan/liuyao/history': '/pkg-paipan2/liuyao/history/index',
  '/paipan/meihua': '/pkg-paipan/meihua/index',
  '/paipan/meihua/result': '/pkg-paipan/meihua/result',
  '/paipan/meihua/history': '/pkg-paipan/meihua/history/index',
  '/paipan/xiaoliuren': '/pkg-paipan/xiaoliuren/index',
  '/paipan/xiaoliuren/history': '/pkg-paipan/xiaoliuren/history/index',
  '/paipan/kongming': '/pkg-paipan/kongming/index',
  '/paipan/luopan': '/pkg-paipan/luopan/index',
  '/paipan/ziwei': '/pkg-paipan/ziwei/index',
  '/paipan/ziwei/result': '/pkg-paipan/ziwei/result',
  // V0 排盘第二批（占卜类）：大六壬/金口诀/金钱课/小成图/太乙/诸葛
  '/paipan/daliuren': '/pkg-paipan/daliuren/index',
  '/paipan/daliuren/result': '/pkg-paipan/daliuren/result',
  '/paipan/jinkoujue': '/pkg-paipan/jinkoujue/index',
  '/paipan/jinkoujue/result': '/pkg-paipan/jinkoujue/result',
  '/paipan/jinqianke': '/pkg-paipan/jinqianke/index',
  '/paipan/xiaochengtu': '/pkg-paipan/xiaochengtu/index',
  '/paipan/xiaochengtu/result': '/pkg-paipan/xiaochengtu/result',
  '/paipan/taiyi': '/pkg-paipan/taiyi/index',
  '/paipan/taiyi/result': '/pkg-paipan/taiyi/result',
  '/paipan/zhuge': '/pkg-paipan2/zhuge/index',
  '/paipan/zhuge/result': '/pkg-paipan2/zhuge/result',
  // V0 排盘第三批（奇门风水类）
  '/paipan/yinpan': '/pkg-paipan/yinpan/index',
  '/paipan/yinpan/result': '/pkg-paipan/yinpan/result',
  '/paipan/yinpan/history': '/pkg-paipan/yinpan/history/index',
  '/paipan/yinpan-mingli': '/pkg-paipan/yinpan-mingli/index',
  '/paipan/yinpan-mingli/result': '/pkg-paipan/yinpan-mingli/result',
  '/paipan/feigong': '/pkg-paipan/feigong/index',
  '/paipan/feigong/result': '/pkg-paipan/feigong/result',
  '/paipan/chuanren': '/pkg-paipan/chuanren/index',
  '/paipan/chuanren/result': '/pkg-paipan/chuanren/result',
  '/paipan/shanxiang': '/pkg-paipan/shanxiang/index',
  '/paipan/shanxiang/result': '/pkg-paipan/shanxiang/result',
  '/paipan/lijichi': '/pkg-paipan/lijichi/index',
  '/paipan/lijichi/result': '/pkg-paipan/lijichi/result',
  '/paipan/lijichi/history': '/pkg-paipan/lijichi/history/index',
  '/paipan/xuankong': '/pkg-paipan/xuankong/index',
  '/paipan/xuankong/result': '/pkg-paipan/xuankong/result',
  '/paipan/xuankong/history': '/pkg-paipan/xuankong/history/index',
  '/paipan/bazhai': '/pkg-paipan/bazhai/index',
  '/paipan/bazhai/result': '/pkg-paipan/bazhai/result',
  '/paipan/bazhai/history': '/pkg-paipan/bazhai/history/index',
  // V0 排盘第四批（姓名数字+五运六气）
  '/paipan/qiming': '/pkg-paipan2/qiming/index',
  '/paipan/qiming/result': '/pkg-paipan2/qiming/result',
  '/paipan/qiming/detail': '/pkg-paipan2/qiming/detail',
  '/paipan/qiming/history': '/pkg-paipan2/qiming/history/index',
  '/paipan/xingming': '/pkg-paipan2/xingming/index',
  '/paipan/xingming/result': '/pkg-paipan2/xingming/result',
  '/paipan/xingming/history': '/pkg-paipan2/xingming/history/index',
  '/paipan/shuzi': '/pkg-paipan2/shuzi/index',
  '/paipan/wuyunliuqi': '/pkg-paipan/wuyunliuqi/index',
  // 国学字典（释义走后端 /zidian，其余 24 字段前端本地算）
  '/paipan/zidian': '/pkg-paipan2/zidian/index',
  // 二十四节气工具页（V0 app/jieqi）——注意与 pkg-solar-term「节气仪式」打卡运营页不是一回事
  '/paipan/jieqi': '/pkg-paipan/jieqi/index',
  // 工具占位页（30+ 未上线工具入口，name 参数透传；命理/中医两个前缀同指一页）
  '/paipan/tools/coming-soon': '/pkg-paipan/tools/coming-soon',
  '/tools/coming-soon': '/pkg-paipan/tools/coming-soon',
  '/paipan/ziwei/history': '/pkg-paipan/ziwei/history/index',
  // 商城
  '/mall': '/pkg-mall/home/index',
  '/mall/category': '/pkg-mall/category/index',
  // 商品评价（入口不带 id，静态须优先于动态 /mall/product/:id/reviews）
  '/mall/product/reviews': '/pkg-mall/product/reviews',
  /* ── 商城收敛（2026-07-11 砍孤岛）：旧 pkg-shop 孤岛页已删，
   * 旧别名一律重定向到真版，防外部旧链接/分享链接 404 ── */
  '/shop': '/pkg-mall/home/index', // 旧 shop 首页 → mall 首页
  '/shop/compare': '/pkg-mall/home/index', // 对比死页(无真版) → mall 首页
  '/shop/categories': '/pkg-mall/category/index', // 旧分类 → mall 分类
  // 为你推荐"更多"入口（原型无独立商品列表页，复用 mall 分类浏览页；静态须优先于动态 /shop/:id）
  '/shop/products': '/pkg-mall/category/index',
  // 商城内搜索入口（原型无独立 shop 搜索页，复用全局搜索页）
  '/shop/search': '/pkg-search/search/index',
  '/shop/reviews': '/pkg-mall/product/reviews', // 旧评价 → mall 商品评价
  '/shop/exchange': '/pkg-shop/exchange/index',
  // 营销活动
  '/shop/flash-sale': '/pkg-shop/flash-sale/index',
  '/shop/group-buy': '/pkg-shop/group-buy/index',
  '/shop/group-buy-success': '/pkg-shop/group-buy/success',
  '/shop/group-buy-fail': '/pkg-shop/group-buy/fail',
  '/shop/coupons': '/pkg-shop/coupons/index',
  '/shop/coupon-detail': '/pkg-shop/coupon-detail/index',
  // 购物车 / 结算 / 支付（收敛后单轨：旧 /cart /checkout 别名重定向到真版 sku 购物车 / index 结算）
  '/cart': '/pkg-shop/cart/sku', // 旧购物车已删 → 真版 SKU 购物车
  '/shop/cart': '/pkg-shop/cart/sku',
  '/checkout': '/pkg-shop/checkout/index', // 假结算页已删 → 真版结算
  '/shop/checkout': '/pkg-shop/checkout/index',
  '/shop/paying': '/pkg-shop/paying/index',
  '/shop/pay-success': '/pkg-shop/pay-success/index',
  '/shop/pay-fail': '/pkg-shop/pay-fail/index',
  '/shop/pay-timeout': '/pkg-shop/pay-timeout/index',
  '/shop/payment-methods': '/pkg-settings/payment-methods/index', // 无后端死页已删 → 设置-支付方式
  '/payment/result': '/pkg-shop/pay-success/index',
  // 订单中心
  '/orders': '/pkg-order/list/index',
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
  '/address': '/pkg-account/address/index',
  /* 设置中心 —— 唯一真源 = pkg-mine（真连后端）。pkg-settings 的账号安全类页是 mock 假页
   * （硬编码 138****8888、假验证码、假黑名单写死 3 个陌生人），本轮（2026-07-14）整批退役剥离。
   * 别名保留并改指真页（而非删除）：防存量分享链接/外部入站链接 404。
   * pkg-settings 仅保留「无替代」的页：五个法务合规页 + payment-methods + privacy（见下）。 */
  '/settings': '/pkg-mine/settings/index',
  '/settings/notifications': '/pkg-mine/notifications/index',
  '/settings/phone': '/pkg-mine/change-phone/index',
  '/settings/password': '/pkg-mine/change-password/index',
  '/settings/payment-password': '/pkg-mine/payment-password/index',
  '/settings/blacklist': '/pkg-mine/blacklist/index', // 原指假页：写死「用户123456/匿名用户/神秘访客」+unsplash 真人头像
  '/settings/bindaccount': '/pkg-mine/bind-accounts/index',
  '/settings/delete-account': '/pkg-mine/delete-account/index',
  // ⚠️ 存疑保留：pkg-settings/privacy 是「个人信息可见性」开关（0 个 API，开关不落库=假），
  //    与 pkg-mine/privacy-authorization（系统权限授权·真连）不是同一功能，无真替代。待拍板：接后端 or 砍入口。
  '/settings/privacy': '/pkg-settings/privacy/index',
  '/settings/payment-methods': '/pkg-settings/payment-methods/index', // 无 pkg-mine 替代，暂留
  /* 个人中心 · 设置与账号安全 —— ✅ 这一套（pkg-mine）才是真连后端的现役唯一真源。
   * 🔴 原注释写的是「第②套，旧版，待废弃」——写反了，是本次审计（2026-07-14）挖出的最危险的雷：
   *    照它清理会删掉真页、留下 pkg-settings 的 mock 假页（硬编码 138****8888 + 假验证码）。
   *    pkg-settings 的账号安全类页已全部退役剥离，勿再指回。 */
  '/mine/notes': '/pkg-mine/notes/index',
  '/mine/settings': '/pkg-mine/settings/index',
  '/mine/security': '/pkg-mine/security/index',
  /* 实名认证 —— 后端 identity 模块早已做完但前端零调用；账号安全页的「实名认证」原本
   * href 指向 /mine/security（页面自己）→ 点了原地跳回，是个死循环。2026-07-14 新建真页接线。 */
  '/mine/verification': '/pkg-mine/verification/index',
  '/mine/change-password': '/pkg-mine/change-password/index',
  '/mine/change-phone': '/pkg-mine/change-phone/index',
  '/mine/payment-password': '/pkg-mine/payment-password/index',
  '/mine/bind-accounts': '/pkg-mine/bind-accounts/index',
  // 个人中心 - 隐私与账号管理
  '/mine/privacy-authorization': '/pkg-mine/privacy-authorization/index',
  '/mine/blacklist': '/pkg-mine/blacklist/index',
  '/mine/teen-mode': '/pkg-mine/teen-mode/index',
  '/notifications': '/pkg-mine/notifications/index',
  '/legal/teen-mode-intro': '/pkg-mine/teen-mode-intro/index',
  '/legal/third-party-sdk': '/pkg-settings/third-party-sdk/index',
  '/legal/data-collection-list': '/pkg-settings/data-collection-list/index',
  '/legal/user-agreement': '/pkg-settings/user-agreement/index',
  '/legal/privacy-policy': '/pkg-settings/privacy-policy/index',
  '/legal/child-privacy': '/pkg-settings/child-privacy/index',
  '/mine/data-export': '/pkg-mine/data-export/index',
  '/mine/delete-account': '/pkg-mine/delete-account/index',
  '/mine/delete-account-result': '/pkg-mine/delete-account-result/index',
  /* 钱包中心 —— 唯一真源 = pkg-mine/wallet（真连余额/充值/提现/流水·2026-07-14 资金架构批）。
   * 🔴 原映射把 /wallet 指向 pkg-wallet（零 API 调用、硬编码 1280 假币的死页），
   *    还注释成「第①套活套」、把真钱包标成「旧版待评估降级」——完全写反。
   *    走 /wallet 别名的入口看到的是假余额。pkg-wallet 整包已退役剥离，别名一律改指真页
   *    （保留别名而非删除：防存量分享链接/外部入站链接 404）。 */
  '/wallet': '/pkg-mine/wallet/index',
  '/wallet/bank-cards': '/pkg-mine/wallet/withdraw', // 旧「银行卡」→ 真提现页（绑卡在提现流程内）
  '/wallet/bill': '/pkg-mine/wallet/transactions', // 旧「账单」→ 真流水页
  '/mine/wallet': '/pkg-mine/wallet/index',
  '/wallet/recharge': '/pkg-mine/wallet/recharge',
  '/wallet/withdraw': '/pkg-mine/wallet/withdraw',
  '/wallet/withdraw-records': '/pkg-mine/wallet/withdraw-records',
  '/wallet/transactions': '/pkg-mine/wallet/transactions',
  '/mine/points': '/pkg-mine/points/index',
  '/mine/history': '/pkg-mine/history/index',
  '/history': '/pkg-mine/browse-history/index',
  '/likes': '/pkg-mine/likes/index', // 我的点赞(顶级活页,profile顶部"获赞"指向;/mine/my-likes为孤岛旧版)
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
  '/reservations': '/pkg-mine/reservations/index',
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
  // 帮助中心（B级展示页，profile菜单入口）
  '/help': '/pkg-help/index/index',
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
  // ===== V0 6.24 新增14条静态路由 =====
  '/login/forgot-password': '/pkg-auth/forgot-password/index',
  '/renew': '/pkg-profile/renew/index',
  '/courses': '/pkg-course/home/index',
  // （死入口大扫除：/admin/user-audit、/admin/batch-coupon-send 两条死映射已删——目标页已从 pkg-mine 路由移除且全库无调用方）
  '/splash': '/pkg-common/splash/index',
  '/poster': '/pkg-common/poster/index',
  '/result': '/pkg-common/result/index',
  '/publish/video': '/pkg-video/publish/index',
  '/teacher/dashboard': '/pkg-creator/teacher-dashboard/index',
  '/teacher-certification': '/pkg-creator/teacher-certification/index',
  '/my-circles': '/pkg-circle/my-circles/index',
  // 圈子静态子页（必须有静态别名，否则被动态 /circles/:id 抢占当成圈子 id → 详情错误页）
  '/circles/create': '/pkg-circle/circles/create',
  '/circles/stats': '/pkg-circle/circles/stats',
  '/circles/activities': '/pkg-circle/circles/activities',
  '/circles/badges': '/pkg-circle/circles/badges',
  '/rankings': '/pkg-circle/rankings/index',
  '/articles': '/pkg-circle/articles/index',
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
  // 智能体广场（去重：原 pkg-agent/bots/index 纯 mock 页已删除，统一指向真实化的 agents/index）
  '/bots': '/pkg-agent/agents/index',
  // Bot 对话页（接 ?id= query，circles/bots 和广场都跳此）
  '/bots/chat': '/pkg-agent/bots/chat/index',

  /* ───────── 断链修复（2026-06-22 排查）─────────
   * 以下 proto 路径在代码中被 navigateTo 调用，但此前缺映射，跳转会落到
   * toastComingSoon() 兜底（用户点击只看到"敬请期待"）。目标 vue 页均已存在且在
   * pages.json 注册，仅补别名即可恢复可达。详见 vue3/MIGRATION_NOTES.md。 */
  '/discover': '/pages/discover/index', // tab 页：收藏/下载空态"去发现内容"，需走 reLaunch
  '/profile': '/pages/profile/index', // tab 页：扫码结果/帮助页跳个人中心
  '/courses/study-plan': '/pkg-course/learn/index', // 学习计划已并入 P4 我的学习（别名重定向）
  '/seckill/rules': '/pkg-shop/flash-sale/index', // 重复秒杀页已删（含规则子页）→ 真版秒杀 flash-sale
  '/station/earnings': '/pkg-operator/station-earnings/index', // 站长面板→收益（运营端）
  /* 站长面板九宫格的另 5 个入口（2026-07-14 补）：页面早已做完且在 pages.json 注册，
   * 只是别名从未登记 → resolve() 原样返回 → navigateTo 失败 → 统一弹「功能开发中」。
   * 站长点九宫格 9 个格子有 5 个点不动，是"流程串不起来"的典型现场。
   * 入口定义见 lib/operator-data.ts stationPanelQuickActions。 */
  '/station/promote': '/pkg-operator/station-promote/index',
  '/station/team': '/pkg-operator/team/index', // 注意目标是 team 不是 station-team（后者不存在）
  '/station/materials': '/pkg-operator/station-materials/index',
  '/station/config': '/pkg-operator/station-config/index',
  '/station/assistant': '/pkg-operator/station-assistant/index',
  '/publish': '/pkg-circle/circles/publish', // 草稿箱→发布
  '/content/community-rules': '/pkg-report/community-rules/index', // 举报详情→社区规范（本轮新迁页）
  // 积分中心（顶级活页，profile/wallet 顶部"积分"指向；页早已迁好仅缺映射）。/mine/points 为孤岛旧版
  '/points': '/pkg-mine/points/index',
  '/points/exchange': '/pkg-mine/points/exchange/index',
  '/points/history': '/pkg-mine/points/history/index',
  '/points/tasks': '/pkg-mine/points/tasks/index',
  // 找回账号（设置-手机页「找回原账号」指向；本轮新迁 pkg-auth/recover）
  '/auth/recover': '/pkg-auth/recover/index',
  // 智能客服（/customer-service 已在前面映射；这里仅补 /agent 前缀的调用方）
  '/agent/customer-service': '/pkg-agent/agent/customer-service',
  // 秒杀首页（重复 seckill 页已删 → 真版秒杀 flash-sale，同端点两套 UI 收敛为一）
  '/seckill': '/pkg-shop/flash-sale/index',
  // 隐私政策（设置页"隐私政策"指向；页已迁好仅缺映射）
  '/policy/privacy': '/pkg-settings/privacy-policy/index',
  // 用户服务协议（设置页"服务协议"指向；页已迁好仅缺映射）
  '/terms/service': '/pkg-settings/user-agreement/index',
  // 驿站公告（站长面板"公告"指向；页已迁好仅缺映射）
  '/station/notices': '/pkg-notices/index/index',
  // 命理 AI 解盘 / 历史记录（原型自身即死链——proto 无 paipan/ai 与 paipan/history 页，仅 tools/coming-soon）。指向已迁占位页优雅提示"功能开发中"
  '/paipan/ai': '/pkg-paipan/ai/index', // AI 智能解盘（后端能力早已就绪·2026-07-14 接上）
  '/paipan/history': '/pkg-paipan/history/index', // 全部排盘记录（跨工具聚合·2026-07-14 修死链）
  '/paipan/cases': '/pkg-paipan/cases/index', // 八字案例库（练手 · 同类八字参考）
  '/paipan/cases/submit': '/pkg-paipan/cases/submit', // 投稿案例
  // offline 线下板块整体暂缓未迁，但已上线页（讲师中心/我的预约）有调用 → 指向通用 coming-soon 占位避免断链。
  // 线下板块 C 端：讲师预约/线下活动/课程签到（接 ?stationId=/teacherId=/courseId= query）
  '/offline/teacher-booking': '/pkg-offline/teacher-booking/index',
  '/offline/events': '/pkg-offline/events/index',
  '/offline/checkin': '/pkg-offline/checkin/index',
  // 线下驿站 B 端运营者经营后台（工作台 + 课程/签到/商品/讲师管理）
  '/offline/manage': '/pkg-offline/manage/index',
  '/offline/manage/courses': '/pkg-offline/manage-courses/index',
  '/offline/manage/checkin': '/pkg-offline/manage-checkin/index',
  '/offline/manage/products': '/pkg-offline/manage-products/index',
  '/offline/manage/teachers': '/pkg-offline/manage-teachers/index',
  // 线下驿站 C 端（驿站列表 + 详情，详情 /offline/stations/:id 见动态表）
  '/offline/stations': '/pkg-offline/stations/index',
  // 线下课程 C 端（课程列表 + 详情，详情 /offline/courses/:id 见动态表）
  '/offline/courses': '/pkg-offline/courses/index',
  // 短视频列表 / 搜索（v0新迁，video-card 浮窗发布按钮、同城feed视频卡等入口）
  '/videos': '/pkg-video/list/index',
  '/videos/search': '/pkg-video/search/index',
  // 视频���布(列表页/creator页发布入口)：三步select->edit->publish+商品带货佣金。/publish/video孤儿页(仅drafts链接,未迁)跳过
  '/videos/publish': '/pkg-video/publish/index',
  // 视频创作者中心(发布页"商品管理"入口、首页内6页跳转)。原型嵌套路径->扁平vue路径
  '/videos/creator': '/pkg-video/creator/index',
  // C 档收敛（2026-07-11 短视频 V0 重构）：analytics 并入 creator 首页 / sales+withdraw 并入 earnings-history / products-add 退役（创作者不自建商品，改「去选品」）
  '/videos/creator/earnings-history': '/pkg-video/creator/earnings-history/index',
  '/videos/creator/settings': '/pkg-video/creator/settings/index',
  // 商家入驻链路（引导→申请→状态中枢→编辑/签约/保证金/协议）。原型嵌套路径->扁平vue路径
  '/merchant/join': '/pkg-merchant/join/index',
  '/merchant/apply': '/pkg-merchant/apply/index',
  '/merchant/application-status': '/pkg-merchant/application-status/index',
  '/merchant/edit-application': '/pkg-merchant/edit-application/index',
  '/merchant/sign-agreement': '/pkg-merchant/sign-agreement/index',
  '/merchant/pay-deposit': '/pkg-merchant/pay-deposit/index',
  '/terms/merchant': '/pkg-merchant/terms/index',
  // 商家经营管理（核心交易闭环）
  '/merchant/dashboard': '/pkg-merchant/dashboard/index',
  '/merchant/products': '/pkg-merchant/products/index',
  '/merchant/product-edit': '/pkg-merchant/product-edit/index',
  '/merchant/orders': '/pkg-merchant/orders/index',
  '/merchant/order-detail': '/pkg-merchant/order-detail/index',
  '/merchant/revenue': '/pkg-merchant/revenue/index',
  // 商家经营管理（评价/分析/设置/预览/公告/咨询）
  '/merchant/reviews': '/pkg-merchant/reviews/index',
  '/merchant/analytics': '/pkg-merchant/analytics/index',
  '/merchant/profile': '/pkg-merchant/profile/index',
  '/merchant/shop-preview': '/pkg-merchant/shop-preview/index',
  '/merchant/notices': '/pkg-merchant/notices/index',
  '/merchant/inquiries': '/pkg-merchant/inquiries/index',
  '/merchant/content-stats': '/pkg-merchant/content-stats/index',
  '/merchant/circle-bindding': '/pkg-merchant/circle-bindding/index',
  '/merchant/violations': '/pkg-merchant/violations/index',
  // 研究院（书院）：首页 + 讲师广场 + 活动列表 + 讲师申请（详情页为动态 /institute/instructors|events/:id）
  '/institute': '/pkg-institute/index/index',
  '/institute/instructors': '/pkg-institute/instructors/index',
  '/institute/events': '/pkg-institute/events/index',
  '/institute/apply': '/pkg-institute/apply/index',
  // 讲师工作台第二批：我的任务 / 线下老师人才库 / 课程需求大厅 / 发布师资需求
  // 注：/institute/teacher-demand/create（发布师资需求表单）须先于动态 /institute/teacher-demand 段匹配，置于静态表优先命中
  '/institute/my-tasks': '/pkg-institute/my-tasks/index',
  '/institute/teacher-pool': '/pkg-institute/teacher-pool/index',
  '/institute/teacher-demand': '/pkg-institute/teacher-demand/index',
  '/institute/teacher-demand/create': '/pkg-institute/demand-create/index',
  // 成员管理第三批：成员列表 / 成员申请四步向导 / 发布通用需求（成员详情 /institute/members/:id 复用讲师详情页，见动态表）
  '/institute/members': '/pkg-institute/members/index',
  '/institute/member-apply': '/pkg-institute/member-apply/index',
  // 研究院管理端（院长/副院长/秘书长：审批/任命/荐才/财务分红）
  '/institute/manage': '/pkg-institute/manage/index',
  '/institute/demands/create': '/pkg-institute/demands-create/index',
  // 赛事（竞技人才选拔）：列表/往届静态；详情/报名/答题/成绩/排行/证书/海报为动态（见 DYNAMIC_ROUTES）
  '/competition': '/pkg-competition/home/index',
  '/competition/home': '/pkg-competition/home/index',
  '/competition/archive': '/pkg-competition/archive/index',

  /* ───────── 横向贯通·入口死链补全（2026-06-28）───────── */
  // 分站运营商/站长经营后台（operator-data 入口曾指向 /operator/dashboard 等均无映射）
  '/operator': '/pkg-operator/operator-panel/index',
  '/operator/dashboard': '/pkg-operator/dashboard/index',
  '/operator/quota': '/pkg-operator/quota/index',
  '/operator/station-master-panel': '/pkg-operator/station-master-panel/index',
  '/join/operator': '/pkg-operator/join-operator/index',
  '/join/station': '/pkg-operator/join-station/index',
  // 主播中心（直播控制台；profile streamer 身份入口此前死链）
  '/creator/live/console': '/pkg-live/console/index',
}

/**
 * 动态路由映射：原型 /mall/product/123 → uni /pkg-mall/product/detail?id=123
 * 每条 [正则, 目标页, 参数名]，命中��把捕获组拼为 query。迁移含 :id 的页登记于此。
 * 注意顺序：更具体的 /reviews 必须在通用 detail 之前匹配。
 */
const DYNAMIC_ROUTES: Array<[RegExp, string, string]> = [
  // 赛事子页（具体路径须先于通用 /competition/:id 详情匹配；静态 /competition/home|archive 已在 ROUTE_MAP 优先命中）
  [/^\/competition\/([^/?]+)\/register$/, '/pkg-competition/register/index', 'id'],
  [/^\/competition\/([^/?]+)\/quiz$/, '/pkg-competition/quiz/index', 'id'],
  [/^\/competition\/([^/?]+)\/result$/, '/pkg-competition/result/index', 'id'],
  [/^\/competition\/([^/?]+)\/score-detail$/, '/pkg-competition/score-detail/index', 'id'],
  [/^\/competition\/([^/?]+)\/certificate$/, '/pkg-competition/certificate/index', 'id'],
  [/^\/competition\/([^/?]+)\/poster$/, '/pkg-competition/poster/index', 'id'],
  [/^\/competition\/([^/?]+)$/, '/pkg-competition/detail/index', 'id'],
  // 短视频全屏播放详情（/video/:id；video-card 等多处已上线页跳此，原为断链）
  [/^\/video\/([^/?]+)$/, '/pkg-video/detail/index', 'id'],
  // 研究院讲师详情 /institute/instructors/:id（静态 /institute/instructors 已在 ROUTE_MAP 优先命中）
  [/^\/institute\/instructors\/([^/?]+)$/, '/pkg-institute/instructor-detail/index', 'id'],
  // 研究院活动详情 /institute/events/:id（静态 /institute/events 已在 ROUTE_MAP 优先命中）
  [/^\/institute\/events\/([^/?]+)$/, '/pkg-institute/event-detail/index', 'id'],
  // 研究院成员详情 /institute/members/:id（原型该页直接复用讲师详情组件，故复用 instructor-detail；静态 /institute/members 已优先命中）
  [/^\/institute\/members\/([^/?]+)$/, '/pkg-institute/instructor-detail/index', 'id'],
  // 课程需求详情 /institute/demands/:id 暂未迁（demands/create 已迁）→ coming-soon 占位避免断链（静态 /institute/demands/create 已优先命中）
  [/^\/institute\/demands\/([^/?]+)$/, '/pkg-paipan/tools/coming-soon', 'id'],
  // 线下课程详情 /offline/courses/:id（静态 /offline/courses 已在 ROUTE_MAP 优先命中）
  [/^\/offline\/courses\/([^/?]+)$/, '/pkg-offline/course-detail/index', 'id'],
  // 线下驿站详情 /offline/stations/:id（静态 /offline/stations 已在 ROUTE_MAP 优先命中）
  [/^\/offline\/stations\/([^/?]+)$/, '/pkg-offline/station-detail/index', 'id'],
  // 用户公开主页 /user/:id（IM联系人/好友请求/关注列表点头像跳转，此前缺映射→死链"功能开发中"）
  [/^\/user\/([^/?]+)$/, '/pkg-circle/user/profile', 'id'],
  [/^\/authors\/([^/?]+)$/, '/pkg-paipan/tools/coming-soon', 'id'],
  [/^\/mall\/product\/([^/?]+)\/reviews$/, '/pkg-mall/product/reviews', 'id'],
  [/^\/mall\/product\/([^/?]+)$/, '/pkg-mall/product/detail', 'id'],
  [/^\/shop\/group-buy\/([^/?]+)$/, '/pkg-shop/group-buy/detail', 'id'],
  // 订单详情 / 评价（/reviews 规则��具体，须在通用 detail 之前）
  [/^\/orders\/([^/?]+)\/review$/, '/pkg-order/review/index', 'id'],
  [/^\/orders\/([^/?]+)$/, '/pkg-order/detail/index', 'id'],
  // 售后详情（/shop/after-sale/:id；静态 /shop/after-sale 已在 ROUTE_MAP 优先命中）
  [/^\/shop\/after-sale\/([^/?]+)$/, '/pkg-account/after-sale-detail/index', 'id'],
  // shop 商品评价（/shop/:id/reviews 更具体，须在通用商品详情之前��
  // shop C 端店铺主页（/shop/store/:merchantId 两段，须先于通用 /shop/:id 单段兜底）
  [/^\/shop\/store\/([^/?]+)$/, '/pkg-shop/store/index', 'id'],
  [/^\/shop\/([^/?]+)\/reviews$/, '/pkg-mall/product/reviews', 'id'], // 旧 shop 评价页已删 → mall 商品评价
  // shop 商品详情兜底（/shop/:id；旧 pkg-shop/product 已删 → mall 商品详情；所有 /shop/xxx 静态页已在 ROUTE_MAP 优先命中）
  [/^\/shop\/([^/?]+)$/, '/pkg-mall/product/detail', 'id'],
  // 课程详情系列（/courses/:id/xxx 更具体须在通用详情之前；静态 /courses/xxx 已在 ROUTE_MAP 优先命中）
  // V0 重构：chapters 目录并入详情、purchase 改详情半屏弹层、complete 完课态并入播放页 → 三条 regex 退役
  [/^\/courses\/([^/?]+)\/player$/, '/pkg-course/player/index', 'id'],
  [/^\/courses\/([^/?]+)\/reviews$/, '/pkg-course/reviews/index', 'id'], // F3 评价列表（学员/讲师双视角）
  [/^\/courses\/([^/?]+)\/qa$/, '/pkg-course/qa/index', 'id'], // F4 课程问答
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
  // 圈子详情 /circles/:id（原型��格路径，搜索结果等入口使用��
  [/^\/circles\/([^/?]+)$/, '/pkg-circle/circles/detail', 'id'],
  // 直播间观看页 /live/:id（直播卡片入口；静态 /live/xxx 均用内部完整路径，不冲突）
  [/^\/live\/([^/?]+)$/, '/pkg-live/watch/index', 'id'],
  // 古籍详情 /classic/:id（供"我的收藏"等统一入口跳转；古籍馆内部多用全路径 /pkg-classics/detail/index）
  [/^\/classic\/([^/?]+)$/, '/pkg-classics/detail/index', 'id'],
  // 悬赏���情 /bounty/:id（静态 /bounty、/bounty/create、/bounty/answer、/bounty/my 已在 ROUTE_MAP 优先命中）
  [/^\/bounty\/([^/?]+)$/, '/pkg-bounty/detail/index', 'id'],
  // 通用内容页 /content/:slug（静态如 /content/community-rules 优先命中）
  [/^\/content\/([^/?]+)$/, '/pkg-common/content/index', 'slug'],
  // 举报结果详情 /report/result/:id（静态 /report、/report/result 已在 ROUTE_MAP 优先命中）
  [/^\/report\/result\/([^/?]+)$/, '/pkg-report/detail/index', 'id'],
  // 活动详情 /activity/:id（静态 /activity/calendar、/activity/landing 已在 ROUTE_MAP 优先命中）
  [/^\/activity\/([^/?]+)$/, '/pkg-activity/detail/index', 'id'],
  // 公告详情 /notices/:id（静态 /notices、/notices/upgrade 已在 ROUTE_MAP 优先命中）
  [/^\/notices\/([^/?]+)$/, '/pkg-notices/detail/index', 'id'],
  // 话题标签聚合 /topic/:tag 与 /topics/:tag（均指向标签聚合页，按话题名取 GET /tags/:name/posts）
  [/^\/topics?\/([^/?]+)$/, '/pkg-circle/circles/topic-tag', 'tag'],
  // 智能体对话 /agent/:id（广场/排行卡片跳此；静态 /agent/main、/agent/customer-service 已在 ROUTE_MAP 优先命中）
  [/^\/agent\/([^/?]+)$/, '/pkg-agent/agent/chat', 'id'],
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
