// 预约记录相关 API

import { apiGet, apiPost } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { BookingItem, BookingsResponse, BookingType, BookingStatus } from '../types/bookings'

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== 'false'

// Mock 数据
const mockBookings: BookingItem[] = [
  {
    id: 1,
    type: 'call',
    target: {
      id: 101,
      name: '张玄明',
      avatar: '/placeholder.svg?height=48&width=48',
      title: '资深命理师'
    },
    bookingTime: '2026-06-05 14:00',
    duration: 30,
    status: 'confirmed',
    createdAt: '2026-06-03 10:30',
    remark: '咨询八字流年运势',
    canCancel: true,
    cancelDeadline: '2026-06-05 12:00'
  },
  {
    id: 2,
    type: 'offline_course',
    target: {
      id: 201,
      name: '国学经典读书会',
      title: '第三期·论语精读'
    },
    bookingTime: '2026-06-08 09:00',
    duration: 180,
    location: '北京市朝阳区国学文化中心3层',
    status: 'pending',
    createdAt: '2026-06-02 15:20',
    canCancel: true,
    cancelDeadline: '2026-06-07 18:00'
  },
  {
    id: 3,
    type: 'instructor',
    target: {
      id: 301,
      name: '李易阳',
      avatar: '/placeholder.svg?height=48&width=48',
      title: '风水大师·高级讲师'
    },
    bookingTime: '2026-06-10 10:00',
    duration: 60,
    status: 'confirmed',
    createdAt: '2026-06-01 09:00',
    remark: '预约风水堪舆指导',
    canCancel: true,
    cancelDeadline: '2026-06-09 18:00'
  },
  {
    id: 4,
    type: 'call',
    target: {
      id: 102,
      name: '王紫微',
      avatar: '/placeholder.svg?height=48&width=48',
      title: '紫微斗数专家'
    },
    bookingTime: '2026-06-01 16:00',
    duration: 45,
    status: 'completed',
    createdAt: '2026-05-28 14:00',
    remark: '紫微命盘详解',
    canCancel: false
  },
  {
    id: 5,
    type: 'offline_course',
    target: {
      id: 202,
      name: '八字命理实战班',
      title: '初级班·第一期'
    },
    bookingTime: '2026-05-25 14:00',
    duration: 240,
    location: '上海市静安区易学研究院',
    status: 'completed',
    createdAt: '2026-05-20 11:30',
    canCancel: false
  },
  {
    id: 6,
    type: 'instructor',
    target: {
      id: 302,
      name: '陈道长',
      avatar: '/placeholder.svg?height=48&width=48',
      title: '道家养生专家'
    },
    bookingTime: '2026-05-20 09:00',
    duration: 90,
    status: 'cancelled',
    createdAt: '2026-05-15 16:00',
    remark: '因个人原因取消',
    canCancel: false
  },
  {
    id: 7,
    type: 'call',
    target: {
      id: 103,
      name: '赵玄真',
      avatar: '/placeholder.svg?height=48&width=48',
      title: '六爻预测师'
    },
    bookingTime: '2026-05-10 11:00',
    duration: 30,
    status: 'expired',
    createdAt: '2026-05-05 10:00',
    canCancel: false
  }
]

/**
 * 获取预约记录列表
 */
export async function getBookings(
  page: number = 1,
  pageSize: number = 20,
  type?: BookingType
): Promise<ApiResponse<BookingsResponse>> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 500))
    let filtered = mockBookings
    if (type) {
      filtered = mockBookings.filter(b => b.type === type)
    }
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const list = filtered.slice(start, end)
    return {
      code: 200,
      data: {
        list,
        total: filtered.length,
        hasMore: end < filtered.length
      },
      message: 'success'
    }
  }
  
  return apiGet<BookingsResponse>('/api/user/bookings', { page, pageSize, type })
}

/**
 * 取消预约
 */
export async function cancelBooking(bookingId: number): Promise<ApiResponse<null>> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 400))
    return {
      code: 200,
      data: null,
      message: '取消成功'
    }
  }
  
  return apiPost<null>(`/api/bookings/${bookingId}/cancel`)
}

/**
 * 获取预约类型名称
 */
export function getBookingTypeName(type: BookingType): string {
  const names: Record<BookingType, string> = {
    call: '连麦咨询',
    offline_course: '线下课程',
    instructor: '讲师排期'
  }
  return names[type] || '预约'
}

/**
 * 获取预约状态名称
 */
export function getBookingStatusName(status: BookingStatus): string {
  const names: Record<BookingStatus, string> = {
    pending: '待确认',
    confirmed: '已确认',
    completed: '已完成',
    cancelled: '已取消',
    expired: '已过期'
  }
  return names[status] || '未知'
}

/**
 * 获取预约状态样式
 */
export function getBookingStatusStyle(status: BookingStatus): { bg: string; text: string } {
  const styles: Record<BookingStatus, { bg: string; text: string }> = {
    pending: { bg: 'bg-amber-50', text: 'text-amber-600' },
    confirmed: { bg: 'bg-green-50', text: 'text-green-600' },
    completed: { bg: 'bg-gray-100', text: 'text-gray-500' },
    cancelled: { bg: 'bg-red-50', text: 'text-red-500' },
    expired: { bg: 'bg-gray-100', text: 'text-gray-400' }
  }
  return styles[status] || { bg: 'bg-gray-100', text: 'text-gray-500' }
}

/**
 * 生成日历事件数据（用于添加到系统日历）
 */
export function generateCalendarEvent(booking: BookingItem) {
  const startDate = new Date(booking.bookingTime.replace(' ', 'T'))
  const endDate = new Date(startDate.getTime() + (booking.duration || 60) * 60 * 1000)
  
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/-|:|\.\d{3}/g, '').slice(0, 15) + 'Z'
  }
  
  const title = `${getBookingTypeName(booking.type)} - ${booking.target.name}`
  const description = booking.remark || ''
  const location = booking.location || '线上'
  
  // 生成 ICS 格式的日历链接
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `DTSTART:${formatDate(startDate)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\n')
  
  return {
    title,
    startDate,
    endDate,
    location,
    description,
    icsContent
  }
}
