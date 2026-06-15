// 我的主页数据层（1:1 迁移自原型 app/profile/page.tsx）
import { apiGet, useMock } from '@/utils/request'
import { getToken } from '@/utils/storage'
export type UserRole = 'user' | 'circle_owner' | 'teacher' | 'station_owner' | 'streamer' | 'creator'

export interface RoleEntry {
  type: UserRole
  name: string
  id: number
}

export const userData = {
  name: '张三丰',
  avatar: '',
  bio: '易学爱好者 | 八字研习中',
  isVip: true,
  vipLevel: '黄金会员',
  vipExpiry: '2025-12-31',
  vipDaysLeft: 234,
  isVerified: true,
  roles: [
    { type: 'circle_owner' as UserRole, name: '张氏命理研习社', id: 1 },
    { type: 'teacher' as UserRole, name: '八字入门精讲', id: 1 },
    { type: 'streamer' as UserRole, name: '直播间', id: 1 },
  ] as RoleEntry[],
  messages: { system: 2, interaction: 5, transaction: 1 },
  checkIn: { todayChecked: false, continuousDays: 7, totalPoints: 350 },
  stats: { following: 128, followers: 1024, likes: 3680 },
  coins: 520,
  coupons: 3,
  points: 1280,
  orders: { pending: 2, shipped: 1, received: 3, refund: 0 },
  continueLearning: {
    id: 1,
    title: '八字入门实战课',
    progress: 45,
    lastLesson: '第三章：天干地支详解',
  },
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
}

// 常用功能入口
export const quickFunctions: { icon: string; label: string; href: string; color: string }[] = [
  { icon: 'compass', label: '排盘记录', href: '/paipan', color: '#C41E3A' },
  { icon: 'book-open', label: '我的课程', href: '/learning', color: '#4A90D9' },
  { icon: 'users', label: '我的圈子', href: '/pkg-circle/circles/mine', color: '#722ED1' },
  { icon: 'sticky-note', label: '我的笔记', href: '/ebook/notes', color: '#C9A96E' },
  { icon: 'heart', label: '我的收藏', href: '/favorites', color: '#C41E3A' },
  { icon: 'file-text', label: '我的电子书', href: '/downloads', color: '#52C41A' },
  { icon: 'clipboard-list', label: '我的申请', href: '/mine/applications', color: '#FA8C16' },
  { icon: 'history', label: '浏览历史', href: '/history', color: '#64748B' },
  { icon: 'help-circle', label: '帮助中心', href: '/help', color: '#999999' },
]

// 猜你喜欢
export const recommendations: { id: number; type: 'course' | 'product'; title: string; price: number; originalPrice: number; tag: string }[] = [
  { id: 1, type: 'course', title: '紫微斗数入门精讲', price: 199, originalPrice: 399, tag: '热门' },
  { id: 2, type: 'product', title: '专业罗盘套装', price: 298, originalPrice: 598, tag: '特惠' },
  { id: 3, type: 'course', title: '六爻预测实战班', price: 299, originalPrice: 499, tag: '新课' },
  { id: 4, type: 'product', title: '渊海子平精装版', price: 68, originalPrice: 128, tag: '' },
]

// 全部可开通角色
export const allRoleTypes: { type: UserRole; applyHref: string }[] = [
  { type: 'circle_owner', applyHref: '/pkg-circle/circles/create' },
  { type: 'teacher', applyHref: '/institute/apply' },
  { type: 'station_owner', applyHref: '/join/station' },
  { type: 'streamer', applyHref: '/creator/live/console' },
]

// 已开通身份点击进入的后台路由
export function roleHref(type: UserRole, id: number): string {
  switch (type) {
    case 'circle_owner': return `/pkg-circle/circles/manage?id=${id}`
    case 'teacher': return '/teacher/dashboard'
    case 'streamer': return '/creator/live/console'
    case 'creator': return '/videos/creator'
    case 'station_owner': return '/mine/role-panels/station-master-panel'
    default: return '/pages/profile/index'
  }
}

export const totalMessages =
  userData.messages.system + userData.messages.interaction + userData.messages.transaction

