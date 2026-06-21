import { apiGet, apiPost, useMock } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { 
  Instructor, 
  InstructorDetail,
  InstructorListResponse,
  InstructorLevel,
  InstituteEvent,
  InstituteEventType,
  InstituteEventStatus,
  InstituteInfo,
  InstructorApplication,
  ApplicationStatus
} from '../types/institute'

// Mock 讲师数据
const mockInstructors: Instructor[] = [
  {
    id: 1,
    name: '李明德',
    avatar: '/placeholder.svg',
    title: '资深命理师',
    level: 'master',
    verified: true,
    specialties: ['八字命理', '紫微斗数', '姓名学'],
    bio: '从事命理研究20余年，培养学员超过3000人',
    studentCount: 3256,
    courseCount: 12,
    rating: 4.9,
    reviewCount: 856,
    status: 'active',
    isFollowing: false,
  },
  {
    id: 2,
    name: '王玄机',
    avatar: '/placeholder.svg',
    title: '紫微斗数专家',
    level: 'expert',
    verified: true,
    specialties: ['紫微斗数', '流年运势', '事业规划'],
    bio: '紫微斗数研究15年，精通命盘分析与流年推断',
    studentCount: 2189,
    courseCount: 8,
    rating: 4.8,
    reviewCount: 567,
    status: 'active',
    isFollowing: true,
  },
  {
    id: 3,
    name: '赵风水',
    avatar: '/placeholder.svg',
    title: '风水堪舆大师',
    level: 'master',
    verified: true,
    specialties: ['风水堪舆', '家居布局', '商业选址'],
    bio: '风水堪舆实战派大师，服务企业500+',
    studentCount: 1567,
    courseCount: 6,
    rating: 4.9,
    reviewCount: 423,
    status: 'active',
    isFollowing: false,
  },
  {
    id: 4,
    name: '孙易道',
    avatar: '/placeholder.svg',
    title: '周易研究学者',
    level: 'senior',
    verified: true,
    specialties: ['周易', '六爻', '梅花易数'],
    bio: '专注周易研究，著有多部易学著作',
    studentCount: 987,
    courseCount: 5,
    rating: 4.7,
    reviewCount: 234,
    status: 'active',
    isFollowing: false,
  },
  {
    id: 5,
    name: '钱奇门',
    avatar: '/placeholder.svg',
    title: '奇门遁甲专家',
    level: 'expert',
    verified: true,
    specialties: ['奇门遁甲', '择日', '预测决策'],
    bio: '奇门遁甲实战应用专家，企业决策顾问',
    studentCount: 756,
    courseCount: 4,
    rating: 4.8,
    reviewCount: 189,
    status: 'active',
    isFollowing: false,
  },
]

// Mock 活动数据
const mockEvents: InstituteEvent[] = [
  {
    id: 1,
    title: '八字命理高峰论坛',
    cover: '/placeholder.svg?height=200&width=400',
    type: 'conference',
    status: 'upcoming',
    startTime: '2026-06-15 09:00',
    endTime: '2026-06-15 17:00',
    location: '北京国际会议中心',
    isOnline: false,
    speakers: [
      { id: 1, name: '李明德', avatar: '/placeholder.svg', title: '资深命理师' },
      { id: 2, name: '王玄机', avatar: '/placeholder.svg', title: '紫微斗数专家' },
    ],
    maxParticipants: 200,
    currentParticipants: 156,
    price: 299,
    originalPrice: 399,
    description: '汇聚业内顶尖专家，探讨八字命理前沿研究',
    tags: ['高峰论坛', '八字', '行业盛会'],
  },
  {
    id: 2,
    title: '风水堪舆实战研讨会',
    cover: '/placeholder.svg?height=200&width=400',
    type: 'seminar',
    status: 'enrolling',
    startTime: '2026-06-20 14:00',
    endTime: '2026-06-20 18:00',
    location: '上海易学书院',
    isOnline: false,
    speakers: [
      { id: 3, name: '赵风水', avatar: '/placeholder.svg', title: '风水堪舆大师' },
    ],
    maxParticipants: 50,
    currentParticipants: 38,
    price: 199,
    description: '风水实战案例分享，现场互动答疑',
    tags: ['研讨会', '风水', '实战'],
  },
  {
    id: 3,
    title: '周易入门线上公开课',
    cover: '/placeholder.svg?height=200&width=400',
    type: 'online',
    status: 'enrolling',
    startTime: '2026-06-10 20:00',
    endTime: '2026-06-10 21:30',
    isOnline: true,
    speakers: [
      { id: 4, name: '孙易道', avatar: '/placeholder.svg', title: '周易研究学者' },
    ],
    currentParticipants: 1256,
    price: 0,
    description: '免费公开课，带你走进周易的奥秘世界',
    tags: ['公开课', '免费', '周易'],
  },
]

