import type { TimMessage } from '@/composables/useTim'

export interface LiveGiftTimEvent {
  type: 'LIVE_GIFT'
  recordId: string
  giftId: string
  giftName: string
  quantity: number
}

export function readLiveGiftTimEvent(message: TimMessage): LiveGiftTimEvent | null {
  const raw = message.payload?.data
  if (typeof raw !== 'string' || !raw) return null
  try {
    const value = JSON.parse(raw) as Partial<LiveGiftTimEvent>
    const quantity = Number(value.quantity)
    if (
      value.type !== 'LIVE_GIFT'
      || typeof value.recordId !== 'string'
      || typeof value.giftId !== 'string'
      || typeof value.giftName !== 'string'
      || !Number.isInteger(quantity)
      || quantity < 1
      || quantity > 999
    ) return null
    return {
      type: 'LIVE_GIFT',
      recordId: value.recordId,
      giftId: value.giftId,
      giftName: value.giftName,
      quantity,
    }
  } catch {
    return null
  }
}

export function formatLiveGiftTimEvent(event: LiveGiftTimEvent) {
  return `送出 ${event.giftName} x${event.quantity}`
}
