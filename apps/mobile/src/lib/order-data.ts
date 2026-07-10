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
  /** 后端 OrderType（PRODUCT/COURSE/MEMBER/...），仅 PRODUCT 为实物 */
  orderType: string
  /** 虚拟商品订单（课程/会员等）：无物流/发货/收货语义 */
  isVirtual: boolean
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

/** 状态语义色（订单列表重设计拍板）：待付款金 --gold / 待发货蓝 / 待收货绿 / 已完成·已取消灰 / 售后橙 */
export const orderStatusConfig: Record<string, { label: string; color: string; icon: string }> = {
  pending_pay: { label: '待付款', color: '#C9A96E', icon: 'clock' },
  pending_ship: { label: '待发货', color: '#3B82F6', icon: 'package' },
  pending_receive: { label: '待收货', color: '#22C55E', icon: 'truck' },
  completed: { label: '已完成', color: '#999999', icon: 'check-circle' },
  cancelled: { label: '已取消', color: '#999999', icon: 'x' },
  after_sale: { label: '售后中', color: '#F97316', icon: 'alert-circle' },
}

export const orderCancelReasons = ['不想要了', '信息填写错误', '重复下单', '其他原因']

/** 订单来源行（卡头左侧）：按后端 OrderType 展示业务域标识 */
export const orderTypeMeta: Record<string, { label: string; icon: string }> = {
  PRODUCT: { label: '热卜商城', icon: 'store' },
  COURSE: { label: '课程订单', icon: 'book-open' },
  MEMBER: { label: '会员订单', icon: 'gift' },
  BUNDLE: { label: '权益包', icon: 'package' },
}

/* ============================================================
   二、（原「统一订单中心 /orders/center」多品类页为老原型冗余页，
       已下线删除 —— 入口统一收敛到 /orders 列表页，此处品类配置随之移除）
   ============================================================ */

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

/** 虚拟商品订单（课程/会员等）步骤：付款即交付，无「商家发货」环节 */
export const virtualDetailSteps = [
  { key: 'created', label: '提交订单' },
  { key: 'paid', label: '付款成功' },
  { key: 'completed', label: '开通完成' },
]

