import { apiGet } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { OperatorPanelData, OperatorOverviewItem, TeamMemberRanking, QuotaUsageItem } from '../types/operator'

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== 'false'

// Mock 数据
const mockOperatorPanelData: OperatorPanelData = {
  operatorInfo: {
    id: 1001,
    name: '华东区运营中心',
    level: '金牌运营商',
    joinDate: '2024-03-15'
  },
  overview: [
    {
      key: 'monthRevenue',
      label: '本月业绩',
      value: 128600,
      unit: '元',
      trend: 12.5,
      trendLabel: '较上月'
    },
    {
      key: 'teamMembers',
      label: '团队成员',
      value: 45,
      unit: '人',
      trend: 3,
      trendLabel: '本月新增'
    },
    {
      key: 'newCustomers',
      label: '新增客户',
      value: 386,
      unit: '人',
      trend: 8.2,
      trendLabel: '较上月'
    },
    {
      key: 'commission',
      label: '待结算佣金',
      value: 15680,
      unit: '元'
    },
    {
      key: 'coursesSold',
      label: '课程销售',
      value: 892,
      unit: '份',
      trend: 15.3,
      trendLabel: '较上月'
    },
    {
      key: 'conversionRate',
      label: '转化率',
      value: '23.5%',
      trend: 2.1,
      trendLabel: '较上月'
    }
  ],
  teamRanking: [
    {
      rank: 1,
      userId: 101,
      nickname: '张明华',
      avatar: '/placeholder.svg?height=40&width=40',
      performance: 28500,
      performanceUnit: '元',
      change: 15.2
    },
    {
      rank: 2,
      userId: 102,
      nickname: '李小红',
      avatar: '/placeholder.svg?height=40&width=40',
      performance: 24300,
      performanceUnit: '元',
      change: 8.5
    },
    {
      rank: 3,
      userId: 103,
      nickname: '王建国',
      avatar: '/placeholder.svg?height=40&width=40',
      performance: 21800,
      performanceUnit: '元',
      change: -2.3
    },
    {
      rank: 4,
      userId: 104,
      nickname: '赵雅琴',
      avatar: '/placeholder.svg?height=40&width=40',
      performance: 19600,
      performanceUnit: '元',
      change: 12.1,
      isSelf: true
    },
    {
      rank: 5,
      userId: 105,
      nickname: '陈志强',
      avatar: '/placeholder.svg?height=40&width=40',
      performance: 17200,
      performanceUnit: '元',
      change: 5.8
    },
    {
      rank: 6,
      userId: 106,
      nickname: '刘芳芳',
      avatar: '/placeholder.svg?height=40&width=40',
      performance: 15800,
      performanceUnit: '元',
      change: -1.2
    },
    {
      rank: 7,
      userId: 107,
      nickname: '孙伟',
      avatar: '/placeholder.svg?height=40&width=40',
      performance: 14500,
      performanceUnit: '元',
      change: 3.4
    },
    {
      rank: 8,
      userId: 108,
      nickname: '周丽娟',
      avatar: '/placeholder.svg?height=40&width=40',
      performance: 12900,
      performanceUnit: '元',
      change: 7.6
    }
  ],
  quotaUsage: [
    {
      key: 'courseQuota',
      label: '课程推广配额',
      used: 450,
      total: 500,
      unit: '次',
      expireAt: '2026-06-30',
      isLow: true
    },
    {
      key: 'liveQuota',
      label: '直播推广配额',
      used: 28,
      total: 100,
      unit: '场',
      expireAt: '2026-06-30',
      isLow: false
    },
    {
      key: 'memberQuota',
      label: '团队成员上限',
      used: 45,
      total: 50,
      unit: '人',
      isLow: true
    },
    {
      key: 'storageQuota',
      label: '存储空间',
      used: 8.5,
      total: 20,
      unit: 'GB',
      isLow: false
    }
  ],
  quickActions: [
    { key: 'team', label: '团队管理', icon: 'users', href: '/operator/dashboard', badge: 3 },
    { key: 'commission', label: '佣金明细', icon: 'wallet', href: '/station/earnings' },
    { key: 'promote', label: '推广中心', icon: 'megaphone', href: '/station/materials' },
    { key: 'customers', label: '客户管理', icon: 'user-check', href: '/operator/dashboard', badge: 12 },
    { key: 'materials', label: '推广素材', icon: 'image', href: '/station/materials' },
    { key: 'statistics', label: '数据统计', icon: 'bar-chart', href: '/operator/dashboard' },
    { key: 'quota', label: '名额管理', icon: 'book-open', href: '/operator/quota' },
    { key: 'settlement', label: '结算申请', icon: 'credit-card', href: '/station/earnings' }
  ]
}

/**
 * 获取运营商面板数据
 */
export async function getOperatorPanelData(): Promise<ApiResponse<OperatorPanelData>> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 600))
    return {
      code: 200,
      data: mockOperatorPanelData,
      message: 'success'
    }
  }
  
  return apiGet<OperatorPanelData>('/api/operator/panel')
}

/**
 * 获取运营商概览数据
 */
export async function getOperatorOverview(): Promise<ApiResponse<OperatorOverviewItem[]>> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 400))
    return {
      code: 200,
      data: mockOperatorPanelData.overview,
      message: 'success'
    }
  }
  
  return apiGet<OperatorOverviewItem[]>('/api/operator/overview')
}

/**
 * 获取团队排行
 */
export async function getTeamRanking(
  period: 'day' | 'week' | 'month' = 'month'
): Promise<ApiResponse<TeamMemberRanking[]>> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 400))
    return {
      code: 200,
      data: mockOperatorPanelData.teamRanking,
      message: 'success'
    }
  }
  
  return apiGet<TeamMemberRanking[]>('/api/operator/team-ranking', { period })
}

/**
 * 获取配额使用情况
 */
export async function getQuotaUsage(): Promise<ApiResponse<QuotaUsageItem[]>> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 400))
    return {
      code: 200,
      data: mockOperatorPanelData.quotaUsage,
      message: 'success'
    }
  }
  
  return apiGet<QuotaUsageItem[]>('/api/operator/quota-usage')
}
