/**
 * 认证数据层 - 登录/注册/找回密码
 */
import { apiPost, useMock } from '@/utils/request'

export interface UserInfo {
  id: string
  nickname: string
  avatar: string
  phone: string
  token: string
}

export interface AuthResponse {
  success: boolean
  message: string
  data?: {
    token: string
    user: UserInfo
  }
}

const mockUser: UserInfo = {
  id: '1',
  nickname: '国学爱好者',
  avatar: '/static/images/default-avatar.png',
  phone: '138****8888',
  token: 'mock-token-xxx',
}

export const authApi = {
  async sendCode(phone: string, scene: 'login' | 'register' | 'reset') {
    if (useMock()) return { success: true, message: '验证码已发送' }
    return apiPost<any>('/auth/send-code', { phone, scene })
  },

  async verifyCode(phone: string, code: string) {
    if (useMock()) return { success: true, message: '验证成功' }
    return apiPost<any>('/auth/verify-code', { phone, code })
  },

  async login(params: { phone: string; code?: string; password?: string }) {
    if (useMock()) return { success: true, data: { token: mockUser.token, user: mockUser }, message: '登录成功' }
    return apiPost<AuthResponse>('/auth/login', params)
  },

  async register(params: { phone: string; code: string; password: string; nickname: string }) {
    if (useMock()) return { success: true, data: { token: mockUser.token, user: { ...mockUser, phone: params.phone, nickname: params.nickname } }, message: '注册成功' }
    return apiPost<AuthResponse>('/auth/register', params)
  },

  async resetPassword(params: { phone: string; code: string; password: string }) {
    if (useMock()) return { success: true, message: '密码重置成功' }
    return apiPost<any>('/auth/reset-password', params)
  },
}
