// 邀请记录相关 API
import { apiGet, apiPost, useMock } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { InviteStats, InviteRecord, InviteRecordsResponse, InviteLinkInfo, InvitePosterConfig, ShareConfig } from '../types/invite'

// ========== Mock 数据 ==========

const mockInviteStats: InviteStats = {
  totalInvited: 156,
  registeredCount: 142,
  paidCount: 68,
  totalEarnings: 3280.50,
  pendingEarnings: 420.00,
  todayInvited: 3,
  monthInvited: 28,
}

const mockInviteRecords: InviteRecord[] = [
  {
    id: 1,
    invitee: {
      id: 1001,
      nickname: '易学新人',
      avatar: '/placeholder.svg?height=40&width=40',
      phone: '138****8888',
    },
    status: 'vip',
    registeredAt: '2026-06-01 14:30',
    paidAt: '2026-06-02 10:20',
    paidAmount: 298,
    commission: 29.80,
    pendingCommission: 0,
  },
  {
    id: 2,
    invitee: {
      id: 1002,
      nickname: '国学爱好者',
      avatar: '/placeholder.svg?height=40&width=40',
      phone: '139****6666',
    },
    status: 'paid',
    registeredAt: '2026-05-28 09:15',
    paidAt: '2026-05-30 16:40',
    paidAmount: 99,
    commission: 9.90,
    pendingCommission: 5.00,
  },
  {
    id: 3,
    invitee: {
      id: 1003,
      nickname: '玄学入门者',
      avatar: '/placeholder.svg?height=40&width=40',
      phone: '136****2222',
    },
    status: 'registered',
    registeredAt: '2026-06-03 08:00',
    commission: 0,
    pendingCommission: 0,
  },
  {
    id: 4,
    invitee: {
      id: 1004,
      nickname: '传统文化学者',
      avatar: '/placeholder.svg?height=40&width=40',
      phone: '137****3333',
    },
    status: 'paid',
    registeredAt: '2026-05-20 11:30',
    paidAt: '2026-05-22 14:00',
    paidAmount: 588,
    commission: 58.80,
    pendingCommission: 0,
  },
  {
    id: 5,
    invitee: {
      id: 1005,
      nickname: '八字研究者',
      avatar: '/placeholder.svg?height=40&width=40',
      phone: '135****5555',
    },
    status: 'vip',
    registeredAt: '2026-05-15 16:20',
    paidAt: '2026-05-16 09:00',
    paidAmount: 1288,
    commission: 128.80,
    pendingCommission: 0,
  },
]

const mockInviteLinkInfo: InviteLinkInfo = {
  inviteCode: 'GUOXUE2026',
  inviteLink: 'https://app.example.com/invite/GUOXUE2026',
  qrCodeUrl: '/placeholder.svg?height=200&width=200&text=QR',
}

// ========== API 函数 ==========

// 获取邀请统计
export async function getInviteStats(): Promise<ApiResponse<InviteStats>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    return { code: 200, data: mockInviteStats, message: 'success' }
  }
  return apiGet<InviteStats>('/user/invite/stats')
}

// 获取邀请记录列表
export async function getInviteRecords(
  page: number = 1,
  pageSize: number = 20,
  filter: 'all' | 'registered' | 'paid' | 'vip' = 'all'
): Promise<ApiResponse<InviteRecordsResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 500))
    let filtered = mockInviteRecords
    if (filter !== 'all') {
      filtered = mockInviteRecords.filter(r => r.status === filter)
    }
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const list = filtered.slice(start, end)
    return {
      code: 200,
      data: {
        list,
        total: filtered.length,
        hasMore: end < filtered.length,
      },
      message: 'success',
    }
  }
  return apiGet<InviteRecordsResponse>('/user/invite/records', { page, pageSize, filter })
}

// 获取邀请链接信息
export async function getInviteLinkInfo(): Promise<ApiResponse<InviteLinkInfo>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { code: 200, data: mockInviteLinkInfo, message: 'success' }
  }
  return apiGet<InviteLinkInfo>('/user/invite/link')
}

// 生成新的邀请链接
export async function regenerateInviteLink(): Promise<ApiResponse<InviteLinkInfo>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 500))
    return {
      code: 200,
      data: {
        ...mockInviteLinkInfo,
        inviteCode: 'NEW' + Date.now().toString().slice(-6),
        inviteLink: 'https://app.example.com/invite/NEW' + Date.now().toString().slice(-6),
      },
      message: '生成成功',
    }
  }
  return apiPost<InviteLinkInfo>('/user/invite/link/regenerate')
}

// 获取状态文本
export function getInviteStatusText(status: InviteRecord['status']): string {
  const texts: Record<InviteRecord['status'], string> = {
    registered: '已注册',
    paid: '已付费',
    vip: '已开通会员',
  }
  return texts[status]
}

// 获取状态颜色
export function getInviteStatusColor(status: InviteRecord['status']): string {
  const colors: Record<InviteRecord['status'], string> = {
    registered: 'text-muted-foreground',
    paid: 'text-green-600',
    vip: 'text-amber-600',
  }
  return colors[status]
}

// ========== 邀请分享相关 API ==========

// Mock 海报配置
const mockPosterConfig: InvitePosterConfig = {
  userAvatar: '/placeholder.svg?height=80&width=80',
  userName: '国学爱好者',
  userId: 10001,
  backgroundImages: [
    '/placeholder.svg?height=600&width=400&text=背景1',
    '/placeholder.svg?height=600&width=400&text=背景2',
    '/placeholder.svg?height=600&width=400&text=背景3',
  ],
  inviteCode: 'ABC123',
  qrCodeUrl: '/placeholder.svg?height=120&width=120',
  title: '邀请好友，共享国学智慧',
  subtitle: '扫码加入热卜，开启国学之旅',
  benefits: [
    '好友注册即得10积分',
    '好友首次付费返佣10%',
    '好友开通会员再得20元',
  ],
}

/**
 * 获取邀请海报配置
 */
export async function getInvitePosterConfig(): Promise<ApiResponse<InvitePosterConfig>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { code: 200, data: mockPosterConfig, message: 'success' }
  }
  return apiGet<InvitePosterConfig>('/user/invite/poster-config')
}

/**
 * 获取分享配置
 */
export async function getShareConfig(type: 'invite' | 'content' | 'course'): Promise<ApiResponse<ShareConfig>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 200))
    return {
      code: 200,
      data: {
        title: '热卜 - 国学知识付费平台',
        description: '邀请您加入热卜，一起探索国学智慧',
        imageUrl: '/placeholder.svg?height=100&width=100',
        link: 'https://app.example.com/invite/ABC123',
      },
      message: 'success',
    }
  }
  return apiGet<ShareConfig>('/share/config', { type })
}

/**
 * 记录分享行为
 */
export async function recordShare(channel: string, type: string): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 100))
    return { code: 200, data: { success: true }, message: 'success' }
  }
  return apiPost<{ success: boolean }>('/share/record', { channel, type })
}
