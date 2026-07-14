// ===== 商家端数据层 —— 真连后端 /merchant（入驻）+ /merchant-backend（经营后台）=====
// 定位：商家=平台电商供货端/供应链源头，商品池唯一正规入口；圈主/驿站/商城为分销渠道。
// 状态机：PENDING_REVIEW →(审核)→ DEPOSIT_PENDING →(缴保证金)→ AGREEMENT_PENDING →(签协议)→ ACTIVE
import { apiGet, apiGetPaged, apiPost, apiPut, apiDelete } from '@/utils/request'

// ───────── 商家状态 ─────────
export type MerchantStatus =
  | 'PENDING_REVIEW' | 'REVIEW_FAILED' | 'DEPOSIT_PENDING'
  | 'AGREEMENT_PENDING' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED'

export interface MerchantApplication {
  id: string
  userId: string
  shopName: string
  shopLogo?: string | null
  shopIntro?: string | null
  contactName: string
  contactPhone: string
  idCardNumber: string
  idCardFront?: string | null
  idCardBack?: string | null
  businessLicense?: string | null
  brandAuth?: string | null
  categoryIds: string[]
  status: MerchantStatus
  depositAmount?: string | number | null
  depositPaid: boolean
  agreementSigned: boolean
  rejectReason?: string | null
  commissionRate?: string | number | null
  totalSales?: string | number
  totalOrders?: number
  rating?: string | number
  openedAt?: string | null
  closedAt?: string | null
  remark?: string | null
  createdAt: string
}

export interface DepositInfo {
  depositAmount: number
  depositPaid: boolean
  status: MerchantStatus
}

export interface MerchantAgreement {
  id: string
  version: string
  title: string
  content: string
  createdAt: string
}

// ───────── 经营后台 ─────────
export interface MerchantDashboard {
  todayOrders: number
  todaySales: number
  totalProducts: number
  pendingReviews: number
  totalSales: number
  totalOrders: number
  rating: number
}

export interface MerchantProfile {
  id: string
  shopName: string
  shopLogo?: string | null
  shopIntro?: string | null
  contactName: string
  contactPhone: string
  status: MerchantStatus
  rating?: string | number
  totalSales?: string | number
  totalOrders?: number
  commissionRate?: string | number | null
  categoryIds?: string[]
  openedAt?: string | null
}

/** 商品状态（后端枚举） */
export type ProductStatus = 'ON_SALE' | 'OFF_SHELF' | 'PENDING'

/** 商品 SKU（多规格·B3 商品编辑器矩阵态） */
export interface MerchantProductSku {
  id: string
  productId: string
  /** 规格键值对，如 { 材质: '桃木', 尺寸: '小' } */
  specs: Record<string, string>
  price: string | number
  stock: number
  skuCode?: string | null
  createdAt?: string
}

export interface MerchantProduct {
  id: string
  title: string
  intro?: string | null
  detail?: string
  images: string[]
  price: string | number
  originalPrice?: string | number | null
  stock: number
  salesCount: number
  status: ProductStatus
  categoryId?: string | null
  tags: string[]
  /** 多规格 SKU 列表（getProduct 详情含·编辑态回填矩阵） */
  skus?: MerchantProductSku[]
  createdAt: string
}

/** 订单状态（后端枚举） */
export type MerchantOrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'COMPLETED' | 'REFUNDED' | 'CANCELLED'

export interface MerchantOrder {
  id: string
  userId: string
  type: string
  targetId: string
  amount: string | number
  payAmount?: string | number | null
  status: MerchantOrderStatus
  payMethod?: string | null
  shippingInfo?: { name?: string; phone?: string; province?: string; city?: string; district?: string; detail?: string } | null
  createdAt: string
  paidAt?: string | null
  shippedAt?: string | null
  /** 白标贺卡任务（供-P2）：归因订单自动生成·发货时打印随包裹放入（admin 后台「订单管理→打印贺卡」出 A6 模板） */
  giftCardMeta?: { fromName?: string; blessing?: string; qrRef?: string } | null
  // 以下为后端 enrich 字段
  productTitle?: string
  productImage?: string | null
  buyerNickname?: string
  buyerPhone?: string | null
  /** 贺卡任务标记（后端 enrich·列表轻量露出） */
  hasGiftCard?: boolean
}

export interface MerchantReview {
  id: string
  productId: string
  userId: string
  rating: number
  content: string
  images: string[]
  reply?: string | null
  repliedAt?: string | null
  createdAt: string
  product?: { title: string }
}

export interface RevenueOverview {
  totalSales: number
  totalOrders: number
  merchantShare: number
  platformShare: number
  commissionRate: number
}

