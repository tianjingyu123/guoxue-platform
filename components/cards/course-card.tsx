"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { BookOpen } from "lucide-react"
import {
  type CardVariant,
  normalizeRatio,
  cardShell,
  formatCount,
  CardCover,
  TypeBadge,
  HotBadge,
  PriceTag,
  AuthorRow,
  StatRating,
  RankBadge,
} from "./primitives"

export interface CourseCardData {
  id: number | string
  title: string
  cover?: string
  coverRatio?: string
  price?: number
  originalPrice?: number
  free?: boolean
  students?: number
  lessons?: number
  rating?: number
  teacher?: string
  teacherAvatar?: string
  /** 高转化标：热销 / 新品 */
  tag?: string
}

function hotKind(tag?: string) {
  if (tag === "热销") return "hot" as const
  if (tag === "新品") return "new" as const
  return null
}

export function CourseCard({
  data,
  variant = "feed",
  rank,
  className,
}: {
  data: CourseCardData
  variant?: CardVariant
  rank?: number
  className?: string
}) {
  const href = `/course/${data.id}`
  const ratio = normalizeRatio(data.coverRatio)
  const kind = hotKind(data.tag)

  const metaLine = (
    <div className="flex items-center gap-2 text-[11px] text-[var(--text-soft)]">
      {data.students ? <span>{formatCount(data.students)}人学</span> : null}
      {data.lessons ? <span className="inline-flex items-center gap-0.5"><BookOpen className="w-3 h-3" />{data.lessons}节</span> : null}
      {data.rating != null && <StatRating value={data.rating} />}
    </div>
  )

  // ---------- 横向列表卡 ----------
  if (variant === "list") {
    return (
      <Link href={href} className={cn("block", className)}>
        <article className={cn(cardShell, "flex gap-3 p-2")}>
          <div className="w-[120px] flex-shrink-0">
            <CardCover src={data.cover} alt={data.title} ratio="1:1" className="rounded-xl" />
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
            <div>
              <h3 className="text-[14px] font-medium text-[var(--text-strong)] line-clamp-2 leading-snug mb-1">{data.title}</h3>
              {data.teacher ? <span className="text-[11px] text-[var(--text-soft)]">{data.teacher}</span> : null}
            </div>
            <div className="flex items-end justify-between">
              <PriceTag price={data.price} originalPrice={data.originalPrice} free={data.free} />
              {data.students ? <span className="text-[11px] text-[var(--text-soft)]">{formatCount(data.students)}人学</span> : null}
            </div>
          </div>
        </article>
      </Link>
    )
  }

  // ---------- 榜单卡 ----------
  if (variant === "rank") {
    return (
      <Link href={href} className={cn("block", className)}>
        <article className="flex items-center gap-2.5 py-2">
          {rank != null && <RankBadge rank={rank} />}
          <div className="w-12 h-12 flex-shrink-0">
            <CardCover src={data.cover} alt={data.title} ratio="1:1" className="rounded-lg" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[13px] font-medium text-[var(--text-strong)] truncate">{data.title}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <PriceTag price={data.price} free={data.free} size="sm" />
              {data.students ? <span className="text-[11px] text-[var(--text-soft)]">{formatCount(data.students)}人学</span> : null}
            </div>
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
            <TypeBadge type="course" />
          </CardCover>
          <div className="p-2">
            <h3 className="text-[13px] text-[var(--text-strong)] line-clamp-2 leading-snug mb-1 min-h-[36px]">{data.title}</h3>
            <PriceTag price={data.price} free={data.free} size="sm" />
          </div>
        </article>
      </Link>
    )
  }

  // ---------- 瀑布流/网格竖卡（默认 feed） ----------
  return (
    <Link href={href} className={cn("block break-inside-avoid mb-[6px] sm:mb-2", className)}>
      <article className={cardShell}>
        <CardCover src={data.cover} alt={data.title} ratio={ratio}>
          <TypeBadge type="course" />
          {kind && <HotBadge kind={kind} />}
        </CardCover>
        <div className="p-2.5">
          <h3 className="text-[14px] font-medium text-[var(--text-strong)] line-clamp-2 leading-[1.5] mb-1.5">{data.title}</h3>
          <div className="mb-1.5">
            <PriceTag price={data.price} originalPrice={data.originalPrice} free={data.free} />
          </div>
          <AuthorRow
            name={data.teacher}
            avatar={data.teacherAvatar}
            trailing={data.students ? <span className="text-[11px] text-[var(--text-soft)] flex-shrink-0">{formatCount(data.students)}人学</span> : undefined}
          />
          {!data.teacher && metaLine}
        </div>
      </article>
    </Link>
  )
}
