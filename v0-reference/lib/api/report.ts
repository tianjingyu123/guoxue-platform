import { apiGet, apiPost, useMock } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { 
  ReportRecord, 
  ReportStats, 
  ReportListResponse, 
  SubmitReportRequest,
  AppealRequest,
  ReportStatus,
  ReportType,
  ReportTargetType
} from '../types/report'

// Mock 举报记录
const mockReportRecords: ReportRecord[] = [
  {
    id: 1,
    targetType: 'user',
    targetId: 201,
    targetTitle: '恶意用户001',
    targetAvatar: '/placeholder.svg?height=48&width=48',
    reportType: 'spam',
    reason: '频繁发送广告信息骚扰用户',
    evidence: ['/placeholder.svg?height=200&width=300'],
    status: 'resolved',
    createdAt: '2026-06-01 14:30',
    updatedAt: '2026-06-02 10:00',
    result: {
      conclusion: 'valid',
      action: '已对该用户进行禁言7天处理',
      description: '经核实，该用户确实存在发送广告信息行为，违反社区规范。',
      handler: '客服小王',
      handledAt: '2026-06-02 10:00',
    },
  },
  {
    id: 2,
    targetType: 'post',
    targetId: 1001,
    targetTitle: '不当言论帖子',
    reportType: 'inappropriate',
    reason: '内容包含不当言论，攻击他人',
    status: 'resolved',
    createdAt: '2026-05-28 09:15',
    updatedAt: '2026-05-29 16:30',
    result: {
      conclusion: 'valid',
      action: '已删除该帖子，并对发布者警告',
      description: '该帖子内容确实包含人身攻击言论，已依据社区规范处理。',
      handler: '管理员',
      handledAt: '2026-05-29 16:30',
    },
  },
  {
    id: 3,
    targetType: 'comment',
    targetId: 5001,
    targetTitle: '恶意评论',
    reportType: 'harassment',
    reason: '评论内容辱骂他人',
    status: 'processing',
    createdAt: '2026-06-02 11:00',
  },
  {
    id: 4,
    targetType: 'course',
    targetId: 101,
    targetTitle: '涉嫌侵权课程',
    reportType: 'copyright',
    reason: '该课程内容涉嫌抄袭他人原创',
    evidence: ['/placeholder.svg?height=200&width=300', '/placeholder.svg?height=200&width=300'],
    status: 'pending',
    createdAt: '2026-06-03 08:45',
  },
  {
    id: 5,
    targetType: 'user',
    targetId: 305,
    targetTitle: '可疑账号',
    targetAvatar: '/placeholder.svg?height=48&width=48',
    reportType: 'fraud',
    reason: '冒充官方客服骗取用户信息',
    status: 'rejected',
    createdAt: '2026-05-25 15:20',
    updatedAt: '2026-05-26 09:00',
    result: {
      conclusion: 'invalid',
      description: '经核实，该用户为正常用户，未发现欺诈行为。如有新证据可重新举报。',
      handler: '审核员小李',
      handledAt: '2026-05-26 09:00',
    },
  },
]

/**
 * 获取举报统计
 */
export async function getReportStats(): Promise<ApiResponse<ReportStats>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 200))
    return {
      code: 200,
      data: {
        total: mockReportRecords.length,
        pending: mockReportRecords.filter(r => r.status === 'pending').length,
        processing: mockReportRecords.filter(r => r.status === 'processing').length,
        resolved: mockReportRecords.filter(r => r.status === 'resolved').length,
        rejected: mockReportRecords.filter(r => r.status === 'rejected').length,
      },
      message: 'success',
    }
  }
  return apiGet<ReportStats>('/report/stats')
}

/**
 * 获取举报记录列表
 */
export async function getReportList(params: {
  status?: ReportStatus
  page?: number
  pageSize?: number
}): Promise<ApiResponse<ReportListResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    let list = [...mockReportRecords]
    if (params.status) {
      list = list.filter(r => r.status === params.status)
    }
    return {
      code: 200,
      data: {
        list,
        total: list.length,
        page: params.page || 1,
        pageSize: params.pageSize || 10,
      },
      message: 'success',
    }
  }
  return apiGet<ReportListResponse>('/report/list', params)
}

/**
 * 获取举报详情
 */
export async function getReportDetail(reportId: number): Promise<ApiResponse<ReportRecord>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    const record = mockReportRecords.find(r => r.id === reportId)
    if (record) {
      return { code: 200, data: record, message: 'success' }
    }
    return { code: 404, data: null as any, message: '举报记录不存在' }
  }
  return apiGet<ReportRecord>(`/report/${reportId}`)
}

/**
 * 提交举报
 */
export async function submitReport(request: SubmitReportRequest): Promise<ApiResponse<{ reportId: number }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 500))
    return { code: 200, data: { reportId: Date.now() }, message: '举报已提交，我们会尽快处理' }
  }
  return apiPost<{ reportId: number }>('/report/submit', request)
}

/**
 * 提交申诉
 */
export async function submitAppeal(request: AppealRequest): Promise<ApiResponse<{ appealId: number }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 500))
    return { code: 200, data: { appealId: Date.now() }, message: '申诉已提交，我们会重新审核' }
  }
  return apiPost<{ appealId: number }>('/report/appeal', request)
}

/**
 * 获取状态显示名
 */
export function getReportStatusLabel(status: ReportStatus): string {
  const labels: Record<ReportStatus, string> = {
    pending: '待处理',
    processing: '处理中',
    resolved: '已处理',
    rejected: '已驳回',
  }
  return labels[status]
}

/**
 * 获取状态颜色
 */
export function getReportStatusColor(status: ReportStatus): string {
  const colors: Record<ReportStatus, string> = {
    pending: 'bg-amber-100 text-amber-700',
    processing: 'bg-blue-100 text-blue-700',
    resolved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  }
  return colors[status]
}

/**
 * 获取举报类型显示名
 */
export function getReportTypeLabel(type: ReportType): string {
  const labels: Record<ReportType, string> = {
    spam: '垃圾广告',
    harassment: '骚扰辱骂',
    inappropriate: '违规内容',
    fraud: '欺诈行为',
    copyright: '侵权内容',
    inducement: '诱导分享',
    pornography: '色情低俗',
    other: '其他',
  }
  return labels[type]
}

/**
 * 获取举报对象类型显示名
 */
export function getTargetTypeLabel(type: ReportTargetType): string {
  const labels: Record<ReportTargetType, string> = {
    user: '用户',
    post: '帖子',
    comment: '评论',
    course: '课程',
    circle: '圈子',
    live: '直播',
  }
  return labels[type]
}

/**
 * 获取处理结论显示名
 */
export function getConclusionLabel(conclusion: string): string {
  const labels: Record<string, string> = {
    valid: '举报成立',
    invalid: '举报不成立',
    partial: '部分成立',
  }
  return labels[conclusion] || conclusion
}

/**
 * 获取处理结论颜色
 */
export function getConclusionColor(conclusion: string): string {
  const colors: Record<string, string> = {
    valid: 'text-green-600',
    invalid: 'text-red-600',
    partial: 'text-amber-600',
  }
  return colors[conclusion] || 'text-muted-foreground'
}