// Mock 研究院信息
const mockInstituteInfo: InstituteInfo = {
  name: '热卜国学研究院',
  slogan: '传承国学智慧，点亮人生方向',
  mission: '致力于国学文化的传承与创新，培养专业人才，推动国学智慧服务现代生活',
  description: '热卜国学研究院是国内领先的国学教育与研究机构，汇聚业内顶尖专家学者，提供系统化的国学课程体系，包括八字命理、紫微斗数、风水堪舆、周易六爻等专业方向。',
  bannerUrl: '/placeholder.svg?height=300&width=800',
  stats: {
    instructorCount: 56,
    studentCount: 32000,
    courseCount: 128,
    eventCount: 86,
  },
}

/**
 * 获取研究院信息
 */
export async function getInstituteInfo(): Promise<ApiResponse<InstituteInfo>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { code: 200, data: mockInstituteInfo, message: 'success' }
  }
  return apiGet<InstituteInfo>('/institute/info')
}

/**
 * 获取讲师列表
 */
export async function getInstructors(params?: {
  level?: InstructorLevel
  specialty?: string
  keyword?: string
  page?: number
  pageSize?: number
}): Promise<ApiResponse<InstructorListResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    let list = [...mockInstructors]
    
    if (params?.level) {
      list = list.filter(i => i.level === params.level)
    }
    if (params?.specialty) {
      list = list.filter(i => i.specialties.includes(params.specialty!))
    }
    if (params?.keyword) {
      const kw = params.keyword.toLowerCase()
      list = list.filter(i => 
        i.name.toLowerCase().includes(kw) || 
        i.title.toLowerCase().includes(kw) ||
        i.specialties.some(s => s.toLowerCase().includes(kw))
      )
    }
    
    return {
      code: 200,
      data: { list, total: list.length, hasMore: false },
      message: 'success',
    }
  }
  return apiGet<InstructorListResponse>('/institute/instructors', params as Record<string, unknown>)
}

/**
 * 获取讲师详情
 */
export async function getInstructorDetail(id: number): Promise<ApiResponse<InstructorDetail>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    const instructor = mockInstructors.find(i => i.id === id) || mockInstructors[0]
    const detail: InstructorDetail = {
      ...instructor,
      introduction: `${instructor.name}老师，${instructor.bio}。长期致力于${instructor.specialties.join('、')}等领域的研究与教学工作，积累了丰富的理论知识和实战经验。教学风格深入浅出，善于将复杂的理论知识以通俗易懂的方式传授给学员。`,
      education: ['北京大学哲学系', '中国传统文化研究院'],
      experience: [
        '2006-2010 某知名命理机构 高级命理师',
        '2010-2015 国学培训学院 首席讲师',
        '2015-至今 热卜国学研究院 金牌讲师',
      ],
      certificates: [
        { name: '高级命理咨询师', issuer: '中国传统文化研究会', year: 2012 },
        { name: '国学文化��承师', issuer: '国学教育协会', year: 2018 },
      ],
      featuredCourses: [
        { id: 1, title: '八字命理系统课', cover: '/placeholder.svg', studentCount: 1256, rating: 4.9 },
        { id: 2, title: '紫微斗数精讲', cover: '/placeholder.svg', studentCount: 890, rating: 4.8 },
      ],
      reviews: [
        { id: 1, user: { name: '学员A', avatar: '/placeholder.svg' }, rating: 5, content: '老师讲解非常清晰，受益匪浅', time: '2天前' },
        { id: 2, user: { name: '学员B', avatar: '/placeholder.svg' }, rating: 5, content: '课程内容很系统，推荐给大家', time: '5天前' },
      ],
    }
    return { code: 200, data: detail, message: 'success' }
  }
  return apiGet<InstructorDetail>(`/institute/instructors/${id}`)
}

