// 菜单配置 — 单一声源，按角色控制可见性
// roles 为空表示所有已登录用户可见

export interface MenuItem {
  title: string;
  icon?: string;
  path?: string;
  roles?: string[];
  children?: MenuItem[];
}

const ALL_ADMIN = [
  "SUPER_ADMIN",
  "OPERATION_ADMIN",
  "CONTENT_AUDITOR",
  "FINANCE_ADMIN",
  "CUSTOMER_SERVICE",
  "GOODS_AUDITOR",
];

export const MENU_CONFIG: MenuItem[] = [
  {
    title: "工作台",
    icon: "DataBoard",
    path: "/dashboard",
    roles: ALL_ADMIN,
  },
  {
    title: "内容管理",
    icon: "Document",
    roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR"],
    children: [
      { title: "内容列表", path: "/contents" },
      { title: "内容审核", path: "/contents/audit", roles: ["SUPER_ADMIN", "CONTENT_AUDITOR"] },
      { title: "推荐管理", path: "/contents/recommend", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
    ],
  },
  {
    title: "古籍管理",
    icon: "Notebook",
    path: "/classics",
    roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR"],
  },
  {
    title: "社区管理",
    icon: "ChatDotRound",
    roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR"],
    children: [
      { title: "圈子管理", path: "/circles" },
      { title: "视频管理", path: "/videos" },
      { title: "直播管理", path: "/lives" },
      { title: "付费问答", path: "/questions" },
    ],
  },
  {
    title: "排盘工具",
    icon: "Timer",
    roles: ALL_ADMIN,
    children: [
      { title: "八字排盘", path: "/bazi" },
      { title: "紫微排盘", path: "/ziwei" },
      { title: "排盘记录", path: "/paipan-records" },
      { title: "Bot管理", path: "/bots" },
    ],
  },
  {
    title: "教学管理",
    icon: "Reading",
    roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR"],
    children: [
      { title: "课程管理", path: "/courses" },
    ],
  },
  {
    title: "用户管理",
    icon: "User",
    roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CUSTOMER_SERVICE"],
    children: [
      { title: "用户列表", path: "/users" },
      { title: "实名审核", path: "/users/identity", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      { title: "用户推送", path: "/users/push", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
    ],
  },
  {
    title: "交易管理",
    icon: "ShoppingCart",
    roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN", "GOODS_AUDITOR"],
    children: [
      { title: "订单管理", path: "/orders" },
      { title: "退款审核", path: "/orders/refund" },
      { title: "支付流水", path: "/orders/payments" },
    ],
  },
  {
    title: "会员管理",
    icon: "Medal",
    roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN"],
    children: [
      { title: "购买记录", path: "/member/purchases" },
      { title: "会员统计", path: "/member/stats" },
      { title: "会员管理", path: "/member/manage", roles: ["SUPER_ADMIN"] },
    ],
  },
  {
    title: "商城管理",
    icon: "Goods",
    roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "GOODS_AUDITOR"],
    children: [
      { title: "商品管理", path: "/products" },
      { title: "优惠券管理", path: "/coupons" },
    ],
  },
  {
    title: "营销管理",
    icon: "Present",
    roles: ["SUPER_ADMIN", "OPERATION_ADMIN"],
    children: [
      { title: "秒杀活动", path: "/marketing/flash-sales" },
      { title: "拼团活动", path: "/marketing/group-buys" },
      { title: "优惠券模板", path: "/marketing/coupons" },
      { title: "限时折扣", path: "/marketing/discounts" },
      { title: "营销活动", path: "/marketing/activities" },
      { title: "微页面管理", path: "/marketing/pages" },
    ],
  },
  {
    title: "财务管理",
    icon: "Money",
    roles: ["SUPER_ADMIN", "FINANCE_ADMIN"],
    children: [
      { title: "充值记录", path: "/recharges" },
      { title: "礼物管理", path: "/gifts" },
      { title: "对账中心", path: "/finance/reconciliation" },
      { title: "发票管理", path: "/finance/invoices" },
      { title: "结算单", path: "/finance/settlements" },
      { title: "提现审批", path: "/finance/withdrawals" },
      { title: "财务报表", path: "/finance/reports" },
      { title: "资金冻结", path: "/finance/freeze" },
    ],
  },
  {
    title: "营销分佣",
    icon: "Share",
    roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN"],
    children: [
      { title: "佣金配置", path: "/commission-config" },
      { title: "提现审核", path: "/withdrawals" },
    ],
  },
  {
    title: "风控中心",
    icon: "Warning",
    roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CUSTOMER_SERVICE"],
    children: [
      { title: "预警中心", path: "/risk/alerts" },
      { title: "风控规则", path: "/risk/rules" },
      { title: "刷单识别", path: "/risk/fraud" },
      { title: "行为轨迹", path: "/risk/timeline" },
      { title: "申诉处理", path: "/risk/appeals" },
    ],
  },
  {
    title: "AI管理",
    icon: "Cpu",
    roles: ["SUPER_ADMIN", "OPERATION_ADMIN"],
    children: [
      { title: "智能体管理", path: "/bots" },
      { title: "对话日志", path: "/ai/chat-logs" },
      { title: "调用监控", path: "/ai/call-monitor" },
      { title: "圈主助理", path: "/ai/circle-assistants" },
    ],
  },
  {
    title: "数据看板",
    icon: "DataAnalysis",
    roles: ALL_ADMIN,
    children: [
      { title: "平台总览", path: "/data/platform" },
      { title: "圈子数据", path: "/data/circle" },
      { title: "课程数据", path: "/data/course" },
      { title: "直播数据", path: "/data/live" },
      { title: "分站数据", path: "/data/station", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN"] },
    ],
  },
  {
    title: "线下管理",
    icon: "OfficeBuilding",
    roles: ["SUPER_ADMIN", "OPERATION_ADMIN"],
    children: [
      { title: "分站管理", path: "/stations" },
      { title: "线下驿站", path: "/offline-venues" },
    ],
  },
  {
    title: "通知管理",
    icon: "Bell",
    path: "/notifications",
    roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CUSTOMER_SERVICE"],
  },
  {
    title: "研究院管理",
    icon: "School",
    path: "/institutes",
    roles: ["SUPER_ADMIN", "OPERATION_ADMIN"],
  },
  {
    title: "举报管理",
    icon: "WarningFilled",
    path: "/reports",
    roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CUSTOMER_SERVICE"],
  },
  {
    title: "评论管理",
    icon: "ChatLineSquare",
    path: "/comments",
    roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR"],
  },
  {
    title: "搜索分析",
    icon: "Search",
    path: "/search-analytics",
    roles: ["SUPER_ADMIN", "OPERATION_ADMIN"],
  },
  {
    title: "系统管理",
    icon: "Setting",
    roles: ["SUPER_ADMIN"],
    children: [
      { title: "Banner管理", path: "/banners" },
      { title: "系统设置", path: "/system-settings" },
      { title: "敏感词管理", path: "/system/sensitive-words" },
      { title: "Webhook管理", path: "/system/webhooks" },
      { title: "数据导入", path: "/system/import" },
      { title: "邮件管理", path: "/system/email", roles: ["SUPER_ADMIN"] },
      { title: "虚拟币配置", path: "/system/coin-config" },
      { title: "会员配置", path: "/system/member-config" },
      { title: "运营商等级", path: "/system/operator-level" },
      { title: "角色权限", path: "/system/role-permission" },
      { title: "功能开关", path: "/system/feature-flags" },
      { title: "第三方配置", path: "/system/third-party" },
      { title: "操作日志", path: "/system/operation-logs" },
      { title: "配置版本", path: "/system/config-versions" },
      { title: "审计日志", path: "/audit-logs" },
      { title: "搜索权重", path: "/system/search-weights" },
    ],
  },
];
