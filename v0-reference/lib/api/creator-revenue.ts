// 创作者收益相关 API
import { apiGet, useMock } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { 
  CreatorRevenueData, 
  CreatorRevenueOverview, 
  RevenueTrendPoint, 
  RevenueSourceItem,
  RevenueDetailItem,
  RevenueDetailResponse,
  RevenueSourceType
} from '../types/creator-revenue'

// ========== Mock 数据 ==========

const mockOverview: CreatorRevenueOverview = {
  totalRevenue: 125680.50,
  monthRevenue: 8520.00,
  monthGrowthRate: 12.5,
  withdrawable: 6800.00,
  frozen: 1200.00,
  pending: 520.00,
}

// 生成近30天趋势数据
const generateTrendData = (): RevenueTrendPoint[] => {
  const data: RevenueTrendPoint[] = []
  const today = new Date()
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    data.push({
      date: date.toISOString().split('T')[0],
      amount: Math.floor(Math.random() * 500) + 100,
    })
  }
  return data
}

const mockTrend = generateTrendData()

const mockSources: RevenueSourceItem[] = [
  { type: 'course', amount: 68500, percentage: 54.5, count: 342 },
  { type: 'question', amount: 25600, percentage: 20.4, count: 128 },
  { type: 'reward', amount: 15800, percentage: 12.6, count: 45 },
  { type: 'tip', amount: 10280, percentage: 8.2, count: 523 },
  { type: 'article', amount: 3500, percentage: 2.8, count: 70 },
  { type: 'live', amount: 2000, percentage: 1.5, count: 8 },
]

const mockRevenueDetails: RevenueDetailItem[] = [
  {
    id: 1,
    type: 'course',
    title: '八字命理高级实战课程',
    amount: 299,
    buyer: { id: 101, nickname: '易学爱好者', avatar: '/placeholder.svg?height=40&width=40' },
    createdAt: '2026-06-03 14:30',
    status: 'settled',
  },
  {
    id: 2,
    type: 'tip',
    title: '直播打赏',
    amount: 66,
    buyer: { id: 102, nickname: '国学小白', avatar: '/placeholder.svg?height=40&width=40' },
    createdAt: '2026-06-03 12:15',
    status: 'settled',
  },
  {
    id: 3,
    type: 'question',
    title: '关于八字中食神制杀的问题',
    amount: 50,
    buyer: { id: 103, nickname: '求知者', avatar: '/placeholder.svg?height=40&width=40' },
    createdAt: '2026-06-03 10:00',
    status: 'pending',
  },
  {
    id: 4,
    type: 'reward',
    title: '帮忙看下这个命盘的事业运势',
    amount: 200,
    buyer: { id: 104, nickname: '命理探索者', avatar: '/placeholder.svg?height=40&width=40' },
    createdAt: '2026-06-02 20:30',
    status: 'settled',
  },
  {
    id: 5,
    type: 'course',
    title: '紫微斗数入门精讲',
    amount: 199,
    buyer: { id: 105, nickname: '传统文化爱好者', avatar: '/placeholder.svg?height=40&width=40' },
    createdAt: '2026-06-02 18:45',
    status: 'frozen',
  },
  {
    id: 6,
    type: 'article',
    title: '浅谈周易六十四卦的现代应用',
    amount: 9.9,
    buyer: { id: 106, nickname: '读者小王', avatar: '/placeholder.svg?height=40&width=40' },
    createdAt: '2026-06-02 15:20',
    status: 'settled',
  },
  {
    id: 7,
    type: 'live',
    title: '周末直播答疑专场',
    amount: 128,
    buyer: { id: 107, nickname: '直播间粉丝', avatar: '/placeholder.svg?height=40&width=40' },
    createdAt: '2026-06-01 21:00',
    status: 'settled',
  },
  {
    id: 8,
    type: 'tip',
    title: '文章打赏',
    amount: 18.8,
    buyer: { id: 108, nickname: '感谢分享', avatar: '/placeholder.svg?height=40&width=40' },
    createdAt: '2026-06-01 16:30',
    status: 'settled',
  },
]

// ========== API 函数 ==========

// 获取创作者收益数据
export async function getCreatorRevenueData(): Promise<ApiResponse<CreatorRevenueData>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 600))
    return {
      code: 200,
      data: {
        overview: mockOverview,
        trend: mockTrend,
        sources: mockSources,
      },
      message: 'success',
    }
  }
  return apiGet<CreatorRevenueData>('/creator/revenue/data')
}

// 获取收益明细列表
export async function getRevenueDetails(
  page: number = 1,
  pageSize: number = 20,
  type?: RevenueSourceType
): Promise<ApiResponse<RevenueDetailResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 500))
    let filtered = mockRevenueDetails
    if (type) {
      filtered = mockRevenueDetails.filter(item => item.type === type)
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
      },
      message: 'success',
    }
  }
  return apiGet<RevenueDetailResponse>('/creator/revenue/details', { page, pageSize, type })
}

// 获取收益总览
export async function getCreatorRevenueOverview(): Promise<ApiResponse<CreatorRevenueOverview>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { code: 200, data: mockOverview, message: 'success' }
  }
  return apiGet<CreatorRevenueOverview>('/creator/revenue/overview')
}

// 获取收益趋势
export async function getRevenueTrend(days: number = 30): Promise<ApiResponse<RevenueTrendPoint[]>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    return { code: 200, data: mockTrend.slice(-days), message: 'success' }
  }
  return apiGet<RevenueTrendPoint[]>('/creator/revenue/trend', { days })
}

// 获取收益来源构成
export async function getRevenueSources(): Promise<ApiResponse<RevenueSourceItem[]>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { code: 200, data: mockSources, message: 'success' }
  }
  return apiGet<RevenueSourceItem[]>('/creator/revenue/sources')
}
