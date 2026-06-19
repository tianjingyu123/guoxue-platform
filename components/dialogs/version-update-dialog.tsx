"use client"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Sparkles, Zap, Wrench, Shield, Download, X, Loader2, CheckCircle, AlertCircle, Rocket } from "lucide-react"
import { cn } from "@/lib/utils"
import type { VersionInfo, UpdateProgress, UpdateStatus } from "@/lib/types/version"
import { formatFileSize, formatSpeed, getChangeTypeColor } from "@/lib/api/version"

interface VersionUpdateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  versionInfo: VersionInfo
  onUpdate?: () => void
  onSkip?: () => void
}

// 获取更新内容类型图标组件
function ChangeTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'feature':
      return <Sparkles className="w-3.5 h-3.5" />
    case 'optimization':
      return <Zap className="w-3.5 h-3.5" />
    case 'fix':
      return <Wrench className="w-3.5 h-3.5" />
    case 'security':
      return <Shield className="w-3.5 h-3.5" />
    default:
      return <Sparkles className="w-3.5 h-3.5" />
  }
}

export function VersionUpdateDialog({
  open,
  onOpenChange,
  versionInfo,
  onUpdate,
  onSkip,
}: VersionUpdateDialogProps) {
  const [updateProgress, setUpdateProgress] = useState<UpdateProgress>({
    status: 'idle',
    progress: 0,
    downloadedSize: 0,
    totalSize: versionInfo.fileSize,
  })

  const isForced = versionInfo.updateType === 'forced'
  const isDownloading = updateProgress.status === 'downloading'
  const isInstalling = updateProgress.status === 'installing'
  const isCompleted = updateProgress.status === 'completed'
  const isError = updateProgress.status === 'error'
  const isProcessing = isDownloading || isInstalling

  // 模拟下载进度
  const simulateDownload = useCallback(() => {
    setUpdateProgress(prev => ({
      ...prev,
      status: 'downloading',
      progress: 0,
      downloadedSize: 0,
    }))

    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 8 + 2
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)
        // 开始安装
        setUpdateProgress(prev => ({
          ...prev,
          status: 'installing',
          progress: 100,
          downloadedSize: prev.totalSize,
        }))
        // 模拟安装
        setTimeout(() => {
          setUpdateProgress(prev => ({
            ...prev,
            status: 'completed',
          }))
        }, 2000)
      } else {
        const downloadedSize = Math.floor((progress / 100) * versionInfo.fileSize)
        const speed = Math.floor(Math.random() * 2000000 + 500000) // 500KB-2.5MB/s
        setUpdateProgress(prev => ({
          ...prev,
          progress,
          downloadedSize,
          speed,
        }))
      }
    }, 300)

    return () => clearInterval(interval)
  }, [versionInfo.fileSize])

  const handleUpdate = () => {
    onUpdate?.()
    simulateDownload()
  }

  const handleSkip = () => {
    if (!isForced && !isProcessing) {
      onSkip?.()
      onOpenChange(false)
    }
  }

  const handleClose = () => {
    if (!isForced && !isProcessing) {
      onOpenChange(false)
    }
  }

  // 重置状态
  useEffect(() => {
    if (open) {
      setUpdateProgress({
        status: 'idle',
        progress: 0,
        downloadedSize: 0,
        totalSize: versionInfo.fileSize,
      })
    }
  }, [open, versionInfo.fileSize])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-md p-0 overflow-hidden"
        onInteractOutside={(e) => {
          if (isForced || isProcessing) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (isForced || isProcessing) e.preventDefault()
        }}
      >
        {/* 顶部装饰 */}
        <div className="relative h-28 bg-gradient-to-br from-primary via-primary/90 to-primary/80 overflow-hidden">
          {/* 装饰元素 */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-4 right-8 w-16 h-16 rounded-full border-2 border-white/30" />
            <div className="absolute bottom-2 left-6 w-8 h-8 rounded-full bg-white/20" />
            <div className="absolute top-8 left-1/3 w-4 h-4 rounded-full bg-white/30" />
          </div>
          
          {/* 关闭按钮（非强制更新时） */}
          {!isForced && !isProcessing && (
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          
          {/* 图标和版本 */}
          <div className="absolute bottom-4 left-4 flex items-end gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white shadow-lg flex items-center justify-center">
              <Rocket className="w-7 h-7 text-primary" />
            </div>
            <div className="text-white mb-1">
              <div className="text-lg font-bold">发现新版本</div>
              <div className="text-sm opacity-90">v{versionInfo.version}</div>
            </div>
          </div>
          
          {/* 更新类型标签 */}
          {isForced && (
            <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-red-500 text-white text-xs font-medium">
              强制更新
            </div>
          )}
        </div>

        <div className="p-4 space-y-4">
          <DialogHeader className="p-0">
            <DialogTitle className="sr-only">{versionInfo.title}</DialogTitle>
          </DialogHeader>

          {/* 更新内容 */}
          {updateProgress.status === 'idle' && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">更新内容</h3>
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(versionInfo.fileSize)}
                  </span>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                  {versionInfo.changes.map((change, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                        change.type === 'feature' && "bg-primary/10 text-primary",
                        change.type === 'optimization' && "bg-blue-50 text-blue-600",
                        change.type === 'fix' && "bg-green-50 text-green-600",
                        change.type === 'security' && "bg-amber-50 text-amber-600",
                      )}>
                        <ChangeTypeIcon type={change.type} />
                      </div>
                      <span className="text-sm text-foreground/80">{change.content}</span>
                    </div>
                  ))}
                </div>
              </div>

              {versionInfo.versionName && (
                <p className="text-xs text-muted-foreground text-center">
                  版本代号：{versionInfo.versionName} · {versionInfo.releaseDate}
                </p>
              )}
            </>
          )}

          {/* 下载进度 */}
          {isDownloading && (
            <div className="space-y-3 py-4">
              <div className="flex items-center justify-center gap-2 text-primary">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-medium">正在下载...</span>
              </div>
              <Progress value={updateProgress.progress} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {formatFileSize(updateProgress.downloadedSize)} / {formatFileSize(updateProgress.totalSize)}
                </span>
                {updateProgress.speed && (
                  <span>{formatSpeed(updateProgress.speed)}</span>
                )}
              </div>
            </div>
          )}

          {/* 安装中 */}
          {isInstalling && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <div className="text-center">
                <p className="font-medium">正在安装...</p>
                <p className="text-sm text-muted-foreground">请稍候，即将完成</p>
              </div>
            </div>
          )}

          {/* 完成 */}
          {isCompleted && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-center">
                <p className="font-medium text-green-600">更新完成</p>
                <p className="text-sm text-muted-foreground">重启应用以使用新版本</p>
              </div>
            </div>
          )}

          {/* 错误 */}
          {isError && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div className="text-center">
                <p className="font-medium text-red-600">更新失败</p>
                <p className="text-sm text-muted-foreground">
                  {updateProgress.errorMessage || '请检查网络后重试'}
                </p>
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="space-y-2">
            {updateProgress.status === 'idle' && (
              <>
                <Button 
                  onClick={handleUpdate} 
                  className="w-full h-11"
                >
                  <Download className="w-4 h-4 mr-2" />
                  立即更新
                </Button>
                {!isForced && (
                  <Button 
                    variant="ghost" 
                    onClick={handleSkip}
                    className="w-full text-muted-foreground"
                  >
                    稍后再说
                  </Button>
                )}
              </>
            )}

            {isCompleted && (
              <Button 
                onClick={() => window.location.reload()} 
                className="w-full h-11"
              >
                重启应用
              </Button>
            )}

            {isError && (
              <Button 
                onClick={handleUpdate} 
                className="w-full h-11"
              >
                重新下载
              </Button>
            )}
          </div>

          {/* 强制更新提示 */}
          {isForced && updateProgress.status === 'idle' && (
            <p className="text-xs text-center text-red-500">
              此版本为强制更新，请更新后继续使用
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
