/**
 * V3 共读拼团裂变 · 数据层
 * 后端契约见 apps/server/src/modules/shared-reading/shared-reading.controller.ts（7 端点·前缀 shared-reading）。
 * 纯学习激励（学分荣誉值·不可兑现），与商城支付拼团 GroupBuy 物理隔离，零资金 R 安全。
 *
 * 铁律：所有方法真连后端，错误向上抛由页面走「错误态」；空数据走「空态」，绝不回退假 mock。
 */
import { apiGet, apiPost, apiDelete } from '@/utils/request'

/** 共读组状态机 */
export type SharedReadingStatus = 'RECRUITING' | 'READING' | 'COMPLETED' | 'EXPIRED'

/** 状态中文标签（页面共用） */
export const SHARED_READING_STATUS_LABEL: Record<SharedReadingStatus, string> = {
  RECRUITING: '招募中',
  READING: '共读中',
  COMPLETED: '已达成',
  EXPIRED: '已结束',
}

/** 发起共读 body（后端未传字段用默认值） */
export interface CreateGroupBody {
  classicBookId: string
  targetChapters?: number
  minMembers?: number
  maxMembers?: number
  durationDays?: number
}

/** 发起共读返回 */
export interface CreateGroupResult {
  groupId: string
  inviteToken: string
  shareUrl: string
}

/** 组成员进度 */
export interface SharedReadingMember {
  userId: string
  nickname: string
  avatar: string | null
  completedChapters: number
  completed: boolean
  isLeader: boolean
}

/** 我的进度 */
export interface MyProgress {
  completedChapters: number
  completed: boolean
}

/** 共读组详情 */
export interface SharedReadingDetail {
  id: string
  book: { id: string; title: string }
  status: SharedReadingStatus
  targetChapters: number
  durationDays?: number
  minMembers: number
  maxMembers: number
  memberCount: number
  deadline: string | null
  members: SharedReadingMember[]
  myProgress: MyProgress
  iAmMember: boolean
  /** 招募中且我是成员时=真招募 token（可生成邀请链接裂变补人），否则 null */
  inviteToken?: string | null
  /** 招募中且我是成员时=真招募分享链接（复制发好友），否则 null */
  shareUrl?: string | null
}

/** 招募卡（公开） */
export interface SharedReadingInviteInfo {
  bookTitle: string
  initiatorNickname: string
  memberCount: number
  minMembers: number
  status: SharedReadingStatus
}

/** 我的共读列表项 */
export interface SharedReadingMineItem {
  groupId: string
  bookTitle: string
  status: SharedReadingStatus
  memberCount: number
  myCompleted: boolean
}

export const sharedReadingApi = {
  /** 1. 发起共读组（发起人自动入组） */
  create(body: CreateGroupBody): Promise<CreateGroupResult> {
    return apiPost<CreateGroupResult>('/shared-reading/groups', body)
  },

  /** 2. 共读组详情（实时进度 + 惰性结算） */
  detail(id: string): Promise<SharedReadingDetail> {
    return apiGet<SharedReadingDetail>(`/shared-reading/groups/${id}`)
  },

  /** 3. 招募卡（公开·被邀请方点链接） */
  inviteInfo(token: string): Promise<SharedReadingInviteInfo> {
    return apiGet<SharedReadingInviteInfo>(`/shared-reading/invite/${token}`)
  },

  /** 4. 加入共读组（满 minMembers 后端自动转 READING） */
  join(token: string): Promise<{ groupId: string }> {
    return apiPost<{ groupId: string }>('/shared-reading/join', { token })
  },

  /** 5. 发起人手动开读（满 minMembers 可用） */
  start(id: string): Promise<{ groupId: string; status: string }> {
    return apiPost<{ groupId: string; status: string }>(`/shared-reading/groups/${id}/start`)
  },

  /** 6. 我参与的共读组（后端信封 { items }） */
  async mine(): Promise<SharedReadingMineItem[]> {
    const res = await apiGet<{ items?: SharedReadingMineItem[] }>('/shared-reading/mine')
    return Array.isArray(res?.items) ? res.items : []
  },

  /** 7. 退出 / 解散（仅招募期可退，发起人退=解散） */
  leave(id: string): Promise<{ dissolved?: boolean; left?: boolean }> {
    return apiDelete<{ dissolved?: boolean; left?: boolean }>(`/shared-reading/groups/${id}/leave`)
  },
}

/** 截止时间格式化（deadline 为 ISO 串或 null） */
export function fmtDeadline(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd} ${hh}:${mi}`
}

/** 距截止剩余天数（向上取整；已过/无返回 0） */
export function daysLeft(iso: string | null): number {
  if (!iso) return 0
  const d = new Date(iso).getTime()
  if (Number.isNaN(d)) return 0
  const diff = d - Date.now()
  return diff <= 0 ? 0 : Math.ceil(diff / 86_400_000)
}
