/**
 * V4 双人合盘（合婚裂变）数据层
 * 后端契约见 apps/server/src/modules/paipan/couple.controller.ts（7 端点）。
 * R3 最小授权：任何端点都不返回对方 recordId/生辰/四柱，双方唯一共享内容=合婚报告文本。
 * 「我的八字盘」复用 GET /paipan/bazi（八字排盘历史，仅本人可见）。
 */
import { apiGet, apiPost, apiDelete } from '@/utils/request'

/** 合盘状态机 */
export type CoupleStatus =
  | 'PENDING_INVITE' // 待对方授权
  | 'AUTHORIZED' // 已授权·报告已生成
  | 'REJECTED' // 对方已婉拒
  | 'EXPIRED' // 邀请已过期

/** 我在该合盘中的角色 */
export type CoupleRole = 'initiator' | 'partner'

/** 我的八字排盘记录（选盘用·仅含展示所需字段） */
export interface MyBaziRecord {
  id: string
  /** 记录命主名（无名则占位） */
  name: string
  /** 生辰（本人可见自己的记录） */
  birth: string
  createdAt: string
}

/** 发起邀请返回 */
export interface CoupleInviteResult {
  id: string
  inviteToken: string
  shareUrl: string
}

/** 公开邀请详情（不含任何生辰/盘信息） */
export interface CoupleInviteInfo {
  initiatorNickname: string
  status: CoupleStatus
  expired: boolean
}

/** 接受邀请返回 */
export interface CoupleAcceptResult {
  chartId: string
}

/** 合盘详情（仅报告文本 + 双方昵称） */
export interface CoupleDetail {
  id: string
  status: CoupleStatus
  initiatorNickname: string
  partnerNickname: string | null
  analysisContent: string | null
  createdAt: string
}

/** 我的合盘列表项 */
export interface CoupleMineItem {
  id: string
  role: CoupleRole
  status: CoupleStatus
  otherNickname: string | null
  createdAt: string
}

/** 后端排盘历史原始记录（clientName/clientBirth 已解密） */
interface RawBaziRecord {
  id: string
  clientName?: string | null
  clientBirth?: string | null
  createdAt: string
}
interface RawBaziHistory {
  records?: RawBaziRecord[]
  total?: number
}

/** 状态中文标签（页面共用，避免各页重复） */
export const COUPLE_STATUS_LABEL: Record<CoupleStatus, string> = {
  PENDING_INVITE: '待授权',
  AUTHORIZED: '已合盘',
  REJECTED: '已婉拒',
  EXPIRED: '已过期',
}

/** 角色中文标签 */
export const COUPLE_ROLE_LABEL: Record<CoupleRole, string> = {
  initiator: '我发起的',
  partner: '我参与的',
}

export const coupleApi = {
  /** 我的八字排盘记录（合盘只能选 BAZI 盘·复用排盘历史，取前 50 条） */
  async myBaziRecords(): Promise<MyBaziRecord[]> {
    const res = await apiGet<RawBaziHistory>('/paipan/bazi?page=1&pageSize=50')
    const list = Array.isArray(res?.records) ? res!.records! : []
    return list.map((r) => ({
      id: r.id,
      name: (r.clientName || '').trim() || '未命名命主',
      birth: r.clientBirth || '',
      createdAt: r.createdAt,
    }))
  },

  /** 1. 发起邀请（选我的盘 → 生成邀请链接） */
  invite(myRecordId: string): Promise<CoupleInviteResult> {
    return apiPost<CoupleInviteResult>('/paipan/couple/invite', { myRecordId })
  },

  /** 2. 公开查看邀请详情（被邀请方点链接） */
  getInvite(token: string): Promise<CoupleInviteInfo> {
    return apiGet<CoupleInviteInfo>(`/paipan/couple/invite/${token}`)
  },

  /** 3. 接受邀请（授权并生成合婚报告，返回 chartId） */
  accept(token: string, myRecordId: string): Promise<CoupleAcceptResult> {
    return apiPost<CoupleAcceptResult>(`/paipan/couple/${token}/accept`, { myRecordId })
  },

  /** 4. 婉拒邀请 */
  reject(token: string): Promise<{ success: boolean }> {
    return apiPost<{ success: boolean }>(`/paipan/couple/${token}/reject`)
  },

  /** 5. 合盘详情（仅双方可见） */
  detail(id: string): Promise<CoupleDetail> {
    return apiGet<CoupleDetail>(`/paipan/couple/${id}`)
  },

  /** 6. 我的合盘列表 */
  mine(): Promise<CoupleMineItem[]> {
    return apiGet<CoupleMineItem[]>('/paipan/couple/mine')
  },

  /** 7. 删除（软删己方可见性） */
  remove(id: string): Promise<{ success: boolean }> {
    return apiDelete<{ success: boolean }>(`/paipan/couple/${id}`)
  },
}
