// 分站直播相关类型定义

// 直播状态
export type LiveStatus = 'live' | 'preview' | 'replay' | 'ended'

// 直播间商品
export interface LiveProduct {
  id: number
  name: string
  cover: string
  price: number
  originalPrice?: number
}

// 直播间信息
export interface StationLiveRoom {
  id: number
  title: string
  cover: string
  status: LiveStatus
  // 主播信息
  anchor: {
    id: number
    nickname: string
    avatar: string
    level?: number
  }
  // 统计数据
  viewCount: number
  likeCount: number
  // 商品信息
  productCount: number
  products: LiveProduct[]  // 前几个商品预览
  // 预告信息
  scheduledTime?: string   // 预告开播时间
  // 回放信息
  replayDuration?: number  // 回放时长（秒）
  // 标签
  tags?: string[]
  // 分站专属标识
  isStationExclusive: boolean
  // 创建时间
  createdAt: string
}

// 分站直播列表响应
export interface StationLiveListResponse {
  list: StationLiveRoom[]
  total: number
  hasMore: boolean
  // 分站信息
  stationName: string
  stationLogo: string
}

// 直播筛选
export type LiveFilter = 'all' | 'live' | 'preview' | 'replay'
