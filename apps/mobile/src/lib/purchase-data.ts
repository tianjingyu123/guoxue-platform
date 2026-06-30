/**
 * 统一购买/下单数据层 — 圈子付费 / 课程 / 商品 共用
 * 后端 POST /shop/orders 是统一下单接口（CreateOrderDto.type 区分业务）。
 */
import { apiGet, apiPost } from '@/utils/request'

/** 业务类型（对齐后端 CreateOrderDto.type） */
export type PurchaseBizType = 'PRODUCT' | 'COURSE' | 'CIRCLE' | 'MEMBER' | 'BOT'

/** 前端支付渠道 */
export type PayChannel = 'wechat' | 'alipay' | 'unionpay'

/** 渠道 → 汇付聚合支付 payType（POST /huifu/pay 的入参） */
const HUIFU_PAY_TYPE: Record<PayChannel, string> = {
  wechat: 'WECHAT_H5',
  alipay: 'ALIPAY',
  unionpay: 'UNIONPAY',
}

/** 渠道 → 圈子 prepare 的 payMethod（任意非 COIN 值即走现金下单，避免后端默认走虚拟币） */
const CIRCLE_PAY_METHOD: Record<PayChannel, string> = {
  wechat: 'WECHAT',
  alipay: 'ALIPAY',
  unionpay: 'UNIONPAY',
}

/** 通用购买商品（购买弹窗入参） */
export interface PurchaseProduct {
  id: string
  name: string
  cover: string
  price: number
  originalPrice?: number
  stock?: number
  skus?: string[]
}

export interface CreateOrderParams {
  type: PurchaseBizType
  targetId: string
  amount: number
  skuId?: string
  couponId?: string
  /** 所选支付渠道：圈子下单据此决定现金支付方式（默认微信），避免后端默认走虚拟币 */
  channel?: PayChannel
}

export interface OrderResult {
  id: string
  orderNo?: string
  amount?: number
  [k: string]: any
}

export const purchaseApi = {
  /**
   * 创建订单 — 按业务类型分发到对应后端接口（不同业务下单接口不同）：
   * - CIRCLE：POST /circles/:id/join/prepare（现金 WECHAT，返回待支付订单）
   * - COURSE：POST /courses/:id/purchase
   * - PRODUCT/其它：POST /shop/orders（统一商品订单）
   */
  createOrder: async (params: CreateOrderParams): Promise<OrderResult> => {
    const channel = params.channel ?? 'wechat'
    if (params.type === 'CIRCLE') {
      // 传非 COIN 的 payMethod，强制走现金下单（圈子只能现金，不走虚拟币）
      const r = await apiPost<any>(`/circles/${params.targetId}/join/prepare`, { payMethod: CIRCLE_PAY_METHOD[channel] })
      return { id: r?.orderId || r?.id || '', orderNo: r?.orderNo, amount: r?.priceYuan, ...r }
    }
    if (params.type === 'COURSE') {
      const r = await apiPost<any>(`/courses/${params.targetId}/purchase`, {})
      return { id: r?.id || r?.orderId || '', orderNo: r?.orderNo, amount: r?.amount, ...r }
    }
    return apiPost<OrderResult>('/shop/orders', params)
  },
  /**
   * 按所选渠道发起聚合支付（汇付统一网关）— POST /huifu/pay
   * payType 映射：微信→WECHAT_H5、支付宝→ALIPAY、云闪付→UNIONPAY。
   * 返回 { h5Url, payUrl, qrCode, outTradeNo }：H5 端跳 h5Url/payUrl，PC 端展示 qrCode。
   */
  payByChannel: (orderId: string, channel: PayChannel) =>
    apiPost<any>('/huifu/pay', { orderId, payType: HUIFU_PAY_TYPE[channel] }),
  /** 拉起微信 Native 扫码支付（PC 兜底）— POST /shop/orders/:id/pay/native */
  payNative: (orderId: string) => apiPost<any>(`/shop/orders/${orderId}/pay/native`, {}),
  /** 查询订单支付状态 — GET /shop/orders/:id/payment-status */
  paymentStatus: (orderId: string) => apiGet<any>(`/shop/orders/${orderId}/payment-status`),
}
