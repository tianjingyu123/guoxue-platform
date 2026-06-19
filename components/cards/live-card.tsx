"use client"

import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Eye, Clock, Bell, Users } from "lucide-react"
import {
  type CardVariant,
  normalizeRatio,
  cardShell,
  formatCount,
  CardCover,
  HotBadge,
  AuthorRow,
} from "./primitives"

export interface LiveCardData {
  id: number | string
  title: string
  cover?: string
  coverRatio?: string
  host?: string
  hostAvatar?: string
  viewers?: number
  reservations?: number
  status?: "live" | "upcoming" | "replay"
  /** 直播类型：knowledge 知识授课 / commerce 电商带货 */
  liveType?: "knowledge" | "commerce"
  scheduledTime?: string
  duration?: string
}

export function LiveCard({
  data,
  variant = "feed",
  className,
}: {
  data: LiveCardData
  variant?: CardVariant
  className?: string
}) {
  const [booked, setBooked] = useState(false)
  const href = `/live/${data.id}`
  const ratio = normalizeRatio(data.coverRatio)
  const status = data.status ?? "live"

  const typeLabel = data.liveType === "commerce" ? "电商带货" : "知识授课"

  const handleBook = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setBooked((b) => !b)
  }

  // 封面浮层（状态标 + 人数 + 预约按钮）
  const overlay = (
    <>
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
      <span className="absolute top-2 left-2 z-10 text-[10px] px-2 py-0.5 rounded-full text-white/95 font-medium bg-black/35 backdrop-blur-md">
        {typeLabel}
      </span>
      {status === "live" ? (
        <HotBadge kind="live" />
      ) : status === "upcoming" ? (
        <span className="absolute top-2 right-2 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/35 backdrop-blur-md text-white/95 text-[10px] font-medium">
          <Clock className="w-3 h-3" />
          {data.scheduledTime}
        </span>
      ) : (
        <span className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full bg-black/35 backdrop-blur-md text-white/95 text-[10px]">
          {data.duration || "回放"}
        </span>
      )}
      <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/45 backdrop-blur-sm text-white text-[10px]">
        {status === "upcoming" ? (
          <>
            <Users className="w-3 h-3 text-white/80" />
            {formatCount(data.reservations)}预约
          </>
        ) : (
          <>
            <Eye className="w-3 h-3 text-white/80" />
            {formatCount(data.viewers)}
            {status === "replay" ? "次观看" : ""}
          </>
        )}
      </div>
      {status === "upcoming" && (
        <button
          onClick={handleBook}
          className={cn(
            "absolute bottom-2 right-2 z-10 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all",
            booked ? "bg-white/20 text-white border border-white/30" : "bg-[var(--brand)] text-white",
          )}
        >
          <Bell className="w-3 h-3" />
          {booked ? "已约" : "预约"}
        </button>
      )}
    </>
  )

  // ---------- 横向列表卡 ----------
  if (variant === "list") {
    return (
      <Link href={href} className={cn("block", className)}>
        <article className={cn(cardShell, "flex gap-3 p-2")}>
          <div className="w-[120px] flex-shrink-0">
            <CardCover src={data.cover} alt={data.title} ratio="1:1" className="rounded-xl">
              {overlay}
            </CardCover>
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
            <h3 className="text-[14px] font-medium text-[var(--text-strong)] line-clamp-2 leading-snug">{data.title}</h3>
            <AuthorRow name={data.host} avatar={data.hostAvatar} />
          </div>
        </article>
      </Link>
    )
  }

  // ---------- 横滑小卡 ----------
  if (variant === "rail") {
    return (
      <Link href={href} className={cn("block w-[150px] flex-shrink-0", className)}>
        <article className={cardShell}>
          <CardCover src={data.cover} alt={data.title} ratio="1:1">
            {overlay}
          </CardCover>
          <div className="p-2">
            <h3 className="text-[13px] text-[var(--text-strong)] line-clamp-2 leading-snug mb-1 min-h-[36px]">{data.title}</h3>
            <AuthorRow name={data.host} avatar={data.hostAvatar} />
          </div>
        </article>
      </Link>
    )
  }

  // ---------- 瀑布流/网格竖卡（默认 feed） ----------
  return (
    <Link href={href} className={cn("block break-inside-avoid mb-[6px] sm:mb-2", className)}>
      <article
        className={cn(cardShell, status === "live" && "ring-1 ring-[var(--brand)]/40 live-card-glow")}
      >
        <CardCover src={data.cover} alt={data.title} ratio={ratio}>
          {overlay}
        </CardCover>
        <div className="p-2.5">
          <h3 className="text-[14px] font-medium text-[var(--text-strong)] line-clamp-2 leading-[1.5] mb-2">{data.title}</h3>
          <AuthorRow name={data.host} avatar={data.hostAvatar} />
        </div>
      </article>
    </Link>
  )
}
