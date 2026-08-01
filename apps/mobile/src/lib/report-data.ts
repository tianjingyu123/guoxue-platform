/**
 * 举报数据层 —— 2026-07-14 接线新建
 *
 * 后端 audit 模块的举报端点（提交/列表/处理/统计）与 admin 举报处理台早已完成，
 * 但前端从来没有调用过 —— 举报页是假页、且全项目无任何入口。
 * 结果：用户举报不了任何内容，运营的举报池永远是空的（合规风险）。
 */
import { apiPost, apiGet } from '@/utils/request'

/** 与后端 CreateReportDto.targetType 严格一致（report.service.ts） */
export type ReportTargetType =
  | 'POST' | 'COMMENT' | 'CIRCLE' | 'USER'
  | 'COURSE' | 'PRODUCT' | 'ARTICLE' | 'LIVE' | 'VIDEO'

export const REPORT_TARGET_LABEL: Record<ReportTargetType, string> = {
  POST: '动态',
  COMMENT: '评论',
  CIRCLE: '圈子',
  USER: '用户',
  COURSE: '课程',
  PRODUCT: '商品',
  ARTICLE: '文章',
  LIVE: '直播',
  VIDEO: '短视频',
}

export interface SubmitReportPayload {
  targetType: ReportTargetType
  targetId: string
  reason: string
}

export interface ReportRecord {
  id: string
  targetType: string
  targetId: string
  reason: string
  status: string
  result?: string | null
  createdAt: string
  processedAt?: string | null
}

export interface MyReportPage {
  items: ReportRecord[]
  total: number
  page: number
  pageSize: number
}

/** 提交举报的返回：重复举报时后端返回 { message, report }，首次返回 report 本身 */
export interface SubmitReportResult extends Partial<ReportRecord> {
  message?: string
  report?: ReportRecord
}

export const reportApi = {
  /** 提交举报 — POST /audit/reports（同一用户对同一对象重复举报会被后端合并，不会重复入池） */
  submit: (payload: SubmitReportPayload): Promise<SubmitReportResult> =>
    apiPost<SubmitReportResult>('/audit/reports', payload),

  /** 我的举报记录 — 服务端强制按当前登录用户 reporterId 隔离 */
  mine: (page = 1, pageSize = 100): Promise<MyReportPage> =>
    apiGet<MyReportPage>(`/interaction/report/mine?page=${page}&pageSize=${pageSize}`),

  /** 我的举报详情 — 裸 id 不可越权读取他人记录 */
  detail: (id: string): Promise<ReportRecord> =>
    apiGet<ReportRecord>(`/interaction/report/mine/${encodeURIComponent(id)}`),

  /** 查询某内容的举报统计 — GET /audit/reports/stats/:type/:id */
  stats: (targetType: ReportTargetType, targetId: string): Promise<{ count?: number }> =>
    apiGet<{ count?: number }>(`/audit/reports/stats/${targetType}/${targetId}`),
}

/**
 * 跳举报页的统一入口。各内容页只管调这个，别自己拼 url —— 参数拼错就又变成一条死链。
 * @param title 被举报内容的摘要（可选，仅用于页面上展示"你在举报什么"）
 */
export function gotoReport(
  targetType: ReportTargetType,
  targetId: string,
  title?: string,
  author?: string,
): void {
  const q = [
    `targetType=${targetType}`,
    `targetId=${encodeURIComponent(targetId)}`,
    title ? `title=${encodeURIComponent(title.slice(0, 40))}` : '',
    author ? `author=${encodeURIComponent(author)}` : '',
  ].filter(Boolean).join('&')
  uni.navigateTo({ url: `/pkg-report/index/index?${q}` })
}
