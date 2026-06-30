// 文化研究院（institute）数据层 —— 真连 @guoxue/server /institute/*
// 定位：精英师资筛选培养体系（付费准入→分享任务考核→押金退费→签约讲师→驿站供给）
// 后端模型为准，原型虚构字段（讲师评分/学员数/圈子统计）已剔除，按真实数据维度呈现。
import { apiGet, apiPost, apiPut } from '@/utils/request'

// ============ 后端对齐枚举 ============
export type InstituteRole = 'INITIATOR' | 'TYPE_A' | 'TYPE_B' | 'PRESIDENT' | 'VICE_PRESIDENT' | 'SECRETARY_GENERAL'
export type LecturerLevel = 'NONE' | 'PREPARATORY' | 'JUNIOR' | 'SENIOR' | 'SIGNED'
export type MemberStatus = 'PENDING' | 'ACTIVE' | 'GRADUATED' | 'SUSPENDED'
export type TaskStatus = 'PENDING' | 'COMPLETED' | 'VERIFIED'
export type TaskType = 'SALON' | 'LIVE' | 'ARTICLE' | 'OFFLINE_EVENT' | 'CIRCLE_MEMBER_COUNT' | 'CIRCLE_DAYS'
export type EventType = 'SALON' | 'LIVE' | 'COURSE'
export type EventStatus = 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED'
export type DividendType = 'MGMT_BONUS' | 'TEACHER_AWARD' | 'OPERATION'

export const MGMT_ROLES: InstituteRole[] = ['PRESIDENT', 'VICE_PRESIDENT', 'SECRETARY_GENERAL']

// ============ 类型 ============
export interface UserBrief { id: string; nickname: string; avatar: string | null }

export interface InstituteIntro {
  id: string
  name: string
  intro: string | null
  logo: string | null
  legalEntity: string | null
  status: string
  createdAt: string
  counts: { members: number; events: number; courses: number }
  management: { id: string; role: InstituteRole; user: UserBrief }[]
}

export interface InstituteMember {
  id: string
  instituteId: string
  userId: string
  role: InstituteRole
  deposit: string | number
  depositRefunded: boolean
  expireAt: string | null
  joinYear: number
  tasksCompleted: number
  tasksRequired: number
  lecturerLevel: LecturerLevel
  status: MemberStatus
  joinedAt: string
  user: UserBrief
}

export interface MemberDetail extends InstituteMember {
  tasks: InstituteTask[]
  /** 签约讲师已入驻的驿站（研究院→驿站供给闭环）*/
  enrolledStations?: { stationId: string; name: string }[]
}

export interface TalentTeacher {
  id: string
  lecturerLevel: LecturerLevel
  user: UserBrief
}

export interface InstituteEvent {
  id: string
  title: string
  type: EventType
  lecturerId: string | null
  description: string | null
  location: string | null
  scheduleAt: string
  maxAttendees: number
  status: EventStatus
  instituteId: string | null
  institute?: { id: string; name: string; logo: string | null }
  lecturer?: UserBrief | null
}

export interface InstituteTask {
  id: string
  memberId: string
  taskType: TaskType
  title: string
  description: string | null
  status: TaskStatus
  completedAt: string | null
  verifiedBy: string | null
  createdAt: string
}

export interface TaskTemplate {
  id: string
  taskType: TaskType
  title: string
  description: string | null
  requiredCount: number
  periodUnit: 'MONTH' | 'QUARTER' | 'YEAR'
  sortOrder: number
  status: string
}

export interface MyDashboard extends InstituteMember {
  institute: { id: string; name: string }
  tasks: InstituteTask[]
  taskProgress: { total: number; completed: number; verified: number }
  depositStatus: { deposited: number; refunded: boolean; canRefund: boolean; refundCondition: string }
  expireStatus: { isExpiring: boolean; isExpired: boolean; expireAt: string | null }
}

export interface InstituteDividend {
  id: string
  userId: string
  type: DividendType
  amount: string | number
  description: string | null
  period: string | null
  createdAt: string
  user?: { id: string; nickname: string }
}

export interface ManageOverview {
  totalMembers: number
  activeMembers: number
  expiringMembers: number
  yearEvents: number
  yearRevenue: string | number
}

export interface FinanceOverview {
  totalRevenue: string | number
  platformShare: number
  instituteShare: number
  totalDividends: number
  remaining: number
  revenues: { id: string; sourceType: string; amount: string | number; description: string | null; createdAt: string }[]
  dividends: InstituteDividend[]
}

