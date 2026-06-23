// 团队管理相关 API
import { apiGet, apiPost, useMock } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { 
  TeamOverview, 
  TeamMember, 
  TeamMembersResponse, 
  LeaderboardItem, 
  TeamLeaderboardResponse,
  TeamActivity,
  TeamActivityResponse,
  TeamSuccessCase,
  TeamManagementData
} from '../types/team'

// ========== Mock 数据 ==========

const mockOverview: TeamOverview = {
  totalMembers: 156,
  newMembersThisMonth: 23,
  totalCommission: 28650.00,
  commissionRate: 15,
  myLevel: '金牌站长',
  nextLevelRequirement: 50000,
}

const mockMembers: TeamMember[] = [
  {
    id: 1,
    avatar: '/placeholder.svg?height=48&width=48',
    nickname: '易学传人',
    phone: '138****6688',
    level: '银牌推广员',
    levelIcon: '🥈',
    joinDate: '2026-03-15',
    totalCommission: 3580.00,
    thisMonthCommission: 680.00,
    inviteCount: 12,
    status: 'active',
    lastActiveTime: '2026-06-03 10:30',
  },
  {
    id: 2,
    avatar: '/placeholder.svg?height=48&width=48',
    nickname: '国学爱好者',
    phone: '139****8899',
    level: '铜牌推广员',
    levelIcon: '🥉',
    joinDate: '2026-04-20',
    totalCommission: 1260.00,
    thisMonthCommission: 320.00,
    inviteCount: 5,
    status: 'active',
    lastActiveTime: '2026-06-02 18:45',
  },
  {
    id: 3,
    avatar: '/placeholder.svg?height=48&width=48',
    nickname: '命理研究员',
    phone: '136****7766',
    level: '金牌推广员',
    levelIcon: '🥇',
    joinDate: '2026-02-10',
    totalCommission: 8920.00,
    thisMonthCommission: 1580.00,
    inviteCount: 28,
    status: 'active',
    lastActiveTime: '2026-06-03 09:15',
  },
  {
    id: 4,
    avatar: '/placeholder.svg?height=48&width=48',
    nickname: '风水学徒',
    phone: '135****5544',
    level: '普通推广员',
    levelIcon: '⭐',
    joinDate: '2026-05-08',
    totalCommission: 380.00,
    thisMonthCommission: 180.00,
    inviteCount: 2,
    status: 'inactive',
    lastActiveTime: '2026-05-28 14:20',
  },
]

const mockLeaderboard: LeaderboardItem[] = [
  { rank: 1, userId: 3, avatar: '/placeholder.svg', nickname: '命理研究员', level: '金牌', value: 8920, change: 2 },
  { rank: 2, userId: 1, avatar: '/placeholder.svg', nickname: '易学传人', level: '银牌', value: 3580, change: 0 },
  { rank: 3, userId: 5, avatar: '/placeholder.svg', nickname: '玄学探索者', level: '银牌', value: 2860, change: 1 },
  { rank: 4, userId: 2, avatar: '/placeholder.svg', nickname: '国学爱好者', level: '铜牌', value: 1260, change: -1 },
  { rank: 5, userId: 6, avatar: '/placeholder.svg', nickname: '八字初学者', level: '铜牌', value: 980, change: 3 },
]

const mockActivities: TeamActivity[] = [
  {
    id: 1,
    type: 'join',
    userId: 10,
    userAvatar: '/placeholder.svg',
    userNickname: '新成员小张',
    content: '加入了您的团队',
    createdAt: '2026-06-03 14:30',
  },
  {
    id: 2,
    type: 'commission',
    userId: 3,
    userAvatar: '/placeholder.svg',
    userNickname: '命理研究员',
    content: '完成一笔推广订单',
    amount: 128.00,
    createdAt: '2026-06-03 11:20',
  },
  {
    id: 3,
    type: 'upgrade',
    userId: 1,
    userAvatar: '/placeholder.svg',
    userNickname: '易学传人',
    content: '升级为银牌推广员',
    createdAt: '2026-06-02 16:45',
  },
  {
    id: 4,
    type: 'invite',
    userId: 2,
    userAvatar: '/placeholder.svg',
    userNickname: '国学爱好者',
    content: '成功邀请了 2 位新成员',
    createdAt: '2026-06-02 10:30',
  },
  {
    id: 5,
    type: 'achievement',
    userId: 3,
    userAvatar: '/placeholder.svg',
    userNickname: '命理研究员',
    content: '达成"月入过千"成就',
    createdAt: '2026-06-01 20:00',
  },
]

const mockSuccessCases: TeamSuccessCase[] = [
  {
    id: 1,
    userId: 3,
    avatar: '/placeholder.svg',
    nickname: '命理研究员',
    title: '从小白到金牌的蜕变',
    description: '分享我如何在3个月内实现月入过万的推广之路，关键在于持续学习和真诚分享...',
    achievement: '月入过万',
    duration: '4个月',
    totalEarnings: 32580,
    createdAt: '2026-05-20',
  },
  {
    id: 2,
    userId: 8,
    avatar: '/placeholder.svg',
    nickname: '风水大师徒弟',
    title: '边学边赚的推广心得',
    description: '作为国学爱好者，我把推广当作分享好东西给朋友，没想到收益超出预期...',
    achievement: '百人团队',
    duration: '6个月',
    totalEarnings: 18960,
    createdAt: '2026-04-15',
  },
]

