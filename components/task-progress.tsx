"use client"

import { useState, useEffect, useCallback } from "react"
import { X, Upload, Video, FileDown, RefreshCw, Check, AlertCircle, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// 任务类型
type TaskType = "upload" | "transcode" | "export" | "import" | "sync" | "generate"

// 任务状态
type TaskStatus = "pending" | "running" | "paused" | "completed" | "failed" | "cancelled"

interface TaskProgressProps {
  isOpen: boolean
  onClose: () => void
  taskType: TaskType
  taskName: string
  progress: number // 0-100
  status: TaskStatus
  estimatedTime?: string // 预计剩余时间
  currentStep?: string // 当前步骤描述
  onCancel?: () => void
  onBackground?: () => void
  onRetry?: () => void
  mode?: "modal" | "fullscreen"
}

// 任务类型配置
const taskConfig: Record<TaskType, { icon: typeof Upload; label: string; color: string }> = {
  upload: { icon: Upload, label: "上传", color: "text-blue-500" },
  transcode: { icon: Video, label: "转码", color: "text-purple-500" },
  export: { icon: FileDown, label: "导出", color: "text-green-500" },
  import: { icon: Upload, label: "导入", color: "text-orange-500" },
  sync: { icon: RefreshCw, label: "同步", color: "text-cyan-500" },
  generate: { icon: Loader2, label: "生成", color: "text-pink-500" },
}

// 圆环进度条组件
function CircularProgress({ progress, size = 120, strokeWidth = 8 }: { progress: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* 背景圆环 */}
      <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-secondary"
        />
        {/* 进度圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-300 ease-out"
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#C41E3A" />
            <stop offset="100%" stopColor="#D4A574" />
          </linearGradient>
        </defs>
      </svg>
      {/* 中心百分比 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-foreground">{Math.round(progress)}%</span>
      </div>
    </div>
  )
}

export function TaskProgress({
  isOpen,
  onClose,
  taskType,
  taskName,
  progress,
  status,
  estimatedTime,
  currentStep,
  onCancel,
  onBackground,
  onRetry,
  mode = "modal"
}: TaskProgressProps) {
  const config = taskConfig[taskType]
  const Icon = config.icon

  if (!isOpen) return null

  const content = (
    <div className="flex flex-col items-center text-center">
      {/* 状态图标或进度环 */}
      {status === "completed" ? (
        <div className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center mb-4 animate-in zoom-in-50 duration-300">
          <Check className="w-12 h-12 text-green-500" />
        </div>
      ) : status === "failed" ? (
        <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center mb-4 animate-in zoom-in-50 duration-300">
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
      ) : status === "cancelled" ? (
        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
          <X className="w-12 h-12 text-muted-foreground" />
        </div>
      ) : (
        <div className="mb-4">
          <CircularProgress progress={progress} />
        </div>
      )}

      {/* 任务类型图标 */}
      {status === "running" && (
        <div className={cn("flex items-center gap-2 mb-2", config.color)}>
          <Icon className={cn("w-4 h-4", taskType === "generate" && "animate-spin")} />
          <span className="text-sm font-medium">正在{config.label}...</span>
        </div>
      )}

      {/* 任务名称 */}
      <h3 className="text-base font-semibold text-foreground mb-1">
        {status === "completed" ? `${config.label}成功` : 
         status === "failed" ? `${config.label}失败` :
         status === "cancelled" ? `已取消${config.label}` :
         taskName}
      </h3>

      {/* 当前步骤 */}
      {currentStep && status === "running" && (
        <p className="text-sm text-muted-foreground mb-2 px-4 line-clamp-2">{currentStep}</p>
      )}

      {/* 预计时间 */}
      {estimatedTime && status === "running" && (
        <p className="text-xs text-muted-foreground">
          预计剩余时间：<span className="text-foreground font-medium">{estimatedTime}</span>
        </p>
      )}

      {/* 失败原因 */}
      {status === "failed" && (
        <p className="text-sm text-red-500 mt-1">网络连接异常，请检查网络后重试</p>
      )}

      {/* 操作按钮 */}
      <div className="flex flex-col gap-3 mt-6 w-full max-w-xs">
        {status === "running" && (
          <>
            {onBackground && (
              <button
                onClick={onBackground}
                className="w-full py-3 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
              >
                后台执行
              </button>
            )}
            {onCancel && (
              <button
                onClick={onCancel}
                className="w-full py-3 text-red-500 text-sm font-medium hover:bg-red-50 rounded-xl transition-colors"
              >
                取消{config.label}
              </button>
            )}
          </>
        )}

        {status === "completed" && (
          <button
            onClick={onClose}
            className="w-full py-3 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
          >
            完成
          </button>
        )}

        {status === "failed" && (
          <>
            {onRetry && (
              <button
                onClick={onRetry}
                className="w-full py-3 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
              >
                重新{config.label}
              </button>
            )}
            <button
              onClick={onClose}
              className="w-full py-3 text-muted-foreground text-sm font-medium hover:bg-secondary rounded-xl transition-colors"
            >
              取消
            </button>
          </>
        )}

        {status === "cancelled" && (
          <button
            onClick={onClose}
            className="w-full py-3 bg-secondary text-foreground text-sm font-medium rounded-xl hover:bg-secondary/80 transition-colors"
          >
            关闭
          </button>
        )}
      </div>
    </div>
  )

  // 全屏模式
  if (mode === "fullscreen") {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-6">
        {content}
      </div>
    )
  }

  // 弹窗模式
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* 蒙层 */}
      <div 
        className="absolute inset-0 bg-black/60"
        onClick={status !== "running" ? onClose : undefined}
      />
      
      {/* 弹窗内容 */}
      <Card className="relative z-10 w-full max-w-sm mx-4 mb-4 sm:mb-0 p-6 rounded-2xl animate-in slide-in-from-bottom duration-300">
        {/* 关闭按钮（非运行状态时显示） */}
        {status !== "running" && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        )}
        {content}
      </Card>
    </div>
  )
}

// Hook：任务进度管理
export function useTaskProgress() {
  const [isOpen, setIsOpen] = useState(false)
  const [taskType, setTaskType] = useState<TaskType>("upload")
  const [taskName, setTaskName] = useState("")
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<TaskStatus>("pending")
  const [estimatedTime, setEstimatedTime] = useState<string | undefined>()
  const [currentStep, setCurrentStep] = useState<string | undefined>()

  const start = useCallback((type: TaskType, name: string) => {
    setTaskType(type)
    setTaskName(name)
    setProgress(0)
    setStatus("running")
    setIsOpen(true)
  }, [])

  const updateProgress = useCallback((value: number, step?: string, time?: string) => {
    setProgress(value)
    if (step) setCurrentStep(step)
    if (time) setEstimatedTime(time)
  }, [])

  const complete = useCallback(() => {
    setProgress(100)
    setStatus("completed")
  }, [])

  const fail = useCallback(() => {
    setStatus("failed")
  }, [])

  const cancel = useCallback(() => {
    setStatus("cancelled")
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    // 重置状态
    setTimeout(() => {
      setProgress(0)
      setStatus("pending")
      setCurrentStep(undefined)
      setEstimatedTime(undefined)
    }, 300)
  }, [])

  return {
    isOpen,
    taskType,
    taskName,
    progress,
    status,
    estimatedTime,
    currentStep,
    start,
    updateProgress,
    complete,
    fail,
    cancel,
    close,
  }
}
