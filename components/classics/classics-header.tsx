"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface ClassicsHeaderProps {
  /** 居中标题 */
  title: string
  /** 是否显示右侧搜索入口，默认 true */
  showSearch?: boolean
  /** 自定义右侧操作（覆盖默认搜索按钮） */
  rightSlot?: ReactNode
  /** 返回行为，默认 router.back() */
  onBack?: () => void
  className?: string
}

/**
 * 古籍馆通用页头 - 苹果式半透明吸顶导航
 * 与古籍馆首页风格统一：毛玻璃背景、圆形按钮、17px 居中标题。
 */
export function ClassicsHeader({
  title,
  showSearch = true,
  rightSlot,
  onBack,
  className,
}: ClassicsHeaderProps) {
  const router = useRouter()
  return (
    <header
      className={cn(
        "sticky top-0 z-50 bg-[#f4f2ee]/80 dark:bg-background/80 backdrop-blur-xl",
        className,
      )}
    >
      <div className="flex items-center justify-between px-3 sm:px-6 h-12 sm:h-14 max-w-screen-xl mx-auto">
        <button
          onClick={onBack ?? (() => router.back())}
          className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          aria-label="返回"
        >
          <ArrowLeft className="w-[22px] h-[22px] text-foreground" />
        </button>
        <h1 className="text-[17px] font-semibold tracking-tight text-foreground truncate px-2">{title}</h1>
        {rightSlot ? (
          <div className="flex items-center justify-end min-w-9">{rightSlot}</div>
        ) : showSearch ? (
          <Link
            href="/classics/search"
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            aria-label="搜索"
          >
            <Search className="w-[22px] h-[22px] text-foreground" />
          </Link>
        ) : (
          <span className="w-9 h-9" />
        )}
      </div>
    </header>
  )
}
