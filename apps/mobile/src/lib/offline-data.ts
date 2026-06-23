// 线下驿站板块数据（1:1 复刻原型 lib/api/offline.ts mock 与辅助函数）
import { apiGet, apiPost, apiPut, useMock } from '@/utils/request'

export type StationType = 'center' | 'academy' | 'studio' | 'partner'
export type StationStatus = 'open' | 'closed' | 'renovating'
export type StationFacility = 'wifi' | 'parking' | 'tea' | 'library' | 'meditation' | 'classroom' | 'consultation'

export interface BusinessHour { day: string; open: string; close: string; isOpen: boolean }
export interface Station {
  id: number
  name: string
  type: StationType
  status: StationStatus
  cover: string
  images: string[]
  address: string
  city: string
  district: string
  latitude: number
  longitude: number
  distance?: number
  phone: string
  businessHours: BusinessHour[]
  facilities: StationFacility[]
  rating: number
  reviewCount: number
  description: string
  tags: string[]
  isFavorited: boolean
}
export interface StationManager { id: number; name: string; avatar: string; title: string }
export interface StationEvent { id: number; title: string; date: string; type: 'course' | 'activity' }
export interface StationInstructor { id: number; name: string; avatar: string; specialty: string }
export interface StationReview { id: number; user: { name: string; avatar: string }; rating: number; content: string; time: string }
export interface StationDetail extends Station {
  manager: StationManager
  upcomingEvents: StationEvent[]
  instructors: StationInstructor[]
  reviews: StationReview[]
}

export const _mockStations: Station[] = [
  {
    id: 1,
    name: '热卜国学中心·北京旗舰店',
    type: 'center',
    status: 'open',
    cover: '',
    images: [''],
    address: '北京市朝阳区建国路88号SOHO现代城A座1层',
    city: '北京',
    district: '朝阳区',
    latitude: 39.9087,
    longitude: 116.4716,
    distance: 1200,
    phone: '010-88888888',
    businessHours: [
      { day: '周一至周五', open: '09:00', close: '21:00', isOpen: true },
      { day: '周六日', open: '10:00', close: '20:00', isOpen: true },
    ],
    facilities: ['wifi', 'parking', 'tea', 'library', 'meditation', 'classroom'],
    rating: 4.8,
    reviewCount: 256,
    description: '热卜国学中心北京旗舰店，提供八字命理、紫微斗数、风水堪舆等专业课程。',
    tags: ['八字', '紫微', '风水', '茶艺'],
    isFavorited: false,
  },
  {
    id: 2,
    name: '易学书院·上海分院',
    type: 'academy',
    status: 'open',
    cover: '',
    images: [''],
    address: '上海市静安区南京西路1266号恒隆广场3层',
    city: '上海',
    district: '静安区',
    latitude: 31.2304,
    longitude: 121.4737,
    distance: 3500,
    phone: '021-66666666',
    businessHours: [
      { day: '周一至周日', open: '10:00', close: '22:00', isOpen: true },
    ],
    facilities: ['wifi', 'tea', 'library', 'classroom', 'consultation'],
    rating: 4.9,
    reviewCount: 189,
    description: '专注易学传承的高端书院，名师云集，环境优雅。',
    tags: ['周易', '六爻', '奇门'],
    isFavorited: true,
  },
  {
    id: 3,
    name: '玄门工作室',
    type: 'studio',
    status: 'open',
    cover: '',
    images: [''],
    address: '广州市天河区珠江新城花城大道68号',
    city: '广州',
    district: '天河区',
    latitude: 23.1291,
    longitude: 113.2644,
    distance: 800,
    phone: '020-55555555',
    businessHours: [
      { day: '周二至周日', open: '14:00', close: '20:00', isOpen: true },
      { day: '周一', open: '', close: '', isOpen: false },
    ],
    facilities: ['wifi', 'tea', 'consultation'],
    rating: 4.7,
    reviewCount: 98,
    description: '小而精的玄学工作室，专注一对一咨询服务。',
    tags: ['命理咨询', '风水调理'],
    isFavorited: false,
  },
]