export interface MerchantSettlement {
  id: string
  periodStart: string
  periodEnd: string
  orderCount: number
  totalRevenue: number
  commission: number
  settlementAmount: number
  status: string
  paidAt?: string | null
  createdAt: string
}

export interface MerchantViolation {
  id: string
  type: 'MINOR' | 'MODERATE' | 'SEVERE'
  title: string
  description: string
  penalty?: string | number | null
  status: 'PENDING' | 'CONFIRMED' | 'DISMISSED'
  appeal?: string | null
  appealAt?: string | null
  handledAt?: string | null
  createdAt: string
}

export interface MerchantCustomer {
  id: string
  nickname: string
  avatar?: string | null
  phone?: string | null
  orderCount: number
  totalSpent: string | number
  lastOrderAt?: string | null
}

export interface MerchantNotice {
  id: string
  title: string
  content: string
  type: string
  category: string
  time: string
  read: boolean
}

// ───────── 操作员（MerchantMember·B8） ─────────
/** 操作员权限枚举（与后端 MerchantMember.permissions 对齐；纯前端展示映射见 memberPermConfig） */
export type MerchantMemberPerm = 'PRODUCT' | 'ORDER' | 'REVIEW' | 'MESSAGE' | 'SETTLEMENT'

export interface MerchantMember {
  /** 后端 listMembers 返回行没有独立 id，唯一键就是 userId（移除也按 userId） */
  id?: string
  userId: string
  nickname: string
  avatar?: string | null
  /** 平台账号（手机号，后端已脱敏 138****6789） */
  phone?: string | null
  /** 角色：OWNER=店主（全部权限·不可移除）/ OPERATOR=操作员 */
  role: 'OWNER' | 'OPERATOR'
  /**
   * ⚠️ 后端 MerchantMember 表没有 permissions 字段（只有 role: OWNER/OPERATOR）——
   * 操作员就是"店铺经营权限"整包。此字段恒为空，UI 不再做权限勾选（勾了也不落库＝假动作）。
   */
  permissions?: MerchantMemberPerm[]
  /** 最近操作摘要（后端 enrich·可空） */
  lastAction?: string | null
  lastActiveAt?: string | null
  createdAt: string
}

/** 操作审计记录（谁·何时·做了什么；后端未实现时页面诚实占位） */
export interface MerchantMemberAudit {
  id: string
  memberId: string
  operatorName: string
  action: string
  target?: string | null
  createdAt: string
}

export interface MerchantContentStats {
  totalProducts: number
  publishedProducts: number
  draftProducts: number
  publishedArticles: number
  totalViews: number
  totalLikes: number
}

// ───────── 入驻链路 API（/merchant） ─────────
export const merchantApi = {
  /** 获取入驻申请（未申请时后端 404 → 抛错，页面据此显示「未申请」态） */
  getApplication: () => apiGet<MerchantApplication>('/merchant/application'),
  apply: (data: Partial<MerchantApplication>) => apiPost<MerchantApplication>('/merchant/apply', data),
  updateApplication: (data: Partial<MerchantApplication>) => apiPut<MerchantApplication>('/merchant/application', data),
  submit: () => apiPost('/merchant/submit', {}),
  getDepositInfo: () => apiGet<DepositInfo>('/merchant/deposit-info'),
  payDeposit: (payMethod: 'WECHAT' | 'ALIPAY') => apiPost('/merchant/pay-deposit', { payMethod }),
  getAgreementPreview: () => apiGet<MerchantAgreement>('/merchant/agreement-preview'),
  signAgreement: (version: string, agreed = true) => apiPost('/merchant/sign-agreement', { version, agreed }),
}

