import { apiGetOptionalAuth } from '@/utils/request'

/** 游客可读真实预约人数；未登录时 isBooked 固定为 false。 */
export async function getBookingStatus(roomId: string) {
  const value = await apiGetOptionalAuth<{ bookingCount?: number; isBooked?: boolean }>(
    `/live/rooms/${roomId}/bookings`,
  )
  return { bookingCount: Number(value?.bookingCount) || 0, isBooked: !!value?.isBooked }
}
