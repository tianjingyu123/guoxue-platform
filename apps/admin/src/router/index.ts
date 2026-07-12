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
        meta: { title: "财务工作台", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN"] },
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
        meta: { title: "内容库（旧CMS）", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR"] },
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
      {
        path: "classics/commentaries",
        name: "ClassicCommentaryManage",
        component: () => import("@/views/classics/ClassicCommentaryManage.vue"),
        meta: { title: "古籍注解", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR"] },
      },
      // === 社区 ===
      {
        path: "circles",
        name: "CircleList",
        component: () => import("@/views/circles/CircleList.vue"),
        meta: { title: "圈子管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR"] },
      },
      {
        path: "circle-refunds",
        name: "CircleRefundAudit",
        component: () => import("@/views/circles/CircleRefundAudit.vue"),
        meta: { title: "圈子退款审核", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "circle-appeals",
        name: "CircleAppealArbitration",
        component: () => import("@/views/circles/CircleAppealArbitration.vue"),
        meta: { title: "圈子申诉仲裁", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "call-disputes",
        name: "CallDisputeArbitration",
        component: () => import("@/views/circles/CallDisputeArbitration.vue"),
        meta: { title: "通话账单申诉", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "circles/:id",
        name: "CircleDetail",
        component: () => import("@/views/circles/CircleDetail.vue"),
        meta: { hidden: true, title: "圈子详情", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR"] },
      },
      {
        path: "videos",
        name: "VideoList",
        component: () => import("@/views/videos/VideoList.vue"),
        meta: { title: "短视频管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR"] },
      },
      {
        path: "lives",
        name: "LiveList",
        component: () => import("@/views/lives/LiveList.vue"),
        meta: { title: "直播管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR"] },
      },
      {
        path: "lives/:id/dashboard",
        name: "LiveDashboard",
        component: () => import("@/views/lives/LiveDashboard.vue"),
        meta: { hidden: true, title: "直播间数据大屏", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "questions",
        name: "QuestionList",
        component: () => import("@/views/qa/QuestionList.vue"),
        meta: { title: "付费问答（达人咨询）", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
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
        path: "qimen",
        name: "QimenPan",
        component: () => import("@/views/qimen/QimenPan.vue"),
        meta: { title: "奇门排盘", roles: ALL_ADMIN },
      },
      {
        path: "liuyao",
        name: "LiuYaoPan",
        component: () => import("@/views/liuyao/LiuYaoPan.vue"),
        meta: { title: "六爻排盘", roles: ALL_ADMIN },
      },
      {
        path: "daliuren",
        name: "DaLiuRenPan",
        component: () => import("@/views/daliuren/DaLiuRenPan.vue"),
        meta: { title: "大六壬排盘", roles: ALL_ADMIN },
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
        // 2026-07-11 课程编辑器重做：新建/编辑走可视化分区块编辑器（CourseEditor·无富文本）
        component: () => import("@/views/courses/CourseEditor.vue"),
        meta: { hidden: true, title: "发布课程", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR"] },
      },
      {
        path: "courses/:id/edit",
        name: "CourseEdit",
        component: () => import("@/views/courses/CourseEditor.vue"),
        meta: { hidden: true, title: "编辑课程", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR"] },
      },
      {
        path: "courses/:id/manage",
        name: "CourseManage",
        // 课程运营（学员/作业/评价/问答/统计）：原 CourseEdit 页下线编辑器后保留的运营部分
        component: () => import("@/views/courses/CourseEdit.vue"),
        meta: { hidden: true, title: "课程运营", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR"] },
      },
      {
        path: "courses/categories",
        name: "CourseCategoryManage",
        component: () => import("@/views/courses/CourseCategoryManage.vue"),
        meta: { title: "课程分类管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "teacher/certifications",
        name: "TeacherCertificationAudit",
        component: () => import("@/views/teacher/TeacherCertificationAudit.vue"),
        meta: { title: "讲师认证审核", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR"] },
      },
      // === 用户管理 ===
      {
        path: "users",
        name: "UserList",
        component: () => import("@/views/users/UserList.vue"),
        meta: { title: "用户管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CUSTOMER_SERVICE"] },
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
      {
        path: "users/whitelist",
        name: "WhitelistManage",
        component: () => import("@/views/users/WhitelistManage.vue"),
        meta: { title: "IP白名单", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "users/interests",
        name: "UserInterestAnalytics",
        component: () => import("@/views/users/UserInterestAnalytics.vue"),
        meta: { title: "兴趣品类分析", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "users/:id",
        name: "UserDetail",
        component: () => import("@/views/users/UserDetail.vue"),
        meta: { hidden: true, title: "用户详情", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CUSTOMER_SERVICE"] },
      },
      // === 课程组合包 ===
      {
        path: "bundles",
        name: "BundleList",
        component: () => import("@/views/bundles/BundleList.vue"),
        meta: { title: "课程组合包", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      // === 统一订单中心 ===
      {
        path: "orders/center",
        name: "OrderCenter",
        component: () => import("@/views/orders/OrderCenter.vue"),
        meta: { title: "统一订单中心", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN"] },
      },
      // === 续费管理 ===
      {
        path: "renewal",
        name: "RenewalManage",
        component: () => import("@/views/renewal/RenewalManage.vue"),
        meta: { title: "续费管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN"] },
      },
      // === 驿站老师邀约 ===
      {
        path: "teacher-requests",
        name: "TeacherRequests",
        component: () => import("@/views/offline/TeacherRequests.vue"),
        meta: { title: "教师邀约管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      // === 圈子后台 ===
      {
        path: "circle-backend",
        name: "CircleBackend",
        component: () => import("@/views/circles/CircleBackend.vue"),
        meta: { title: "圈子后台管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      // === 交易 ===
      {
        path: "products",
        name: "ProductList",
        component: () => import("@/views/shop/ProductList.vue"),
        meta: { title: "商品管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "GOODS_AUDITOR"] },
      },
      {
        path: "shop/product-audit",
        name: "ProductAudit",
        component: () => import("@/views/shop/ProductAudit.vue"),
        meta: { title: "商品审核", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "GOODS_AUDITOR"] },
      },
      {
        path: "creator/list",
        name: "CreatorList",
        component: () => import("@/views/creator/CreatorList.vue"),
        meta: { title: "创作者管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "creator/withdrawals",
        name: "CreatorWithdrawals",
        component: () => import("@/views/creator/CreatorWithdrawals.vue"),
        meta: { title: "创作者提现", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "orders",
        name: "OrderList",
        component: () => import("@/views/shop/OrderList.vue"),
        meta: { title: "订单管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN", "GOODS_AUDITOR"] },
      },
      {
        path: "orders/gift-card-print",
        name: "GiftCardPrint",
        component: () => import("@/views/shop/GiftCardPrint.vue"),
        meta: { title: "贺卡打印", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "GOODS_AUDITOR"] },
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
      {
        path: "categories",
        name: "CategoryList",
        component: () => import("@/views/shop/CategoryList.vue"),
        meta: { title: "商品分类", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "freight-templates",
        name: "FreightTemplateList",
        component: () => import("@/views/shop/FreightTemplateList.vue"),
        meta: { title: "运费模板", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "reviews",
        name: "ReviewList",
        component: () => import("@/views/shop/ReviewList.vue"),
        meta: { title: "评价管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "GOODS_AUDITOR"] },
      },
      {
        path: "after-sales",
        name: "AfterSaleList",
        component: () => import("@/views/shop/AfterSaleList.vue"),
        meta: { title: "售后管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CUSTOMER_SERVICE"] },
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
      {
        path: "platform-layout",
        name: "PlatformLayout",
        component: () => import("@/views/marketing/PlatformLayout.vue"),
        meta: { title: "平台页面布局", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "marketing/full-reductions",
        name: "FullReductionList",
        component: () => import("@/views/marketing/FullReductionList.vue"),
        meta: { title: "满减送管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      // === 定价管理 ===
      {
        path: "pricing/rules",
        name: "PricingRuleList",
        component: () => import("@/views/pricing/RuleList.vue"),
        meta: { title: "定价规则", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "pricing/rules/:id",
        name: "PricingRuleEdit",
        component: () => import("@/views/pricing/RuleEdit.vue"),
        meta: { hidden: true, title: "定价规则编辑", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "pricing/demand",
        name: "DemandHeatmap",
        component: () => import("@/views/pricing/DemandHeatmap.vue"),
        meta: { title: "需求热度", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
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
      {
        path: "platform-fee",
        name: "PlatformFeeSummary",
        component: () => import("@/views/commission/PlatformFeeSummary.vue"),
        meta: { title: "平台抽成汇总", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN"] },
      },
      // === 财务 ===
      {
        path: "recharges",
        name: "RechargeList",
        component: () => import("@/views/coin/RechargeList.vue"),
        meta: { title: "充值记录", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN"] },
      },
      {
        path: "gifts",
        name: "GiftList",
        component: () => import("@/views/coin/GiftList.vue"),
        meta: { title: "礼物管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN"] },
      },
      {
        path: "coin-transactions",
        name: "CoinTransactionList",
        component: () => import("@/views/coin/TransactionList.vue"),
        meta: { title: "虚拟币流水", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN", "CUSTOMER_SERVICE"] },
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
        meta: { title: "对账管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN"] },
      },
      {
        path: "finance/invoices",
        name: "InvoiceList",
        component: () => import("@/views/finance/InvoiceList.vue"),
        meta: { title: "发票管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN"] },
      },
      {
        path: "finance/settlements",
        name: "SettlementList",
        component: () => import("@/views/finance/SettlementList.vue"),
        meta: { title: "结算管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN"] },
      },
      {
        path: "finance/withdrawals",
        name: "WithdrawalApproval",
        component: () => import("@/views/finance/WithdrawalApproval.vue"),
        meta: { title: "提现审批", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN"] },
      },
      {
        path: "finance/reports",
        name: "FinanceReportList",
        component: () => import("@/views/finance/ReportList.vue"),
        meta: { title: "财务报表", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN"] },
      },
      {
        path: "finance/freeze",
        name: "FundFreeze",
        component: () => import("@/views/finance/FundFreeze.vue"),
        meta: { title: "资金冻结", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN"] },
      },
      {
        path: "finance/fund-approval",
        name: "FundApprovalCenter",
        component: () => import("@/views/finance/FundApprovalCenter.vue"),
        meta: { title: "资金审批中心", roles: ["SUPER_ADMIN", "FINANCE_ADMIN"] },
      },
      {
        path: "finance/settlement-rules",
        name: "SettlementRuleList",
        component: () => import("@/views/finance/SettlementRuleList.vue"),
        meta: { title: "分佣规则", roles: ["SUPER_ADMIN", "FINANCE_ADMIN"] },
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
      {
        path: "risk/device-fingerprints",
        name: "DeviceFingerprintList",
        component: () => import("@/views/risk/DeviceFingerprint.vue"),
        meta: { title: "设备指纹", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      // === 流失管理 ===
      {
        path: "churn",
        name: "ChurnList",
        component: () => import("@/views/churn/ChurnList.vue"),
        meta: { title: "流失预测", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "churn/rules",
        name: "ChurnRuleList",
        component: () => import("@/views/churn/ChurnRuleList.vue"),
        meta: { title: "流失规则", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "churn/actions",
        name: "ChurnActionList",
        component: () => import("@/views/churn/ChurnActionList.vue"),
        meta: { title: "挽回动作", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      // === 管理驾驶舱 ===
      {
        path: "admin/cockpit",
        name: "Cockpit",
        component: () => import("@/views/dashboard/Cockpit.vue"),
        meta: { title: "管理驾驶舱", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      // === 对外大屏 ===
      {
        path: "bigscreen/platform",
        name: "PlatformBigscreen",
        component: () => import("@/views/dashboard/PlatformBigscreen.vue"),
        meta: { title: "平台综合大屏", roles: ALL_ADMIN },
      },
      {
        path: "bigscreen/transactions",
        name: "TransactionBigscreen",
        component: () => import("@/views/dashboard/TransactionBigscreen.vue"),
        meta: { title: "实时交易大屏", roles: ALL_ADMIN },
      },
      {
        path: "bigscreen/content-eco",
        name: "ContentBigscreen",
        component: () => import("@/views/dashboard/ContentBigscreen.vue"),
        meta: { title: "内容生态大屏", roles: ALL_ADMIN },
      },
      {
        path: "bigscreen/ai-capability",
        name: "AiBigscreen",
        component: () => import("@/views/dashboard/AiBigscreen.vue"),
        meta: { title: "AI能力大屏", roles: ALL_ADMIN },
      },
      {
        path: "bigscreen/offline-map",
        name: "OfflineBigscreen",
        component: () => import("@/views/dashboard/OfflineBigscreen.vue"),
        meta: { title: "线下驿站大屏", roles: ALL_ADMIN },
      },
      {
        path: "admin/bigscreen-tokens",
        name: "BigscreenTokenManage",
        component: () => import("@/views/dashboard/BigscreenTokenManage.vue"),
        meta: { title: "大屏Token管理", roles: ["SUPER_ADMIN"] },
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
      {
        path: "ai/customer-service",
        name: "CustomerServiceAdmin",
        component: () => import("@/views/ai/CustomerServiceAdmin.vue"),
        meta: { title: "智能客服管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CUSTOMER_SERVICE"] },
      },
      {
        path: "ai/agent-marketplace",
        name: "AgentMarketplace",
        component: () => import("@/views/ai/AgentMarketplace.vue"),
        meta: { title: "智能体广场", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "ai/media-processing",
        name: "MediaProcessing",
        component: () => import("@/views/ai/MediaProcessing.vue"),
        meta: { title: "AI媒体处理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "ai/content-quality",
        name: "ContentQuality",
        component: () => import("@/views/ai/ContentQuality.vue"),
        meta: { title: "AI内容质量", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "ai/rag-templates",
        name: "RagTemplateManage",
        component: () => import("@/views/ai/RagTemplateManage.vue"),
        meta: { title: "RAG模板管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "ai/data-explorer",
        name: "DataExplorer",
        component: () => import("@/views/ai/DataExplorer.vue"),
        meta: { title: "AI数据探索", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "ai/anomaly-detector",
        name: "AnomalyDetector",
        component: () => import("@/views/ai/AnomalyDetector.vue"),
        meta: { title: "AI异常检测", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "ai/collaborations",
        name: "CollaborationList",
        component: () => import("@/views/ai/CollaborationList.vue"),
        meta: { title: "AI协作审核", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
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
      // === 运营看板（看-P1·DashboardDaily 天级聚合） ===
      {
        path: "dashboard/overview",
        name: "OpsDashboardOverview",
        component: () => import("@/views/dashboard/Overview.vue"),
        meta: { title: "运营看板·总览", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN"] },
      },
      {
        path: "dashboard/growth",
        name: "OpsDashboardGrowth",
        component: () => import("@/views/dashboard/Growth.vue"),
        meta: { title: "运营看板·增长", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN"] },
      },
      {
        path: "dashboard/revenue",
        name: "OpsDashboardRevenue",
        component: () => import("@/views/dashboard/Revenue.vue"),
        meta: { title: "运营看板·收入", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN"] },
      },
      {
        path: "dashboard/health",
        name: "OpsDashboardHealth",
        component: () => import("@/views/dashboard/Health.vue"),
        meta: { title: "运营看板·健康", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN"] },
      },
      // === 数据运营引擎（D-T1 漏斗 / D-T2 标签）+ 业务哨兵（O-T1） ===
      {
        path: "dashboard/perf",
        name: "PerfBoard",
        component: () => import("@/views/dashboard/Perf.vue"),
        meta: { title: "性能观测", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "dashboard/funnels",
        name: "FunnelBoard",
        component: () => import("@/views/dashboard/FunnelBoard.vue"),
        meta: { title: "转化漏斗", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "dashboard/creation-rankings",
        name: "CreationRanking",
        component: () => import("@/views/dashboard/CreationRanking.vue"),
        meta: { title: "创作排行榜", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR"] },
      },
      {
        path: "user-tags",
        name: "UserTagCenter",
        component: () => import("@/views/users/UserTagCenter.vue"),
        meta: { title: "用户标签", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "sentinel/alerts",
        name: "SentinelAlerts",
        component: () => import("@/views/sentinel/SentinelAlerts.vue"),
        meta: { title: "哨兵告警", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      // === 系统设置 ===
      {
        path: "system/referrals",
        name: "ReferralManage",
        component: () => import("@/views/system/ReferralManage.vue"),
        meta: { title: "推荐码管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "system/backup",
        name: "BackupManage",
        component: () => import("@/views/system/BackupManage.vue"),
        meta: { title: "数据库备份", roles: ["SUPER_ADMIN"] },
      },
      {
        path: "system/feedback",
        name: "AdminFeedback",
        component: () => import("@/views/system/AdminFeedback.vue"),
        meta: { title: "运营反馈", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "system/sensitive-words",
        name: "SensitiveWordList",
        component: () => import("@/views/system/SensitiveWordList.vue"),
        meta: { title: "敏感词管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "system/compliance-scan",
        name: "ComplianceScan",
        component: () => import("@/views/system/ComplianceScan.vue"),
        meta: { title: "合规扫描", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR"] },
      },
      {
        path: "system/ops-tasks",
        name: "OpsTaskPool",
        component: () => import("@/views/system/OpsTaskPool.vue"),
        meta: { title: "任务池", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
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
        path: "system/export",
        name: "DataExport",
        component: () => import("@/views/system/DataExport.vue"),
        meta: { title: "数据导出", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN"] },
      },
      {
        path: "system/cron",
        name: "CronManage",
        component: () => import("@/views/system/CronManage.vue"),
        meta: { title: "定时任务", roles: ["SUPER_ADMIN"] },
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
        path: "system/brand",
        name: "BrandConfig",
        component: () => import("@/views/system/BrandConfig.vue"),
        meta: { title: "品牌配置", roles: ["SUPER_ADMIN"] },
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
        meta: { title: "搜索权重", roles: ["SUPER_ADMIN"] },
      },
      {
        path: "system/homepage-config",
        name: "HomepageConfig",
        component: () => import("@/views/system/HomepageConfig.vue"),
        meta: { title: "首页模块配置", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "system/ai-gateway",
        name: "AIGatewayConfig",
        component: () => import("@/views/system/AIGatewayConfig.vue"),
        meta: { title: "AI模型路由", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "system/app-versions",
        name: "AppVersionList",
        component: () => import("@/views/system/AppVersionList.vue"),
        meta: { title: "APP版本管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "system/legal-documents",
        name: "LegalDocumentList",
        component: () => import("@/views/system/LegalDocumentList.vue"),
        meta: { title: "用户协议管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "system/site-notices",
        name: "SiteNoticeList",
        component: () => import("@/views/system/SiteNoticeList.vue"),
        meta: { title: "全站公告管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "system/error-monitor",
        name: "ErrorMonitor",
        component: () => import("@/views/system/ErrorMonitor.vue"),
        meta: { title: "错误监控", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      // === 互动管理 ===
      {
        path: "comments",
        name: "CommentList",
        component: () => import("@/views/comments/CommentList.vue"),
        meta: { title: "评论管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR"] },
      },
      {
        path: "marketing/landing-pages",
        name: "LandingPageManage",
        component: () => import("@/views/marketing/LandingPageManage.vue"),
        meta: { title: "分享落地页管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "reports",
        name: "ReportList",
        component: () => import("@/views/reports/ReportList.vue"),
        meta: { title: "举报管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CUSTOMER_SERVICE"] },
      },
      // === 赏金管理 ===
      {
        path: "bounty/questions",
        name: "BountyQuestionList",
        component: () => import("@/views/bounty/QuestionList.vue"),
        meta: { title: "悬赏问题", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "bounty/reviews",
        name: "BountyReviewList",
        component: () => import("@/views/bounty/ReviewList.vue"),
        meta: { title: "悬赏审核", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "bounty/experts",
        name: "ExpertManage",
        component: () => import("@/views/bounty/ExpertManage.vue"),
        meta: { title: "悬赏专家", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
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
        path: "offline/courses",
        name: "OfflineCourseList",
        component: () => import("@/views/offline/OfflineCourseList.vue"),
        meta: { title: "线下课程管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "offline/teachers",
        name: "TeacherList",
        component: () => import("@/views/offline/TeacherList.vue"),
        meta: { title: "教师管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
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
      {
        path: "offline/checkins",
        name: "OfflineCheckinList",
        component: () => import("@/views/offline/OfflineCheckinList.vue"),
        meta: { title: "驿站核销记录", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "offline/products",
        name: "OfflineProductAdmin",
        component: () => import("@/views/offline/OfflineProductAdmin.vue"),
        meta: { title: "驿站商品监控", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "offline/bookings",
        name: "OfflineBookingList",
        component: () => import("@/views/offline/OfflineBookingList.vue"),
        meta: { title: "师资预约监控", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      // === 运营商管理 ===
      {
        path: "operators/picks",
        name: "StationPickManage",
        component: () => import("@/views/operator/StationPickManage.vue"),
        meta: { title: "站点精选", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "operators",
        name: "OperatorStationList",
        component: () => import("@/views/operator/StationList.vue"),
        meta: { title: "运营商管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "operators/earnings",
        name: "OperatorEarnings",
        component: () => import("@/views/operator/Earnings.vue"),
        meta: { title: "运营商收益", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "operators/miniapps",
        name: "MiniAppManage",
        component: () => import("@/views/operator/MiniAppManage.vue"),
        meta: { title: "小程序管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      // === 研究院 ===
      {
        path: "institutes",
        name: "InstituteList",
        component: () => import("@/views/institutes/InstituteList.vue"),
        meta: { title: "研究院管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "institutes/finance",
        name: "InstituteFinance",
        component: () => import("@/views/institutes/InstituteFinance.vue"),
        meta: { title: "研究院财务", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "institutes/task-templates",
        name: "InstituteTaskTemplates",
        component: () => import("@/views/institutes/InstituteTaskTemplates.vue"),
        meta: { title: "任务模板", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
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
      // === 租户管理 ===
      {
        path: "tenants",
        name: "TenantList",
        component: () => import("@/views/tenant/TenantList.vue"),
        meta: { title: "租户管理", roles: ["SUPER_ADMIN"] },
      },
      {
        path: "tenants/:id",
        name: "TenantDetail",
        component: () => import("@/views/tenant/TenantDetail.vue"),
        meta: { hidden: true, title: "租户详情", roles: ["SUPER_ADMIN"] },
      },
      {
        path: "tenants/:id/usage",
        name: "TenantUsage",
        component: () => import("@/views/tenant/TenantUsage.vue"),
        meta: { hidden: true, title: "租户使用记录", roles: ["SUPER_ADMIN"] },
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
      // === 文章管理 ===
      {
        path: "articles",
        name: "ArticleList",
        component: () => import("@/views/article/ArticleList.vue"),
        meta: { title: "文章管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR"] },
      },
      // === 知识库管理 ===
      {
        path: "knowledge",
        name: "KnowledgeManage",
        component: () => import("@/views/ai/KnowledgeManage.vue"),
        meta: { title: "知识库管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      // === AI内容生成 ===
      {
        path: "content-generation",
        name: "ContentGeneration",
        component: () => import("@/views/ai/ContentGeneration.vue"),
        meta: { title: "AI内容生成", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      // === 赛事管理 ===
      {
        path: "competitions",
        name: "CompetitionList",
        component: () => import("@/views/competition/CompetitionList.vue"),
        meta: { title: "赛事管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "competitions/create",
        name: "CompetitionCreate",
        component: () => import("@/views/competition/CompetitionCreate.vue"),
        meta: { hidden: true, title: "新建赛事", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "competitions/:id",
        name: "CompetitionDetail",
        component: () => import("@/views/competition/CompetitionDetail.vue"),
        meta: { hidden: true, title: "赛事详情", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "competitions/:id/edit",
        name: "CompetitionEdit",
        component: () => import("@/views/competition/CompetitionEdit.vue"),
        meta: { hidden: true, title: "编辑赛事", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      // === 品类标签管理 ===
      {
        path: "content-categories",
        name: "CategoryManage",
        component: () => import("@/views/content/CategoryManage.vue"),
        meta: { title: "品类标签管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      // === 汇付支付 ===
      {
        path: "huifu",
        name: "HuifuConfig",
        component: () => import("@/views/huifu/HuifuConfig.vue"),
        meta: { title: "汇付天下支付", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN"] },
      },
      // === IM管理 ===
      {
        path: "im",
        name: "ImManage",
        component: () => import("@/views/im/ImManage.vue"),
        meta: { title: "IM即时通讯", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      // === 短信管理 ===
      {
        path: "sms",
        name: "SmsManage",
        component: () => import("@/views/sms/SmsManage.vue"),
        meta: { title: "短信管理", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      // === 互动管理 ===
      {
        path: "interactions",
        name: "InteractionDashboard",
        component: () => import("@/views/interaction/InteractionDashboard.vue"),
        meta: { title: "互动数据看板", roles: ["SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR"] },
      },
      // === 自动化运营 ===
      {
        path: "operation/tasks",
        name: "TaskPool",
        component: () => import("@/views/task/TaskPool.vue"),
        meta: { title: "任务池", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
      },
      {
        path: "advisor/rules",
        name: "AdvisorRuleList",
        component: () => import("@/views/advisor/RuleList.vue"),
        meta: { title: "顾问规则", roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] },
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
      // === 商家后台（已入驻商家管理自己的店铺，路由无 roles——后端 MerchantGuard 校验）===
      {
        path: "merchant-backend/dashboard",
        name: "MerchantDashboard",
        component: () => import("@/views/merchant-backend/MerchantDashboard.vue"),
        meta: { title: "商家数据概览" },
      },
      {
        path: "merchant-backend/products",
        name: "MerchantProducts",
        component: () => import("@/views/merchant-backend/MerchantProducts.vue"),
        meta: { title: "商品管理" },
      },
      {
        path: "merchant-backend/orders",
        name: "MerchantOrders",
        component: () => import("@/views/merchant-backend/MerchantOrders.vue"),
        meta: { title: "订单管理" },
      },
      {
        path: "merchant-backend/shipping",
        name: "MerchantShipping",
        component: () => import("@/views/merchant-backend/MerchantShipping.vue"),
        meta: { title: "发货管理" },
      },
      {
        path: "merchant-backend/after-sales",
        name: "MerchantAfterSales",
        component: () => import("@/views/merchant-backend/MerchantAfterSales.vue"),
        meta: { title: "售后管理" },
      },
      {
        path: "merchant-backend/customers",
        name: "MerchantCustomers",
        component: () => import("@/views/merchant-backend/MerchantCustomers.vue"),
        meta: { title: "客户管理" },
      },
      {
        path: "merchant-backend/reviews",
        name: "MerchantReviews",
        component: () => import("@/views/merchant-backend/MerchantReviews.vue"),
        meta: { title: "评价管理" },
      },
      {
        path: "merchant-backend/revenue",
        name: "MerchantRevenue",
        component: () => import("@/views/merchant-backend/MerchantRevenue.vue"),
        meta: { title: "收入结算" },
      },
      {
        path: "merchant-backend/violations",
        name: "MerchantViolations",
        component: () => import("@/views/merchant-backend/MerchantViolations.vue"),
        meta: { title: "违规记录" },
      },
      {
        path: "merchant-backend/profile",
        name: "MerchantProfile",
        component: () => import("@/views/merchant-backend/MerchantProfile.vue"),
        meta: { title: "店铺设置" },
      },
      // === 分站后台（站长自管理）===
      {
        path: "station-backend",
        name: "StationBackend",
        component: () => import("@/views/station-backend/StationDashboard.vue"),
        meta: { title: "分站权益中心", roles: ["SUPER_ADMIN", "STATION_MASTER"] },
      },
      // === 运营商后台（运营商自管理）===
      {
        path: "operator-backend",
        name: "OperatorBackend",
        component: () => import("@/views/operator-backend/OperatorDashboard.vue"),
        meta: { title: "运营商权益中心", roles: ["SUPER_ADMIN", "OPERATOR"] },
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
  history: createWebHistory(import.meta.env.BASE_URL),
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
