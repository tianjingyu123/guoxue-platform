/**
 * 热卜国学平台 - TypeScript 类型定义
 * 
 * 本文件定义项目核心数据类型，供前后端对接使用。
 */

// ============================================
// 用户相关类型
// ============================================

/** 用户角色 */
export type UserRole = 
  | 'user'           // 普通用户
  | 'circleOwner'    // 圈主
  | 'guest'          // 嘉宾老师
  | 'stationMaster'  // 分站站长
  | 'operator'       // 运营商
  | 'offlineOperator' // 线下运营商
  | 'instituteAdmin' // 研究院管理员
  | 'offlineTeacher' // 线下老师
  | 'reviewer'       // 内容审核员
  | 'admin'          // 平台管理员

/** 用户性别 */
export type Gender = 'male' | 'female' | 'unknown'

/** 用户基础信息 */
export interface User {
  id: string
  nickname: string
  avatar: string
  phone?: string
  email?: string
  gender: Gender
  bio?: string
  isVerified: boolean
  isVip: boolean
  vipExpireTime?: string
  level: number
  levelName: string
  experience: number
  roles: UserRole[]
  createdAt: string
  updatedAt: string
}

/** 用户资产 */
export interface UserAssets {
  coins: number
  points: number
  coupons: number
  balance: number
}

/** 用户统计 */
export interface UserStats {
  followersCount: number
  followingCount: number
  coursesCount: number
  circlesCount: number
  postsCount: number
  likesCount: number
}

// ============================================
// 课程相关类型
// ============================================

/** 课程状态 */
export type CourseStatus = 'draft' | 'published' | 'offline'

/** 课程信息 */
export interface Course {
  id: string
  title: string
  subtitle?: string
  cover: string
  description: string
  content?: string
  instructorId: string
  instructor: Instructor
  categoryId: string
  categoryName: string
  tags: string[]
  price: number
  originalPrice: number
  isFree: boolean
  isVipFree: boolean
  duration: number
  chaptersCount: number
  studentsCount: number
  rating: number
  ratingsCount: number
  status: CourseStatus
  publishedAt?: string
  createdAt: string
  updatedAt: string
}

/** 讲师信息 */
export interface Instructor {
  id: string
  name: string
  avatar: string
  title: string
  bio: string
  isVerified: boolean
  coursesCount: number
  studentsCount: number
  rating: number
}

/** 课程章节 */
export interface CourseChapter {
  id: string
  courseId: string
  title: string
  description?: string
  order: number
  lessons: CourseLesson[]
}

/** 课程课时 */
export interface CourseLesson {
  id: string
  chapterId: string
  title: string
  duration: number
  videoUrl?: string
  isFree: boolean
  order: number
}

/** 学习进度 */
export interface LearningProgress {
  courseId: string
  lessonId: string
  progress: number
  completed: boolean
  lastPlayedAt: string
}

// ============================================
// 圈子相关类型
// ============================================

/** 圈子状态 */
export type CircleStatus = 'active' | 'frozen' | 'closed'

/** 圈子成员角色 */
export type CircleMemberRole = 'owner' | 'admin' | 'guest' | 'member'

/** 圈子信息 */
export interface Circle {
  id: string
  name: string
  avatar: string
  cover?: string
  description: string
  announcement?: string
  ownerId: string
  owner: User
  categoryId: string
  categoryName: string
  tags: string[]
  memberCount: number
  postCount: number
  isPublic: boolean
  isPaid: boolean
  price?: number
  memberPrice?: number
  status: CircleStatus
  createdAt: string
}

/** 圈子成员 */
export interface CircleMember {
  id: string
  circleId: string
  userId: string
  user: User
  role: CircleMemberRole
  nickname?: string
  joinedAt: string
  expireAt?: string
}

// ============================================
// 帖子相关类型
// ============================================

/** 帖子类型 */
export type PostType = 'normal' | 'question' | 'activity' | 'announcement'

/** 帖子可见范围 */
export type PostVisibility = 'public' | 'circle'

/** 帖子状态 */
export type PostStatus = 'pending' | 'published' | 'rejected' | 'deleted'

/** 帖子视频 */
export interface PostVideo {
  url: string
  cover: string
  duration: number
}

