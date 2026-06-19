"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { X, Check, RefreshCw, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

interface CaptchaModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  title?: string
}

// 生成随机拼图位置
function generatePuzzlePosition() {
  // 拼图块位置（在图片右侧2/3区域随机）
  const x = 120 + Math.random() * 80 // 120-200
  const y = 20 + Math.random() * 40 // 20-60
  return { x, y }
}

export function CaptchaModal({ isOpen, onClose, onSuccess, title = "请完成安全验证" }: CaptchaModalProps) {
  const [sliderValue, setSliderValue] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [puzzlePos, setPuzzlePos] = useState({ x: 160, y: 40 })
  const [isLoading, setIsLoading] = useState(false)
  const sliderRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // 拼图块大小
  const puzzleSize = 44
  // 允许的误差范围
  const tolerance = 5

  useEffect(() => {
    if (isOpen) {
      setPuzzlePos(generatePuzzlePosition())
      setSliderValue(0)
      setStatus("idle")
    }
  }, [isOpen])

  const handleRefresh = () => {
    setPuzzlePos(generatePuzzlePosition())
    setSliderValue(0)
    setStatus("idle")
  }

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (status !== "idle") return
    setIsDragging(true)
  }

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging || !containerRef.current) return
    
    const container = containerRef.current.getBoundingClientRect()
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    const x = clientX - container.left - 20
    const maxX = container.width - 40
    const newValue = Math.max(0, Math.min(maxX, x))
    setSliderValue(newValue)
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false)
    
    // 验证是否拼合成功
    const targetX = puzzlePos.x - 10 // 拼图块起始位置偏移
    const currentX = sliderValue
    
    if (Math.abs(currentX - targetX) <= tolerance) {
      // 验证成功
      setStatus("success")
      setIsLoading(true)
      setTimeout(() => {
        onSuccess()
        setIsLoading(false)
      }, 800)
    } else {
      // 验证失败
      setStatus("error")
      setTimeout(() => {
        setSliderValue(0)
        setStatus("idle")
      }, 1000)
    }
  }, [isDragging, puzzlePos.x, sliderValue, tolerance, onSuccess])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
      window.addEventListener("touchmove", handleMouseMove)
      window.addEventListener("touchend", handleMouseUp)
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
      window.removeEventListener("touchmove", handleMouseMove)
      window.removeEventListener("touchend", handleMouseUp)
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="w-full max-w-lg bg-card rounded-t-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <span className="font-medium text-foreground">{title}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-secondary transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* 拼图区域 */}
        <div className="p-4">
          <div 
            ref={containerRef}
            className="relative w-full h-36 rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 via-accent/10 to-secondary"
          >
            {/* 背景图案 */}
            <div className="absolute inset-0">
              <svg className="w-full h-full opacity-20" viewBox="0 0 300 150">
                <pattern id="captcha-pattern" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
                  <circle cx="15" cy="15" r="2" fill="currentColor" className="text-foreground" />
                </pattern>
                <rect width="300" height="150" fill="url(#captcha-pattern)" />
              </svg>
            </div>

            {/* 太极装饰 */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30">
              <svg width="80" height="80" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="2" className="text-foreground" />
                <path d="M50 2 A48 48 0 0 1 50 98 A24 24 0 0 1 50 50 A24 24 0 0 0 50 2" fill="currentColor" className="text-foreground" />
                <circle cx="50" cy="26" r="6" fill="currentColor" className="text-background" />
                <circle cx="50" cy="74" r="6" fill="currentColor" className="text-foreground" />
              </svg>
            </div>

            {/* 拼图缺口 */}
            <div 
              className="absolute bg-black/30 backdrop-blur-sm rounded-lg border-2 border-dashed border-white/30"
              style={{
                left: puzzlePos.x,
                top: puzzlePos.y,
                width: puzzleSize,
                height: puzzleSize,
              }}
            />

            {/* 拼图块（跟随滑块移动） */}
            <div 
              className={cn(
                "absolute rounded-lg shadow-lg transition-colors",
                status === "success" 
                  ? "bg-green-500/80 border-2 border-green-400" 
                  : status === "error"
                  ? "bg-red-500/80 border-2 border-red-400"
                  : "bg-primary/80 border-2 border-primary"
              )}
              style={{
                left: 10 + sliderValue,
                top: puzzlePos.y,
                width: puzzleSize,
                height: puzzleSize,
              }}
            >
              {status === "success" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Check className="w-6 h-6 text-white" />
                </div>
              )}
            </div>

            {/* 刷新按钮 */}
            <button
              onClick={handleRefresh}
              disabled={status === "success"}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/30 hover:bg-black/50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* 滑块轨道 */}
          <div className="mt-4">
            <div 
              className={cn(
                "relative h-11 rounded-full overflow-hidden transition-colors",
                status === "success" 
                  ? "bg-green-500/20" 
                  : status === "error"
                  ? "bg-red-500/20"
                  : "bg-secondary"
              )}
            >
              {/* 已滑动区域 */}
              <div 
                className={cn(
                  "absolute inset-y-0 left-0 transition-colors",
                  status === "success" 
                    ? "bg-green-500/30" 
                    : status === "error"
                    ? "bg-red-500/30"
                    : "bg-primary/20"
                )}
                style={{ width: sliderValue + 20 }}
              />

              {/* 提示文字 */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className={cn(
                  "text-sm transition-opacity",
                  sliderValue > 30 ? "opacity-0" : "opacity-100",
                  status === "success" ? "text-green-600" : status === "error" ? "text-red-600" : "text-muted-foreground"
                )}>
                  {status === "success" ? "验证成功" : status === "error" ? "验证失败，请重试" : "按住滑块，拖动完成拼图"}
                </span>
              </div>

              {/* 滑块按钮 */}
              <div
                ref={sliderRef}
                className={cn(
                  "absolute top-1 bottom-1 w-12 rounded-full cursor-grab active:cursor-grabbing flex items-center justify-center shadow-md transition-colors",
                  status === "success" 
                    ? "bg-green-500" 
                    : status === "error"
                    ? "bg-red-500"
                    : "bg-white",
                  isDragging && "scale-105"
                )}
                style={{ left: sliderValue + 4 }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleMouseDown}
              >
                {status === "success" ? (
                  <Check className="w-5 h-5 text-white" />
                ) : status === "error" ? (
                  <X className="w-5 h-5 text-white" />
                ) : (
                  <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                    <path d="M15 18l6-6-6-6" opacity="0.5" />
                  </svg>
                )}
              </div>
            </div>
          </div>

          {/* 安全提示 */}
          <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>安全验证由腾讯云提供技术支持</span>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="px-4 pb-4 safe-area-pb">
          <button
            onClick={onClose}
            className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  )
}

// Hook for easy usage
export function useCaptcha() {
  const [isOpen, setIsOpen] = useState(false)
  const [onSuccessCallback, setOnSuccessCallback] = useState<(() => void) | null>(null)

  const verify = (onSuccess: () => void) => {
    setOnSuccessCallback(() => onSuccess)
    setIsOpen(true)
  }

  const CaptchaComponent = () => (
    <CaptchaModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onSuccess={() => {
        setIsOpen(false)
        onSuccessCallback?.()
      }}
    />
  )

  return { verify, CaptchaComponent }
}
