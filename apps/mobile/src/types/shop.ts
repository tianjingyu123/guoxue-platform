/**
 * 商城类型定义
 * 基于后端 API /shop/** 端点
 */

/** 商品分类 */
export interface ProductCategory {
  id: string
  name: string
  icon?: string
  image?: string
  parentId?: string
  children?: ProductCategory[]
  sort?: number
}

/** 商品 SKU */
export interface ProductSku {
  id: string
  name: string           // SKU 名称，如"红色-M"
  price: number          // 当前售价（分）
  originalPrice?: number // 原价（分）
  stock: number          // 库存
  code?: string          // SKU 编码
  image?: string         // SKU 图片
  attrs?: Record<string, string>  // 规格属性，如 { 颜色: "红色", 尺寸: "M" }
}

/** 商品 SPU */
export interface ProductItem {
  id: string
  title: string
  description?: string
  cover: string
  images?: string[]
  categoryId?: string
  categoryName?: string
  price: number              // 最低售价（分）
  originalPrice?: number     // 原价（分）
  sales?: number             // 销量
  stock?: number             // 总库存
  status?: 'on' | 'off' | 'deleted'
  skus?: ProductSku[]
  tags?: string[]
  detail?: string            // 商品详情 HTML
  isVirtual?: boolean        // 虚拟商品
  isPresale?: boolean        // 预售
  createdAt?: string
  updatedAt?: string
}

/** 统一价格查询 */
export interface UnifiedPriceResult {
  productId: string
  skuId?: string
  price: number
  originalPrice?: number
  promotionId?: string
  promotionName?: string
  promotionType?: string
}

/** 购物车项 */
export interface CartItem {
  id: string
  productId: string
  skuId?: string
  title: string
  cover: string
  price: number
  quantity: number
  stock: number
  selected?: boolean
  skuAttrs?: string
}

/** 收货地址 */
export interface AddressItem {
  id: string
  name: string
  phone: string
  province: string
  city: string
  district: string
  detail: string
  zipCode?: string
  isDefault: boolean
  tag?: string        // 标签：家/公司
}

/** 订单状态 */
export type OrderStatus = 'pending_pay' | 'pending_ship' | 'shipped' | 'received' | 'completed' | 'cancelled' | 'refunding' | 'refunded'

/** 订单项 */
export interface OrderItem {
  id: string
  productId: string
  skuId?: string
  title: string
  cover: string
  price: number
  quantity: number
  skuAttrs?: string
  afterSaleStatus?: string
}

/** 订单 */
export interface Order {
  id: string
  orderNo: string
  status: OrderStatus
  statusText?: string
  totalAmount: number        // 总金额（分）
  payAmount: number          // 实付金额（分）
  freight?: number           // 运费（分）
  discountAmount?: number    // 优惠金额（分）
  items: OrderItem[]
  address?: AddressItem
  expressCompany?: string
  expressNo?: string
  payType?: string
  payTime?: string
  createdAt: string
  updatedAt?: string
  remark?: string
  // 售后状态
  afterSaleStatus?: string
  canAfterSale?: boolean
  // 营销相关
  couponId?: string
  promotionId?: string
}

/** 优惠券 */
export interface Coupon {
  id: string
  name: string
  description?: string
  type: 'discount' | 'cash' | 'shipping'    // 折扣/立减/免邮
  value: number           // 折扣率（如 80 表示8折）或立减金额（分）
  minAmount?: number      // 最低消费（分）
  maxAmount?: number      // 最高优惠（分）
  startAt: string
  endAt: string
  isClaimed?: boolean
  usedCount?: number
  totalCount?: number
}

/** 商品评价 */
export interface ProductReview {
  id: string
  productId: string
  skuAttrs?: string
  userId: string
  nickname: string
  avatar: string
  rating: number           // 1-5
  content: string
  images?: string[]
  replyContent?: string
  createdAt: string
}

/** 物流信息 */
export interface LogisticsInfo {
  company: string
  no: string
  status: string
  traces: Array<{
    time: string
    desc: string
  }>
}

/** 售后申请 */
export interface AfterSale {
  id: string
  orderId: string
  orderItemId?: string
  type: 'refund' | 'return_refund' | 'exchange'
  reason: string
  amount?: number
  status: string
  description?: string
  images?: string[]
  createdAt: string
  updatedAt?: string
}

/** 营销秒杀 */
export interface FlashSale {
  id: string
  productId: string
  title: string
  cover: string
  flashPrice: number
  originalPrice: number
  stock: number
  sold: number
  startAt: string
  endAt: string
  status: 'upcoming' | 'active' | 'ended'
}

/** 拼团 */
export interface GroupBuy {
  id: string
  productId: string
  title: string
  cover: string
  groupPrice: number
  originalPrice: number
  requiredMembers: number
  currentMembers: number
  startAt: string
  endAt: string
  status: 'upcoming' | 'active' | 'ended'
  myGroup?: {
    groupId: string
    members: number
    status: string
  }
}
