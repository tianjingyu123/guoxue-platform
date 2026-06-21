import { apiGet, apiPost, useMock } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { 
  OfflineCourse, 
  OfflineCourseDetail,
  CheckinRecord, 
  CheckinRequest, 
  CheckinResponse,
  CourseCheckinDetail,
  CheckinStatus,
  OfflineCourseStatus,
  Station, 
  StationListResponse, 
  StationDetail, 
  StationType,
  StationFacility 
} from '../types/offline'

// Mock 线下课程数据
const mockOfflineCourse: OfflineCourse = {
  id: 1,
  title: '八字命理实战研修班（第3期）',
  cover: '/placeholder.svg?height=200&width=400',
  instructor: {
    id: 101,
    name: '张明德',
    avatar: '/placeholder.svg?height=48&width=48',
    title: '资深命理师',
  },
  startTime: '2026-06-05 09:00',
  endTime: '2026-06-05 17:00',
  location: {
    name: '热卜国学馆·北京中心',
    address: '北京市朝阳区建国路88号SOHO现代城A座5楼',
    latitude: 39.9087,
    longitude: 116.4716,
  },
  status: 'ongoing',
  enrolledCount: 28,
  maxEnrollment: 30,
  checkinStart: '2026-06-05 08:30',
  checkinEnd: '2026-06-05 09:30',
  checkinRequired: true,
}

// Mock 签到记录
const mockCheckinRecord: CheckinRecord = {
  id: 1001,
  courseId: 1,
  userId: 10001,
  checkinTime: '2026-06-05 08:45',
  checkinMethod: 'qrcode',
  status: 'checked_in',
  checkinLocation: {
    latitude: 39.9087,
    longitude: 116.4716,
    distance: 15,
  },
}

/**
 * 获取课程签到详情
 */
export async function getCourseCheckinDetail(courseId: number): Promise<ApiResponse<CourseCheckinDetail>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    return {
      code: 200,
      data: {
        course: mockOfflineCourse,
        myRecord: undefined, // 未签到
        stats: {
          total: 28,
          checkedIn: 15,
          checkedOut: 0,
        },
        checkinCode: 'RB2026',
      },
      message: 'success',
    }
  }
  return apiGet<CourseCheckinDetail>(`/offline/courses/${courseId}/checkin`)
}

/**
 * 签到
 */
export async function checkin(request: CheckinRequest): Promise<ApiResponse<CheckinResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 800))
    return {
      code: 200,
      data: {
        success: true,
        record: {
          ...mockCheckinRecord,
          checkinTime: new Date().toISOString(),
        },
        message: '签到成功',
        rank: 16,
        points: 10,
      },
      message: 'success',
    }
  }
  return apiPost<CheckinResponse>('/offline/checkin', request as unknown as Record<string, unknown>)
}

/**
 * 签退
 */
export async function checkout(courseId: number): Promise<ApiResponse<CheckinResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 500))
    return {
      code: 200,
      data: {
        success: true,
        record: {
          ...mockCheckinRecord,
          checkoutTime: new Date().toISOString(),
          status: 'checked_out',
        },
        message: '签退成功',
        points: 5,
      },
      message: 'success',
    }
  }
  return apiPost<CheckinResponse>(`/offline/courses/${courseId}/checkout`)
}

/**
 * 获取我的签到记录列表
 */
export async function getMyCheckinRecords(): Promise<ApiResponse<{ records: CheckinRecord[]; total: number }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return {
      code: 200,
      data: {
        records: [mockCheckinRecord],
        total: 1,
      },
      message: 'success',
    }
  }
  return apiGet<{ records: CheckinRecord[]; total: number }>('/offline/checkin/records')
}

/**
 * 验证签到码
 */
export async function verifyCheckinCode(courseId: number, code: string): Promise<ApiResponse<{ valid: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 200))
    const valid = code.toUpperCase() === 'RB2026'
    return { code: 200, data: { valid }, message: valid ? '验证成功' : '签到码无效' }
  }
  return apiPost<{ valid: boolean }>(`/offline/courses/${courseId}/verify-code`, { code })
}

/**
 * 获取签到状态显示信息
 */
export function getCheckinStatusInfo(status: CheckinStatus): { label: string; color: string; bgColor: string } {
  const info: Record<CheckinStatus, { label: string; color: string; bgColor: string }> = {
    not_started: { label: '未开始', color: 'text-muted-foreground', bgColor: 'bg-muted' },
    checking_in: { label: '签到中', color: 'text-blue-600', bgColor: 'bg-blue-50' },
    checked_in: { label: '已签到', color: 'text-green-600', bgColor: 'bg-green-50' },
    checked_out: { label: '已签退', color: 'text-gray-600', bgColor: 'bg-gray-100' },
    missed: { label: '缺勤', color: 'text-red-600', bgColor: 'bg-red-50' },
  }
  return info[status]
}

/**
 * 获取课程状态显示信息
 */
export function getCourseStatusInfo(status: OfflineCourseStatus): { label: string; color: string } {
  const info: Record<OfflineCourseStatus, { label: string; color: string }> = {
    upcoming: { label: '即将开始', color: 'text-blue-600' },
    ongoing: { label: '进行中', color: 'text-green-600' },
    ended: { label: '已结束', color: 'text-muted-foreground' },
    cancelled: { label: '已取消', color: 'text-red-600' },
  }
  return info[status]
}

/**
 * 检查是否在签到时间范围内
 */
export function isInCheckinWindow(course: OfflineCourse): boolean {
  if (!course.checkinStart || !course.checkinEnd) return false
  const now = new Date()
  const start = new Date(course.checkinStart)
  const end = new Date(course.checkinEnd)
  return now >= start && now <= end
}

