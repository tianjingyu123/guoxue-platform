"use client"

import { useState, useEffect, useCallback } from "react"
import { X, ChevronRight, MessageCircle, Sparkles, BookOpen, Users, Compass } from "lucide-react"
import { cn } from "@/lib/utils"

interface GuideStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  // 高亮区域位置（相对于视口）
  highlightPosition?: {
    top: number
    left: number
    width: number
    height: number
    borderRadius?: number
  }
  // 引导卡片位置
  cardPosition?: "top" | "bottom" | "left" | "right"
}

interface FeatureGuideProps {
  isOpen: boolean
  onClose: () => void
  steps?: GuideStep[]
  version?: string
}

// 默认引导步骤
const defaultSteps: GuideStep[] = [
  {
    id: "qa",
    title: "圈子付费问答上线",
    description: "向圈主或嘉宾发起付费提问，获取专业解答",
    icon: <MessageCircle className="w-8 h-8 text-primary" />,
    highlightPosition: { top: 400, left: 20, width: 150, height: 60, borderRadius: 12 },
    cardPosition: "bottom"
  },
  {
    id: "ai-reader",
    title: "AI古籍智慧阅读",
    description: "一键文白翻译、智能查词、人物关系图谱",
    icon: <BookOpen className="w-8 h-8 text-accent" />,
    highlightPosition: { top: 300, left: 100, width: 200, height: 80, borderRadius: 16 },
    cardPosition: "bottom"
  },
  {
    id: "ai-search",
    title: "AI智能搜索",
    description: "用自然语言提问，AI为你解答国学疑惑",
    icon: <Sparkles className="w-8 h-8 text-accent" />,
    highlightPosition: { top: 56, left: 280, width: 44, height: 44, borderRadius: 22 },
    cardPosition: "bottom"
  },
  {
    id: "expert-call",
    title: "连麦咨询功能",
    description: "与讲师音视频连麦，实时答疑解惑",
    icon: <Users className="w-8 h-8 text-primary" />,
    highlightPosition: { top: 500, left: 150, width: 100, height: 50, borderRadius: 25 },
    cardPosition: "top"
  },
  {
    id: "paipan",
    title: "排盘工具升级",
    description: "新增紫微斗数排盘，AI智能解读命盘",
    icon: <Compass className="w-8 h-8 text-primary" />,
    highlightPosition: { top: 600, left: 120, width: 140, height: 56, borderRadius: 28 },
    cardPosition: "top"
  }
]

