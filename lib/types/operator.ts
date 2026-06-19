// 运营商相关类型定义

// 运营商概览数据项
export interface OperatorOverviewItem {
  key: string
  label: string
  value: number | string
  unit?: string
  trend?: number // 百分比变化，正数上涨，负数下跌
  trendLabel?: string // 如"较昨日"
}

// 团队成员排行
export interface TeamMemberRanking {
  rank: number
  userId: number
  nickname: string
  avatar: string
  // 业绩指标
  performance: number
  performanceUnit: string
  // 较上期变化
  change?: number
  // 是否是自己
  isSelf?: boolean
}

// 配额使用情况
export interface QuotaUsageItem {
  key: string
  label: string
  used: number
  total: number
  unit: string
  // 过期时间
  expireAt?: string
  // 是否即将用完（剩余<20%）
  isLow?: boolean
}

// 快捷入口
export interface OperatorQuickAction {
  key: string
  label: string
  icon: string
  href: string
  badge?: number
}

// 运营商面板数据
export interface OperatorPanelData {
  // 运营商信息
  operatorInfo: {
    id: number
    name: string
    level: string // 如"金牌运营商"
    joinDate: string
  }
  // 数据概览
  overview: OperatorOverviewItem[]
  // 团队排行
  teamRanking: TeamMemberRanking[]
  // 配额使用
  quotaUsage: QuotaUsageItem[]
  // 快捷入口
  quickActions: OperatorQuickAction[]
}
