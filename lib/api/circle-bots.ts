// 圈子智能体相关 API
import { apiGet, useMock } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { CircleBotsResponse, CircleBotItem, CircleSummary, CircleBotSearchParams } from '../types/circle-bots'

// Mock 数据
const mockCircleSummary: CircleSummary = {
  id: 1,
  name: '八字命理研习社',
  icon: '/placeholder.svg?height=60&width=60',
  description: '专注于八字命理学习与交流，汇聚众多命理爱好者',
  memberCount: 12580,
  isAdmin: true,
  isOwner: false,
}

const mockCircleBots: CircleBotItem[] = [
  {
    id: 101,
    name: '八字速排助手',
    avatar: '/placeholder.svg?height=80&width=80',
    description: '快速排出八字命盘，支持阴阳历转换，自动计算大运流年',
    category: 'mingli',
    rating: 4.9,
    usedCount: 28500,
    price: 0,
    tags: ['八字', '排盘', '免费'],
    isHot: true,
    isNew: false,
    circleId: 1,
    creator: {
      id: 1001,
      nickname: '圈主·易道玄',
      avatar: '/placeholder.svg?height=32&width=32',
    },
    usageCount: 28500,
    lastActiveAt: '2026-06-03 10:30',
    isPinned: true,
    isOfficial: true,
  },
  {
    id: 102,
    name: '日柱分析师',
    avatar: '/placeholder.svg?height=80&width=80',
    description: '专注于日柱深度解读，分析日主性格特征与人生走势',
    category: 'mingli',
    rating: 4.8,
    usedCount: 15600,
    price: 0,
    tags: ['日柱', '性格', '分析'],
    isHot: true,
    isNew: false,
    circleId: 1,
    creator: {
      id: 1002,
      nickname: '管理员·天机子',
      avatar: '/placeholder.svg?height=32&width=32',
    },
    usageCount: 15600,
    lastActiveAt: '2026-06-03 09:15',
    isPinned: true,
    isOfficial: false,
  },
  {
    id: 103,
    name: '流年运势预测',
    avatar: '/placeholder.svg?height=80&width=80',
    description: '根据八字推算流年运势，提供全年各月运势详解',
    category: 'mingli',
    rating: 4.7,
    usedCount: 12300,
    price: 10,
    tags: ['流年', '运势', '付费'],
    isHot: false,
    isNew: false,
    circleId: 1,
    creator: {
      id: 1001,
      nickname: '圈主·易道玄',
      avatar: '/placeholder.svg?height=32&width=32',
    },
    usageCount: 12300,
    lastActiveAt: '2026-06-02 18:45',
    isPinned: false,
    isOfficial: true,
  },
  {
    id: 104,
    name: '合婚配对分析',
    avatar: '/placeholder.svg?height=80&width=80',
    description: '根据双方八字分析婚姻契合度，提供相处建议',
    category: 'mingli',
    rating: 4.6,
    usedCount: 9800,
    price: 20,
    tags: ['合婚', '配对', '婚姻'],
    isHot: false,
    isNew: false,
    circleId: 1,
    creator: {
      id: 1003,
      nickname: '成员·紫微星',
      avatar: '/placeholder.svg?height=32&width=32',
    },
    usageCount: 9800,
    lastActiveAt: '2026-06-01 14:20',
    isPinned: false,
    isOfficial: false,
  },
  {
    id: 105,
    name: '事业运分析官',
    avatar: '/placeholder.svg?height=80&width=80',
    description: '深度分析八字中的事业宫位，指导职业发展方向',
    category: 'mingli',
    rating: 4.8,
    usedCount: 8500,
    price: 15,
    tags: ['事业', '职业', '发展'],
    isHot: false,
    isNew: true,
    circleId: 1,
    creator: {
      id: 1002,
      nickname: '管理员·天机子',
      avatar: '/placeholder.svg?height=32&width=32',
    },
    usageCount: 8500,
    lastActiveAt: '2026-06-03 08:00',
    isPinned: false,
    isOfficial: false,
  },
  {
    id: 106,
    name: '五行调理顾问',
    avatar: '/placeholder.svg?height=80&width=80',
    description: '分析八字五行强弱，提供日常调理和补救建议',
    category: 'mingli',
    rating: 4.5,
    usedCount: 6200,
    price: 0,
    tags: ['五行', '调理', '免费'],
    isHot: false,
    isNew: true,
    circleId: 1,
    creator: {
      id: 1004,
      nickname: '成员·玄易居士',
      avatar: '/placeholder.svg?height=32&width=32',
    },
    usageCount: 6200,
    lastActiveAt: '2026-05-30 16:30',
    isPinned: false,
    isOfficial: false,
  },
]

/**
 * 获取圈子智能体列表
 */
export async function getCircleBots(params: CircleBotSearchParams): Promise<ApiResponse<CircleBotsResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 500))
    
    let filteredBots = [...mockCircleBots]
    
    // 关键词搜索
    if (params.keyword) {
      const kw = params.keyword.toLowerCase()
      filteredBots = filteredBots.filter(
        b => b.name.toLowerCase().includes(kw) || 
             b.description.toLowerCase().includes(kw) ||
             b.tags.some(t => t.toLowerCase().includes(kw))
      )
    }
    
    // 排序
    if (params.sortBy === 'hot') {
      filteredBots.sort((a, b) => b.usageCount - a.usageCount)
    } else if (params.sortBy === 'new') {
      filteredBots.sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime())
    }
    
    // 置顶优先
    filteredBots.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))
    
    const page = params.page || 1
    const pageSize = params.pageSize || 20
    const start = (page - 1) * pageSize
    const end = start + pageSize
    
    return {
      code: 200,
      data: {
        circle: mockCircleSummary,
        bots: filteredBots.slice(start, end),
        total: filteredBots.length,
        hasMore: end < filteredBots.length,
      },
      message: 'success',
    }
  }
  
  return apiGet<CircleBotsResponse>(`/circles/${params.circleId}/bots`, params)
}

/**
 * 格式化使用次数
 */
export function formatUsageCount(count: number): string {
  if (count >= 10000) {
    return (count / 10000).toFixed(1) + 'w'
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'k'
  }
  return count.toString()
}
