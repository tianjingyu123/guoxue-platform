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

// 加入日期取「当前日期前 30 天」，保证退款预览金额始终有意义（演示用）
function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

// Mock：当前用户在某圈子的会员信息（用于退出申请页计算）
export const mockMembership = {
  circleId: '1',
  circleName: '八字命理研习社',
  joinMethod: 'paid' as 'free' | 'paid',
  paidAmount: 365,
  totalDays: 365,
  joinDate: daysAgo(30), // 已加入 30 天
  allowRefund: true, // 圈主是否开启退款
}

// Mock：圈主端待审核 / 已处理的退出申请
export const mockExitRequests: ExitApplication[] = [
  {
    id: 'e1',
    circleId: '1',
    circleName: '八字命理研习社',
    user: { id: 'u1', name: '林清远', avatar: '/static/avatars/u1.png' },
    joinDate: '2024-05-15',
    applyDate: '2024-06-14',
    reason: '最近工作繁忙，暂时没有时间深入学习，希望先退出。',
    breakdown: calcRefund({ paidAmount: 365, joinDate: '2024-05-15', applyDate: '2024-06-14' }),
    stage: 'owner_reviewing',
  },
  {
    id: 'e2',
    circleId: '1',
    circleName: '八字命理研习社',
    user: { id: 'u2', name: '苏晚晴', avatar: '/static/avatars/u2.png' },
    joinDate: '2024-03-01',
    applyDate: '2024-06-10',
    reason: '内容与预期不符。',
    breakdown: calcRefund({ paidAmount: 365, joinDate: '2024-03-01', applyDate: '2024-06-10' }),
    stage: 'owner_reviewing',
  },
  {
    id: 'e3',
    circleId: '1',
    circleName: '八字命理研习社',
    user: { id: 'u3', name: '陈墨白', avatar: '/static/avatars/u3.png' },
    joinDate: '2024-01-10',
    applyDate: '2024-05-20',
    breakdown: calcRefund({ paidAmount: 365, joinDate: '2024-01-10', applyDate: '2024-05-20' }),
    stage: 'refunded',
    ownerReviewedAt: '2024-05-20',
    platformReviewedAt: '2024-05-21',
    refundedAt: '2024-05-23',
  },
  {
    id: 'e4',
    circleId: '1',
    circleName: '八字命理研习社',
    user: { id: 'u4', name: '王浩然', avatar: '/static/avatars/u4.png' },
    joinDate: '2024-06-01',
    applyDate: '2024-06-08',
    reason: '误操作加入。',
    breakdown: calcRefund({ paidAmount: 365, joinDate: '2024-06-01', applyDate: '2024-06-08' }),
    stage: 'rejected',
    rejectBy: 'owner',
    rejectReason: '该成员存在违规发言记录，按圈规不予退款，详情可联系客服申诉。',
    ownerReviewedAt: '2024-06-09',
  },
]

// Mock：当前用户提交的退出申请（用于"我的申请"页）
export const mockMyExitApps: ExitApplication[] = [
  {
    id: 'me1',
    circleId: '2',
    circleName: '紫微斗数高阶班',
    user: { id: 'me', name: '我', avatar: '/static/avatars/me.png' },
    joinDate: '2024-04-20',
    applyDate: '2024-06-13',
    reason: '课程进度跟不上。',
    breakdown: calcRefund({ paidAmount: 299, joinDate: '2024-04-20', applyDate: '2024-06-13', totalDays: 365 }),
    stage: 'platform_reviewing',
    ownerReviewedAt: '2024-06-14',
  },
  {
    id: 'me2',
    circleId: '3',
    circleName: '风水堪舆交流会',
    user: { id: 'me', name: '我', avatar: '/static/avatars/me.png' },
    joinDate: '2024-02-01',
    applyDate: '2024-05-10',
    breakdown: calcRefund({ paidAmount: 199, joinDate: '2024-02-01', applyDate: '2024-05-10' }),
    stage: 'refunded',
    ownerReviewedAt: '2024-05-11',
    platformReviewedAt: '2024-05-12',
    refundedAt: '2024-05-14',
  },
  {
    id: 'me3',
    circleId: '4',
    circleName: '奇门遁甲研修社',
    user: { id: 'me', name: '我', avatar: '/static/avatars/me.png' },
    joinDate: '2024-05-01',
    applyDate: '2024-06-02',
    reason: '个人原因。',
    breakdown: calcRefund({ paidAmount: 488, joinDate: '2024-05-01', applyDate: '2024-06-02' }),
    stage: 'rejected',
    rejectBy: 'platform',
    rejectReason: '退款金额核算存在异议，平台已驳回，请核对加入时间后重新申请或联系客服。',
    ownerReviewedAt: '2024-06-03',
    platformReviewedAt: '2024-06-04',
  },
]