/**
 * 获取研究院活动列表
 */
export async function getInstituteEvents(params?: {
  type?: InstituteEventType
  status?: InstituteEventStatus
  page?: number
  pageSize?: number
}): Promise<ApiResponse<{ list: InstituteEvent[]; total: number; hasMore: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    let list = [...mockEvents]
    
    if (params?.type) {
      list = list.filter(e => e.type === params.type)
    }
    if (params?.status) {
      list = list.filter(e => e.status === params.status)
    }
    
    return {
      code: 200,
      data: { list, total: list.length, hasMore: false },
      message: 'success',
    }
  }
  return apiGet<{ list: InstituteEvent[]; total: number; hasMore: boolean }>('/institute/events', params as Record<string, unknown>)
}

// 活动报名
export async function enrollEvent(eventId: number): Promise<ApiResponse<{ success: boolean; enrollmentId: number }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    return { code: 200, data: { success: true, enrollmentId: Date.now() }, message: '报名成功' }
  }
  return apiPost<{ success: boolean; enrollmentId: number }>(`/institute/events/${eventId}/enroll`)
}

// 取消报名
export async function cancelEventEnrollment(eventId: number): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { code: 200, data: { success: true }, message: '已取消报名' }
  }
  return apiPost<{ success: boolean }>(`/institute/events/${eventId}/cancel`)
}

// 活动类型工具函数
export function getEventTypeLabel(type: InstituteEventType): string {
  const labels: Record<InstituteEventType, string> = {
    lecture: '学术讲座',
    seminar: '研讨会',
    workshop: '工作坊',
    conference: '学术会议',
    online: '线上活动',
  }
  return labels[type]
}

export function getEventTypeColor(type: InstituteEventType): string {
  const colors: Record<InstituteEventType, string> = {
    lecture: 'text-blue-600 bg-blue-50',
    seminar: 'text-purple-600 bg-purple-50',
    workshop: 'text-green-600 bg-green-50',
    conference: 'text-primary bg-primary/10',
    online: 'text-cyan-600 bg-cyan-50',
  }
  return colors[type]
}

export function getEventStatusLabel(status: InstituteEventStatus): string {
  const labels: Record<InstituteEventStatus, string> = {
    upcoming: '即将开始',
    enrolling: '报名中',
    ongoing: '进行中',
    ended: '已结束',
  }
  return labels[status]
}

export function getEventStatusColor(status: InstituteEventStatus): string {
  const colors: Record<InstituteEventStatus, string> = {
    upcoming: 'text-blue-600 bg-blue-50',
    enrolling: 'text-green-600 bg-green-50',
    ongoing: 'text-orange-600 bg-orange-50',
    ended: 'text-gray-500 bg-gray-100',
  }
  return colors[status]
}

/**
 * 关注/取消关注讲师
 */
export async function toggleFollowInstructor(id: number): Promise<ApiResponse<{ isFollowing: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { code: 200, data: { isFollowing: true }, message: 'success' }
  }
  return apiPost<{ isFollowing: boolean }>(`/institute/instructors/${id}/follow`)
}

/**
 * 提交讲师申请
 */
export async function submitInstructorApplication(
  application: InstructorApplication
): Promise<ApiResponse<{ success: boolean; applicationId: number }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 500))
    return { code: 200, data: { success: true, applicationId: Date.now() }, message: '申请提交成功' }
  }
  return apiPost<{ success: boolean; applicationId: number }>('/institute/apply', application as unknown as Record<string, unknown>)
}

