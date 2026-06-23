"use client"

import { cn } from "@/lib/utils"

// ===== 基础骨架元素 =====
interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn(
      "bg-secondary/80 rounded animate-pulse",
      className
    )} />
  )
}

// ===== 课程卡片骨架 =====
export function CourseCardSkeleton() {
  return (
    <div className="bg-card rounded-xl overflow-hidden border border-border">
      {/* 封面 */}
      <Skeleton className="aspect-[4/3] rounded-none" />
      {/* 内容 */}
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
    </div>
  )
}

// ===== 文章卡片骨架 =====
export function ArticleCardSkeleton() {
  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <div className="flex gap-3">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <div className="flex items-center gap-2 pt-1">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
        <Skeleton className="w-24 h-16 rounded-lg flex-shrink-0" />
      </div>
    </div>
  )
}

// ===== 商品卡片骨架 =====
export function ProductCardSkeleton() {
  return (
    <div className="bg-card rounded-xl overflow-hidden border border-border">
      {/* 封面 */}
      <Skeleton className="aspect-square rounded-none" />
      {/* 内容 */}
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-5 w-14" />
          <Skeleton className="h-3 w-10" />
        </div>
      </div>
    </div>
  )
}

// ===== 圈子卡片骨架 =====
export function CircleCardSkeleton() {
  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <div className="flex items-center gap-3">
        <Skeleton className="w-14 h-14 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-full" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="w-16 h-8 rounded-full" />
      </div>
    </div>
  )
}

// ===== 用户卡片骨架 =====
export function UserCardSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-full" />
      </div>
      <Skeleton className="w-16 h-8 rounded-full" />
    </div>
  )
}

// ===== 评论骨架 =====
export function CommentSkeleton() {
  return (
    <div className="flex gap-3 p-3">
      <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  )
}

// ===== 首页信息流骨架 =====
export function HomeFeedSkeleton() {
  return (
    <div className="columns-2 gap-3 px-4 py-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="break-inside-avoid mb-3">
          <div className="bg-card rounded-xl overflow-hidden border border-border">
            <Skeleton className={cn(
              "rounded-none",
              i % 3 === 0 ? "aspect-[3/4]" : "aspect-[4/3]"
            )} />
            <div className="p-2.5 space-y-1.5">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-3/4" />
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                  <Skeleton className="w-5 h-5 rounded-full" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="h-3 w-8" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ===== 课程详情页骨架 =====
export function CourseDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 封面 */}
      <Skeleton className="aspect-video w-full rounded-none" />
      
      {/* 信息区 */}
      <div className="p-4 space-y-3">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-3/4" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
      
      {/* 讲师 */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-3 p-3 bg-card rounded-xl">
          <Skeleton className="w-12 h-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      </div>
      
      {/* 章节 */}
      <div className="px-4 py-3 space-y-3">
        <Skeleton className="h-5 w-20" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3 border-b border-border">
            <Skeleton className="w-8 h-8 rounded" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ===== 商品详情页骨架 =====
export function ProductDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 轮播图 */}
      <Skeleton className="aspect-square w-full rounded-none" />
      
      {/* 价格区 */}
      <div className="p-4 space-y-2">
        <div className="flex items-baseline gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-4 w-14" />
        </div>
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-2/3" />
      </div>
      
      {/* 规格选择 */}
      <div className="px-4 py-3">
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
      
      {/* 评价 */}
      <div className="px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
        {Array.from({ length: 2 }).map((_, i) => (
          <CommentSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

// ===== 加载更多骨架（列表底部） =====
export function LoadMoreSkeleton() {
  return (
    <div className="flex items-center justify-center py-4 gap-2">
      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="text-sm text-muted-foreground">加载中...</span>
    </div>
  )
}
