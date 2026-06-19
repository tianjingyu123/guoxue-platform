"use client"

import { cn } from "@/lib/utils"

// ============================================
// 热卜国学 - 统一骨架屏组件
// 带微光扫描效果，提升等待体验
// ============================================

// 基础骨架块
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("skeleton skeleton-shimmer", className)} />
  )
}

// 瀑布流卡片骨架
export function SkeletonFeedCard({ aspectRatio = "3/4" }: { aspectRatio?: string }) {
  return (
    <div className="bg-white rounded-[10px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
      {/* 封面图骨架 */}
      <div 
        className="skeleton skeleton-shimmer w-full" 
        style={{ aspectRatio }}
      />
      {/* 内容区骨架 */}
      <div className="p-2.5 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex items-center gap-2 pt-1">
          <Skeleton className="w-5 h-5 rounded-full skeleton-avatar" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  )
}

// 横向列表卡片骨架
export function SkeletonListCard() {
  return (
    <div className="flex gap-3 p-3 bg-white rounded-[10px] shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      {/* 左侧图片 */}
      <Skeleton className="w-24 h-24 rounded-[8px] flex-shrink-0" />
      {/* 右侧内容 */}
      <div className="flex-1 space-y-2 py-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex items-center gap-2 pt-1">
          <Skeleton className="w-4 h-4 rounded-full skeleton-avatar" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    </div>
  )
}

// 圆形头像骨架
export function SkeletonAvatar({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16"
  }
  return <Skeleton className={cn("rounded-full skeleton-avatar", sizes[size])} />
}

// 文字行骨架
export function SkeletonText({ 
  lines = 1, 
  className 
}: { 
  lines?: number
  className?: string 
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          className={cn(
            "h-4",
            i === lines - 1 ? "w-2/3" : "w-full"
          )} 
        />
      ))}
    </div>
  )
}

// 商品卡片骨架
export function SkeletonProductCard() {
  return (
    <div className="bg-white rounded-[10px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
      <Skeleton className="w-full aspect-[3/4]" />
      <div className="p-2.5 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex items-center gap-2 pt-1">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-3 w-8" />
        </div>
      </div>
    </div>
  )
}

// 直播卡片骨架
export function SkeletonLiveCard({ orientation = "vertical" }: { orientation?: "vertical" | "horizontal" }) {
  const aspectRatio = orientation === "vertical" ? "3/4" : "16/9"
  return (
    <div className="bg-white rounded-[10px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
      <Skeleton className="w-full" style={{ aspectRatio }} />
      <div className="p-2.5 space-y-2">
        <Skeleton className="h-4 w-full" />
        <div className="flex items-center gap-2">
          <Skeleton className="w-5 h-5 rounded-full skeleton-avatar" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  )
}

// 圈子卡片骨架
export function SkeletonCircleCard() {
  return (
    <div className="bg-white rounded-[14px] shadow-[0_4px_20px_rgba(0,0,0,0.08)] overflow-hidden">
      <Skeleton className="w-full aspect-[16/9]" />
      <div className="p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="w-8 h-8 rounded-full skeleton-avatar" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-3 w-full" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-16 rounded-full" />
        </div>
      </div>
    </div>
  )
}

// 文章卡片骨架
export function SkeletonArticleCard() {
  return (
    <div className="flex gap-3 p-3 bg-white rounded-[10px] shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <Skeleton className="w-28 h-20 rounded-[8px] flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-full" />
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            <Skeleton className="w-5 h-5 rounded-full skeleton-avatar" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  )
}

// 瀑布流骨架屏容器
export function SkeletonMasonryGrid({ count = 6 }: { count?: number }) {
  const heights = ["3/4", "4/5", "1/1", "3/4", "4/5", "3/4"]
  
  return (
    <div className="grid grid-cols-2 gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonFeedCard key={i} aspectRatio={heights[i % heights.length]} />
      ))}
    </div>
  )
}
