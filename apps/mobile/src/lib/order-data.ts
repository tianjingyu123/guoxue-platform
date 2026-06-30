/**
 * 订单中心数据层 —— 全部真连后端，无 mock。
 * 商品订单：/shop/orders/*（统一订单中心 /orders/my）
 * 售后/退款/纠纷：/shop/orders/:id/after-sale、/shop/after-sales/*（平台仅一套售后子系统，退款页与纠纷页共用之）
 * 物流：/shop/orders/:id/logistics
 * 评价：/shop/products/:id/reviews
 * 发票：后端暂无电子发票子系统 —— 诚实降级（见文末 invoice 三方法），不臆造数据。
 * 图片走后端真实字段（product.images[0]），无则前端 v-if 降级。
 */
import { apiGet, apiPost, apiPut } from '@/utils/request'

/* ============================================================
   一、商品订单列表（app/orders）
   ============================================================ */

export type OrderStatus =
  | 'pending_pay' | 'pending_ship' | 'pending_receive'
  | 'completed' | 'cancelled' | 'after_sale'

export interface OrderProduct {
  id: string
  name: string
  cover: string
  skuName: string
  price: number
  quantity: number
}
export interface OrderListItem {
  id: string
  orderNo: string
  status: OrderStatus
  totalAmount: number
  payAmount: number
  createdAt: string
  paidAt?: string
  shippedAt?: string
  completedAt?: string
  products: OrderProduct[]
  canCancel: boolean
  canConfirm: boolean
  canReview: boolean
  hasAfterSale: boolean
}

export const orderStatusTabs: { key: string; label: string }[] = [
  { key: '', label: '全部' },
  { key: 'pending_pay', label: '待付款' },
  { key: 'pending_ship', label: '待发货' },
  { key: 'pending_receive', label: '待收货' },
  { key: 'completed', label: '已完成' },
  { key: 'after_sale', label: '售后' },
]

export const orderStatusConfig: Record<string, { label: string; color: string; icon: string }> = {
  pending_pay: { label: '待付款', color: '#C41E3A', icon: 'clock' },
  pending_ship: { label: '待发货', color: '#C9A96E', icon: 'package' },
  pending_receive: { label: '待收货', color: '#3B82F6', icon: 'truck' },
  completed: { label: '已完成', color: '#22C55E', icon: 'check-circle' },
  cancelled: { label: '已取消', color: '#999999', icon: 'x' },
  after_sale: { label: '售后中', color: '#F97316', icon: 'alert-circle' },
}

export const orderCancelReasons = ['不想要了', '信息填写错误', '重复下单', '其他原因']

/* ============================================================
   二、统一订单中心（app/orders/center · 多品类）
   ============================================================ */

export type OrderCategory =
  | 'all' | 'product' | 'course' | 'circle' | 'live'
  | 'activity' | 'qa' | 'membership' | 'station' | 'institute'

export const orderCategories: { key: OrderCategory; label: string; icon: string }[] = [
  { key: 'all', label: '全部', icon: 'package' },
  { key: 'product', label: '商品', icon: 'shopping-bag' },
  { key: 'course', label: '课程', icon: 'book-open' },
  { key: 'circle', label: '圈子', icon: 'users' },
  { key: 'live', label: '直播', icon: 'radio' },
  { key: 'activity', label: '活动', icon: 'ticket' },
  { key: 'qa', label: '问答', icon: 'message-circle' },
  { key: 'membership', label: '会员', icon: 'gift' },
  { key: 'station', label: '分站', icon: 'building-2' },
  { key: 'institute', label: '研究院', icon: 'graduation-cap' },
]

export type UnifiedOrderStatus = 'pending' | 'paid' | 'completed' | 'cancelled' | 'refunding' | 'expired'

export const unifiedStatusConfig: Record<UnifiedOrderStatus, { label: string; color: string }> = {
  pending: { label: '待付款', color: '#F59E0B' },
  paid: { label: '已付款', color: '#3B82F6' },
  completed: { label: '已完成', color: '#22C55E' },
  cancelled: { label: '已取消', color: '#999999' },
  refunding: { label: '退款中', color: '#F97316' },
  expired: { label: '已过期', color: '#EF4444' },
}

