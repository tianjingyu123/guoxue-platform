"use client"

import { useState, useCallback, createContext, useContext, useRef, useEffect } from "react"
import { CheckCircle, XCircle, AlertTriangle, Info, RefreshCw, ArrowLeft, Home, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

// ========== 类型定义 ==========

export type FeedbackType = 'success' | 'error' | 'warning' | 'info'

export interface FeedbackAction {
  label: string
  onClick?: () => void
  href?: string
  variant?: 'default' | 'outline' | 'ghost'
  icon?: React.ReactNode
}

export interface FeedbackConfig {
  type: FeedbackType
  title: string
  description?: string
  // 操作按钮
  primaryAction?: FeedbackAction
  secondaryAction?: FeedbackAction
  // 是否显示返回首页
  showHomeButton?: boolean
  // 是否显示返回按钮
  showBackButton?: boolean
  // 重试回调（仅 error 类型）
  onRetry?: () => void
  // 自动关闭时间（毫秒，0 表示不自动关闭）
  autoCloseDelay?: number
  // 关闭回调
  onClose?: () => void
}

// ========== 样式配置 ==========

const feedbackStyles: Record<FeedbackType, {
  icon: React.ElementType
  iconColor: string
  bgColor: string
  ringColor: string
}> = {
  success: {
    icon: CheckCircle,
    iconColor: 'text-green-500',
    bgColor: 'bg-green-50',
    ringColor: 'ring-green-200',
  },
  error: {
    icon: XCircle,
    iconColor: 'text-red-500',
    bgColor: 'bg-red-50',
    ringColor: 'ring-red-200',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    bgColor: 'bg-amber-50',
    ringColor: 'ring-amber-200',
  },
  info: {
    icon: Info,
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-50',
    ringColor: 'ring-blue-200',
  },
}

// ========== 图标动画组件 ==========

function AnimatedIcon({ type }: { type: FeedbackType }) {
  const style = feedbackStyles[type]
  const Icon = style.icon

  return (
    <div className="relative">
      {/* 背景圆环动画 */}
      <div 
        className={cn(
          "absolute inset-0 rounded-full ring-4 animate-ping opacity-30",
          style.ringColor
        )}
        style={{ animationDuration: '1.5s', animationIterationCount: '1' }}
      />
      
      {/* 图标容器 */}
      <div 
        className={cn(
          "relative w-24 h-24 rounded-full flex items-center justify-center",
          style.bgColor,
          "animate-in zoom-in-50 duration-500"
        )}
      >
        <Icon 
          className={cn(
            "w-12 h-12",
            style.iconColor,
            "animate-in zoom-in-0 duration-700 delay-200"
          )} 
          strokeWidth={1.5}
        />
        
        {/* 成功时的对勾动画效果 */}
        {type === 'success' && (
          <svg
            className="absolute inset-0 w-24 h-24"
            viewBox="0 0 96 96"
          >
            <circle
              cx="48"
              cy="48"
              r="44"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-green-200"
              strokeDasharray="276.46"
              strokeDashoffset="0"
              style={{
                animation: 'circle-draw 0.6s ease-out forwards',
              }}
            />
          </svg>
        )}
        
        {/* 失败时的叉号动画效果 */}
        {type === 'error' && (
          <svg
            className="absolute inset-0 w-24 h-24"
            viewBox="0 0 96 96"
          >
            <circle
              cx="48"
              cy="48"
              r="44"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-red-200"
              strokeDasharray="276.46"
              strokeDashoffset="0"
              style={{
                animation: 'circle-draw 0.6s ease-out forwards',
              }}
            />
          </svg>
        )}
      </div>
      
      <style jsx>{`
        @keyframes circle-draw {
          from {
            stroke-dashoffset: 276.46;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  )
}

// ========== 全局状态反馈组件 ==========

interface GlobalStatusFeedbackProps {
  config: FeedbackConfig
  onClose?: () => void
  visible?: boolean
}

export function GlobalStatusFeedback({ 
  config, 
  onClose,
  visible = true 
}: GlobalStatusFeedbackProps) {
  const router = useRouter()
  const [isClosing, setIsClosing] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const handleClose = useCallback(() => {
    setIsClosing(true)
    setTimeout(() => {
      onClose?.()
      config.onClose?.()
    }, 300)
  }, [onClose, config])

  // 自动关闭
  useEffect(() => {
    if (config.autoCloseDelay && config.autoCloseDelay > 0) {
      timerRef.current = setTimeout(handleClose, config.autoCloseDelay)
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [config.autoCloseDelay, handleClose])

  const handlePrimaryAction = () => {
    if (config.primaryAction?.onClick) {
      config.primaryAction.onClick()
    } else if (config.primaryAction?.href) {
      router.push(config.primaryAction.href)
    }
    handleClose()
  }

  const handleSecondaryAction = () => {
    if (config.secondaryAction?.onClick) {
      config.secondaryAction.onClick()
    } else if (config.secondaryAction?.href) {
      router.push(config.secondaryAction.href)
    }
    handleClose()
  }

  const handleRetry = () => {
    config.onRetry?.()
    handleClose()
  }

  const handleBack = () => {
    router.back()
    handleClose()
  }

  const handleHome = () => {
    router.push('/')
    handleClose()
  }

  if (!visible) return null

  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6",
        "animate-in fade-in duration-300",
        isClosing && "animate-out fade-out duration-300"
      )}
    >
      {/* 关闭按钮 */}
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors"
      >
        <X className="w-5 h-5 text-muted-foreground" />
      </button>

      {/* 主内容区 */}
      <div className="flex flex-col items-center text-center max-w-sm">
        {/* 动画图标 */}
        <AnimatedIcon type={config.type} />

        {/* 标题 */}
        <h1 
          className={cn(
            "mt-8 text-2xl font-bold",
            "animate-in slide-in-from-bottom-4 duration-500 delay-300"
          )}
        >
          {config.title}
        </h1>

        {/* 描述 */}
        {config.description && (
          <p 
            className={cn(
              "mt-3 text-muted-foreground leading-relaxed",
              "animate-in slide-in-from-bottom-4 duration-500 delay-400"
            )}
          >
            {config.description}
          </p>
        )}

        {/* 操作按钮区 */}
        <div 
          className={cn(
            "mt-8 flex flex-col gap-3 w-full",
            "animate-in slide-in-from-bottom-4 duration-500 delay-500"
          )}
        >
          {/* 主按钮 */}
          {config.primaryAction && (
            <Button 
              onClick={handlePrimaryAction}
              className="w-full h-12"
              variant={config.primaryAction.variant || 'default'}
            >
              {config.primaryAction.icon}
              {config.primaryAction.label}
            </Button>
          )}

          {/* 重试按钮（仅 error 类型） */}
          {config.type === 'error' && config.onRetry && (
            <Button 
              onClick={handleRetry}
              className="w-full h-12"
              variant="outline"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              重试
            </Button>
          )}

          {/* 次按钮 */}
          {config.secondaryAction && (
            <Button 
              onClick={handleSecondaryAction}
              className="w-full h-12"
              variant={config.secondaryAction.variant || 'outline'}
            >
              {config.secondaryAction.icon}
              {config.secondaryAction.label}
            </Button>
          )}

          {/* 返回/首页按钮组 */}
          {(config.showBackButton || config.showHomeButton) && (
            <div className="flex gap-3 mt-2">
              {config.showBackButton && (
                <Button 
                  onClick={handleBack}
                  variant="ghost"
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  返回
                </Button>
              )}
              {config.showHomeButton && (
                <Button 
                  onClick={handleHome}
                  variant="ghost"
                  className="flex-1"
                >
                  <Home className="w-4 h-4 mr-2" />
                  首页
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 底部装饰 */}
      <div className="absolute bottom-8 text-xs text-muted-foreground/50">
        热卜 · 国学智慧
      </div>
    </div>
  )
}

// ========== Context 管理 ==========

interface FeedbackContextType {
  showSuccess: (config: Omit<FeedbackConfig, 'type'>) => void
  showError: (config: Omit<FeedbackConfig, 'type'>) => void
  showWarning: (config: Omit<FeedbackConfig, 'type'>) => void
  showInfo: (config: Omit<FeedbackConfig, 'type'>) => void
  hide: () => void
}

const FeedbackContext = createContext<FeedbackContextType | null>(null)

export function GlobalFeedbackProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<FeedbackConfig | null>(null)
  const [visible, setVisible] = useState(false)

  const showFeedback = useCallback((type: FeedbackType, cfg: Omit<FeedbackConfig, 'type'>) => {
    setConfig({ ...cfg, type })
    setVisible(true)
  }, [])

  const hide = useCallback(() => {
    setVisible(false)
    setTimeout(() => setConfig(null), 300)
  }, [])

  const value: FeedbackContextType = {
    showSuccess: (cfg) => showFeedback('success', cfg),
    showError: (cfg) => showFeedback('error', cfg),
    showWarning: (cfg) => showFeedback('warning', cfg),
    showInfo: (cfg) => showFeedback('info', cfg),
    hide,
  }

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      {config && (
        <GlobalStatusFeedback 
          config={config} 
          visible={visible}
          onClose={hide}
        />
      )}
    </FeedbackContext.Provider>
  )
}

// ========== Hook ==========

export function useGlobalFeedback() {
  const context = useContext(FeedbackContext)
  if (!context) {
    throw new Error('useGlobalFeedback must be used within GlobalFeedbackProvider')
  }
  return context
}

// ========== 便捷 Hooks ==========

/**
 * 支付结果反馈
 */
export function usePaymentFeedback() {
  const feedback = useGlobalFeedback()

  return {
    showPaymentSuccess: (orderId: string, amount: string) => {
      feedback.showSuccess({
        title: '支付成功',
        description: `订单 ${orderId} 已支付 ¥${amount}`,
        primaryAction: {
          label: '查看订单',
          href: `/orders/${orderId}`,
        },
        showHomeButton: true,
        autoCloseDelay: 0,
      })
    },
    showPaymentFailed: (reason: string, onRetry?: () => void) => {
      feedback.showError({
        title: '支付失败',
        description: reason || '请检查支付方式后重试',
        onRetry,
        showBackButton: true,
      })
    },
  }
}

/**
 * 订单结果反馈
 */
export function useOrderFeedback() {
  const feedback = useGlobalFeedback()

  return {
    showOrderSuccess: (orderId: string) => {
      feedback.showSuccess({
        title: '下单成功',
        description: '您的订单已提交，请尽快完成支付',
        primaryAction: {
          label: '立即支付',
          href: `/checkout/${orderId}`,
        },
        secondaryAction: {
          label: '查看订单',
          href: `/orders/${orderId}`,
          variant: 'outline',
        },
      })
    },
    showOrderCancelled: () => {
      feedback.showInfo({
        title: '订单已取消',
        description: '您的订单已成功取消',
        showHomeButton: true,
        autoCloseDelay: 3000,
      })
    },
  }
}

/**
 * 提交结果反馈
 */
export function useSubmitFeedback() {
  const feedback = useGlobalFeedback()

  return {
    showSubmitSuccess: (title = '提交成功', description?: string) => {
      feedback.showSuccess({
        title,
        description: description || '我们已收到您的提交',
        showBackButton: true,
        autoCloseDelay: 3000,
      })
    },
    showSubmitFailed: (reason?: string, onRetry?: () => void) => {
      feedback.showError({
        title: '提交失败',
        description: reason || '请稍后重试',
        onRetry,
        showBackButton: true,
      })
    },
  }
}

/**
 * 操作结果反馈
 */
export function useActionFeedback() {
  const feedback = useGlobalFeedback()

  return {
    showActionSuccess: (title: string, description?: string, action?: FeedbackAction) => {
      feedback.showSuccess({
        title,
        description,
        primaryAction: action,
        autoCloseDelay: action ? 0 : 2000,
      })
    },
    showActionFailed: (title: string, reason?: string, onRetry?: () => void) => {
      feedback.showError({
        title,
        description: reason,
        onRetry,
        showBackButton: true,
      })
    },
    showActionWarning: (title: string, description?: string, action?: FeedbackAction) => {
      feedback.showWarning({
        title,
        description,
        primaryAction: action,
        showBackButton: true,
      })
    },
  }
}

// ========== 预设反馈页面 ==========

/**
 * 成功页面（独立使用）
 */
export function SuccessPage({
  title = '操作成功',
  description,
  primaryAction,
  secondaryAction,
  showHomeButton = true,
}: Omit<FeedbackConfig, 'type'>) {
  return (
    <GlobalStatusFeedback
      config={{
        type: 'success',
        title,
        description,
        primaryAction,
        secondaryAction,
        showHomeButton,
      }}
    />
  )
}

/**
 * 失败页面（独立使用）
 */
export function ErrorPage({
  title = '操作失败',
  description,
  onRetry,
  showBackButton = true,
  showHomeButton = true,
}: Omit<FeedbackConfig, 'type'>) {
  return (
    <GlobalStatusFeedback
      config={{
        type: 'error',
        title,
        description,
        onRetry,
        showBackButton,
        showHomeButton,
      }}
    />
  )
}
