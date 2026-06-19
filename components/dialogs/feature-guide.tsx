"use client"

import { useState, useEffect, useCallback, createContext, useContext, useRef } from "react"
import { cn } from "@/lib/utils"
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

// ========== 类型定义 ==========

// 引导步骤
export interface GuideStep {
  // 目标元素选择器
  target?: string
  // 标题
  title: string
  // 描述
  description: string
  // 高亮位置（如果没有target）
  position?: {
    top: number
    left: number
    width: number
    height: number
  }
  // 提示框位置
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  // 自定义内容
  content?: React.ReactNode
  // 图片
  image?: string
}

// 引导配置
export interface GuideConfig {
  // 引导ID（用于存储状态）
  id: string
  // 引导名称
  name?: string
  // 步骤列表
  steps: GuideStep[]
  // 是否可跳过
  skippable?: boolean
  // 完成回调
  onComplete?: () => void
  // 跳过回调
  onSkip?: () => void
}

// ========== 存储工具 ==========

const GUIDE_STORAGE_KEY = 'rebo_guide_completed'

function getCompletedGuides(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem(GUIDE_STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function markGuideCompleted(guideId: string): void {
  if (typeof window === 'undefined') return
  try {
    const completed = getCompletedGuides()
    if (!completed.includes(guideId)) {
      completed.push(guideId)
      localStorage.setItem(GUIDE_STORAGE_KEY, JSON.stringify(completed))
    }
  } catch {
    // ignore
  }
}

function isGuideCompleted(guideId: string): boolean {
  return getCompletedGuides().includes(guideId)
}

function resetGuide(guideId: string): void {
  if (typeof window === 'undefined') return
  try {
    const completed = getCompletedGuides().filter(id => id !== guideId)
    localStorage.setItem(GUIDE_STORAGE_KEY, JSON.stringify(completed))
  } catch {
    // ignore
  }
}

function resetAllGuides(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(GUIDE_STORAGE_KEY)
  } catch {
    // ignore
  }
}

// ========== 高亮遮罩组件 ==========

interface HighlightMaskProps {
  targetRect?: DOMRect | null
  padding?: number
  borderRadius?: number
}

function HighlightMask({ targetRect, padding = 8, borderRadius = 8 }: HighlightMaskProps) {
  if (!targetRect) {
    return <div className="fixed inset-0 bg-black/60 z-[9998]" />
  }

  const left = targetRect.left - padding
  const top = targetRect.top - padding
  const width = targetRect.width + padding * 2
  const height = targetRect.height + padding * 2

  return (
    <svg className="fixed inset-0 w-full h-full z-[9998]" style={{ pointerEvents: 'none' }}>
      <defs>
        <mask id="highlight-mask">
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          <rect
            x={left}
            y={top}
            width={width}
            height={height}
            rx={borderRadius}
            fill="black"
          />
        </mask>
      </defs>
      <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        fill="rgba(0, 0, 0, 0.6)"
        mask="url(#highlight-mask)"
      />
      {/* 高亮边框 */}
      <rect
        x={left}
        y={top}
        width={width}
        height={height}
        rx={borderRadius}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2"
        className="animate-pulse"
      />
    </svg>
  )
}

// ========== 提示框组件 ==========

interface TooltipBoxProps {
  step: GuideStep
  currentStep: number
  totalSteps: number
  targetRect?: DOMRect | null
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
  onComplete: () => void
  skippable?: boolean
}

function TooltipBox({
  step,
  currentStep,
  totalSteps,
  targetRect,
  onNext,
  onPrev,
  onSkip,
  onComplete,
  skippable = true,
}: TooltipBoxProps) {
  const isLastStep = currentStep === totalSteps - 1
  const isFirstStep = currentStep === 0
  const placement = step.placement || 'bottom'

  // 计算提示框位置
  const getPosition = () => {
    if (!targetRect || placement === 'center') {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }
    }

    const padding = 16
    const tooltipWidth = 320
    const tooltipHeight = 200

    switch (placement) {
      case 'top':
        return {
          bottom: `${window.innerHeight - targetRect.top + padding}px`,
          left: `${Math.max(padding, Math.min(targetRect.left + targetRect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - padding))}px`,
        }
      case 'bottom':
        return {
          top: `${targetRect.bottom + padding}px`,
          left: `${Math.max(padding, Math.min(targetRect.left + targetRect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - padding))}px`,
        }
      case 'left':
        return {
          top: `${Math.max(padding, targetRect.top + targetRect.height / 2 - tooltipHeight / 2)}px`,
          right: `${window.innerWidth - targetRect.left + padding}px`,
        }
      case 'right':
        return {
          top: `${Math.max(padding, targetRect.top + targetRect.height / 2 - tooltipHeight / 2)}px`,
          left: `${targetRect.right + padding}px`,
        }
      default:
        return {
          top: `${targetRect.bottom + padding}px`,
          left: `${targetRect.left}px`,
        }
    }
  }

  const positionStyle = getPosition()

  return (
    <div
      className="fixed z-[9999] w-[320px] max-w-[calc(100vw-32px)] bg-background rounded-xl shadow-2xl border animate-in fade-in zoom-in-95 duration-200"
      style={positionStyle}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            {currentStep + 1} / {totalSteps}
          </span>
        </div>
        {skippable && (
          <button
            onClick={onSkip}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 内容 */}
      <div className="p-4">
        {step.image && (
          <div className="mb-3 rounded-lg overflow-hidden bg-secondary">
            <img src={step.image} alt="" className="w-full h-32 object-cover" />
          </div>
        )}
        <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {step.description}
        </p>
        {step.content && (
          <div className="mt-3">{step.content}</div>
        )}
      </div>

      {/* 步骤指示器 */}
      <div className="flex justify-center gap-1.5 pb-3">
        {Array.from({ length: totalSteps }).map((_, idx) => (
          <div
            key={idx}
            className={cn(
              "w-2 h-2 rounded-full transition-colors",
              idx === currentStep ? "bg-primary" : "bg-muted"
            )}
          />
        ))}
      </div>

      {/* 底部按钮 */}
      <div className="flex items-center justify-between p-4 pt-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrev}
          disabled={isFirstStep}
          className={cn(isFirstStep && "invisible")}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          上一步
        </Button>

        {isLastStep ? (
          <Button size="sm" onClick={onComplete} className="px-6">
            知道了
          </Button>
        ) : (
          <Button size="sm" onClick={onNext}>
            下一步
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  )
}

// ========== 主组件 ==========

interface FeatureGuideProps {
  config: GuideConfig
  open?: boolean
  onOpenChange?: (open: boolean) => void
  // 是否检查已完成状态（默认true）
  checkCompleted?: boolean
}

export function FeatureGuide({
  config,
  open: controlledOpen,
  onOpenChange,
  checkCompleted = true,
}: FeatureGuideProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : internalOpen

  const setOpen = useCallback((value: boolean) => {
    if (isControlled) {
      onOpenChange?.(value)
    } else {
      setInternalOpen(value)
    }
  }, [isControlled, onOpenChange])

  // 检查是否已完成
  useEffect(() => {
    if (checkCompleted && isGuideCompleted(config.id)) {
      setOpen(false)
    }
  }, [config.id, checkCompleted, setOpen])

  // 获取目标元素位置
  useEffect(() => {
    if (!isOpen) return

    const step = config.steps[currentStep]
    if (!step) return

    if (step.position) {
      setTargetRect({
        top: step.position.top,
        left: step.position.left,
        width: step.position.width,
        height: step.position.height,
        bottom: step.position.top + step.position.height,
        right: step.position.left + step.position.width,
        x: step.position.left,
        y: step.position.top,
        toJSON: () => ({}),
      } as DOMRect)
      return
    }

    if (step.target) {
      const element = document.querySelector(step.target)
      if (element) {
        const rect = element.getBoundingClientRect()
        setTargetRect(rect)
        // 滚动到目标元素
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else {
        setTargetRect(null)
      }
    } else {
      setTargetRect(null)
    }
  }, [isOpen, currentStep, config.steps])

  // 监听窗口大小变化
  useEffect(() => {
    if (!isOpen) return

    const handleResize = () => {
      const step = config.steps[currentStep]
      if (step?.target) {
        const element = document.querySelector(step.target)
        if (element) {
          setTargetRect(element.getBoundingClientRect())
        }
      }
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleResize)
    }
  }, [isOpen, currentStep, config.steps])

  const handleNext = () => {
    if (currentStep < config.steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleComplete = () => {
    markGuideCompleted(config.id)
    setCurrentStep(0)
    setOpen(false)
    config.onComplete?.()
  }

  const handleSkip = () => {
    markGuideCompleted(config.id)
    setCurrentStep(0)
    setOpen(false)
    config.onSkip?.()
  }

  const handleOverlayClick = () => {
    if (config.skippable !== false) {
      handleSkip()
    }
  }

  if (!isOpen || config.steps.length === 0) return null

  const step = config.steps[currentStep]

  return (
    <>
      {/* 点击遮罩关闭（非高亮区域） */}
      <div
        className="fixed inset-0 z-[9997]"
        onClick={handleOverlayClick}
        style={{ pointerEvents: config.skippable !== false ? 'auto' : 'none' }}
      />

      {/* 高亮遮罩 */}
      <HighlightMask targetRect={targetRect} />

      {/* 提示框 */}
      <TooltipBox
        step={step}
        currentStep={currentStep}
        totalSteps={config.steps.length}
        targetRect={targetRect}
        onNext={handleNext}
        onPrev={handlePrev}
        onSkip={handleSkip}
        onComplete={handleComplete}
        skippable={config.skippable}
      />
    </>
  )
}

// ========== Context Provider ==========

interface GuideContextValue {
  startGuide: (config: GuideConfig) => void
  stopGuide: () => void
  resetGuide: (guideId: string) => void
  resetAllGuides: () => void
  isGuideCompleted: (guideId: string) => boolean
}

const GuideContext = createContext<GuideContextValue | null>(null)

export function GuideProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<GuideConfig | null>(null)
  const [open, setOpen] = useState(false)

  const startGuide = useCallback((guideConfig: GuideConfig) => {
    if (!isGuideCompleted(guideConfig.id)) {
      setConfig(guideConfig)
      setOpen(true)
    }
  }, [])

  const stopGuide = useCallback(() => {
    setOpen(false)
    setConfig(null)
  }, [])

  const handleResetGuide = useCallback((guideId: string) => {
    resetGuide(guideId)
  }, [])

  const handleResetAllGuides = useCallback(() => {
    resetAllGuides()
  }, [])

  const checkGuideCompleted = useCallback((guideId: string) => {
    return isGuideCompleted(guideId)
  }, [])

  return (
    <GuideContext.Provider
      value={{
        startGuide,
        stopGuide,
        resetGuide: handleResetGuide,
        resetAllGuides: handleResetAllGuides,
        isGuideCompleted: checkGuideCompleted,
      }}
    >
      {children}
      {config && (
        <FeatureGuide
          config={config}
          open={open}
          onOpenChange={setOpen}
          checkCompleted={false}
        />
      )}
    </GuideContext.Provider>
  )
}

export function useGuide() {
  const context = useContext(GuideContext)
  if (!context) {
    throw new Error('useGuide must be used within GuideProvider')
  }
  return context
}

// ========== 预定义引导配置 ==========

// 首页引导
export const homeGuideConfig: GuideConfig = {
  id: 'home_guide_v1',
  name: '首页功能引导',
  steps: [
    {
      target: '[data-guide="home-search"]',
      title: '搜索功能',
      description: '点击这里可以搜索课程、讲师、文章等内容，支持语音搜索。',
      placement: 'bottom',
    },
    {
      target: '[data-guide="home-category"]',
      title: '分类导航',
      description: '快速找到您感兴趣的国学类目，包括八字、紫微、风水等。',
      placement: 'bottom',
    },
    {
      target: '[data-guide="home-recommend"]',
      title: '个性化推荐',
      description: '根据您的学习偏好，为您推荐优质课程和内容。',
      placement: 'top',
    },
  ],
  skippable: true,
}

// 排盘工具引导
export const chartGuideConfig: GuideConfig = {
  id: 'chart_guide_v1',
  name: '排盘工具引导',
  steps: [
    {
      target: '[data-guide="chart-input"]',
      title: '输入生辰信息',
      description: '填写出生日期和时辰，系统会自动计算八字命盘。',
      placement: 'bottom',
    },
    {
      target: '[data-guide="chart-result"]',
      title: '查看排盘结果',
      description: '这里显示完整的命盘信息，包括四柱、十神、大运等。',
      placement: 'top',
    },
    {
      target: '[data-guide="chart-analysis"]',
      title: 'AI智能分析',
      description: '点击可获取AI生成的命盘分析报告，更深入了解命理。',
      placement: 'bottom',
    },
  ],
  skippable: true,
}

// 直播间引导
export const liveGuideConfig: GuideConfig = {
  id: 'live_guide_v1',
  name: '直播间功能引导',
  steps: [
    {
      target: '[data-guide="live-chat"]',
      title: '互动聊天',
      description: '在这里可以和老师及其他学员实时交流互动。',
      placement: 'top',
    },
    {
      target: '[data-guide="live-gift"]',
      title: '打赏礼物',
      description: '送出礼物支持老师，还能获得更多互动机会。',
      placement: 'top',
    },
    {
      target: '[data-guide="live-goods"]',
      title: '直播商品',
      description: '老师推荐的课程和商品，直播间专属优惠价。',
      placement: 'left',
    },
  ],
  skippable: true,
}

// ========== 便捷 Hook ==========

export function useFeatureGuide(guideId: string) {
  const { startGuide, resetGuide, isGuideCompleted } = useGuide()
  
  const show = useCallback((config: Omit<GuideConfig, 'id'>) => {
    startGuide({ ...config, id: guideId })
  }, [guideId, startGuide])
  
  const reset = useCallback(() => {
    resetGuide(guideId)
  }, [guideId, resetGuide])
  
  const completed = isGuideCompleted(guideId)
  
  return { show, reset, completed }
}

// 新版本引导 Hook
export function useNewVersionGuide(version: string) {
  const guideId = `new_version_${version}`
  return useFeatureGuide(guideId)
}
