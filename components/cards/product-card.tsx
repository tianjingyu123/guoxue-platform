"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  type CardVariant,
  normalizeRatio,
  cardShell,
  formatCount,
  CardCover,
  TypeBadge,
  HotBadge,
  PriceTag,
  RankBadge,
} from "./primitives"

export interface ProductCardData {
  id: number | string
  title: string
  cover?: string
  coverRatio?: string
  price?: number
  originalPrice?: number
  sales?: number
  rating?: number
  /** 高转化标：秒杀 / 热销 / 新品 */
  tag?: "秒杀" | "热销" | "新品" | string
}

function hotKind(tag?: string) {
  if (tag === "秒杀") return "seckill" as const
  if (tag === "热销") return "hot" as const
  if (tag === "新品") return "new" as const
  return null
}

export function ProductCard({
  data,
  variant = "feed",
  rank,
  className,
}: {
  data: ProductCardData
  variant?: CardVariant
  rank?: number
  className?: string
}) {
  const href = `/mall/product/${data.id}`
  const ratio = normalizeRatio(data.coverRatio)
  const kind = hotKind(data.tag)

  // ---------- 横向列表卡 ----------
  if (variant === "list") {
    return (
      <Link href={href} className={cn("block", className)}>
        <article className={cn(cardShell, "flex gap-3 p-2")}>
          <div className="w-[100px] flex-shrink-0">
            <CardCover src={data.cover} alt={data.title} ratio="1:1" className="rounded-xl">
              {kind && <HotBadge kind={kind} />}
            </CardCover>
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
            <h3 className="text-[14px] font-medium text-[var(--text-strong)] line-clamp-2 leading-snug">{data.title}</h3>
            <div className="flex items-end justify-between">
              <PriceTag price={data.price} originalPrice={data.originalPrice} />
              {data.sales ? <span className="text-[11px] text-[var(--text-soft)]">已售{formatCount(data.sales)}</span> : null}
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
              <PriceTag price={data.price} size="sm" />
              {data.sales ? <span className="text-[11px] text-[var(--text-soft)]">售{formatCount(data.sales)}</span> : null}
            </div>
          </div>
        </article>
      </Link>
    )
  }

  // ---------- 横滑小卡 ----------
  if (variant === "rail") {
    return (
      <Link href={href} className={cn("block w-[130px] flex-shrink-0", className)}>
        <article className={cardShell}>
          <CardCover src={data.cover} alt={data.title} ratio="1:1">
            {kind && <HotBadge kind={kind} />}
          </CardCover>
          <div className="p-2">
            <h3 className="text-[13px] text-[var(--text-strong)] line-clamp-2 leading-snug mb-1 min-h-[36px]">{data.title}</h3>
            <PriceTag price={data.price} originalPrice={data.originalPrice} size="sm" />
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
          <TypeBadge type="product" />
          {kind && <HotBadge kind={kind} />}
        </CardCover>
        <div className="p-2.5">
          <h3 className="text-[14px] font-medium text-[var(--text-strong)] line-clamp-2 leading-[1.5] mb-1.5">{data.title}</h3>
          <div className="flex items-end justify-between">
            <PriceTag price={data.price} originalPrice={data.originalPrice} />
            {data.sales ? <span className="text-[11px] text-[var(--text-soft)]">已售{formatCount(data.sales)}</span> : null}
          </div>
        </div>
      </article>
    </Link>
  )
}