// ============================================
// API 层：useMock 开关控制真实/模拟数据切换
// ============================================

/** 简单 JWT 解码（不验证签名），取 payload 中的 userId */
function getUserIdFromToken(): string | null {
  try {
    const token = getToken()
    if (!token) return null
    const parts = token.split('.')
    if (parts.length < 2) return null
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload?.sub || payload?.userId || payload?.id || null
  } catch { return null }
}

/** 后端 RoleType → 前端 UserRole */
function mapRoleType(rt: string): UserRole | null {
  const map: Record<string, UserRole> = {
    CIRCLE_OWNER: 'circle_owner',
    LECTURER: 'teacher',
    STATION_MASTER: 'station_owner',
  }
  return map[rt] || null
}

/** VIP 等级标签映射 */
function mapVipLevel(level: string | null): { isVip: boolean; vipLevel: string } {
  if (!level || level === 'NONE') return { isVip: false, vipLevel: '' }
  const labels: Record<string, string> = {
    MONTHLY: '黄金会员',
    YEARLY: '铂金会员',
    LIFETIME: '终身会员',
  }
  return { isVip: true, vipLevel: labels[level] || '会员' }
}

/** 计算剩余天数 */
function daysLeft(expireStr: string | null): number {
  if (!expireStr) return 0
  const d = Math.ceil((new Date(expireStr).getTime() - Date.now()) / 86400000)
  return d > 0 ? d : 0
}

export const profileApi = {
  async getMyProfile() {
    const userId = getUserIdFromToken()

    if (useMock() || !userId) {
      return { ...userData, _isMock: true }
    }

    try {
      const [userRes, statsRes, profileRes] = await Promise.allSettled([
        apiGet<any>(`/users/${userId}`),
        apiGet<any>(`/users/${userId}/stats`),
        apiGet<any>(`/users/${userId}/profile`),
      ])

      const user = userRes.status === 'fulfilled' ? userRes.value : null
      const stats = statsRes.status === 'fulfilled' ? statsRes.value : null
      const profile = profileRes.status === 'fulfilled' ? profileRes.value : null

      const { isVip, vipLevel } = mapVipLevel(user?.memberLevel ?? null)

      // 角色映射
      const roles: RoleEntry[] = (user?.roles || [])
        .map((r: any) => {
          const type = mapRoleType(r.roleType)
          return type ? { type, name: user.nickname, id: Number(r.bindId) || 0 } : null
        })
        .filter(Boolean)

      // 学习进度
      const firstProgress = profile?.learningProgress?.[0]
      const continueLearning = firstProgress ? {
        id: 1,
        title: `课程 #${firstProgress.courseId}`,
        progress: firstProgress.progress || 0,
        lastLesson: `上次学习: ${firstProgress.updatedAt?.slice(0, 10) || '--'}`,
      } : userData.continueLearning

      return {
        name: user?.nickname || userData.name,
        avatar: user?.avatar || '',
        bio: user?.bio || userData.bio,
        isVip,
        vipLevel,
        vipExpiry: user?.memberExpire ? new Date(user.memberExpire).toISOString().slice(0, 10) : '',
        vipDaysLeft: daysLeft(user?.memberExpire ?? null),
        isVerified: user?.status === 'ACTIVE',
        roles: roles.length > 0 ? roles : userData.roles,
        messages: userData.messages,
        checkIn: userData.checkIn,
        stats: {
          following: stats?.following ?? userData.stats.following,
          followers: stats?.followers ?? userData.stats.followers,
          likes: stats?.totalLikes ?? userData.stats.likes,
        },
        coins: profile?.coinBalance ?? userData.coins,
        coupons: userData.coupons,
        points: userData.points,
        orders: userData.orders,
        continueLearning,
        _isMock: false,
      }
    } catch {
      return { ...userData, _isMock: true }
    }
  },

  /** 获取当前用户 ID，未登录返回 null */
  getUserId: getUserIdFromToken,

  /** 是否已登录 */
  isLoggedIn: () => !!getToken(),
}