// ───────── 经营后台 API（/merchant-backend） ─────────
export const merchantBackendApi = {
  getDashboard: () => apiGet<MerchantDashboard>('/merchant-backend/dashboard'),
  getProfile: () => apiGet<MerchantProfile>('/merchant-backend/profile'),
  updateProfile: (data: { shopName?: string; shopLogo?: string; shopIntro?: string }) =>
    apiPut<MerchantProfile>('/merchant-backend/profile', data),

  // 商品
  getProducts: (params?: { status?: ProductStatus; page?: number; pageSize?: number }) => {
    const q = new URLSearchParams()
    if (params?.status) q.set('status', params.status)
    q.set('page', String(params?.page ?? 1))
    q.set('pageSize', String(params?.pageSize ?? 20))
    return apiGetPaged<MerchantProduct>(`/merchant-backend/products?${q.toString()}`)
  },
  getProduct: (id: string) => apiGet<MerchantProduct>(`/merchant-backend/products/${id}`),
  createProduct: (data: Record<string, unknown>) => apiPost<MerchantProduct>('/merchant-backend/products', data),
  updateProduct: (id: string, data: Record<string, unknown>) => apiPut<MerchantProduct>(`/merchant-backend/products/${id}`, data),
  deleteProduct: (id: string) => apiDelete(`/merchant-backend/products/${id}`),
  listProduct: (id: string) => apiPost(`/merchant-backend/products/${id}/list`, {}),
  unlistProduct: (id: string) => apiPost(`/merchant-backend/products/${id}/unlist`, {}),

  // SKU（B3 多规格矩阵·店铺身份·后端归一到 owner）
  /** 为商品添加一条 SKU：specs=规格键值对，price 必填，stock 选填 */
  addSku: (productId: string, data: { specs?: Record<string, string>; name?: string; price: number; stock?: number }) =>
    apiPost<MerchantProductSku>(`/merchant-backend/products/${productId}/skus`, data),
  /** 删除一条 SKU（按 skuId） */
  deleteSku: (skuId: string) => apiDelete(`/merchant-backend/skus/${skuId}`),

  // 订单
  getOrders: (params?: { status?: MerchantOrderStatus; page?: number; pageSize?: number }) => {
    const q = new URLSearchParams()
    if (params?.status) q.set('status', params.status)
    q.set('page', String(params?.page ?? 1))
    q.set('pageSize', String(params?.pageSize ?? 20))
    return apiGetPaged<MerchantOrder>(`/merchant-backend/orders?${q.toString()}`)
  },
  getOrder: (id: string) => apiGet<MerchantOrder>(`/merchant-backend/orders/${id}`),
  shipOrder: (id: string, company: string, trackingNo: string) =>
    apiPut(`/merchant-backend/orders/${id}/ship`, { company, trackingNo }),
  approveRefund: (id: string) => apiPost(`/merchant-backend/orders/${id}/refund/approve`, {}),
  rejectRefund: (id: string, reason: string) => apiPost(`/merchant-backend/orders/${id}/refund/reject`, { reason }),

  // 评价
  getReviews: (params?: { rating?: number; page?: number; pageSize?: number }) => {
    const q = new URLSearchParams()
    if (params?.rating) q.set('rating', String(params.rating))
    q.set('page', String(params?.page ?? 1))
    q.set('pageSize', String(params?.pageSize ?? 20))
    return apiGetPaged<MerchantReview>(`/merchant-backend/reviews?${q.toString()}`)
  },
  replyReview: (id: string, reply: string) => apiPost(`/merchant-backend/reviews/${id}/reply`, { reply }),

  // 收入与结算
  getRevenue: () => apiGet<RevenueOverview>('/merchant-backend/revenue'),
  getSettlements: (params?: { status?: string; page?: number; pageSize?: number }) => {
    const q = new URLSearchParams()
    if (params?.status) q.set('status', params.status)
    q.set('page', String(params?.page ?? 1))
    q.set('pageSize', String(params?.pageSize ?? 20))
    return apiGetPaged<MerchantSettlement>(`/merchant-backend/settlements?${q.toString()}`)
  },

  // 违规
  getViolations: (params?: { page?: number; pageSize?: number }) =>
    apiGetPaged<MerchantViolation>(`/merchant-backend/violations?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 20}`),
  appealViolation: (id: string, appeal: string) => apiPost(`/merchant-backend/violations/${id}/appeal`, { appeal }),

  // 客户 / 通知 / 咨询 / 内容
  getCustomers: (params?: { page?: number; pageSize?: number }) =>
    apiGetPaged<MerchantCustomer>(`/merchant-backend/customers?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 20}`),
  getNotices: () => apiGet<MerchantNotice[]>('/merchant-backend/notices'),
  getInquiries: (params?: { page?: number; pageSize?: number }) =>
    // 后端咨询子系统未实现（诚实降级返回空），结构未定 → 用宽松记录类型占位
    apiGetPaged<Record<string, unknown>>(`/merchant-backend/inquiries?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 20}`),
  getContentStats: () => apiGet<MerchantContentStats>('/merchant-backend/content-stats'),

  // 操作员（B8·MerchantMember）
  // 🔴 2026-07-14：这三个端点后端此前**根本不存在**（只有 admin 侧 /admin/merchants/:id/members），
  //    商家点进操作员管理必 404。本次已在 merchant-backend.controller 补齐，契约按后端对齐：
  //    店铺 id 由 MerchantGuard 从登录态推出（不传 id，杜绝越权）；添加按手机号；移除按 userId。
  /** 店铺成员列表（店主 OWNER + 操作员 OPERATOR·手机号后端已脱敏） */
  getMembers: () => apiGet<MerchantMember[]>('/merchant-backend/members'),
  /** 添加操作员（按手机号·对方须已注册平台；仅店主可操作，否则 403） */
  addMember: (phone: string) =>
    apiPost<{ success: boolean; userId: string; nickname: string }>('/merchant-backend/members', { phone }),
  /** 移除操作员（软删·不可移除店主；归属仍记店主·仅解除鉴权） */
  removeMember: (userId: string) => apiDelete(`/merchant-backend/members/${userId}`),
  /** 操作审计（后端未实现时可能 404 → 页面诚实占位「审计明细开发中」） */
  getMemberAudit: (params?: { page?: number; pageSize?: number }) =>
    apiGetPaged<MerchantMemberAudit>(
      `/merchant-backend/members/audit?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 20}`,
    ),

  // 履约健康（履-P1·后端 GET /merchant/my/metrics·MerchantGuard 商家身份校验）
  getMyMetrics: (days = 7) => apiGet<MerchantMetricsResp>(`/merchant/my/metrics?days=${days}`),

  // 信用评级（履-P2·后端 GET /merchant/my/credit·分数/等级/权益 + 周更变动 log 明细）
  getMyCredit: () => apiGet<MerchantCreditResp>('/merchant/my/credit'),
}