/**
 * 格式化签到方式
 */
export function formatCheckinMethod(method: CheckinRecord['checkinMethod']): string {
  const methods: Record<CheckinRecord['checkinMethod'], string> = {
    qrcode: '扫码签到',
    code: '签到码',
    location: '位置签到',
    manual: '手动签到',
  }
  return methods[method]
}

// ========== 线下驿站相关 API ==========

// Mock 驿站数据
const mockStations: Station[] = [
  {
    id: 1,
    name: '热卜国学中心·北京旗舰店',
    type: 'center',
    status: 'open',
    cover: '/placeholder.svg?height=200&width=400',
    images: ['/placeholder.svg?height=300&width=400'],
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
    cover: '/placeholder.svg?height=200&width=400',
    images: ['/placeholder.svg?height=300&width=400'],
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
    cover: '/placeholder.svg?height=200&width=400',
    images: ['/placeholder.svg?height=300&width=400'],
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

export async function getStationList(params?: {
  city?: string
  type?: StationType
  keyword?: string
  latitude?: number
  longitude?: number
  page?: number
  pageSize?: number
}): Promise<ApiResponse<StationListResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    let list = [...mockStations]
    if (params?.city) {
      list = list.filter(s => s.city === params.city)
    }
    if (params?.type) {
      list = list.filter(s => s.type === params.type)
    }
    if (params?.keyword) {
      list = list.filter(s => s.name.includes(params.keyword!) || s.address.includes(params.keyword!))
    }
    return {
      code: 200,
      data: { list, total: list.length, hasMore: false },
      message: 'success',
    }
  }
  return apiGet<StationListResponse>('/offline/stations', params)
}

export async function getNearbyStations(
  latitude: number, 
  longitude: number, 
  limit: number = 5
): Promise<ApiResponse<Station[]>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    const sorted = [...mockStations].sort((a, b) => (a.distance || 0) - (b.distance || 0))
    return { code: 200, data: sorted.slice(0, limit), message: 'success' }
  }
  return apiGet<Station[]>('/offline/stations/nearby', { latitude, longitude, limit })
}

export async function getStationDetail(id: number): Promise<ApiResponse<StationDetail>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    const station = mockStations.find(s => s.id === id) || mockStations[0]
    const detail: StationDetail = {
      ...station,
      manager: {
        id: 101,
        name: '张道长',
        avatar: '/placeholder.svg',
        title: '驿站主理人',
      },
      upcomingEvents: [
        { id: 1, title: '八字入门公开课', date: '2026-06-10', type: 'course' },
        { id: 2, title: '国学读书会', date: '2026-06-15', type: 'activity' },
      ],
      instructors: [
        { id: 1, name: '李明德', avatar: '/placeholder.svg', specialty: '八字命理' },
        { id: 2, name: '王玄机', avatar: '/placeholder.svg', specialty: '紫微斗数' },
        { id: 3, name: '赵风水', avatar: '/placeholder.svg', specialty: '风水堪舆' },
      ],
      reviews: [
        { id: 1, user: { name: '学员A', avatar: '/placeholder.svg' }, rating: 5, content: '环境很好，老师专业', time: '2天前' },
        { id: 2, user: { name: '学员B', avatar: '/placeholder.svg' }, rating: 4, content: '交通便利，服务周到', time: '5天前' },
      ],
    }
    return { code: 200, data: detail, message: 'success' }
  }
  return apiGet<StationDetail>(`/offline/stations/${id}`)
}

export async function toggleStationFavorite(id: number): Promise<ApiResponse<{ isFavorited: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 200))
    return { code: 200, data: { isFavorited: true }, message: 'success' }
  }
  return apiPost<{ isFavorited: boolean }>(`/offline/stations/${id}/favorite`)
}

