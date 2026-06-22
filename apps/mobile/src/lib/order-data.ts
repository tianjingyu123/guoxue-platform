/**
 * 订单中心数据层 - 从原型 app/orders/* 1:1 迁移
 * 含：商品订单列表 / 统一订单中心 / 订单详情 / 物流 / 评价 / 发票 / 退款进度 / 纠纷申诉
 */
import { apiGet, apiPost, useMock } from '@/utils/request'

/**
 * 图片走 /static（跨端约定）。
 */

const P = '/static/images/products'

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

export const mockOrders: OrderListItem[] = [
  {
    id: '1', orderNo: '202401150001', status: 'pending_pay', totalAmount: 256, payAmount: 256,
    createdAt: '2024-01-15 14:30',
    products: [
      { id: 'p1', name: '周易六十四卦详解（精装典藏版）', cover: `${P}/book1.jpg`, skuName: '精装版', price: 168, quantity: 1 },
      { id: 'p2', name: '紫微斗数入门教程', cover: `${P}/book2.jpg`, skuName: '平装版', price: 88, quantity: 1 },
    ],
    canCancel: true, canConfirm: false, canReview: false, hasAfterSale: false,
  },
  {
    id: '2', orderNo: '202401140002', status: 'pending_ship', totalAmount: 168, payAmount: 158,
    createdAt: '2024-01-14 10:20', paidAt: '2024-01-14 10:25',
    products: [{ id: 'p3', name: '八字命理学基础', cover: `${P}/book3.jpg`, skuName: '标准版', price: 168, quantity: 1 }],
    canCancel: true, canConfirm: false, canReview: false, hasAfterSale: false,
  },
  {
    id: '3', orderNo: '202401130003', status: 'pending_receive', totalAmount: 299, payAmount: 279,
    createdAt: '2024-01-13 09:15', paidAt: '2024-01-13 09:20', shippedAt: '2024-01-14 08:00',
    products: [{ id: 'p4', name: '风水布局实战指南', cover: `${P}/book4.jpg`, skuName: '精装版', price: 299, quantity: 1 }],
    canCancel: false, canConfirm: true, canReview: false, hasAfterSale: false,
  },
  {
    id: '4', orderNo: '202401100004', status: 'completed', totalAmount: 128, payAmount: 128,
    createdAt: '2024-01-10 16:40', paidAt: '2024-01-10 16:45', shippedAt: '2024-01-11 09:00', completedAt: '2024-01-13 14:30',
    products: [{ id: 'p5', name: '梅花易数速成', cover: `${P}/book5.jpg`, skuName: '电子版', price: 128, quantity: 1 }],
    canCancel: false, canConfirm: false, canReview: true, hasAfterSale: false,
  },
]

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