/** 帖子信息 */
export interface Post {
  id: string
  circleId: string
  authorId: string
  author: User
  title?: string
  content: string
  images?: string[]
  video?: PostVideo
  type: PostType
  isTop: boolean
  isEssence: boolean
  visibility: PostVisibility
  viewCount: number
  likeCount: number
  commentCount: number
  shareCount: number
  status: PostStatus
  createdAt: string
  updatedAt: string
}

/** 评论状态 */
export type CommentStatus = 'normal' | 'hidden'

/** 评论信息 */
export interface Comment {
  id: string
  postId: string
  authorId: string
  author: User
  content: string
  parentId?: string
  replyTo?: User
  likeCount: number
  status: CommentStatus
  createdAt: string
}

// ============================================
// 订单相关类型
// ============================================

/** 订单类型 */
export type OrderType = 'course' | 'circle' | 'vip' | 'coins' | 'goods'

/** 支付方式 */
export type PayMethod = 'wechat' | 'alipay' | 'coins' | 'balance'

/** 订单状态 */
export type OrderStatus = 'pending' | 'paid' | 'cancelled' | 'refunded'

/** 订单项 */
export interface OrderItem {
  id: string
  productId: string
  productType: string
  productName: string
  productCover: string
  price: number
  quantity: number
  amount: number
}

/** 订单信息 */
export interface Order {
  id: string
  orderNo: string
  userId: string
  type: OrderType
  items: OrderItem[]
  totalAmount: number
  discountAmount: number
  payAmount: number
  payMethod?: PayMethod
  status: OrderStatus
  paidAt?: string
  createdAt: string
}

// ============================================
// 内容审核类型
// ============================================

/** 审核内容类型 */
export type ReviewContentType = 'post' | 'comment' | 'course' | 'circle'

/** 审核状态 */
export type ReviewStatus = 'pending' | 'approved' | 'rejected'

/** AI审核建议 */
export type AISuggestion = 'pass' | 'review' | 'reject'

/** AI审核结果 */
export interface AIReviewResult {
  score: number
  labels: string[]
  suggestion: AISuggestion
}

/** 审核任务 */
export interface ReviewTask {
  id: string
  contentId: string
  contentType: ReviewContentType
  content: unknown
  authorId: string
  author: User
  status: ReviewStatus
  reviewerId?: string
  reviewer?: User
  rejectReason?: string
  aiResult?: AIReviewResult
  createdAt: string
  reviewedAt?: string
}

// ============================================
// 分佣相关类型
// ============================================

/** 推广关系类型 */
export type ReferralType = 'permanent' | 'temporary'

/** 推广关系 */
export interface Referral {
  id: string
  userId: string
  referrerId: string
  referrerRole: 'stationMaster' | 'operator'
  type: ReferralType
  createdAt: string
}

/** 分佣来源类型 */
export type CommissionSourceType = 'circle_join' | 'course_buy' | 'goods_buy'

/** 分佣状态 */
export type CommissionStatus = 'pending' | 'settled' | 'cancelled'

/** 分佣记录 */
export interface Commission {
  id: string
  userId: string
  userRole: UserRole
  orderId: string
  orderAmount: number
  commissionRate: number
  commissionAmount: number
  sourceUserId: string
  sourceType: CommissionSourceType
  status: CommissionStatus
  settledAt?: string
  createdAt: string
}

// ============================================
// API响应类型
// ============================================

/** 统一API响应 */
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
  timestamp: number
}

/** 分页数据 */
export interface PaginatedData<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

/** 分页API响应 */
export interface PaginatedResponse<T> extends ApiResponse<PaginatedData<T>> {}

// ============================================
// 通用类型
// ============================================

/** 分类信息 */
export interface Category {
  id: string
  name: string
  icon?: string
  parentId?: string
  order: number
}

/** 标签信息 */
export interface Tag {
  id: string
  name: string
  color?: string
}

/** 通知信息 */
export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  content: string
  isRead: boolean
  relatedId?: string
  relatedType?: string
  createdAt: string
}

/** 搜索参数 */
export interface SearchParams {
  keyword?: string
  page?: number
  pageSize?: number
  sort?: string
  order?: 'asc' | 'desc'
}