export interface ApplyMemberPayload {
  role: string
  joinYear: number
  deposit?: number
}

// ============ 标签 / 色彩映射 ============
export const roleLabel: Record<InstituteRole, string> = {
  PRESIDENT: '院长', VICE_PRESIDENT: '副院长', SECRETARY_GENERAL: '秘书长',
  INITIATOR: '创始成员', TYPE_A: '潜力讲师', TYPE_B: '深造成员',
}
export const roleColor: Record<InstituteRole, { color: string; bg: string }> = {
  PRESIDENT: { color: '#d4a017', bg: 'rgba(212,160,23,0.12)' },
  VICE_PRESIDENT: { color: '#c41e3a', bg: 'rgba(196,30,58,0.1)' },
  SECRETARY_GENERAL: { color: '#2563eb', bg: '#eff6ff' },
  INITIATOR: { color: '#16a34a', bg: '#f0fdf4' },
  TYPE_A: { color: '#9333ea', bg: '#faf5ff' },
  TYPE_B: { color: '#64748b', bg: '#f1f5f9' },
}
export const lecturerLevelLabel: Record<LecturerLevel, string> = {
  NONE: '未评级', PREPARATORY: '储备讲师', JUNIOR: '初级讲师', SENIOR: '高级讲师', SIGNED: '签约讲师',
}
export const lecturerLevelColor: Record<LecturerLevel, { color: string; bg: string }> = {
  NONE: { color: '#9ca3af', bg: '#f3f4f6' },
  PREPARATORY: { color: '#0891b2', bg: '#ecfeff' },
  JUNIOR: { color: '#16a34a', bg: '#f0fdf4' },
  SENIOR: { color: '#2563eb', bg: '#eff6ff' },
  SIGNED: { color: '#c41e3a', bg: 'rgba(196,30,58,0.1)' },
}
export const memberStatusLabel: Record<MemberStatus, string> = {
  PENDING: '待审核', ACTIVE: '在册', GRADUATED: '已结业', SUSPENDED: '已停用',
}
export const memberStatusColor: Record<MemberStatus, { color: string; bg: string }> = {
  PENDING: { color: '#ea580c', bg: '#fff7ed' },
  ACTIVE: { color: '#16a34a', bg: '#f0fdf4' },
  GRADUATED: { color: '#2563eb', bg: '#eff6ff' },
  SUSPENDED: { color: '#6b7280', bg: '#f3f4f6' },
}
export const taskTypeLabel: Record<TaskType, string> = {
  SALON: '线下沙龙', LIVE: '线上直播', ARTICLE: '专栏文章', OFFLINE_EVENT: '大型分享',
  CIRCLE_MEMBER_COUNT: '圈成员规模', CIRCLE_DAYS: '运营天数',
}
export const taskTypeColor: Record<TaskType, { color: string; bg: string }> = {
  SALON: { color: '#9333ea', bg: '#faf5ff' },
  LIVE: { color: '#dc2626', bg: '#fef2f2' },
  ARTICLE: { color: '#16a34a', bg: '#f0fdf4' },
  OFFLINE_EVENT: { color: '#c41e3a', bg: 'rgba(196,30,58,0.1)' },
  CIRCLE_MEMBER_COUNT: { color: '#2563eb', bg: '#eff6ff' },
  CIRCLE_DAYS: { color: '#0891b2', bg: '#ecfeff' },
}
export const taskStatusLabel: Record<TaskStatus, string> = {
  PENDING: '进行中', COMPLETED: '待验证', VERIFIED: '已通过',
}
export const taskStatusColor: Record<TaskStatus, { color: string; bg: string }> = {
  PENDING: { color: '#2563eb', bg: '#eff6ff' },
  COMPLETED: { color: '#ea580c', bg: '#fff7ed' },
  VERIFIED: { color: '#16a34a', bg: '#f0fdf4' },
}
export const eventTypeLabel: Record<EventType, string> = {
  SALON: '线下沙龙', LIVE: '线上直播', COURSE: '课程论坛',
}
export const eventTypeColor: Record<EventType, { color: string; bg: string }> = {
  SALON: { color: '#9333ea', bg: '#faf5ff' },
  LIVE: { color: '#0891b2', bg: '#ecfeff' },
  COURSE: { color: '#c41e3a', bg: 'rgba(196,30,58,0.1)' },
}
export const eventStatusLabel: Record<EventStatus, string> = {
  SCHEDULED: '即将开始', ONGOING: '进行中', COMPLETED: '已结束', CANCELLED: '已取消',
}
export const eventStatusColor: Record<EventStatus, { color: string; bg: string }> = {
  SCHEDULED: { color: '#2563eb', bg: '#eff6ff' },
  ONGOING: { color: '#ea580c', bg: '#fff7ed' },
  COMPLETED: { color: '#6b7280', bg: '#f3f4f6' },
  CANCELLED: { color: '#dc2626', bg: '#fef2f2' },
}
export const dividendTypeLabel: Record<DividendType, string> = {
  MGMT_BONUS: '管理层分红', TEACHER_AWARD: '优秀讲师奖励', OPERATION: '运营补贴',
}