export const mockUnifiedOrders: UnifiedOrder[] = [
  { id: '1', orderNo: 'C202401150001', category: 'course', title: '八字入门实战精讲课', cover: `${P}/book1.jpg`, price: 299, originalPrice: 599, status: 'completed', createdAt: '2024-01-15 14:30', paidAt: '2024-01-15 14:32', extra: { teacherName: '张玄风', duration: '36课时' } },
  { id: '2', orderNo: 'R202401140002', category: 'circle', title: '八字命理研习社', cover: `${P}/book2.jpg`, price: 199, status: 'completed', createdAt: '2024-01-14 10:20', paidAt: '2024-01-14 10:25', expiredAt: '2025-01-14', extra: { circleName: '八字命理研习社' } },
  { id: '3', orderNo: 'P202401130003', category: 'product', title: '周易六十四卦详解（精装典藏版）', cover: `${P}/book3.jpg`, price: 168, status: 'paid', createdAt: '2024-01-13 09:15', paidAt: '2024-01-13 09:20', extra: { quantity: 1 } },
  { id: '4', orderNo: 'L202401120004', category: 'live', title: '紫微斗数实战直播课', cover: `${P}/book4.jpg`, price: 49.9, status: 'completed', createdAt: '2024-01-12 18:00', paidAt: '2024-01-12 18:02', extra: { teacherName: '李命理' } },
  { id: '5', orderNo: 'Q202401100005', category: 'qa', title: '八字婚姻分析咨询', cover: `${P}/book5.jpg`, price: 88, status: 'completed', createdAt: '2024-01-10 16:40', paidAt: '2024-01-10 16:45', extra: { teacherName: '王大师' } },
  { id: '6', orderNo: 'M202401080006', category: 'membership', title: '热卜国学VIP年卡', price: 365, originalPrice: 588, status: 'completed', createdAt: '2024-01-08 12:00', paidAt: '2024-01-08 12:05', expiredAt: '2025-01-08' },
  { id: '7', orderNo: 'A202401050007', category: 'activity', title: '新春开运讲座', cover: `${P}/book1.jpg`, price: 0, status: 'completed', createdAt: '2024-01-05 20:00', extra: { duration: '2小时' } },
  { id: '8', orderNo: 'S202312200008', category: 'station', title: '分站站长资格', price: 999, status: 'completed', createdAt: '2023-12-20 10:00', paidAt: '2023-12-20 10:05', expiredAt: '2024-12-20' },
  { id: '9', orderNo: 'I202312150009', category: 'institute', title: '研究院保证金', price: 10000, status: 'completed', createdAt: '2023-12-15 14:00', paidAt: '2023-12-15 14:10', expiredAt: '2024-12-15', extra: { circleName: '热卜国学研究院' } },
  { id: '10', orderNo: 'C202401160010', category: 'course', title: '风水堪舆高级班', cover: `${P}/book2.jpg`, price: 1299, status: 'pending', createdAt: '2024-01-16 09:00', extra: { teacherName: '风水大师', duration: '60课时' } },
]

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
  address: OrderAddress
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

