"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { Sparkles, MessageCircle, Star, ChevronRight } from "lucide-react"
import { type CardVariant, cardShell, formatCount } from "./primitives"

export interface AgentCardData {
  id: number | string
  name: string
  avatar?: string
  description?: string
  useCount?: number
  rating?: number
  /** 高转化标：HOT / 精准 等 */
  tag?: string
}

// 智能体卡使用品牌红渐变作为视觉锚点（平台特色，区别于普通内容卡）
export function AgentCard({
  data,
  variant = "feed",
  context,
  className,
}: {
  data: AgentCardData
  variant?: CardVariant
  context?: string
  className?: string
}) {
  const href = `/agent/${data.id}${context ? `?from=${context}` : ""}`

  // ---------- 横向列表卡 ----------
  if (variant === "list") {
    return (
      <Link href={href} className={cn("block", className)}>
        <article className={cn(cardShell, "flex items-center gap-3 p-3")}>
          <img src={data.avatar || "/placeholder.svg"} alt="" className="w-12 h-12 rounded-xl flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-[14px] font-medium text-[var(--text-strong)] truncate">{data.name}</h3>
              {data.tag && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--brand)]/10 text-[var(--brand)] font-medium flex-shrink-0">{data.tag}</span>
              )}
            </div>
            {data.description ? <p className="text-[11px] text-[var(--text-soft)] truncate mt-0.5">{data.description}</p> : null}
            {data.useCount ? <span className="text-[11px] text-[var(--text-soft)]">{formatCount(data.useCount)}次对话</span> : null}
          </div>
          <div className="w-8 h-8 rounded-full bg-[var(--brand)]/10 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-4 h-4 text-[var(--brand)]" />
          </div>
        </article>
      </Link>
    )
  }

  // ---------- 横滑小卡 ----------
  if (variant === "rail") {
    return (
      <Link href={href} className={cn("block w-[140px] flex-shrink-0", className)}>
        <article className={cardShell}>
          <div className="p-3 bg-gradient-to-br from-[var(--brand)] to-[#A01530]">
            <div className="flex items-center gap-2">
              <img src={data.avatar || "/placeholder.svg"} alt="" className="w-9 h-9 rounded-xl bg-white/20" />
              <Sparkles className="w-3.5 h-3.5 text-white/70 ml-auto" />
            </div>
            <h3 className="text-[13px] font-medium text-white truncate mt-2">{data.name}</h3>
            {data.description ? <p className="text-[10px] text-white/70 line-clamp-1 mt-0.5">{data.description}</p> : null}
          </div>
          <div className="p-2 flex items-center justify-between">
            <span className="text-[10px] text-[var(--text-soft)]">{formatCount(data.useCount)}次</span>
            {data.rating != null && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-[var(--text)]">
                <Star className="w-3 h-3 text-[var(--gold)] fill-[var(--gold)]" />{data.rating}
              </span>
            )}
          </div>
        </article>
      </Link>
    )
  }

  // ---------- 瀑布流/网格竖卡（默认 feed） ----------
  return (
    <Link href={href} className={cn("block break-inside-avoid mb-[6px] sm:mb-2", className)}>
      <article className={cn(cardShell, "bg-gradient-to-br from-[var(--brand)] to-[#A01530]")}>
        <div className="p-3.5">
          <div className="flex items-center gap-2.5">
            <img src={data.avatar || "/placeholder.svg"} alt="" className="w-11 h-11 rounded-xl bg-white/20" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-[15px] font-bold text-white truncate">{data.name}</h3>
                {data.tag && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/25 text-white font-medium flex-shrink-0">{data.tag}</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-white/80">
                {data.useCount ? <span>{formatCount(data.useCount)}使用</span> : null}
                {data.rating != null && (
                  <span className="inline-flex items-center gap-0.5">
                    <Star className="w-3 h-3 text-white fill-white" />{data.rating}
                  </span>
                )}
              </div>
            </div>
          </div>
          {data.description ? <p className="text-[12px] text-white/85 line-clamp-2 leading-relaxed mt-2.5">{data.description}</p> : null}
          <div className="mt-3 flex items-center justify-center gap-1 py-2 rounded-xl bg-white/15 backdrop-blur-sm text-white text-[13px] font-medium">
            <MessageCircle className="w-4 h-4" />
            立即对话
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </article>
    </Link>
  )
}
