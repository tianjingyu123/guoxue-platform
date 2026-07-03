// 线下驿站板块数据层 —— 真连 @guoxue/server /offline/*
// 定位：平台线下服务终端（线上引流·线下交付）。驿站=地级市线下场地，研究院签约讲师授课。
// 后端 StationOffline 为准，原型虚构字段(评分/距离/坐标/营业评价)已诚实降级。
import { apiGet, apiGetPaged, apiPost, apiPut, apiDelete } from '@/utils/request'

export type StationType = 'center' | 'academy' | 'studio' | 'partner'

export interface BusinessHour { day: string; open: string; close: string; isOpen: boolean }
export interface UserBrief { id: string; nickname: string; avatar?: string | null }

export interface Station {
  id: string
  name: string
  city: string
  address: string
  phone: string
  cover: string | null
  type: StationType | null
  intro: string | null
  businessHours: BusinessHour[] | null
  images: string[]
  tags: string[]
  facilities: string[]
  status: string // PENDING/ACTIVE/DISABLED
  _count?: { courses: number; products: number }
  owner?: UserBrief
}

export interface StationTeacherLite {
  id: string
  name: string
  avatar: string | null
  specialties: string[]
  bio?: string | null
  sourceUserId?: string | null // 非 null=研究院签约讲师
}

export interface OfflineCourse {
  id: string
  stationId: string
  title: string
  cover: string | null
  intro: string | null
  teacherId: string | null
  teacher?: StationTeacherLite | null
  price: string | number
  maxStudents: number
  startTime: string
  endTime: string
  location: string
  status: string
  auditStatus: string
  auditReason?: string | null
  /** 课程同学圈（可选·有值=已建圈，跳 /pkg-circle/circles/detail?id=） */
  circleId?: string | null
  _count?: { registrations: number }
  station?: { id: string; name: string; address?: string; phone?: string; city?: string }
}

/** 课后评价（GET /offline/courses/:id/reviews 分页项·昵称头像后端已脱敏） */
export interface CourseReview {
  id?: string
  rating: number // 1-5
  content: string | null
  createdAt: string
  nickname: string
  avatar: string | null
}

/** 驿站评分聚合（驿站详情可选字段·无评价时后端省略→前端不渲染） */
export interface StationRating {
  avg: number
  count: number
}

export interface CourseRegistration {
  id: string
  courseId: string
  userId: string
  status: string // REGISTERED/SIGNED_IN/CANCELLED
  qrCode: string | null
  signedAt: string | null
}

export interface MyRegistration {
  id: string
  courseId: string
  userId: string
  status: string // REGISTERED/SIGNED_IN/CANCELLED
  qrCode: string | null
  signedAt: string | null
  course: OfflineCourse & { station?: { id: string; name: string; address?: string; phone?: string }; teacher?: StationTeacherLite | null }
}

export interface StationDetail extends Station {
  courses: OfflineCourse[]
  products: { id: string; name: string; price: string | number; stock: number; status: string }[]
  teacherBookings?: unknown[] // 后端透传、形状未建模且无页面消费 → unknown 占位
  /** 评分聚合（可选·无评价时字段不存在→不渲染评分区） */
  rating?: StationRating
}

export interface OfflineCourseDetail extends OfflineCourse {
  registrations: CourseRegistration[]
}

// 派生报名状态（后端无单独报名状态字段，按时间/容量/审核推导）
export type DerivedCourseStatus = 'enrolling' | 'full' | 'ongoing' | 'ended' | 'cancelled' | 'draft'

export function deriveCourseStatus(c: OfflineCourse): DerivedCourseStatus {
  if (c.status === 'CANCELLED') return 'cancelled'
  if (c.auditStatus !== 'APPROVED' || c.status === 'DRAFT') return 'draft'
  const now = Date.now()
  const start = new Date(c.startTime).getTime()
  const end = new Date(c.endTime).getTime()
  if (now > end) return 'ended'
  if (now >= start && now <= end) return 'ongoing'
  const registered = c._count?.registrations ?? 0
  if (registered >= c.maxStudents) return 'full'
  return 'enrolling'
}

