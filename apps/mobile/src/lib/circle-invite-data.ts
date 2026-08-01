/**
 * 圈子邀请码 数据层
 * 真连后端：生成 POST /circles/:id/invite-code、列表 GET .../invite-codes、统计 GET .../invitation-stats。
 * 后端无「禁用/删除邀请码」「按码的使用记录」端点 → 前端对应功能已去除（不造假）。
 * 状态由 expiredAt + useCount/maxUses 派生（后端无 status 字段）。
 */
import { apiGet, apiPost } from '@/utils/request'

export interface InviteCodeItem {
  id: string
  code: string
  maxUses: number          // 0 表示不限次
  usedCount: number
  status: 'active' | 'expired' | 'used'
  createdAt: string
  expiresAt?: string
}

/* —— 后端原始响应类型（容错适配用，仅声明 adapter 实际访问到的字段） —— */
/** 后端邀请码原始条目（id/code/createdAt 必有，直赋必填视图字段） */
interface RawInviteCode {
  id: string
  code: string
  maxUses?: number | string
  useCount?: number | string
  usedCount?: number | string
  expiredAt?: string
  expiresAt?: string
  createdAt: string
}
/** 邀请码列表响应：裸数组或 {data:[]} / {codes:[]} 包装 */
type RawInviteCodeResp = RawInviteCode[] | { data?: RawInviteCode[]; codes?: RawInviteCode[] }
/** 邀请记录（GET invitation-stats records：invitee 昵称/头像 + 加入时间） */
export interface InviteRecord {
  id: string
  nickname: string
  avatar: string
  joinedAt: string
}

/** 后端邀请记录原始条目 */
interface RawInviteRecord {
  id?: string
  joinedAt?: string
  createdAt?: string
  invitee?: { id?: string; nickname?: string; avatar?: string } | null
}

/** 邀请统计响应：{total,records} 或 {data:{total,records}} */
interface RawInviteStatsResp {
  total?: number | string
  records?: RawInviteRecord[]
  data?: { total?: number | string; records?: RawInviteRecord[] }
}

function adaptCode(c: RawInviteCode): InviteCodeItem {
  const maxUses = Number(c.maxUses) || 0
  const usedCount = Number(c.useCount ?? c.usedCount) || 0
  const expiresAt = c.expiredAt || c.expiresAt || undefined
  let status: InviteCodeItem['status'] = 'active'
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) status = 'expired'
  else if (maxUses > 0 && usedCount >= maxUses) status = 'used'
  return { id: c.id, code: c.code, maxUses, usedCount, status, createdAt: c.createdAt, expiresAt }
}

export const inviteApi = {
  /** 我的邀请码列表 — GET /circles/:id/invite-codes */
  listCodes: async (circleId: string): Promise<InviteCodeItem[]> => {
    try {
      const res = await apiGet<RawInviteCodeResp>(`/circles/${circleId}/invite-codes`)
      const arr = Array.isArray(res) ? res : (res?.data ?? res?.codes ?? [])
      return arr.map(adaptCode)
    } catch { return [] }
  },
  /** 邀请统计（总邀请人数）— GET /circles/:id/invitation-stats */
  getTotalInvited: async (circleId: string): Promise<number> => {
    try {
      const res = await apiGet<RawInviteStatsResp>(`/circles/${circleId}/invitation-stats`)
      const d = res?.data ?? res
      return Number(d?.total) || 0
    } catch { return 0 }
  },
  /** 邀请统计（人数 + 最近记录）— GET /circles/:id/invitation-stats（后端返回 {total, records[≤20]}）；错误上抛供页面三态 */
  getStats: async (circleId: string): Promise<{ total: number; records: InviteRecord[] }> => {
    const res = await apiGet<RawInviteStatsResp>(`/circles/${circleId}/invitation-stats`)
    const d = (res?.data ?? res) as { total?: number | string; records?: RawInviteRecord[] }
    const records = (Array.isArray(d?.records) ? d.records : []).map((r): InviteRecord => ({
      id: r.id || '',
      nickname: r.invitee?.nickname || '圈友',
      avatar: r.invitee?.avatar || '',
      joinedAt: r.joinedAt || r.createdAt || '',
    }))
    return { total: Number(d?.total) || 0, records }
  },
  /** 生成邀请码 — POST /circles/:id/invite-code */
  generate: (circleId: string, maxUses: number) =>
    apiPost(`/circles/${circleId}/invite-code`, { maxUses }),
}
