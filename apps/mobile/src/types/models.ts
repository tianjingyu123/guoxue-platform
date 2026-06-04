/**
 * 通用业务模型
 * 基于后端 API 定义的所有共享业务类型
 */

// ==================== 用户相关 ====================

/** 用户基本信息 */
export interface UserInfo {
  id: string
  phone?: string
  nickname: string
  avatar: string
  isVip: boolean
  vipExpireAt?: string
  gender?: number       // 0-未知 1-男 2-女
  birthday?: string
  signature?: string
  email?: string
  createdAt?: string
  updatedAt?: string
}

/** 用户角色 */
export type UserRole = 'user' | 'circle_owner' | 'teacher' | 'station_owner' | 'admin'

/** 用户角色信息 */
export interface UserRoleInfo {
  type: UserRole
  name: string
  id: number
}

/** 用户统计数据 */
export interface UserStats {
  following: number
  followers: number
  likes: number
  articles?: number
  posts?: number
}

/** 用户完整资料 */
export interface UserProfile {
  id: string
  nickname: string
  avatar: string
  bio?: string
  isVip: boolean
  vipLevel?: string
  vipExpireAt?: string
  isVerified: boolean
  roles: UserRoleInfo[]
  stats: UserStats
  coins?: number
  points?: number
  createdAt?: string
}

/** 登录请求 */
export interface LoginRequest {
  account: string
  password: string
}

/** 手机号+验证码登录请求 */
export interface SmsLoginRequest {
  phone: string
  code: string
}

/** 微信登录请求 */
export interface WechatLoginRequest {
  code: string
  loginType?: string
  nickname?: string
  avatar?: string
  referrerCode?: string
}

/** 注册请求 */
export interface RegisterRequest {
  phone: string
  code: string
  password: string
  nickname?: string
  inviteCode?: string
}

/** 登录/注册响应 */
export interface AuthResponse {
  accessToken: string
  refreshToken: string
  expiresIn?: number
  user: UserInfo
}

/** Token 刷新响应 */
export interface RefreshTokenResponse {
  accessToken: string
  refreshToken?: string
}

/** 发送短信验证码请求 */
export interface SendCodeRequest {
  phone: string
  scene?: string       // LOGIN | REGISTER | RESET_PASSWORD | CHANGE_PHONE
}

// ==================== 媒体相关 ====================

/** 上传响应 */
export interface UploadResponse {
  url: string
  id?: string
  width?: number
  height?: number
  size?: number
  mimeType?: string
}

/** 图片信息 */
export interface ImageInfo {
  url: string
  thumbUrl?: string
  width?: number
  height?: number
  alt?: string
}

/** 视频信息 */
export interface VideoInfo {
  id: string
  url: string
  coverUrl?: string
  title?: string
  duration?: number      // 秒
  width?: number
  height?: number
  size?: number
  status?: 'processing' | 'ready' | 'failed'
  createdAt?: string
}

/** 音频信息 */
export interface AudioInfo {
  url: string
  duration?: number
  size?: number
  mimeType?: string
}

/** VOD 上传签名 */
export interface VodUploadSignature {
  signature: string
  fileId?: string
  uploadUrl?: string
}

/** VOD 播放签名 */
export interface VodPlaySignature {
  signature: string
  fileId: string
  expireAt?: string
}

// ==================== 位置相关 ====================

/** 地理位置 */
export interface GeoLocation {
  latitude: number
  longitude: number
  address?: string
  name?: string
}

// ==================== 通知相关 ====================

/** 通知项 */
export interface NotificationItem {
  id: string
  type: string
  title: string
  content?: string
  isRead: boolean
  refType?: string
  refId?: string
  sender?: {
    id: string
    nickname: string
    avatar: string
  }
  createdAt: string
}

/** 通知未读数 */
export interface UnreadCount {
  total: number
  byType?: Record<string, number>
}

// ==================== 搜索相关 ====================

/** 搜索请求 */
export interface SearchParams {
  q: string
  type?: string
  page?: number
  pageSize?: number
  [key: string]: any
}

/** 搜索建议 */
export interface SearchSuggestion {
  keyword: string
  type?: string
  count?: number
}

/** 热门搜索 */
export interface HotSearchItem {
  keyword: string
  rank: number
  heat?: number
}

// ==================== 系统配置 ====================

/** Banner 项 */
export interface BannerItem {
  id: string
  title?: string
  imageUrl: string
  linkUrl?: string
  sort?: number
  type?: string
}

/** 会员套餐 */
export interface MemberPlan {
  id: string
  name: string
  price: number
  originalPrice?: number
  durationDays: number
  benefits: string[]
  badge?: string
}

/** 会员状态 */
export interface MemberStatus {
  isMember: boolean
  planName?: string
  expireAt?: string
  daysLeft?: number
  benefits?: string[]
}

/** 站点公告 */
export interface SiteNotice {
  id: string
  title: string
  content?: string
  type?: 'info' | 'warning' | 'success'
  createdAt: string
}

// ==================== JSON 通用引用 ====================

/** 通用引用对象（用于关联用户、圈子等小型对象内联） */
export interface RefUser {
  id: string
  nickname: string
  avatar: string
}

export interface RefCircle {
  id: string
  name: string
  icon?: string
  memberCount?: number
}
