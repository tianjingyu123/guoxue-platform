'use client'

import { useEffect, useState } from 'react'

/**
 * 监听浏览器网络连接状态
 * @returns isOnline 当前是否在线；wasOffline 是否刚从离线恢复（用于显示"已恢复"提示）
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    // 初始化为真实状态
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      setIsOnline(navigator.onLine)
    }

    const handleOnline = () => {
      setIsOnline(true)
      setWasOffline(true)
      // 3 秒后清除"已恢复"提示
      window.setTimeout(() => setWasOffline(false), 3000)
    }
    const handleOffline = () => {
      setIsOnline(false)
      setWasOffline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline, wasOffline }
}
