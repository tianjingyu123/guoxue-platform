"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export function FeedSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 p-4">
      {/* 圈子卡片骨架 */}
      <Card className="p-3 col-span-2">
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-lg" />
          <div className="flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16 mt-2" />
          </div>
        </div>
      </Card>

      {/* 课程卡片骨架 */}
      <Card className="overflow-hidden">
        <Skeleton className="aspect-[4/3]" />
        <div className="p-2.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-16 mt-2" />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <Skeleton className="aspect-[4/3]" />
        <div className="p-2.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-16 mt-2" />
        </div>
      </Card>

      {/* 文章卡片骨架 */}
      <Card className="p-3 col-span-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full mt-2" />
        <Skeleton className="h-3 w-2/3 mt-1" />
        <div className="flex items-center gap-2 mt-2">
          <Skeleton className="w-5 h-5 rounded-full" />
          <Skeleton className="h-3 w-12" />
        </div>
      </Card>

      {/* 排盘引导卡片骨架 */}
      <Card className="col-span-2 p-4">
        <div className="flex items-center gap-4">
          <Skeleton className="w-14 h-14 rounded-xl" />
          <div className="flex-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-48 mt-2" />
            <Skeleton className="h-4 w-20 mt-2" />
          </div>
        </div>
      </Card>

      {/* 更多卡片骨架 */}
      <Card className="overflow-hidden">
        <Skeleton className="aspect-[3/4]" />
        <div className="p-2.5">
          <Skeleton className="h-3 w-full" />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <Skeleton className="aspect-[3/4]" />
        <div className="p-2.5">
          <Skeleton className="h-3 w-full" />
        </div>
      </Card>

      <Card className="p-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-xl" />
          <div className="flex-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-32 mt-2" />
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <Skeleton className="aspect-video" />
        <div className="p-2.5">
          <Skeleton className="h-3 w-full" />
        </div>
      </Card>
    </div>
  )
}
