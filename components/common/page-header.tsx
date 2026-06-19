"use client"

import { ArrowLeft, Share2, MoreHorizontal } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title?: string
  backHref?: string // 指定返回的路径，不传则使用router.back()
  onBack?: () => void // 自定义返回逻辑
  showBack?: boolean
  showShare?: boolean
  showMore?: boolean
  onShare?: () => void
  onMore?: () => void
  rightSlot?: React.ReactNode // 右侧自定义内容
  transparent?: boolean // 是否透明背景
  className?: string
}

export function PageHeader({
  title,
  backHref,
  onBack,
  showBack = true,
  showShare = false,
  showMore = false,
  onShare,
  onMore,
  rightSlot,
  transparent = false,
  className,
}: PageHeaderProps) {
  const router = useRouter()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else if (backHref) {
      router.push(backHref)
    } else {
      router.back()
    }
  }

  return (
    <header 
      className={cn(
        "sticky top-0 z-40 safe-area-pt",
        transparent 
          ? "bg-transparent" 
          : "bg-background/95 backdrop-blur-lg border-b border-border",
        className
      )}
    >
      <div className="flex items-center justify-between px-4 h-14">
        {/* 左侧：返回按钮 */}
        <div className="flex items-center gap-2 min-w-[60px]">
          {showBack && (
            <button 
              onClick={handleBack}
              className={cn(
                "p-2 -ml-2 rounded-full transition-colors",
                transparent 
                  ? "bg-black/20 backdrop-blur-sm hover:bg-black/30" 
                  : "hover:bg-secondary"
              )}
            >
              <ArrowLeft className={cn("w-5 h-5", transparent ? "text-white" : "text-foreground")} />
            </button>
          )}
        </div>

        {/* 中间：标题 */}
        {title && (
          <h1 className={cn(
            "font-semibold text-base truncate max-w-[200px]",
            transparent ? "text-white" : "text-foreground"
          )}>
            {title}
          </h1>
        )}

        {/* 右侧：操作按钮 */}
        <div className="flex items-center gap-2 min-w-[60px] justify-end">
          {rightSlot}
          
          {showShare && (
            <button 
              onClick={onShare}
              className={cn(
                "p-2 rounded-full transition-colors",
                transparent 
                  ? "bg-black/20 backdrop-blur-sm hover:bg-black/30" 
                  : "hover:bg-secondary"
              )}
            >
              <Share2 className={cn("w-5 h-5", transparent ? "text-white" : "text-foreground")} />
            </button>
          )}
          
          {showMore && (
            <button 
              onClick={onMore}
              className={cn(
                "p-2 rounded-full transition-colors",
                transparent 
                  ? "bg-black/20 backdrop-blur-sm hover:bg-black/30" 
                  : "hover:bg-secondary"
              )}
            >
              <MoreHorizontal className={cn("w-5 h-5", transparent ? "text-white" : "text-foreground")} />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

// 简化版返回按钮，用于详情页顶部悬浮
export function BackButton({ 
  backHref,
  transparent = true,
  className,
}: { 
  backHref?: string
  transparent?: boolean
  className?: string 
}) {
  const router = useRouter()

  const handleBack = () => {
    if (backHref) {
      router.push(backHref)
    } else {
      router.back()
    }
  }

  return (
    <button 
      onClick={handleBack}
      className={cn(
        "p-2 rounded-full transition-colors",
        transparent 
          ? "bg-black/30 backdrop-blur-sm hover:bg-black/40" 
          : "bg-secondary hover:bg-secondary/80",
        className
      )}
    >
      <ArrowLeft className={cn("w-5 h-5", transparent ? "text-white" : "text-foreground")} />
    </button>
  )
}
