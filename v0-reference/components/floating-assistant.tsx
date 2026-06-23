"use client"

import { useState, useEffect } from "react"
import { ArrowUp } from "lucide-react"
import { cn } from "@/lib/utils"

// FloatingAssistant 仅保留「回到顶部」按钮
// 智能客服入口已移至 AppHeader 右侧（固定可见，不遮挡内容）
export function FloatingAssistant() {
  const [showBackTop, setShowBackTop] = useState(false)
  
  useEffect(() => {
    const handleScroll = () => {
      setShowBackTop(window.scrollY > 1800)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])
  
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  if (!showBackTop) return null

  return (
    <button
      onClick={scrollToTop}
      className={cn(
        "fixed right-[14px] bottom-[72px] z-40",
        "w-[40px] h-[40px] rounded-full bg-[var(--surface)]/95 backdrop-blur-sm",
        "flex items-center justify-center",
        "shadow-[0_2px_10px_rgba(0,0,0,0.10)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.15)]",
        "border border-[var(--line)]",
        "transition-all duration-200 hover:scale-105 animate-fade-in"
      )}
      aria-label="回到顶部"
    >
      <ArrowUp className="w-4 h-4 text-[var(--text-soft)]" aria-hidden="true" />
    </button>
  )
}
