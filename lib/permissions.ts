/**
 * 热卜国学平台 - 权限系统
 * 
 * 核心原则：
 * - 普通用户不能随意发布内容到首页，只能在加入的圈子内互动
 * - 所有内容（文章、课程、直播、帖子、问答、比赛）都基于圈子发起
 * - 圈主是内容的责任人和受益者
 */

// ============================================
// 角色定义
// ============================================

export type UserRole = 
  | 'user'           // 普通用户 - 消费/学习/互动
  | 'circle_owner'   // 圈主 - 内容创作核心
  | 'circle_admin'   // 圈子管理员 - 协助管理
  | 'circle_partner' // 合伙人 - 高级管理员
  | 'circle_guest'   // 嘉宾/老师 - 可发布内容
  | 'circle_volunteer' // 志愿者 - 协助管理
  | 'station_owner'  // 分站站长 - 推广者
  | 'operator_online'  // 线上运营商 - 团队长
  | 'operator_offline' // 线下运营商 - 驿站管理者
  | 'offline_teacher'  // 线下老师 - 基于研究院管理

// 圈子内角色
export type CircleMemberRole = 
  | 'owner'      // 圈主
  | 'partner'    // 合伙人
  | 'admin'      // 管理员
  | 'guest'      // 嘉宾
  | 'volunteer'  // 志愿者
  | 'member'     // 普通成员

// ============================================
// 圈子成员信息
// ============================================

export interface CircleMembership {
  circleId: string
  circleName: string
  circleAvatar?: string
  role: CircleMemberRole
  joinedAt: string
}

// ============================================
// 用户权限信息
// ============================================

export interface UserPermissions {
  // 用户管理的圈子（作为圈主）
  ownedCircles: CircleMembership[]
  // 用户担任嘉宾的圈子
  guestCircles: CircleMembership[]
  // 用户加入的圈子（普通成员）
  joinedCircles: CircleMembership[]
  // 是否是站长
  isStationOwner: boolean
  // 是否是运营商
  isOperator: boolean
  // 运营商类型
  operatorType?: 'online' | 'offline'
}

// ============================================
// 内容类型
// ============================================

export type ContentType = 
  | 'post'      // 帖子 - 圈内成员可发
  | 'article'   // 文章 - 圈主/嘉宾可发
  | 'course'    // 课程 - 圈主/嘉宾可发
  | 'live'      // 直播 - 圈主/嘉宾可发（需授权）
  | 'video'     // 短视频 - 圈主/嘉宾可发
  | 'qa'        // 问答 - 圈主发起
  | 'contest'   // 比赛 - 圈主发起

// 可见范围
export type ContentVisibility = 
  | 'circle_only'    // 仅圈内可见
  | 'platform_wide'  // 全平台可见（需审核）

// 付费类型
export type PaymentType = 
  | 'free'        // 免费
  | 'paid'        // 付费
  | 'member_free' // 圈内免费，圈外付费

// ============================================
// 权限检查函数
// ============================================

/**
 * 检查用户是否有发布内容的权限
 */
export function canPublishContent(
  contentType: ContentType,
  circleId: string,
  membership: CircleMembership | undefined
): { allowed: boolean; reason?: string } {
  if (!membership) {
    return { allowed: false, reason: '您还未加入该圈子' }
  }

  const { role } = membership

  switch (contentType) {
    case 'post':
      // 帖子：所有圈子成员可发
      return { allowed: true }
    
    case 'article':
    case 'video':
      // 文章、短视频：圈主、合伙人、嘉宾可发
      if (['owner', 'partner', 'guest'].includes(role)) {
        return { allowed: true }
      }
      return { allowed: false, reason: '只有圈主和嘉宾可以发布文章' }
    
    case 'course':
      // 课程：圈主、合伙人、嘉宾可发
      if (['owner', 'partner', 'guest'].includes(role)) {
        return { allowed: true }
      }
      return { allowed: false, reason: '只有圈主和嘉宾可以发布课程' }
    
    case 'live':
      // 直播：圈主、合伙人、嘉宾可发（嘉宾需授权）
      if (['owner', 'partner'].includes(role)) {
        return { allowed: true }
      }
      if (role === 'guest') {
        // 嘉宾需要检查是否有直播授权（这里简化处理）
        return { allowed: true }
      }
      return { allowed: false, reason: '只有圈主和授权嘉宾可以开播' }
    
    case 'qa':
    case 'contest':
      // 问答、比赛：仅圈主可发起
      if (role === 'owner') {
        return { allowed: true }
      }
      return { allowed: false, reason: '只有圈主可以发起问答/比赛' }
    
    default:
      return { allowed: false, reason: '未知内容类型' }
  }
}

