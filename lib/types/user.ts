// 用户相关类型定义

// 用户角色类型
export type UserRole = 'user' | 'circle_owner' | 'teacher' | 'station_owner'

// 用户角色信息
export interface UserRoleInfo {
  type: UserRole
  name: string
  id: number
}

// 用户统计数据
export interface UserStats {
  following: number
  followers: number
  likes: number
}

// 用户订单统计
export interface UserOrderStats {
  pending: number
  shipped: number
  received: number
  refund: number
}

// 继续学习的课程
export interface ContinueLearning {
  id: number
  title: string
  progress: number
  lastLesson: string
}

// 用户完整信息
export interface UserProfile {
  id: number
  name: string
  avatar: string
  bio: string
  isVip: boolean
  vipLevel: string
  vipExpiry: string
  vipDaysLeft: number
  isVerified: boolean
  roles: UserRoleInfo[]
  stats: UserStats
  coins: number
  coupons: number
  points: number
  orders: UserOrderStats
  continueLearning?: ContinueLearning
}

// 登录请求参数
export interface LoginRequest {
  phone: string
  code?: string             // 验证码登录
  password?: string         // 密码登录
}

// 微信登录请求
export interface WechatLoginRequest {
  code: string              // 微信授权码
}

// Apple登录请求
export interface AppleLoginRequest {
  identityToken: string
  authorizationCode: string
}

// 注册请求参数
export interface RegisterRequest {
  phone: string
  code: string
  password: string
  confirmPassword: string
  inviteCode?: string
}

// 登录响应
export interface LoginResponse {
  token: string
  user: UserProfile
}

// 发送验证码请求
export interface SendCodeRequest {
  phone: string
  type: 'login' | 'register' | 'reset'
}
