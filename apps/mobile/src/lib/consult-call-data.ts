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
  // ── 评价（待办 #31·仅发起方·ENDED 后 24h 内一次） ──
  rating?: number | null
  ratingTags?: string | null // 逗号串
  ratingComment?: string | null
  ratedAt?: string | null
  // ── 24h 账单申诉（只记结论·退款走人工审批流） ──
  disputeReason?: string | null
  disputedAt?: string | null
  disputeStatus?: string | null // PENDING/RESOLVED/REJECTED
}

/** 通话发起/控制接口的后端响应（含 TRTC 配置或更新后的通话记录，真机 SDK 联调前无强类型消费方，宽松占位） */
interface CallActionResult { [k: string]: unknown }

export const callApi = {
  /** 我的通话记录 GET /consult-calls/my */
  myCalls: () => apiGet<ConsultCallRecord[]>('/consult-calls/my'),
  /** 发起通话（预扣 + 返回 TRTC 配置）POST /consult-calls/initiate */
  initiate: (body: { circleId: string; expertId: string; type: 'VOICE' | 'VIDEO' }) =>
    apiPost<CallActionResult>('/consult-calls/initiate', body),
  accept: (id: string) => apiPost<CallActionResult>(`/consult-calls/${id}/accept`),
  end: (id: string) => apiPost<CallActionResult>(`/consult-calls/${id}/end`),
  cancel: (id: string, reason?: 'MISSED' | 'REFUNDED') => apiPost<CallActionResult>(`/consult-calls/${id}/cancel`, { reason }),
  /** 评价通话（星级 1-5 + 标签 + 文字 ≤200 字）POST /consult-calls/:id/rate */
  rate: (id: string, body: { rating: number; tags?: string[]; comment?: string }) =>
    apiPost<CallActionResult>(`/consult-calls/${id}/rate`, body),
  /** 24 小时账单申诉 POST /consult-calls/:id/dispute */
  dispute: (id: string, reason: string) => apiPost<CallActionResult>(`/consult-calls/${id}/dispute`, { reason }),
}
