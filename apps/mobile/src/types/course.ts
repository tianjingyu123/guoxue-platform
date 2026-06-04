/**
 * 课程类型定义
 * 基于后端 API /courses/** 端点
 */

/** 课程分类 */
export interface CourseCategory {
  id: string
  name: string
  icon?: string
  parentId?: string
  sort?: number
}

/** 课程条目 */
export interface CourseItem {
  id: string
  title: string
  description?: string
  cover?: string
  instructor?: string       // 讲师名
  instructorId?: string
  instructorAvatar?: string
  categoryId?: string
  categoryName?: string
  totalChapters?: number
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  duration?: number         // 总时长（分钟）
  studentCount?: number     // 学习人数
  price?: number            // 价格（分），0=免费
  originalPrice?: number
  isFree?: boolean
  status?: 'draft' | 'published' | 'archived'
  tags?: string[]
  rating?: number           // 评分 1-5
  reviewCount?: number
  hasCertificate?: boolean
  createdAt?: string
  updatedAt?: string
}

/** 课程章节 */
export interface ChapterItem {
  id: string
  courseId: string
  title: string
  summary?: string
  duration?: number          // 时长（秒）
  sort?: number
  isFree?: boolean
  videoUrl?: string
  content?: string           // 富文本内容
  contentType?: 'video' | 'audio' | 'text' | 'live'
  createdAt?: string
}

/** 学习进度 */
export interface CourseProgress {
  courseId: string
  courseProgress: number     // 0-100 总进度百分比
  completedChapters: string[] // 已完成的章节ID列表
  chapterProgress: Record<string, number>  // 章节ID -> 进度(0-100)
  lastChapterId?: string
  lastStudyAt?: string
}

/** 课程问答 */
export interface CourseQuestion {
  id: string
  courseId: string
  chapterId?: string
  userId: string
  nickname: string
  avatar: string
  question: string
  answer?: string
  answererId?: string
  answererName?: string
  status: 'pending' | 'answered' | 'closed'
  tags?: string[]
  createdAt: string
  updatedAt?: string
}

/** 课程评价 */
export interface CourseReview {
  id: string
  courseId: string
  userId: string
  nickname: string
  avatar: string
  rating: number             // 1-5
  content: string
  orderId?: string
  createdAt: string
}

/** 课程评分概览 */
export interface CourseRating {
  average: number
  total: number
  distribution: Record<number, number>  // { 1: count, 2: count, 3: count, 4: count, 5: count }
}

/** 课程仪表盘（我学习中的课程概览） */
export interface CourseDashboard {
  inProgress: number         // 学习中
  completed: number          // 已完成
  totalDuration: number      // 累计学习时长（分钟）
  streakDays?: number        // 连续学习天数
}

/** 课程学员作业 */
export interface CourseWork {
  id: string
  courseId: string
  chapterId: string
  userId: string
  nickname: string
  avatar: string
  content: string
  images?: string[]
  createdAt: string
  updatedAt?: string
}

/** 课程证书 */
export interface CourseCertificate {
  id: string
  courseId: string
  courseTitle: string
  userId: string
  userName: string
  issueDate: string
  certNo: string
  verifyUrl?: string
}

/** 课程草稿 */
export interface CourseDraft {
  id: string
  title: string
  description?: string
  cover?: string
  categoryId?: string
  price?: number
  difficulty?: string
  tags?: string[]
  chapters?: Array<{
    title: string
    contentType?: string
    content?: string
  }>
  status: 'draft'
  createdAt: string
  updatedAt: string
}
