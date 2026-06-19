// 会员相关类型定义

// 会员等级
export type VipLevel = 'none' | 'basic' | 'pro' | 'premium'

// 会员状态
export interface VipStatus {
  level: VipLevel
  levelName: string
  expireAt: string | null      // 到期时间，null表示未开通
  isExpired: boolean
  daysLeft: number             // 剩余天数
  autoRenew: boolean           // 是否自动续费
  points: number               // 会员积分
  growthValue: number          // 成长值
}

// 会员权益项
export interface VipBenefit {
  id: string
  icon: string
  title: string
  description: string
  levels: VipLevel[]           // 支持该权益的等级
}

// 会员套餐
export interface VipPlan {
  id: string
  level: VipLevel
  levelName: string
  duration: number             // 月数
  durationName: string         // 如"月付"、"季付"、"年付"
  originalPrice: number        // 原价
  price: number                // 现价
  dailyPrice: number           // 日均价格
  discount?: string            // 折扣标签
  popular?: boolean            // 是否推荐
  features: string[]           // 特色功能
}

// 套餐分组（按等级分组）
export interface VipPlanGroup {
  level: VipLevel
  levelName: string
  description: string
  plans: VipPlan[]
}

// 会员中心数据
export interface VipCenterData {
  status: VipStatus
  benefits: VipBenefit[]
  planGroups: VipPlanGroup[]
}

// 购买请求（会员为禁用虚拟币场景，仅支持第三方真实支付渠道）
export interface VipPurchaseRequest {
  planId: string
  paymentMethod: 'wechat' | 'alipay' | 'unionpay' | 'huifu'
}

// 购买响应
export interface VipPurchaseResponse {
  orderId: string
  payUrl?: string
  expireAt: string
}
