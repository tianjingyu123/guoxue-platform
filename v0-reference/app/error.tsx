'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 可以在这里上报错误到监控系统
    console.error('[v0] Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* 国学风格错误图标 */}
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
          <AlertTriangle className="w-12 h-12 text-primary" />
        </div>
        {/* 装饰性圆环 */}
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-primary/20 animate-spin" style={{ animationDuration: '20s' }} />
      </div>

      {/* 错误标题 */}
      <h1 className="text-2xl font-serif font-bold text-foreground mb-2 text-center">
        遇到了一些问题
      </h1>
      
      {/* 国学风格的错误描述 */}
      <p className="text-muted-foreground text-center mb-2 max-w-md">
        「行路难，行路难，多歧路，今安在？」
      </p>
      <p className="text-sm text-muted-foreground text-center mb-8 max-w-md">
        系统遇到了意外情况，请稍后重试
      </p>

      {/* 错误详情（仅开发环境显示） */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-6 p-4 bg-danger/10 border border-danger/20 rounded-xl max-w-md w-full">
          <p className="text-xs font-mono text-danger break-all">
            {error.message}
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground mt-2">
              错误ID: {error.digest}
            </p>
          )}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <Button
          onClick={reset}
          className="flex-1 bg-primary hover:bg-primary/90"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          重新加载
        </Button>
        <Button
          variant="outline"
          onClick={() => window.history.back()}
          className="flex-1"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回上页
        </Button>
      </div>

      {/* 返回首页链接 */}
      <a
        href="/"
        className="mt-6 text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
      >
        <Home className="w-4 h-4" />
        返回首页
      </a>
    </div>
  )
}
