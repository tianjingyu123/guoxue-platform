"use client"

import { useState, useRef, useCallback } from "react"
import { Loader2, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface PullRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
  className?: string
  threshold?: number
  maxPull?: number
}

export function PullRefresh({ 
  onRefresh, 
  children, 
  className,
  threshold = 60,
  maxPull = 100,
}: PullRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [status, setStatus] = useState<"idle" | "pulling" | "ready" | "refreshing">("idle")
  
  const startY = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isRefreshing) return
    if (containerRef.current && containerRef.current.scrollTop > 0) return
    startY.current = e.touches[0].clientY
  }, [isRefreshing])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isRefreshing) return
    if (containerRef.current && containerRef.current.scrollTop > 0) return
    
    const currentY = e.touches[0].clientY
    const distance = currentY - startY.current

    if (distance > 0) {
      e.preventDefault()
      const dampedDistance = Math.min(distance * 0.5, maxPull)
      setPullDistance(dampedDistance)
      setStatus(dampedDistance >= threshold ? "ready" : "pulling")
    }
  }, [isRefreshing, threshold, maxPull])

  const handleTouchEnd = useCallback(async () => {
    if (isRefreshing) return

    if (pullDistance >= threshold) {
      setStatus("refreshing")
      setIsRefreshing(true)
      setPullDistance(50)

      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
        setStatus("idle")
      }
    } else {
      setPullDistance(0)
      setStatus("idle")
    }
  }, [pullDistance, threshold, isRefreshing, onRefresh])

  const getStatusText = () => {
    switch (status) {
      case "pulling":
        return "下拉刷新"
      case "ready":
        return "释放立即刷新"
      case "refreshing":
        return "正在刷新..."
      default:
        return ""
    }
  }

  const progress = Math.min(pullDistance / threshold, 1)
  const rotation = progress * 180

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-auto", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 下拉指示器 */}
      <div
        className="absolute left-0 right-0 flex flex-col items-center justify-end overflow-hidden transition-all duration-200"
        style={{ 
          height: pullDistance,
          top: 0,
        }}
      >
        <div className="flex flex-col items-center pb-3">
          {status === "refreshing" ? (
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          ) : (
            <ArrowDown 
              className={cn(
                "w-6 h-6 text-primary transition-transform duration-200",
                status === "ready" && "text-green-500"
              )}
              style={{ transform: `rotate(${rotation}deg)` }}
            />
          )}
          <span className={cn(
            "text-xs mt-1 transition-colors",
            status === "ready" ? "text-green-500" : "text-muted-foreground"
          )}>
            {getStatusText()}
          </span>
        </div>
      </div>

      {/* 内容区域 */}
      <div
        className="transition-transform duration-200"
        style={{ transform: `translateY(${pullDistance}px)` }}
      >
        {children}
      </div>
    </div>
  )
}
