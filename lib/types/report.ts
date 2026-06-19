// 举报相关类型定义

// 举报状态
export type ReportStatus = 'pending' | 'processing' | 'resolved' | 'rejected'

// 举报类型
export type ReportType = 'spam' | 'harassment' | 'inappropriate' | 'fraud' | 'copyright' | 'inducement' | 'pornography' | 'other'

// 举报对象类型
export type ReportTargetType = 'user' | 'post' | 'comment' | 'course' | 'circle' | 'live'

// 举报记录
export interface ReportRecord {
  id: number
  // 举报对象
  targetType: ReportTargetType
  targetId: number
  targetTitle: string
  targetAvatar?: string
  // 举报信息
  reportType: ReportType
  reason: string
  evidence?: string[]
  // 状态
  status: ReportStatus
  // 时间
  createdAt: string
  updatedAt?: string
  // 处理结果
  result?: ReportResult
}

// 处理结果
export interface ReportResult {
  conclusion: 'valid' | 'invalid' | 'partial'
  action?: string
  description: string
  handler?: string
  handledAt: string
}

// 举报统计
export interface ReportStats {
  total: number
  pending: number
  processing: number
  resolved: number
  rejected: number
}

// 举报列表响应
export interface ReportListResponse {
  list: ReportRecord[]
  total: number
  page: number
  pageSize: number
}

// 提交举报请求
export interface SubmitReportRequest {
  targetType: ReportTargetType
  targetId: number
  reportType: ReportType
  reason: string
  evidence?: string[]
}

// 申诉请求
export interface AppealRequest {
  reportId: number
  reason: string
  evidence?: string[]
}
