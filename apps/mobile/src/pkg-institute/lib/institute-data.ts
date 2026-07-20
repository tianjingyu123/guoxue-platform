// 文化研究院（institute）数据层 —— 真连 @guoxue/server /institute/*
// 定位：精英师资筛选培养体系（资格申请→分享任务考核→签约讲师→驿站供给；线上会费尚未开放）
// 后端模型为准，原型虚构字段（讲师评分/学员数/圈子统计）已剔除，按真实数据维度呈现。
import { apiGet, apiGetPaged, apiPost, apiPut } from '@/utils/request'

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
  seatType: SeatType
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
  pendingDividends: number
  canRequestDividend: boolean
  remaining: number
  revenues: { id: string; sourceType: string; amount: string | number; description: string | null; createdAt: string }[]
  dividends: InstituteDividend[]
}

export interface ApplyMemberPayload {
  role: string
  joinYear: number
  /** 双轨席位（T9-P1）：LECTURE 讲席（分享考核）/ STUDY 研修席（专注研学） */
  seatType?: SeatType
}

// ───── 研究院制度落地（T9-P1·双轨席位+积分考核·设计 §3.1-3.3）─────
export type SeatType = 'LECTURE' | 'STUDY'
/** 考核四档（V5 真源）：全返 / 半返 / 保籍 / 转席风险 */
export type AssessmentTier = 'FULL_REFUND' | 'HALF_REFUND' | 'KEEP' | 'AT_RISK'

/** 准入门槛单项自检结果 */
export interface EligibilityCheck {
  key: string
  label: string
  pass: boolean
  current: number
  required: number
}
export interface EligibilityResult {
  eligible: boolean
  checks: EligibilityCheck[]
}

/** 线下分享指标单项（三选一达标）*/
export interface OfflineIndicatorItem { type: string; count: number; required: number }
/** 积分流水单条 */
export interface AssessmentPointItem { pointType: string; points: number; remark: string | null; createdAt: string }
/** 我的年度考核（GET /institute/my/assessment）*/
export interface MyAssessment {
  year: number
  points: number
  /** 四季度积分 [q1,q2,q3,q4]·每季 15 分最低线 */
  quarterPoints: number[]
  offline: { met: boolean; detail: OfflineIndicatorItem[] }
  tier: AssessmentTier
  pointItems: AssessmentPointItem[]
}

export const seatTypeLabel: Record<SeatType, string> = {
  LECTURE: '讲席（分享席）', STUDY: '研修席（学习席）',
}
/** 年度成长档位徽章：后端枚举名保留兼容，用户侧不承诺未上线的资金能力 */
export const assessmentTierMeta: Record<AssessmentTier, { label: string; color: string; bg: string; icon: string }> = {
  FULL_REFUND: { label: '年度卓越', color: '#b8860b', bg: 'rgba(212,160,23,0.14)', icon: 'trophy' },
  HALF_REFUND: { label: '积分达标', color: '#64748b', bg: '#f1f5f9', icon: 'medal' },
  KEEP: { label: '持续成长', color: '#6b7280', bg: '#f3f4f6', icon: 'shield-check' },
  AT_RISK: { label: '有转席风险', color: '#dc2626', bg: '#fef2f2', icon: 'alert-triangle' },
}
/** 积分类型中文标签（§3.3 积分表·未知类型回退原文）*/
export const pointTypeLabel: Record<string, string> = {
  STATION_OFFLINE: '驿站线下授课', STATION_COURSE: '驿站线下授课',
  SALON: '院内沙龙主讲', LIVE: '直播公开课',
  ARTICLE: '深度文章/案例', OFFLINE_EVENT: '大型线下分享',
  MENTOR: '带教研修成员', MENTORING: '带教研修成员',
  QA: '院内答疑', QUESTION_ANSWER: '院内答疑',
}
export const pointTypeText = (t: string) => pointTypeLabel[t] || t
/** 线下指标中文标签（三选一·未知类型回退原文）*/
export const offlineIndicatorLabel: Record<string, string> = {
  FLAGSHIP_STATION: '旗舰驿站线下分享', FLAGSHIP: '旗舰驿站线下分享',
  MONTHLY_SALON: '平台月度沙龙主讲', SALON: '平台月度沙龙主讲',
  QUARTERLY_EVENT: '季度高规格分享会主讲', QUARTERLY: '季度高规格分享会主讲',
}
export const offlineIndicatorText = (t: string) => offlineIndicatorLabel[t] || t

