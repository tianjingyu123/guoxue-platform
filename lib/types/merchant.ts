// 商家相关类型定义

// 商家等级
export type MerchantLevel = '新手商家' | '中级商家' | '高级商家' | '金牌商家' | '钻石商家'

// 商家状态
export type MerchantStatus = '正常营业' | '休息中' | '已关闭' | '违规暂停'

// 单个数据指标
export interface MetricData {
  value: number
  change: number
  trend: 'up' | 'down'
}

// 今日数据
export interface TodayStats {
  orders: MetricData
  sales: MetricData
  visitors: MetricData
  conversion: MetricData
}

// 待处理事项
export interface PendingItems {
  toShip: number
  refund: number
  review: number
  inquiry: number
}

// 周趋势数据
export interface WeeklyTrend {
  orders: number[]
  sales: number[]
  visitors: number[]
}

// 公告
export interface MerchantNotice {
  id: string
  title: string
  type: string
  time: string
}

// 商家仪表板数据
export interface MerchantDashboard {
  shopName: string
  avatar: string
  level: MerchantLevel
  status: MerchantStatus
  todayStats: TodayStats
  pending: PendingItems
  weeklyTrend: WeeklyTrend
  notices: MerchantNotice[]
}

// 商家分析数据 - 单个指标详情
export interface AnalyticsMetric {
  title: string
  value: number
  unit: string
  change: number
  trend: 'up' | 'down'
  description: string
}

// 商家分析数据 - 分类统计
export interface CategorySales {
  name: string
  sales: number
  percentage: number
  orders: number
}

// 商家分析数据 - 销售趋势
export interface SalesTrendItem {
  date: string
  sales: number
  orders: number
  visitors: number
}

// 商家分析响应
export interface MerchantAnalyticsData {
  metrics: AnalyticsMetric[]
  categorySales: CategorySales[]
  salesTrend: SalesTrendItem[]
  topProducts: Array<{
    id: string
    name: string
    sales: number
    revenue: number
    change: number
  }>
  customerRetention: {
    newCustomers: number
    repeatCustomers: number
    retention: number
  }
}

// 收入统计
export interface RevenueStats {
  totalRevenue: number
  pendingRevenue: number
  withdrawnRevenue: number
  monthlyGrowth: number
  trend: 'up' | 'down'
}

// 收入记录
export interface RevenueRecord {
  id: string
  date: string
  source: '订单' | '退款' | '活动'
  amount: number
  status: '已结算' | '待结算' | '已提现'
}

// 内容统计
export interface ContentStats {
  totalProducts: number
  publishedProducts: number
  draftProducts: number
  publishedArticles: number
  totalViews: number
  totalLikes: number
}

// 内容详情
export interface ContentItem {
  id: string
  title: string
  type: '商品' | '文章'
  views: number
  likes: number
  sales?: number
  status: '已发布' | '草稿' | '下架'
  createdAt: string
}
