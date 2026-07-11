// 我的主页数据层（1:1 迁移自原型 app/profile/page.tsx）
import { apiGet, apiPost } from '@/utils/request'

export type UserRole = 'user' | 'circle_owner' | 'teacher' | 'station_owner' | 'streamer' | 'creator' | 'merchant'

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
  stats: { following: number; followers: number; likes: number }
  coins: number
  coupons: number
  points: number
  orders: { pending: number; shipped: number; received: number; refund: number }
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
}

// 常用功能入口
export const quickFunctions: { icon: string; label: string; href: string; color: string }[] = [
  { icon: 'compass', label: '排盘记录', href: '/paipan', color: '#C41E3A' },
  { icon: 'book-open', label: '我的课程', href: '/learning', color: '#4A90D9' },
  { icon: 'award', label: '讲师工作台', href: '/pkg-creator/teacher-dashboard/index', color: '#C41E3A' },
  { icon: 'shield-check', label: '我的资质', href: '/pkg-creator/my-qualifications/index', color: '#16A34A' },
  { icon: 'users', label: '我的圈子', href: '/pkg-circle/my-circles/index', color: '#722ED1' },
  { icon: 'radio', label: '我的直播', href: '/pkg-live/manage/index', color: '#C41E3A' },
  { icon: 'sticky-note', label: '我的笔记', href: '/mine/notes', color: '#C9A96E' }, // 统一页(古籍+电子书聚合)·原/ebook/notes只有电子书
  { icon: 'heart', label: '我的收藏', href: '/favorites', color: '#C41E3A' },
  { icon: 'clipboard-list', label: '我的申请', href: '/mine/applications', color: '#FA8C16' },
  { icon: 'history', label: '浏览历史', href: '/history', color: '#64748B' },
  { icon: 'help-circle', label: '帮助中心', href: '/help', color: '#999999' },
]

// 全部可开通角色
export const allRoleTypes: { type: UserRole; applyHref: string }[] = [
  { type: 'circle_owner', applyHref: '/pkg-circle/circles/create' },
  { type: 'teacher', applyHref: '/institute/apply' },
  { type: 'station_owner', applyHref: '/join/station' },
  { type: 'streamer', applyHref: '/creator/live/console' },
]

// 已开通身份点击进入的后台路由
export function roleHref(type: UserRole, id: string | number): string {
  switch (type) {
    case 'circle_owner': return `/pkg-circle/circles/manage?id=${id}`
    case 'teacher': return '/teacher/dashboard'
    case 'streamer': return '/creator/live/console'
    case 'creator': return '/videos/creator'
    case 'station_owner': return '/operator/station-master-panel'
    case 'merchant': return '/pkg-merchant/dashboard/index'
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

/** /auth/me + 签到状态 → 个人中心主页数据 */
function adaptProfile(me: RawMe, checkin: RawCheckin | null): ProfileData {
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
    // 关注/资产/订单暂无聚合端点 → 0（真实默认值，非伪造）
    stats: { following: 0, followers: 0, likes: 0 },
    coins: 0,
    coupons: 0,
    points: 0,
    orders: { pending: 0, shipped: 0, received: 0, refund: 0 },
    continueLearning: null,
  }
}

export const profileApi = {
  /** 获取用户主页数据 —— GET /auth/me + GET /users/me/checkin/status 并行聚合 */
  async getProfile(): Promise<ProfileData> {
    const [me, checkin] = await Promise.all([
      apiGet<RawMe>('/auth/me'),
      // 签到状态非主资料，失败不阻断主页加载
      apiGet<RawCheckin>('/users/me/checkin/status').catch(() => null),
    ])
    return adaptProfile(me, checkin)
  },

  /** 每日签到 —— POST /users/me/checkin（返回连续天数+本次积分；失败由页面三态处理） */
  async checkIn(): Promise<{ success: true; points: number; consecutiveDays: number }> {
    const res = await apiPost<{ consecutiveDays: number; rewardPoints: number }>('/users/me/checkin')
    return { success: true, points: res.rewardPoints, consecutiveDays: res.consecutiveDays }
  },
}