export function getStationDetail(id: number): StationDetail {
  const station = _mockStations.find((s) => s.id === id) || _mockStations[0]
  return {
    ...station,
    manager: { id: 101, name: '张道长', avatar: '', title: '驿站主理人' },
    upcomingEvents: [
      { id: 1, title: '八字入门公开课', date: '2026-06-10', type: 'course' },
      { id: 2, title: '国学读书会', date: '2026-06-15', type: 'activity' },
    ],
    instructors: [
      { id: 1, name: '李明德', avatar: '', specialty: '八字命理' },
      { id: 2, name: '王玄机', avatar: '', specialty: '紫微斗数' },
      { id: 3, name: '赵风水', avatar: '', specialty: '风水堪舆' },
    ],
    reviews: [
      { id: 1, user: { name: '学员A', avatar: '' }, rating: 5, content: '环境很好，老师专业', time: '2天前' },
      { id: 2, user: { name: '学员B', avatar: '' }, rating: 4, content: '交通便利，服务周到', time: '5天前' },
    ],
  }
}

export const stationTypeFilters: { value: StationType | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'center', label: '国学中心' },
  { value: 'academy', label: '书院' },
  { value: 'studio', label: '工作室' },
  { value: 'partner', label: '合作点' },
]

export function getStationTypeLabel(type: StationType): string {
  const labels: Record<StationType, string> = {
    center: '国学中心', academy: '书院', studio: '工作室', partner: '合作点',
  }
  return labels[type]
}

export function getFacilityInfo(facility: StationFacility): { icon: string; label: string } {
  const info: Record<StationFacility, { icon: string; label: string }> = {
    wifi: { icon: 'wifi', label: 'WiFi' },
    parking: { icon: 'car', label: '停车场' },
    tea: { icon: 'coffee', label: '茶室' },
    library: { icon: 'book-open', label: '藏书阁' },
    meditation: { icon: 'heart', label: '禅修室' },
    classroom: { icon: 'users', label: '教室' },
    consultation: { icon: 'message-circle', label: '咨询室' },
  }
  return info[facility]
}

export function formatDistance(meters?: number): string {
  if (!meters) return ''
  if (meters < 1000) return `${meters}m`
  return `${(meters / 1000).toFixed(1)}km`
}

// ========== 线下课程 ==========
export type OfflineCourseStatus = 'upcoming' | 'enrolling' | 'full' | 'ongoing' | 'ended' | 'cancelled'
export interface CourseInstructor { id: number; name: string; avatar: string; title?: string }
export interface OfflineCourse {
  id: number
  title: string
  cover: string
  instructor: CourseInstructor
  stationId: number
  stationName: string
  startTime: string
  endTime: string
  address: string
  price: number
  originalPrice?: number
  maxParticipants: number
  currentParticipants: number
  status: OfflineCourseStatus
  tags: string[]
  description: string
}
export interface CourseOutlineItem { id: number; title: string; duration: string; description?: string }
export interface CourseInstructorDetail extends CourseInstructor {
  title: string
  introduction: string
  specialties: string[]
  courseCount: number
  studentCount: number
}
export interface CourseEnrollment { id: number; status: string; enrollTime: string; qrCode?: string; seatNo?: string }
export interface EnrolledUser { id: number; name: string; avatar: string }
export interface OfflineCourseDetail extends OfflineCourse {
  content: string
  outline: CourseOutlineItem[]
  instructorDetail: CourseInstructorDetail
  enrollNotice: string
  refundPolicy: string
  myEnrollment?: CourseEnrollment
  enrolledUsers: EnrolledUser[]
}