export const categoryColorMap: Record<OrderCategory, { bg: string; color: string }> = {
  all: { bg: '#F3F0EB', color: '#999999' },
  product: { bg: '#FBEAEC', color: '#C41E3A' },
  course: { bg: '#FBF3E3', color: '#C9A96E' },
  circle: { bg: '#FBEAEC', color: '#C41E3A' },
  live: { bg: '#EAF2FB', color: '#3B82F6' },
  activity: { bg: '#FFF3E8', color: '#F97316' },
  qa: { bg: '#E9F7EF', color: '#22C55E' },
  membership: { bg: '#FFF8E6', color: '#F59E0B' },
  station: { bg: '#E9F7EF', color: '#22C55E' },
  institute: { bg: '#FFF3E8', color: '#F97316' },
}

export interface UnifiedOrder {
  id: string
  orderNo: string
  category: OrderCategory
  title: string
  cover?: string
  price: number
  originalPrice?: number
  status: UnifiedOrderStatus
  createdAt: string
  paidAt?: string
  expiredAt?: string
  extra?: { circleName?: string; teacherName?: string; duration?: string; quantity?: number }
}

/* ============================================================
   三、订单详情（app/orders/[id]）
   ============================================================ */

export interface OrderAddress {
  id: string; name: string; phone: string
  province: string; city: string; district: string; address: string; isDefault: boolean
}
export interface OrderLogisticsBrief {
  company: string; trackingNo: string; status: string
  timeline: { time: string; content: string }[]
}
export interface OrderDetail extends OrderListItem {
  address?: OrderAddress
  payMethod?: string
  logistics?: OrderLogisticsBrief
  coupon?: { name: string; discount: number }
  remark?: string
}

export const detailSteps = [
  { key: 'created', label: '提交订单' },
  { key: 'paid', label: '付款成功' },
  { key: 'shipped', label: '商家发货' },
  { key: 'completed', label: '交易完成' },
]

export const detailStatusConfig: Record<string, { icon: string; color: string; bg: string; text: string; step: number }> = {
  pending_pay: { icon: 'clock', color: '#C41E3A', bg: 'rgba(196,30,58,0.1)', text: '待付款', step: 1 },
  pending_ship: { icon: 'package', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', text: '待发货', step: 2 },
  pending_receive: { icon: 'truck', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)', text: '待收货', step: 3 },
  completed: { icon: 'check-circle', color: '#10B981', bg: 'rgba(16,185,129,0.1)', text: '已完成', step: 4 },
  cancelled: { icon: 'x-circle', color: '#6B7280', bg: 'rgba(107,114,128,0.1)', text: '已取消', step: 0 },
  after_sale: { icon: 'refresh-cw', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', text: '售后中', step: 3 },
}

/* ============================================================
   四、物流详情（app/orders/logistics）
   ============================================================ */

export interface LogisticsTrack {
  status: string; description: string; time: string; location: string; isCurrent: boolean
}
export interface LogisticsDetail {
  orderId: string; orderNo: string
  company: string; companyPhone: string; trackingNo: string
  status: string; estimatedDelivery?: string
  courierName?: string; courierPhone?: string
  receiver: { name: string; phone: string; address: string }
  tracks: LogisticsTrack[]
}

export const logisticsStatusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待揽收', color: '#6B7280' },
  picked: { label: '已揽收', color: '#3B82F6' },
  in_transit: { label: '运输中', color: '#C41E3A' },
  delivering: { label: '派送中', color: '#F97316' },
  delivered: { label: '已送达', color: '#22C55E' },
  signed: { label: '已签收', color: '#16A34A' },
}

/* ============================================================
   五、订单评价（app/orders/[id]/review）
   ============================================================ */

export interface ReviewItem { id: string; name: string; cover: string }
export const reviewTagsByRating: Record<number, string[]> = {
  5: ['正品保证', '包装精美', '物流很快', '与描述一致', '非常满意', '强烈推荐'],
  4: ['商品不错', '物流及时', '整体满意'],
  3: ['一般般', '与描述基本一致'],
  2: ['质量较差', '与描述不符'],
  1: ['质量很差', '货不对板', '不推荐'],
}
export const reviewRatingLabels = ['', '很差', '较差', '一般', '不错', '非常好']

/* ============================================================
   六、发票管理（app/orders/invoice）—— 后端暂无电子发票子系统
   ============================================================ */

export interface InvoiceOrder { orderId: string; orderNo: string; amount: number; createdAt: string; productName: string }
export interface InvoiceRecord {
  id: string; type: 'personal' | 'company'; title: string; taxNumber?: string
  amount: number; status: 'pending' | 'processing' | 'completed' | 'rejected'
  email: string; createdAt: string; completedAt?: string; rejectReason?: string
}
/** 电子发票功能是否已接入后端（当前后端无发票子系统，统一降级） */
export const INVOICE_AVAILABLE = false

export const invoiceStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: '待处理', color: '#A16207', bg: '#FEF9C3' },
  processing: { label: '开票中', color: '#1D4ED8', bg: '#DBEAFE' },
  completed: { label: '已开具', color: '#15803D', bg: '#DCFCE7' },
  rejected: { label: '已驳回', color: '#B91C1C', bg: '#FEE2E2' },
}

