// 研究院相关类型定义

// 讲师级别
export type InstructorLevel = 'junior' | 'senior' | 'expert' | 'master'

// 讲师状态
export type InstructorStatus = 'active' | 'inactive' | 'pending'

// 讲师信息
export interface Instructor {
  id: number
  name: string
  avatar: string
  // 头衔
  title: string
  level: InstructorLevel
  // 认证
  verified: boolean
  // 擅长领域
  specialties: string[]
  // 简介
  bio?: string
  // 统计
  studentCount: number
  courseCount: number
  rating: number
  reviewCount: number
  // 状态
  status: InstructorStatus
  // 是否关注
  isFollowing?: boolean
}

// 讲师详情
export interface InstructorDetail extends Instructor {
  // 详细介绍
  introduction: string
  // 教育背景
  education?: string[]
  // 从业经历
  experience?: string[]
  // 资质证书
  certificates?: {
    name: string
    issuer: string
    year: number
  }[]
  // 代表作品/课程
  featuredCourses?: {
    id: number
    title: string
    cover: string
    studentCount: number
    rating: number
  }[]
  // 学员评价
  reviews?: {
    id: number
    user: { name: string; avatar: string }
    rating: number
    content: string
    time: string
  }[]
  // 联系方式（仅对已购买用户可见）
  contact?: {
    wechat?: string
    phone?: string
    email?: string
  }
}

// 讲师列表响应
export interface InstructorListResponse {
  list: Instructor[]
  total: number
  hasMore: boolean
}

// 研究院活动类型
export type InstituteEventType = 'lecture' | 'seminar' | 'workshop' | 'conference' | 'online'

// 研究院活动状态
export type InstituteEventStatus = 'upcoming' | 'enrolling' | 'ongoing' | 'ended'

// 研究院活动
export interface InstituteEvent {
  id: number
  title: string
  cover: string
  type: InstituteEventType
  status: InstituteEventStatus
  // 时间
  startTime: string
  endTime: string
  // 地点
  location?: string
  isOnline: boolean
  // 主讲人
  speakers: {
    id: number
    name: string
    avatar: string
    title: string
  }[]
  // 报名
  maxParticipants?: number
  currentParticipants: number
  // 价格
  price: number
  originalPrice?: number
  // 简介
  description?: string
  // 标签
  tags?: string[]
}

// 研究院简介
export interface InstituteInfo {
  name: string
  slogan: string
  mission: string
  description: string
  bannerUrl: string
  stats: {
    instructorCount: number
    studentCount: number
    courseCount: number
    eventCount: number
  }
}

// 讲师申请状态
export type ApplicationStatus = 'draft' | 'submitted' | 'reviewing' | 'approved' | 'rejected'

// 讲师申请
export interface InstructorApplication {
  id?: number
  // 基本信息
  realName: string
  phone: string
  email?: string
  idCard?: string
  // 专业信息
  specialties: string[]
  experience: string
  introduction: string
  // 资质证明
  certificates?: string[]  // 图片URL
  // 状态
  status?: ApplicationStatus
  rejectReason?: string
  createdAt?: string
  updatedAt?: string
}

// ========== 讲师任务相关 ==========

// 任务状态
export type TaskStatus = 'available' | 'in_progress' | 'submitted' | 'completed' | 'expired' | 'abandoned'

// 任务类型
export type TaskType = 'course' | 'article' | 'qa' | 'live' | 'review' | 'other'

// 讲师任务
export interface InstructorTask {
  id: number
  title: string
  description: string
  // 类型
  type: TaskType
  // 状态
  status: TaskStatus
  // 奖励
  reward: {
    points: number
    bonus?: number  // 现金奖励（元）
  }
  // 时间
  deadline: string
  acceptedAt?: string
  submittedAt?: string
  completedAt?: string
  // 要求
  requirements?: string[]
  // 提交内容
  submission?: {
    content: string
    attachments?: string[]
    submittedAt: string
  }
  // 审核
  reviewComment?: string
  // 创建信息
  createdAt: string
}

// 任务列表响应
export interface TaskListResponse {
  list: InstructorTask[]
  total: number
  hasMore: boolean
}

// 任务统计
export interface TaskStats {
  available: number
  inProgress: number
  completed: number
  totalReward: number
}
