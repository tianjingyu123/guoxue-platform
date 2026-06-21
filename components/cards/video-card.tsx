"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { Play, Heart } from "lucide-react"
import { type CardVariant, normalizeRatio, cardShell, formatCount, CardCover, TypeBadge } from "./primitives"

export interface VideoCardData {
  id: number | string
  title: string
  cover?: string
  coverRatio?: string
  author?: string
  plays?: number
  likes?: number
  duration?: string
}

export function VideoCard({
  data,
  variant = "feed",
  className,
}: {
  data: VideoCardData
  variant?: CardVariant
  className?: string
}) {
  const href = `/video/${data.id}`
  const ratio = normalizeRatio(data.coverRatio)

  // ---------- 横向列表卡 ----------
  if (variant === "list") {
    return (
      <Link href={href} className={cn("block", className)}>
        <article className={cn(cardShell, "flex gap-3 p-2")}>
          <div className="w-[120px] flex-shrink-0 relative aspect-video rounded-xl overflow-hidden bg-[var(--surface-sunken)]">
            <img src={data.cover || "/placeholder.svg"} alt={data.title} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
              </div>
            </div>
            {data.duration && <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/60 text-white text-[9px] font-mono">{data.duration}</span>}
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
            <h3 className="text-[14px] font-medium text-[var(--text-strong)] line-clamp-2 leading-snug">{data.title}</h3>
            <div className="flex items-center justify-between text-[11px] text-[var(--text-soft)]">
              <span className="truncate max-w-[90px]">@{data.author}</span>
              <span className="inline-flex items-center gap-0.5"><Play className="w-3 h-3" />{formatCount(data.plays)}</span>
            </div>
          </div>
        </article>
      </Link>
    )
  }

  // ---------- 瀑布流/网格竖卡（默认 feed，全图覆盖式） ----------
  return (
    <Link href={href} className={cn("block break-inside-avoid mb-[6px] sm:mb-2", className)}>
      <article className={cn(cardShell, "relative")}>
        <CardCover src={data.cover} alt={data.title} ratio={ratio}>
          <TypeBadge type="video" />
          {/* 播放按钮 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center">
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            </div>
          </div>
          {data.duration && <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-mono">{data.duration}</span>}
          {/* 底部信息渐变层 */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-2.5 pt-8">
            <h3 className="text-[13px] font-medium text-white line-clamp-2 leading-snug">{data.title}</h3>
            <div className="flex items-center justify-between mt-1.5 text-[11px] text-white/80">
              <span className="truncate max-w-[90px]">@{data.author}</span>
              <span className="inline-flex items-center gap-0.5"><Heart className="w-3 h-3" />{formatCount(data.likes)}</span>
            </div>
          </div>
        </CardCover>
      </article>
    </Link>
  )
}
