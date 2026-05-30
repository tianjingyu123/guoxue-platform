import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api'

/** 用户信息 */
export interface UserInfo {
  id: string
  phone: string
  nickname: string
  avatar: string
  isVip: boolean
  vipExpireAt?: string
  gender?: number
  birthday?: string
  signature?: string
  createdAt?: string
}

export const useUserStore = defineStore('user', () => {
  // ========== State ==========
  const user = ref<UserInfo | null>(null)
  const token = ref<string | null>(uni.getStorageSync('token') || null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 根据 token 是否存在判断登录状态
  const isLogin = computed(() => !!token.value)

  // ========== Getters ==========
  const userAvatar = computed(() => user.value?.avatar || '')
  const userNickname = computed(() => user.value?.nickname || '')
  const isVip = computed(() => !!user.value?.isVip)

  // ========== Actions ==========
  /** 持久化 token */
  function saveToken(val: string | null, refreshVal?: string | null) {
    token.value = val
    if (val) {
      uni.setStorageSync('token', val)
    } else {
      uni.removeStorageSync('token')
    }
    if (refreshVal) {
      uni.setStorageSync('refreshToken', refreshVal)
    } else if (refreshVal === null) {
      uni.removeStorageSync('refreshToken')
    }
  }

  /** 手机号登录 */
  async function login(phone: string, password: string) {
    loading.value = true
    error.value = null
    try {
      const res: any = await authApi.login({ account: phone, password })
      const tok = res.accessToken || res.token
      if (tok) {
        saveToken(tok, res.refreshToken)
      }
      if (res.user) {
        user.value = res.user as UserInfo
      }
      // 如果登录接口没返回用户信息，额外拉取
      if (!res.user && tok) {
        await fetchProfile()
      }
      return res
    } catch (e: any) {
      error.value = e.errMsg || e.message || '登录失败'
      uni.showToast({ title: error.value!, icon: 'none' })
      throw e
    } finally {
      loading.value = false
    }
  }

  /** 注册 */
  async function register(phone: string, password: string, nickname: string) {
    loading.value = true
    error.value = null
    try {
      const res: any = await authApi.register({ phone, password, nickname })
      const tok = res.accessToken || res.token
      if (tok) {
        saveToken(tok, res.refreshToken)
      }
      if (res.user) {
        user.value = res.user as UserInfo
      }
      return res
    } catch (e: any) {
      error.value = e.errMsg || e.message || '注册失败'
      uni.showToast({ title: error.value!, icon: 'none' })
      throw e
    } finally {
      loading.value = false
    }
  }

  /** 退出登录 */
  async function logout() {
    user.value = null
    saveToken(null)
    uni.showToast({ title: '已退出登录', icon: 'none' })
  }

  /** 获取个人信息 */
  async function fetchProfile() {
    if (!token.value) return
    loading.value = true
    error.value = null
    try {
      const res: any = await authApi.getProfile()
      user.value = res as UserInfo
    } catch (e: any) {
      error.value = e.errMsg || e.message || '获取用户信息失败'
      // 401 时自动登出
      if (error.value.includes('401') || error.value.includes('Unauthorized')) {
        logout()
      }
      throw e
    } finally {
      loading.value = false
    }
  }

  /** 更新个人信息 */
  async function updateProfile(data: Partial<UserInfo>) {
    loading.value = true
    error.value = null
    try {
      const res: any = await authApi.updateProfile(data)
      user.value = { ...user.value, ...res } as UserInfo
      uni.showToast({ title: '更新成功', icon: 'success' })
    } catch (e: any) {
      error.value = e.errMsg || e.message || '更新失败'
      uni.showToast({ title: error.value!, icon: 'none' })
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    // state
    user,
    token,
    loading,
    error,
    isLogin,
    // getters
    userAvatar,
    userNickname,
    isVip,
    // actions
    login,
    register,
    logout,
    fetchProfile,
    updateProfile,
  }
})