export const mockOrderDetail: OrderDetail = {
  id: '1', orderNo: 'GX202401150001', status: 'pending_receive', totalAmount: 344, payAmount: 294,
  createdAt: '2024-01-15 14:30:00', paidAt: '2024-01-15 14:32:15', shippedAt: '2024-01-16 09:00:00',
  products: [
    { id: '1', name: '《渊海子平》精装典藏版', cover: `${P}/book1.jpg`, skuName: '精装版', price: 168, quantity: 1 },
    { id: '2', name: '紫微斗数入门教程', cover: `${P}/book2.jpg`, skuName: '平装版', price: 88, quantity: 2 },
  ],
  canCancel: false, canConfirm: true, canReview: false, hasAfterSale: false,
  address: { id: '1', name: '张三', phone: '138****8888', province: '北京市', city: '北京市', district: '朝阳区', address: '建国路88号SOHO现代城A座1201', isDefault: true },
  payMethod: '微信支付',
  logistics: {
    company: '顺丰速运', trackingNo: 'SF1234567890', status: '派送中',
    timeline: [
      { time: '01-17 08:30', content: '快递员正在派送中，预计12:00前送达' },
      { time: '01-17 06:15', content: '快件已到达【北京朝阳营业点】' },
      { time: '01-16 18:20', content: '快件在【北京转运中心】已装车，准备发往【北京朝阳营业点】' },
      { time: '01-16 09:00', content: '商家已发货，快递员已揽件' },
    ],
  },
  coupon: { name: '新人专享券', discount: 50 },
  remark: '请放门口快递柜',
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

export const mockLogistics: LogisticsDetail = {
  orderId: '1', orderNo: '202412010001',
  company: '顺丰速运', companyPhone: '95338', trackingNo: 'SF1234567890123',
  status: 'in_transit', estimatedDelivery: '2024-12-03 18:00',
  courierName: '张师傅', courierPhone: '13800138000',
  receiver: { name: '张三', phone: '138****8888', address: '北京市朝阳区建国路88号SOHO现代城A座1201' },
  tracks: [
    { status: 'in_transit', description: '快件已到达【北京朝阳营业点】，正在派送中', time: '2024-12-02 14:30', location: '北京市朝阳区', isCurrent: true },
    { status: 'in_transit', description: '快件已到达【北京转运中心】', time: '2024-12-02 08:15', location: '北京市顺义区', isCurrent: false },
    { status: 'in_transit', description: '快件已从【上海转运中心】发出', time: '2024-12-01 22:00', location: '上海市青浦区', isCurrent: false },
    { status: 'picked', description: '快件已到达【上海转运中心】', time: '2024-12-01 18:30', location: '上海市青浦区', isCurrent: false },
    { status: 'picked', description: '已揽收，快递员：李师傅 13900139000', time: '2024-12-01 15:20', location: '上海市浦东新区', isCurrent: false },
    { status: 'pending', description: '商家已发货，等待揽收', time: '2024-12-01 14:00', location: '上海市浦东新区', isCurrent: false },
  ],
}

/* ============================================================
   五、订单评价（app/orders/[id]/review）
   ============================================================ */

export const reviewItems = [
  { id: '1', name: '《渊海子平》精装典藏版', cover: `${P}/book1.jpg` },
  { id: '2', name: '紫微斗数入门教程', cover: `${P}/book2.jpg` },
]
export const reviewTagsByRating: Record<number, string[]> = {
  5: ['正品保证', '包装精美', '物流很快', '与描述一致', '非常满意', '强烈推荐'],
  4: ['商品不错', '物流及时', '整体满意'],
  3: ['一般般', '与描述基本一致'],
  2: ['质量较差', '与描述不符'],
  1: ['质量很差', '货不对板', '不推荐'],
}
export const reviewRatingLabels = ['', '很差', '较差', '一般', '不错', '非常好']

/* ============================================================
   六、发票管理（app/orders/invoice）
   ============================================================ */

export interface InvoiceOrder { orderId: string; orderNo: string; amount: number; createdAt: string; productName: string }
export interface InvoiceRecord {
  id: string; type: 'personal' | 'company'; title: string; taxNumber?: string
  amount: number; status: 'pending' | 'processing' | 'completed' | 'rejected'
  email: string; createdAt: string; completedAt?: string; rejectReason?: string
}

export const mockInvoiceOrders: InvoiceOrder[] = [
  { orderId: 'o1', orderNo: '202412150001', amount: 299, createdAt: '2024-12-15 10:30', productName: '周易六十四卦详解' },
  { orderId: 'o2', orderNo: '202412140002', amount: 168, createdAt: '2024-12-14 15:20', productName: '紫微斗数入门课程' },
  { orderId: 'o3', orderNo: '202412130003', amount: 88, createdAt: '2024-12-13 09:15', productName: '风水基础教程' },
]
export const mockInvoices: InvoiceRecord[] = [
  { id: 'i1', type: 'company', title: '北京某某科技有限公司', taxNumber: '91110108MA01XXXXX', amount: 467, status: 'completed', email: 'finance@example.com', createdAt: '2024-12-10 14:30', completedAt: '2024-12-11 10:00' },
  { id: 'i2', type: 'personal', title: '张*三', amount: 168, status: 'processing', email: 'zhang***@163.com', createdAt: '2024-12-14 16:00' },
  { id: 'i3', type: 'company', title: '上海某某文化传媒', taxNumber: '91310115MA1HXXXX', amount: 299, status: 'rejected', email: 'acc@example.com', createdAt: '2024-12-08 11:20', rejectReason: '税号格式不正确' },
]
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
  product: OrderProduct
  timeline: RefundTimelineNode[]
  createdAt: string; canCancel: boolean
}

