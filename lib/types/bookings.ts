// 预约记录相关类型定义

// 预约类型
export type BookingType = 'call' | 'offline_course' | 'instructor'

// 预约状态
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'expired'

// 预约记录项
export interface BookingItem {
  id: number
  // 预约类型
  type: BookingType
  // 预约对象信息
  target: {
    id: number
    name: string
    avatar?: string
    title?: string // 讲师头衔/课程名称
  }
  // 预约时间
  bookingTime: string
  // 预约时长（分钟）
  duration?: number
  // 预约地点（线下课程）
  location?: string
  // 预约状态
  status: BookingStatus
  // 创建时间
  createdAt: string
  // 备注
  remark?: string
  // 是否可取消
  canCancel: boolean
  // 取消截止时间
  cancelDeadline?: string
}

// 预约记录列表响应
export interface BookingsResponse {
  list: BookingItem[]
  total: number
  hasMore: boolean
}