export function getStationTypeLabel(type: StationType): string {
  const labels: Record<StationType, string> = {
    center: '国学中心',
    academy: '书院',
    studio: '工作室',
    partner: '合作点',
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

export function getNavigationUrl(station: Station): string {
  return `https://uri.amap.com/navigation?to=${station.longitude},${station.latitude},${encodeURIComponent(station.name)}&mode=car&coordinate=gaode`
}

// ========== 线下课程列表 API ==========

// Mock 线下课程列表
const mockCourseList: OfflineCourse[] = [
  {
    id: 1,
    title: '八字命理入门实战班',
    cover: '/placeholder.svg?height=200&width=300',
    instructor: { id: 1, name: '李明德', avatar: '/placeholder.svg', title: '资深命理师' },
    stationId: 1,
    stationName: '热卜国学中心·北京旗舰店',
    startTime: '2026-06-10 09:00',
    endTime: '2026-06-10 17:00',
    address: '北京市朝阳区建国路88号SOHO现代城A座1层',
    price: 599,
    originalPrice: 899,
    maxParticipants: 30,
    currentParticipants: 23,
    status: 'enrolling',
    tags: ['八字', '入门'],
    description: '系统学习八字命理基础知识，掌握排盘、看盘技巧。',
  },
  {
    id: 2,
    title: '紫微斗数高级研修班',
    cover: '/placeholder.svg?height=200&width=300',
    instructor: { id: 2, name: '王玄机', avatar: '/placeholder.svg', title: '紫微斗数专家' },
    stationId: 1,
    stationName: '热卜国学中心·北京旗舰店',
    startTime: '2026-06-15 09:00',
    endTime: '2026-06-16 17:00',
    address: '北京市朝阳区建国路88号SOHO现代城A座1层',
    price: 1299,
    originalPrice: 1599,
    maxParticipants: 20,
    currentParticipants: 18,
    status: 'enrolling',
    tags: ['紫微斗数', '进阶'],
    description: '深入解析紫微斗数命盘，掌握高级推断技巧。',
  },
  {
    id: 3,
    title: '风水堪舆实地考察班',
    cover: '/placeholder.svg?height=200&width=300',
    instructor: { id: 3, name: '赵风水', avatar: '/placeholder.svg', title: '风水大师' },
    stationId: 2,
    stationName: '易学书院·上海分院',
    startTime: '2026-06-20 08:00',
    endTime: '2026-06-21 18:00',
    address: '上海市静安区南京西路1266号恒隆广场3层',
    price: 1999,
    originalPrice: 2599,
    maxParticipants: 15,
    currentParticipants: 12,
    status: 'enrolling',
    tags: ['风水', '实地'],
    description: '实地考察学习风水布局，理论与实践结合。',
  },
  {
    id: 4,
    title: '周易入门公开课',
    cover: '/placeholder.svg?height=200&width=300',
    instructor: { id: 4, name: '孙易道', avatar: '/placeholder.svg', title: '易学讲师' },
    stationId: 3,
    stationName: '玄门工作室',
    startTime: '2026-06-08 14:00',
    endTime: '2026-06-08 17:00',
    address: '广州市天河区珠江新城花城大道68号',
    price: 0,
    maxParticipants: 50,
    currentParticipants: 45,
    status: 'enrolling',
    tags: ['周易', '免费'],
    description: '免费公开课，带你走进周易的奥秘世界。',
  },
  {
    id: 5,
    title: '奇门遁甲应用班',
    cover: '/placeholder.svg?height=200&width=300',
    instructor: { id: 5, name: '钱奇门', avatar: '/placeholder.svg', title: '奇门遁甲专家' },
    stationId: 2,
    stationName: '易学书院·上海分院',
    startTime: '2026-05-28 09:00',
    endTime: '2026-05-29 17:00',
    address: '上海��静安区南京西路1266号恒隆广场3层',
    price: 1599,
    maxParticipants: 25,
    currentParticipants: 25,
    status: 'full',
    tags: ['奇门遁甲'],
    description: '学习奇门遁甲预测与决策应用。',
  },
]

export interface OfflineCourseListParams {
  stationId?: number
  dateFilter?: 'today' | 'week' | 'month' | 'all'
  status?: OfflineCourseStatus
  keyword?: string
  page?: number
  pageSize?: number
}

export interface OfflineCourseListResponse {
  list: OfflineCourse[]
  total: number
  hasMore: boolean
}

export async function getOfflineCourseList(params?: OfflineCourseListParams): Promise<ApiResponse<OfflineCourseListResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    let list = [...mockCourseList]
    
    // 驿站筛选
    if (params?.stationId) {
      list = list.filter(c => c.stationId === params.stationId)
    }
    
    // 日期筛选
    if (params?.dateFilter && params.dateFilter !== 'all') {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      list = list.filter(c => {
        const courseDate = new Date(c.startTime)
        if (params.dateFilter === 'today') {
          return courseDate.toDateString() === today.toDateString()
        } else if (params.dateFilter === 'week') {
          const weekLater = new Date(today)
          weekLater.setDate(weekLater.getDate() + 7)
          return courseDate >= today && courseDate <= weekLater
        } else if (params.dateFilter === 'month') {
          const monthLater = new Date(today)
          monthLater.setMonth(monthLater.getMonth() + 1)
          return courseDate >= today && courseDate <= monthLater
        }
        return true
      })
    }
    
    // 状态筛选
    if (params?.status) {
      list = list.filter(c => c.status === params.status)
    }
    
    // 关键词搜索
    if (params?.keyword) {
      const kw = params.keyword.toLowerCase()
      list = list.filter(c => 
        c.title.toLowerCase().includes(kw) || 
        c.instructor.name.toLowerCase().includes(kw) ||
        c.stationName?.toLowerCase().includes(kw)
      )
    }
    
    return {
      code: 200,
      data: { list, total: list.length, hasMore: false },
      message: 'success',
    }
  }
  return apiGet<OfflineCourseListResponse>('/offline/courses', params as Record<string, unknown>)
}

export async function getOfflineCourseDetail(id: number): Promise<ApiResponse<OfflineCourseDetail>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    const course = mockCourseList.find(c => c.id === id) || mockCourseList[0]
    const detail: OfflineCourseDetail = {
      ...course,
      content: `<h3>课程简介</h3><p>${course.description}</p><h3>适合人群</h3><ul><li>对国学文化感兴趣的爱好者</li><li>希望系统学习命理知识的学员</li><li>从事相关行业的从业者</li></ul><h3>学习收获</h3><p>通过本课程的学习，您将掌握基础理论和实战技巧，能够独立进行分析和解读。</p>`,
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
      myEnrollment: id === 1 ? {
        id: 1001,
        status: 'confirmed',
        enrollTime: '2026-06-01 10:30',
        qrCode: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23000" width="100" height="100"/></svg>',
        seatNo: 'A-16',
      } : undefined,
      enrolledUsers: [
        { id: 1, name: '张学员', avatar: '/placeholder.svg' },
        { id: 2, name: '李学员', avatar: '/placeholder.svg' },
        { id: 3, name: '王学员', avatar: '/placeholder.svg' },
        { id: 4, name: '赵学员', avatar: '/placeholder.svg' },
        { id: 5, name: '钱学员', avatar: '/placeholder.svg' },
      ],
    }
    return { code: 200, data: detail, message: 'success' }
  }
  return apiGet<OfflineCourseDetail>(`/offline/courses/${id}`)
}