// ========== API 函数 ==========

/**
 * 获取团队管理首页数据
 */
export async function getTeamManagementData(): Promise<ApiResponse<TeamManagementData>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 500))
    return {
      code: 200,
      data: {
        overview: mockOverview,
        recentMembers: mockMembers.slice(0, 3),
        topMembers: mockLeaderboard.slice(0, 3),
      },
      message: 'success',
    }
  }
  return apiGet<TeamManagementData>('/station/team')
}

/**
 * 获取团队成员列表
 */
export async function getTeamMembers(
  page: number = 1,
  pageSize: number = 20,
  filter?: 'all' | 'active' | 'inactive',
  sortBy?: 'commission' | 'inviteCount' | 'joinDate'
): Promise<ApiResponse<TeamMembersResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    let list = [...mockMembers]
    if (filter === 'active') list = list.filter(m => m.status === 'active')
    if (filter === 'inactive') list = list.filter(m => m.status === 'inactive')
    if (sortBy === 'commission') list.sort((a, b) => b.totalCommission - a.totalCommission)
    if (sortBy === 'inviteCount') list.sort((a, b) => b.inviteCount - a.inviteCount)
    return {
      code: 200,
      data: {
        list,
        total: list.length,
        hasMore: false,
      },
      message: 'success',
    }
  }
  return apiGet<TeamMembersResponse>('/station/team/members', { page, pageSize, filter, sortBy })
}

/**
 * 获取团队排行榜
 */
export async function getTeamLeaderboard(
  type: 'commission' | 'inviteCount' = 'commission',
  period: 'week' | 'month' | 'all' = 'month'
): Promise<ApiResponse<TeamLeaderboardResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return {
      code: 200,
      data: {
        list: mockLeaderboard,
        myRank: 8,
        myValue: 520,
        updateTime: '2026-06-03 00:00',
      },
      message: 'success',
    }
  }
  return apiGet<TeamLeaderboardResponse>('/station/team/leaderboard', { type, period })
}

/**
 * 获取团队动态
 */
export async function getTeamActivities(
  page: number = 1,
  pageSize: number = 20
): Promise<ApiResponse<TeamActivityResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    return {
      code: 200,
      data: {
        list: mockActivities,
        hasMore: false,
      },
      message: 'success',
    }
  }
  return apiGet<TeamActivityResponse>('/station/team/activities', { page, pageSize })
}

/**
 * 获取成功案例
 */
export async function getTeamSuccessCases(): Promise<ApiResponse<TeamSuccessCase[]>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { code: 200, data: mockSuccessCases, message: 'success' }
  }
  return apiGet<TeamSuccessCase[]>('/station/team/success-cases')
}

/**
 * 生成邀请链接
 */
export async function generateInviteLink(): Promise<ApiResponse<{ link: string; qrcode: string; expireAt: string }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 200))
    return {
      code: 200,
      data: {
        link: 'https://rebu.com/invite/ABC123',
        qrcode: '/placeholder.svg?height=200&width=200&text=QR',
        expireAt: '2026-12-31',
      },
      message: 'success',
    }
  }
  return apiPost<{ link: string; qrcode: string; expireAt: string }>('/station/team/invite-link')
}

/**
 * 获取成员业绩详情
 */
export async function getMemberDetail(memberId: number): Promise<ApiResponse<TeamMember & { 
  recentOrders: Array<{ id: number; amount: number; commission: number; time: string }>
  invitedMembers: Array<{ id: number; nickname: string; avatar: string; joinDate: string }>
}>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    const member = mockMembers.find(m => m.id === memberId) || mockMembers[0]
    return {
      code: 200,
      data: {
        ...member,
        recentOrders: [
          { id: 1, amount: 299, commission: 44.85, time: '2026-06-03 10:20' },
          { id: 2, amount: 599, commission: 89.85, time: '2026-06-01 15:30' },
        ],
        invitedMembers: [
          { id: 101, nickname: '小明', avatar: '/placeholder.svg', joinDate: '2026-05-20' },
          { id: 102, nickname: '小红', avatar: '/placeholder.svg', joinDate: '2026-05-15' },
        ],
      },
      message: 'success',
    }
  }
  return apiGet(`/station/team/members/${memberId}`)
}

/**
 * 获取活动类型名称
 */
export function getActivityTypeName(type: TeamActivity['type']): string {
  const names: Record<TeamActivity['type'], string> = {
    join: '新成员加入',
    upgrade: '等级提升',
    commission: '佣金到账',
    invite: '邀请成功',
    achievement: '达成成就',
  }
  return names[type] || '团队动态'
}

/**
 * 获取活动类型图标
 */
export function getActivityTypeIcon(type: TeamActivity['type']): string {
  const icons: Record<TeamActivity['type'], string> = {
    join: '👋',
    upgrade: '⬆️',
    commission: '💰',
    invite: '🤝',
    achievement: '🏆',
  }
  return icons[type] || '📢'
}