// ============ 工具函数 ============
export const isManagement = (role: InstituteRole) => MGMT_ROLES.includes(role)
export const memberName = (u?: UserBrief | null) => u?.nickname || '研究院成员'
export const num = (v: string | number | null | undefined) => (v == null ? 0 : typeof v === 'string' ? parseFloat(v) || 0 : v)

/** ISO 时间 → YYYY-MM-DD */
export function fmtDate(s?: string | null): string {
  if (!s) return ''
  const d = new Date(s)
  if (isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
/** ISO 时间 → YYYY-MM-DD HH:mm */
export function fmtDateTime(s?: string | null): string {
  if (!s) return ''
  const d = new Date(s)
  if (isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

// ============ 表单静态选项（纯 UI 配置，非数据）============
/** 入会成员类型（对应后端 InstituteRole 非管理层值）*/
export const memberApplyRoles: { value: string; label: string; desc: string }[] = [
  { value: 'INITIATOR', label: '创始成员', desc: '研究院创始期加入，参与体系共建' },
  { value: 'TYPE_A', label: '潜力讲师', desc: '有意申请分享、走向签约讲师方向' },
  { value: 'TYPE_B', label: '深造成员', desc: '以学习深造为主，暂不承担分享任务' },
]
export const applySpecialtyOptions = ['八字命理', '紫微斗数', '风水堪舆', '周易六爻', '奇门遁甲', '姓名学', '梅花易数', '手相面相', '塔罗占卜', '其他']
export const memberApplySteps = ['了解机制', '填写资料', '缴纳会费', '提交完成']
/** 加入须知（来自定位文档：付费准入、分享退费机制）*/
export const memberApplyNotices = [
  { icon: 'wallet', title: '统一会费', desc: '全员缴纳相同年度会费（10000 元/年），交费即可加入，不做事前资格筛选' },
  { icon: 'refresh-cw', title: '分享可退费', desc: '申请分享并完成月/季/年任务，年度结束全额退还会费' },
  { icon: 'graduation-cap', title: '纯学习模式', desc: '不申请分享则不承担任务，会费不退，相当于加入高端学习社群' },
  { icon: 'badge-check', title: '签约通道', desc: '分享表现优秀者，平台主动发起签约邀请，进入驿站讲师库' },
]
/** 分享任务体系说明（来自定位文档）*/
export const shareTaskRules = [
  { period: '月度任务', icon: 'video', label: '每月至少 1 次线上直播分享', proof: '以直播记录为准' },
  { period: '季度任务', icon: 'map-pin', label: '每季度至少 1 次线下沙龙分享', proof: '以驿站签到/活动记录为准' },
  { period: '年度任务', icon: 'mic', label: '每年至少 1 次大型分享', proof: '以研究院活动记录为准' },
]

// ============ API 层 ============
export const instituteApi = {
  /** 研究院介绍（公开）GET /institute/intro */
  async getIntro(): Promise<InstituteIntro> {
    const d = await apiGet<any>('/institute/intro')
    return { ...d, counts: d._count || { members: 0, events: 0, courses: 0 } }
  },

  /** 成员列表 GET /institute/members（拦截器拆包为数组）*/
  getMembers(params?: { role?: string; status?: string; joinYear?: number }): Promise<InstituteMember[]> {
    const q = new URLSearchParams()
    if (params?.role) q.set('role', params.role)
    if (params?.status) q.set('status', params.status)
    if (params?.joinYear) q.set('joinYear', String(params.joinYear))
    q.set('pageSize', '100')
    return apiGet<InstituteMember[]>(`/institute/members?${q.toString()}`)
  },

  /** 成员详情 GET /institute/members/:id */
  getMember(id: string): Promise<MemberDetail> {
    return apiGet<MemberDetail>(`/institute/members/${id}`)
  },

  /** 讲师库（签约/评级成员）GET /institute/talent-pool */
  async getTalentPool(level?: string): Promise<TalentTeacher[]> {
    const q = level ? `?level=${level}&pageSize=100` : '?pageSize=100'
    const d = await apiGet<{ teachers: TalentTeacher[] }>(`/institute/talent-pool${q}`)
    return d?.teachers || []
  },

  /** 活动列表 GET /institute/events */
  async getEvents(params?: { type?: string; upcoming?: boolean }): Promise<InstituteEvent[]> {
    const q = new URLSearchParams()
    if (params?.type) q.set('type', params.type)
    if (params?.upcoming) q.set('upcoming', 'true')
    q.set('pageSize', '100')
    const d = await apiGet<{ events: InstituteEvent[] }>(`/institute/events?${q.toString()}`)
    return d?.events || []
  },

  /** 活动详情 GET /institute/events/:id */
  getEvent(id: string): Promise<InstituteEvent> {
    return apiGet<InstituteEvent>(`/institute/events/${id}`)
  },

  /** 申请加入 POST /institute/members */
  applyMember(data: ApplyMemberPayload): Promise<InstituteMember> {
    return apiPost<InstituteMember>('/institute/members', data)
  },

  /** 我的会籍（含任务进度/押金状态）GET /institute/my，未入会返回 null */
  getMy(): Promise<MyDashboard | null> {
    return apiGet<MyDashboard | null>('/institute/my')
  },

  /** 我的任务 + 平台标准模板 GET /institute/my/tasks */
  getMyTasks(): Promise<{ tasks: InstituteTask[]; templates: TaskTemplate[] }> {
    return apiGet<{ tasks: InstituteTask[]; templates: TaskTemplate[] }>('/institute/my/tasks')
  },

  /** 提交任务完成 POST /institute/my/tasks/:id/complete */
  completeTask(id: string): Promise<InstituteTask> {
    return apiPost<InstituteTask>(`/institute/my/tasks/${id}/complete`)
  },

  /** 申请退还会费/保证金 POST /institute/my/deposit-refund */
  depositRefund(): Promise<{ success: boolean; message: string }> {
    return apiPost<{ success: boolean; message: string }>('/institute/my/deposit-refund')
  },

  /** 我的分红/奖励 GET /institute/my/dividends */
  async getDividends(): Promise<InstituteDividend[]> {
    const d = await apiGet<{ dividends: InstituteDividend[] }>('/institute/my/dividends')
    return d?.dividends || []
  },

  // ───── 管理端（管理层）─────
  /** 管理首页统计 GET /institute/manage/overview */
  getManageOverview(): Promise<ManageOverview> {
    return apiGet<ManageOverview>('/institute/manage/overview')
  },

  /** 财务概览 GET /institute/manage/finance */
  getManageFinance(period?: string): Promise<FinanceOverview> {
    return apiGet<FinanceOverview>(`/institute/manage/finance${period ? `?period=${period}` : ''}`)
  },

  /** 待审核成员 GET /institute/manage/pending-members（数组）*/
  getPendingMembers(): Promise<InstituteMember[]> {
    return apiGet<InstituteMember[]>('/institute/manage/pending-members')
  },

  /** 审核成员 PUT /institute/manage/members/:id/approve */
  approveMember(id: string, status: 'ACTIVE' | 'REJECTED', reason?: string): Promise<InstituteMember> {
    return apiPut<InstituteMember>(`/institute/manage/members/${id}/approve`, { status, reason })
  },

  /** 任命管理层角色 PUT /institute/manage/members/:id/role */
  changeRole(id: string, role: InstituteRole): Promise<InstituteMember> {
    return apiPut<InstituteMember>(`/institute/manage/members/${id}/role`, { role })
  },

  /** 推荐进入讲师库 PUT /institute/manage/members/:id/recommend */
  recommendTalent(id: string, lecturerLevel: LecturerLevel): Promise<InstituteMember> {
    return apiPut<InstituteMember>(`/institute/manage/members/${id}/recommend`, { lecturerLevel })
  },

  /** 发放分红/奖励 POST /institute/manage/dividends */
  createDividend(data: { userId: string; type: DividendType; amount: number; description?: string; period?: string }): Promise<InstituteDividend> {
    return apiPost<InstituteDividend>('/institute/manage/dividends', data)
  },
}