export const courseStatusLabel: Record<DerivedCourseStatus, string> = {
  enrolling: '报名中', full: '已满员', ongoing: '进行中', ended: '已结束', cancelled: '已取消', draft: '未发布',
}
export const courseStatusStyle: Record<DerivedCourseStatus, { color: string; bg: string }> = {
  enrolling: { color: '#16a34a', bg: '#f0fdf4' },
  full: { color: '#ea580c', bg: '#fff7ed' },
  ongoing: { color: '#9333ea', bg: '#faf5ff' },
  ended: { color: '#6b7280', bg: '#f3f4f6' },
  cancelled: { color: '#dc2626', bg: '#fef2f2' },
  draft: { color: '#6b7280', bg: '#f3f4f6' },
}

// ===== 驿站类型 / 设施 / 状态 工具 =====
export const stationTypeLabel: Record<StationType, string> = {
  center: '国学中心', academy: '书院', studio: '工作室', partner: '合作点',
}
export const stationTypeFilters: { value: StationType | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'center', label: '国学中心' },
  { value: 'academy', label: '书院' },
  { value: 'studio', label: '工作室' },
  { value: 'partner', label: '合作点' },
]
export function getStationTypeLabel(type?: string | null): string {
  if (!type) return '驿站'
  return stationTypeLabel[type as StationType] || '驿站'
}
export const facilityInfo: Record<string, { icon: string; label: string }> = {
  wifi: { icon: 'wifi', label: 'WiFi' },
  parking: { icon: 'car', label: '停车场' },
  tea: { icon: 'coffee', label: '茶室' },
  library: { icon: 'book-open', label: '藏书阁' },
  meditation: { icon: 'heart', label: '禅修室' },
  classroom: { icon: 'users', label: '教室' },
  consultation: { icon: 'message-circle', label: '咨询室' },
}
export function getFacilityInfo(facility: string): { icon: string; label: string } {
  return facilityInfo[facility] || { icon: 'check', label: facility }
}
export const stationStatusLabel: Record<string, string> = {
  PENDING: '筹备中', ACTIVE: '营业中', DISABLED: '已停业',
}

