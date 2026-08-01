// 我的主页数据层（1:1 迁移自原型 app/profile/page.tsx）
import { apiGet, apiPost } from '@/utils/request'

export type UserRole = 'user' | 'circle_owner' | 'teacher' | 'station_owner' | 'streamer' | 'creator' | 'merchant' | 'operator' | 'offline_station' | 'institute'

export interface RoleEntry {
  type: UserRole
  name: string
  id: string | number
}

export interface RecommendItem {
  id: number
  type: 'course' | 'product'
  title: string
  price: number
  originalPrice: number
  tag: string
}

export interface ProfileData {
  name: string
  avatar: string
  bio: string
  isVip: boolean
  vipLevel: string
  vipExpiry: string
  vipDaysLeft: number
  isVerified: boolean
  roles: RoleEntry[]
  messages: { system: number; interaction: number; transaction: number }
  checkIn: { todayChecked: boolean; continuousDays: number; totalPoints: number }
  stats: { following: number | null; followers: number | null; likes: number | null }
  coins: number | null
  coupons: number | null
  points: number | null
  orders: { pending: number | null; shipped: number | null; received: number | null; refund: number | null }
  continueLearning: { id: number; title: string; progress: number; lastLesson: string } | null
}

export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 12) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

// 角色配置：icon=AppIcon名, color=文字/图标色值, bgColor=底色（rgba 还原 /10 透明度）
export const roleConfig: Record<UserRole, { label: string; icon: string; color: string; bgColor: string }> = {
  user: { label: '普通用户', icon: 'users', color: '#999999', bgColor: 'rgba(153,153,153,0.12)' },
  circle_owner: { label: '圈主后台', icon: 'crown', color: '#C9A96E', bgColor: 'rgba(201,169,110,0.1)' },
  teacher: { label: '讲师后台', icon: 'graduation-cap', color: '#4A90D9', bgColor: 'rgba(74,144,217,0.1)' },
  station_owner: { label: '站长后台', icon: 'award', color: '#52C41A', bgColor: 'rgba(82,196,26,0.1)' },
  streamer: { label: '主播中心', icon: 'radio', color: '#C41E3A', bgColor: 'rgba(196,30,58,0.1)' },
  creator: { label: '创作中心', icon: 'video', color: '#722ED1', bgColor: 'rgba(114,46,209,0.1)' },
  merchant: { label: '商家管理台', icon: 'store', color: '#FA8C16', bgColor: 'rgba(250,140,22,0.1)' },
  operator: { label: '运营中心', icon: 'trending-up', color: '#B8860B', bgColor: 'rgba(184,134,11,0.1)' },
  offline_station: { label: '驿站工作台', icon: 'store', color: '#B45309', bgColor: 'rgba(180,83,9,0.1)' },
  institute: { label: '研究院', icon: 'graduation-cap', color: '#0E7490', bgColor: 'rgba(14,116,144,0.1)' },
}

// 🔴 2026-07-14 删除 quickFunctions：它是个**死常量**，导出后没有任何页面 import 它。
//    个人中心真正渲染的是 pages/profile/index.vue 里的 matrixItems —— 入口要加就加那里。
//    （曾经往这个数组里加入口，结果线上毫无变化，白改一轮。）

// 已开通身份点击进入的后台路由
export function roleHref(type: UserRole, id: string | number): string {
  switch (type) {
    case 'circle_owner': return `/pkg-circle/circles/manage?id=${id}`
    case 'teacher': return '/teacher/dashboard'
    case 'streamer': return '/creator/live/console'
    case 'creator': return '/videos/creator'
    case 'station_owner': return '/operator/station-master-panel'
    case 'merchant': return '/pkg-merchant/dashboard/index'
    case 'operator': return '/operator/dashboard'
    case 'offline_station': return '/offline/manage'
    case 'institute': return '/institute/manage'
    default: return '/pages/profile/index'
  }
}

// ============ API 层 ============

// 后端 RoleType → 前端 UserRole（仅映射个人中心可进入的身份后台，其余角色忽略）
const _roleTypeMap: Record<string, UserRole> = {
  CIRCLE_OWNER: 'circle_owner',
  LECTURER: 'teacher',
  STATION_MASTER: 'station_owner',
  MERCHANT: 'merchant', // 商家/官方旗舰店操作员：后端 getProfile 在 ACTIVE 商家身份时注入
  // 后端 /auth/me 原样返回 UserRoleBinding 全部 roleType（auth.service mergedRoles 无过滤），
  // 以下三类此前未映射 → 已开通运营商/驿站/研究院的用户在身份区恒显「申请加入」，现补齐进工作台
  OPERATOR: 'operator',
  STATION_OFFLINE_OWNER: 'offline_station',
  INSTITUTE_MEMBER: 'institute',
}

