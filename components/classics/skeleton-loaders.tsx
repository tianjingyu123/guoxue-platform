"use client"

import { cn } from "@/lib/utils"

// ===== 古籍卡片骨架 =====
export function BookCardSkeleton({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-20",
    md: "w-24",
    lg: "w-28",
  }
  
  return (
    <div className={cn("flex flex-col", sizeClasses[size])}>
      <div className="aspect-[3/4] rounded-lg bg-gradient-to-b from-secondary/80 to-secondary animate-pulse" />
      <div className="mt-2 space-y-1">
        <div className="h-3 bg-secondary/80 rounded w-full animate-pulse" />
        <div className="h-2.5 bg-secondary/60 rounded w-2/3 mx-auto animate-pulse" />
      </div>
    </div>
  )
}

// ===== 横向卡片骨架 =====
export function BookCardHorizontalSkeleton() {
  return (
    <div className="flex gap-3 p-3 bg-card rounded-xl border border-border/60">
      <div className="w-16 h-[86px] rounded-md bg-secondary/80 animate-pulse flex-shrink-0" />
      <div className="flex-1 py-0.5 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-4 bg-secondary/80 rounded w-20 animate-pulse" />
          <div className="h-4 bg-secondary/60 rounded w-10 animate-pulse" />
        </div>
        <div className="h-3 bg-secondary/60 rounded w-16 animate-pulse" />
        <div className="h-3 bg-secondary/40 rounded w-full animate-pulse" />
        <div className="flex items-center gap-3 pt-1">
          <div className="h-3 bg-secondary/40 rounded w-12 animate-pulse" />
          <div className="h-3 bg-secondary/40 rounded w-16 animate-pulse" />
        </div>
      </div>
    </div>
  )
}

// ===== 分类导航骨架 =====
export function CategoryNavSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="py-3 px-2 rounded-xl bg-secondary/60 animate-pulse">
          <div className="w-5 h-5 bg-secondary/80 rounded mx-auto mb-1" />
          <div className="h-3 bg-secondary/80 rounded w-8 mx-auto mb-1" />
          <div className="h-2 bg-secondary/40 rounded w-12 mx-auto" />
        </div>
      ))}
    </div>
  )
}

// ===== 专题书单骨架 =====
export function BookListCardSkeleton() {
  return (
    <div className="w-64 flex-shrink-0 rounded-xl overflow-hidden bg-card border border-border/60">
      <div className="h-28 bg-secondary/60 animate-pulse" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-secondary/80 rounded w-3/4 animate-pulse" />
        <div className="h-3 bg-secondary/40 rounded w-full animate-pulse" />
        <div className="flex -space-x-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-8 h-10 rounded bg-secondary/60 animate-pulse border-2 border-card" />
          ))}
        </div>
      </div>
    </div>
  )
}

