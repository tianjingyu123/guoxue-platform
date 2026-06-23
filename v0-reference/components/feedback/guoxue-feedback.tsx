"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Check, X, AlertTriangle, Loader2 } from "lucide-react"
import { FEEDBACK_COPY } from "@/lib/constants/guoxue-copywriting"

// ===== 国学风格印章成功反馈 =====
interface SealFeedbackProps {
  type: "success" | "error" | "warning"
  message?: string
  visible: boolean
  onClose?: () => void
  duration?: number
}

export function SealFeedback({ 
  type, 
  message, 
  visible, 
  onClose, 
  duration = 2000 
}: SealFeedbackProps) {
  const [show, setShow] = useState(visible)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    if (visible) {
      setShow(true)
      setAnimating(true)
      
      const timer = setTimeout(() => {
        setAnimating(false)
        setTimeout(() => {
          setShow(false)
          onClose?.()
        }, 300)
      }, duration)
      
      return () => clearTimeout(timer)
    }
  }, [visible, duration, onClose])

  if (!show) return null

  const config = {
    success: {
      seal: "准",
      color: "text-primary",
      bg: "bg-primary/10",
      border: "border-primary/30",
      message: message || FEEDBACK_COPY.success.default,
    },
    error: {
      seal: "误",
      color: "text-danger",
      bg: "bg-danger/10",
      border: "border-danger/30",
      message: message || FEEDBACK_COPY.error.default,
    },
    warning: {
      seal: "慎",
      color: "text-warning",
      bg: "bg-warning/10",
      border: "border-warning/30",
      message: message || FEEDBACK_COPY.warning.default,
    },
  }[type]

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm",
      "transition-opacity duration-300",
      animating ? "opacity-100" : "opacity-0"
    )}>
      <div className={cn(
        "flex flex-col items-center gap-4 p-8 rounded-2xl bg-card shadow-2xl",
        "transition-transform duration-300",
        animating ? "scale-100" : "scale-95"
      )}>
        {/* 印章动画 */}
        <div className={cn(
          "relative w-24 h-24 rounded-lg border-4 flex items-center justify-center",
          config.border, config.bg,
          "transform transition-all duration-500",
          animating ? "rotate-0 scale-100" : "rotate-12 scale-75"
        )}>
          {/* 印章外框装饰 */}
          <div className="absolute inset-1 border-2 border-dashed rounded opacity-50" 
            style={{ borderColor: 'currentColor' }} />
          
          {/* 印章文字 */}
          <span className={cn(
            "text-4xl font-bold font-serif",
            config.color
          )}>
            {config.seal}
          </span>
          
          {/* 印泥晕染效果 */}
          <div className={cn(
            "absolute inset-0 rounded-lg opacity-20",
            type === "success" ? "bg-primary" : type === "error" ? "bg-danger" : "bg-warning",
            "animate-pulse"
          )} />
        </div>
        
        {/* 反馈文案 */}
        <p className="text-foreground font-medium text-center">{config.message}</p>
      </div>
    </div>
  )
}

// ===== 国学风格加载动画（太极旋转） =====
interface TaijiLoadingProps {
  message?: string
  size?: "sm" | "md" | "lg"
  className?: string
}

export function TaijiLoading({ 
  message = FEEDBACK_COPY.loading.default, 
  size = "md",
  className 
}: TaijiLoadingProps) {
  const sizeConfig = {
    sm: { container: "w-8 h-8", text: "text-xs" },
    md: { container: "w-12 h-12", text: "text-sm" },
    lg: { container: "w-16 h-16", text: "text-base" },
  }[size]

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      {/* 太极图旋转 */}
      <div className={cn(
        "relative rounded-full animate-spin",
        sizeConfig.container
      )} style={{ animationDuration: "2s" }}>
        {/* 太极阴阳 */}
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* 白色半圆（阳） */}
          <path 
            d="M50,0 A50,50 0 0,1 50,100 A25,25 0 0,1 50,50 A25,25 0 0,0 50,0" 
            fill="currentColor" 
            className="text-foreground"
          />
          {/* 黑色半圆（阴） */}
          <path 
            d="M50,0 A50,50 0 0,0 50,100 A25,25 0 0,0 50,50 A25,25 0 0,1 50,0" 
            fill="currentColor" 
            className="text-muted"
          />
          {/* 阳中阴点 */}
          <circle cx="50" cy="25" r="6" fill="currentColor" className="text-muted" />
          {/* 阴中阳点 */}
          <circle cx="50" cy="75" r="6" fill="currentColor" className="text-foreground" />
        </svg>
      </div>
      
      {/* 加载文案 */}
      {message && (
        <p className={cn("text-muted-foreground font-serif", sizeConfig.text)}>{message}</p>
      )}
    </div>
  )
}