/* ============================================================
   七、退款进度（app/orders/refund-progress）
   ============================================================ */

export interface RefundTimelineNode { status: string; title: string; description: string; time: string; isCurrent: boolean }
export interface RefundDetail {
  id: string; orderId: string; orderNo: string
  type: 'refund_only' | 'return_refund'
  status: 'submitted' | 'merchant_review' | 'platform_review' | 'refunding' | 'completed'
  reason: string; amount: number; description: string
  product?: OrderProduct
  timeline: RefundTimelineNode[]
  createdAt: string; canCancel: boolean
}

/* ============================================================
   八、纠纷申诉（app/orders/dispute）—— 复用售后子系统
   ============================================================ */

export const disputeTypes = [
  { value: 'not_received', label: '未收到货', icon: 'package', desc: '已付款但未收到商品' },
  { value: 'not_as_described', label: '商品不符', icon: 'file-text', desc: '收到的商品与描述不符' },
  { value: 'quality_issue', label: '质量问题', icon: 'alert-triangle', desc: '商品存在质量缺陷' },
  { value: 'other', label: '其他问题', icon: 'help-circle', desc: '其他交易纠纷' },
]

export interface DisputeOrderBrief { orderId: string; orderNo: string; productName: string; productCover: string; amount: number; createdAt: string }
export interface DisputeListItem { id: string; orderId: string; orderNo: string; type: string; status: string; productName: string; productCover: string; createdAt: string }
export interface DisputeDetail {
  id: string; orderId: string; orderNo: string; type: string; status: string
  description: string; images: string[]; expectation: string
  order: DisputeOrderBrief
  timeline: { status: string; title: string; description: string; time: string; isCurrent: boolean }[]
  createdAt: string; canCancel: boolean
}

export const disputeStatusConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending: { label: '待处理', color: '#F97316', bg: '#FFF3E8', icon: 'clock' },
  processing: { label: '处理中', color: '#3B82F6', bg: '#EAF2FB', icon: 'clock' },
  resolved: { label: '已解决', color: '#22C55E', bg: '#E9F7EF', icon: 'check' },
  rejected: { label: '已驳回', color: '#EF4444', bg: '#FEE2E2', icon: 'x-circle' },
  cancelled: { label: '已取消', color: '#999999', bg: '#F3F0EB', icon: 'x-circle' },
}

export function getDisputeTypeLabel(type: string) {
  return disputeTypes.find((t) => t.value === type)?.label || type
}

/* ============================================================
   适配工具：后端真实结构 → 前端视图模型
   ============================================================ */

