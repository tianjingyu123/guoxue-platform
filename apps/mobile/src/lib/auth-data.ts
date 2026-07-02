/**
 * 认证数据层 - 登录/注册/找回密码
 * 负责前端 UI 的数据格式与后端 API 响应的适配
 */
import { apiPost, useMock } from '@/utils/request'
import { getTempReferrer } from '@/utils/referral'

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

/* —— 后端原始响应类型（容错适配用，字段宽松全 optional，仅声明 adapter 实际访问到的字段） —— */
/** 后端 login/register 原始响应 */
interface RawAuthData {
  accessToken?: string
  token?: string
  user?: Partial<UserInfo> & Record<string, unknown>
}

/** 将后端 login/register 响应适配为前端 UI 期望的 { success, data: {token, user}, message } 格式 */
function adaptAuthResult(data?: RawAuthData | null): AuthResponse {
  if (!data) return { success: false, message: '响应数据为空' }
  const token = data.accessToken || data.token || ''
  return {
    success: true,
    message: 'ok',
    data: {
      token,
      // 后端返回完整 user 对象，运行时字段齐全；类型层用 as UserInfo 收口宽松 Raw
      user: { ...data.user, token } as UserInfo,
    },
  }
}

export const authApi = {
  /** 发送短信验证码 — POST /auth/sms/send */
  async sendCode(phone: string, scene: 'login' | 'register' | 'reset'): Promise<{ success: boolean; message: string }> {
    try {
      const data = await apiPost<{ ok?: boolean; message?: string }>('/auth/sms/send', { phone, scene })
      // 后端返回 { ok: boolean, message: string }
      return { success: !!data?.ok, message: data?.message || '验证码已发送' }
    } catch (e: any) {
      return { success: false, message: e?.message || '发送失败' }
    }
  },

  /** 验证码在后端 login/register 时一并校验，前端此方法仅保留兼容性 */
  async verifyCode(_phone: string, _code: string): Promise<{ success: boolean; message: string }> {
    return { success: true, message: '验证成功' }
  },

  /** 登录 — 密码走 /auth/login/phone，短信走 /auth/login/sms */
  async login(params: { phone: string; code?: string; password?: string }): Promise<AuthResponse> {
    try {
      let data: RawAuthData
      if (params.password) {
        data = await apiPost<RawAuthData>('/auth/login/phone', { phone: params.phone, password: params.password })
      } else {
        // 短信登录含新用户自动注册：携带最近分享者作为归属绑定依据（后端仅在新注册时生效）
        data = await apiPost<RawAuthData>('/auth/login/sms', { phone: params.phone, code: params.code, referrerCode: getTempReferrer() })
      }
      return adaptAuthResult(data)
    } catch (e: any) {
      return { success: false, message: e?.message || '登录失败' }
    }
  },

  /** 手机号注册 — POST /auth/register/phone */
  async register(params: { phone: string; code: string; password: string; nickname: string }): Promise<AuthResponse> {
    try {
      const data = await apiPost<RawAuthData>('/auth/register/phone', {
        phone: params.phone,
        password: params.password,
        nickname: params.nickname,
        // 推荐归因：注册时绑定永久归属分站（值=分享者用户ID或分站推广码，后端解析）
        referrerCode: getTempReferrer(),
      })
      return adaptAuthResult(data)
    } catch (e: any) {
      return { success: false, message: e?.message || '注册失败' }
    }
  },

  /** 重置密码 — 后端暂未提供独立端点，通过已登录的 changePassword 实现 */
  async resetPassword(params: { phone: string; code: string; password: string }): Promise<{ success: boolean; message: string }> {
    try {
      await apiPost<unknown>('/auth/reset-password', params)
      return { success: true, message: '密码重置成功' }
    } catch (e: any) {
      return { success: false, message: e?.message || '重置失败' }
    }
  },
}
