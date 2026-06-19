import { apiGet } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { 
  StationMasterPanelData, 
  StationOverviewItem, 
  StationTrendData, 
  StationBalance,
  StationMemberStats
} from '../types/station'

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== 'false'

// Mock 数据 - 分站概览
const mockOverview: StationOverviewItem[] = [
  {
    label: '团队成员',
    value: 1286,
    unit: '人',
    trend: 12.5,
    trendType: 'up',
    icon: 'users'
  },
  {
    label: '本月收益',
    value: 28650,
    unit: '元',
    trend: 8.3,
    trendType: 'up',
    icon: 'revenue'
  },
  {
    label: '本月订单',
    value: 486,
    unit: '单',
    trend: -2.1,
    trendType: 'down',
    icon: 'orders'
  },
  {
    label: '累计收益',
    value: 156800,
    unit: '元',
    trend: 0,
    trendType: 'flat',
    icon: 'total'
  },
  {
    label: '今日访问',
    value: 328,
    unit: '次',
    trend: 15.6,
    trendType: 'up',
    icon: 'visits'
  },
  {
    label: '转化率',
    value: '6.8%',
    trend: 0.5,
    trendType: 'up',
    icon: 'conversion'
  }
]

// Mock 数据 - 趋势数据
const mockTrends: StationTrendData[] = [
  {
    type: 'revenue',
    label: '收益趋势',
    total: 28650,
    change: 8.3,
    data: [
      { date: '05-28', value: 3200 },
      { date: '05-29', value: 4100 },
      { date: '05-30', value: 3800 },
      { date: '05-31', value: 5200 },
      { date: '06-01', value: 4600 },
      { date: '06-02', value: 3950 },
      { date: '06-03', value: 3800 }
    ]
  },
  {
    type: 'orders',
    label: '订单趋势',
    total: 486,
    change: -2.1,
    data: [
      { date: '05-28', value: 62 },
      { date: '05-29', value: 78 },
      { date: '05-30', value: 71 },
      { date: '05-31', value: 85 },
      { date: '06-01', value: 69 },
      { date: '06-02', value: 65 },
      { date: '06-03', value: 56 }
    ]
  }
]

// Mock 数据 - 余额
const mockBalance: StationBalance = {
  available: 12680,
  pending: 5230,
  withdrawn: 138890,
  frozen: 0
}

// Mock 数据 - 成员统计
const mockMemberStats: StationMemberStats = {
  total: 1286,
  active: 428,
  newThisMonth: 86,
  levelDistribution: [
    { level: 1, count: 856, label: '普通会员' },
    { level: 2, count: 312, label: 'VIP会员' },
    { level: 3, count: 98, label: '高级VIP' },
    { level: 4, count: 20, label: '合伙人' }
  ]
}

// Mock 数据 - 完整面板数据
const mockPanelData: StationMasterPanelData = {
  stationInfo: {
    id: 1001,
    name: '国学文化推广站',
    level: 3,
    levelName: '金牌分站',
    createTime: '2025-01-15',
    expireTime: '2027-01-15',
    status: 'active'
  },
  overview: mockOverview,
  trends: mockTrends,
  balance: mockBalance,
  memberStats: mockMemberStats,
  quickActions: [
    { id: 'promote', label: '推广中心', icon: 'share', path: '/station/promote', description: '生成推广链接/二维码/临时推荐' },
    { id: 'team', label: '团队管理', icon: 'users', path: '/station/team', badge: 5, description: '查看和管理团队成员' },
    { id: 'materials', label: '推广素材', icon: 'image', path: '/station/materials', description: '获取推广海报和文案' },
    { id: 'config', label: '分站配置', icon: 'settings', path: '/station/config', description: '自定义分站设置' },
    { id: 'income', label: '收益明细', icon: 'wallet', path: '/station/earnings', badge: 3, description: '查看收益和提现记录' },
    { id: 'orders', label: '订单管理', icon: 'list', path: '/orders/center', description: '查看团队订单' },
    { id: 'assistant', label: '站长助理', icon: 'chart', path: '/station/assistant', description: 'AI 运营助理' },
    { id: 'help', label: '帮助中心', icon: 'help', path: '/help', description: '常见问题解答' }
  ],
  notices: [
    { id: 1, title: '恭喜！本月业绩达成奖励已发放', type: 'success', createdAt: '2026-06-03 10:00' },
    { id: 2, title: '端午节活动推广素材已更新', type: 'info', createdAt: '2026-06-01 09:00' },
    { id: 3, title: '分站等级即将到期，请及时续费', type: 'warning', createdAt: '2026-05-28 14:00' }
  ]
}

/**
 * 获取分站管理面板完整数据
 */
export async function getStationMasterPanelData(): Promise<ApiResponse<StationMasterPanelData>> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 600))
    return {
      code: 200,
      data: mockPanelData,
      message: 'success'
    }
  }
  
  return apiGet<StationMasterPanelData>('/api/station/master/panel')
}

/**
 * 获取分站概览数据
 */
export async function getStationOverview(): Promise<ApiResponse<StationOverviewItem[]>> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 400))
    return {
      code: 200,
      data: mockOverview,
      message: 'success'
    }
  }
  
  return apiGet<StationOverviewItem[]>('/api/station/dashboard/overview')
}

/**
 * 获取分站趋势数据
 */
export async function getStationTrends(
  period: 'week' | 'month' | 'quarter' = 'week'
): Promise<ApiResponse<StationTrendData[]>> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 400))
    return {
      code: 200,
      data: mockTrends,
      message: 'success'
    }
  }
  
  return apiGet<StationTrendData[]>('/api/station/dashboard/trends', { period })
}

/**
 * 获取分站余额信息
 */
export async function getStationBalance(): Promise<ApiResponse<StationBalance>> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return {
      code: 200,
      data: mockBalance,
      message: 'success'
    }
  }
  
  return apiGet<StationBalance>('/api/commission/balance')
}

/**
 * 获取分站成员统计
 */
export async function getStationMemberStats(): Promise<ApiResponse<StationMemberStats>> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return {
      code: 200,
      data: mockMemberStats,
      message: 'success'
    }
  }
  
  return apiGet<StationMemberStats>('/api/station/members/stats')
}
