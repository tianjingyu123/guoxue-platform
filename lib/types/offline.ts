// 线下课程相关类型

// 线下课程状态
export type OfflineCourseStatus = 'upcoming' | 'enrolling' | 'full' | 'ongoing' | 'ended' | 'cancelled'

// 签到状态
export type CheckinStatus = 'not_started' | 'checking_in' | 'checked_in' | 'checked_out' | 'missed'

// 线下课程信息
export interface OfflineCourse {
  id: number
  title: string
  cover: string
  // 讲师
  instructor: {
    id: number
    name: string
    avatar: string
    title?: string
  }
  // 驿站信息
  stationId?: number
  stationName?: string
  // 时间
  startTime: string
  endTime: string
  // 地点
  address: string
  location?: {
    name: string
    address: string
    latitude?: number
    longitude?: number
  }
  // 价格
  price?: number
  originalPrice?: number
  // 状态
  status: OfflineCourseStatus
  // 报名信息
  maxParticipants?: number
  currentParticipants?: number
  enrolledCount?: number
  maxEnrollment?: number
  // 签到信息
  checkinStart?: string
  checkinEnd?: string
  checkinRequired?: boolean
  // 标签和描述
  tags?: string[]
  description?: string
}

// 签到记录
export interface CheckinRecord {
  id: number
  courseId: number
  userId: number
  // 签到时间
  checkinTime?: string
  // 签退时间
  checkoutTime?: string
  // 签到方式
  checkinMethod: 'qrcode' | 'code' | 'location' | 'manual'
  // 状态
  status: CheckinStatus
  // 签到位置
  checkinLocation?: {
    latitude: number
    longitude: number
    distance?: number
  }
}

// 签到请求
export interface CheckinRequest {
  courseId: number
  // 签到码（手动输入）
  code?: string
  // 扫码内容
  qrContent?: string
  // 当前位置
  location?: {
    latitude: number
    longitude: number
  }
}

// 签到响应
export interface CheckinResponse {
  success: boolean
  record?: CheckinRecord
  message: string
  // 签到排名（第几个签到）
  rank?: number
  // 获得的积分
  points?: number
}

// 课程签到详情
export interface CourseCheckinDetail {
  course: OfflineCourse
  myRecord?: CheckinRecord
  // 签到统计
  stats: {
    total: number
    checkedIn: number
    checkedOut: number
  }
  // 签到码（管理员可见）
  checkinCode?: string
}

// ========== 课程详情扩展 ==========

// 课程大纲项
export interface CourseOutlineItem {
  id: number
  title: string
  duration: string
  description?: string
}

// 课程详情（扩展信息）
export interface OfflineCourseDetail extends OfflineCourse {
  // 详细介绍（富文本）
  content?: string
  // 课程大纲
  outline?: CourseOutlineItem[]
  // 讲师详细信息
  instructorDetail?: {
    id: number
    name: string
    avatar: string
    title: string
    introduction: string
    specialties: string[]
    courseCount: number
    studentCount: number
  }
  // 报名须知
  enrollNotice?: string
  // 退款规则
  refundPolicy?: string
  // 我的报名状态
  myEnrollment?: {
    id: number
    status: 'pending' | 'confirmed' | 'cancelled' | 'refunded'
    enrollTime: string
    qrCode?: string  // 入场二维码
    seatNo?: string  // 座位号
  }
  // 报名学员列表（部分）
  enrolledUsers?: {
    id: number
    name: string
    avatar: string
  }[]
}

// ========== 线下驿站相关 ==========

// 驿站类型
export type StationType = 'center' | 'academy' | 'studio' | 'partner'

// 驿站状态
export type StationStatus = 'open' | 'closed' | 'renovation'

// 驿站营业时间
export interface BusinessHours {
  day: string
  open: string
  close: string
  isOpen: boolean
}

// 驿站设施
export type StationFacility = 'wifi' | 'parking' | 'tea' | 'library' | 'meditation' | 'classroom' | 'consultation'

// 驿站信息
export interface Station {
  id: number
  name: string
  type: StationType
  status: StationStatus
  // 图片
  cover: string
  images: string[]
  // 地址
  address: string
  city: string
  district: string
  latitude: number
  longitude: number
  // 距离（米）
  distance?: number
  // 联系方式
  phone: string
  // 营业时间
  businessHours: BusinessHours[]
  // 设施
  facilities: StationFacility[]
  // 评分
  rating: number
  reviewCount: number
  // 简介
  description: string
  // 标签
  tags: string[]
  // 是否收藏
  isFavorited: boolean
}

// 驿站列表响应
export interface StationListResponse {
  list: Station[]
  total: number
  hasMore: boolean
}

// 驿站详情
export interface StationDetail extends Station {
  // 驿站主理人
  manager?: {
    id: number
    name: string
    avatar: string
    title: string
  }
  // 近期活动
  upcomingEvents: {
    id: number
    title: string
    date: string
    type: string
  }[]
  // 入驻讲师
  instructors: {
    id: number
    name: string
    avatar: string
    specialty: string
  }[]
  // 用户评价
  reviews: {
    id: number
    user: { name: string; avatar: string }
    rating: number
    content: string
    time: string
  }[]
}

