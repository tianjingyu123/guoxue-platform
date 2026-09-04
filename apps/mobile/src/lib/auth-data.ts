/**
 * 认证数据层 - 登录/注册/找回密码
 * 负责前端 UI 的数据格式与后端 API 响应的适配
 */
import { apiPost } from '@/utils/request'
// #ifdef H5
import { apiGet } from '@/utils/request'
// #endif
import { getTempReferrer } from '@/utils/referral'

export interface UserInfo {
  id: string
  nickname: string
  avatar: string
  phone: string
  token: string
  interestCategories?: string[]
  interestGuideCompleted?: boolean
}

export interface AuthResponse {
  success: boolean
  message: string
  data?: {
    token: string
    refreshToken?: string
    user: UserInfo
  }
}

/* —— 后端原始响应类型（容错适配用，字段宽松全 optional，仅声明 adapter 实际访问到的字段） —— */
/** 后端 login/register 原始响应 */
interface RawAuthData {
  accessToken?: string
  refreshToken?: string
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
      refreshToken: data.refreshToken || '',
      // 后端返回完整 user 对象，运行时字段齐全；类型层用 as UserInfo 收口宽松 Raw
      user: { ...data.user, token } as UserInfo,
    },
  }
}

/** 多小程序构建优先读取显式 clientKey；未配置时直接上送当前公开 appId 供后端注册表匹配。 */
function getWechatClientKey(): string | undefined {
  const configured = ((import.meta as any).env?.VITE_WECHAT_CLIENT_KEY || '').trim()
  if (configured) return configured
  // #ifdef MP-WEIXIN
  try {
    return uni.getAccountInfoSync().miniProgram.appId || undefined
  } catch { return undefined }
  // #endif
  // #ifndef MP-WEIXIN
  return undefined
  // #endif
}

export const authApi = {
  // #ifdef H5
  /** 获取公众号网页授权地址。redirectUri/state 由登录页生成，服务端仍会校验回调域名。 */
  async getWechatOAuthUrl(redirectUri: string, state: string): Promise<string> {
    const clientKey = getWechatClientKey()
    const query = [
      `redirectUri=${encodeURIComponent(redirectUri)}`,
      'scope=snsapi_userinfo',
      `state=${encodeURIComponent(state)}`,
      ...(clientKey ? [`clientKey=${encodeURIComponent(clientKey)}`] : []),
    ].join('&')
    const data = await apiGet<{ url: string }>(`/auth/wechat/oauth-url?${query}`)
    if (!data?.url) throw new Error('微信登录配置暂不可用')
    return data.url
  },
  // #endif

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

  /** 微信登录（小程序/APP/H5）— 同一接口按端类型解析 code，并落到同一个内部 userId。 */
  async wechatLogin(
    code: string,
    loginType: 'miniprogram' | 'app' | 'h5' = 'miniprogram',
    options: { createIfMissing?: boolean } = {},
  ): Promise<AuthResponse> {
    try {
      const data = await apiPost<RawAuthData>('/auth/login/wechat', {
        code,
        loginType,
        clientKey: getWechatClientKey(),
        createIfMissing: options.createIfMissing,
        // 新用户自动注册时绑定最近分享者作为归属
        referrerCode: getTempReferrer(),
      })
      return adaptAuthResult(data)
    } catch (e: any) {
      return { success: false, message: e?.message || '微信登录失败' }
    }
  },

  /**
   * 小程序手机号快捷登录。
   * phoneCode 只能来自用户主动点击 getPhoneNumber 后的当次授权结果，
   * 客户端不缓存手机号明文，也不把该能力扩展到 APP/H5。
   */
  async miniPhoneLogin(wxCode: string, phoneCode: string, iv?: string): Promise<AuthResponse> {
    try {
      const data = await apiPost<RawAuthData>('/auth/login/mini-phone', {
        wxCode,
        phoneCode,
        ...(iv ? { iv } : {}),
        clientKey: getWechatClientKey(),
        referrerCode: getTempReferrer(),
      })
      return adaptAuthResult(data)
    } catch (e: any) {
      return { success: false, message: e?.message || '手机号快捷登录失败' }
    }
  },

  /** 将当前已登录手机号账号与微信身份绑定，后续可一键进入排盘。 */
  async bindWechat(code: string, loginType: 'miniprogram' | 'app' | 'h5' = 'miniprogram'): Promise<{ success: boolean; message: string }> {
    try {
      await apiPost('/auth/bind/wechat', { code, loginType, clientKey: getWechatClientKey() })
      return { success: true, message: '微信账号已关联' }
    } catch (e: any) {
      return { success: false, message: e?.message || '微信账号关联失败' }
    }
  },

  // #ifdef APP-PLUS
  /** Apple 原生登录 — identityToken 只发送给服务端验签，不在客户端持久化。 */
  async appleLogin(params: {
    identityToken: string
    familyName?: string
    givenName?: string
  }): Promise<AuthResponse> {
    try {
      const data = await apiPost<RawAuthData>('/auth/login/apple', {
        ...params,
        referrerCode: getTempReferrer(),
      })
      return adaptAuthResult(data)
    } catch (e: any) {
      return { success: false, message: e?.message || 'Apple 登录失败' }
    }
  },
  // #endif

  /** 手机号注册 — POST /auth/register/phone */
  async register(params: { phone: string; code: string; password: string; nickname: string }): Promise<AuthResponse> {
    try {
      const data = await apiPost<RawAuthData>('/auth/register/phone', {
        phone: params.phone,
        code: params.code,
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
