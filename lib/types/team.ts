// 团队管理相关类型定义

// 团队概览
export interface TeamOverview {
  totalMembers: number
  newMembersThisMonth: number
  totalCommission: number
  commissionRate: number  // 提成比例 0-100
  myLevel: string
  nextLevelRequirement: number
}

// 团队成员
export interface TeamMember {
  id: number
  avatar: string
  nickname: string
  phone: string  // 脱敏
  level: string
  levelIcon: string
  joinDate: string
  totalCommission: number
  thisMonthCommission: number
  inviteCount: number
  status: 'active' | 'inactive'
  lastActiveTime: string
}

// 团队成员列表响应
export interface TeamMembersResponse {
  list: TeamMember[]
  total: number
  hasMore: boolean
}

// 排行榜项
export interface LeaderboardItem {
  rank: number
  userId: number
  avatar: string
  nickname: string
  level: string
  value: number  // 排行值（佣金/邀请数等）
  change: number  // 相比上期变化
}

// 排行榜响应
export interface TeamLeaderboardResponse {
  list: LeaderboardItem[]
  myRank?: number
  myValue?: number
  updateTime: string
}

// 团队动态
export interface TeamActivity {
  id: number
  type: 'join' | 'upgrade' | 'commission' | 'invite' | 'achievement'
  userId: number
  userAvatar: string
  userNickname: string
  content: string
  amount?: number
  createdAt: string
}

// 团队动态响应
export interface TeamActivityResponse {
  list: TeamActivity[]
  hasMore: boolean
}

// 成功案例
export interface TeamSuccessCase {
  id: number
  userId: number
  avatar: string
  nickname: string
  title: string
  description: string
  achievement: string
  duration: string  // 加入时长
  totalEarnings: number
  createdAt: string
}

// 团队管理数据
export interface TeamManagementData {
  overview: TeamOverview
  recentMembers: TeamMember[]
  topMembers: LeaderboardItem[]
}
