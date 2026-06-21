// 创作者收益相关类型定义

// 收益来源类型
export type RevenueSourceType = 'course' | 'question' | 'reward' | 'tip' | 'article' | 'live'

// 收益来源名称映射
export const REVENUE_SOURCE_NAMES: Record<RevenueSourceType, string> = {
  course: '课程收入',
  question: '问答收入',
  reward: '悬赏收入',
  tip: '打赏收入',
  article: '文章收入',
  live: '直播收入',
}

// 收益总览
export interface CreatorRevenueOverview {
  totalRevenue: number         // 累计收益
  monthRevenue: number         // 本月收益
  monthGrowthRate: number      // 本月环比增长率
  withdrawable: number         // 可提现金额
  frozen: number               // 冻结金额
  pending: number              // 待结算金额
}

// 收益趋势数据点
export interface RevenueTrendPoint {
  date: string                 // 日期 YYYY-MM-DD
  amount: number               // 金额
}

// 收益来源构成项
export interface RevenueSourceItem {
  type: RevenueSourceType
  amount: number               // 金额
  percentage: number           // 占比 0-100
  count: number                // 订单/次数
}

// 收益明细项
export interface RevenueDetailItem {
  id: number
  type: RevenueSourceType
  title: string                // 来源标题（课程名/问题标题等）
  amount: number
  buyer?: {                    // 购买者/打赏者信息
    id: number
    nickname: string
    avatar: string
  }
  createdAt: string
  status: 'settled' | 'pending' | 'frozen'
}

// 收益明细响应
export interface RevenueDetailResponse {
  list: RevenueDetailItem[]
  total: number
  hasMore: boolean
}

// 创作者收益数据响应
export interface CreatorRevenueData {
  overview: CreatorRevenueOverview
  trend: RevenueTrendPoint[]
  sources: RevenueSourceItem[]
}