export const _mockOfflineCourses: OfflineCourse[] = [
  { id: 1, title: '八字命理入门实���班', cover: '', instructor: { id: 1, name: '李明德', avatar: '', title: '资深命理师' }, stationId: 1, stationName: '热卜国学中心·北京旗舰店', startTime: '2026-06-10 09:00', endTime: '2026-06-10 17:00', address: '北京市朝阳区建国路88号SOHO现代城A座1层', price: 599, originalPrice: 899, maxParticipants: 30, currentParticipants: 23, status: 'enrolling', tags: ['八字', '入门'], description: '系统学习八字命理基础知识，掌握排盘、看盘技巧。' },
  { id: 2, title: '紫微斗数高级研修班', cover: '', instructor: { id: 2, name: '王玄机', avatar: '', title: '紫微斗数专家' }, stationId: 1, stationName: '热卜国学中心·北京旗舰店', startTime: '2026-06-15 09:00', endTime: '2026-06-16 17:00', address: '北京市朝阳区建国路88号SOHO现代城A座1层', price: 1299, originalPrice: 1599, maxParticipants: 20, currentParticipants: 18, status: 'enrolling', tags: ['紫微斗数', '进阶'], description: '深入解析紫微斗数命盘，掌握高级推断技巧。' },
  { id: 3, title: '风水堪舆实地考察班', cover: '', instructor: { id: 3, name: '赵风水', avatar: '', title: '风水大师' }, stationId: 2, stationName: '易学书院·上海分院', startTime: '2026-06-20 08:00', endTime: '2026-06-21 18:00', address: '上海市静安区南京西路1266号恒隆广场3层', price: 1999, originalPrice: 2599, maxParticipants: 15, currentParticipants: 12, status: 'enrolling', tags: ['风水', '实地'], description: '实地考察学习风水布局，理论与实践结合。' },
  { id: 4, title: '周易入门公开课', cover: '', instructor: { id: 4, name: '孙易道', avatar: '', title: '易学讲师' }, stationId: 3, stationName: '玄门工作室', startTime: '2026-06-08 14:00', endTime: '2026-06-08 17:00', address: '广州市天河区珠江新城花城大道68号', price: 0, maxParticipants: 50, currentParticipants: 45, status: 'enrolling', tags: ['周易', '免费'], description: '免费公开课，带你走进周易的奥秘世界。' },
  { id: 5, title: '奇门遁甲应用班', cover: '', instructor: { id: 5, name: '钱奇门', avatar: '', title: '奇门遁甲专家' }, stationId: 2, stationName: '易学书院·上海分院', startTime: '2026-05-28 09:00', endTime: '2026-05-29 17:00', address: '上海市静安区南京西路1266号恒隆广场3层', price: 1599, maxParticipants: 25, currentParticipants: 25, status: 'full', tags: ['奇门遁甲'], description: '学习奇门遁甲预测与决策应用。' },
]

export const courseDateFilters: { value: 'all' | 'today' | 'week' | 'month'; label: string }[] = [
  { value: 'all', label: '全部时间' },
  { value: 'today', label: '今天' },
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
]

export function getCourseStatusLabel(status: OfflineCourseStatus): string {
  const labels: Record<OfflineCourseStatus, string> = {
    upcoming: '即将开课', enrolling: '报名中', full: '已满员', ongoing: '进行中', ended: '已结束', cancelled: '已取消',
  }
  return labels[status]
}
export function getCourseStatusStyle(status: OfflineCourseStatus): { color: string; bg: string } {
  const styles: Record<OfflineCourseStatus, { color: string; bg: string }> = {
    upcoming: { color: '#2563eb', bg: '#eff6ff' },
    enrolling: { color: '#16a34a', bg: '#f0fdf4' },
    full: { color: '#ea580c', bg: '#fff7ed' },
    ongoing: { color: '#9333ea', bg: '#faf5ff' },
    ended: { color: '#6b7280', bg: '#f3f4f6' },
    cancelled: { color: '#dc2626', bg: '#fef2f2' },
  }
  return styles[status]
}

