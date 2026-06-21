"use client"

import { cn } from "@/lib/utils"

interface TaijiLoaderProps {
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
  text?: string
  showText?: boolean
}

const sizeConfig = {
  sm: { container: "w-6 h-6", text: "text-xs" },
  md: { container: "w-10 h-10", text: "text-sm" },
  lg: { container: "w-16 h-16", text: "text-base" },
  xl: { container: "w-24 h-24", text: "text-lg" },
}

export function TaijiLoader({ 
  size = "md", 
  className,
  text = "加载中",
  showText = true,
}: TaijiLoaderProps) {
  const config = sizeConfig[size]
  
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      {/* 太极图 */}
      <div className={cn("relative animate-spin", config.container)} style={{ animationDuration: "2s" }}>
        {/* 外圈 */}
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* 白色半圆（阳） */}
          <path
            d="M50,0 A50,50 0 0,1 50,100 A25,25 0 0,1 50,50 A25,25 0 0,0 50,0"
            fill="currentColor"
            className="text-foreground/90"
          />
          {/* 黑色半圆（阴） */}
          <path
            d="M50,0 A50,50 0 0,0 50,100 A25,25 0 0,0 50,50 A25,25 0 0,1 50,0"
            fill="currentColor"
            className="text-muted/50"
          />
          {/* 阳中阴点 */}
          <circle cx="50" cy="25" r="6" fill="currentColor" className="text-muted/50" />
          {/* 阴中阳点 */}
          <circle cx="50" cy="75" r="6" fill="currentColor" className="text-foreground/90" />
        </svg>
      </div>
      
      {/* 加载文字 */}
      {showText && (
        <span className={cn("text-muted-foreground font-medium", config.text)}>
          {text}
        </span>
      )}
    </div>
  )
}

// 页面级加载
export function PageLoader({ text = "正在加载..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <TaijiLoader size="lg" text={text} />
    </div>
  )
}

// 内联加载（按钮/卡片内）
export function InlineLoader({ className }: { className?: string }) {
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <TaijiLoader size="sm" showText={false} />
      <span className="text-sm text-muted-foreground">加载中...</span>
    </div>
  )
}

// 覆盖层加载
export function OverlayLoader({ 
  text = "请稍候...",
  visible = true,
}: { 
  text?: string
  visible?: boolean
}) {
  if (!visible) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-card shadow-xl border">
        <TaijiLoader size="lg" showText={false} />
        <span className="text-foreground font-medium">{text}</span>
      </div>
    </div>
  )
}

// 骨架屏配套的加载提示
export function SkeletonHint({ text = "内容加载中..." }: { text?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <TaijiLoader size="sm" showText={false} />
      <span className="text-xs text-muted-foreground">{text}</span>
    </div>
  )
}