/** 席位对比卡文案（§3.1 双轨席位制）*/
export const seatOptions: { value: SeatType; name: string; tagline: string; accent: string; accentBg: string; points: { icon: string; text: string }[] }[] = [
  {
    value: 'LECTURE',
    name: '讲席',
    tagline: '分享席 · 以讲促学，成果沉淀',
    accent: '#c41e3a',
    accentBg: 'rgba(196,30,58,0.06)',
    points: [
      { icon: 'mic', text: '义务：年度分享积分考核（100 分达标线 · 季度 15 分最低线）' },
      { icon: 'trending-up', text: '成长：积分与线下分享共同形成年度成长档位' },
      { icon: 'graduation-cap', text: '权益：讲师五级培养通道 → 签约进驿站授课 + 影响力榜单 + 带教资格' },
      { icon: 'refresh-cw', text: '考核不达标自动转研修席（籍在不驱逐）' },
    ],
  },
  {
    value: 'STUDY',
    name: '研修席',
    tagline: '学习席 · 专注研学，不担考核',
    accent: '#2563eb',
    accentBg: 'rgba(37,99,235,0.05)',
    points: [
      { icon: 'book-open', text: '义务：无分享考核，专注研学' },
      { icon: 'compass', text: '成长：不参与分享考核，专注研学与圈层交流' },
      { icon: 'users', text: '权益：全部分享内容 + 活动 + 圈层社交网络' },
      { icon: 'star', text: '优先咨询/约课权，后续可申请转讲席' },
    ],
  },
]

/** 门槛未达引导文案（按 key/label 关键词匹配·未命中回退通用文案）*/
const eligibilityGuidanceRules: { re: RegExp; text: string }[] = [
  { re: /owner|guest|role|圈主|嘉宾|身份/i, text: '先成为一个圈子的圈主或分享嘉宾——研究院的门槛正是圈子经营的晋升目标' },
  { re: /member|size|scale|成员|规模/i, text: '先把圈子做起来——这正是研究院的意义' },
  { re: /content|article|work|quality|作品|文章|质量/i, text: '持续产出优质内容，让作品替你说话' },
  { re: /activ|interact|活跃|互动|发帖/i, text: '近 90 天保持圈子发帖与互动，活跃是影响力的地基' },
  { re: /revenue|income|earn|创收|收入|经营/i, text: '圈子/课程创收是市场认可的证明，先深耕经营' },
  { re: /recommend|推荐/i, text: '找一位在院成员为你推荐（每人每年限荐 2 名）' },
  { re: /real|verif|实名/i, text: '先完成实名认证' },
  { re: /day|regist|注册/i, text: '平台注册需满 90 天，先沉淀一段时间' },
]
export function eligibilityGuidance(check: Pick<EligibilityCheck, 'key' | 'label'>): string {
  for (const r of eligibilityGuidanceRules) {
    if (r.re.test(check.key) || r.re.test(check.label)) return r.text
  }
  return '继续积累，达到门槛后即可申请'
}

// ───── 讲师影响力榜单（T9-P0a·公开·四维透明计分，不含收入）─────
export interface RankingDims {
  /** 年度任务完成（权重 40%）0-100 */
  tasks: number
  /** 授课活动场次（权重 30%）0-100 */
  events: number
  /** 驿站覆盖数（权重 20%）0-100 */
  stations: number
  /** 资历年限（权重 10%·5 年封顶）0-100 */
  seniority: number
}
export interface RankingItem {
  rank: number
  userId: string
  nickname: string
  avatar: string | null
  lecturerLevel: LecturerLevel
  /** 加权总分 0-100（1 位小数） */
  score: number
  dims: RankingDims
  tasksCompleted: number
  eventCount: number
  stationCount: number
  joinYear: number
}
export interface RankingsResponse {
  items: RankingItem[]
  updatedAt: string
}

// ───── 大师讲堂付费知识库（T9-P0b·国学币购买·已购永久可读）─────
export type InstituteContentType = 'ARTICLE' | 'VIDEO' | 'DOCUMENT'

