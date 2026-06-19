"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface BackButtonProps {
  /** 自定义返回路径，不传则使用 router.back() */
  fallbackPath?: string
  /** 自定义样式类名 */
  className?: string
  /** 图标样式类名 */
  iconClassName?: string
  /** 是否显示为圆形半透明按钮（用于覆盖图片） */
  overlay?: boolean
}

/**
 * 统一的返回按钮组件
 * - 默认使用 router.back() 返回上一页
 * - 支持 fallbackPath 指定兜底跳转路径
 * - 支持 overlay 模式用于覆盖在图片上
 */
export function BackButton({ 
  fallbackPath, 
  className, 
  iconClassName,
  overlay = false 
}: BackButtonProps) {
  const router = useRouter()

  const handleBack = () => {
    // 检查是否有历史记录
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
    } else if (fallbackPath) {
      router.push(fallbackPath)
    } else {
      router.push("/")
    }
  }

  return (
    <button
      onClick={handleBack}
      className={cn(
        "flex items-center justify-center transition-colors",
        overlay 
          ? "p-2 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/40"
          : "p-2 -ml-2 rounded-full hover:bg-secondary",
        className
      )}
      aria-label="返回"
    >
      <ArrowLeft className={cn(
        "w-5 h-5",
        overlay ? "text-white" : "text-foreground",
        iconClassName
      )} />
    </button>
  )
}
