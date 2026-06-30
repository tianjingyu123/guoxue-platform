// 圈子退出 / 退款规则数据模型与计算逻辑（从原型 lib/circle-exit.ts 1:1 迁移）
// 规则：付费加入的成员可申请退出，按实际使用天数扣费，剩余金额退还。
// 退出需圈主审核 + 平台审核，双向通过后完成退款。

// 退出申请的审核阶段
export type ExitStage =
  | 'owner_reviewing' // 圈主审核中
  | 'platform_reviewing' // 圈主已通过，平台审核中
  | 'refunding' // 平台已通过，退款处理中
  | 'refunded' // 退款已到账（已退出）
  | 'rejected' // 被驳回（圈主或平台任一方拒绝）

// 驳回方
export type RejectBy = 'owner' | 'platform'

export interface ExitRefundBreakdown {
  paidAmount: number // 已付费用
  usedDays: number // 已使用天数
  totalDays: number // 总服务天数（年费 = 365）
  dailyRate: number // 每天费用
  deduction: number // 已扣除费用（dailyRate * usedDays）
  refundAmount: number // 应退金额
}

export interface ExitApplication {
  id: string
  circleId: string
  circleName: string
  circleAvatar?: string
  user: {
    id: string
    name: string
    avatar?: string
  }
  joinDate: string // 加入日期
  applyDate: string // 退出申请日期
  reason?: string // 申请原因（选填）
  breakdown: ExitRefundBreakdown
  stage: ExitStage
  rejectBy?: RejectBy
  rejectReason?: string
  // 审核流水时间
  ownerReviewedAt?: string
  platformReviewedAt?: string
  refundedAt?: string
}

