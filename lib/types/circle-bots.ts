// 圈子智能体相关类型定义

import type { BotItem } from './bots'

// 圈子信息摘要
export interface CircleSummary {
  id: number
  name: string
  icon: string
  description: string
  memberCount: number
  isAdmin: boolean
  isOwner: boolean
}

// 圈子Bot扩展信息
export interface CircleBotItem extends BotItem {
  // 圈子专属
  circleId: number
  // 创建者
  creator: {
    id: number
    nickname: string
    avatar: string
  }
  // 使用统计
  usageCount: number
  // 最近活跃时间
  lastActiveAt: string
  // 是否置顶
  isPinned: boolean
  // 是否为官方Bot
  isOfficial: boolean
}

// 圈子Bot列表响应
export interface CircleBotsResponse {
  circle: CircleSummary
  bots: CircleBotItem[]
  total: number
  hasMore: boolean
}

// 圈子Bot搜索参数
export interface CircleBotSearchParams {
  circleId: number
  keyword?: string
  category?: string
  page?: number
  pageSize?: number
  sortBy?: 'hot' | 'new' | 'usage'
}
