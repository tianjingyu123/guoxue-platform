// 用户相关 API
import { apiGet, apiPost, useMock } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { UserProfile, LoginRequest, LoginResponse, SendCodeRequest, WechatLoginRequest, AppleLoginRequest, RegisterRequest } from '../types/user'

// ========== Mock 数据 ==========

const mockUserProfile: UserProfile = {
  id: 1,
  name: '张三丰',
  avatar: '',
  bio: '易学爱好者 | 八字研习中',
  isVip: true,
  vipLevel: '黄金会员',
  vipExpiry: '2025-12-31',
  vipDaysLeft: 234,
  isVerified: true,
  roles: [
    { type: 'circle_owner', name: '张氏命理研习社', id: 1 },
    { type: 'teacher', name: '八字入门精讲', id: 1 },
  ],
  stats: {
    following: 128,
    followers: 1024,
    likes: 3680,
  },
  coins: 520,
  coupons: 3,
  points: 1280,
  orders: {
    pending: 2,
    shipped: 1,
    received: 3,
    refund: 0,
  },
  continueLearning: {
    id: 1,
    title: '八字入门实战课',
    progress: 45,
    lastLesson: '第三章：天干地支详解',
  },
}

// ========== API 函数 ==========

// 获取用户信息
export async function getUserProfile(): Promise<ApiResponse<UserProfile>> {
  if (useMock()) {
    return { code: 200, data: mockUserProfile, message: 'success' }
  }
  return apiGet<UserProfile>('/user/profile')
}

// 登录
export async function login(params: LoginRequest): Promise<ApiResponse<LoginResponse>> {
  if (useMock()) {
    // 模拟登录延迟
    await new Promise(resolve => setTimeout(resolve, 1000))
    return {
      code: 200,
      data: {
        token: 'mock_token_' + Date.now(),
        user: mockUserProfile,
      },
      message: 'success',
    }
  }
  return apiPost<LoginResponse>('/auth/login', params)
}

// 发送验证码
export async function sendVerifyCode(params: SendCodeRequest): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 500))
    return { code: 200, data: { success: true }, message: '验证码已发送' }
  }
  return apiPost<{ success: boolean }>('/auth/send-code', params)
}

// 退出登录
export async function logout(): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    return { code: 200, data: { success: true }, message: '退出成功' }
  }
  return apiPost<{ success: boolean }>('/auth/logout')
}

// 更新用户信息
export async function updateUserProfile(data: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> {
  if (useMock()) {
    return { code: 200, data: { ...mockUserProfile, ...data }, message: '更新成功' }
  }
  return apiPost<UserProfile>('/user/profile/update', data)
}

// 微信登录
export async function wechatLogin(params: WechatLoginRequest): Promise<ApiResponse<LoginResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 1000))
    return {
      code: 200,
      data: {
        token: 'mock_wechat_token_' + Date.now(),
        user: mockUserProfile,
      },
      message: 'success',
    }
  }
  return apiPost<LoginResponse>('/auth/wechat-login', params)
}

// Apple登录
export async function appleLogin(params: AppleLoginRequest): Promise<ApiResponse<LoginResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 1000))
    return {
      code: 200,
      data: {
        token: 'mock_apple_token_' + Date.now(),
        user: mockUserProfile,
      },
      message: 'success',
    }
  }
  return apiPost<LoginResponse>('/auth/apple-login', params)
}

// 注册
export async function register(params: RegisterRequest): Promise<ApiResponse<LoginResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 1000))
    return {
      code: 200,
      data: {
        token: 'mock_register_token_' + Date.now(),
        user: mockUserProfile,
      },
      message: '注册成功',
    }
  }
  return apiPost<LoginResponse>('/auth/register', params)
}

// 重置密码
export async function resetPassword(params: { phone: string; code: string; newPassword: string }): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 800))
    return { code: 200, data: { success: true }, message: '密码重置成功' }
  }
  return apiPost<{ success: boolean }>('/auth/reset-password', params)
}
