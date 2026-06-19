// 分站直播相关 API
import { apiGet, useMock } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { StationLiveRoom, StationLiveListResponse, LiveFilter } from '../types/station-live'

// ========== Mock 数据 ==========

const mockLiveRooms: StationLiveRoom[] = [
  {
    id: 1,
    title: '八字命理精讲 - 如何看财运',
    cover: '/placeholder.svg?height=200&width=350',
    status: 'live',
    anchor: {
      id: 101,
      nickname: '易学大师张老师',
      avatar: '/placeholder.svg?height=40&width=40',
      level: 5,
    },
    viewCount: 3280,
    likeCount: 1520,
    productCount: 8,
    products: [
      { id: 1, name: '八字命理入门课程', cover: '/placeholder.svg', price: 199, originalPrice: 299 },
      { id: 2, name: '专业罗盘', cover: '/placeholder.svg', price: 368 },
    ],
    tags: ['命理', '财运'],
    isStationExclusive: true,
    createdAt: '2026-06-03 14:00',
  },
  {
    id: 2,
    title: '风水布局实战课 - 家居旺财秘诀',
    cover: '/placeholder.svg?height=200&width=350',
    status: 'live',
    anchor: {
      id: 102,
      nickname: '风水顾问李老师',
      avatar: '/placeholder.svg?height=40&width=40',
      level: 4,
    },
    viewCount: 2150,
    likeCount: 980,
    productCount: 5,
    products: [
      { id: 3, name: '风水实战课程', cover: '/placeholder.svg', price: 299 },
    ],
    tags: ['风水', '家居'],
    isStationExclusive: true,
    createdAt: '2026-06-03 15:00',
  },
  {
    id: 3,
    title: '今晚8点：紫微斗数入门直播',
    cover: '/placeholder.svg?height=200&width=350',
    status: 'preview',
    anchor: {
      id: 103,
      nickname: '紫微名师王老师',
      avatar: '/placeholder.svg?height=40&width=40',
      level: 5,
    },
    viewCount: 0,
    likeCount: 0,
    productCount: 3,
    products: [],
    scheduledTime: '2026-06-03 20:00',
    tags: ['紫微斗数', '入门'],
    isStationExclusive: true,
    createdAt: '2026-06-02 10:00',
  },
  {
    id: 4,
    title: '面相学基础 - 五官看性格',
    cover: '/placeholder.svg?height=200&width=350',
    status: 'preview',
    anchor: {
      id: 104,
      nickname: '相学专家陈老师',
      avatar: '/placeholder.svg?height=40&width=40',
      level: 3,
    },
    viewCount: 0,
    likeCount: 0,
    productCount: 2,
    products: [],
    scheduledTime: '2026-06-04 19:30',
    tags: ['面相', '入门'],
    isStationExclusive: false,
    createdAt: '2026-06-01 15:00',
  },
  {
    id: 5,
    title: '六爻预测实战案例解析',
    cover: '/placeholder.svg?height=200&width=350',
    status: 'replay',
    anchor: {
      id: 105,
      nickname: '六爻大师赵老师',
      avatar: '/placeholder.svg?height=40&width=40',
      level: 5,
    },
    viewCount: 8560,
    likeCount: 3200,
    productCount: 6,
    products: [
      { id: 4, name: '六爻预测进阶课', cover: '/placeholder.svg', price: 399 },
    ],
    replayDuration: 7200,
    tags: ['六爻', '实战'],
    isStationExclusive: true,
    createdAt: '2026-06-01 14:00',
  },
  {
    id: 6,
    title: '择日学精讲 - 婚嫁吉日选择',
    cover: '/placeholder.svg?height=200&width=350',
    status: 'replay',
    anchor: {
      id: 106,
      nickname: '择日专家孙老师',
      avatar: '/placeholder.svg?height=40&width=40',
      level: 4,
    },
    viewCount: 5230,
    likeCount: 1850,
    productCount: 4,
    products: [],
    replayDuration: 5400,
    tags: ['择日', '婚嫁'],
    isStationExclusive: true,
    createdAt: '2026-05-30 19:00',
  },
]

// ========== API 函数 ==========

/**
 * 获取分站直播列表
 */
export async function getStationLiveRooms(
  stationId: number,
  filter: LiveFilter = 'all',
  page: number = 1,
  pageSize: number = 10
): Promise<ApiResponse<StationLiveListResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 500))
    let filtered = mockLiveRooms
    if (filter !== 'all') {
      filtered = mockLiveRooms.filter(room => room.status === filter)
    }
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const list = filtered.slice(start, end)
    return {
      code: 200,
      data: {
        list,
        total: filtered.length,
        hasMore: end < filtered.length,
        stationName: '国学智慧分站',
        stationLogo: '/placeholder.svg?height=40&width=40',
      },
      message: 'success',
    }
  }
  return apiGet<StationLiveListResponse>('/station/live/rooms', { stationId, filter, page, pageSize })
}

/**
 * 格式化观看数
 */
export function formatViewCount(count: number): string {
  if (count >= 10000) {
    return (count / 10000).toFixed(1) + 'w'
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'k'
  }
  return count.toString()
}

/**
 * 格式化直播时长
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}小时${minutes}分钟`
  }
  return `${minutes}分钟`
}

/**
 * 计算倒计时
 */
export function calculateCountdown(scheduledTime: string): { days: number; hours: number; minutes: number; seconds: number } | null {
  const target = new Date(scheduledTime).getTime()
  const now = Date.now()
  const diff = target - now
  
  if (diff <= 0) return null
  
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  }
}

/**
 * 格式化倒计时显示
 */
export function formatCountdown(countdown: { days: number; hours: number; minutes: number; seconds: number }): string {
  if (countdown.days > 0) {
    return `${countdown.days}天${countdown.hours}小时后开播`
  }
  if (countdown.hours > 0) {
    return `${countdown.hours}小时${countdown.minutes}分钟后开播`
  }
  return `${countdown.minutes}分${countdown.seconds}秒后开播`
}

/**
 * 获取状态标签信息
 */
export function getLiveStatusInfo(status: string): { label: string; color: string; bgColor: string } {
  switch (status) {
    case 'live':
      return { label: '直播中', color: '#ffffff', bgColor: '#C41E3A' }
    case 'preview':
      return { label: '预告', color: '#C9A96E', bgColor: 'rgba(201, 169, 110, 0.15)' }
    case 'replay':
      return { label: '回放', color: '#666666', bgColor: 'rgba(0, 0, 0, 0.08)' }
    default:
      return { label: '已结束', color: '#999999', bgColor: 'rgba(0, 0, 0, 0.05)' }
  }
}