export interface InstituteContentItem {
  id: string
  contentType: InstituteContentType
  title: string
  /** 国学币价格（整数币·0=免费） */
  price: number
  /** 未购可见的试读摘要（ARTICLE 截正文前 100 字；VIDEO/DOCUMENT 仅简介） */
  summary: string
  purchaseCount: number
  createdAt: string
  /** 登录时的已购标记（免费内容恒为 true） */
  purchased: boolean
}

export interface InstituteContentDetail extends InstituteContentItem {
  /** 已购/免费=全量正文（VIDEO/DOCUMENT 为资源 URL）；未购 ARTICLE=前 200 字试读，未购 VIDEO/DOCUMENT 为空串 */
  content: string
  author: UserBrief | null
}

export const contentTypeLabel: Record<InstituteContentType, string> = {
  ARTICLE: '文章', VIDEO: '视频', DOCUMENT: '文档',
}
export const contentTypeColor: Record<InstituteContentType, { color: string; bg: string }> = {
  ARTICLE: { color: '#16a34a', bg: '#f0fdf4' },
  VIDEO: { color: '#c41e3a', bg: 'rgba(196,30,58,0.1)' },
  DOCUMENT: { color: '#2563eb', bg: '#eff6ff' },
}
export const contentTypeIcon: Record<InstituteContentType, string> = {
  ARTICLE: 'file-text', VIDEO: 'video', DOCUMENT: 'file',
}

// ───── 大师讲座知识库（研-P1·分享回放沉淀为付费课程·复用课程系统）─────
/** 讲座条目 = Course(courseOrigin=INSTITUTE_LECTURE)·点击跳课程详情页复用播放/购买全能力 */
export interface LectureItem {
  id: string
  title: string
  cover: string | null
  intro: string | null
  /** 定价（元·0=免费·定价模式待拍板） */
  price: number
  studentCount: number
  createdAt: string
  /** 讲师徽章信息：研究院讲师等级 + 线上认证头衔（无则诚实降级 NONE/null） */
  lecturer: {
    id: string
    nickname: string
    avatar: string | null
    lecturerLevel: LecturerLevel
    verifiedTitle: string | null
  }
}

