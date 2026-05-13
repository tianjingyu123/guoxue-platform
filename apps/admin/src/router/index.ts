import { createRouter, createWebHistory } from "vue-router";

// 所有管理角色
const ALL_ADMIN = [
  "SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR",
  "FINANCE_ADMIN", "CUSTOMER_SERVICE", "GOODS_AUDITOR",
];

const routes = [
  {
    path: "/login",
    name: "Login",
    component: () => import("@/views/Login.vue"),
    meta: { guest: true },
  },
  {
    path: "/",
    name: "Layout",
    component: () => import("@/views/Layout.vue"),
    redirect: "/dashboard",
    children: [
      // === 工作台 ===
      {
        path: "dashboard",
        name: "Dashboard",
        component: () => import("@/views/Dashboard.vue"),
        meta: { title: "仪表盘", roles: ALL_ADMIN },
      },
      // === 角色工作台 ===
      {
        path: "dashboard/super-admin",
        name: "SuperAdminDashboard",
        component: () => import("@/views/dashboard/SuperAdminDashboard.vue"),
        meta: { title: "超级管理员工作台", roles: ["SUPER_ADMIN"] },
      },
      {
        path: "dashboard/operation",
        name: "OperationDashboard",
        component: () => import("@/views/dashboard/OperationDashboard.vue"),
        meta: { title: "运营工作台", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "dashboard/finance",
        name: "FinanceDashboard",
        component: () => import("@/views/dashboard/FinanceDashboard.vue"),
        meta: { title: "财务工作台", roles: ["SUPER_ADMIN", "FINANCE_ADMIN"] },
      },
      {
        path: "dashboard/customer-service",
        name: "CustomerServiceDashboard",
        component: () => import("@/views/dashboard/CustomerServiceDashboard.vue"),
        meta: { title: "客服工作台", roles: ["SUPER_ADMIN", "CUSTOMER_SERVICE"] },
      },
      {
        path: "dashboard/content-audit",
        name: "ContentAuditDashboard",
        component: () => import("@/views/dashboard/ContentAuditDashboard.vue"),
        meta: { title: "内容审核工作台", roles: ["SUPER_ADMIN", "CONTENT_AUDITOR"] },
      },
      {
        path: "dashboard/goods-audit",
        name: "GoodsAuditDashboard",
        component: () => import("@/views/dashboard/GoodsAuditDashboard.vue"),
        meta: { title: "商品审核工作台", roles: ["SUPER_ADMIN", "GOODS_AUDITOR"] },
      },
      // === 内容管理 ===
      {
        path: "contents",
        name: "ContentList",
        component: () => import("@/views/ContentList.vue"),
        meta: { title: "内容管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR"] },
      },
      {
        path: "contents/create",
        name: "ContentCreate",
        component: () => import("@/views/ContentEdit.vue"),
        meta: { hidden: true, title: "新建内容", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR"] },
      },
      {
        path: "contents/:id/edit",
        name: "ContentEdit",
        component: () => import("@/views/ContentEdit.vue"),
        meta: { hidden: true, title: "编辑内容", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR"] },
      },
      {
        path: "contents/audit",
        name: "ContentAudit",
        component: () => import("@/views/content/ContentAudit.vue"),
        meta: { title: "内容审核", roles: ["SUPER_ADMIN", "CONTENT_AUDITOR"] },
      },
      {
        path: "contents/recommend",
        name: "ContentRecommend",
        component: () => import("@/views/content/ContentRecommend.vue"),
        meta: { title: "推荐管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      // === 古籍 ===
      {
        path: "classics",
        name: "ClassicList",
        component: () => import("@/views/classics/ClassicList.vue"),
        meta: { title: "古籍管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR"] },
      },
      // === 社区 ===
      {
        path: "circles",
        name: "CircleList",
        component: () => import("@/views/circles/CircleList.vue"),
        meta: { title: "圈子管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR"] },
      },
      {
        path: "videos",
        name: "VideoList",
        component: () => import("@/views/videos/VideoList.vue"),
        meta: { title: "视频管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR"] },
      },
      {
        path: "lives",
        name: "LiveList",
        component: () => import("@/views/lives/LiveList.vue"),
        meta: { title: "直播管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR"] },
      },
      {
        path: "questions",
        name: "QuestionList",
        component: () => import("@/views/qa/QuestionList.vue"),
        meta: { title: "付费问答", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      // === 排盘工具 ===
      {
        path: "bazi",
        name: "BaziPan",
        component: () => import("@/views/bazi/BaziPan.vue"),
        meta: { title: "八字排盘", roles: ALL_ADMIN },
      },
      {
        path: "ziwei",
        name: "ZiweiPan",
        component: () => import("@/views/bazi/ZiweiPan.vue"),
        meta: { title: "紫微排盘", roles: ALL_ADMIN },
      },
      {
        path: "paipan-records",
        name: "PaipanRecords",
        component: () => import("@/views/PaipanRecords.vue"),
        meta: { title: "排盘记录", roles: ALL_ADMIN },
      },
      {
        path: "bots",
        name: "BotList",
        component: () => import("@/views/bots/BotList.vue"),
        meta: { title: "Bot管理", roles: ALL_ADMIN },
      },
      // === 教学 ===
      {
        path: "courses",
        name: "CourseList",
        component: () => import("@/views/courses/CourseList.vue"),
        meta: { title: "课程管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR"] },
      },
      {
        path: "courses/create",
        name: "CourseCreate",
        component: () => import("@/views/courses/CourseEdit.vue"),
        meta: { hidden: true, title: "新建课程", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR"] },
      },
      {
        path: "courses/:id/edit",
        name: "CourseEdit",
        component: () => import("@/views/courses/CourseEdit.vue"),
        meta: { hidden: true, title: "编辑课程", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR"] },
      },
      // === 电子书 ===
      {
        path: "ebooks",
        name: "EbookList",
        component: () => import("@/views/ebook/EbookList.vue"),
        meta: { title: "电子书管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR"] },
      },
      // === 用户管理 ===
      {
        path: "users",
        name: "UserList",
        component: () => import("@/views/users/UserList.vue"),
        meta: { title: "用户管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CUSTOMER_SERVICE"] },
      },
      {
        path: "users/:id",
        name: "UserDetail",
        component: () => import("@/views/users/UserDetail.vue"),
        meta: { hidden: true, title: "用户详情", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CUSTOMER_SERVICE"] },
      },
      {
        path: "users/identity",
        name: "IdentityAudit",
        component: () => import("@/views/users/IdentityAudit.vue"),
        meta: { title: "实名审核", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "users/push",
        name: "UserPush",
        component: () => import("@/views/users/UserPush.vue"),
        meta: { title: "用户推送", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      // === 交易 ===
      {
        path: "products",
        name: "ProductList",
        component: () => import("@/views/shop/ProductList.vue"),
        meta: { title: "商品管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "GOODS_AUDITOR"] },
      },
      {
        path: "orders",
        name: "OrderList",
        component: () => import("@/views/shop/OrderList.vue"),
        meta: { title: "订单管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN", "GOODS_AUDITOR"] },
      },
      {
        path: "orders/refund",
        name: "RefundList",
        component: () => import("@/views/shop/RefundList.vue"),
        meta: { title: "退款审核", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN"] },
      },
      {
        path: "orders/payments",
        name: "PaymentList",
        component: () => import("@/views/shop/PaymentList.vue"),
        meta: { title: "支付流水", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN"] },
      },
      {
        path: "coupons",
        name: "CouponList",
        component: () => import("@/views/shop/CouponList.vue"),
        meta: { title: "优惠券管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "GOODS_AUDITOR"] },
      },
      // === 营销管理 ===
      {
        path: "marketing/activities",
        name: "ActivityList",
        component: () => import("@/views/marketing/ActivityList.vue"),
        meta: { title: "营销活动", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "marketing/discounts",
        name: "DiscountList",
        component: () => import("@/views/marketing/DiscountList.vue"),
        meta: { title: "限时折扣", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "marketing/coupons",
        name: "CouponTemplateList",
        component: () => import("@/views/marketing/CouponTemplateList.vue"),
        meta: { title: "优惠券模板", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "marketing/group-buys",
        name: "GroupBuyList",
        component: () => import("@/views/marketing/GroupBuyList.vue"),
        meta: { title: "拼团活动", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "marketing/flash-sales",
        name: "FlashSaleList",
        component: () => import("@/views/marketing/FlashSaleList.vue"),
        meta: { title: "秒杀活动", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "marketing/pages",
        name: "MicroPageEditor",
        component: () => import("@/views/marketing/MicroPageEditor.vue"),
        meta: { title: "微页面管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      // === 营销分佣 ===
      {
        path: "commission-config",
        name: "CommissionConfig",
        component: () => import("@/views/commission/CommissionConfig.vue"),
        meta: { title: "佣金配置", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN"] },
      },
      {
        path: "withdrawals",
        name: "WithdrawalList",
        component: () => import("@/views/commission/WithdrawalList.vue"),
        meta: { title: "提现审核", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN"] },
      },
      // === 财务 ===
      {
        path: "recharges",
        name: "RechargeList",
        component: () => import("@/views/coin/RechargeList.vue"),
        meta: { title: "充值记录", roles: ["SUPER_ADMIN", "FINANCE_ADMIN"] },
      },
      {
        path: "gifts",
        name: "GiftList",
        component: () => import("@/views/coin/GiftList.vue"),
        meta: { title: "礼物管理", roles: ["SUPER_ADMIN", "FINANCE_ADMIN"] },
      },
      // === 财务 ===
      {
        path: "revenue",
        name: "RevenueOverview",
        component: () => import("@/views/finance/RevenueOverview.vue"),
        meta: { title: "营收总览", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN"] },
      },
      {
        path: "finance/reconciliation",
        name: "ReconciliationList",
        component: () => import("@/views/finance/ReconciliationList.vue"),
        meta: { title: "对账管理", roles: ["SUPER_ADMIN", "FINANCE_ADMIN"] },
      },
      {
        path: "finance/invoices",
        name: "InvoiceList",
        component: () => import("@/views/finance/InvoiceList.vue"),
        meta: { title: "发票管理", roles: ["SUPER_ADMIN", "FINANCE_ADMIN"] },
      },
      {
        path: "finance/settlements",
        name: "SettlementList",
        component: () => import("@/views/finance/SettlementList.vue"),
        meta: { title: "结算管理", roles: ["SUPER_ADMIN", "FINANCE_ADMIN"] },
      },
      {
        path: "finance/withdrawals",
        name: "WithdrawalApproval",
        component: () => import("@/views/finance/WithdrawalApproval.vue"),
        meta: { title: "提现审批", roles: ["SUPER_ADMIN", "FINANCE_ADMIN"] },
      },
      {
        path: "finance/reports",
        name: "FinanceReportList",
        component: () => import("@/views/finance/ReportList.vue"),
        meta: { title: "财务报表", roles: ["SUPER_ADMIN", "FINANCE_ADMIN"] },
      },
      {
        path: "finance/freeze",
        name: "FundFreeze",
        component: () => import("@/views/finance/FundFreeze.vue"),
        meta: { title: "资金冻结", roles: ["SUPER_ADMIN", "FINANCE_ADMIN"] },
      },
      // === 风控 ===
      {
        path: "risk/rules",
        name: "RuleList",
        component: () => import("@/views/risk/RuleList.vue"),
        meta: { title: "风控规则", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "risk/alerts",
        name: "AlertCenter",
        component: () => import("@/views/risk/AlertCenter.vue"),
        meta: { title: "预警中心", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "risk/fraud",
        name: "FraudList",
        component: () => import("@/views/risk/FraudList.vue"),
        meta: { title: "刷单识别", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "risk/timeline",
        name: "UserTimeline",
        component: () => import("@/views/risk/UserTimeline.vue"),
        meta: { title: "行为轨迹", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "risk/appeals",
        name: "AppealList",
        component: () => import("@/views/risk/AppealList.vue"),
        meta: { title: "申诉处理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CUSTOMER_SERVICE"] },
      },
      // === AI 管理 ===
      {
        path: "ai/usage",
        name: "AiUsageStats",
        component: () => import("@/views/ai/AiUsageStats.vue"),
        meta: { title: "AI用量统计", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "ai/chat-logs",
        name: "BotChatLogs",
        component: () => import("@/views/ai/BotChatLogs.vue"),
        meta: { title: "对话日志", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "ai/call-monitor",
        name: "CallMonitor",
        component: () => import("@/views/ai/CallMonitor.vue"),
        meta: { title: "调用监控", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "ai/circle-assistants",
        name: "CircleAssistantList",
        component: () => import("@/views/ai/CircleAssistantList.vue"),
        meta: { title: "圈主助理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      // === 推荐管理 ===
      {
        path: "recommend/ab-tests",
        name: "AbTestList",
        component: () => import("@/views/recommend/AbTestList.vue"),
        meta: { title: "A/B实验", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "recommend/rules",
        name: "RecommendRuleList",
        component: () => import("@/views/recommend/RecommendRuleList.vue"),
        meta: { title: "推荐规则", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      // === 数据看板 ===
      {
        path: "data/platform",
        name: "PlatformData",
        component: () => import("@/views/dashboard/PlatformData.vue"),
        meta: { title: "平台总览", roles: ALL_ADMIN },
      },
      {
        path: "data/circle",
        name: "CircleData",
        component: () => import("@/views/dashboard/CircleData.vue"),
        meta: { title: "圈子数据", roles: ALL_ADMIN },
      },
      {
        path: "data/course",
        name: "CourseData",
        component: () => import("@/views/dashboard/CourseData.vue"),
        meta: { title: "课程数据", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR"] },
      },
      {
        path: "data/live",
        name: "LiveData",
        component: () => import("@/views/dashboard/LiveData.vue"),
        meta: { title: "直播数据", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "data/station",
        name: "StationData",
        component: () => import("@/views/dashboard/StationData.vue"),
        meta: { title: "分站数据", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN"] },
      },
      // === 系统设置 ===
      {
        path: "system/sensitive-words",
        name: "SensitiveWordList",
        component: () => import("@/views/system/SensitiveWordList.vue"),
        meta: { title: "敏感词管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "system/webhooks",
        name: "WebhookList",
        component: () => import("@/views/system/WebhookList.vue"),
        meta: { title: "Webhook管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "system/import",
        name: "DataImport",
        component: () => import("@/views/system/DataImport.vue"),
        meta: { title: "数据导入", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "system/email",
        name: "EmailManage",
        component: () => import("@/views/system/EmailManage.vue"),
        meta: { title: "邮件管理", roles: ["SUPER_ADMIN"] },
      },
      {
        path: "system/coin-config",
        name: "CoinConfig",
        component: () => import("@/views/system/CoinConfig.vue"),
        meta: { title: "虚拟币配置", roles: ["SUPER_ADMIN"] },
      },
      {
        path: "system/member-config",
        name: "MemberConfig",
        component: () => import("@/views/system/MemberConfig.vue"),
        meta: { title: "会员配置", roles: ["SUPER_ADMIN"] },
      },
      {
        path: "system/operator-level",
        name: "OperatorLevelConfig",
        component: () => import("@/views/system/OperatorLevelConfig.vue"),
        meta: { title: "运营商等级", roles: ["SUPER_ADMIN"] },
      },
      {
        path: "system/feature-flags",
        name: "FeatureFlagList",
        component: () => import("@/views/system/FeatureFlagList.vue"),
        meta: { title: "功能开关", roles: ["SUPER_ADMIN"] },
      },
      {
        path: "system/third-party",
        name: "ThirdPartyConfig",
        component: () => import("@/views/system/ThirdPartyConfig.vue"),
        meta: { title: "第三方配置", roles: ["SUPER_ADMIN"] },
      },
      {
        path: "system/role-permission",
        name: "RolePermissionManage",
        component: () => import("@/views/system/RolePermissionManage.vue"),
        meta: { title: "角色权限", roles: ["SUPER_ADMIN"] },
      },
      {
        path: "system/operation-logs",
        name: "OperationLogList",
        component: () => import("@/views/system/OperationLogList.vue"),
        meta: { title: "操作日志", roles: ["SUPER_ADMIN"] },
      },
      {
        path: "system/config-versions",
        name: "ConfigVersionRollback",
        component: () => import("@/views/system/ConfigVersionRollback.vue"),
        meta: { title: "配置版本", roles: ["SUPER_ADMIN"] },
      },
      {
        path: "system/search-weights",
        name: "SearchWeightConfig",
        component: () => import("@/views/system/SearchWeightConfig.vue"),
        meta: { title: "搜索权重", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      // === 互动管理 ===
      {
        path: "comments",
        name: "CommentList",
        component: () => import("@/views/comments/CommentList.vue"),
        meta: { title: "评论管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR"] },
      },
      {
        path: "reports",
        name: "ReportList",
        component: () => import("@/views/reports/ReportList.vue"),
        meta: { title: "举报管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CUSTOMER_SERVICE"] },
      },
      // === 通知 ===
      {
        path: "notifications",
        name: "NotificationCenter",
        component: () => import("@/views/notifications/NotificationCenter.vue"),
        meta: { title: "通知管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CUSTOMER_SERVICE"] },
      },
      // === 线下 ===
      {
        path: "stations",
        name: "StationList",
        component: () => import("@/views/offline/StationList.vue"),
        meta: { title: "分站管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "offline-venues",
        name: "OfflineVenueList",
        component: () => import("@/views/offline/OfflineVenueList.vue"),
        meta: { title: "线下驿站", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      // === 研究院 ===
      {
        path: "institutes",
        name: "InstituteList",
        component: () => import("@/views/institutes/InstituteList.vue"),
        meta: { title: "研究院管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      // === 商家管理 ===
      {
        path: "merchants",
        name: "MerchantList",
        component: () => import("@/views/merchant/MerchantList.vue"),
        meta: { title: "商家管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "merchants/agreements",
        name: "MerchantAgreements",
        component: () => import("@/views/merchant/AgreementList.vue"),
        meta: { title: "商家协议", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "merchants/:id",
        name: "MerchantDetail",
        component: () => import("@/views/merchant/MerchantDetail.vue"),
        meta: { hidden: true, title: "商家详情", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      // === 会员管理 ===
      {
        path: "member/purchases",
        name: "MemberPurchaseList",
        component: () => import("@/views/member/MemberPurchaseList.vue"),
        meta: { title: "购买记录", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN"] },
      },
      {
        path: "member/stats",
        name: "MemberStats",
        component: () => import("@/views/member/MemberStats.vue"),
        meta: { title: "会员统计", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN"] },
      },
      {
        path: "member/manage",
        name: "MemberManage",
        component: () => import("@/views/member/MemberManage.vue"),
        meta: { title: "会员管理", roles: ["SUPER_ADMIN"] },
      },
      // === 搜索 ===
      {
        path: "search-analytics",
        name: "SearchAnalytics",
        component: () => import("@/views/SearchAnalytics.vue"),
        meta: { title: "搜索分析", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      // === 系统管理 ===
      {
        path: "banners",
        name: "BannerAdmin",
        component: () => import("@/views/system/BannerAdmin.vue"),
        meta: { title: "Banner管理", roles: ["SUPER_ADMIN"] },
      },
      {
        path: "system-settings",
        name: "SystemSettings",
        component: () => import("@/views/system/SystemSettings.vue"),
        meta: { title: "系统设置", roles: ["SUPER_ADMIN"] },
      },
      {
        path: "audit-logs",
        name: "AuditLog",
        component: () => import("@/views/audit/AuditLog.vue"),
        meta: { title: "审计日志", roles: ["SUPER_ADMIN"] },
      },
      // === 403 ===
      {
        path: "403",
        name: "Forbidden",
        component: () => import("@/views/Error403.vue"),
        meta: { hidden: true, title: "无权限" },
      },
    ],
  },
  // === 404 ===
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: () => import("@/views/Error404.vue"),
    meta: { hidden: true, title: "页面不存在" },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 全局路由守卫
router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem("token");

  // 登录页：已登录则跳转首页
  if (to.name === "Login") {
    if (token) return next("/dashboard");
    return next();
  }

  // 无 token → 登录页
  if (!token) return next("/login");

  // 403/404 页面直接放行
  if (to.name === "Forbidden" || to.name === "NotFound") return next();

  // 角色检查：从 localStorage 读取缓存的角色
  try {
    const cached = localStorage.getItem("user_roles");
    const userRoles: string[] = cached ? JSON.parse(cached) : [];
    const requiredRoles = (to.meta?.roles as string[]) || [];

    // 如果没有配置角色限制，允许所有已登录用户
    if (requiredRoles.length === 0) return next();

    // 角色缓存为空时放行（Layout.onMounted 会 fetchProfile 补充缓存）
    if (userRoles.length === 0) return next();

    // 超管全部放行
    if (userRoles.includes("SUPER_ADMIN")) return next();

    // 检查交集
    const hasAccess = requiredRoles.some((r) => userRoles.includes(r));
    if (!hasAccess) return next("/403");
  } catch {
    // 解析失败不阻塞
  }

  next();
});

export default router;