// ========== 讲师预约相关 ==========

// 讲师信息
export interface Teacher {
  id: number
  name: string
  avatar: string
  title: string
  specialties: string[]
  introduction: string
  rating: number
  reviewCount: number
  bookingCount: number
  // 咨询价格（元/小时）
  hourlyRate: number
  // 可预约
  isAvailable: boolean
}

// 预约时段
export interface TimeSlot {
  id: string
  startTime: string  // HH:mm
  endTime: string    // HH:mm
  isAvailable: boolean
  price: number
}

// 预约日期可用性
export interface DateAvailability {
  date: string  // YYYY-MM-DD
  slots: TimeSlot[]
  hasAvailableSlots: boolean
}

// 预约状态
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'refunded'

// 预约记录
export interface TeacherBooking {
  id: number
  // 讲师信息
  teacher: {
    id: number
    name: string
    avatar: string
    title: string
  }
  // 驿站信息
  stationId: number
  stationName: string
  // 预约时间
  date: string
  startTime: string
  endTime: string
  // 咨询主题
  topic: string
  description?: string
  // 费用
  price: number
  // 状态
  status: BookingStatus
  // 创建时间
  createdAt: string
  // 备注
  remark?: string
}

// 创建预约请求
export interface CreateBookingRequest {
  teacherId: number
  stationId: number
  date: string
  slotId: string
  topic: string
  description?: string
}

// ========== 驿站商品相关 ==========

// 商品分类
export type StationProductCategory = 'book' | 'tool' | 'tea' | 'incense' | 'ornament' | 'other'

// 驿站商品
export interface StationProduct {
  id: number
  name: string
  cover: string
  images: string[]
  // 分类
  category: StationProductCategory
  // 价格
  price: number
  originalPrice?: number
  // 库存
  stock: number
  // 销量
  sales: number
  // 驿站
  stationId: number
  stationName?: string
  // 简介
  description?: string
  // 标签
  tags?: string[]
  // 状态
  isOnSale: boolean
}

// 商品列表响应
export interface StationProductListResponse {
  list: StationProduct[]
  total: number
  hasMore: boolean
}

// ========== 驿站订单相关 ==========

// 订单类型
export type OfflineOrderType = 'course' | 'product' | 'booking'

// 订单状态
export type OfflineOrderStatus = 'pending' | 'paid' | 'confirmed' | 'completed' | 'cancelled' | 'refunding' | 'refunded'

// 订单商品项
export interface OfflineOrderItem {
  id: number
  type: OfflineOrderType
  // 关联ID
  refId: number
  // 标题/名称
  title: string
  cover: string
  // 数量
  quantity: number
  // 单价
  price: number
  // 规格（如有）
  spec?: string
}

// 驿站订单
export interface OfflineOrder {
  id: number
  orderNo: string
  // 订单类型
  type: OfflineOrderType
  // 订单状态
  status: OfflineOrderStatus
  // 驿站
  stationId: number
  stationName: string
  // 订单项
  items: OfflineOrderItem[]
  // 金额
  totalAmount: number
  payAmount: number
  discountAmount?: number
  // 时间
  createdAt: string
  paidAt?: string
  completedAt?: string
  // 备注
  remark?: string
  // 课程/预约特有
  scheduleTime?: string
  // 收货信息（商品订单）
  shippingInfo?: {
    name: string
    phone: string
    address: string
  }
}

// 订单列表响应
export interface OfflineOrderListResponse {
  list: OfflineOrder[]
  total: number
  hasMore: boolean
}

// ========== 驿站结算相关 ==========

// 结算状态
export type SettlementStatus = 'pending' | 'processing' | 'completed' | 'failed'

// 收入类型
export type IncomeType = 'course' | 'product' | 'booking' | 'commission'

// 结算明细项
export interface SettlementItem {
  id: number
  type: IncomeType
  title: string
  orderId?: number
  orderNo?: string
  amount: number
  time: string
}

// 扣除项
export interface DeductionItem {
  id: number
  type: string
  title: string
  amount: number
  remark?: string
}

// 结算记录
export interface Settlement {
  id: number
  settlementNo: string
  // 结算周期
  periodStart: string
  periodEnd: string
  // 驿站
  stationId: number
  stationName: string
  // 金额
  totalIncome: number
  totalDeduction: number
  netAmount: number
  // 状态
  status: SettlementStatus
  // 时间
  createdAt: string
  completedAt?: string
  // 备注
  remark?: string
}

// 结算详情
export interface SettlementDetail extends Settlement {
  // 收入明细
  incomeItems: SettlementItem[]
  // 扣除明细
  deductionItems: DeductionItem[]
  // 按类型统计
  incomeByType: {
    type: IncomeType
    count: number
    amount: number
  }[]
}

// 结算统计
export interface SettlementStats {
  totalIncome: number
  totalDeduction: number
  totalNetAmount: number
  pendingAmount: number
  completedCount: number
}

// 结算列表响应
export interface SettlementListResponse {
  list: Settlement[]
  total: number
  hasMore: boolean
  stats: SettlementStats
}
