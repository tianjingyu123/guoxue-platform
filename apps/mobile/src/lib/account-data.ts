/* ============================================================
   售后与账户数据层（app/shop/after-sale*、app/shop/addresses* 迁移）
   主题色统一为商城 #9A2D2D。
   ============================================================ */

import { apiGet, apiPost, apiPut, apiDelete, useMock } from '@/utils/request'

const P = '/static/images/products'

/* —— 售后申请 —— */
export const afterSaleReasons = [
  '商品质量问题',
  '商品与描述不符',
  '发错货/漏发货',
  '商品损坏',
  '不想要了/拍错了',
  '其他原因',
]

export interface AfterSaleProduct {
  id: string
  name: string
  cover: string
  skuName: string
  price: number
  quantity: number
}

/** 申请页默认商品与最大可退金额（来自订单） */
export const afterSaleApplyContext = {
  orderId: 'order001',
  orderNo: '202401150001',
  maxAmount: 256,
  product: {
    id: 'p1',
    name: '周易六十四卦详解（精装典藏版）',
    cover: `${P}/book1.jpg`,
    skuName: '精装版',
    price: 168,
    quantity: 1,
  } as AfterSaleProduct,
}

/* —— 售后列表 —— */
export type AfterSaleStatus =
  | 'pending'
  | 'approved'
  | 'refunding'
  | 'completed'
  | 'rejected'
  | 'cancelled'

export interface AfterSaleListItem {
  id: string
  orderId: string
  orderNo: string
  type: 'refund_only' | 'refund_with_return'
  status: AfterSaleStatus
  amount: number
  reason: string
  product: { id: string; name: string; cover: string; skuName: string }
  createdAt: string
  canCancel: boolean
}

export const afterSaleTabs = [
  { key: '', label: '全部' },
  { key: 'pending', label: '处理中' },
  { key: 'completed', label: '已完成' },
  { key: 'rejected', label: '已驳回' },
]

/** 售后状态配置：标签 / 文字色 / 背景色 / 图标 */
export const afterSaleStatusConfig: Record<
  string,
  { label: string; color: string; bg: string; icon: string }
> = {
  pending: { label: '审核中', color: '#E8820C', bg: 'rgba(232,130,12,0.1)', icon: 'clock' },
  approved: { label: '已通过', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)', icon: 'check-circle' },
  refunding: { label: '退款中', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)', icon: 'refresh-cw' },
  completed: { label: '已完成', color: '#2E7D32', bg: 'rgba(46,125,50,0.1)', icon: 'check-circle' },
  rejected: { label: '已驳回', color: '#E74C3C', bg: 'rgba(231,76,60,0.1)', icon: 'x-circle' },
  cancelled: { label: '已取消', color: '#999999', bg: 'rgba(153,153,153,0.1)', icon: 'x' },
}

export const afterSaleList: AfterSaleListItem[] = [
  {
    id: '1', orderId: 'o1', orderNo: 'AS202401150001', type: 'refund_only', status: 'pending',
    amount: 168, reason: '商品质量问题',
    product: { id: 'p1', name: '周易六十四卦详解（精装典藏版）', cover: `${P}/book1.jpg`, skuName: '精装版' },
    createdAt: '2024-01-15 10:30', canCancel: true,
  },
  {
    id: '2', orderId: 'o2', orderNo: 'AS202401140002', type: 'refund_with_return', status: 'approved',
    amount: 88, reason: '尺寸不符',
    product: { id: 'p2', name: '紫微斗数入门教程', cover: `${P}/book2.jpg`, skuName: '平装版' },
    createdAt: '2024-01-14 14:20', canCancel: false,
  },
  {
    id: '3', orderId: 'o3', orderNo: 'AS202401130003', type: 'refund_only', status: 'completed',
    amount: 299, reason: '七天无理由',
    product: { id: 'p3', name: '奇门遁甲实战手册', cover: `${P}/book3.jpg`, skuName: '典藏版' },
    createdAt: '2024-01-13 09:15', canCancel: false,
  },
  {
    id: '4', orderId: 'o4', orderNo: 'AS202401120004', type: 'refund_with_return', status: 'rejected',
    amount: 128, reason: '不喜欢',
    product: { id: 'p4', name: '梅花易数精解', cover: `${P}/book4.jpg`, skuName: '标准版' },
    createdAt: '2024-01-12 16:45', canCancel: false,
  },
]

/* —— 售后详情 / 驳回 —— */
export interface AfterSaleTimelineNode {
  status: string
  title: string
  description?: string
  time: string
  isCurrent: boolean
}
export interface AfterSaleDetailData {
  id: string
  orderId: string
  orderNo: string
  type: 'refund_only' | 'refund_with_return'
  status: AfterSaleStatus
  reason: string
  amount: number
  description?: string
  images: string[]
  product: AfterSaleProduct
  timeline: AfterSaleTimelineNode[]
  logistics?: { company: string; trackingNo: string; address: string }
  rejectReason?: string
  createdAt: string
  canCancel: boolean
}

