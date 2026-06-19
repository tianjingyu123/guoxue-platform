'use client'

import { useOnlineStatus } from '@/hooks/use-online-status'
import { WifiOff, Wifi } from 'lucide-react'

/**
 * 全局网络状态提示条
 * - 断网时：顶部红色条常驻提示
 * - 恢复时：顶部绿色条短暂提示（3秒）
 */
export function NetworkStatusBanner() {
  const { isOnline, wasOffline } = useOnlineStatus()

  // 在线且未刚恢复 —— 不显示
  if (isOnline && !wasOffline) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-0 inset-x-0 z-[100] flex items-center justify-center gap-2 py-2 px-4 text-xs font-medium transition-colors ${
        isOnline
          ? 'bg-[#3D7A5C] text-white'
          : 'bg-[#C41E3A] text-white'
      }`}
    >
      {isOnline ? (
        <>
          <Wifi className="w-3.5 h-3.5 shrink-0" />
          <span>网络已恢复连接</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>网络连接异常，请检查网络</span>
        </>
      )}
    </div>
  )
}
