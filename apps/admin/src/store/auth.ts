import { defineStore } from "pinia"
import { ref, computed } from "vue"
import { authApi } from "../api"
import { ElMessage } from "element-plus"

export const useAuthStore = defineStore("auth", () => {
  const user = ref<any>(null)
  const token = ref<string | null>(localStorage.getItem("token"))
  const isLogin = computed(() => !!token.value && !!user.value)

  async function login(account: string, password: string) {
    const { data } = await authApi.login({ account, password })
    token.value = data.accessToken ?? data.access_token
    localStorage.setItem("token", token.value!)
    await fetchProfile()
  }

  async function fetchProfile() {
    try {
      const { data } = await authApi.getProfile()
      user.value = data
    } catch {
      logout()
      throw new Error("获取用户信息失败")
    }
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem("token")
    ElMessage.success("已退出登录")
  }

  return { user, token, isLogin, login, fetchProfile, logout }
})
