// 邀请记录相关类型定义

// 邀请统计
export interface InviteStats {
  totalInvited: number        // 邀请人数
  registeredCount: number     // 注册人数
  paidCount: number           // 付费人数
  totalEarnings: number       // 总收益
  pendingEarnings: number     // 待结算收益
  todayInvited: number        // 今日邀请
  monthInvited: number        // 本月邀请
}

// 被邀请人状态
export type InviteeStatus = 'registered' | 'paid' | 'vip'

// 邀请记录项
export interface InviteRecord {
  id: number
  // 被邀请人信息
  invitee: {
    id: number
    nickname: string
    avatar: string
    phone: string             // 脱敏显示
  }
  // 状态
  status: InviteeStatus
  registeredAt: string        // 注册时间
  paidAt?: string             // 首次付费时间
  paidAmount?: number         // 累计付费金额
  // 佣金
  commission: number          // 已获得佣金
  pendingCommission: number   // 待结算佣金
}

// 邀请记录响应
export interface InviteRecordsResponse {
  list: InviteRecord[]
  total: number
  hasMore: boolean
}

// 邀请链接信息
export interface InviteLinkInfo {
  inviteCode: string
  inviteLink: string
  qrCodeUrl: string
  expireAt?: string
}

// ========== 邀请分享相关 ==========

// 分享海报配置
export interface InvitePosterConfig {
  // 用户信息
  userAvatar: string
  userName: string
  userId: number
  // 背景图
  backgroundImages: string[]
  // 邀请码
  inviteCode: string
  qrCodeUrl: string
  // 文案
  title: string
  subtitle: string
  benefits: string[]
}

// 分享渠道
export type ShareChannel = 'wechat' | 'moments' | 'qq' | 'weibo' | 'copy'

// 分享配置
export interface ShareConfig {
  title: string
  description: string
  imageUrl: string
  link: string
}