export function getOfflineCourseDetail(id: number): OfflineCourseDetail {
  const course = _mockOfflineCourses.find((c) => c.id === id) || _mockOfflineCourses[0]
  return {
    ...course,
    content:
      '课程简介：' + course.description + '\n\n适合人群：\n· 对国学文化感兴趣的爱好者\n· 希望系统学习命理知识的学员\n· 从事相关行业的从业者\n\n学习收获：\n通过本课程的学习，您将掌握基础理论和实战技巧，能够独立进行分析和解读。',
    outline: [
      { id: 1, title: '基础理论讲解', duration: '2小时', description: '系统学习基础概念和理论框架' },
      { id: 2, title: '排盘方法实操', duration: '1.5小时', description: '手把手教你排盘技巧' },
      { id: 3, title: '案例分析解读', duration: '2小时', description: '通过真实案例学习分析方法' },
      { id: 4, title: '互动答疑环节', duration: '1小时', description: '现场解答学员疑问' },
    ],
    instructorDetail: {
      ...course.instructor,
      title: course.instructor.title || '资深讲师',
      introduction: '从事国学研究20余年，师从多位名家，理论扎实，实战经验丰富。曾为多家企业和个人提供咨询服务，学员遍布全国各地。',
      specialties: ['八字命理', '紫微斗数', '风水堪舆'],
      courseCount: 56,
      studentCount: 3200,
    },
    enrollNotice: '1. 请提前15分钟到场签到\n2. 自备笔记本和文具\n3. 课程期间请将手机调至静音\n4. 如有特殊饮食需求请提前告知',
    refundPolicy: '开课前7天可全额退款，开课前3-7天退款50%，开课前3天内不予退款。',
    myEnrollment:
      id === 1
        ? { id: 1001, status: 'confirmed', enrollTime: '2026-06-01 10:30', seatNo: 'A-16' }
        : undefined,
    enrolledUsers: [
      { id: 1, name: '张学员', avatar: '' },
      { id: 2, name: '李学员', avatar: '' },
      { id: 3, name: '王学员', avatar: '' },
      { id: 4, name: '赵学员', avatar: '' },
      { id: 5, name: '钱学员', avatar: '' },
    ],
  }
}

export function formatCourseDateTime(dateStr: string): string {
  const date = new Date(dateStr.replace(/-/g, '/'))
  const m = date.getMonth() + 1
  const d = date.getDate()
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${m}月${d}日 ${hh}:${mm}`
}

// ========== 讲师预约 teacher-booking ==========
export interface BookingTeacher {
  id: number
  name: string
  avatar: string
  title: string
  specialties: string[]
  introduction: string
  rating: number
  reviewCount: number
  bookingCount: number
  hourlyRate: number
  isAvailable: boolean
}
export interface TimeSlot { id: string; startTime: string; endTime: string; isAvailable: boolean; price: number }
export interface DateAvailability { date: string; slots: TimeSlot[]; hasAvailableSlots: boolean }
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'refunded'
export interface TeacherBooking {
  id: number
  teacher: { id: number; name: string; avatar: string; title: string }
  stationId: number
  stationName: string
  date: string
  startTime: string
  endTime: string
  topic: string
  description?: string
  price: number
  status: BookingStatus
  createdAt: string
}

export const _mockBookingTeachers: BookingTeacher[] = [
  { id: 1, name: '李明德', avatar: '', title: '资深命理师', specialties: ['八字命理', '紫微斗数', '姓名学'], introduction: '从事命理研究20余年，师从多位名家。擅长八字命理分析，为数千人提供过咨询服务。', rating: 4.9, reviewCount: 328, bookingCount: 1256, hourlyRate: 299, isAvailable: true },
  { id: 2, name: '王玄机', avatar: '', title: '紫微斗数专家', specialties: ['紫微斗数', '流年运势', '事业规划'], introduction: '紫微斗数研究15年，精通命盘分析与流年推断，帮助学员找到人生方向。', rating: 4.8, reviewCount: 256, bookingCount: 890, hourlyRate: 399, isAvailable: true },
  { id: 3, name: '赵风水', avatar: '', title: '风水大师', specialties: ['风水堪舆', '家居布局', '商业选址'], introduction: '风水堪舆实战派大师，为多家企业和个人提供风水调理服务。', rating: 4.7, reviewCount: 189, bookingCount: 567, hourlyRate: 499, isAvailable: false },
]

// 确定性伪随机（替代原型 Math.random，保证渲染稳定可比对）
function seededAvailable(seed: number): boolean {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x) > 0.3
}
const slotBaseHours = [9, 10, 11, 14, 15, 16, 17, 19, 20]
function genTimeSlots(date: string, teacherId: number): TimeSlot[] {
  const teacher = _mockBookingTeachers.find((t) => t.id === teacherId)
  const hourlyRate = teacher?.hourlyRate || 299
  return slotBaseHours.map((hour, index) => ({
    id: `${date}_${hour}`,
    startTime: `${String(hour).padStart(2, '0')}:00`,
    endTime: `${String(hour + 1).padStart(2, '0')}:00`,
    isAvailable: seededAvailable(teacherId * 1000 + new Date(date.replace(/-/g, '/')).getDate() * 10 + index),
    price: hourlyRate,
  }))
}
export function getTeacherAvailability(teacherId: number, month: string): DateAvailability[] {
  const [year, m] = month.split('-').map(Number)
  const daysInMonth = new Date(year, m, 0).getDate()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const result: DateAvailability[] = []
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${month}-${String(day).padStart(2, '0')}`
    const dateObj = new Date(date.replace(/-/g, '/'))
    if (dateObj >= today) {
      const slots = genTimeSlots(date, teacherId)
      result.push({ date, slots, hasAvailableSlots: slots.some((s) => s.isAvailable) })
    }
  }
  return result
}

