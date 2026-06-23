"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { Lock, Home, Users, ArrowLeft, ShieldAlert, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

function ForbiddenContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // 从URL参数获取信息
  const requiredRole = searchParams.get('role') || '会员'
  const requiredPermission = searchParams.get('permission')
  const resource = searchParams.get('resource') || '该内容'

  const canGoBack = typeof window !== 'undefined' && window.history.length > 1

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          {canGoBack && (
            <button 
              onClick={() => router.back()}
              className="p-1 -ml-1 text-muted-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-lg font-semibold">访问受限</h1>
        </div>
      </header>

      {/* 主内容 */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* 锁图标 */}
        <div className="relative mb-8">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
              <Lock className="w-12 h-12 text-primary" />
            </div>
          </div>
          {/* 盾牌装饰 */}
          <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-background border-2 border-border flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-orange-500" />
          </div>
        </div>

        {/* 错误信息 */}
        <h2 className="text-2xl font-bold text-foreground mb-2">暂无访问权限</h2>
        <p className="text-muted-foreground text-center mb-2">
          抱歉，您没有权限访问{resource}
        </p>

        {/* 权限说明卡片 */}
        <div className="w-full max-w-sm bg-muted/50 rounded-xl p-4 mb-8">
          <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-orange-500" />
            访问要求
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {requiredPermission ? (
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>需要「{requiredPermission}」权限</span>
              </li>
            ) : (
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>需要「{requiredRole}」身份</span>
              </li>
            )}
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-1.5 flex-shrink-0" />
              <span>或联系管理员获取授权</span>
            </li>
          </ul>
        </div>

        {/* 操作按钮 */}
        <div className="w-full max-w-sm space-y-3">
          <Button 
            className="w-full h-12 text-base"
            onClick={() => router.push('/mine/identity-switch')}
          >
            <Users className="w-5 h-5 mr-2" />
            切换身份
          </Button>
          <Button 
            variant="outline"
            className="w-full h-12 text-base"
            onClick={() => router.push('/')}
          >
            <Home className="w-5 h-5 mr-2" />
            返回首页
          </Button>
          {canGoBack && (
            <Button 
              variant="ghost"
              className="w-full h-10 text-sm text-muted-foreground"
              onClick={() => router.back()}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              返回上一页
            </Button>
          )}
        </div>

        {/* 帮助提示 */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground mb-2">
            如有疑问，请联系客服
          </p>
          <Button 
            variant="link" 
            size="sm"
            className="text-primary h-auto p-0"
            onClick={() => router.push('/customer-service')}
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            申请权限
          </Button>
        </div>

        {/* 错误代码 */}
        <div className="mt-6 text-xs text-muted-foreground/50">
          错误代码: 403 Forbidden
        </div>
      </main>

      {/* 底部装饰 */}
      <div className="h-32 bg-gradient-to-t from-muted/30 to-transparent" />
    </div>
  )
}

// 骨架屏
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-32 h-32 rounded-full bg-muted animate-pulse mb-8" />
      <div className="h-6 w-40 bg-muted rounded animate-pulse mb-2" />
      <div className="h-4 w-56 bg-muted rounded animate-pulse" />
    </div>
  )
}

export default function ForbiddenPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <ForbiddenContent />
    </Suspense>
  )
}
