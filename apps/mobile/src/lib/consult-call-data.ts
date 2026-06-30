/**
 * 达人付费通话 data 层 —— 接后端 /consult-calls/*（规格 circle-consult-rules-v1）。
 * ⚠️ 实时音视频(TRTC)发起/接听 UI 需真机 SDK 联调；本 data 层提供历史记录 + 发起/结算/取消接口。
 */
import { apiGet, apiPost } from '@/utils/request'

export interface ConsultCallRecord {
  id: string
  circleId: string
  callerId: string
  expertId: string
  type: string // VOICE / VIDEO
  pricePerMinute: number
  prepaidCoin: number
  status: string // WAITING/ONGOING/ENDED/REFUNDED/MISSED
  durationSec: number
  settledCoin: number
  refundedCoin: number
  createdAt: string
  startAt?: string | null
  endAt?: string | null
  callerName?: string | null
  callerAvatar?: string | null
  expertName?: string | null
  expertAvatar?: string | null
}

export const callApi = {
  /** 我的通话记录 GET /consult-calls/my */
  myCalls: () => apiGet<ConsultCallRecord[]>('/consult-calls/my'),
  /** 发起通话（预扣 + 返回 TRTC 配置）POST /consult-calls/initiate */
  initiate: (body: { circleId: string; expertId: string; type: 'VOICE' | 'VIDEO' }) =>
    apiPost<any>('/consult-calls/initiate', body),
  accept: (id: string) => apiPost<any>(`/consult-calls/${id}/accept`),
  end: (id: string) => apiPost<any>(`/consult-calls/${id}/end`),
  cancel: (id: string, reason?: 'MISSED' | 'REFUNDED') => apiPost<any>(`/consult-calls/${id}/cancel`, { reason }),
}
