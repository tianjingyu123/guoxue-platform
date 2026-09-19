import { apiGet, apiPost, apiPut } from '@/utils/request'

export interface LiveGiftSpendingPreference {
  configured: boolean
  eligible: boolean
  ineligibleReason: 'IDENTITY_REQUIRED' | 'AGE_REQUIRED' | 'MINOR_NOT_ALLOWED' | null
  singleLimitCoin: number | null
  dailyLimitCoin: number | null
  reminderEnabled: boolean
  spentTodayCoin: number
  platformSingleMaxCoin: number
  platformDailyMaxCoin: number
}

export function getLiveGiftSpendingPreference() {
  return apiGet<LiveGiftSpendingPreference>('/live/gift-spending-preference')
}

export function updateLiveGiftSpendingPreference(input: {
  singleLimitCoin: number
  dailyLimitCoin: number
  reminderEnabled?: boolean
}) {
  return apiPut<LiveGiftSpendingPreference>('/live/gift-spending-preference', input)
}

/**
 * 送礼响应体 = 服务端 giftRecord。
 * `live.service.ts::sendGift` 在扣币 + 建记录 + 主播分账的同一事务提交成功后才返回它，
 * 因此收到该对象即代表交易已确认成功；`record.id` 是全链路唯一且稳定的记录标识。
 */
export interface SendLiveGiftResult {
  /** giftRecord.id，与房间广播里的 recordId 同源，用于去重 */
  recordId: string
  totalCoin: number
  quantity: number
  /** 服务端返回的原始记录，交由展示层归一化（见 pkg-live/gift-feed.ts） */
  record: SendLiveGiftRecord | null
}

export interface SendLiveGiftRecord {
  id?: string
  userId?: string
  liveRoomId?: string
  giftId?: string
  quantity?: number
  totalCoin?: number
  createdAt?: string
  user?: { id?: string; nickname?: string; avatar?: string } | null
  gift?: { id?: string; name?: string; icon?: string | null; level?: string } | null
}

/** 每次明确送礼动作生成一次幂等键；底层网络重试复用同一请求体。 */
export async function sendLiveGift(roomId: string, giftId: string, quantity = 1): Promise<SendLiveGiftResult> {
  const idempotencyKey = `live-gift:${roomId}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 12)}`
  const value = await apiPost<SendLiveGiftRecord>(
    `/live/rooms/${roomId}/gifts`,
    { giftId, quantity, idempotencyKey },
  )
  return {
    recordId: String(value?.id || ''),
    totalCoin: Number(value?.totalCoin) || 0,
    quantity: Number(value?.quantity) || quantity,
    record: value || null,
  }
}

/** 点赞为用户级幂等动作，始终使用服务端返回的真实总数。 */
export async function likeLiveRoom(roomId: string) {
  const value = await apiPost<{ likeCount?: number }>(`/live/rooms/${roomId}/like`)
  return { likeCount: Number(value?.likeCount) || 0 }
}