/**
 * 获取我的申请状态
 */
export async function getMyApplication(): Promise<ApiResponse<InstructorApplication | null>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { code: 200, data: null, message: 'success' }
  }
  return apiGet<InstructorApplication | null>('/institute/apply/my')
}

// 关注/取消关注讲师
export async function followInstructor(instructorId: number): Promise<ApiResponse<{ success: boolean; isFollowing: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { code: 200, data: { success: true, isFollowing: true }, message: '关注成功' }
  }
  return apiPost<{ success: boolean; isFollowing: boolean }>(`/institute/instructors/${instructorId}/follow`)
}

// 工具函数
export function getInstructorLevelLabel(level: InstructorLevel): string {
  const labels: Record<InstructorLevel, string> = {
    junior: '初级讲师',
    senior: '高级讲师',
    expert: '专家讲师',
    master: '大师级讲师',
  }
  return labels[level]
}

export function getInstructorLevelColor(level: InstructorLevel): string {
  const colors: Record<InstructorLevel, string> = {
    junior: 'text-gray-600 bg-gray-100',
    senior: 'text-blue-600 bg-blue-50',
    expert: 'text-purple-600 bg-purple-50',
    master: 'text-primary bg-primary/10',
  }
  return colors[level]
}

export function getApplicationStatusLabel(status: ApplicationStatus): string {
  const labels: Record<ApplicationStatus, string> = {
    draft: '草稿',
    submitted: '已提交',
    reviewing: '审核中',
    approved: '已通过',
    rejected: '未通过',
  }
  return labels[status]
}

export function getApplicationStatusColor(status: ApplicationStatus): string {
  const colors: Record<ApplicationStatus, string> = {
    draft: 'text-gray-500 bg-gray-100',
    submitted: 'text-blue-600 bg-blue-50',
    reviewing: 'text-orange-600 bg-orange-50',
    approved: 'text-green-600 bg-green-50',
    rejected: 'text-red-600 bg-red-50',
  }
  return colors[status]
}

// ========== 讲师任务相关 API ==========

import type { 
  InstructorTask, 
  TaskListResponse, 
  TaskStats,
  TaskStatus,
  TaskType
} from '../types/institute'

// Mock 任务数据
const mockTasks: InstructorTask[] = [
  {
    id: 1,
    title: '录制八字入门视频课程',
    description: '录制一套完整的八字命理入门视频课程，包含基础理论、排盘方法、实例解析等内容，时长不少于3小时。',
    type: 'course',
    status: 'available',
    reward: { points: 500, bonus: 2000 },
    deadline: '2026-06-30',
    requirements: ['视频清晰度1080P以上', '配套PPT讲义', '至少10个实例分析'],
    createdAt: '2026-06-01',
  },
  {
    id: 2,
    title: '撰写紫微斗数专栏文章',
    description: '撰写5篇紫微斗数相关的专栏文章，每篇不少于2000字，需原创且具有专业深度。',
    type: 'article',
    status: 'in_progress',
    reward: { points: 200, bonus: 500 },
    deadline: '2026-06-20',
    acceptedAt: '2026-06-05',
    requirements: ['原创内容', '每篇2000字以上', '配图3张以上'],
    createdAt: '2026-06-01',
  },
  {
    id: 3,
    title: '回答学员问题（20题）',
    description: '在问答区回答学员提出的命理相关问题，需认真详细解答，帮助学员理解。',
    type: 'qa',
    status: 'completed',
    reward: { points: 100 },
    deadline: '2026-06-10',
    acceptedAt: '2026-06-03',
    completedAt: '2026-06-08',
    createdAt: '2026-05-28',
  },
  {
    id: 4,
    title: '开展一场直播公开课',
    description: '面向平台用户开展一场时长不少于1小时的直播公开课，主题自定。',
    type: 'live',
    status: 'available',
    reward: { points: 300, bonus: 800 },
    deadline: '2026-06-25',
    requirements: ['时长1小时以上', '互动答疑环节', '提前3天报备主题'],
    createdAt: '2026-06-02',
  },
  {
    id: 5,
    title: '审核新讲师试讲视频',
    description: '审核3位新申请讲师的试讲视频，给出专业评价和建议。',
    type: 'review',
    status: 'submitted',
    reward: { points: 150 },
    deadline: '2026-06-15',
    acceptedAt: '2026-06-08',
    submittedAt: '2026-06-12',
    submission: {
      content: '已完成3位讲师的试讲视频审核，详细评价已提交。',
      submittedAt: '2026-06-12 15:30',
    },
    createdAt: '2026-06-05',
  },
]