/** ISO 时间 → 'YYYY-MM-DD HH:mm'（uni-app 多端无 dayjs 依赖，手写格式化） */
function fmtTime(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

const num = (v: any): number => { const n = Number(v); return isNaN(n) ? 0 : n }

/** 后端短订单号：取 UUID 前 8 位大写，供展示/复制 */
function shortNo(id: string): string {
  return id ? id.replace(/-/g, '').slice(0, 12).toUpperCase() : ''
}

/** 后端 OrderStatus → 前端列表状态枚举 */
const ORDER_STATUS_MAP: Record<string, OrderStatus> = {
  PENDING: 'pending_pay', PAID: 'pending_ship', SHIPPED: 'pending_receive',
  COMPLETED: 'completed', CANCELLED: 'cancelled', REFUNDED: 'after_sale',
}

/** 前端 tab key → 后端订单状态枚举（ORDER_STATUS_MAP 反向），供列表按状态分页过滤 */
const TAB_TO_STATUS: Record<string, string> = {
  pending_pay: 'PENDING', pending_ship: 'PAID', pending_receive: 'SHIPPED',
  completed: 'COMPLETED', after_sale: 'REFUNDED', cancelled: 'CANCELLED',
}

/** 后端 orderType（SHOP/MEMBER/BUNDLE）→ 前端统一中心品类 */
const ORDER_TYPE_CATEGORY: Record<string, OrderCategory> = {
  SHOP: 'product', MEMBER: 'membership', BUNDLE: 'station', COURSE: 'course',
}

/** 统一中心状态映射 */
const UNIFIED_STATUS_MAP: Record<string, UnifiedOrderStatus> = {
  PENDING: 'pending', PAID: 'paid', SHIPPED: 'paid', COMPLETED: 'completed',
  CANCELLED: 'cancelled', REFUNDED: 'refunding', CLAIMED: 'completed',
}

/** 售后/纠纷状态映射（后端 AfterSale.status → 前端 dispute 状态） */
const AFTERSALE_STATUS_MAP: Record<string, string> = {
  PENDING: 'pending', PROCESSING: 'processing', APPROVED: 'resolved',
  COMPLETED: 'resolved', REJECTED: 'rejected', CANCELLED: 'cancelled',
}

/** 售后/申诉类型 → 中文标签（兼容两套词表：售后方式 refund/return/exchange、申诉原因 not_received 等） */
const AFTERSALE_TYPE_LABEL: Record<string, string> = {
  refund: '仅退款', return: '退货退款', exchange: '换货',
  not_received: '未收到货', not_as_described: '商品不符', quality_issue: '质量问题', other: '其他问题',
}
const typeText = (t: string) => AFTERSALE_TYPE_LABEL[t] || t

/** 单条后端订单 → 一条商品行（订单为单商品模型；无商品信息时降级为通用名） */
function toOrderProduct(o: any): OrderProduct {
  return {
    id: o.product?.id || o.targetId || '',
    name: o.product?.title || '商品',
    cover: o.product?.cover || '',
    skuName: o.sku?.skuName || '',
    price: num(o.payAmount ?? o.amount),
    quantity: 1,
  }
}

function adaptOrderListItem(o: any): OrderListItem {
  return {
    id: o.id,
    orderNo: shortNo(o.id),
    status: ORDER_STATUS_MAP[o.status] || 'completed',
    totalAmount: num(o.originalAmount ?? o.amount),
    payAmount: num(o.payAmount ?? o.amount),
    createdAt: fmtTime(o.createdAt),
    paidAt: o.paidAt ? fmtTime(o.paidAt) : undefined,
    shippedAt: o.shippedAt ? fmtTime(o.shippedAt) : undefined,
    completedAt: o.completedAt ? fmtTime(o.completedAt) : undefined,
    products: [toOrderProduct(o)],
    canCancel: o.status === 'PENDING',
    canConfirm: o.status === 'SHIPPED',
    canReview: o.status === 'COMPLETED',
    hasAfterSale: o.status === 'REFUNDED',
  }
}

function adaptOrderDetail(o: any): OrderDetail {
  const base = adaptOrderListItem(o)
  return {
    ...base,
    // 后端 Order 模型无收货地址/备注字段 → 不提供，详情页 v-if 降级隐藏
    payMethod: o.payMethod === 'WECHAT' ? '微信支付' : o.payMethod === 'ALIPAY' ? '支付宝' : (o.payMethod || undefined),
  }
}

function adaptUnifiedOrder(o: any): UnifiedOrder {
  const category = ORDER_TYPE_CATEGORY[o.orderType] || 'product'
  const title = o.title || o.bundle?.name || (o.memberType ? `会员 · ${o.memberType}` : '订单')
  return {
    id: o.id,
    orderNo: shortNo(o.id),
    category,
    title,
    cover: o.cover || undefined,
    price: num(o.payAmount ?? o.amount),
    status: UNIFIED_STATUS_MAP[o.status] || 'completed',
    createdAt: fmtTime(o.createdAt),
  }
}

/** 后端 {order, logistics} → 前端 LogisticsDetail */
function adaptLogistics(orderId: string, raw: any): LogisticsDetail {
  const lg = raw?.logistics
  const ord = raw?.order
  const tracks: LogisticsTrack[] = Array.isArray(lg?.trackingData)
    ? lg.trackingData
        .slice()
        .sort((a: any, b: any) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .map((t: any, i: number) => ({
          status: t.status || '',
          description: t.desc || t.description || '',
          time: fmtTime(t.time),
          location: '',
          isCurrent: i === 0,
        }))
    : []
  const receiverAddr = lg
    ? [lg.province, lg.city, lg.district, lg.address].filter(Boolean).join('')
    : ''
  return {
    orderId,
    orderNo: shortNo(orderId),
    company: lg?.company || '',
    companyPhone: '', // 后端无承运商客服电话
    trackingNo: lg?.logisticsNo || '',
    status: (lg?.status || ord?.status || '').toString().toLowerCase(),
    courierName: undefined, // 后端无快递员信息（contactName 是收货人，不可混用）
    courierPhone: undefined,
    receiver: {
      name: lg?.contactName || '',
      phone: lg?.contactPhone || '',
      address: receiverAddr,
    },
    tracks,
  }
}

/** 后端 AfterSale(enriched) → 前端纠纷列表项 */
function adaptDisputeListItem(a: any): DisputeListItem {
  return {
    id: a.id,
    orderId: a.orderId,
    orderNo: shortNo(a.orderId),
    type: typeText(a.type),
    status: AFTERSALE_STATUS_MAP[a.status] || 'pending',
    productName: a.product?.title || '商品',
    productCover: a.product?.cover || '',
    createdAt: fmtTime(a.createdAt),
  }
}

/** 由 AfterSale.status 派生时间轴（后端无逐节点时间，按真实状态推进） */
function buildAfterSaleTimeline(a: any) {
  const t0 = fmtTime(a.createdAt)
  const t1 = fmtTime(a.updatedAt)
  const submitted = { status: 'submitted', title: '提交申请', description: '您已成功提交售后申请', time: t0, isCurrent: false }
  if (a.status === 'CANCELLED') {
    return [submitted, { status: 'cancelled', title: '已撤销', description: '您已撤销本次售后申请', time: t1, isCurrent: true }]
  }
  if (a.status === 'REJECTED') {
    return [submitted, { status: 'rejected', title: '审核未通过', description: '商家未通过本次售后申请', time: t1, isCurrent: true }]
  }
  const processing = { status: 'processing', title: '商家处理中', description: '商家正在处理您的售后申请', time: t1, isCurrent: a.status === 'PENDING' || a.status === 'PROCESSING' }
  if (a.status === 'PENDING' || a.status === 'PROCESSING') return [submitted, processing]
  // APPROVED / COMPLETED
  return [
    submitted,
    { ...processing, isCurrent: false },
    { status: 'completed', title: '处理完成', description: '售后已处理完成', time: t1, isCurrent: true },
  ]
}

function adaptDisputeDetail(a: any): DisputeDetail {
  const orderBrief: DisputeOrderBrief = {
    orderId: a.orderId,
    orderNo: shortNo(a.orderId),
    productName: a.product?.title || '商品',
    productCover: a.product?.cover || '',
    amount: num(a.amount ?? a.order?.amount),
    createdAt: fmtTime(a.order?.createdAt || a.createdAt),
  }
  return {
    id: a.id,
    orderId: a.orderId,
    orderNo: shortNo(a.orderId),
    type: typeText(a.type),
    status: AFTERSALE_STATUS_MAP[a.status] || 'pending',
    description: a.reason || '',
    images: [],
    expectation: '',
    order: orderBrief,
    timeline: buildAfterSaleTimeline(a),
    createdAt: fmtTime(a.createdAt),
    canCancel: a.status === 'PENDING',
  }
}

/** 后端 AfterSale(enriched) → 前端退款进度（退款页与纠纷页共用售后子系统） */
function adaptRefundDetail(a: any): RefundDetail {
  const statusMap: Record<string, RefundDetail['status']> = {
    PENDING: 'merchant_review', PROCESSING: 'platform_review',
    APPROVED: 'refunding', COMPLETED: 'completed', REJECTED: 'submitted', CANCELLED: 'submitted',
  }
  const tl = buildAfterSaleTimeline(a)
  return {
    id: a.id,
    orderId: a.orderId,
    orderNo: shortNo(a.orderId),
    type: a.type === 'return' ? 'return_refund' : 'refund_only',
    status: statusMap[a.status] || 'submitted',
    reason: a.reason || '',
    amount: num(a.amount ?? a.order?.amount),
    description: a.reason || '',
    product: a.product ? { id: a.product.id, name: a.product.title, cover: a.product.cover || '', skuName: '', price: num(a.product.price), quantity: 1 } : undefined,
    timeline: tl,
    createdAt: fmtTime(a.createdAt),
    canCancel: a.status === 'PENDING',
  }
}

// ============ API 层（全部真连，错误向上传播由页面三态处理） ============

export const orderApi = {
  /** 我的商品订单列表（后端按状态分页）。tab 为前端 tab key(空=全部)，返回 {items,total} 供 useList */
  async list(tab?: string, page = 1, pageSize = 20): Promise<{ items: OrderListItem[]; total: number }> {
    const status = tab ? TAB_TO_STATUS[tab] : undefined
    const qs = `page=${page}&pageSize=${pageSize}${status ? `&status=${status}` : ''}`
    const res = await apiGet<{ orders: any[]; total?: number }>(`/shop/orders/my?${qs}`)
    const items = (res?.orders || []).map(adaptOrderListItem)
    return { items, total: res?.total ?? items.length }
  },

  /** 取消订单（仅待付款可取消，后端校验） */
  async cancel(orderId: string, _reason?: string): Promise<boolean> {
    await apiPut(`/shop/orders/${orderId}/cancel`, {})
    return true
  },

  /** 确认收货（买家，后端仅放行已发货订单） */
  async confirm(orderId: string): Promise<boolean> {
    await apiPost(`/shop/orders/${orderId}/confirm`, {})
    return true
  },

  /** 订单详情 */
  async detail(orderId: string): Promise<OrderDetail> {
    const o = await apiGet<any>(`/shop/orders/${orderId}`)
    return adaptOrderDetail(o)
  },

  /** 统一订单中心（商城+会员+权益包，跨品类聚合） */
  async center(_category?: string): Promise<UnifiedOrder[]> {
    const res = await apiGet<{ orders: any[] }>(`/orders/my?page=1&pageSize=100`)
    return (res?.orders || []).map(adaptUnifiedOrder)
  },

  /** 物流详情 */
  async logistics(orderId: string): Promise<LogisticsDetail> {
    const raw = await apiGet<any>(`/shop/orders/${orderId}/logistics`)
    return adaptLogistics(orderId, raw)
  },

  /** 加载订单可评价商品（评价页用，来自订单详情） */
  async reviewItems(orderId: string): Promise<ReviewItem[]> {
    const o = await apiGet<any>(`/shop/orders/${orderId}`)
    return (adaptOrderDetail(o).products || []).map((p) => ({ id: p.id, name: p.name, cover: p.cover }))
  },

  /** 提交评价（按商品逐条提交至 /shop/products/:id/reviews，tags 并入内容） */
  async submitReview(_orderId: string, items: { productId: string; rating: number; tags: string[]; content: string }[]): Promise<boolean> {
    for (const it of items) {
      if (!it.productId) continue
      const tagPrefix = it.tags?.length ? `【${it.tags.join('·')}】` : ''
      await apiPost(`/shop/products/${it.productId}/reviews`, {
        rating: it.rating,
        content: `${tagPrefix}${it.content || '用户未填写文字评价'}`.slice(0, 500),
      })
    }
    return true
  },

  /** —— 发票：后端暂无电子发票子系统，诚实降级（返回空，页面展示"即将开放"） —— */
  async getInvoiceOrders(): Promise<InvoiceOrder[]> {
    return []
  },
  async getInvoices(): Promise<InvoiceRecord[]> {
    return []
  },
  async applyInvoice(_orderIds?: string[], _type?: 'personal' | 'company', _title?: string, _email?: string, _taxNumber?: string): Promise<boolean> {
    throw new Error('电子发票功能即将开放，如需发票请联系在线客服')
  },

  /** 退款进度（按 orderId 在用户售后单中匹配最新一条） */
  async refundProgress(orderId: string): Promise<RefundDetail> {
    const res = await apiGet<any>(`/shop/after-sales?page=1&pageSize=100`)
    const list = Array.isArray(res) ? res : (res?.items || [])
    const matched = orderId ? list.find((a: any) => a.orderId === orderId) : list[0]
    if (!matched) throw new Error('暂无该订单的退款记录')
    return adaptRefundDetail(matched)
  },

  /** 纠纷/售后：创建表单的订单简要（来自订单详情） */
  async getDisputeOrder(orderId: string): Promise<DisputeOrderBrief> {
    if (!orderId) throw new Error('缺少订单信息')
    const o = await apiGet<any>(`/shop/orders/${orderId}`)
    const p = o.product
    return {
      orderId: o.id,
      orderNo: shortNo(o.id),
      productName: p?.title || '商品',
      productCover: p?.cover || '',
      amount: num(o.payAmount ?? o.amount),
      createdAt: fmtTime(o.createdAt),
    }
  },

  /** 我的纠纷/售后列表 */
  async getDisputes(): Promise<DisputeListItem[]> {
    const res = await apiGet<any>(`/shop/after-sales?page=1&pageSize=100`)
    const list = Array.isArray(res) ? res : (res?.items || [])
    return list.map(adaptDisputeListItem)
  },

  /** 纠纷/售后详情 */
  async disputeDetail(disputeId: string): Promise<DisputeDetail> {
    const a = await apiGet<any>(`/shop/after-sales/${disputeId}`)
    return adaptDisputeDetail(a)
  },

  /** 提交纠纷/售后申请（映射至订单售后；description+expectation 合并为 reason） */
  async submitDispute(orderId: string, type: string, description: string, expectation: string, _images?: string[]): Promise<boolean> {
    if (!orderId) throw new Error('缺少订单信息')
    const reason = [getDisputeTypeLabel(type), description, expectation ? `期望：${expectation}` : '']
      .filter(Boolean).join('；').slice(0, 500)
    await apiPost(`/shop/orders/${orderId}/after-sale`, { type, reason })
    return true
  },

  /** 撤销纠纷/售后申请 */
  async cancelDispute(disputeId: string): Promise<boolean> {
    await apiPut(`/shop/after-sales/${disputeId}/cancel`, {})
    return true
  },
}