// ===== 继续阅读骨架 =====
export function ContinueReadingSkeleton() {
  return (
    <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-24">
          <div className="aspect-[3/4] rounded-lg bg-secondary/60 animate-pulse" />
          <div className="mt-2 space-y-1">
            <div className="h-3 bg-secondary/60 rounded w-full animate-pulse" />
            <div className="h-2.5 bg-secondary/40 rounded w-2/3 mx-auto animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ===== 阅读统计骨架 =====
export function ReadingStatsSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border/60">
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-secondary/60 rounded w-20 animate-pulse" />
        <div className="h-8 bg-secondary/80 rounded w-16 animate-pulse" />
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="w-6 h-6 rounded bg-secondary/60 animate-pulse" />
            <div className="h-2 bg-secondary/40 rounded w-3 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ===== 排行榜骨架 =====
export function RankingListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2">
          <div className="w-6 h-6 rounded bg-secondary/60 animate-pulse flex-shrink-0" />
          <div className="w-10 h-14 rounded bg-secondary/60 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 bg-secondary/80 rounded w-3/4 animate-pulse" />
            <div className="h-3 bg-secondary/40 rounded w-1/2 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ===== 古籍首页完整骨架 =====
export function ClassicsHomeSkeleton() {
  return (
    <div className="min-h-screen bg-surface-base pb-20 animate-in fade-in duration-300">
      {/* 顶部 */}
      <div className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <div className="w-8 h-8 rounded bg-secondary/60 animate-pulse" />
          <div className="h-5 bg-secondary/80 rounded w-16 animate-pulse" />
          <div className="flex-1" />
          <div className="w-8 h-8 rounded bg-secondary/60 animate-pulse" />
          <div className="w-8 h-8 rounded bg-secondary/60 animate-pulse" />
        </div>
      </div>

      {/* 继续阅读 */}
      <div className="px-4 py-4">
        <div className="h-4 bg-secondary/60 rounded w-20 mb-3 animate-pulse" />
        <ContinueReadingSkeleton />
      </div>

      {/* 阅读统计 */}
      <div className="px-4 pb-4">
        <ReadingStatsSkeleton />
      </div>

      {/* 分类导航 */}
      <div className="px-4 pb-4">
        <CategoryNavSkeleton />
      </div>

      {/* 专题书单 */}
      <div className="px-4 pb-4">
        <div className="h-4 bg-secondary/60 rounded w-20 mb-3 animate-pulse" />
        <div className="flex gap-3 overflow-x-auto scrollbar-hide">
          <BookListCardSkeleton />
          <BookListCardSkeleton />
        </div>
      </div>

      {/* 排行榜 */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-4 bg-secondary/60 rounded w-16 animate-pulse" />
          <div className="h-4 bg-secondary/40 rounded w-16 animate-pulse" />
        </div>
        <RankingListSkeleton />
      </div>
    </div>
  )
}

// ===== 古籍详情页骨架 =====
export function ClassicsDetailSkeleton() {
  return (
    <div className="min-h-screen bg-surface-base pb-24">
      {/* 顶部 */}
      <div className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <div className="w-8 h-8 rounded bg-secondary/60 animate-pulse" />
          <div className="flex-1" />
          <div className="w-8 h-8 rounded bg-secondary/60 animate-pulse" />
          <div className="w-8 h-8 rounded bg-secondary/60 animate-pulse" />
        </div>
      </div>

      {/* 封面区 */}
      <div className="px-4 py-6">
        <div className="flex gap-4">
          <div className="w-28 h-[150px] rounded-lg bg-secondary/60 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-6 bg-secondary/80 rounded w-3/4 animate-pulse" />
            <div className="h-4 bg-secondary/60 rounded w-1/2 animate-pulse" />
            <div className="flex gap-2">
              <div className="h-5 bg-secondary/40 rounded w-12 animate-pulse" />
              <div className="h-5 bg-secondary/40 rounded w-12 animate-pulse" />
            </div>
            <div className="h-3 bg-secondary/40 rounded w-full animate-pulse" />
            <div className="h-3 bg-secondary/40 rounded w-2/3 animate-pulse" />
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="px-4 pb-4 flex gap-3">
        <div className="h-11 bg-secondary/60 rounded-full flex-1 animate-pulse" />
        <div className="h-11 bg-secondary/80 rounded-full flex-1 animate-pulse" />
      </div>

      {/* 目录 */}
      <div className="px-4 py-4">
        <div className="h-5 bg-secondary/60 rounded w-20 mb-3 animate-pulse" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-border/50">
              <div className="w-4 h-4 bg-secondary/40 rounded animate-pulse" />
              <div className="h-4 bg-secondary/60 rounded flex-1 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ===== AI助手骨架 =====
export function AIAssistantSkeleton() {
  return (
    <div className="min-h-screen bg-surface-base pb-20">
      {/* 顶部 */}
      <div className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center justify-center gap-3 px-4 h-14 relative">
          <div className="absolute left-4 w-8 h-8 rounded bg-secondary/60 animate-pulse" />
          <div className="h-5 bg-secondary/80 rounded w-24 animate-pulse" />
        </div>
      </div>

      {/* AI回答区 */}
      <div className="p-4 space-y-4">
        <div className="bg-card rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-secondary/60 animate-pulse" />
            <div className="h-4 bg-secondary/60 rounded w-20 animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-secondary/60 rounded w-full animate-pulse" />
            <div className="h-4 bg-secondary/60 rounded w-full animate-pulse" />
            <div className="h-4 bg-secondary/60 rounded w-3/4 animate-pulse" />
          </div>
        </div>
      </div>

      {/* 推荐问题 */}
      <div className="px-4 space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card rounded-lg p-3">
            <div className="h-4 bg-secondary/60 rounded w-full animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