export async function enrollOfflineCourse(courseId: number): Promise<ApiResponse<{ 
  success: boolean
  enrollmentId?: number
  qrCode?: string
  seatNo?: string
}>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 500))
    return { 
      code: 200, 
      data: { 
        success: true, 
        enrollmentId: 10001,
        qrCode: 'ENROLL_' + courseId + '_' + Date.now(),
        seatNo: 'A-' + Math.floor(Math.random() * 30 + 1),
      }, 
      message: '报名成功' 
    }
  }
  return apiPost<{ success: boolean; enrollmentId?: number; qrCode?: string; seatNo?: string }>(`/offline/courses/${courseId}/enroll`)
}

export async function cancelEnrollment(courseId: number): Promise<ApiResponse<{ 
  success: boolean
  refundAmount?: number
  refundStatus?: string
}>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 500))
    return { 
      code: 200, 
      data: { 
        success: true, 
        refundAmount: 599,
        refundStatus: '退款将在3-5个工作日内原路返回',
      }, 
      message: '取消成功' 
    }
  }
  return apiPost<{ success: boolean; refundAmount?: number; refundStatus?: string }>(`/offline/courses/${courseId}/cancel`)
}

export async function addToCalendar(courseId: number): Promise<ApiResponse<{ success: boolean; calendarUrl?: string }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 200))
    return { 
      code: 200, 
      data: { 
        success: true, 
        calendarUrl: `webcal://example.com/calendar/course/${courseId}.ics`,
      }, 
      message: '已添加到日历' 
    }
  }
  return apiPost<{ success: boolean; calendarUrl?: string }>(`/offline/courses/${courseId}/calendar`)
}

export function getCourseStatusLabel(status: OfflineCourseStatus): string {
  const labels: Record<OfflineCourseStatus, string> = {
    upcoming: '即将开课',
    enrolling: '报名中',
    full: '已满员',
    ongoing: '进行中',
    ended: '已结束',
    cancelled: '已取消',
  }
  return labels[status]
}

export function getCourseStatusColor(status: OfflineCourseStatus): string {
  const colors: Record<OfflineCourseStatus, string> = {
    upcoming: 'text-blue-600 bg-blue-50',
    enrolling: 'text-green-600 bg-green-50',
    full: 'text-orange-600 bg-orange-50',
    ongoing: 'text-purple-600 bg-purple-50',
    ended: 'text-gray-500 bg-gray-100',
    cancelled: 'text-red-600 bg-red-50',
  }
  return colors[status]
}

// ========== 讲师预约相关 API ==========

import type { 
  Teacher, 
  TimeSlot, 
  DateAvailability, 
  TeacherBooking, 
  CreateBookingRequest,
  BookingStatus
} from '../types/offline'

// Mock 讲师数据
const mockTeachers: Teacher[] = [
  {
    id: 1,
    name: '李明德',
    avatar: '/placeholder.svg',
    title: '资深命理师',
    specialties: ['八字命理', '紫微斗数', '姓名学'],
    introduction: '从事命理研究20余年，师从多位名家。擅长八字命理分析，为数千人提供过咨询服务。',
    rating: 4.9,
    reviewCount: 328,
    bookingCount: 1256,
    hourlyRate: 299,
    isAvailable: true,
  },
  {
    id: 2,
    name: '王玄机',
    avatar: '/placeholder.svg',
    title: '紫微斗数专家',
    specialties: ['紫微斗数', '流年运势', '事业规划'],
    introduction: '紫微斗数研究15年，精通命盘分析与流年推断，帮助学员找到人生方向。',
    rating: 4.8,
    reviewCount: 256,
    bookingCount: 890,
    hourlyRate: 399,
    isAvailable: true,
  },
  {
    id: 3,
    name: '赵风水',
    avatar: '/placeholder.svg',
    title: '风水大师',
    specialties: ['风水堪舆', '家居布局', '商业选址'],
    introduction: '风水堪舆实战派大师，为多家企业和个人提供风水调理服务。',
    rating: 4.7,
    reviewCount: 189,
    bookingCount: 567,
    hourlyRate: 499,
    isAvailable: false,
  },
]

// 生成时段
function generateTimeSlots(date: string, teacherId: number): TimeSlot[] {
  const slots: TimeSlot[] = []
  const baseHours = [9, 10, 11, 14, 15, 16, 17, 19, 20]
  const teacher = mockTeachers.find(t => t.id === teacherId)
  const hourlyRate = teacher?.hourlyRate || 299
  
  baseHours.forEach((hour, index) => {
    const isAvailable = Math.random() > 0.3
    slots.push({
      id: `${date}_${hour}`,
      startTime: `${hour.toString().padStart(2, '0')}:00`,
      endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
      isAvailable,
      price: hourlyRate,
    })
  })
  return slots
}

export async function getStationTeachers(stationId: number): Promise<ApiResponse<Teacher[]>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { code: 200, data: mockTeachers, message: 'success' }
  }
  return apiGet<Teacher[]>(`/offline/stations/${stationId}/teachers`)
}

