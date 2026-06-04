/**
 * 直播类型定义
 * 基于后端 API /live/** 端点
 */

/** 直播状态 */
export type LiveStatus = 'upcoming' | 'live' | 'ended' | 'replay'

/** 直播类型 */
export type LiveType = 'knowledge' | 'ecommerce' | 'entertainment'

/** 主播信息 */
export interface LiveHost {
  id: string
  name: string
  avatar: string
  followers: number
  isVerified: boolean
  title?: string
}

/** 直播间 */
export interface LiveRoom {
  id: string
  title: string
  cover: string
  type: LiveType
  status: LiveStatus
  host: LiveHost
  viewerCount: number
  likeCount: number
  startTime: string
  endTime?: string
  duration?: number          // 时长（秒）
  isPaid: boolean
  price?: number             // 价格（分）
  isPurchased?: boolean
  circleId?: string
  circleName?: string
  description?: string
  notice?: string
  scheduleId?: string
  createdAt?: string
}

/** 推流/播放地址 */
export interface StreamUrls {
  pushUrl?: string           // 推流地址（主播用）
  pullUrl?: string           // 拉流地址
  flvUrl?: string
  hlsUrl?: string
  rtmpUrl?: string
}

/** 连麦信息 */
export interface MicInfo {
  userId: string
  nickname: string
  avatar: string
  position: number           // 麦位
  isMuted: boolean
  isCameraOn: boolean
  joinedAt: string
}

/** 直播礼物 */
export interface LiveGift {
  id: string
  name: string
  icon: string
  price: number              // 价格（虚拟币）
  animated?: boolean
}

/** 礼物排行榜 */
export interface GiftRankingItem {
  userId: string
  nickname: string
  avatar: string
  totalCoins: number
  rank: number
}

/** 直播弹幕/评论 */
export interface LiveComment {
  id: string
  userId: string
  nickname: string
  avatar: string
  content: string
  createdAt: string
}

/** 直播预约 */
export interface LiveBooking {
  id: string
  roomId: string
  userId: string
  createdAt: string
}

/** 直播秒杀 */
export interface LiveFlashSale {
  id: string
  productId: string
  productName: string
  productCover: string
  flashPrice: number
  originalPrice: number
  stock: number
  sold: number
  startTime: string
}

/** 直播课件 */
export interface LiveSlide {
  id: string
  title: string
  imageUrl: string
  sort: number
}

/** 直播日程（预约列表） */
export interface ScheduledLive {
  id: string
  title: string
  cover: string
  host: LiveHost
  startTime: string
  status: LiveStatus
  bookingCount: number
  isBooked: boolean
}