// ───────── 履约健康指标（履-P1） ─────────

/** 单日履约指标（率类字段后端取不到时诚实 null，页面 v-if 降级） */
export interface MerchantMetricItem {
  date: string // YYYY-MM-DD
  ordersCount: number
  shipOnTimeRate: string | number | null // Decimal 序列化可能为字符串
  avgShipHours: string | number | null
  refundRate: string | number | null
  returnRate: string | number | null
  avgRating: string | number | null
  complaintCount: number
  qcPassRate: string | number | null
}

export interface MerchantMetricsSummary {
  ordersCount: number
  shipOnTimeRate: number | null
  avgShipHours: number | null
  refundRate: number | null
  returnRate: number | null
  avgRating: number | null
  complaintCount: number
  qcPassRate: number | null
}

export interface MerchantMetricsResp {
  days: number
  items: MerchantMetricItem[]
  summary: MerchantMetricsSummary
}

// ───────── 信用评级（履-P2） ─────────

export type MerchantCreditGrade = 'A' | 'B' | 'C' | 'D'

/** 单因子明细（log.factors.factors 内条目·后端算分透明可复算） */
export interface MerchantCreditFactorDetail {
  weight: number
  value: number | null // 因子原始值（率/均分/月数），缺数据 null
  score: number
  neutral: boolean // 是否缺数据中性处理
  note?: string
}

export interface MerchantCreditLogItem {
  id: string
  oldScore: number
  newScore: number
  factors: {
    windowDays: number
    weekKey: string // 评估所属周的周一 YYYY-MM-DD
    observation: boolean
    factors: {
      ship: MerchantCreditFactorDetail
      refundReturn: MerchantCreditFactorDetail
      rating: MerchantCreditFactorDetail
      complaint: MerchantCreditFactorDetail
      qc: MerchantCreditFactorDetail
      tenure: MerchantCreditFactorDetail
    }
  }
  createdAt: string
}

export interface MerchantCreditResp {
  creditScore: number
  creditGrade: MerchantCreditGrade
  observation: boolean // 新商家观察期（<30 天·不参与流量加权）
  benefits: {
    label: string
    settlementCycleDays: number
    qcFrequency: string
    trafficBoost: boolean
    selectedBadge: boolean
  }
  logs: MerchantCreditLogItem[]
}

/** 信用等级展示映射（纯展示配置，非 mock 数据） */
export const creditGradeConfig: Record<MerchantCreditGrade, { label: string; color: string; bg: string }> = {
  A: { label: 'A 严选', color: '#b45309', bg: '#fef3c7' },
  B: { label: 'B 良好', color: '#15803d', bg: '#dcfce7' },
  C: { label: 'C 观察', color: '#c2410c', bg: '#ffedd5' },
  D: { label: 'D 高危', color: '#b91c1c', bg: '#fee2e2' },
}

/** 因子中文名（信用明细弹层展示） */
export const creditFactorNames: Record<string, string> = {
  ship: '发货时效',
  refundReturn: '退款退货',
  rating: '评价均分',
  complaint: '投诉率',
  qc: '品质抽检',
  tenure: '经营时长',
}

