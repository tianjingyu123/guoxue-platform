// 线下驿站板块数据层 —— 真连 @guoxue/server /offline/*
// 定位：平台线下服务终端（线上引流·线下交付）。驿站=地级市线下场地，研究院签约讲师授课。
// 后端 StationOffline 为准，原型虚构字段(评分/距离/坐标/营业评价)已诚实降级。
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/request'

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
  _count?: { registrations: number }
  station?: { id: string; name: string; address?: string; phone?: string; city?: string }
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
}
