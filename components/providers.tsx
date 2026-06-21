'use client'

import type { ReactNode } from 'react'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { NetworkStatusBanner } from '@/components/network-status-banner'

/**
 * 全局 Provider 壳层
 * - ThemeProvider：主题（sonner 依赖）
 * - Toaster：全平台统一的 toast 提示出口（此前未挂载，导致所有 toast 不显示）
 * - NetworkStatusBanner：全局网络状态提示条
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <NetworkStatusBanner />
      {children}
      <Toaster position="top-center" richColors closeButton />
    </ThemeProvider>
  )
}