export const mockRefund: RefundDetail = {
  id: 'RF202401150001', orderId: '1', orderNo: 'GX20240115001',
  type: 'refund_only', status: 'refunding', reason: '不想要了', amount: 168, description: '商品包装完好，未拆封',
  product: { id: 'p1', name: '周易六十四卦详解（精装典藏版）', cover: `${P}/book1.jpg`, skuName: '精装版', price: 168, quantity: 1 },
  timeline: [
    { status: 'submitted', title: '申请提交', description: '您已提交退款申请', time: '2024-01-15 10:30', isCurrent: false },
    { status: 'merchant_review', title: '商家审核', description: '商家已同意退款', time: '2024-01-15 14:20', isCurrent: false },
    { status: 'platform_review', title: '平台审核', description: '平台审核通过', time: '2024-01-15 15:00', isCurrent: false },
    { status: 'refunding', title: '退款处理', description: '正在处理退款...', time: '2024-01-15 15:30', isCurrent: true },
    { status: 'completed', title: '退款到账', description: '预计1-3个工作日到账', time: '', isCurrent: false },
  ],
  createdAt: '2024-01-15 10:30', canCancel: false,
}
export const refundNodeDetails = [
  '您的退款申请已成功提交，等待商家处理',
  '商家已审核通过，退款申请已转至平台',
  '平台已审核通过，退款正在处理中',
  '退款正在处理中，请耐心等待',
  '退款金额将在1-3个工作日内退回原支付账户',
]

/* ============================================================
   八、纠纷申诉（app/orders/dispute）
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

export const mockDisputeOrder: DisputeOrderBrief = {
  orderId: 'order_001', orderNo: 'RB2024010100001',
  productName: '周易六十四卦详解（精装典藏版）', productCover: `${P}/book1.jpg`,
  amount: 168, createdAt: '2024-01-01 12:00:00',
}
export const mockMyDisputes: DisputeListItem[] = [
  { id: '1', orderId: 'o1', orderNo: 'RB2024010100002', type: 'quality_issue', status: 'processing', productName: '紫微斗数入门', productCover: `${P}/book2.jpg`, createdAt: '2024-01-05 10:00:00' },
]
export const mockDisputeDetail: DisputeDetail = {
  id: '1', orderId: 'o1', orderNo: 'RB2024010100001', type: 'quality_issue', status: 'processing',
  description: '收到的书籍有破损，封面有明显折痕', images: [`${P}/book1.jpg`], expectation: '希望能够换货或退款',
  order: mockDisputeOrder,
  timeline: [
    { status: 'submitted', title: '提交申诉', description: '您已成功提交申诉', time: '2024-01-05 10:00', isCurrent: false },
    { status: 'processing', title: '处理中', description: '客服正在处理您的申诉', time: '2024-01-05 14:00', isCurrent: true },
  ],
  createdAt: '2024-01-05 10:00:00', canCancel: true,
}

export function getDisputeTypeLabel(type: string) {
  return disputeTypes.find((t) => t.value === type)?.label || type
}

// ── API ──
export const orderApi = {
  /** 订单列表 GET /orders/my（统一订单中心，返回 { orders, total }，此处映射为 { items, total }） */
  async list(params?: Record<string, any>): Promise<{ items: any[]; total: number }> {
    if (useMock()) return { items: [], total: 0 }
    try {
      const res = await apiGet<any>(`/orders/my${params ? '?' + new URLSearchParams(params).toString() : ''}`)
      return { items: res?.orders ?? res?.items ?? [], total: res?.total ?? 0 }
    } catch { return { items: [], total: 0 } }
  },
  /** 订单详情 GET /shop/orders/:id（商品订单） */
  async detail(id: string): Promise<any> {
    if (useMock()) return null
    try { return await apiGet<any>(`/shop/orders/${id}`) } catch { return null }
  },
  /** 提交售后/申诉 POST /shop/orders/:orderId/after-sale */
  async submitDispute(data: Record<string, any>): Promise<any> {
    if (useMock()) return { success: true }
    const orderId = data.orderId ?? data.orderNo
    return await apiPost<any>(`/shop/orders/${orderId}/after-sale`, data)
  },
}