export const afterSaleDetail: AfterSaleDetailData = {
  id: 'as001', orderId: 'order001', orderNo: '202401150001',
  type: 'refund_with_return', status: 'approved', reason: '商品与描述不符', amount: 168,
  description: '收到商品后发现颜色与图片差异较大，希望退货退款。',
  images: [`${P}/book1.jpg`, `${P}/book2.jpg`],
  product: { id: 'p1', name: '周易六十四卦详解（精装典藏版）', cover: `${P}/book1.jpg`, skuName: '精装版', price: 168, quantity: 1 },
  timeline: [
    { status: 'submitted', title: '提交申请', description: '您的售后申请已提交', time: '2024-01-15 10:30', isCurrent: false },
    { status: 'approved', title: '审核通过', description: '商家已同意您的退货申请，请尽快寄回商品', time: '2024-01-15 14:20', isCurrent: true },
    { status: 'shipping', title: '退货中', description: '等待您寄回商品', time: '', isCurrent: false },
    { status: 'refunding', title: '退款中', description: '商家确认收货后将处理退款', time: '', isCurrent: false },
    { status: 'completed', title: '退款完成', description: '退款已原路返回', time: '', isCurrent: false },
  ],
  logistics: { company: '顺丰速运', trackingNo: '', address: '北京市朝阳区建国路88号SOHO现代城A座1201' },
  createdAt: '2024-01-15 10:30', canCancel: true,
}

export const afterSaleRejectedDetail: AfterSaleDetailData = {
  id: 'as001', orderId: 'order001', orderNo: '202401150001',
  type: 'refund_only', status: 'rejected', reason: '商品质量问题', amount: 168,
  description: '收到商品后发现印刷模糊，影响阅读体验',
  images: [`${P}/book1.jpg`, `${P}/book3.jpg`],
  product: { id: 'p1', name: '周易六十四卦详解（精装典藏版）', cover: `${P}/book1.jpg`, skuName: '精装版', price: 168, quantity: 1 },
  timeline: [
    { status: 'submitted', title: '提交申请', time: '2024-01-15 10:30', isCurrent: false },
    { status: 'reviewing', title: '商家审核', time: '2024-01-15 14:20', isCurrent: false },
    { status: 'rejected', title: '申请驳回', description: '商家已驳回您的售后申请', time: '2024-01-16 09:15', isCurrent: true },
  ],
  rejectReason: '经核实，您购买的商品为正品且印刷清晰，不符合退款条件。商品在发货前已经过严格质检，如有疑问请联系客服进一步沟通。',
  createdAt: '2024-01-15 10:30', canCancel: false,
}

/* —— 收货地址 —— */
export interface ShippingAddressItem {
  id: string
  name: string
  phone: string
  province: string
  city: string
  district: string
  address: string
  isDefault: boolean
}

export const shippingAddressList: ShippingAddressItem[] = [
  { id: '1', name: '张三', phone: '138****8888', province: '北京市', city: '北京市', district: '朝阳区', address: '建国路88号SOHO现代城A座1201室', isDefault: true },
  { id: '2', name: '李四', phone: '139****9999', province: '上海市', city: '上海市', district: '浦东新区', address: '张江高科技园区博云路2号浦软大厦8楼', isDefault: false },
  { id: '3', name: '王五', phone: '137****7777', province: '广东省', city: '深圳市', district: '南山区', address: '科技园南区高新南一道飞亚达大厦5层', isDefault: false },
]

// ============================================
// API 层：useMock 开关控制真实/模拟数据切换
// ============================================

function mapAddress(a: any): ShippingAddressItem {
  return {
    id: String(a.id || ''),
    name: a.name || a.contactName || '',
    phone: a.phone || a.mobile || '',
    province: a.province || '',
    city: a.city || '',
    district: a.district || '',
    address: a.address || a.detail || '',
    isDefault: !!a.isDefault,
  }
}

function mapAfterSale(a: any): AfterSaleListItem {
  return {
    id: String(a.id || ''),
    orderId: String(a.orderId || ''),
    orderNo: a.orderNo || '',
    type: a.type || 'refund_only',
    status: a.status || 'pending',
    amount: a.amount ?? a.refundAmount ?? 0,
    reason: a.reason || '',
    product: {
      id: String(a.product?.id || a.productId || ''),
      name: a.product?.name || a.productName || '',
      cover: a.product?.cover || a.productImage || '',
      skuName: a.product?.skuName || a.product?.sku?.name || '',
    },
    createdAt: a.createdAt || a.created_at || '',
    canCancel: a.canCancel ?? (a.status === 'pending'),
  }
}

