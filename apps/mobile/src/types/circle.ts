/**
 * 圈子类型定义
 * 基于后端 API /circles/** 端点
 */

/** 圈子信息 */
export interface CircleItem {
  id: string
  name: string
  description?: string
  cover?: string
  icon?: string
  memberCount?: number
  postCount?: number
  category?: string
  isJoined?: boolean
  isPaid?: boolean          // 付费圈子
  price?: number            // 入圈价格（分）
  joinMode?: 'free' | 'approval' | 'paid' | 'invite'
  ownerId?: string
  ownerName?: string
  ownerAvatar?: string
  tags?: string[]
  notice?: string
  createdAt?: string
  updatedAt?: string
}

/** 圈子帖子 */
export interface CirclePost {
  id: string
  circleId: string
  title: string
  content?: string
  images?: string[]
  author: {
    id: string
    nickname: string
    avatar: string
  }
  likeCount: number
  commentCount: number
  isLiked: boolean
  isCollected: boolean
  isEssence?: boolean       // 精华
  isTop?: boolean           // 置顶
  tags?: string[]
  createdAt: string
  updatedAt?: string
}

/** 圈子成员 */
export interface CircleMember {
  id: string
  userId: string
  nickname: string
  avatar: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: string
  lastActiveAt?: string
  postCount?: number
  isExpert?: boolean        // 是否达人
}

/** 圈子公告 */
export interface CircleAnnouncement {
  id: string
  circleId: string
  content: string
  isTop: boolean
  createdBy: string
  createdAt: string
  updatedAt?: string
}

/** 圈子达人 */
export interface CircleExpert {
  userId: string
  nickname: string
  avatar: string
  title?: string
  tags?: string[]
  price?: number            // 咨询价格
  isOnline?: boolean
}

/** 付费入圈准备 */
export interface JoinPrepareResult {
  orderId?: string
  price: number
  payType: string
  couponId?: string
}

/** 入圈状态 */
export interface JoinStatus {
  status: 'none' | 'pending' | 'approved' | 'rejected'
  expireAt?: string
}

/** 邀请码 */
export interface InviteCode {
  id: string
  code: string
  maxUses?: number
  usedCount: number
  createdAt: string
  expireAt?: string
}

/** 邀请统计 */
export interface InvitationStats {
  totalInvited: number
  totalEarned: number
  todayInvited: number
}

/** 圈子排行 */
export interface CircleRanking {
  id: string
  name: string
  icon: string
  memberCount: number
  postCount: number
  activityScore: number
  rank: number
}

/** 圈子仪表盘概览 */
export interface CircleDashboardOverview {
  memberCount: number
  postCount: number
  todayPosts: number
  totalRevenue: number
  monthlyRevenue: number
  pendingApprovals: number
  pendingQuestions: number
}

/** 圈子仪表盘趋势 */
export interface CircleDashboardTrend {
  date: string
  newMembers: number
  newPosts: number
  revenue: number
}

/** 圈子仪表盘收入明细 */
export interface CircleRevenueBreakdown {
  membership: number
  tips: number
  question: number
  product: number
  other: number
}

/** 圈子仪表盘热点内容 */
export interface CircleHotContent {
  id: string
  title: string
  type: 'post' | 'question'
  viewCount: number
  likeCount: number
  commentCount: number
  createdAt: string
}

/** 圈主仪表盘-即将流失成员预警 */
export interface ChurnWarningMember {
  userId: string
  nickname: string
  avatar: string
  lastActiveAt: string
  inactiveDays: number
  previousActivity: string
}

/** 草稿帖 */
export interface CirclePostDraft {
  id: string
  circleId?: string
  title: string
  content?: string
  images?: string[]
  tags?: string[]
  createdAt: string
  updatedAt: string
}
