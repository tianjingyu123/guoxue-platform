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

/** 每次明确送礼动作生成一次幂等键；底层网络重试复用同一请求体。 */
export async function sendLiveGift(roomId: string, giftId: string, quantity = 1) {
  const idempotencyKey = `live-gift:${roomId}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 12)}`
  const value = await apiPost<{ totalCoin?: number }>(
    `/live/rooms/${roomId}/gifts`,
    { giftId, quantity, idempotencyKey },
  )
  return { totalCoin: Number(value?.totalCoin) || 0 }
}

/** 点赞为用户级幂等动作，始终使用服务端返回的真实总数。 */
export async function likeLiveRoom(roomId: string) {
  const value = await apiPost<{ likeCount?: number }>(`/live/rooms/${roomId}/like`)
  return { likeCount: Number(value?.likeCount) || 0 }
}
