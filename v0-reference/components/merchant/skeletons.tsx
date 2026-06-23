"use client"

import { cn } from "@/lib/utils"
import { Package, ShoppingCart, Star, FileText, Store, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

// 骨架屏基础组件
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse bg-muted rounded", className)} />
  )
}

// 商品卡片骨架屏
export function ProductCardSkeleton() {
  return (
    <div className="p-3 bg-card rounded-xl border border-border/60">
      <div className="flex gap-3">
        <Skeleton className="w-20 h-20 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <div className="flex items-center gap-2 pt-1">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>
          <div className="flex items-center gap-4 pt-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>
    </div>
  )
}

// 订单卡片骨架屏
export function OrderCardSkeleton() {
  return (
    <div className="p-4 bg-card rounded-xl border border-border/60">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="w-16 h-16 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-28" />
      </div>
    </div>
  )
}

// 数据卡片骨架屏
export function StatsCardSkeleton() {
  return (
    <div className="p-4 bg-card rounded-xl border border-border/60">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        {[1, 2].map(i => (
          <div key={i} className="p-3 bg-secondary/50 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-10" />
            </div>
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-6 w-full" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[1, 2].map(i => (
          <div key={i} className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-5 w-14" />
            </div>
            <Skeleton className="h-5 w-12 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

// 商品列表骨架屏
export function ProductListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}

// 订单列表骨架屏
export function OrderListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <OrderCardSkeleton key={i} />
      ))}
    </div>
  )
}

// 空状态组件
interface EmptyStateProps {
  type: "products" | "orders" | "reviews" | "revenue" | "violations" | "default"
  title?: string
  description?: string
  action?: {
    label: string
    href: string
  }
  className?: string
}

const emptyStateConfig = {
  products: {
    icon: Package,
    title: "暂无商品",
    description: "发布您的第一个商品，开始经营吧",
    action: { label: "发布商品", href: "/merchant/product-edit" }
  },
  orders: {
    icon: ShoppingCart,
    title: "暂无订单",
    description: "商品上架后，订单会出现在这里",
    action: { label: "查看商品", href: "/merchant/products" }
  },
  reviews: {
    icon: Star,
    title: "暂无评价",
    description: "买家的评价会出现在这里",
    action: null
  },
  revenue: {
    icon: TrendingUp,
    title: "暂无收入记录",
    description: "完成订单后，收入会出现在这里",
    action: null
  },
  violations: {
    icon: FileText,
    title: "暂无违规记录",
    description: "保持良好经营，您的店铺很健康",
    action: null
  },
  default: {
    icon: Store,
    title: "暂无数据",
    description: "数据会出现在这里",
    action: null
  }
}

export function EmptyState({ type, title, description, action, className }: EmptyStateProps) {
  const config = emptyStateConfig[type]
  const Icon = config.icon
  const finalTitle = title || config.title
  const finalDescription = description || config.description
  const finalAction = action || config.action
  
  return (
    <div className={cn("py-16 px-4 text-center", className)}>
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/80 flex items-center justify-center">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="font-medium text-foreground mb-1">{finalTitle}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">{finalDescription}</p>
      {finalAction && (
        <Link href={finalAction.href}>
          <Button>{finalAction.label}</Button>
        </Link>
      )}
    </div>
  )
}

// 加载中状态
export function LoadingState({ text = "加载中..." }: { text?: string }) {
  return (
    <div className="py-16 text-center">
      <div className="w-8 h-8 mx-auto mb-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  )
}

// 错误状态
interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({ 
  title = "加载失败", 
  description = "请检查网络连接后重试",
  onRetry,
  className 
}: ErrorStateProps) {
  return (
    <div className={cn("py-16 px-4 text-center", className)}>
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
        <span className="text-2xl">!</span>
      </div>
      <h3 className="font-medium text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>重新加载</Button>
      )}
    </div>
  )
}
