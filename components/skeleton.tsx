"use client"

import { cn } from "@/lib/utils"

// 基础骨架屏
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("bg-secondary animate-pulse rounded", className)} />
  )
}

// 卡片骨架屏
export function CardSkeleton() {
  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <div className="flex gap-3">
        <Skeleton className="w-24 h-24 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-2/3" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-5 w-12 rounded-full" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

// 课程卡片骨架屏
export function CourseCardSkeleton() {
  return (
    <div className="bg-card rounded-xl overflow-hidden border border-border">
      <Skeleton className="w-full aspect-video" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <div className="flex justify-between items-center pt-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
    </div>
  )
}

// 圈子卡片骨架屏
export function CircleCardSkeleton() {
  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <div className="flex gap-3 items-center">
        <Skeleton className="w-14 h-14 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-8 w-16 rounded-full" />
      </div>
    </div>
  )
}

// 文章列表骨架屏
export function ArticleListSkeleton() {
  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <div className="flex gap-3">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <div className="flex gap-3 pt-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
        <Skeleton className="w-20 h-16 rounded-lg flex-shrink-0" />
      </div>
    </div>
  )
}

// 用户信息骨架屏
export function UserInfoSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="w-12 h-12 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  )
}

// 评论骨架屏
export function CommentSkeleton() {
  return (
    <div className="flex gap-3">
      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  )
}

// 瀑布流骨架屏
export function WaterfallSkeleton() {
  return (
    <div className="columns-2 gap-3 space-y-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="break-inside-avoid bg-card rounded-xl overflow-hidden border border-border">
          <Skeleton className={cn("w-full", i % 3 === 0 ? "h-48" : i % 2 === 0 ? "h-36" : "h-44")} />
          <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <div className="flex items-center gap-2 pt-1">
              <Skeleton className="w-5 h-5 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// 首页骨架屏
export function HomeSkeleton() {
  return (
    <div className="space-y-4">
      {/* Banner */}
      <Skeleton className="w-full h-40 rounded-xl" />
      
      {/* 快捷入口 */}
      <div className="flex justify-between px-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="px-4">
        <WaterfallSkeleton />
      </div>
    </div>
  )
}

// 详情页骨架屏
export function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="w-full aspect-video rounded-xl" />
      <div className="px-4 space-y-4">
        <Skeleton className="h-6 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <UserInfoSkeleton />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  )
}

// 列表页骨架屏
export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}
