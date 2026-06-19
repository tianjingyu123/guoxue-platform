"use client"

import { useState, useEffect, useCallback, createContext, useContext } from "react"
import { X, Loader2, CheckCircle, XCircle, Upload, Download, FileVideo, FileText, Wand2 } from "lucide-react"
import { cn } from "@/lib/utils"

// 加载类型
export type LoadingType = 'upload' | 'download' | 'process' | 'export' | 'generate' | 'default'

// 加载状态
export type LoadingStatus = 'loading' | 'success' | 'error' | 'cancelled'

// 加载配置
export interface LoadingConfig {
  type?: LoadingType
  title: string
  description?: string
  progress?: number
  showProgress?: boolean
  cancellable?: boolean
  onCancel?: () => void
  onComplete?: () => void
  autoCloseDelay?: number // 成功后自动关闭延迟（毫秒）
}

// Context
interface GlobalLoadingContextType {
  show: (config: LoadingConfig) => string
  hide: (id?: string) => void
  updateProgress: (id: string, progress: number, description?: string) => void
  setStatus: (id: string, status: LoadingStatus, message?: string) => void
}

const GlobalLoadingContext = createContext<GlobalLoadingContextType | null>(null)

export function useGlobalLoading() {
  const context = useContext(GlobalLoadingContext)
  if (!context) {
    throw new Error('useGlobalLoading must be used within GlobalLoadingProvider')
  }
  return context
}

// 获取类型图标
function getTypeIcon(type: LoadingType) {
  switch (type) {
    case 'upload':
      return Upload
    case 'download':
      return Download
    case 'process':
      return FileVideo
    case 'export':
      return FileText
    case 'generate':
      return Wand2
    default:
      return Loader2
  }
}

// 获取类型颜色
function getTypeColor(type: LoadingType): string {
  switch (type) {
    case 'upload':
      return 'text-blue-500'
    case 'download':
      return 'text-green-500'
    case 'process':
      return 'text-purple-500'
    case 'export':
      return 'text-amber-500'
    case 'generate':
      return 'text-primary'
    default:
      return 'text-muted-foreground'
  }
}

// 单个加载项状态
interface LoadingItem extends LoadingConfig {
  id: string
  status: LoadingStatus
  statusMessage?: string
}

// Provider 组件
export function GlobalLoadingProvider({ children }: { children: React.ReactNode }) {
  const [loadingItems, setLoadingItems] = useState<LoadingItem[]>([])

  const show = useCallback((config: LoadingConfig): string => {
    const id = `loading_${Date.now()}_${Math.random().toString(36).slice(2)}`
    setLoadingItems(prev => [...prev, { ...config, id, status: 'loading' }])
    return id
  }, [])

  const hide = useCallback((id?: string) => {
    if (id) {
      setLoadingItems(prev => prev.filter(item => item.id !== id))
    } else {
      // 隐藏最后一个
      setLoadingItems(prev => prev.slice(0, -1))
    }
  }, [])

  const updateProgress = useCallback((id: string, progress: number, description?: string) => {
    setLoadingItems(prev => prev.map(item => 
      item.id === id 
        ? { ...item, progress, description: description || item.description }
        : item
    ))
  }, [])

  const setStatus = useCallback((id: string, status: LoadingStatus, message?: string) => {
    setLoadingItems(prev => prev.map(item => 
      item.id === id 
        ? { ...item, status, statusMessage: message }
        : item
    ))
  }, [])

  // 当前显示的加载项（最后一个）
  const currentItem = loadingItems[loadingItems.length - 1]

  return (
    <GlobalLoadingContext.Provider value={{ show, hide, updateProgress, setStatus }}>
      {children}
      {currentItem && (
        <GlobalLoadingOverlay 
          item={currentItem} 
          onClose={() => hide(currentItem.id)}
        />
      )}
    </GlobalLoadingContext.Provider>
  )
}

// 加载遮罩组件
interface GlobalLoadingOverlayProps {
  item: LoadingItem
  onClose: () => void
}