// ───── 私董会小组（T9-P1·私密子圈承载·设计 §3.6.5）─────
export interface BoardGroup {
  id: string
  name: string
  /** 当期议题（轮流出题机制的当前课题）*/
  topic: string | null
  /** 承载小组的私密圈 id：入组申请/日常交互均走圈子（needApproval 由组长审批）*/
  circleId: string
  leader: { userId: string; nickname: string; avatar: string | null }
  memberCount: number
  memberLimit: number
  /** 当前登录用户是否已在组内 */
  joined: boolean
  /** ACTIVE 运行中 / DISBANDED 已解散 */
  status: string
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
export const memberApplySteps = ['了解机制', '选择席位', '确认身份', '提交申请', '等待审核']
/** 加入须知（当前真实申请流程）*/
export const memberApplyNotices = [
  { icon: 'badge-check', title: '资格准入', desc: '平台按所选席位核对真实数据，满足条件后才可提交申请' },
  { icon: 'users', title: '双轨席位', desc: '讲席承担分享考核，研修席专注研学与圈层交流' },
  { icon: 'trending-up', title: '成长记录', desc: '任务、活动与内容贡献进入年度成长记录与讲师观察体系' },
  { icon: 'shield-check', title: '审核生效', desc: '管理层审核通过后会籍生效；当前申请不创建订单、不扣款' },
]
/** 分享任务体系说明（来自定位文档）*/
export const shareTaskRules = [
  { period: '月度任务', icon: 'video', label: '每月至少 1 次线上直播分享', proof: '以直播记录为准' },
  { period: '季度任务', icon: 'map-pin', label: '每季度至少 1 次线下沙龙分享', proof: '以驿站签到/活动记录为准' },
  { period: '年度任务', icon: 'mic', label: '每年至少 1 次大型分享', proof: '以研究院活动记录为准' },
]

// ============ 后端原始响应类型（容错适配用，不 export，仅声明 adapter 实际访问到的字段）============
/** 后端 /institute/intro 原始响应：与 InstituteIntro 同构，仅 counts 由 _count 提供 */
interface RawInstituteIntro extends Omit<InstituteIntro, 'counts'> {
  _count?: { members: number; events: number; courses: number }
}

// ============ API 层 ============
export const instituteApi = {
  /** 研究院介绍（公开）GET /institute/intro */
  async getIntro(): Promise<InstituteIntro> {
    const d = await apiGet<RawInstituteIntro>('/institute/intro')
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

  /** 讲师影响力榜单（公开·默认当年）GET /institute/rankings?year= */
  getRankings(year?: number): Promise<RankingsResponse> {
    return apiGet<RankingsResponse>(`/institute/rankings${year ? `?year=${year}` : ''}`)
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

  /** 申请加入 POST /institute/members（body 含 seatType·门槛不合格 400 message 带未通过项）*/
  applyMember(data: ApplyMemberPayload): Promise<InstituteMember> {
    return apiPost<InstituteMember>('/institute/members', data)
  },

  /** 席位准入门槛自检（T9-P1·五维/三维逐项）GET /institute/eligibility?seatType= */
  checkEligibility(seatType: SeatType): Promise<EligibilityResult> {
    return apiGet<EligibilityResult>(`/institute/eligibility?seatType=${seatType}`)
  },

  /** 我的年度考核（T9-P1·积分+四季度+线下指标+档位预测+流水）GET /institute/my/assessment */
  getMyAssessment(): Promise<MyAssessment> {
    return apiGet<MyAssessment>('/institute/my/assessment')
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

  /** 发起分红/奖励分配审批（不代表已到账） POST /institute/manage/dividends */
  createDividend(data: { userId: string; type: DividendType; amount: number; description?: string; period?: string }): Promise<{ submitted: boolean; approvalId: string; status: string; message: string }> {
    return apiPost<{ submitted: boolean; approvalId: string; status: string; message: string }>('/institute/manage/dividends', data)
  },

  // ───── 私董会小组（T9-P1·私密子圈承载）─────
  /** 小组列表（院内成员可见·403=非院内成员）GET /institute/board-groups */
  async getBoardGroups(): Promise<BoardGroup[]> {
    const d = await apiGet<{ items: BoardGroup[] }>('/institute/board-groups')
    return d?.items || []
  },

  /** 创建小组（管理层·建组=建私密圈·leaderId 须为讲席成员）POST /institute/manage/board-groups */
  createBoardGroup(data: { name: string; topic?: string; leaderId: string; memberLimit?: number }): Promise<{ id: string; circleId: string }> {
    return apiPost<{ id: string; circleId: string }>('/institute/manage/board-groups', data)
  },

  /** 解散小组（管理层）PUT /institute/manage/board-groups/:id/disband */
  disbandBoardGroup(id: string): Promise<{ success: boolean }> {
    return apiPut<{ success: boolean }>(`/institute/manage/board-groups/${encodeURIComponent(id)}/disband`)
  },

  // ───── 大师讲堂付费知识库（T9-P0b）─────
  /** 内容列表（公开·仅 PUBLISHED·登录附带已购标）GET /institute/contents */
  getContents(params: { type?: InstituteContentType; page?: number; pageSize?: number }): Promise<{ items: InstituteContentItem[]; total: number }> {
    const q = new URLSearchParams()
    if (params.type) q.set('type', params.type)
    q.set('page', String(params.page ?? 1))
    q.set('pageSize', String(params.pageSize ?? 20))
    return apiGetPaged<InstituteContentItem>(`/institute/contents?${q.toString()}`)
  },

  /** 内容详情（未购试读/已购全量）GET /institute/contents/:id */
  getContent(id: string): Promise<InstituteContentDetail> {
    return apiGet<InstituteContentDetail>(`/institute/contents/${encodeURIComponent(id)}`)
  },

  /** 购买内容（国学币扣减·已购永久可读）POST /institute/contents/:id/purchase */
  purchaseContent(id: string): Promise<{ purchased: boolean; price: number; purchaseId: string }> {
    return apiPost<{ purchased: boolean; price: number; purchaseId: string }>(`/institute/contents/${encodeURIComponent(id)}/purchase`)
  },

  // ───── 大师讲座知识库（研-P1·回放沉淀·复用课程系统）─────
  /** 讲座列表（公开·仅过审·附讲师徽章）GET /institute/lectures */
  getLectures(params: { page?: number; pageSize?: number }): Promise<{ items: LectureItem[]; total: number }> {
    const q = new URLSearchParams()
    q.set('page', String(params.page ?? 1))
    q.set('pageSize', String(params.pageSize ?? 20))
    return apiGetPaged<LectureItem>(`/institute/lectures?${q.toString()}`)
  },
}
