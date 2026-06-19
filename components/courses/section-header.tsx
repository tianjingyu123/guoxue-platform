"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface SectionHeaderProps {
  icon: LucideIcon
  title: string
  subtitle?: string
  /** “查看全部”跳转目标，留空则不显示入口 */
  moreHref?: string
  /** 图标主题色，默认主色 */
  iconColor?: string
  className?: string
}

/** 课程首页专栏标题：图标 + 标题 + 副标题 + 查看全部 */
export function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  moreHref,
  iconColor,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center gap-2 px-4 mb-3", className)}>
      <span
        className="flex items-center justify-center w-7 h-7 rounded-lg"
        style={{ background: iconColor ? `${iconColor}1a` : "var(--secondary)" }}
        aria-hidden
      >
        <Icon className="w-4 h-4" style={{ color: iconColor ?? "var(--primary)" }} />
      </span>
      <div className="flex items-baseline gap-2 min-w-0">
        <h2 className="text-[17px] font-bold tracking-tight text-foreground truncate">{title}</h2>
        {subtitle ? <span className="text-[12px] text-muted-foreground truncate">{subtitle}</span> : null}
      </div>
      {moreHref ? (
        <Link
          href={moreHref}
          className="ml-auto flex items-center gap-0.5 text-[13px] text-muted-foreground shrink-0 active:text-foreground"
        >
          全部
          <ChevronRight className="w-4 h-4" />
        </Link>
      ) : null}
    </div>
  )
}
