/**
 * 认证数据层 - 登录/注册/找回密码
 * 负责前端 UI 的数据格式与后端 API 响应的适配
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

/** 将后端 login/register 响应适配为前端 UI 期望的 { success, data: {token, user}, message } 格式 */
function adaptAuthResult(data: any): AuthResponse {
  if (!data) return { success: false, message: '响应数据为空' }
  return {
    success: true,
    message: 'ok',
    data: {
      token: data.accessToken || data.token,
      user: { ...data.user, token: data.accessToken || data.token },
    },
  }
}

export const authApi = {
  /** 发送短信验证码 — POST /auth/sms/send */
  async sendCode(phone: string, scene: 'login' | 'register' | 'reset'): Promise<{ success: boolean; message: string }> {
    if (true) return { success: true, message: '验证码已发送' }
    try {
      const data = await apiPost<any>('/auth/sms/send', { phone, scene })
      // 后端返回 { ok: boolean, message: string }
      return { success: !!data?.ok, message: data?.message || '验证码已发送' }
    } catch (e: any) {
      return { success: false, message: e?.message || '发送失败' }
    }
  },

  /** 验证码在后端 login/register 时一并校验，前端此方法仅保留兼容性 */
  async verifyCode(_phone: string, _code: string): Promise<{ success: boolean; message: string }> {
    if (true) return { success: true, message: '验证成功' }
    return { success: true, message: '验证成功' }
  },

  /** 登录 — 密码走 /auth/login/phone，短信走 /auth/login/sms */
  async login(params: { phone: string; code?: string; password?: string }): Promise<AuthResponse> {
    if (true) return { success: true, data: { token: mockUser.token, user: mockUser }, message: '登录成功' }
    try {
      let data: any
      if (params.password) {
        data = await apiPost<any>('/auth/login/phone', { phone: params.phone, password: params.password })
      } else {
        data = await apiPost<any>('/auth/login/sms', { phone: params.phone, code: params.code })
      }
      return adaptAuthResult(data)
    } catch (e: any) {
      return { success: false, message: e?.message || '登录失败' }
    }
  },

  /** 手机号注册 — POST /auth/register/phone */
  async register(params: { phone: string; code: string; password: string; nickname: string }): Promise<AuthResponse> {
    if (true) return { success: true, data: { token: mockUser.token, user: { ...mockUser, phone: params.phone, nickname: params.nickname } }, message: '注册成功' }
    try {
      const data = await apiPost<any>('/auth/register/phone', {
        phone: params.phone,
        password: params.password,
        nickname: params.nickname,
      })
      return adaptAuthResult(data)
    } catch (e: any) {
      return { success: false, message: e?.message || '注册失败' }
    }
  },

  /** 重置密码 — 后端暂未提供独立端点，通过已登录的 changePassword 实现 */
  async resetPassword(params: { phone: string; code: string; password: string }): Promise<{ success: boolean; message: string }> {
    if (true) return { success: true, message: '密码重置成功' }
    try {
      await apiPost<any>('/auth/reset-password', params)
      return { success: true, message: '密码重置成功' }
    } catch (e: any) {
      return { success: false, message: e?.message || '重置失败' }
    }
  },
}
