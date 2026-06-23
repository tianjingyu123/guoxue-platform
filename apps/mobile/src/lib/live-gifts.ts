// 直播礼物清单（GiftPanel 与各直播间共用）
// @data-needs: 礼物清单接口；送礼后扣减国学币余额
import { apiGet, apiPost, useMock } from '@/utils/request'

export interface LiveGift {
  id: number
  name: string
  icon: string
  price: number
  level: 1 | 2 | 3
}

// 国学风格礼物（含动效等级），与原型一致
export const LIVE_GIFTS: LiveGift[] = [
  { id: 1, name: '太极', icon: '☯️', price: 1, level: 1 },
  { id: 2, name: '梅花', icon: '🌸', price: 10, level: 1 },
  { id: 3, name: '竹简', icon: '📜', price: 52, level: 1 },
  { id: 4, name: '罗盘', icon: '🧭', price: 99, level: 2 },
  { id: 5, name: '如意', icon: '🪬', price: 199, level: 2 },
  { id: 6, name: '八卦阵', icon: '🔯', price: 366, level: 2 },
  { id: 7, name: '金龙献瑞', icon: '🐉', price: 520, level: 3 },
  { id: 8, name: '紫微星耀', icon: '🌟', price: 1888, level: 3 },
]

// ===== API 对象 =====

export const liveGiftsApi = {
  /** 获取礼物清单 GET /live/gifts */
  async list(): Promise<LiveGift[]> {
    if (useMock()) return LIVE_GIFTS
    try {
      return await apiGet<LiveGift[]>('/live/gifts')
    } catch {
      return LIVE_GIFTS
    }
  },

  /** 发送礼物 POST /live/gifts/send */
  async send(giftId: number, liveId: string): Promise<{ success: boolean; balance: number }> {
    if (useMock()) return { success: true, balance: 1000 }
    try {
      return await apiPost<{ success: boolean; balance: number }>('/live/gifts/send', { giftId, liveId })
    } catch {
      return { success: false, balance: 0 }
    }
  },
}