// ===== 时间格式化 =====
export function fmtDate(s?: string | null): string {
  if (!s) return ''
  const d = new Date(s)
  if (isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
export function fmtCourseTime(s?: string | null): string {
  if (!s) return ''
  const d = new Date(s)
  if (isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}月${d.getDate()}日 ${p(d.getHours())}:${p(d.getMinutes())}`
}
export function courseDateRange(c: OfflineCourse): string {
  const s = new Date(c.startTime)
  const e = new Date(c.endTime)
  if (isNaN(s.getTime())) return ''
  const sameDay = s.toDateString() === e.toDateString()
  return sameDay ? fmtCourseTime(c.startTime) + ' 结束' : fmtDate(c.startTime) + ' 至 ' + fmtDate(c.endTime)
}
export const num = (v: string | number | null | undefined) => (v == null ? 0 : typeof v === 'string' ? parseFloat(v) || 0 : v)

// ===== 预约状态（teacher-booking）=====
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED'
export const bookingStatusLabel: Record<BookingStatus, string> = {
  PENDING: '待确认', CONFIRMED: '已确认', CANCELLED: '已取消',
}
export const bookingStatusStyle: Record<BookingStatus, { color: string; bg: string }> = {
  PENDING: { color: '#ea580c', bg: '#fff7ed' },
  CONFIRMED: { color: '#16a34a', bg: '#f0fdf4' },
  CANCELLED: { color: '#6b7280', bg: '#f3f4f6' },
}

// ===== 驿站活动（StationEvent·T8-P1a）=====
export type StationEventType = 'YAJI' | 'SALON' | 'READING' | 'SOLAR_TERM' | 'EXPERIENCE'

export const eventTypeLabel: Record<StationEventType, string> = {
  YAJI: '雅集', SALON: '沙龙', READING: '读书会', SOLAR_TERM: '节气活动', EXPERIENCE: '体验课',
}
export function getEventTypeLabel(type?: string | null): string {
  if (!type) return '活动'
  return eventTypeLabel[type as StationEventType] || '活动'
}
export const eventTypeFilters: { value: StationEventType | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'YAJI', label: '雅集' },
  { value: 'SALON', label: '沙龙' },
  { value: 'READING', label: '读书会' },
  { value: 'SOLAR_TERM', label: '节气活动' },
  { value: 'EXPERIENCE', label: '体验课' },
]
export const eventTypeStyle: Record<StationEventType, { color: string; bg: string }> = {
  YAJI: { color: '#9333ea', bg: '#faf5ff' },
  SALON: { color: '#2563eb', bg: '#eff6ff' },
  READING: { color: '#16a34a', bg: '#f0fdf4' },
  SOLAR_TERM: { color: '#ea580c', bg: '#fff7ed' },
  EXPERIENCE: { color: '#0891b2', bg: '#ecfeff' },
}
export function getEventTypeStyle(type?: string | null): { color: string; bg: string } {
  return eventTypeStyle[type as StationEventType] || { color: '#6b7280', bg: '#f3f4f6' }
}

export interface StationEvent {
  id: string
  stationId: string
  title: string
  type: StationEventType | string
  cover: string | null
  intro: string | null
  price: string | number
  maxAttendees: number
  startTime: string
  endTime: string
  location: string
  status: string // DRAFT/PUBLISHED/CANCELLED/FINISHED
  circleId?: string | null
  photos?: string[] | null
  _count?: { registrations: number }
  station?: { id: string; name: string; address?: string; phone?: string; city?: string }
}

export interface EventRegistration {
  id: string
  eventId: string
  userId: string
  status: string // REGISTERED/SIGNED_IN/CANCELLED
  qrCode: string | null
  signedAt: string | null
}

/** 活动详情（GET /offline/events/:id·photos=回顾照片·myRegistration 登录时返回） */
export interface StationEventDetail extends StationEvent {
  photos?: string[] | null
  myRegistration?: EventRegistration | null
}

/** 我的活动报名（GET /offline/my-event-registrations 项） */
export interface MyEventRegistration extends EventRegistration {
  event: StationEvent & { station?: { id: string; name: string; address?: string; phone?: string } }
}

/** 活动派生报名状态（与课程同构：状态机 + 时间/容量推导，复用 courseStatusLabel/Style 展示） */
export function deriveEventStatus(e: StationEvent): DerivedCourseStatus {
  if (e.status === 'CANCELLED') return 'cancelled'
  if (e.status === 'DRAFT') return 'draft'
  if (e.status === 'FINISHED') return 'ended'
  const now = Date.now()
  const start = new Date(e.startTime).getTime()
  const end = new Date(e.endTime).getTime()
  if (now > end) return 'ended'
  if (now >= start && now <= end) return 'ongoing'
  const registered = e._count?.registrations ?? 0
  if (e.maxAttendees > 0 && registered >= e.maxAttendees) return 'full'
  return 'enrolling'
}

/** B 端原始状态标签/色（全状态列表用） */
export const eventStatusLabel: Record<string, string> = {
  DRAFT: '草稿', PUBLISHED: '已发布', CANCELLED: '已取消', FINISHED: '已结束',
}
export const eventStatusStyle: Record<string, { color: string; bg: string }> = {
  DRAFT: { color: '#6b7280', bg: '#f3f4f6' },
  PUBLISHED: { color: '#16a34a', bg: '#f0fdf4' },
  CANCELLED: { color: '#dc2626', bg: '#fef2f2' },
  FINISHED: { color: '#0891b2', bg: '#ecfeff' },
}

/** 起止时间人话（同日=「7月5日 14:00 - 16:00」，跨日=「2026-07-05 至 2026-07-06」） */
export function eventTimeRange(startTime?: string | null, endTime?: string | null): string {
  if (!startTime) return ''
  const s = new Date(startTime)
  const e = new Date(endTime || startTime)
  if (isNaN(s.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  if (s.toDateString() === e.toDateString()) {
    return `${fmtCourseTime(startTime)} - ${p(e.getHours())}:${p(e.getMinutes())}`
  }
  return `${fmtDate(startTime)} 至 ${fmtDate(endTime)}`
}

// ===== 统一经营日历（GET /offline/dashboard/calendar）=====
export type CalendarItemKind = 'course' | 'event' | 'booking'
export interface CalendarItem {
  kind: CalendarItemKind
  id: string
  title: string
  startTime: string
  endTime?: string | null
  status?: string
}
/** 日期(YYYY-MM-DD) → 当日安排列表 */
export type CalendarDays = Record<string, CalendarItem[]>

// ============ API 层 ============
export const offlineApi = {
  /** 驿站发现（用户端）GET /offline/stations/discover → {stations,total} */
  async discoverStations(params?: { city?: string; keyword?: string }): Promise<Station[]> {
    const q = new URLSearchParams()
    if (params?.city && params.city !== '全部') q.set('city', params.city)
    if (params?.keyword) q.set('keyword', params.keyword)
    q.set('pageSize', '100')
    const d = await apiGet<{ stations: Station[] }>(`/offline/stations/discover?${q.toString()}`)
    return d?.stations || []
  },

  /** 驿站详情 GET /offline/stations/:id（对象，含 courses/products）*/
  getStation(id: string): Promise<StationDetail> {
    return apiGet<StationDetail>(`/offline/stations/${id}`)
  },

  /** 课程列表 GET /offline/courses（不传 stationId=发现全部已发布；courses 命中拦截器拆包→数组）*/
  getCourses(stationId?: string): Promise<OfflineCourse[]> {
    const q = stationId ? `stationId=${stationId}&pageSize=100` : 'pageSize=100'
    return apiGet<OfflineCourse[]>(`/offline/courses?${q}`)
  },

  /** 课程详情 GET /offline/courses/:id（对象，含 teacher/station/registrations）*/
  getCourse(id: string): Promise<OfflineCourseDetail> {
    return apiGet<OfflineCourseDetail>(`/offline/courses/${id}`)
  },

  /** 报名 POST /offline/courses/:id/register */
  register(courseId: string): Promise<CourseRegistration> {
    return apiPost<CourseRegistration>(`/offline/courses/${courseId}/register`)
  },

  /** 我的报名记录（签到凭证）GET /offline/courses/:id/my-registration，未报名返回 null */
  getMyRegistration(courseId: string): Promise<MyRegistration | null> {
    return apiGet<MyRegistration | null>(`/offline/courses/${courseId}/my-registration`)
  },

  /** 取消报名 POST /offline/courses/:id/cancel */
  cancelRegistration(courseId: string): Promise<{ success?: boolean }> {
    return apiPost<{ success?: boolean }>(`/offline/courses/${courseId}/cancel`)
  },

  /** 课程报名列表 GET /offline/courses/:id/registrations → {registrations,...}? 用 _count 即可，少用 */
  getRegistrations(courseId: string): Promise<{ registrations: CourseRegistration[]; total: number }> {
    return apiGet<{ registrations: CourseRegistration[]; total: number }>(`/offline/courses/${courseId}/registrations?pageSize=200`)
  },

  /** 驿站讲师列表（公开）GET /offline/stations/:id/teachers → listTeachers {teachers,total} */
  async getStationTeachers(stationId: string): Promise<StationTeacherLite[]> {
    const d = await apiGet<{ teachers: StationTeacherLite[] }>(`/offline/stations/${stationId}/teachers`)
    return d?.teachers || []
  },

  /** 创建师资预约 POST /offline/stations/:id/teacher-bookings */
  createBooking(stationId: string, data: { teacherId: string; bookingDate: string; courseId?: string; price?: number; remark?: string }): Promise<unknown> {
    return apiPost<unknown>(`/offline/stations/${stationId}/teacher-bookings`, data)
  },

  /** 扫码/签到码签到 POST /offline/courses/sign-in?stationId */
  signIn(stationId: string, qrCode: string): Promise<unknown> {
    return apiPost<unknown>(`/offline/courses/sign-in?stationId=${stationId}`, { qrCode })
  },

  /** 课程评价分页 GET /offline/courses/:id/reviews?page&pageSize（公开·错误抛给页面走三态） */
  getCourseReviews(courseId: string, page = 1, pageSize = 10): Promise<{ items: CourseReview[]; total: number }> {
    return apiGetPaged<CourseReview>(`/offline/courses/${courseId}/reviews?page=${page}&pageSize=${pageSize}`)
  },

  /** 提交课后评价 POST /offline/courses/:id/reviews（仅本人已签到·一报名一评·业务异常 message 直接 toast） */
  submitCourseReview(courseId: string, data: { rating: number; content?: string }): Promise<CourseReview> {
    return apiPost<CourseReview>(`/offline/courses/${courseId}/reviews`, data)
  },

  // ===== 驿站活动 C 端（T8-P1a）=====

  /** 活动列表（PUBLISHED）GET /offline/events?stationId&type&page&pageSize → 分页 {items,total} */
  getEvents(params?: { stationId?: string; type?: StationEventType | string; page?: number; pageSize?: number }): Promise<{ items: StationEvent[]; total: number }> {
    const q = new URLSearchParams()
    if (params?.stationId) q.set('stationId', params.stationId)
    if (params?.type && params.type !== 'all') q.set('type', String(params.type))
    q.set('page', String(params?.page || 1))
    q.set('pageSize', String(params?.pageSize || 20))
    return apiGetPaged<StationEvent>(`/offline/events?${q.toString()}`)
  },

  /** 活动详情 GET /offline/events/:id（含 photos 回顾照片 + 登录时 myRegistration） */
  getEvent(id: string): Promise<StationEventDetail> {
    return apiGet<StationEventDetail>(`/offline/events/${id}`)
  },

  /** 活动报名 POST /offline/events/:id/register（业务异常 message 直接 toast） */
  registerEvent(eventId: string): Promise<EventRegistration> {
    return apiPost<EventRegistration>(`/offline/events/${eventId}/register`)
  },

  /** 取消活动报名 POST /offline/events/:id/cancel-registration */
  cancelEventRegistration(eventId: string): Promise<{ success?: boolean }> {
    return apiPost<{ success?: boolean }>(`/offline/events/${eventId}/cancel-registration`)
  },

  /** 我的活动报名记录 GET /offline/my-event-registrations */
  getMyEventRegistrations(page = 1, pageSize = 20): Promise<{ items: MyEventRegistration[]; total: number }> {
    return apiGetPaged<MyEventRegistration>(`/offline/my-event-registrations?page=${page}&pageSize=${pageSize}`)
  },
}

// ============ B 端：驿站运营者经营后台 ============
export interface MyStation extends Station {
  _count?: { courses: number; products: number; teachers: number; teacherBookings: number }
}

export interface DashboardStats {
  totalOrders: number
  totalRevenue: string | number
  totalStationIncome: string | number
  settledAmount: string | number
  platformFee: string | number
  activeCourses: number
  activeProducts: number
  monthOrders: number
  monthRevenue: string | number
  monthStationIncome: string | number
}

export interface StationProduct {
  id: string
  name: string
  price: string | number
  stock: number
  isPlatform: boolean
  status: string
}

export interface SignedLecturer {
  id: string
  userId: string
  lecturerLevel: LecturerLevelStr
  joinYear: number
  tasksCompleted: number
  user: UserBrief
  enrolledStations: { stationId: string; name: string }[]
}
export type LecturerLevelStr = 'NONE' | 'PREPARATORY' | 'JUNIOR' | 'SENIOR' | 'SIGNED'

// ===== 工作台待办与排行（/offline/dashboard/* 由后端从 JWT 反查驿站，无需传 stationId）=====
export interface StockAlertItem {
  id: string
  name: string
  stock: number
  price: string | number
}
export interface PendingBookingItem {
  id: string
  teacherId: string
  bookingDate: string
  createdAt: string
  teacher?: { name: string } | null
}
export interface UpcomingCourseItem {
  id: string
  title: string
  startTime: string
  location: string
  _count?: { registrations: number }
}
export interface CourseRankItem {
  id: string
  title: string
  cover: string | null
  registrations: number
}
export interface ProductRankItem {
  id: string
  name: string
  sales: number
  amount: string | number | null
}

export interface CreateCoursePayload {
  stationId: string
  title: string
  intro?: string
  teacherId?: string
  price?: number
  maxStudents: number
  startTime: string
  endTime: string
  location: string
  cover?: string
}

export const offlineManageApi = {
  /** 我的驿站 GET /offline/stations/my（非驿站主返回 null）*/
  getMyStation(): Promise<MyStation | null> {
    return apiGet<MyStation | null>('/offline/stations/my')
  },

  /** 经营概览 GET /offline/stations/:id/revenue-dashboard */
  getDashboard(stationId: string): Promise<DashboardStats> {
    return apiGet<DashboardStats>(`/offline/stations/${stationId}/revenue-dashboard`)
  },

  /** 驿站全部课程（含草稿）GET /offline/courses?stationId（courses 拆包→数组）*/
  getManageCourses(stationId: string): Promise<OfflineCourse[]> {
    return apiGet<OfflineCourse[]>(`/offline/courses?stationId=${stationId}&pageSize=100`)
  },

  /** 创建课程 POST /offline/courses */
  createCourse(data: CreateCoursePayload): Promise<OfflineCourse> {
    return apiPost<OfflineCourse>('/offline/courses', data)
  },

  /** 课程报名列表 GET /offline/courses/:id/registrations */
  async getRegistrations(courseId: string): Promise<CourseRegistration[]> {
    const d = await apiGet<{ registrations?: CourseRegistration[] } | CourseRegistration[]>(`/offline/courses/${courseId}/registrations?pageSize=200`)
    return Array.isArray(d) ? d : d?.registrations || []
  },

  /** 扫码核销学员报名 POST /offline/courses/sign-in?stationId */
  signIn(stationId: string, qrCode: string): Promise<unknown> {
    return apiPost<unknown>(`/offline/courses/sign-in?stationId=${stationId}`, { qrCode })
  },

  /** 商品列表 GET /offline/stations/:id/products（products 拆包→数组）*/
  listProducts(stationId: string): Promise<StationProduct[]> {
    return apiGet<StationProduct[]>(`/offline/stations/${stationId}/products?pageSize=100`)
  },

  /** 上架商品 POST /offline/stations/:id/products */
  createProduct(stationId: string, data: { name: string; price: number; stock?: number; isPlatform?: boolean }): Promise<StationProduct> {
    return apiPost<StationProduct>(`/offline/stations/${stationId}/products`, data)
  },

  /** 更新商品 PUT /offline/products/:productId */
  updateProduct(productId: string, data: { name?: string; price?: number; stock?: number; status?: string }): Promise<StationProduct> {
    return apiPut<StationProduct>(`/offline/products/${productId}`, data)
  },

  /** 下架商品 DELETE /offline/products/:productId */
  deleteProduct(productId: string): Promise<unknown> {
    return apiDelete<unknown>(`/offline/products/${productId}`)
  },

  /** 研究院签约讲师库 GET /institute/signed-lecturers（驿站引入用）*/
  getSignedLecturers(): Promise<SignedLecturer[]> {
    return apiGet<SignedLecturer[]>('/institute/signed-lecturers')
  },

  /** 引入签约讲师 POST /offline/stations/:id/teachers/from-signed */
  createTeacherFromSigned(stationId: string, sourceUserId: string, specialties?: string[]): Promise<StationTeacherLite> {
    return apiPost<StationTeacherLite>(`/offline/stations/${stationId}/teachers/from-signed`, { sourceUserId, specialties })
  },

  /** 驿站讲师列表 GET /offline/stations/:id/teachers */
  async getStationTeachers(stationId: string): Promise<StationTeacherLite[]> {
    const d = await apiGet<{ teachers: StationTeacherLite[] }>(`/offline/stations/${stationId}/teachers`)
    return d?.teachers || []
  },

  // ===== 工作台待办与排行（错误向上抛，由页面分项容错）=====

  /** 库存预警商品（库存<=5）GET /offline/dashboard/stock-alerts → {alerts,count} */
  async getStockAlerts(): Promise<StockAlertItem[]> {
    const d = await apiGet<{ alerts: StockAlertItem[]; count: number }>('/offline/dashboard/stock-alerts')
    return d?.alerts || []
  },

  /** 待确认讲师预约 GET /offline/dashboard/pending-bookings → {bookings} */
  async getPendingBookings(): Promise<PendingBookingItem[]> {
    const d = await apiGet<{ bookings: PendingBookingItem[] }>('/offline/dashboard/pending-bookings')
    return d?.bookings || []
  },

  /** 即将开课（未来7天）GET /offline/dashboard/upcoming-courses → {courses} */
  async getUpcomingCourses(): Promise<UpcomingCourseItem[]> {
    const d = await apiGet<{ courses: UpcomingCourseItem[] }>('/offline/dashboard/upcoming-courses')
    return d?.courses || []
  },

  /** 最受欢迎课程排行 GET /offline/dashboard/course-ranking → {ranking} */
  async getCourseRanking(): Promise<CourseRankItem[]> {
    const d = await apiGet<{ ranking: CourseRankItem[] }>('/offline/dashboard/course-ranking')
    return d?.ranking || []
  },

  /** 热销商品排行 GET /offline/dashboard/product-ranking → {ranking} */
  async getProductRanking(): Promise<ProductRankItem[]> {
    const d = await apiGet<{ ranking: ProductRankItem[] }>('/offline/dashboard/product-ranking')
    return d?.ranking || []
  },

  /** 一键创建课程同学圈 POST /offline/dashboard/courses/:id/study-circle（驿站主·幂等，已建圈返回既有 circleId） */
  createStudyCircle(courseId: string): Promise<{ circleId: string }> {
    return apiPost<{ circleId: string }>(`/offline/dashboard/courses/${courseId}/study-circle`)
  },

  // ===== 驿站活动 B 端（T8-P1a·dashboard 端点由后端从 JWT 反查驿站）=====

  /** 全状态活动列表 GET /offline/dashboard/events → 分页 {items,total} */
  getManageEvents(page = 1, pageSize = 100): Promise<{ items: StationEvent[]; total: number }> {
    return apiGetPaged<StationEvent>(`/offline/dashboard/events?page=${page}&pageSize=${pageSize}`)
  },

  /** 创建活动 POST /offline/dashboard/events */
  createEvent(data: CreateEventPayload): Promise<StationEvent> {
    return apiPost<StationEvent>('/offline/dashboard/events', data)
  },

  /** 更新活动 PUT /offline/dashboard/events/:id */
  updateEvent(eventId: string, data: Partial<CreateEventPayload>): Promise<StationEvent> {
    return apiPut<StationEvent>(`/offline/dashboard/events/${eventId}`, data)
  },

  /** 活动状态流转 PUT /offline/dashboard/events/:id/status（action: publish|cancel|finish） */
  updateEventStatus(eventId: string, action: 'publish' | 'cancel' | 'finish'): Promise<StationEvent> {
    return apiPut<StationEvent>(`/offline/dashboard/events/${eventId}/status`, { action })
  },

  /** 活动扫码/凭证码核销 POST /offline/dashboard/events/sign-in */
  eventSignIn(qrCode: string): Promise<unknown> {
    return apiPost<unknown>('/offline/dashboard/events/sign-in', { qrCode })
  },

  /** 更新活动回顾照片 PUT /offline/dashboard/events/:id/photos（URL 数组·≤30） */
  updateEventPhotos(eventId: string, photos: string[]): Promise<StationEvent> {
    return apiPut<StationEvent>(`/offline/dashboard/events/${eventId}/photos`, { photos })
  },

  /** 统一经营日历 GET /offline/dashboard/calendar?month=YYYY-MM → { days } */
  async getCalendar(month: string): Promise<CalendarDays> {
    const d = await apiGet<{ days?: CalendarDays }>(`/offline/dashboard/calendar?month=${month}`)
    return d?.days || {}
  },

  /** 开业 SOP 进度 GET /offline/dashboard/onboarding（T8-P1b·驿站主·错误抛给页面走三态） */
  getOnboarding(): Promise<OnboardingData> {
    return apiGet<OnboardingData>('/offline/dashboard/onboarding')
  },
}

// ===== 开业 SOP 进度（T8-P1b·GET /offline/dashboard/onboarding）=====

/** 开业清单项：done=null 表示无法自动检测的引导项（前端渲染为引导而非勾选，不计入进度分母） */
export interface OnboardingItem {
  key: string
  title: string
  done: boolean | null
}
export interface OnboardingStage {
  key: string // setup / operate / growth
  title: string
  items: OnboardingItem[]
}
export interface OnboardingData {
  stationName: string
  /** 开业天数（自驿站创建） */
  openDays: number
  stages: OnboardingStage[]
  progress: { done: number; total: number }
}

/** 创建/编辑活动载荷（B 端表单） */
export interface CreateEventPayload {
  stationId?: string
  title: string
  type: StationEventType
  intro?: string
  cover?: string
  price?: number
  maxAttendees: number
  startTime: string
  endTime: string
  location: string
}

// ===== 学员洞察（智能名片·用于 pkg-offline/students 页）=====
// 后端聚合本驿站报名学员（去重）的埋点行为/订单数据，按最近活跃排序；
// 非驿站运营者报「未找到关联驿站」；仅供经营分析，不含手机号等敏感字段。

/** 报名学员名片（GET /offline/dashboard/students 适配后） */
export interface StationStudent {
  userId: string
  nickname: string
  avatar: string
  /** 归属建立时间（最早一次报名） */
  boundAt: string
  /** 最近活跃时间（空=近期无行为） */
  lastActiveAt: string
  /** 近30天行为数 */
  events30d: number
  /** 订单数 */
  orderCount: number
  /** 累计消费（元） */
  totalSpent: number
  /** 兴趣标签（由行为聚合推断） */
  interests: string[]
}

/** 学员行为时间线条目（GET /offline/dashboard/students/:id/timeline，summary 已是人话） */
export interface StudentTimelineEvent {
  action: string
  path: string
  summary: string
  occurredAt: string
}

/* —— 后端原始响应（宽松容错，不 export） —— */
interface RawStationStudent {
  userId?: string | number
  nickname?: string
  avatar?: string
  boundAt?: string | null
  lastActiveAt?: string | null
  events30d?: number | string
  orderCount?: number | string
  totalSpent?: number | string
  interests?: string[]
}
interface RawStudentsResp { customers?: RawStationStudent[]; total?: number }
interface RawStudentTimelineEvent { action?: string; path?: string; summary?: string; occurredAt?: string }
interface RawStudentTimelineResp { events?: RawStudentTimelineEvent[] }

export const studentInsightApi = {
  /** 报名学员列表（分页，按最近活跃排序；错误直接抛给页面走三态） */
  async list(page = 1, pageSize = 20): Promise<{ items: StationStudent[]; total: number }> {
    const res = await apiGet<RawStudentsResp>(`/offline/dashboard/students?page=${page}&pageSize=${pageSize}`)
    const items = (res?.customers || []).map((c): StationStudent => ({
      userId: String(c.userId ?? ''),
      nickname: c.nickname || '匿名学员',
      avatar: c.avatar || '',
      boundAt: c.boundAt || '',
      lastActiveAt: c.lastActiveAt || '',
      events30d: num(c.events30d),
      orderCount: num(c.orderCount),
      totalSpent: num(c.totalSpent),
      interests: Array.isArray(c.interests) ? c.interests : [],
    }))
    return { items, total: res?.total || 0 }
  },
  /** 单个学员行为时间线（点击卡片展开时按需请求） */
  async timeline(userId: string): Promise<StudentTimelineEvent[]> {
    const res = await apiGet<RawStudentTimelineResp>(`/offline/dashboard/students/${userId}/timeline`)
    return (res?.events || []).map((e): StudentTimelineEvent => ({
      action: e.action || '',
      path: e.path || '',
      summary: e.summary || '',
      occurredAt: e.occurredAt || '',
    }))
  },
}