export async function getTeacherAvailability(
  teacherId: number, 
  stationId: number,
  month: string // YYYY-MM
): Promise<ApiResponse<DateAvailability[]>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    const [year, m] = month.split('-').map(Number)
    const daysInMonth = new Date(year, m, 0).getDate()
    const availability: DateAvailability[] = []
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${month}-${day.toString().padStart(2, '0')}`
      const dateObj = new Date(date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (dateObj >= today) {
        const slots = generateTimeSlots(date, teacherId)
        availability.push({
          date,
          slots,
          hasAvailableSlots: slots.some(s => s.isAvailable),
        })
      }
    }
    return { code: 200, data: availability, message: 'success' }
  }
  return apiGet<DateAvailability[]>(`/offline/teachers/${teacherId}/availability`, { stationId, month })
}

export async function createTeacherBooking(
  request: CreateBookingRequest
): Promise<ApiResponse<{ success: boolean; bookingId: number }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 500))
    return { 
      code: 200, 
      data: { success: true, bookingId: Date.now() }, 
      message: '预约成功' 
    }
  }
  return apiPost<{ success: boolean; bookingId: number }>('/offline/teacher-bookings', request as unknown as Record<string, unknown>)
}

export async function getMyTeacherBookings(params?: {
  status?: BookingStatus
  page?: number
  pageSize?: number
}): Promise<ApiResponse<{ list: TeacherBooking[]; total: number; hasMore: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    const mockBookings: TeacherBooking[] = [
      {
        id: 1,
        teacher: { id: 1, name: '李明德', avatar: '/placeholder.svg', title: '资深命理师' },
        stationId: 1,
        stationName: '热卜国学中心·北京旗舰店',
        date: '2026-06-10',
        startTime: '14:00',
        endTime: '15:00',
        topic: '八字命理咨询',
        description: '想了解事业发展方向',
        price: 299,
        status: 'confirmed',
        createdAt: '2026-06-03 10:30',
      },
      {
        id: 2,
        teacher: { id: 2, name: '王玄机', avatar: '/placeholder.svg', title: '紫微斗数专家' },
        stationId: 1,
        stationName: '热卜国学中心·北京旗舰店',
        date: '2026-06-15',
        startTime: '10:00',
        endTime: '11:00',
        topic: '流年运势分析',
        price: 399,
        status: 'pending',
        createdAt: '2026-06-02 16:20',
      },
    ]
    let list = mockBookings
    if (params?.status) {
      list = list.filter(b => b.status === params.status)
    }
    return { code: 200, data: { list, total: list.length, hasMore: false }, message: 'success' }
  }
  return apiGet<{ list: TeacherBooking[]; total: number; hasMore: boolean }>('/offline/teacher-bookings/my', params as Record<string, unknown>)
}

export async function cancelTeacherBooking(bookingId: number): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { code: 200, data: { success: true }, message: '取消成功' }
  }
  return apiPost<{ success: boolean }>(`/offline/teacher-bookings/${bookingId}/cancel`)
}

export function getBookingStatusLabel(status: BookingStatus): string {
  const labels: Record<BookingStatus, string> = {
    pending: '待确认',
    confirmed: '已确认',
    completed: '已完成',
    cancelled: '已取消',
    refunded: '已退款',
  }
  return labels[status]
}

export function getBookingStatusColor(status: BookingStatus): string {
  const colors: Record<BookingStatus, string> = {
    pending: 'text-orange-600 bg-orange-50',
    confirmed: 'text-green-600 bg-green-50',
    completed: 'text-blue-600 bg-blue-50',
    cancelled: 'text-gray-500 bg-gray-100',
    refunded: 'text-red-600 bg-red-50',
  }
  return colors[status]
}

// ========== 驿站商品相关 API ==========

import type { 
  StationProduct, 
  StationProductListResponse,
  StationProductCategory
} from '../types/offline'

// Mock 商品数据
const mockProducts: StationProduct[] = [
  {
    id: 1,
    name: '《周易正义》精装典藏版',
    cover: '/placeholder.svg?height=200&width=200',
    images: ['/placeholder.svg?height=400&width=400'],
    category: 'book',
    price: 168,
    originalPrice: 218,
    stock: 50,
    sales: 328,
    stationId: 1,
    stationName: '热卜国学中心·北京旗舰店',
    description: '唐代孔颖达等奉敕编撰，集历代注疏之大成。',
    tags: ['经典', '精装'],
    isOnSale: true,
  },
  {
    id: 2,
    name: '紫檀木罗盘',
    cover: '/placeholder.svg?height=200&width=200',
    images: ['/placeholder.svg?height=400&width=400'],
    category: 'tool',
    price: 688,
    originalPrice: 888,
    stock: 20,
    sales: 156,
    stationId: 1,
    stationName: '热卜国学中心·北京旗舰店',
    description: '纯手工制作，紫檀木质，精准度高。',
    tags: ['手工', '紫檀'],
    isOnSale: true,
  },
  {
    id: 3,
    name: '武夷岩茶·大红袍',
    cover: '/placeholder.svg?height=200&width=200',
    images: ['/placeholder.svg?height=400&width=400'],
    category: 'tea',
    price: 298,
    stock: 100,
    sales: 512,
    stationId: 1,
    stationName: '热卜国学中心·北京旗舰店',
    description: '正岩核心产区，传统工艺制作。',
    tags: ['正岩', '礼盒'],
    isOnSale: true,
  },
  {
    id: 4,
    name: '沉香线香·静心',
    cover: '/placeholder.svg?height=200&width=200',
    images: ['/placeholder.svg?height=400&width=400'],
    category: 'incense',
    price: 128,
    stock: 200,
    sales: 789,
    stationId: 2,
    stationName: '易学书院·上海分院',
    description: '天然沉香，清雅馥郁，静心凝神。',
    tags: ['天然', '沉香'],
    isOnSale: true,
  },
  {
    id: 5,
    name: '太极图挂件',
    cover: '/placeholder.svg?height=200&width=200',
    images: ['/placeholder.svg?height=400&width=400'],
    category: 'ornament',
    price: 88,
    originalPrice: 128,
    stock: 80,
    sales: 234,
    stationId: 2,
    stationName: '易学书院·上海分院',
    description: '黄铜材质，精细雕刻，随身佩戴。',
    tags: ['黄铜', '挂件'],
    isOnSale: true,
  },
  {
    id: 6,
    name: '《紫微斗数全书》',
    cover: '/placeholder.svg?height=200&width=200',
    images: ['/placeholder.svg?height=400&width=400'],
    category: 'book',
    price: 98,
    stock: 60,
    sales: 445,
    stationId: 3,
    stationName: '玄门工作室',
    description: '紫微斗数经典入门教材，通俗易懂。',
    tags: ['入门', '教材'],
    isOnSale: true,
  },
]

export async function getStationProducts(params?: {
  stationId?: number
  category?: StationProductCategory
  keyword?: string
  minPrice?: number
  maxPrice?: number
  sortBy?: 'price' | 'sales' | 'newest'
  page?: number
  pageSize?: number
}): Promise<ApiResponse<StationProductListResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    let list = [...mockProducts]
    
    if (params?.stationId) {
      list = list.filter(p => p.stationId === params.stationId)
    }
    if (params?.category) {
      list = list.filter(p => p.category === params.category)
    }
    if (params?.keyword) {
      const kw = params.keyword.toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(kw) || p.description?.toLowerCase().includes(kw))
    }
    if (params?.minPrice !== undefined) {
      list = list.filter(p => p.price >= params.minPrice!)
    }
    if (params?.maxPrice !== undefined) {
      list = list.filter(p => p.price <= params.maxPrice!)
    }
    if (params?.sortBy === 'price') {
      list.sort((a, b) => a.price - b.price)
    } else if (params?.sortBy === 'sales') {
      list.sort((a, b) => b.sales - a.sales)
    }
    
    return {
      code: 200,
      data: { list, total: list.length, hasMore: false },
      message: 'success',
    }
  }
  return apiGet<StationProductListResponse>('/offline/products', params as Record<string, unknown>)
}

export async function getProductDetail(id: number): Promise<ApiResponse<StationProduct>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    const product = mockProducts.find(p => p.id === id) || mockProducts[0]
    return { code: 200, data: product, message: 'success' }
  }
  return apiGet<StationProduct>(`/offline/products/${id}`)
}

export async function addToCart(productId: number, quantity: number = 1): Promise<ApiResponse<{ success: boolean; cartCount: number }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { code: 200, data: { success: true, cartCount: quantity }, message: '已添加到购物车' }
  }
  return apiPost<{ success: boolean; cartCount: number }>('/cart/add', { productId, quantity })
}

export function getProductCategoryLabel(category: StationProductCategory): string {
  const labels: Record<StationProductCategory, string> = {
    book: '图书',
    tool: '工具',
    tea: '茶品',
    incense: '香品',
    ornament: '饰品',
    other: '其他',
  }
  return labels[category]
}

export function getProductCategoryIcon(category: StationProductCategory): string {
  const icons: Record<StationProductCategory, string> = {
    book: 'book-open',
    tool: 'compass',
    tea: 'coffee',
    incense: 'flame',
    ornament: 'gem',
    other: 'package',
  }
  return icons[category]
}

// ========== 驿站订单相关 API ==========

import type { 
  OfflineOrder, 
  OfflineOrderListResponse,
  OfflineOrderType,
  OfflineOrderStatus
} from '../types/offline'

// Mock 订单数据
const mockOrders: OfflineOrder[] = [
  {
    id: 1,
    orderNo: 'OFF202606030001',
    type: 'course',
    status: 'paid',
    stationId: 1,
    stationName: '热卜国学中心·北京旗舰店',
    items: [{
      id: 1,
      type: 'course',
      refId: 1,
      title: '八字命理入门实战班',
      cover: '/placeholder.svg?height=80&width=80',
      quantity: 1,
      price: 599,
    }],
    totalAmount: 599,
    payAmount: 599,
    createdAt: '2026-06-03 10:30',
    paidAt: '2026-06-03 10:32',
    scheduleTime: '2026-06-10 09:00',
  },
  {
    id: 2,
    orderNo: 'OFF202606020002',
    type: 'product',
    status: 'completed',
    stationId: 1,
    stationName: '热卜国学中心·北京旗舰店',
    items: [
      {
        id: 2,
        type: 'product',
        refId: 1,
        title: '《周易正义》精装典藏版',
        cover: '/placeholder.svg?height=80&width=80',
        quantity: 1,
        price: 168,
      },
      {
        id: 3,
        type: 'product',
        refId: 3,
        title: '武夷岩茶·大红袍',
        cover: '/placeholder.svg?height=80&width=80',
        quantity: 2,
        price: 298,
      },
    ],
    totalAmount: 764,
    payAmount: 714,
    discountAmount: 50,
    createdAt: '2026-06-02 15:20',
    paidAt: '2026-06-02 15:22',
    completedAt: '2026-06-03 14:00',
    shippingInfo: {
      name: '张三',
      phone: '138****8888',
      address: '北京市朝阳区xx路xx号',
    },
  },
  {
    id: 3,
    orderNo: 'OFF202606010003',
    type: 'booking',
    status: 'confirmed',
    stationId: 1,
    stationName: '热卜国学中心·北京旗舰店',
    items: [{
      id: 4,
      type: 'booking',
      refId: 1,
      title: '李明德老师·八字命理咨询',
      cover: '/placeholder.svg?height=80&width=80',
      quantity: 1,
      price: 299,
      spec: '2026-06-10 14:00-15:00',
    }],
    totalAmount: 299,
    payAmount: 299,
    createdAt: '2026-06-01 09:00',
    paidAt: '2026-06-01 09:02',
    scheduleTime: '2026-06-10 14:00',
  },
  {
    id: 4,
    orderNo: 'OFF202605280004',
    type: 'course',
    status: 'pending',
    stationId: 2,
    stationName: '易学书院·上海分院',
    items: [{
      id: 5,
      type: 'course',
      refId: 2,
      title: '紫微斗数高级研修班',
      cover: '/placeholder.svg?height=80&width=80',
      quantity: 1,
      price: 1299,
    }],
    totalAmount: 1299,
    payAmount: 1299,
    createdAt: '2026-05-28 16:00',
  },
  {
    id: 5,
    orderNo: 'OFF202605250005',
    type: 'product',
    status: 'cancelled',
    stationId: 3,
    stationName: '玄门工作室',
    items: [{
      id: 6,
      type: 'product',
      refId: 6,
      title: '《紫微斗数全书》',
      cover: '/placeholder.svg?height=80&width=80',
      quantity: 1,
      price: 98,
    }],
    totalAmount: 98,
    payAmount: 98,
    createdAt: '2026-05-25 11:00',
    remark: '用户主动取消',
  },
]

export async function getOfflineOrders(params?: {
  type?: OfflineOrderType | 'all'
  status?: OfflineOrderStatus
  stationId?: number
  page?: number
  pageSize?: number
}): Promise<ApiResponse<OfflineOrderListResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    let list = [...mockOrders]
    
    if (params?.type && params.type !== 'all') {
      list = list.filter(o => o.type === params.type)
    }
    if (params?.status) {
      list = list.filter(o => o.status === params.status)
    }
    if (params?.stationId) {
      list = list.filter(o => o.stationId === params.stationId)
    }
    
    return {
      code: 200,
      data: { list, total: list.length, hasMore: false },
      message: 'success',
    }
  }
  return apiGet<OfflineOrderListResponse>('/offline/orders', params as Record<string, unknown>)
}

export async function getOfflineOrderDetail(id: number): Promise<ApiResponse<OfflineOrder>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    const order = mockOrders.find(o => o.id === id) || mockOrders[0]
    return { code: 200, data: order, message: 'success' }
  }
  return apiGet<OfflineOrder>(`/offline/orders/${id}`)
}

export async function payOfflineOrder(orderId: number): Promise<ApiResponse<{ success: boolean; payUrl?: string }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 500))
    return { code: 200, data: { success: true }, message: '支付成功' }
  }
  return apiPost<{ success: boolean; payUrl?: string }>(`/offline/orders/${orderId}/pay`)
}

export async function cancelOfflineOrder(orderId: number, reason?: string): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { code: 200, data: { success: true }, message: '取消成功' }
  }
  return apiPost<{ success: boolean }>(`/offline/orders/${orderId}/cancel`, { reason })
}

export async function confirmOfflineOrder(orderId: number): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { code: 200, data: { success: true }, message: '确认成功' }
  }
  return apiPost<{ success: boolean }>(`/offline/orders/${orderId}/confirm`)
}

export async function requestRefund(orderId: number, reason: string): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    return { code: 200, data: { success: true }, message: '退款申请已提交' }
  }
  return apiPost<{ success: boolean }>(`/offline/orders/${orderId}/refund`, { reason })
}

export function getOrderTypeLabel(type: OfflineOrderType): string {
  const labels: Record<OfflineOrderType, string> = {
    course: '线下课程',
    product: '驿站商品',
    booking: '讲师预约',
  }
  return labels[type]
}

export function getOrderTypeIcon(type: OfflineOrderType): string {
  const icons: Record<OfflineOrderType, string> = {
    course: 'book-open',
    product: 'shopping-bag',
    booking: 'calendar',
  }
  return icons[type]
}

export function getOrderStatusLabel(status: OfflineOrderStatus): string {
  const labels: Record<OfflineOrderStatus, string> = {
    pending: '待支付',
    paid: '已支付',
    confirmed: '已确认',
    completed: '已完成',
    cancelled: '已取消',
    refunding: '退款中',
    refunded: '已退款',
  }
  return labels[status]
}

export function getOrderStatusColor(status: OfflineOrderStatus): string {
  const colors: Record<OfflineOrderStatus, string> = {
    pending: 'text-orange-600 bg-orange-50',
    paid: 'text-blue-600 bg-blue-50',
    confirmed: 'text-green-600 bg-green-50',
    completed: 'text-primary bg-primary/10',
    cancelled: 'text-gray-500 bg-gray-100',
    refunding: 'text-amber-600 bg-amber-50',
    refunded: 'text-red-600 bg-red-50',
  }
  return colors[status]
}

export function getOrderActions(order: OfflineOrder): { key: string; label: string; variant: 'default' | 'outline' | 'destructive' }[] {
  const actions: { key: string; label: string; variant: 'default' | 'outline' | 'destructive' }[] = []
  
  switch (order.status) {
    case 'pending':
      actions.push({ key: 'pay', label: '立即支付', variant: 'default' })
      actions.push({ key: 'cancel', label: '取消订单', variant: 'outline' })
      break
    case 'paid':
      if (order.type === 'product') {
        actions.push({ key: 'refund', label: '申请退款', variant: 'outline' })
      }
      break
    case 'confirmed':
      if (order.type === 'product') {
        actions.push({ key: 'confirm', label: '确认收货', variant: 'default' })
      }
      break
    case 'completed':
      actions.push({ key: 'review', label: '去评价', variant: 'outline' })
      actions.push({ key: 'rebuy', label: '再次购买', variant: 'outline' })
      break
  }
  
  return actions
}

// ========== 驿站结算相关 API ==========

import type { 
  Settlement, 
  SettlementDetail,
  SettlementListResponse,
  SettlementStatus,
  IncomeType
} from '../types/offline'

// Mock 结算数据
const mockSettlements: Settlement[] = [
  {
    id: 1,
    settlementNo: 'SET202606010001',
    periodStart: '2026-05-01',
    periodEnd: '2026-05-31',
    stationId: 1,
    stationName: '热卜国学中心·北京旗舰店',
    totalIncome: 28650,
    totalDeduction: 2865,
    netAmount: 25785,
    status: 'completed',
    createdAt: '2026-06-01 00:00',
    completedAt: '2026-06-03 10:00',
  },
  {
    id: 2,
    settlementNo: 'SET202605010002',
    periodStart: '2026-04-01',
    periodEnd: '2026-04-30',
    stationId: 1,
    stationName: '热卜国学中心·北京旗舰店',
    totalIncome: 32180,
    totalDeduction: 3218,
    netAmount: 28962,
    status: 'completed',
    createdAt: '2026-05-01 00:00',
    completedAt: '2026-05-03 10:00',
  },
  {
    id: 3,
    settlementNo: 'SET202606150003',
    periodStart: '2026-06-01',
    periodEnd: '2026-06-15',
    stationId: 1,
    stationName: '热卜国学中心·北京旗舰店',
    totalIncome: 15680,
    totalDeduction: 1568,
    netAmount: 14112,
    status: 'pending',
    createdAt: '2026-06-16 00:00',
  },
]

export async function getSettlements(params?: {
  stationId?: number
  status?: SettlementStatus
  year?: number
  month?: number
  page?: number
  pageSize?: number
}): Promise<ApiResponse<SettlementListResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    let list = [...mockSettlements]
    
    if (params?.stationId) {
      list = list.filter(s => s.stationId === params.stationId)
    }
    if (params?.status) {
      list = list.filter(s => s.status === params.status)
    }
    
    const stats = {
      totalIncome: list.reduce((sum, s) => sum + s.totalIncome, 0),
      totalDeduction: list.reduce((sum, s) => sum + s.totalDeduction, 0),
      totalNetAmount: list.reduce((sum, s) => sum + s.netAmount, 0),
      pendingAmount: list.filter(s => s.status === 'pending').reduce((sum, s) => sum + s.netAmount, 0),
      completedCount: list.filter(s => s.status === 'completed').length,
    }
    
    return {
      code: 200,
      data: { list, total: list.length, hasMore: false, stats },
      message: 'success',
    }
  }
  return apiGet<SettlementListResponse>('/offline/settlements', params as Record<string, unknown>)
}

export async function getSettlementDetail(id: number): Promise<ApiResponse<SettlementDetail>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    const settlement = mockSettlements.find(s => s.id === id) || mockSettlements[0]
    const detail: SettlementDetail = {
      ...settlement,
      incomeItems: [
        { id: 1, type: 'course', title: '八字命理入门实战班', orderId: 1001, orderNo: 'OFF202605100001', amount: 599, time: '2026-05-10 10:30' },
        { id: 2, type: 'course', title: '紫微斗数高级研修班', orderId: 1002, orderNo: 'OFF202605150002', amount: 1299, time: '2026-05-15 14:20' },
        { id: 3, type: 'product', title: '《周易正义》精装典藏版 x2', orderId: 1003, orderNo: 'OFF202605180003', amount: 336, time: '2026-05-18 09:45' },
        { id: 4, type: 'booking', title: '李明德老师·命理咨询', orderId: 1004, orderNo: 'OFF202605200004', amount: 299, time: '2026-05-20 16:00' },
        { id: 5, type: 'product', title: '紫檀木罗盘', orderId: 1005, orderNo: 'OFF202605220005', amount: 688, time: '2026-05-22 11:30' },
        { id: 6, type: 'commission', title: '推荐佣金', amount: 150, time: '2026-05-25 00:00' },
      ],
      deductionItems: [
        { id: 1, type: 'platform_fee', title: '平台服务费(10%)', amount: 2865, remark: '按收入10%收取' },
      ],
      incomeByType: [
        { type: 'course', count: 2, amount: 1898 },
        { type: 'product', count: 2, amount: 1024 },
        { type: 'booking', count: 1, amount: 299 },
        { type: 'commission', count: 1, amount: 150 },
      ],
    }
    return { code: 200, data: detail, message: 'success' }
  }
  return apiGet<SettlementDetail>(`/offline/settlements/${id}`)
}

export function getSettlementStatusLabel(status: SettlementStatus): string {
  const labels: Record<SettlementStatus, string> = {
    pending: '待结算',
    processing: '结算中',
    completed: '已结算',
    failed: '结算失败',
  }
  return labels[status]
}

export function getSettlementStatusColor(status: SettlementStatus): string {
  const colors: Record<SettlementStatus, string> = {
    pending: 'text-orange-600 bg-orange-50',
    processing: 'text-blue-600 bg-blue-50',
    completed: 'text-green-600 bg-green-50',
    failed: 'text-red-600 bg-red-50',
  }
  return colors[status]
}

export function getIncomeTypeLabel(type: IncomeType): string {
  const labels: Record<IncomeType, string> = {
    course: '线下课程',
    product: '商品销售',
    booking: '讲师预约',
    commission: '推荐佣金',
  }
  return labels[type]
}

export function getIncomeTypeColor(type: IncomeType): string {
  const colors: Record<IncomeType, string> = {
    course: 'text-blue-600 bg-blue-50',
    product: 'text-green-600 bg-green-50',
    booking: 'text-purple-600 bg-purple-50',
    commission: 'text-amber-600 bg-amber-50',
  }
  return colors[type]
}
