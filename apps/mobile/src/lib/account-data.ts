/* ============================================================
   售后与账户数据层（app/shop/after-sale*、app/shop/addresses* 迁移）
   主题色统一为商城 #9A2D2D。
   ============================================================ */

import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/request'

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

/* ============================================================
   适配层：后端真实结构 → 前端视图模型
   售后端点与 order-data.ts 共用同一套订单售后子系统（见文末说明）：
     GET    /shop/after-sales?page&pageSize     列表 { items,total,page,pageSize }
     GET    /shop/after-sales/:id               详情（enriched，含 order/product）
     POST   /shop/orders/:orderId/after-sale    申请（body: type/reason/amount）
     PUT    /shop/after-sales/:id/cancel         取消
   收货地址：/shop/addresses（GET列表 / POST新增 / PUT:id编辑 / DELETE:id / PUT:id/default）
   ============================================================ */

/** ISO 时间 → 'YYYY-MM-DD HH:mm'（uni-app 多端无 dayjs） */
function fmtTime(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
const _num = (v: any): number => { const n = Number(v); return isNaN(n) ? 0 : n }
/** 后端 UUID → 展示用短单号（前 12 位大写） */
function shortNo(id: string): string {
  return id ? id.replace(/-/g, '').slice(0, 12).toUpperCase() : ''
}

/** 后端 AfterSale.status → 前端售后状态 */
const AS_STATUS_MAP: Record<string, AfterSaleStatus> = {
  PENDING: 'pending', PROCESSING: 'refunding', APPROVED: 'approved',
  COMPLETED: 'completed', REJECTED: 'rejected', CANCELLED: 'cancelled',
}
/** 后端售后类型字符串（refund/return…）→ 前端两类 */
function asType(t: string): 'refund_only' | 'refund_with_return' {
  return t === 'return' || t === 'refund_with_return' ? 'refund_with_return' : 'refund_only'
}

/** 后端 enriched AfterSale → 前端列表项 */
function adaptAfterSaleListItem(a: any): AfterSaleListItem {
  return {
    id: a.id,
    orderId: a.orderId,
    orderNo: shortNo(a.orderId),
    type: asType(a.type),
    status: AS_STATUS_MAP[a.status] || 'pending',
    amount: _num(a.amount ?? a.order?.amount),
    reason: a.reason || '',
    product: {
      id: a.product?.id || '',
      name: a.product?.title || '商品',
      cover: a.product?.cover || '',
      skuName: '', // 后端售后单未关联 SKU → 不展示
    },
    createdAt: fmtTime(a.createdAt),
    canCancel: a.status === 'PENDING',
  }
}

/** 由 AfterSale.status 派生处理时间轴（后端无逐节点时间，按真实状态推进） */
function buildAfterSaleTimeline(a: any): AfterSaleTimelineNode[] {
  const t0 = fmtTime(a.createdAt)
  const t1 = fmtTime(a.updatedAt || a.createdAt)
  const submitted: AfterSaleTimelineNode = { status: 'submitted', title: '提交申请', description: '您的售后申请已提交', time: t0, isCurrent: false }
  if (a.status === 'CANCELLED') {
    return [submitted, { status: 'cancelled', title: '已取消', description: '您已撤销本次售后申请', time: t1, isCurrent: true }]
  }
  if (a.status === 'REJECTED') {
    return [
      submitted,
      { status: 'reviewing', title: '商家审核', time: t1, isCurrent: false },
      { status: 'rejected', title: '申请驳回', description: '商家已驳回您的售后申请', time: t1, isCurrent: true },
    ]
  }
  if (a.status === 'PENDING' || a.status === 'PROCESSING') {
    return [submitted, { status: 'reviewing', title: '商家审核中', description: '商家正在处理您的售后申请', time: t1, isCurrent: true }]
  }
  // APPROVED / COMPLETED
  const approved: AfterSaleTimelineNode = { status: 'approved', title: '审核通过', description: '商家已同意您的售后申请', time: t1, isCurrent: a.status === 'APPROVED' }
  if (a.status === 'APPROVED') return [submitted, { status: 'reviewing', title: '商家审核', time: t1, isCurrent: false }, approved]
  return [
    submitted,
    { status: 'reviewing', title: '商家审核', time: t1, isCurrent: false },
    { ...approved, isCurrent: false },
    { status: 'completed', title: '退款完成', description: '退款已原路返回', time: t1, isCurrent: true },
  ]
}

/** 后端 enriched AfterSale → 前端售后详情 */
function adaptAfterSaleDetail(a: any): AfterSaleDetailData {
  const isRejected = a.status === 'REJECTED'
  return {
    id: a.id,
    orderId: a.orderId,
    orderNo: shortNo(a.orderId),
    type: asType(a.type),
    status: AS_STATUS_MAP[a.status] || 'pending',
    reason: a.reason || '',
    amount: _num(a.amount ?? a.order?.amount),
    // 后端售后单无独立"问题描述"字段（申请时已并入 reason）→ 不重复展示
    description: undefined,
    // 后端售后单不存凭证图片 → 诚实降级为空，详情页 v-if 隐藏
    images: [],
    product: {
      id: a.product?.id || '',
      name: a.product?.title || '商品',
      cover: a.product?.cover || '',
      skuName: '',
      price: _num(a.product?.price),
      quantity: 1,
    },
    timeline: buildAfterSaleTimeline(a),
    // 后端无结构化退货地址对象 → 不提供，详情页"退货地址"卡片 v-if 隐藏
    logistics: undefined,
    // 驳回备注：后端 processAfterSale 把驳回理由写入 AfterSale.logistics 字段
    rejectReason: isRejected ? (a.logistics || '商家未通过本次售后申请，如有疑问请联系客服') : undefined,
    createdAt: fmtTime(a.createdAt),
    canCancel: a.status === 'PENDING',
  }
}

/** 后端 ShippingAddress → 前端地址项（后端字段名 detail，前端用 address） */
function adaptAddress(a: any): ShippingAddressItem {
  return {
    id: a.id,
    name: a.name || '',
    phone: a.phone || '',
    province: a.province || '',
    city: a.city || '',
    district: a.district || '',
    address: a.detail || '',
    isDefault: !!a.isDefault,
  }
}

export const accountApi = {
  /** 售后列表（真连 /shop/after-sales，错误向上抛由页面三态处理） */
  async afterSales(): Promise<AfterSaleListItem[]> {
    const res = await apiGet<any>('/shop/after-sales?page=1&pageSize=100')
    const list = Array.isArray(res) ? res : (res?.items || [])
    return list.map(adaptAfterSaleListItem)
  },

  /** 售后详情 */
  async afterSaleDetail(id: string): Promise<AfterSaleDetailData> {
    const a = await apiGet<any>(`/shop/after-sales/${id}`)
    return adaptAfterSaleDetail(a)
  },

  /** 驳回售后详情（与详情同一端点，复用适配） */
  async afterSaleRejected(id: string): Promise<AfterSaleDetailData> {
    const a = await apiGet<any>(`/shop/after-sales/${id}`)
    return adaptAfterSaleDetail(a)
  },

  /**
   * 售后申请上下文：从订单详情构造默认商品与最大可退金额。
   * 后端无专用"申请上下文"端点 → 复用订单详情 GET /shop/orders/:id。
   */
  async afterSaleApplyContext(orderId: string) {
    const o = await apiGet<any>(`/shop/orders/${orderId}`)
    const maxAmount = _num(o.payAmount ?? o.amount)
    return {
      orderId,
      orderNo: shortNo(o.id),
      maxAmount,
      product: {
        id: o.product?.id || o.targetId || '',
        name: o.product?.title || '商品',
        cover: o.product?.cover || o.product?.images?.[0] || '',
        skuName: o.sku?.skuName || '',
        price: maxAmount,
        quantity: 1,
      } as AfterSaleProduct,
    }
  },

  /**
   * 提交售后申请 → POST /shop/orders/:orderId/after-sale。
   * 后端 body 仅 { type, reason, amount }；问题描述并入 reason，凭证图片后端不落库（不传）。
   */
  async submitAfterSale(data: any): Promise<{ success: boolean; id?: string }> {
    if (!data?.orderId) throw new Error('缺少订单信息')
    const type = data.type === 'refund_with_return' ? 'return' : 'refund'
    const reason = [data.reason, data.description].filter(Boolean).join('；').slice(0, 500)
    const res = await apiPost<any>(`/shop/orders/${data.orderId}/after-sale`, {
      type,
      reason: reason || '用户申请售后',
      amount: data.amount,
    })
    return { success: true, id: res?.id }
  },

  /** 取消售后申请 → PUT /shop/after-sales/:id/cancel */
  async cancelAfterSale(id: string): Promise<boolean> {
    await apiPut(`/shop/after-sales/${id}/cancel`, {})
    return true
  },

  /** 地址列表 → GET /shop/addresses */
  async addresses(): Promise<ShippingAddressItem[]> {
    const res = await apiGet<any>('/shop/addresses')
    const list = Array.isArray(res) ? res : (res?.items || [])
    return list.map(adaptAddress)
  },

  /**
   * 地址详情（编辑回填）：后端无 GET /shop/addresses/:id 单条端点
   * → 拉取列表后按 id 匹配；不存在则抛错走错误态。
   */
  async addressDetail(id: string): Promise<ShippingAddressItem> {
    const list = await this.addresses()
    const found = list.find((a) => a.id === id)
    if (!found) throw new Error('地址不存在或已删除')
    return found
  },

  /**
   * 保存地址：有 id 走 PUT 编辑，否则 POST 新增。
   * 前端 address 字段映射为后端 detail；isDefault 由独立端点设置（创建/编辑 DTO 不含该字段）。
   */
  async saveAddress(data: any): Promise<{ success: boolean }> {
    const body = {
      name: data.name,
      phone: data.phone,
      province: data.province,
      city: data.city,
      district: data.district,
      detail: data.address,
    }
    const saved = data.id
      ? await apiPut<any>(`/shop/addresses/${data.id}`, body)
      : await apiPost<any>('/shop/addresses', body)
    // 用户勾选「设为默认」→ 调独立端点落库（仅在需要置默认时调用）
    if (data.isDefault && saved?.id && !saved.isDefault) {
      await apiPut(`/shop/addresses/${saved.id}/default`, {})
    }
    return { success: true }
  },

  /** 设为默认地址 → PUT /shop/addresses/:id/default */
  async setDefaultAddress(id: string): Promise<boolean> {
    await apiPut(`/shop/addresses/${id}/default`, {})
    return true
  },

  /** 删除地址 → DELETE /shop/addresses/:id */
  async deleteAddress(id: string): Promise<boolean> {
    await apiDelete(`/shop/addresses/${id}`)
    return true
  },
}