// 计算两个日期之间的天数差
export function daysBetween(start: string, end: string): number {
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  const diff = Math.floor((e - s) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
}

// 退款金额计算：应退 = 已付 - (每天费用 × 已使用天数)
export function calcRefund(params: {
  paidAmount: number
  joinDate: string
  applyDate: string
  totalDays?: number // 默认年费 365 天
}): ExitRefundBreakdown {
  const { paidAmount, joinDate, applyDate } = params
  const totalDays = params.totalDays ?? 365
  const usedDays = Math.min(daysBetween(joinDate, applyDate), totalDays)
  const dailyRate = Math.round((paidAmount / totalDays) * 100) / 100
  const deduction = Math.round(dailyRate * usedDays * 100) / 100
  const refundAmount = Math.max(0, Math.round((paidAmount - deduction) * 100) / 100)
  return { paidAmount, usedDays, totalDays, dailyRate, deduction, refundAmount }
}

// 审核阶段展示文案 / 颜色
export function getExitStageDisplay(stage: ExitStage): {
  label: string
  tone: 'pending' | 'approved' | 'rejected'
} {
  switch (stage) {
    case 'owner_reviewing':
      return { label: '圈主审核中', tone: 'pending' }
    case 'platform_reviewing':
      return { label: '平台审核中', tone: 'pending' }
    case 'refunding':
      return { label: '退款处理中', tone: 'pending' }
    case 'refunded':
      return { label: '已退出', tone: 'approved' }
    case 'rejected':
      return { label: '申请被驳回', tone: 'rejected' }
  }
}

// 双向审核流程节点（用于进度条展示）
export const EXIT_FLOW_STEPS = [
  { key: 'submit', label: '提交申请' },
  { key: 'owner', label: '圈主审核' },
  { key: 'platform', label: '平台审核' },
  { key: 'refund', label: '退款到账' },
] as const

// 当前阶段对应的已完成节点索引（用于进度条高亮）
export function getCompletedStepIndex(stage: ExitStage): number {
  switch (stage) {
    case 'owner_reviewing':
      return 0 // 已提交，圈主审核中
    case 'platform_reviewing':
      return 1 // 圈主已过，平台审核中
    case 'refunding':
      return 2 // 平台已过，退款中
    case 'refunded':
      return 3 // 全部完成
    case 'rejected':
      return -1 // 流程中断
  }
}

// ============ API 层 ============
// 真实后端：CircleRefundController（@Controller("circle-refund")）
// 后端用 ownerStatus/adminStatus/refundStatus 三个状态字段表达审核流，前端合成单一 stage。
import { apiGet, apiPost } from '@/utils/request'

/** 退款预览信息（真实来源：GET /circle-refund/preview/:circleId，按使用天数核算） */
export interface MembershipRefundInfo {
  circleId: string
  paidAmount: number // 已付费用
  dailyCost: number // 每天费用
  usedDays: number // 已使用天数
  refundBase: number // 应退基数（扣使用天数后）
  feeRate: number // 手续费率
  feeAmount: number // 手续费金额
  actualRefund: number // 实退金额（扣手续费后）
}

function num(v: any): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function ymd(v: any): string {
  if (!v) return ''
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

// 后端三状态字段 → 前端单一 stage
function deriveStage(row: any): ExitStage {
  if (row.refundStatus === 'refunded') return 'refunded'
  if (row.refundStatus === 'failed') return 'rejected'
  if (row.refundStatus === 'refunding' || row.adminStatus === 'approved') return 'refunding'
  if (row.ownerStatus === 'approved') return 'platform_reviewing'
  return 'owner_reviewing'
}

// 后端 CircleRefundRequest 行 → 前端 ExitApplication
// currentUser=true 时为「我的申请」（后端不返回昵称/头像，固定显示「我」）
function mapRefundRow(row: any, currentUser: boolean): ExitApplication {
  const paidAmount = num(row.paidAmount)
  const refundBase = num(row.refundBase)
  const usedDays = num(row.usedDays)
  const dailyRate = num(row.dailyCost)
  const totalDays = dailyRate > 0 ? Math.round(paidAmount / dailyRate) : 365
  const applyDate = ymd(row.createdAt)
  // 后端未存加入日期，按「申请日 − 已用天数」反推（usedDays 即申请时距加入的天数）
  let joinDate = ''
  if (applyDate) {
    const d = new Date(applyDate)
    d.setDate(d.getDate() - usedDays)
    joinDate = d.toISOString().slice(0, 10)
  }
  const rejectBy: RejectBy | undefined =
    row.ownerStatus === 'rejected' ? 'owner' : row.adminStatus === 'rejected' ? 'platform' : undefined
  return {
    id: row.id,
    circleId: row.circleId,
    circleName: row.circleName ?? '',
    user: {
      id: row.userId,
      name: currentUser ? '我' : row.userNickname || '圈友',
      avatar: row.userAvatar || undefined,
    },
    joinDate,
    applyDate,
    reason: row.reason || undefined,
    breakdown: {
      paidAmount,
      usedDays,
      totalDays,
      dailyRate,
      deduction: Math.round((paidAmount - refundBase) * 100) / 100,
      refundAmount: num(row.actualRefund),
    },
    stage: deriveStage(row),
    rejectBy,
    rejectReason: row.ownerRejectReason || row.adminRejectReason || undefined,
    ownerReviewedAt: ymd(row.ownerReviewedAt) || undefined,
    platformReviewedAt: ymd(row.adminReviewedAt) || undefined,
    refundedAt: ymd(row.refundedAt) || undefined,
  }
}

export const exitApi = {
  /**
   * 退款金额预览（退出申请页计算用） — GET /circle-refund/preview/:circleId
   * 注：后端无 /circles/:id/membership 端点，真实来源为退款预览接口（按使用天数核算）。
   */
  async getMembership(circleId: string): Promise<MembershipRefundInfo> {
    const data = await apiGet<any>(`/circle-refund/preview/${circleId}`)
    return {
      circleId,
      paidAmount: num(data.paidAmount),
      dailyCost: num(data.dailyCost),
      usedDays: num(data.usedDays),
      refundBase: num(data.refundBase),
      feeRate: num(data.feeRate),
      feeAmount: num(data.feeAmount),
      actualRefund: num(data.actualRefund),
    }
  },

  /**
   * 圈主待审退出申请列表 — GET /circle-refund/owner-pending
   * 后端按登录圈主（JWT）返回其名下所有圈子的「待圈主审核」申请；circleId 可选，传入则前端按圈过滤。
   * 注：后端无圈主侧「已处理历史」端点，已处理记录依赖本次会话内审核后的乐观更新。
   */
  async getExitRequests(circleId?: string): Promise<ExitApplication[]> {
    const rows = await apiGet<any[]>('/circle-refund/owner-pending')
    const list = (Array.isArray(rows) ? rows : []).map((r) => mapRefundRow(r, false))
    return circleId ? list.filter((r) => r.circleId === circleId) : list
  },

  /** 我的退出申请 — GET /circle-refund/my */
  async getMyExitApps(): Promise<ExitApplication[]> {
    const rows = await apiGet<any[]>('/circle-refund/my')
    return (Array.isArray(rows) ? rows : []).map((r) => mapRefundRow(r, true))
  },

  /** 圈主审核退出申请（同意/驳回） — POST /circle-refund/:id/owner-review */
  async ownerReview(id: string, approve: boolean, rejectReason?: string): Promise<void> {
    await apiPost(`/circle-refund/${id}/owner-review`, { approve, rejectReason })
  },
}