// 会员等级标签（书院会员·2026-07-03 档位改版）
const _memberLevelLabel: Record<string, string> = {
  MONTHLY: '书院会员·月卡',
  QUARTERLY: '书院会员·季卡',
  YEARLY: '书院会员·年卡',
  LIFETIME: '书院会员·终身',
}

/* —— 后端原始响应类型（容错适配用，字段全 optional，仅声明 adapter 实际访问到的字段） —— */
/** /auth/me 角色条目原始结构（仅 { roleType, bindId }） */
interface RawRole { roleType?: string; bindId?: string | number }
/** 后端 GET /auth/me 原始响应 */
interface RawMe {
  nickname?: string
  avatar?: string
  bio?: string
  memberLevel?: string
  memberExpire?: string | null
  identityVerified?: boolean
  roles?: RawRole[]
}
/** 后端 GET /users/me/checkin/status 原始响应 */
interface RawCheckin {
  todayChecked?: boolean
  continuousDays?: number
  totalPoints?: number
}

interface RawProfileSummary {
  stats?: { following?: number | string; followers?: number | string; likes?: number | string }
  assets?: { coins?: number | string; coupons?: number | string; points?: number | string }
  orders?: { pending?: number | string; shipped?: number | string; received?: number | string; refund?: number | string }
}

function asMetric(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : null
}

/** /auth/me + 签到状态 → 个人中心主页数据 */
function adaptProfile(me: RawMe, checkin: RawCheckin | null, summary: RawProfileSummary | null): ProfileData {
  const level = String(me?.memberLevel ?? 'NONE')
  let vipExpiry = ''
  let vipDaysLeft = 0
  let expired = false
  if (me?.memberExpire) {
    const exp = new Date(me.memberExpire)
    vipExpiry = exp.toISOString().split('T')[0]
    vipDaysLeft = Math.max(0, Math.ceil((exp.getTime() - Date.now()) / 86400000))
    expired = exp.getTime() <= Date.now()
  }
  // 已过期不再展示会员徽章（此前只看 level 忽略到期时间）
  const isVip = level !== 'NONE' && !expired
  // 后端仅返回 { roleType, bindId }，无业务名称 → name 留空诚实降级
  const roles: RoleEntry[] = (me?.roles ?? [])
    .map((r: RawRole): RoleEntry | null => {
      const type = _roleTypeMap[r?.roleType || '']
      return type ? { type, name: '', id: r?.bindId ?? '' } : null
    })
    .filter((r: RoleEntry | null): r is RoleEntry => r !== null)

  return {
    name: me?.nickname || '国学用户',
    avatar: me?.avatar || '',
    bio: me?.bio || '',
    isVip,
    vipLevel: isVip ? (_memberLevelLabel[level] || '会员') : '',
    vipExpiry,
    vipDaysLeft,
    isVerified: !!me?.identityVerified,
    roles,
    // 消息中心暂无聚合端点 → 0（角标 v-if 隐藏）
    messages: { system: 0, interaction: 0, transaction: 0 },
    checkIn: {
      todayChecked: !!checkin?.todayChecked,
      continuousDays: checkin?.continuousDays ?? 0,
      totalPoints: checkin?.totalPoints ?? 0,
    },
    // 聚合请求失败时显示“—”，绝不把未知状态冒充真实 0。
    stats: {
      following: asMetric(summary?.stats?.following),
      followers: asMetric(summary?.stats?.followers),
      likes: asMetric(summary?.stats?.likes),
    },
    coins: asMetric(summary?.assets?.coins),
    coupons: asMetric(summary?.assets?.coupons),
    points: asMetric(summary?.assets?.points),
    orders: {
      pending: asMetric(summary?.orders?.pending),
      shipped: asMetric(summary?.orders?.shipped),
      received: asMetric(summary?.orders?.received),
      refund: asMetric(summary?.orders?.refund),
    },
    continueLearning: null,
  }
}

export const profileApi = {
  /** 获取用户主页数据 —— 资料、签到与真实统计摘要并行聚合 */
  async getProfile(): Promise<ProfileData> {
    const [me, checkin, summary] = await Promise.all([
      apiGet<RawMe>('/auth/me'),
      // 签到状态非主资料，失败不阻断主页加载
      apiGet<RawCheckin>('/users/me/checkin/status').catch(() => null),
      apiGet<RawProfileSummary>('/users/me/summary').catch(() => null),
    ])
    return adaptProfile(me, checkin, summary)
  },

  /** 每日签到 —— POST /users/me/checkin（返回连续天数+本次积分；失败由页面三态处理） */
  async checkIn(): Promise<{ success: true; points: number; consecutiveDays: number }> {
    const res = await apiPost<{ consecutiveDays: number; rewardPoints: number }>('/users/me/checkin')
    return { success: true, points: res.rewardPoints, consecutiveDays: res.consecutiveDays }
  },
}
