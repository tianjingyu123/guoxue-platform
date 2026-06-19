'use client'

import { useEffect } from 'react'
import { AlertOctagon, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 上报错误
    console.error('[v0] Global error:', error)
  }, [error])

  return (
    <html lang="zh-CN">
      <body className="bg-background text-foreground">
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          {/* 严重错误图标 */}
          <div className="relative mb-8">
            <div className="w-24 h-24 rounded-full bg-danger/10 flex items-center justify-center">
              <AlertOctagon className="w-12 h-12 text-danger" />
            </div>
          </div>

          {/* 错误标题 */}
          <h1 className="text-2xl font-bold mb-2 text-center">
            系统遇到严重错误
          </h1>
          
          <p className="text-muted-foreground text-center mb-2 max-w-md">
            「山重水复疑无路，柳暗花明又一村」
          </p>
          <p className="text-sm text-muted-foreground text-center mb-8 max-w-md">
            请尝试刷新页面，如问题持续请联系客服
          </p>

          {/* 操作按钮 */}
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
            <Button
              onClick={reset}
              className="flex-1 bg-primary hover:bg-[#a01830] text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新页面
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="flex-1 border-muted"
            >
              <Home className="w-4 h-4 mr-2" />
              返回首页
            </Button>
          </div>

          {/* 错误ID */}
          {error.digest && (
            <p className="mt-6 text-xs text-muted-foreground">
              错误ID: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
