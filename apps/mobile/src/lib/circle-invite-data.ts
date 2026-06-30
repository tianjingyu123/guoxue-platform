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

function adaptCode(c: any): InviteCodeItem {
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
      const res = await apiGet<any>(`/circles/${circleId}/invite-codes`)
      const arr = Array.isArray(res) ? res : (res?.data ?? res?.codes ?? [])
      return arr.map(adaptCode)
    } catch { return [] }
  },
  /** 邀请统计（总邀请人数）— GET /circles/:id/invitation-stats */
  getTotalInvited: async (circleId: string): Promise<number> => {
    try {
      const res = await apiGet<any>(`/circles/${circleId}/invitation-stats`)
      const d = res?.data ?? res
      return Number(d?.total) || 0
    } catch { return 0 }
  },
  /** 生成邀请码 — POST /circles/:id/invite-code */
  generate: (circleId: string, maxUses: number) =>
    apiPost(`/circles/${circleId}/invite-code`, { maxUses }),
}