function GlobalLoadingOverlay({ item, onClose }: GlobalLoadingOverlayProps) {
  const { type = 'default', title, description, progress, showProgress = true, cancellable = true, onCancel, onComplete, autoCloseDelay = 1500, status, statusMessage } = item
  
  const Icon = getTypeIcon(type)
  const iconColor = getTypeColor(type)

  // 成功后自动关闭
  useEffect(() => {
    if (status === 'success' && autoCloseDelay > 0) {
      const timer = setTimeout(() => {
        onComplete?.()
        onClose()
      }, autoCloseDelay)
      return () => clearTimeout(timer)
    }
  }, [status, autoCloseDelay, onComplete, onClose])

  const handleCancel = () => {
    onCancel?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* 半透明遮罩 */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* 内容区 */}
      <div className="relative bg-card rounded-2xl p-8 w-[320px] shadow-2xl">
        {/* 取消按钮 */}
        {cancellable && status === 'loading' && (
          <button
            onClick={handleCancel}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-secondary/80 flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}

        {/* 加载动画区 */}
        <div className="flex flex-col items-center">
          {/* 状态图标 */}
          <div className="relative w-20 h-20 mb-6">
            {status === 'loading' && (
              <>
                {/* 外圈进度环 */}
                {showProgress && progress !== undefined && (
                  <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      className="text-secondary"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 36}`}
                      strokeDashoffset={`${2 * Math.PI * 36 * (1 - (progress || 0) / 100)}`}
                      className="text-primary transition-all duration-300"
                    />
                  </svg>
                )}
                {/* 中心图标 */}
                <div className={cn(
                  "absolute inset-0 flex items-center justify-center",
                  !showProgress && "animate-pulse"
                )}>
                  <Icon className={cn("w-8 h-8", iconColor, type === 'default' && "animate-spin")} />
                </div>
              </>
            )}

            {status === 'success' && (
              <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in-50 duration-300">
                <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in-50 duration-300">
                <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
                  <XCircle className="w-10 h-10 text-destructive" />
                </div>
              </div>
            )}

            {status === 'cancelled' && (
              <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in-50 duration-300">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                  <X className="w-10 h-10 text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          {/* 标题 */}
          <h3 className="text-lg font-semibold text-center mb-2">
            {status === 'success' ? (statusMessage || '操作成功') :
             status === 'error' ? (statusMessage || '操作失败') :
             status === 'cancelled' ? '已取消' :
             title}
          </h3>

          {/* 进度百分比 */}
          {status === 'loading' && showProgress && progress !== undefined && (
            <div className="text-2xl font-bold text-primary mb-2">
              {Math.round(progress)}%
            </div>
          )}

          {/* 描述文字 */}
          {status === 'loading' && description && (
            <p className="text-sm text-muted-foreground text-center">
              {description}
            </p>
          )}

          {/* 错误重试按钮 */}
          {status === 'error' && (
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              知道了
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ========== 独立使用的加载组件 ==========

interface GlobalLoadingProps {
  open: boolean
  type?: LoadingType
  title: string
  description?: string
  progress?: number
  showProgress?: boolean
  status?: LoadingStatus
  statusMessage?: string
  cancellable?: boolean
  onCancel?: () => void
  onClose?: () => void
}

export function GlobalLoading({
  open,
  type = 'default',
  title,
  description,
  progress,
  showProgress = true,
  status = 'loading',
  statusMessage,
  cancellable = true,
  onCancel,
  onClose,
}: GlobalLoadingProps) {
  if (!open) return null

  return (
    <GlobalLoadingOverlay
      item={{
        id: 'standalone',
        type,
        title,
        description,
        progress,
        showProgress,
        cancellable,
        onCancel,
        status,
        statusMessage,
      }}
      onClose={onClose || (() => {})}
    />
  )
}

// ========== 便捷 Hook ==========

export function useUploadLoading() {
  const { show, hide, updateProgress, setStatus } = useGlobalLoading()

  const startUpload = (filename: string) => {
    return show({
      type: 'upload',
      title: '正在上传',
      description: filename,
      progress: 0,
      showProgress: true,
      cancellable: true,
    })
  }

  return { startUpload, updateProgress, setStatus, hide }
}

export function useProcessLoading() {
  const { show, hide, updateProgress, setStatus } = useGlobalLoading()

  const startProcess = (title: string, description?: string) => {
    return show({
      type: 'process',
      title,
      description,
      progress: 0,
      showProgress: true,
      cancellable: false,
    })
  }

  return { startProcess, updateProgress, setStatus, hide }
}

export function useExportLoading() {
  const { show, hide, updateProgress, setStatus } = useGlobalLoading()

  const startExport = (title: string = '正在导出') => {
    return show({
      type: 'export',
      title,
      progress: 0,
      showProgress: true,
      cancellable: true,
    })
  }

  return { startExport, updateProgress, setStatus, hide }
}

export function useGenerateLoading() {
  const { show, hide, setStatus } = useGlobalLoading()

  const startGenerate = (title: string = 'AI生成中') => {
    return show({
      type: 'generate',
      title,
      description: '请稍候...',
      showProgress: false,
      cancellable: false,
    })
  }

  return { startGenerate, setStatus, hide }
}