export function FeatureGuide({ 
  isOpen, 
  onClose, 
  steps = defaultSteps,
  version = "2.1.0"
}: FeatureGuideProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  const currentGuide = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1

  // 下一步
  const handleNext = useCallback(() => {
    if (isLastStep) {
      onClose()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }, [isLastStep, onClose])

  // 上一步
  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  // 触摸滑动处理
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const minSwipeDistance = 50

    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) {
        handleNext()
      } else {
        handlePrev()
      }
    }
  }

  // 键盘操作
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === "ArrowRight" || e.key === "Enter") handleNext()
      if (e.key === "ArrowLeft") handlePrev()
      if (e.key === "Escape") onClose()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, handleNext, handlePrev, onClose])

  // 重置步骤
  useEffect(() => {
    if (isOpen) setCurrentStep(0)
  }, [isOpen])

  if (!isOpen) return null

  const highlight = currentGuide.highlightPosition

  return (
    <div 
      className="fixed inset-0 z-[100] overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 半透明蒙层（带镂空） */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <mask id="spotlight-mask">
            {/* 白色背景 = 可见 */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* 黑色区域 = 镂空 */}
            {highlight && (
              <rect
                x={highlight.left - 4}
                y={highlight.top - 4}
                width={highlight.width + 8}
                height={highlight.height + 8}
                rx={highlight.borderRadius || 8}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect 
          x="0" 
          y="0" 
          width="100%" 
          height="100%" 
          fill="rgba(0, 0, 0, 0.75)" 
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* 高亮边框动画 */}
      {highlight && (
        <div
          className="absolute border-2 border-primary animate-pulse pointer-events-none"
          style={{
            top: highlight.top - 4,
            left: highlight.left - 4,
            width: highlight.width + 8,
            height: highlight.height + 8,
            borderRadius: highlight.borderRadius || 8,
            boxShadow: "0 0 20px rgba(198, 68, 60, 0.5)"
          }}
        />
      )}

      {/* 关闭按钮 */}
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10 safe-area-pt"
      >
        <X className="w-5 h-5 text-white" />
      </button>

      {/* 版本标识 */}
      <div className="absolute top-4 left-4 px-3 py-1 bg-primary/80 rounded-full safe-area-pt">
        <span className="text-xs font-medium text-white">V{version} 新功能</span>
      </div>

      {/* 引导卡片 */}
      <div 
        className={cn(
          "absolute left-4 right-4 max-w-sm mx-auto",
          currentGuide.cardPosition === "top" && highlight
            ? "bottom-auto"
            : "top-1/2 -translate-y-1/2",
        )}
        style={
          currentGuide.cardPosition === "top" && highlight
            ? { top: highlight.top - 180 }
            : currentGuide.cardPosition === "bottom" && highlight
              ? { top: highlight.top + highlight.height + 24, transform: "none" }
              : {}
        }
      >
        <div className="bg-card rounded-2xl p-6 shadow-2xl border border-border animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* 图标 */}
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 mx-auto">
            {currentGuide.icon}
          </div>

          {/* 标题 */}
          <h3 className="text-lg font-bold text-foreground text-center mb-2">
            {currentGuide.title}
          </h3>

          {/* 描述 */}
          <p className="text-sm text-muted-foreground text-center leading-relaxed mb-6">
            {currentGuide.description}
          </p>

          {/* 步骤指示器 */}
          <div className="flex items-center justify-center gap-2 mb-4">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  index === currentStep 
                    ? "w-6 bg-primary" 
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
              />
            ))}
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              跳过
            </button>
            <button
              onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-1 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
            >
              {isLastStep ? "知道了" : "下一步"}
              {!isLastStep && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>

          {/* 步骤计数 */}
          <p className="text-xs text-muted-foreground/60 text-center mt-3">
            {currentStep + 1} / {steps.length}
          </p>
        </div>
      </div>

      {/* 指向箭头（连接卡片和高亮区域） */}
      {highlight && (
        <div 
          className="absolute w-0 h-0 border-8 border-transparent"
          style={
            currentGuide.cardPosition === "bottom"
              ? {
                  top: highlight.top + highlight.height + 8,
                  left: highlight.left + highlight.width / 2 - 8,
                  borderBottomColor: "hsl(var(--card))"
                }
              : {
                  top: highlight.top - 16,
                  left: highlight.left + highlight.width / 2 - 8,
                  borderTopColor: "hsl(var(--card))"
                }
          }
        />
      )}
    </div>
  )
}

// Hook: 管理引导状态
export function useFeatureGuide(version: string = "2.1.0") {
  const [isOpen, setIsOpen] = useState(false)
  const storageKey = `feature-guide-${version}`

  useEffect(() => {
    // 检查是否已经展示过
    const hasShown = localStorage.getItem(storageKey)
    if (!hasShown) {
      // 延迟展示，让页面先加载完成
      const timer = setTimeout(() => setIsOpen(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [storageKey])

  const close = useCallback(() => {
    setIsOpen(false)
    localStorage.setItem(storageKey, "true")
  }, [storageKey])

  const open = useCallback(() => {
    setIsOpen(true)
  }, [])

  const reset = useCallback(() => {
    localStorage.removeItem(storageKey)
  }, [storageKey])

  return { isOpen, open, close, reset }
}

// 导出预设引导步骤配置
export const presetGuideSteps = {
  default: defaultSteps,
  // 可根据需要添加更多预设
}