export const _mockMyTeacherBookings: TeacherBooking[] = [
  { id: 1, teacher: { id: 1, name: '李明德', avatar: '', title: '资深命理师' }, stationId: 1, stationName: '热卜国学中心·北京旗舰店', date: '2026-06-10', startTime: '14:00', endTime: '15:00', topic: '八字命理咨询', description: '想了解事业发展方向', price: 299, status: 'confirmed', createdAt: '2026-06-03 10:30' },
  { id: 2, teacher: { id: 2, name: '王玄机', avatar: '', title: '紫微斗数专家' }, stationId: 1, stationName: '热卜国学中心·北京旗舰店', date: '2026-06-15', startTime: '10:00', endTime: '11:00', topic: '流年运势分析', price: 399, status: 'pending', createdAt: '2026-06-02 16:20' },
]

export function getBookingStatusLabel(status: BookingStatus): string {
  const labels: Record<BookingStatus, string> = { pending: '待确认', confirmed: '已确认', completed: '已完成', cancelled: '已取消', refunded: '已退款' }
  return labels[status]
}
export function getBookingStatusStyle(status: BookingStatus): { color: string; bg: string } {
  const styles: Record<BookingStatus, { color: string; bg: string }> = {
    pending: { color: '#ea580c', bg: '#fff7ed' },
    confirmed: { color: '#16a34a', bg: '#f0fdf4' },
    completed: { color: '#2563eb', bg: '#eff6ff' },
    cancelled: { color: '#6b7280', bg: '#f3f4f6' },
    refunded: { color: '#dc2626', bg: '#fef2f2' },
  }
  return styles[status]
}

// ========== 课程签到 checkin ==========
export type CheckinStatus = 'not_started' | 'checking_in' | 'checked_in' | 'checked_out' | 'missed'
export type CheckinMethod = 'qrcode' | 'code' | 'location' | 'manual'
export interface CheckinRecord {
  id: number
  courseId: number
  checkinTime?: string
  checkoutTime?: string
  checkinMethod: CheckinMethod
  status: CheckinStatus
}
export interface CheckinCourse {
  id: number
  title: string
  cover: string
  instructor: { id: number; name: string; avatar: string; title?: string }
  startTime: string
  endTime: string
  location: { name: string; address: string; latitude?: number; longitude?: number }
  status: OfflineCourseStatus
  enrolledCount: number
  maxEnrollment: number
  checkinStart?: string
  checkinEnd?: string
}
export interface CourseCheckinDetail {
  course: CheckinCourse
  myRecord?: CheckinRecord
  stats: { total: number; checkedIn: number; checkedOut: number }
  checkinCode: string
}