export async function getInstructorTasks(params?: {
  status?: TaskStatus | 'all'
  type?: TaskType
  page?: number
  pageSize?: number
}): Promise<ApiResponse<TaskListResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    let list = [...mockTasks]
    
    if (params?.status && params.status !== 'all') {
      if (params.status === 'available') {
        list = list.filter(t => t.status === 'available')
      } else if (params.status === 'in_progress') {
        list = list.filter(t => t.status === 'in_progress' || t.status === 'submitted')
      } else if (params.status === 'completed') {
        list = list.filter(t => t.status === 'completed')
      }
    }
    
    if (params?.type) {
      list = list.filter(t => t.type === params.type)
    }
    
    return {
      code: 200,
      data: { list, total: list.length, hasMore: false },
      message: 'success',
    }
  }
  return apiGet<TaskListResponse>('/institute/tasks', params as Record<string, unknown>)
}

export async function getTaskStats(): Promise<ApiResponse<TaskStats>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 200))
    return {
      code: 200,
      data: {
        available: 2,
        inProgress: 2,
        completed: 1,
        totalReward: 3800,
      },
      message: 'success',
    }
  }
  return apiGet<TaskStats>('/institute/tasks/stats')
}

export async function acceptTask(taskId: number): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { code: 200, data: { success: true }, message: '领取成功' }
  }
  return apiPost<{ success: boolean }>(`/institute/tasks/${taskId}/accept`)
}

export async function submitTask(
  taskId: number, 
  submission: { content: string; attachments?: string[] }
): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    return { code: 200, data: { success: true }, message: '提交成功' }
  }
  return apiPost<{ success: boolean }>(`/institute/tasks/${taskId}/submit`, submission)
}

export async function abandonTask(taskId: number, reason?: string): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { code: 200, data: { success: true }, message: '已放弃任务' }
  }
  return apiPost<{ success: boolean }>(`/institute/tasks/${taskId}/abandon`, { reason })
}

export function getTaskTypeLabel(type: TaskType): string {
  const labels: Record<TaskType, string> = {
    course: '课程制作',
    article: '文章撰写',
    qa: '问答解答',
    live: '直播授课',
    review: '内容审核',
    other: '其他',
  }
  return labels[type]
}

export function getTaskTypeColor(type: TaskType): string {
  const colors: Record<TaskType, string> = {
    course: 'text-blue-600 bg-blue-50',
    article: 'text-green-600 bg-green-50',
    qa: 'text-purple-600 bg-purple-50',
    live: 'text-red-600 bg-red-50',
    review: 'text-orange-600 bg-orange-50',
    other: 'text-gray-600 bg-gray-50',
  }
  return colors[type]
}

export function getTaskStatusLabel(status: TaskStatus): string {
  const labels: Record<TaskStatus, string> = {
    available: '可领取',
    in_progress: '进行中',
    submitted: '已提交',
    completed: '已完成',
    expired: '已过期',
    abandoned: '已放弃',
  }
  return labels[status]
}

export function getTaskStatusColor(status: TaskStatus): string {
  const colors: Record<TaskStatus, string> = {
    available: 'text-green-600 bg-green-50',
    in_progress: 'text-blue-600 bg-blue-50',
    submitted: 'text-orange-600 bg-orange-50',
    completed: 'text-primary bg-primary/10',
    expired: 'text-gray-500 bg-gray-100',
    abandoned: 'text-red-600 bg-red-50',
  }
  return colors[status]
}
