// 营销活动相关类型定义

// 活动类型
export type ActivityType = 'flash_sale' | 'group_buy' | 'promotion' | 'coupon' | 'lottery'

// 活动状态
export type ActivityStatus = 'upcoming' | 'ongoing' | 'ended'

// 活动基础信息
export interface ActivityBase {
  id: number
  title: string
  subtitle?: string
  type: ActivityType
  status: ActivityStatus
  // Banner图
  bannerUrl: string
  // 时间
  startTime: string
  endTime: string
  // 活动规则
  rules: string[]
  // 分享配置
  shareTitle?: string
  shareImage?: string
}

// 秒杀商品
export interface FlashSaleItem {
  id: number
  productId: number
  title: string
  cover: string
  // 价格
  originalPrice: number
  salePrice: number
  // 库存
  totalStock: number
  soldCount: number
  // 限购
  limitPerUser: number
  // 状态
  status: 'upcoming' | 'ongoing' | 'sold_out' | 'ended'
}

// 秒杀活动
export interface FlashSaleActivity extends ActivityBase {
  type: 'flash_sale'
  items: FlashSaleItem[]
}

// 拼团商品
export interface GroupBuyItem {
  id: number
  productId: number
  title: string
  cover: string
  // 价格
  originalPrice: number
  groupPrice: number
  // 成团人数
  groupSize: number
  // 已成团数
  completedGroups: number
  // 正在拼团的团
  ongoingGroups: {
    id: number
    leaderId: number
    leaderAvatar: string
    leaderName: string
    currentSize: number
    expireAt: string
  }[]
}

// 拼团活动
export interface GroupBuyActivity extends ActivityBase {
  type: 'group_buy'
  items: GroupBuyItem[]
}

// 促销商品
export interface PromotionItem {
  id: number
  productId: number
  title: string
  cover: string
  // 价格
  originalPrice: number
  promotionPrice: number
  // 折扣标签
  discountLabel: string // 如 "5折" "立减50"
  // 标签
  tags?: string[]
}

// 促销活动
export interface PromotionActivity extends ActivityBase {
  type: 'promotion'
  items: PromotionItem[]
}

// 活动详情联合类型
export type ActivityDetail = FlashSaleActivity | GroupBuyActivity | PromotionActivity

// 活动列表项
export interface ActivityListItem {
  id: number
  title: string
  type: ActivityType
  status: ActivityStatus
  bannerUrl: string
  startTime: string
  endTime: string
  productCount: number
}

// 倒计时
export interface Countdown {
  days: number
  hours: number
  minutes: number
  seconds: number
  isEnded: boolean
}

// ========== 活动日历相关 ==========

// 日历事件类型
export type CalendarEventType = 'flash_sale' | 'group_buy' | 'promotion' | 'live' | 'course'

// 日历事件
export interface CalendarEvent {
  id: number
  type: CalendarEventType
  title: string
  cover?: string
  startTime: string
  endTime: string
  status: ActivityStatus
  // 额外信息
  extra?: {
    productCount?: number
    viewerCount?: number
    hostName?: string
    price?: number
  }
}

// 日期活动标记
export interface DateMarker {
  date: string // YYYY-MM-DD
  events: CalendarEvent[]
  hasFlashSale: boolean
  hasGroupBuy: boolean
  hasPromotion: boolean
  hasLive: boolean
  hasCourse: boolean
}

// 月历数据响应
export interface CalendarMonthData {
  year: number
  month: number
  markers: DateMarker[]
}
