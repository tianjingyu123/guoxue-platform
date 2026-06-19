// 分站管理面板相关类型定义

// 分站概览数据项
export interface StationOverviewItem {
  label: string
  value: number | string
  unit?: string
  trend?: number // 环比变化百分比
  trendType?: 'up' | 'down' | 'flat'
  icon?: string
}

// 分站趋势数据点
export interface StationTrendPoint {
  date: string
  value: number
}

// 分站趋势数据
export interface StationTrendData {
  type: 'revenue' | 'orders' | 'members' | 'visits'
  label: string
  data: StationTrendPoint[]
  total: number
  change: number // 环比变化
}

// 分站快捷入口
export interface StationQuickAction {
  id: string
  label: string
  icon: string
  path: string
  badge?: number
  description?: string
}

// 分站余额信息
export interface StationBalance {
  available: number // 可提现余额
  pending: number // 待结算
  withdrawn: number // 已提现
  frozen: number // 冻结金额
}

// 分站成员统计
export interface StationMemberStats {
  total: number
  active: number // 本月活跃
  newThisMonth: number
  levelDistribution: {
    level: number
    count: number
    label: string
  }[]
}

// 分站面板完整数据
export interface StationMasterPanelData {
  stationInfo: {
    id: number
    name: string
    level: number
    levelName: string
    createTime: string
    expireTime?: string
    status: 'active' | 'expired' | 'suspended'
  }
  overview: StationOverviewItem[]
  trends: StationTrendData[]
  balance: StationBalance
  memberStats: StationMemberStats
  quickActions: StationQuickAction[]
  notices: {
    id: number
    title: string
    type: 'info' | 'warning' | 'success'
    createdAt: string
  }[]
}