// ===== 简单的圆形加载（带毛笔风格） =====
interface BrushLoadingProps {
  message?: string
  className?: string
}

export function BrushLoading({ message, className }: BrushLoadingProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div className="relative w-10 h-10">
        {/* 外圈 */}
        <div className="absolute inset-0 rounded-full border-2 border-border" />
        {/* 旋转的笔触 */}
        <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        {/* 中心点 */}
        <div className="absolute inset-3 rounded-full bg-primary/20" />
      </div>
      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  )
}

// ===== 全屏加载遮罩 =====
interface FullScreenLoadingProps {
  visible: boolean
  message?: string
  variant?: "taiji" | "brush"
}

export function FullScreenLoading({ 
  visible, 
  message = FEEDBACK_COPY.loading.default,
  variant = "taiji"
}: FullScreenLoadingProps) {
  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      {variant === "taiji" ? (
        <TaijiLoading message={message} size="lg" />
      ) : (
        <BrushLoading message={message} />
      )}
    </div>
  )
}

// ===== Toast风格的轻量反馈 =====
interface GuoxueToastProps {
  type: "success" | "error" | "info" | "warning"
  message: string
  visible: boolean
  onClose?: () => void
}

export function GuoxueToast({ type, message, visible, onClose }: GuoxueToastProps) {
  const [show, setShow] = useState(visible)

  useEffect(() => {
    if (visible) {
      setShow(true)
      const timer = setTimeout(() => {
        setShow(false)
        onClose?.()
      }, 2500)
      return () => clearTimeout(timer)
    }
  }, [visible, onClose])

  if (!show) return null

  const config = {
    success: { icon: Check, color: "text-success", bg: "bg-success/10", border: "border-success/30" },
    error: { icon: X, color: "text-danger", bg: "bg-danger/10", border: "border-danger/30" },
    info: { icon: AlertTriangle, color: "text-info", bg: "bg-info/10", border: "border-info/30" },
    warning: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10", border: "border-warning/30" },
  }[type]

  const Icon = config.icon

  return (
    <div className={cn(
      "fixed top-20 left-1/2 -translate-x-1/2 z-50",
      "flex items-center gap-2 px-4 py-2.5 rounded-full",
      "border shadow-lg backdrop-blur-sm",
      config.bg, config.border,
      "animate-in slide-in-from-top-2 fade-in duration-300"
    )}>
      <Icon className={cn("w-4 h-4", config.color)} />
      <span className="text-sm text-foreground">{message}</span>
    </div>
  )
}

// ===== 仪式感确认弹窗 =====
interface CeremonyConfirmProps {
  visible: boolean
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  type?: "join" | "complete" | "unlock" | "default"
}

export function CeremonyConfirm({
  visible,
  title,
  description,
  confirmText = "确定",
  cancelText = "取消",
  onConfirm,
  onCancel,
  type = "default"
}: CeremonyConfirmProps) {
  if (!visible) return null

  const decorations = {
    join: { symbol: "🏯", motif: "入门礼成" },
    complete: { symbol: "📜", motif: "学业有成" },
    unlock: { symbol: "🔓", motif: "新境界开启" },
    default: { symbol: "📋", motif: "" },
  }[type]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-2xl w-[300px] overflow-hidden">
        {/* 顶部装饰 */}
        <div className="h-20 bg-gradient-to-r from-primary/10 to-gold/10 flex items-center justify-center relative">
          <span className="text-4xl">{decorations.symbol}</span>
          {/* 装饰线 */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        </div>
        
        {/* 内容 */}
        <div className="p-6 text-center">
          <h3 className="text-lg font-semibold text-foreground mb-2 font-serif">{title}</h3>
          <p className="text-sm text-muted-foreground mb-1">{description}</p>
          {decorations.motif && (
            <p className="text-xs text-primary/70 font-serif">「{decorations.motif}」</p>
          )}
        </div>
        
        {/* 按钮 */}
        <div className="flex border-t border-border">
          <button 
            onClick={onCancel}
            className="flex-1 py-3 text-sm text-muted-foreground hover:bg-secondary/50 transition-colors"
          >
            {cancelText}
          </button>
          <div className="w-px bg-border" />
          <button 
            onClick={onConfirm}
            className="flex-1 py-3 text-sm text-primary font-medium hover:bg-primary/5 transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
