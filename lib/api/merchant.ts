// 商家相关 API
import { apiGet, apiPost, useMock } from '../api-client'
import type { ApiResponse } from '../types/api'
import type {
  MerchantDashboard,
  MerchantAnalyticsData,
  RevenueStats,
  RevenueRecord,
  ContentStats,
  ContentItem,
} from '../types/merchant'

// ========== Mock 数据 ==========

const mockMerchantDashboard: MerchantDashboard = {
  shopName: '墨香阁文化',
  avatar: '',
  level: '金牌商家',
  status: '正常营业',
  todayStats: {
    orders: { value: 12, change: 20, trend: 'up' as const },
    sales: { value: 2680, change: 15.5, trend: 'up' as const },
    visitors: { value: 156, change: -8, trend: 'down' as const },
    conversion: { value: 7.7, change: 2.3, trend: 'up' as const },
  },
  pending: {
    toShip: 8,
    refund: 2,
    review: 5,
    inquiry: 3,
  },
  weeklyTrend: {
    orders: [8, 12, 15, 10, 18, 22, 12],
    sales: [1200, 1800, 2200, 1500, 2800, 3500, 2680],
    visitors: [120, 145, 168, 132, 178, 195, 156],
  },
  notices: [
    { id: '1', title: '双十一活动报名开始', type: '活动', time: '2小时前' },
    { id: '2', title: '新版商品发布规则已更新', type: '规则', time: '1天前' },
  ],
}

const mockMerchantAnalytics: MerchantAnalyticsData = {
  metrics: [
    {
      title: '总销售额',
      value: 128540,
      unit: '元',
      change: 12.5,
      trend: 'up',
      description: '本月销售总额',
    },
    {
      title: '订单数',
      value: 856,
      unit: '单',
      change: 8.3,
      trend: 'up',
      description: '本月订单总数',
    },
    {
      title: '平均客单价',
      value: 150.28,
      unit: '元',
      change: -2.1,
      trend: 'down',
      description: '平均每单金额',
    },
    {
      title: '转化率',
      value: 8.2,
      unit: '%',
      change: 1.5,
      trend: 'up',
      description: '访问转化比例',
    },
  ],
  categorySales: [
    { name: '古籍书籍', sales: 45000, percentage: 35, orders: 320 },
    { name: '文物复制品', sales: 32000, percentage: 25, orders: 180 },
    { name: '香具用品', sales: 28000, percentage: 22, orders: 210 },
    { name: '其他', sales: 23540, percentage: 18, orders: 146 },
  ],
  salesTrend: [
    { date: '1-1', sales: 4200, orders: 28, visitors: 320 },
    { date: '1-2', sales: 5100, orders: 35, visitors: 380 },
    { date: '1-3', sales: 3900, orders: 26, visitors: 290 },
    { date: '1-4', sales: 6200, orders: 42, visitors: 450 },
    { date: '1-5', sales: 7100, orders: 48, visitors: 520 },
    { date: '1-6', sales: 5800, orders: 39, visitors: 420 },
    { date: '1-7', sales: 8240, orders: 56, visitors: 580 },
  ],
  topProducts: [
    { id: '1', name: '《渊海子平》古籍影印本', sales: 8500, revenue: 127500, change: 15 },
    { id: '2', name: '紫砂茶具套装', sales: 6200, revenue: 93000, change: 8 },
    { id: '3', name: '八字算命初学者套装', sales: 5100, revenue: 76500, change: 12 },
  ],
  customerRetention: {
    newCustomers: 145,
    repeatCustomers: 280,
    retention: 65.9,
  },
}

const mockRevenueStats: RevenueStats = {
  totalRevenue: 128540,
  pendingRevenue: 15000,
  withdrawnRevenue: 85000,
  monthlyGrowth: 12.5,
  trend: 'up',
}

const mockRevenueRecords: RevenueRecord[] = [
  { id: '1', date: '2024-01-20', source: '订单', amount: 2850, status: '已结算' },
  { id: '2', date: '2024-01-20', source: '订单', amount: 1560, status: '已结算' },
  { id: '3', date: '2024-01-19', source: '订单', amount: 3200, status: '待结算' },
  { id: '4', date: '2024-01-19', source: '活动', amount: 500, status: '待结算' },
  { id: '5', date: '2024-01-18', source: '订单', amount: 4500, status: '已提现' },
  { id: '6', date: '2024-01-18', source: '退款', amount: -800, status: '已结算' },
]

const mockContentStats: ContentStats = {
  totalProducts: 156,
  publishedProducts: 142,
  draftProducts: 12,
  publishedArticles: 48,
  totalViews: 45680,
  totalLikes: 3240,
}

const mockContentItems: ContentItem[] = [
  { id: '1', title: '《渊海子平》古籍影印本', type: '商品', views: 2850, likes: 340, sales: 85, status: '已发布', createdAt: '2024-01-15' },
  { id: '2', title: '紫砂茶具套装', type: '商品', views: 2150, likes: 280, sales: 62, status: '已发布', createdAt: '2024-01-14' },
  { id: '3', title: '如何快速入门八字学', type: '文章', views: 1850, likes: 180, status: '已发布', createdAt: '2024-01-13' },
  { id: '4', title: '新推出：算命初学者套装', type: '商品', views: 1200, likes: 95, status: '草稿', createdAt: '2024-01-20' },
  { id: '5', title: '古籍分享系列 Vol.2', type: '文章', views: 980, likes: 75, status: '已发布', createdAt: '2024-01-10' },
]

// ========== API 函数 ==========

// 获取商家仪表板数据
export async function getMerchantDashboard(): Promise<ApiResponse<MerchantDashboard>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 500))
    return { code: 200, data: mockMerchantDashboard, message: 'success' }
  }
  return apiGet<MerchantDashboard>('/merchant/dashboard')
}

// 获取商家分析数据
export async function getMerchantAnalytics(period: 'day' | 'week' | 'month' = 'month'): Promise<ApiResponse<MerchantAnalyticsData>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 800))
    return { code: 200, data: mockMerchantAnalytics, message: 'success' }
  }
  return apiGet<MerchantAnalyticsData>('/merchant/analytics', { period })
}

// 获取收益统计
export async function getRevenueStats(): Promise<ApiResponse<RevenueStats>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    return { code: 200, data: mockRevenueStats, message: 'success' }
  }
  return apiGet<RevenueStats>('/merchant/revenue/stats')
}

// 获取收益记录
export async function getRevenueRecords(page: number = 1, pageSize: number = 20): Promise<ApiResponse<{ list: RevenueRecord[], total: number, hasMore: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 500))
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const list = mockRevenueRecords.slice(start, end)
    return {
      code: 200,
      data: {
        list,
        total: mockRevenueRecords.length,
        hasMore: end < mockRevenueRecords.length,
      },
      message: 'success',
    }
  }
  return apiGet<{ list: RevenueRecord[], total: number, hasMore: boolean }>('/merchant/revenue/records', { page, pageSize })
}

// 获取内容统计
export async function getContentStats(): Promise<ApiResponse<ContentStats>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    return { code: 200, data: mockContentStats, message: 'success' }
  }
  return apiGet<ContentStats>('/merchant/content/stats')
}

// 获取内容列表
export async function getContentList(type?: string, page: number = 1, pageSize: number = 20): Promise<ApiResponse<{ list: ContentItem[], total: number, hasMore: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 500))
    let filtered = mockContentItems
    if (type) {
      filtered = filtered.filter(item => item.type === type)
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
  return apiGet<{ list: ContentItem[], total: number, hasMore: boolean }>('/merchant/content/list', { type, page, pageSize })
}
