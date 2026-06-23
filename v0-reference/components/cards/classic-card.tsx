"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { Mic, BookOpen } from "lucide-react"
import { type CardVariant, cardShell, formatCount } from "./primitives"

export interface ClassicCardData {
  id: number | string
  title: string
  author?: string
  dynasty?: string
  description?: string
  isFree?: boolean
  hasAudio?: boolean
  readers?: number
}

// 古籍卡采用宣纸质感渐变背景 + 印章装饰，营造古朴阅读氛围
export function ClassicCard({
  data,
  variant = "feed",
  className,
}: {
  data: ClassicCardData
  variant?: CardVariant
  className?: string
}) {
  const href = `/classics/${data.id}`

  // ---------- 横向列表卡 ----------
  if (variant === "list") {
    return (
      <Link href={href} className={cn("block", className)}>
        <article className={cn(cardShell, "flex gap-3 p-2.5")}>
          <div className="w-[64px] h-[84px] flex-shrink-0 rounded-lg bg-gradient-to-br from-[#F8F4EC] to-[#EDE4D3] border border-[#D4C4A8]/50 flex items-center justify-center">
            <span className="text-[15px] font-bold text-[#2C1810] font-serif [writing-mode:vertical-rl] tracking-widest">{data.title.slice(0, 4)}</span>
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-[14px] font-medium text-[var(--text-strong)] truncate">{data.title}</h3>
                {data.dynasty && <span className="text-[10px] text-[#8B6914] flex-shrink-0">{data.dynasty}</span>}
              </div>
              {data.description ? <p className="text-[12px] text-[var(--text-soft)] line-clamp-2 mt-1">{data.description}</p> : null}
            </div>
            <div className="flex items-center gap-2">
              {data.isFree && <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--success)]/10 text-[var(--success)] font-medium">免费</span>}
              {data.hasAudio && <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--brand)]/10 text-[var(--brand)] font-medium inline-flex items-center gap-0.5"><Mic className="w-2.5 h-2.5" />有声</span>}
              {data.readers ? <span className="text-[11px] text-[var(--text-soft)] ml-auto">{formatCount(data.readers)}人读</span> : null}
            </div>
          </div>
        </article>
      </Link>
    )
  }

  // ---------- 瀑布流/网格竖卡（默认 feed） ----------
  return (
    <Link href={href} className={cn("block break-inside-avoid mb-[6px] sm:mb-2", className)}>
      <article className={cn(cardShell, "relative bg-gradient-to-br from-[#F8F4EC] via-[#F5EFE3] to-[#EDE4D3] border border-[#D4C4A8]/50")}>
        {/* 印章装饰 */}
        <div className="absolute top-2.5 right-2.5 w-9 h-9 border-2 border-[var(--brand)]/30 rounded flex items-center justify-center rotate-12">
          <span className="text-[var(--brand)]/40 text-[10px] font-serif">典藏</span>
        </div>
        <div className="p-3.5">
          {/* 标签 */}
          <div className="flex items-center gap-1.5">
            {data.isFree && <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--success)] text-white font-medium">免费</span>}
            {data.hasAudio && <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--brand)] text-white font-medium inline-flex items-center gap-0.5"><Mic className="w-2.5 h-2.5" />有声</span>}
            {data.dynasty && <span className="text-[10px] text-[#8B6914]">{data.dynasty}代</span>}
          </div>
          {/* 书名区 */}
          <div className="flex items-center justify-center py-5">
            <div className="text-center">
              <h3 className="text-[22px] font-bold text-[#2C1810] font-serif tracking-widest">{data.title}</h3>
              {data.author ? <p className="text-[13px] text-[#5D4037] mt-1.5">{data.author} 著</p> : null}
            </div>
          </div>
          {/* 底部 */}
          {data.description ? <p className="text-[12px] text-[#8B7355] line-clamp-2 leading-relaxed">{data.description}</p> : null}
          <div className="flex items-center justify-between mt-2.5">
            {data.readers ? <span className="text-[11px] text-[var(--text-soft)]">{formatCount(data.readers)}人阅读</span> : <span />}
            <span className="text-[12px] text-[var(--brand)] font-medium inline-flex items-center gap-0.5">
              <BookOpen className="w-3 h-3" />开始阅读
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}
