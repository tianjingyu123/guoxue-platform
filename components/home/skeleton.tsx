"use client"

import { cn } from "@/lib/utils"

interface FeedSkeletonProps {
  count?: number
}

// 单个卡片骨架屏
function CardSkeleton({ ratio = "3:4" }: { ratio?: "3:4" | "4:3" | "16:9" | "text" }) {
  const aspectClass = {
    "3:4": "aspect-[3/4]",
    "4:3": "aspect-[4/3]",
    "16:9": "aspect-video",
    "text": "h-24",
  }[ratio]

  return (
    <div className="bg-white rounded-[10px] overflow-hidden shadow-sm animate-pulse">
      {/* 封面骨架 */}
      {ratio !== "text" && (
        <div className={cn("bg-[#E8E3DB]", aspectClass)} />
      )}
      
      {/* 内容区骨架 */}
      <div className="p-3 space-y-2">
        {/* 标题 */}
        <div className="h-4 bg-[#E8E3DB] rounded w-full" />
        <div className="h-4 bg-[#E8E3DB] rounded w-2/3" />
        
        {/* 作者行 */}
        <div className="flex items-center gap-2 pt-1">
          <div className="w-5 h-5 bg-[#E8E3DB] rounded-full" />
          <div className="h-3 bg-[#E8E3DB] rounded w-16" />
        </div>
        
        {/* 互动数据 */}
        <div className="flex items-center gap-3">
          <div className="h-3 bg-[#E8E3DB] rounded w-10" />
          <div className="h-3 bg-[#E8E3DB] rounded w-10" />
        </div>
      </div>
    </div>
  )
}

// Banner骨架屏
export function BannerSkeleton() {
  return (
    <div className="mx-4 mt-2 mb-3">
      <div className="h-36 bg-[#E8E3DB] rounded-xl animate-pulse" />
    </div>
  )
}

// 快捷入口骨架屏
export function QuickEntrySkeleton() {
  return (
    <div className="mx-4 mb-4">
      <div className="grid grid-cols-5 gap-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 animate-pulse">
            <div className="w-12 h-12 bg-[#E8E3DB] rounded-xl" />
            <div className="w-8 h-2 bg-[#E8E3DB] rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Feed流骨架屏
export function FeedSkeleton({ count = 6 }: FeedSkeletonProps) {
  // 模拟不同比例的卡片
  const ratios: ("3:4" | "4:3" | "16:9" | "text")[] = ["3:4", "3:4", "4:3", "text", "3:4", "16:9"]
  
  return (
    <div className="columns-2 gap-3 px-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="break-inside-avoid mb-3">
          <CardSkeleton ratio={ratios[i % ratios.length]} />
        </div>
      ))}
    </div>
  )
}

// 完整首页骨架屏
export function HomePageSkeleton() {
  return (
    <div className="pt-[88px] pb-20">
      <BannerSkeleton />
      <QuickEntrySkeleton />
      <FeedSkeleton count={6} />
    </div>
  )
}
