// 直播相关类型定义

// 直播状态
export type LiveStatus = 'upcoming' | 'live' | 'ended' | 'replay'

// 直播类型
export type LiveType = 'knowledge' | 'ecommerce' | 'entertainment'

// 主播信息
export interface LiveHost {
  id: number
  name: string
  avatar: string
  followers: number
  isVerified: boolean
  title?: string
}

// 直播间基础信息
export interface LiveRoom {
  id: number
  title: string
  cover: string
  type: LiveType
  status: LiveStatus
  host: LiveHost
  // 观众数
  viewerCount: number
  likeCount: number
  // 时间
  startTime: string
  endTime?: string
  duration?: string
  // 是否付费
  isPaid: boolean
  price?: number
  isPurchased?: boolean
  // 关联圈子
  circle?: {
    id: number
    name: string
    members: number
  }
}

// ========== 回放相关 ==========

// 章节标记
export interface ReplayChapter {
  id: number
  title: string
  // 开始时间（秒）
  startTime: number
  // 时间显示（HH:MM:SS）
  timeDisplay: string
  // 章节描述
  description?: string
}

// 课件/幻灯片
export interface ReplaySlide {
  id: number
  // 对应时间点（秒）
  time: number
  timeDisplay: string
  // 图片URL
  imageUrl: string
  title?: string
}

// 回放详情
export interface ReplayDetail extends LiveRoom {
  // 回放URL
  replayUrl: string
  // 章节列表
  chapters: ReplayChapter[]
  // 课件列表
  slides: ReplaySlide[]
  // 讨论记录
  discussions: ReplayDiscussion[]
  // 问答记录
  qaList: ReplayQA[]
  // 商品列表（带货直播）
  products?: ReplayProduct[]
}

// 讨论记录
export interface ReplayDiscussion {
  id: number
  time: number
  timeDisplay: string
  userId: number
  userName: string
  userAvatar: string
  content: string
  isHost: boolean
}

// 问答记录
export interface ReplayQA {
  id: number
  time: number
  timeDisplay: string
  question: string
  questionerId: number
  questionerName: string
  answer: string
  answererId: number
  answererName: string
}

// 回放商品
export interface ReplayProduct {
  id: number
  name: string
  image: string
  price: number
  originalPrice: number
  sales: number
  // 提及时间点
  mentionTime: number
  mentionTimeDisplay: string
}

// 倍速选项
export type PlaybackSpeed = 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2

// 播放器状态
export interface PlayerState {
  isPlaying: boolean
  isMuted: boolean
  volume: number
  currentTime: number
  duration: number
  speed: PlaybackSpeed
  isFullscreen: boolean
}