/**
 * 检查用户是否可以管理圈子内容
 */
export function canManageContent(
  membership: CircleMembership | undefined
): boolean {
  if (!membership) return false
  return ['owner', 'partner', 'admin'].includes(membership.role)
}

/**
 * 检查用户是否可以管理圈子成员
 */
export function canManageMembers(
  membership: CircleMembership | undefined
): boolean {
  if (!membership) return false
  return ['owner', 'partner', 'admin'].includes(membership.role)
}

/**
 * 检查用户是否可以设置圈子收费
 */
export function canSetPricing(
  membership: CircleMembership | undefined
): boolean {
  if (!membership) return false
  return ['owner', 'partner'].includes(membership.role)
}

/**
 * 检查用户是否可以查看圈子收益
 */
export function canViewRevenue(
  membership: CircleMembership | undefined
): boolean {
  if (!membership) return false
  return ['owner', 'partner'].includes(membership.role)
}

/**
 * 获取用户在圈子中的角色标签
 */
export function getRoleLabel(role: CircleMemberRole): string {
  const labels: Record<CircleMemberRole, string> = {
    owner: '圈主',
    partner: '合伙人',
    admin: '管理员',
    guest: '嘉宾',
    volunteer: '志愿者',
    member: '成员',
  }
  return labels[role] || '成员'
}

/**
 * 获取用户在圈子中的角色颜色
 */
export function getRoleColor(role: CircleMemberRole): { bg: string; text: string } {
  const colors: Record<CircleMemberRole, { bg: string; text: string }> = {
    owner: { bg: 'bg-gold/10', text: 'text-gold' },
    partner: { bg: 'bg-primary/10', text: 'text-primary' },
    admin: { bg: 'bg-info/10', text: 'text-info' },
    guest: { bg: 'bg-operator/10', text: 'text-operator' },
    volunteer: { bg: 'bg-success/10', text: 'text-success' },
    member: { bg: 'bg-gray-100', text: 'text-gray-600' },
  }
  return colors[role] || colors.member
}

/**
 * 获取内容类型标签
 */
export function getContentTypeLabel(type: ContentType): string {
  const labels: Record<ContentType, string> = {
    post: '帖子',
    article: '文章',
    course: '课程',
    live: '直播',
    video: '短视频',
    qa: '问答',
    contest: '比赛',
  }
  return labels[type] || type
}

/**
 * 获取可见范围标签
 */
export function getVisibilityLabel(visibility: ContentVisibility): string {
  const labels: Record<ContentVisibility, string> = {
    circle_only: '仅圈内可见',
    platform_wide: '全平台可见',
  }
  return labels[visibility] || visibility
}

/**
 * 获取付费类型标签
 */
export function getPaymentTypeLabel(type: PaymentType): string {
  const labels: Record<PaymentType, string> = {
    free: '免费',
    paid: '付费',
    member_free: '圈内免费',
  }
  return labels[type] || type
}

// ============================================
// 权限检查 Hook（客户端使用）
// ============================================

// Mock当前用户权限数据（实际应从API获取）
export const mockCurrentUserPermissions: UserPermissions = {
  ownedCircles: [
    { circleId: '1', circleName: '八字命理研习社', circleAvatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=circle1', role: 'owner', joinedAt: '2023-01-01' },
    { circleId: '2', circleName: '风水堪舆交流群', circleAvatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=circle2', role: 'owner', joinedAt: '2023-03-15' },
  ],
  guestCircles: [
    { circleId: '3', circleName: '紫微斗数学习班', circleAvatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=circle3', role: 'guest', joinedAt: '2024-01-01' },
  ],
  joinedCircles: [
    { circleId: '4', circleName: '国学经典研读会', role: 'member', joinedAt: '2024-02-01' },
  ],
  isStationOwner: false,
  isOperator: false,
}

/**
 * 获取用户可以发布内容的所有圈子
 */
export function getPublishableCircles(
  permissions: UserPermissions,
  contentType: ContentType
): CircleMembership[] {
  const allCircles = [
    ...permissions.ownedCircles,
    ...permissions.guestCircles,
    ...(contentType === 'post' ? permissions.joinedCircles : []),
  ]
  
  return allCircles.filter(circle => {
    const result = canPublishContent(contentType, circle.circleId, circle)
    return result.allowed
  })
}