// ───────── UI 配置常量（非 mock 数据，纯展示映射，页面可直接 import） ─────────

/** 经营类目（apply 选类目 / product-edit 选分类）。后端无类目端点，前端配置。fee=类目佣金参考。 */
export const productCategories = [
  { id: 'guoxue', name: '国学课程', fee: '5%' },
  { id: 'guji', name: '古籍图书', fee: '3%' },
  { id: 'wenchuang', name: '文创用品', fee: '5%' },
  { id: 'wenfang', name: '文房四宝', fee: '5%' },
  { id: 'chadao', name: '茶道用品', fee: '5%' },
  { id: 'mingli', name: '命理咨询', fee: '10%' },
  { id: 'fengshui', name: '风水服务', fee: '10%' },
  { id: 'shufa', name: '书法字画', fee: '8%' },
]

export function categoryName(id?: string | null): string {
  if (!id) return '未分类'
  return productCategories.find((c) => c.id === id)?.name ?? id
}

/** 商品状态展示映射（含 stock=0 售罄派生） */
export function productStatusLabel(p: { status: ProductStatus; stock: number }): { label: string; color: string; bg: string } {
  if (p.status === 'ON_SALE' && p.stock <= 0) return { label: '已售罄', color: '#b91c1c', bg: '#fee2e2' }
  switch (p.status) {
    case 'ON_SALE': return { label: '已上架', color: '#15803d', bg: '#dcfce7' }
    case 'OFF_SHELF': return { label: '已下架', color: '#374151', bg: '#f3f4f6' }
    case 'PENDING': return { label: '审核中', color: '#b45309', bg: '#fef3c7' }
    default: return { label: '未知', color: '#374151', bg: '#f3f4f6' }
  }
}

export const orderStatusConfig: Record<MerchantOrderStatus, { label: string; icon: string; color: string; bg: string }> = {
  PENDING: { label: '待付款', icon: 'clock', color: '#9333ea', bg: '#faf5ff' },
  PAID: { label: '待发货', icon: 'package', color: '#ea580c', bg: '#fff7ed' },
  SHIPPED: { label: '已发货', icon: 'truck', color: '#2563eb', bg: '#eff6ff' },
  COMPLETED: { label: '已完成', icon: 'check-circle', color: '#16a34a', bg: '#f0fdf4' },
  REFUNDED: { label: '已退款', icon: 'trending-down', color: '#dc2626', bg: '#fef2f2' },
  CANCELLED: { label: '已取消', icon: 'x-circle', color: '#4b5563', bg: '#f9fafb' },
}

export const violationTypeConfig: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  MINOR: { label: '轻微', icon: 'alert-triangle', color: '#d97706', bg: '#fffbeb' },
  MODERATE: { label: '中度', icon: 'alert-circle', color: '#ea580c', bg: '#fff7ed' },
  SEVERE: { label: '严重', icon: 'shield-alert', color: '#dc2626', bg: '#fef2f2' },
}

export const violationStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: '待处理', color: '#b91c1c', bg: '#fee2e2' },
  CONFIRMED: { label: '已确认', color: '#374151', bg: '#f3f4f6' },
  DISMISSED: { label: '已撤销', color: '#15803d', bg: '#dcfce7' },
}

export const settlementStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: '待结算', color: '#b45309', bg: '#fef3c7' },
  PAID: { label: '已结算', color: '#15803d', bg: '#dcfce7' },
  CANCELLED: { label: '已取消', color: '#4b5563', bg: '#f3f4f6' },
}

/** 操作员权限展示映射（B8·添加弹层勾选项 + 列表权限胶囊）。sensitive=敏感权限默认不勾选。 */
export const memberPermConfig: { key: MerchantMemberPerm; label: string; sub: string; sensitive?: boolean }[] = [
  { key: 'PRODUCT', label: '商品管理', sub: '新建 / 编辑 / 上下架' },
  { key: 'ORDER', label: '订单处理', sub: '发货 / 售后' },
  { key: 'REVIEW', label: '评价回复', sub: '' },
  { key: 'MESSAGE', label: '消息中心', sub: '' },
  { key: 'SETTLEMENT', label: '结算查看', sub: '敏感，默认关', sensitive: true },
]

export function memberPermLabel(k: MerchantMemberPerm): string {
  return memberPermConfig.find((p) => p.key === k)?.label ?? k
}

/** 物流公司（发货选择器） */
export const expressCompanies = [
  '顺丰速运', '韵达快递', '中通快递', '圆通速递', '申通快递', '京东物流', 'EMS', '德邦物流',
]