export const detailStatusConfig: Record<string, { icon: string; color: string; bg: string; text: string; step: number }> = {
  pending_pay: { icon: 'clock', color: '#C41E3A', bg: 'rgba(196,30,58,0.1)', text: '待付款', step: 1 },
  pending_ship: { icon: 'package', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', text: '待发货', step: 2 },
  pending_receive: { icon: 'truck', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)', text: '待收货', step: 3 },
  completed: { icon: 'check-circle', color: '#10B981', bg: 'rgba(16,185,129,0.1)', text: '已完成', step: 4 },
  cancelled: { icon: 'x-circle', color: '#6B7280', bg: 'rgba(107,114,128,0.1)', text: '已取消', step: 0 },
  after_sale: { icon: 'refresh-cw', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', text: '售后中', step: 3 },
}

/** 虚拟订单已支付态的状态卡覆盖（付款即开通，不显示「待发货」） */
export const virtualPaidStatus = { icon: 'check-circle', color: '#10B981', bg: 'rgba(16,185,129,0.1)', text: '已开通', step: 3 }

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
  // 无物流记录时 status 回落到订单状态（adaptLogistics）——补齐订单态词条，避免已取消订单显示「运输中」
  paid: { label: '待发货', color: '#F59E0B' },
  shipped: { label: '运输中', color: '#C41E3A' },
  completed: { label: '已签收', color: '#16A34A' },
  cancelled: { label: '订单已取消', color: '#6B7280' },
  refunded: { label: '已退款', color: '#6B7280' },
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

/* —— 后端原始响应类型（容错适配用，字段宽松全 optional，仅声明 adapter 实际访问到的字段） —— */
interface RawProductLite { id?: string; title?: string; cover?: string | null; price?: number | string }
interface RawSkuLite { skuName?: string }
/** 后端 Order 原始响应 */
interface RawOrder {
  id?: string
  status?: string
  orderType?: string
  amount?: number | string
  originalAmount?: number | string
  payAmount?: number | string
  createdAt?: string | null
  paidAt?: string | null
  shippedAt?: string | null
  completedAt?: string | null
  payMethod?: string
  title?: string
  cover?: string | null
  memberType?: string
  targetId?: string
  product?: RawProductLite | null
  sku?: RawSkuLite | null
  bundle?: { name?: string } | null
}
/** 后端物流轨迹节点 */
interface RawTrack { status?: string; desc?: string; description?: string; time?: string }
/** 后端 {order, logistics} 原始响应 */
interface RawLogisticsWrap {
  order?: { status?: string } | null
  logistics?: {
    company?: string
    logisticsNo?: string
    status?: string
    province?: string
    city?: string
    district?: string
    address?: string
    contactName?: string
    contactPhone?: string
    trackingData?: RawTrack[]
  } | null
}
/** 快递100 实时轨迹响应（GET /shop/logistics/track）
 *  后端 LogisticsService.queryTrack 归一化后的结构：
 *  { state, isCheck, company, logisticsNo, tracks:[{time,status,location}] }
 *  未配置/查询失败时为 { state:'unknown', message } 且无 tracks。 */
interface RawKuaidiResp {
  state?: string
  company?: string
  logisticsNo?: string
  message?: string
  tracks?: { time?: string; status?: string; location?: string }[]
}
/** 后端 AfterSale(enriched) 原始响应 */
interface RawAfterSale {
  id?: string
  orderId?: string
  status?: string
  type?: string
  reason?: string
  amount?: number | string
  createdAt?: string | null
  updatedAt?: string | null
  product?: RawProductLite | null
  order?: { amount?: number | string; createdAt?: string | null } | null
}

/** ISO 时间 → 'YYYY-MM-DD HH:mm'（uni-app 多端无 dayjs 依赖，手写格式化） */
function fmtTime(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

const num = (v: unknown): number => { const n = Number(v); return isNaN(n) ? 0 : n }

/** 后端短订单号：取 UUID 前 8 位大写，供展示/复制 */
function shortNo(id?: string): string {
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
const typeText = (t?: string) => (t ? AFTERSALE_TYPE_LABEL[t] || t : '')

/** 单条后端订单 → 一条商品行（订单为单商品模型；无商品信息时降级为通用名） */
function toOrderProduct(o: RawOrder): OrderProduct {
  return {
    id: o.product?.id || o.targetId || '',
    // 非实物订单（课程/会员等）无 product 关联，用订单标题兜底，避免显示成「商品」
    name: o.product?.title || o.title || (o.memberType ? `会员 · ${o.memberType}` : '商品'),
    cover: o.product?.cover || o.cover || '',
    skuName: o.sku?.skuName || '',
    price: num(o.payAmount ?? o.amount),
    quantity: 1,
  }
}

function adaptOrderListItem(o: RawOrder): OrderListItem {
  const orderType = o.orderType || 'PRODUCT'
  const isVirtual = orderType !== 'PRODUCT'
  return {
    id: o.id || '',
    orderNo: shortNo(o.id),
    status: ORDER_STATUS_MAP[o.status || ''] || 'completed',
    orderType,
    isVirtual,
    totalAmount: num(o.originalAmount ?? o.amount),
    payAmount: num(o.payAmount ?? o.amount),
    createdAt: fmtTime(o.createdAt),
    paidAt: o.paidAt ? fmtTime(o.paidAt) : undefined,
    shippedAt: o.shippedAt ? fmtTime(o.shippedAt) : undefined,
    completedAt: o.completedAt ? fmtTime(o.completedAt) : undefined,
    products: [toOrderProduct(o)],
    canCancel: o.status === 'PENDING',
    canConfirm: o.status === 'SHIPPED' && !isVirtual, // 虚拟商品无「确认收货」语义
    canReview: o.status === 'COMPLETED',
    hasAfterSale: o.status === 'REFUNDED',
  }
}

function adaptOrderDetail(o: RawOrder): OrderDetail {
  const base = adaptOrderListItem(o)
  return {
    ...base,
    // 后端 Order 模型无收货地址/备注字段 → 不提供，详情页 v-if 降级隐藏
    payMethod: o.payMethod === 'WECHAT' ? '微信支付' : o.payMethod === 'ALIPAY' ? '支付宝' : (o.payMethod || undefined),
  }
}

/** 后端 {order, logistics} → 前端 LogisticsDetail */
function adaptLogistics(orderId: string, raw: RawLogisticsWrap): LogisticsDetail {
  const lg = raw?.logistics
  const ord = raw?.order
  const tracks: LogisticsTrack[] = Array.isArray(lg?.trackingData)
    ? lg!.trackingData!
        .slice()
        .sort((a: RawTrack, b: RawTrack) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime())
        .map((t: RawTrack, i: number) => ({
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

/** 快递100 顶层 state（数字码）→ 前端物流状态键 */
const kuaidiStateMap: Record<string, string> = {
  '0': 'in_transit', // 在途
  '1': 'picked', // 已揽收
  '3': 'signed', // 已签收
  '5': 'delivering', // 派件中
}
function mapKuaidiState(state?: string): string {
  if (!state) return ''
  return kuaidiStateMap[String(state).charAt(0)] || 'in_transit'
}

/** 快递100 实时轨迹 → 前端时间线（快递100返回已按时间倒序，最新在前） */
function adaptKuaidiTracks(resp: RawKuaidiResp): LogisticsTrack[] {
  return (resp?.tracks || []).map((t, i) => ({
    status: '',
    description: t.status || '', // 后端已归一为轨迹描述文本
    time: fmtTime(t.time),
    location: t.location || '',
    isCurrent: i === 0,
  }))
}

/** 后端 AfterSale(enriched) → 前端纠纷列表项 */
function adaptDisputeListItem(a: RawAfterSale): DisputeListItem {
  return {
    id: a.id || '',
    orderId: a.orderId || '',
    orderNo: shortNo(a.orderId),
    type: typeText(a.type),
    status: AFTERSALE_STATUS_MAP[a.status || ''] || 'pending',
    productName: a.product?.title || '商品',
    productCover: a.product?.cover || '',
    createdAt: fmtTime(a.createdAt),
  }
}

/** 由 AfterSale.status 派生时间轴（后端无逐节点时间，按真实状态推进） */
function buildAfterSaleTimeline(a: RawAfterSale) {
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

function adaptDisputeDetail(a: RawAfterSale): DisputeDetail {
  const orderBrief: DisputeOrderBrief = {
    orderId: a.orderId || '',
    orderNo: shortNo(a.orderId),
    productName: a.product?.title || '商品',
    productCover: a.product?.cover || '',
    amount: num(a.amount ?? a.order?.amount),
    createdAt: fmtTime(a.order?.createdAt || a.createdAt),
  }
  return {
    id: a.id || '',
    orderId: a.orderId || '',
    orderNo: shortNo(a.orderId),
    type: typeText(a.type),
    status: AFTERSALE_STATUS_MAP[a.status || ''] || 'pending',
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
function adaptRefundDetail(a: RawAfterSale): RefundDetail {
  const statusMap: Record<string, RefundDetail['status']> = {
    PENDING: 'merchant_review', PROCESSING: 'platform_review',
    APPROVED: 'refunding', COMPLETED: 'completed', REJECTED: 'submitted', CANCELLED: 'submitted',
  }
  const tl = buildAfterSaleTimeline(a)
  return {
    id: a.id || '',
    orderId: a.orderId || '',
    orderNo: shortNo(a.orderId),
    type: a.type === 'return' ? 'return_refund' : 'refund_only',
    status: statusMap[a.status || ''] || 'submitted',
    reason: a.reason || '',
    amount: num(a.amount ?? a.order?.amount),
    description: a.reason || '',
    product: a.product ? { id: a.product.id || '', name: a.product.title || '商品', cover: a.product.cover || '', skuName: '', price: num(a.product.price), quantity: 1 } : undefined,
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
    const res = await apiGet<{ orders: RawOrder[]; total?: number }>(`/shop/orders/my?${qs}`)
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
    const o = await apiGet<RawOrder>(`/shop/orders/${orderId}`)
    return adaptOrderDetail(o)
  },

  /** 状态角标计数（列表页 Tab 角标：待付款/待发货/待收货）。
   *  复用分页接口 total（pageSize=1 轻量探测），单个失败不阻断其余角标。 */
  async statusCounts(): Promise<Record<string, number>> {
    const keys = ['pending_pay', 'pending_ship', 'pending_receive']
    const totals = await Promise.all(
      keys.map((k) =>
        apiGet<{ total?: number }>(`/shop/orders/my?page=1&pageSize=1&status=${TAB_TO_STATUS[k]}`)
          .then((r) => r?.total ?? 0)
          .catch(() => 0),
      ),
    )
    return Object.fromEntries(keys.map((k, i) => [k, totals[i]]))
  },

  /** 物流详情
   *  先取订单物流（收货信息 + DB 存储轨迹），再以快递100实时轨迹覆盖（best-effort）。
   *  实时查询失败/未配置时回退 DB 存储的 trackingData，页面照常三态渲染。 */
  async logistics(orderId: string): Promise<LogisticsDetail> {
    const raw = await apiGet<RawLogisticsWrap>(`/shop/orders/${orderId}/logistics`)
    const detail = adaptLogistics(orderId, raw)
    if (detail.trackingNo) {
      try {
        const qs =
          `no=${encodeURIComponent(detail.trackingNo)}` +
          (detail.company ? `&company=${encodeURIComponent(detail.company)}` : '')
        const kd = await apiGet<RawKuaidiResp>(`/shop/logistics/track?${qs}`)
        const live = adaptKuaidiTracks(kd)
        if (live.length) {
          detail.tracks = live
          const mapped = mapKuaidiState(kd.state)
          if (mapped) detail.status = mapped
        }
      } catch {
        // 快递100查询失败 —— 保留 DB 存储轨迹作为兜底，不阻断页面
      }
    }
    return detail
  },

  /** 加载订单可评价商品（评价页用，来自订单详情） */
  async reviewItems(orderId: string): Promise<ReviewItem[]> {
    const o = await apiGet<RawOrder>(`/shop/orders/${orderId}`)
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
    const res = await apiGet<RawAfterSale[] | { items: RawAfterSale[] }>(`/shop/after-sales?page=1&pageSize=100`)
    const list: RawAfterSale[] = Array.isArray(res) ? res : (res?.items || [])
    const matched = orderId ? list.find((a) => a.orderId === orderId) : list[0]
    if (!matched) throw new Error('暂无该订单的退款记录')
    return adaptRefundDetail(matched)
  },

  /** 纠纷/售后：创建表单的订单简要（来自订单详情） */
  async getDisputeOrder(orderId: string): Promise<DisputeOrderBrief> {
    if (!orderId) throw new Error('缺少订单信息')
    const o = await apiGet<RawOrder>(`/shop/orders/${orderId}`)
    const p = o.product
    return {
      orderId: o.id || '',
      orderNo: shortNo(o.id),
      productName: p?.title || '商品',
      productCover: p?.cover || '',
      amount: num(o.payAmount ?? o.amount),
      createdAt: fmtTime(o.createdAt),
    }
  },

  /** 我的纠纷/售后列表 */
  async getDisputes(): Promise<DisputeListItem[]> {
    const res = await apiGet<RawAfterSale[] | { items: RawAfterSale[] }>(`/shop/after-sales?page=1&pageSize=100`)
    const list: RawAfterSale[] = Array.isArray(res) ? res : (res?.items || [])
    return list.map(adaptDisputeListItem)
  },

  /** 纠纷/售后详情 */
  async disputeDetail(disputeId: string): Promise<DisputeDetail> {
    const a = await apiGet<RawAfterSale>(`/shop/after-sales/${disputeId}`)
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