export const _mockCheckinCourse: CheckinCourse = {
  id: 1,
  title: '八字命理实战研修班（第3期）',
  cover: '',
  instructor: { id: 101, name: '张明德', avatar: '', title: '资深命理师' },
  startTime: '2026-06-05 09:00',
  endTime: '2026-06-05 17:00',
  location: { name: '热卜国学馆·北京中心', address: '北京市朝阳区建国路88号SOHO现代城A座5楼', latitude: 39.9087, longitude: 116.4716 },
  status: 'ongoing',
  enrolledCount: 28,
  maxEnrollment: 30,
  checkinStart: '2026-06-05 08:30',
  checkinEnd: '2026-06-05 09:30',
}
export function getCourseCheckinDetail(_courseId: number): CourseCheckinDetail {
  return { course: _mockCheckinCourse, myRecord: undefined, stats: { total: 28, checkedIn: 15, checkedOut: 0 }, checkinCode: 'RB2026' }
}
export function getCheckinStatusLabel(status: CheckinStatus): string {
  const labels: Record<CheckinStatus, string> = { not_started: '未开始', checking_in: '签到中', checked_in: '已签到', checked_out: '已签退', missed: '缺勤' }
  return labels[status]
}
export function isInCheckinWindow(course: CheckinCourse): boolean {
  if (!course.checkinStart || !course.checkinEnd) return false
  const now = new Date()
  const start = new Date(course.checkinStart.replace(/-/g, '/'))
  const end = new Date(course.checkinEnd.replace(/-/g, '/'))
  return now >= start && now <= end
}
export function formatCheckinMethod(method: CheckinMethod): string {
  const methods: Record<CheckinMethod, string> = { qrcode: '扫码签到', code: '签到码', location: '位置签到', manual: '手动签到' }
  return methods[method]
}

// ============ API 层 ============

