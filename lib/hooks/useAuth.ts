"use client"

import { useState, useEffect, useCallback } from 'react'

// 用户信息类型
interface User {
  id: string
  name: string
  avatar?: string
  phone?: string
  email?: string
}

// Auth 状态
interface AuthState {
  user: User | null
  token: string | null
  isLogin: boolean
  isLoading: boolean
}

// Token 存储 key
const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'

/**
 * 用户认证 Hook
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLogin: false,
    isLoading: true
  })

  // 初始化：从 localStorage 读取
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    const userStr = localStorage.getItem(USER_KEY)
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User
        setState({
          user,
          token,
          isLogin: true,
          isLoading: false
        })
      } catch {
        // 解析失败，清除数据
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        setState(prev => ({ ...prev, isLoading: false }))
      }
    } else {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [])

  // 登录
  const login = useCallback((token: string, user: User) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    setState({
      user,
      token,
      isLogin: true,
      isLoading: false
    })
  }, [])

  // 登出
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setState({
      user: null,
      token: null,
      isLogin: false,
      isLoading: false
    })
  }, [])

  // 更新用户信息
  const updateUser = useCallback((updates: Partial<User>) => {
    setState(prev => {
      if (!prev.user) return prev
      const newUser = { ...prev.user, ...updates }
      localStorage.setItem(USER_KEY, JSON.stringify(newUser))
      return { ...prev, user: newUser }
    })
  }, [])

  // 获取 token（供 API 请求使用）
  const getToken = useCallback(() => {
    return localStorage.getItem(TOKEN_KEY)
  }, [])

  return {
    ...state,
    login,
    logout,
    updateUser,
    getToken
  }
}

// 导出类型
export type { User, AuthState }