export const addressApi = {
  async getAddresses() {
    if (useMock()) return shippingAddressList
    try {
      const res = await apiGet<any>('/shop/addresses')
      return (res.items || res.list || res || []).map(mapAddress)
    } catch { return shippingAddressList }
  },

  async saveAddress(data: Partial<ShippingAddressItem>) {
    if (useMock()) return { ...data, id: data.id || String(Date.now()) }
    if (data.id) {
      return apiPut<any>(`/shop/addresses/${data.id}`, data)
    }
    return apiPost<any>('/shop/addresses', data)
  },

  async deleteAddress(id: string) {
    if (useMock()) return { success: true }
    return apiDelete<any>(`/shop/addresses/${id}`)
  },

  async setDefault(id: string) {
    if (useMock()) return { success: true }
    return apiPut<any>(`/shop/addresses/${id}/default`)
  },
}

export const afterSaleApi = {
  async getAfterSales(params?: { page?: number; pageSize?: number; status?: string }) {
    if (useMock()) {
      let list = afterSaleList
      if (params?.status) list = list.filter((a) => a.status === params.status)
      return { items: list, total: list.length }
    }
    try {
      const qs = new URLSearchParams()
      if (params?.page) qs.set('page', String(params.page))
      if (params?.pageSize) qs.set('pageSize', String(params.pageSize))
      if (params?.status) qs.set('status', params.status)
      const res = await apiGet<any>(`/shop/after-sales?${qs}`)
      return { items: (res.items || res.list || []).map(mapAfterSale), total: res.total || 0 }
    } catch { return { items: afterSaleList, total: afterSaleList.length } }
  },

  async getAfterSaleDetail(id: string) {
    if (useMock()) return afterSaleDetail
    try {
      return await apiGet<any>(`/shop/after-sales/${id}`)
    } catch { return afterSaleDetail }
  },

  async submitAfterSale(params: { orderId: string; type: string; reason: string; amount: number; description?: string; images?: string[] }) {
    if (useMock()) return { success: true, id: `as-${Date.now()}` }
    return apiPost<any>(`/shop/orders/${params.orderId}/after-sale`, params)
  },

  async cancelAfterSale(id: string) {
    if (useMock()) return { success: true }
    return apiPut<any>(`/shop/after-sales/${id}/cancel`)
  },
}

/** 省市区数据（简化版） */
export const REGIONS: Record<string, Record<string, string[]>> = {
  北京市: { 北京市: ['东城区', '西城区', '朝阳区', '丰台区', '石景山区', '海淀区', '顺义区', '通州区', '大兴区', '昌平区'] },
  上海市: { 上海市: ['黄浦区', '徐汇区', '长宁区', '静安区', '普陀区', '虹口区', '杨浦区', '浦东新区', '宝山区', '闵行区'] },
  广东省: {
    广州市: ['天河区', '越秀区', '海珠区', '荔湾区', '白云区', '黄埔区', '番禺区', '花都区', '南沙区'],
    深圳市: ['福田区', '罗湖区', '南山区', '宝安区', '龙华区', '龙岗区', '盐田区', '坪山区'],
    佛山市: ['禅城区', '南海区', '顺德区', '三水区', '高明区'],
  },
  江苏省: {
    南京市: ['玄武区', '秦淮区', '建邺区', '鼓楼区', '浦口区', '栖霞区', '雨花台区', '江宁区', '六合区'],
    苏州市: ['姑苏区', '吴中区', '相城区', '吴江区', '工业园区', '虎丘区'],
  },
  浙江省: {
    杭州市: ['上城区', '拱墅区', '西湖区', '滨江区', '萧山区', '余杭区', '富阳区', '临安区'],
    宁波市: ['海曙区', '江北区', '镇海区', '北仑区', '鄞州区', '奉化区'],
  },
  四川省: { 成都市: ['锦江区', '青羊区', '金牛区', '武侯区', '成华区', '龙泉驿区', '青白江区', '新都区', '温江区'] },
  湖北省: { 武汉市: ['江岸区', '江汉区', '硚口区', '汉阳区', '武昌区', '青山区', '洪山区', '东西湖区'] },
  陕西省: { 西安市: ['新城区', '碑林区', '莲湖区', '灞桥区', '未央区', '雁塔区', '阎良区', '临潼区', '长安区'] },
}
export const PROVINCES = Object.keys(REGIONS)

/** 编辑页：用于回填的示例地址 */
export const addressEditSample: ShippingAddressItem = {
  id: '1', name: '张三', phone: '13812345678', province: '北京市', city: '北京市', district: '朝阳区',
  address: '建国路88号SOHO现代城A座1201室', isDefault: true,
}
