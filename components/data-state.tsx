"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { AlertCircle, RefreshCw, Inbox } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DataStateProps {
  // 状态（规范命名）
  isLoading?: boolean
  isError?: boolean
  isEmpty?: boolean
  errorMessage?: string

  // 状态别名（向后兼容，部分页面使用以下写法）
  loading?: boolean
  /** 可传布尔或错误信息字符串：为真值时进入错误态，字符串会作为错误信息展示 */
  error?: boolean | string | null
  empty?: boolean
  /** 空状态描述文案 */
  emptyMessage?: string
  /** 传入数据，为空数组/空值时自动进入空状态 */
  data?: unknown

  // 自定义内容
  loadingContent?: ReactNode
  errorContent?: ReactNode
  emptyContent?: ReactNode
  children?: ReactNode

  // 加载内容别名（向后兼容）
  skeleton?: ReactNode
  loadingSkeleton?: ReactNode
  loadingComponent?: ReactNode
  loadingRender?: ReactNode
  loadingConfig?: unknown

  // 空状态自定义（向后兼容）
  emptyIcon?: ReactNode
  emptyText?: string
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode

  // 其它兼容透传
  status?: string
  memberRole?: string

  // 回调
  onRetry?: () => void
  
  // 样式
  className?: string
  minHeight?: string
}

/**
 * 数据状态组件
 * 统一处理 loading / error / empty / data 四种状态
 */
export function DataState({
  isLoading = false,
  isError = false,
  isEmpty = false,
  errorMessage,
  loading = false,
  error = false,
  empty = false,
  emptyMessage,
  data,
  loadingContent,
  errorContent,
  emptyContent,
  children,
  skeleton,
  loadingSkeleton,
  loadingComponent,
  loadingRender,
  emptyIcon,
  emptyText,
  emptyTitle,
  emptyDescription,
  emptyAction,
  onRetry,
  className,
  minHeight = "min-h-[200px]"
}: DataStateProps) {

  // 合并规范命名与别名
  const showLoading = isLoading || loading
  const showError = isError || Boolean(error)
  const dataIsEmpty = Array.isArray(data) ? data.length === 0 : data === null || data === undefined
  const showEmpty = isEmpty || empty || (data !== undefined && dataIsEmpty)
  const resolvedErrorMessage =
    errorMessage ?? (typeof error === "string" ? error : undefined) ?? "加载失败，请稍后重试"
  const resolvedLoading = loadingContent || skeleton || loadingSkeleton || loadingComponent || loadingRender

  // Loading 状态
  if (showLoading) {
    return (
      <div className={cn("flex items-center justify-center", minHeight, className)}>
        {resolvedLoading || <LoadingSkeleton />}
      </div>
    )
  }
  
  // Error 状态
  if (showError) {
    return (
      <div className={cn("flex items-center justify-center", minHeight, className)}>
        {errorContent || (
          <ErrorState message={resolvedErrorMessage} onRetry={onRetry} />
        )}
      </div>
    )
  }
  
  // Empty 状态
  if (showEmpty) {
    return (
      <div className={cn("flex items-center justify-center", minHeight, className)}>
        {emptyContent || (
          <EmptyState
            icon={emptyIcon}
            title={emptyTitle ?? emptyText}
            description={emptyDescription ?? emptyMessage}
            action={emptyAction}
          />
        )}
      </div>
    )
  }
  
  // 正常数据状态
  return <>{children}</>
}

/**
 * 默认 Loading 骨架屏
 */
function LoadingSkeleton() {
  return (
    <div className="w-full max-w-md space-y-4 p-4">
      <div className="h-4 bg-secondary rounded animate-pulse" />
      <div className="h-4 bg-secondary rounded animate-pulse w-3/4" />
      <div className="h-4 bg-secondary rounded animate-pulse w-1/2" />
    </div>
  )
}

/**
 * 骨架屏行
 */
function SkeletonLine({ className }: { className?: string }) {
  return (
    <div className={cn("h-4 bg-secondary rounded animate-pulse", className)} />
  )
}

/**
 * 骨架屏卡片
 */
function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg bg-secondary animate-pulse", className)} />
  )
}

/**
 * 骨架屏头像
 */
function SkeletonAvatar({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-full bg-secondary animate-pulse", className)} />
  )
}

/**
 * 骨架屏列表项
 */
function SkeletonListItem() {
  return (
    <div className="flex items-center gap-3 p-4">
      <SkeletonAvatar className="w-12 h-12 shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonLine className="w-1/3" />
        <SkeletonLine className="w-2/3" />
      </div>
    </div>
  )
}

/**
 * 默认错误状态
 */
function ErrorState({ 
  message, 
  onRetry 
}: { 
  message: string
  onRetry?: () => void 
}) {
  return (
    <div className="flex flex-col items-center gap-4 p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
        <AlertCircle className="w-8 h-8 text-destructive" />
      </div>
      <div className="space-y-2">
        <h3 className="font-semibold text-foreground">出错了</h3>
        <p className="text-sm text-muted-foreground max-w-xs">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          重试
        </Button>
      )}
    </div>
  )
}

/**
 * 默认空状态
 */
function EmptyState({ 
  title,
  description,
  icon,
  action
}: {
  title?: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
}) {
  const desc = description ?? "这里还没有内容"
  return (
    <div className="flex flex-col items-center gap-4 p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
        {icon || <Inbox className="w-8 h-8 text-muted-foreground" />}
      </div>
      <div className="space-y-2">
        <h3 className="font-semibold text-foreground">{title ?? "暂无数据"}</h3>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
      {action}
    </div>
  )
}

// 导出子组件供自定义使用
export { 
  LoadingSkeleton, 
  ErrorState, 
  EmptyState,
  SkeletonLine,
  SkeletonCard,
  SkeletonAvatar,
  SkeletonListItem
}

// 别名导出（兼容不同命名）
export { LoadingSkeleton as DataStateLoading }
export { LoadingSkeleton as DataStateSkeleton }
export { EmptyState as DataStateEmpty }
export { ErrorState as DataStateError }