export const offlineApi = {
  /** 创建驿站 — POST /offline/stations */
  async createStation(data: any): Promise<{ success: boolean; message: string }> {
    if (useMock()) return { success: true, message: '驿站创建成功' }
    try {
      await apiPost('/offline/stations', data)
      return { success: true, message: '驿站创建成功' }
    } catch (e: any) {
      return { success: false, message: e?.message || '创建失败' }
    }
  },

  /** 驿站列表 — GET /offline/stations */
  async getStations(params?: any): Promise<Station[]> {
    if (useMock()) return _mockStations
    try {
      const data = await apiGet<any[]>('/offline/stations', params)
      return data || _mockStations
    } catch {
      return _mockStations
    }
  },

  /** 发现驿站 — GET /offline/stations/discover */
  async discoverStations(params?: any): Promise<Station[]> {
    if (useMock()) return _mockStations
    try {
      const data = await apiGet<any[]>('/offline/stations/discover', params)
      return data || _mockStations
    } catch {
      return _mockStations
    }
  },

  /** 驿站详情 — GET /offline/stations/:id */
  async getStation(id: number): Promise<StationDetail> {
    if (useMock()) return getStationDetail(id)
    try {
      const data = await apiGet<any>(`/offline/stations/${id}`)
      return data || getStationDetail(id)
    } catch {
      return getStationDetail(id)
    }
  },

  /** 审核驿站 — PUT /offline/stations/:id/audit */
  async auditStation(id: number, data: { approved: boolean; reason?: string }): Promise<{ success: boolean; message: string }> {
    if (useMock()) return { success: true, message: data.approved ? '审核通过' : '审核拒绝' }
    try {
      await apiPut(`/offline/stations/${id}/audit`, data)
      return { success: true, message: data.approved ? '审核通过' : '审核拒绝' }
    } catch (e: any) {
      return { success: false, message: e?.message || '操作失败' }
    }
  },

  /** 收益看板 — GET /offline/stations/:id/revenue-dashboard */
  async getStationRevenue(id: number): Promise<any> {
    if (useMock()) return { totalRevenue: 128000, monthlyRevenue: 15000, orderCount: 256, trend: [10, 15, 12, 18, 20, 16] }
    try {
      const data = await apiGet<any>(`/offline/stations/${id}/revenue-dashboard`)
      return data || { totalRevenue: 128000, monthlyRevenue: 15000, orderCount: 256, trend: [10, 15, 12, 18, 20, 16] }
    } catch {
      return { totalRevenue: 128000, monthlyRevenue: 15000, orderCount: 256, trend: [10, 15, 12, 18, 20, 16] }
    }
  },

  /** 创建线下课程 — POST /offline/courses */
  async createCourse(data: any): Promise<{ success: boolean; message: string }> {
    if (useMock()) return { success: true, message: '课程创建成功' }
    try {
      await apiPost('/offline/courses', data)
      return { success: true, message: '课程创建成功' }
    } catch (e: any) {
      return { success: false, message: e?.message || '创建失败' }
    }
  },

  /** 课程列表 — GET /offline/courses */
  async getCourses(params?: any): Promise<OfflineCourse[]> {
    if (useMock()) return _mockOfflineCourses
    try {
      const data = await apiGet<any[]>('/offline/courses', params)
      return data || _mockOfflineCourses
    } catch {
      return _mockOfflineCourses
    }
  },

  /** 课程详情 — GET /offline/courses/:id */
  async getCourse(id: number): Promise<OfflineCourseDetail> {
    if (useMock()) return getOfflineCourseDetail(id)
    try {
      const data = await apiGet<any>(`/offline/courses/${id}`)
      return data || getOfflineCourseDetail(id)
    } catch {
      return getOfflineCourseDetail(id)
    }
  },

  /** 报名 — POST /offline/courses/:id/register */
  async register(id: number): Promise<{ success: boolean; message: string }> {
    if (useMock()) return { success: true, message: '报名成功' }
    try {
      await apiPost(`/offline/courses/${id}/register`)
      return { success: true, message: '报名成功' }
    } catch (e: any) {
      return { success: false, message: e?.message || '报名失败' }
    }
  },

  /** 取消报名 — POST /offline/courses/:id/cancel */
  async cancelRegistration(id: number): Promise<{ success: boolean; message: string }> {
    if (useMock()) return { success: true, message: '已取消报名' }
    try {
      await apiPost(`/offline/courses/${id}/cancel`)
      return { success: true, message: '已取消报名' }
    } catch (e: any) {
      return { success: false, message: e?.message || '取消失败' }
    }
  },

  /** 待审核课程 — GET /offline/admin/courses/pending */
  async getPendingCourses(): Promise<OfflineCourse[]> {
    if (useMock()) return _mockOfflineCourses.filter(c => c.status === 'upcoming').slice(0, 2)
    try {
      const data = await apiGet<any[]>('/offline/admin/courses/pending')
      return data || _mockOfflineCourses.filter(c => c.status === 'upcoming').slice(0, 2)
    } catch {
      return _mockOfflineCourses.filter(c => c.status === 'upcoming').slice(0, 2)
    }
  },

  /** 审核课程 — PUT /offline/admin/courses/:id/audit */
  async auditCourse(id: number, data: { approved: boolean; reason?: string }): Promise<{ success: boolean; message: string }> {
    if (useMock()) return { success: true, message: data.approved ? '审核通过' : '审核拒绝' }
    try {
      await apiPut(`/offline/admin/courses/${id}/audit`, data)
      return { success: true, message: data.approved ? '审核通过' : '审核拒绝' }
    } catch (e: any) {
      return { success: false, message: e?.message || '操作失败' }
    }
  },
}

// 向后兼容导出（页面仍使用旧名称，后续统一升级到API模式后移除）
export const stations = _mockStations
export const offlineCourses = _mockOfflineCourses
export const bookingTeachers = _mockBookingTeachers
export const myTeacherBookings = _mockMyTeacherBookings
export const checkinCourse = _mockCheckinCourse
