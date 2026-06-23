// 管理员面板相关类型定义

// 数据概览项
export interface AdminOverviewItem {
  key: string
  label: string
  value: number
  unit?: string
  trend?: {
    type: 'up' | 'down' | 'flat'
    value: number
    label: string
  }
  icon: string
}

// 快捷功能入口
export interface AdminQuickAction {
  id: string
  label: string
  icon: string
  href: string
  badge?: number
  color?: string
}

// 待处理事项
export interface AdminPendingItem {
  id: number
  type: 'content_review' | 'user_report' | 'order_refund' | 'withdraw' | 'certification' | 'feedback'
  title: string
  description: string
  createdAt: string
  priority: 'high' | 'medium' | 'low'
  href: string
}

// 管理员面板数据
export interface AdminPanelData {
  overview: AdminOverviewItem[]
  quickActions: AdminQuickAction[]
  pendingItems: AdminPendingItem[]
  pendingCounts: {
    contentReview: number
    userReport: number
    orderRefund: number
    withdraw: number
    certification: number
    feedback: number
  }
}

// 管理员角色
export type AdminRole = 'super_admin' | 'operation_admin' | 'content_admin' | 'finance_admin'

// 管理员信息
export interface AdminInfo {
  id: number
  name: string
  role: AdminRole
  roleName: string
  permissions: string[]
  lastLoginAt: string
}
