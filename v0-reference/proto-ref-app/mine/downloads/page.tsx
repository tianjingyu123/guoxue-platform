'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Download, 
  Pause, 
  Play, 
  Trash2, 
  RefreshCw,
  Video,
  BookOpen,
  Scroll,
  Headphones,
  FileText,
  File,
  HardDrive,
  MoreVertical,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataState } from '@/components/data-state'
import { 
  getDownloads, 
  getStorageInfo,
  pauseDownload,
  resumeDownload,
  deleteDownload,
  retryDownload,
  clearCompletedDownloads,
  formatFileSize,
  formatSpeed,
  getFileTypeName,
  getStatusName,
  getContentPath
} from '@/lib/api/downloads'
import type { DownloadItem, StorageInfo, DownloadFileType, DownloadStatus } from '@/lib/types/downloads'

// Tab 定义
const TABS = [
  { key: 'all', label: '全部' },
  { key: 'downloading', label: '下载中' },
  { key: 'completed', label: '已完成' },
] as const

type TabKey = typeof TABS[number]['key']

// 文件类型图标组件
function FileTypeIcon({ type, className }: { type: DownloadFileType; className?: string }) {
  const iconClass = className || 'w-5 h-5'
  switch (type) {
    case 'video':
      return <Video className={iconClass} />
    case 'ebook':
      return <BookOpen className={iconClass} />
    case 'classic':
      return <Scroll className={iconClass} />
    case 'audio':
      return <Headphones className={iconClass} />
    case 'document':
      return <FileText className={iconClass} />
    default:
      return <File className={iconClass} />
  }
}

// 状态图标组件
function StatusIcon({ status }: { status: DownloadStatus }) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-4 h-4 text-green-500" />
    case 'failed':
      return <AlertCircle className="w-4 h-4 text-red-500" />
    case 'paused':
      return <Pause className="w-4 h-4 text-yellow-500" />
    case 'pending':
      return <Clock className="w-4 h-4 text-gray-400" />
    default:
      return null
  }
}

export default function DownloadsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [downloads, setDownloads] = useState<DownloadItem[]>([])
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // 操作状态
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DownloadItem | null>(null)
  const [showClearDialog, setShowClearDialog] = useState(false)

  // 加载数据
  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [downloadsRes, storageRes] = await Promise.all([
        getDownloads(1, 50, activeTab),
        getStorageInfo()
      ])
      
      if (downloadsRes.code === 200) {
        setDownloads(downloadsRes.data.list)
      }
      if (storageRes.code === 200) {
        setStorageInfo(storageRes.data)
      }
    } catch (err) {
      setError('加载失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [activeTab])

  // 暂停下载
  const handlePause = async (item: DownloadItem) => {
    setActionLoading(item.id)
    try {
      const res = await pauseDownload(item.id)
      if (res.code === 200) {
        setDownloads(prev => prev.map(d => 
          d.id === item.id ? { ...d, status: 'paused' as DownloadStatus, speed: undefined } : d
        ))
      }
    } finally {
      setActionLoading(null)
    }
  }

  // 继续下载
  const handleResume = async (item: DownloadItem) => {
    setActionLoading(item.id)
    try {
      const res = await resumeDownload(item.id)
      if (res.code === 200) {
        setDownloads(prev => prev.map(d => 
          d.id === item.id ? { ...d, status: 'downloading' as DownloadStatus } : d
        ))
      }
    } finally {
      setActionLoading(null)
    }
  }

  // 重试下载
  const handleRetry = async (item: DownloadItem) => {
    setActionLoading(item.id)
    try {
      const res = await retryDownload(item.id)
      if (res.code === 200) {
        setDownloads(prev => prev.map(d => 
          d.id === item.id ? { ...d, status: 'downloading' as DownloadStatus, errorMsg: undefined } : d
        ))
      }
    } finally {
      setActionLoading(null)
    }
  }

  // 删除下载
  const handleDelete = async () => {
    if (!deleteTarget) return
    setActionLoading(deleteTarget.id)
    try {
      const res = await deleteDownload(deleteTarget.id)
      if (res.code === 200) {
        setDownloads(prev => prev.filter(d => d.id !== deleteTarget.id))
      }
    } finally {
      setActionLoading(null)
      setDeleteTarget(null)
    }
  }

  // 清除已完成
  const handleClearCompleted = async () => {
    try {
      const res = await clearCompletedDownloads()
      if (res.code === 200) {
        setDownloads(prev => prev.filter(d => d.status !== 'completed'))
        loadData() // 重新加载存储信息
      }
    } finally {
      setShowClearDialog(false)
    }
  }

  // 打开内容
  const handleOpenContent = (item: DownloadItem) => {
    router.push(getContentPath(item))
  }

  // 骨架屏
  const renderSkeleton = () => (
    <div className="space-y-3 p-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
          <div className="flex gap-3">
            <div className="w-16 h-16 bg-gray-200 rounded-lg" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-2 bg-gray-200 rounded w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  // 计算统计数据
  const downloadingCount = downloads.filter(d => ['downloading', 'paused', 'pending', 'failed'].includes(d.status)).length
  const completedCount = downloads.filter(d => d.status === 'completed').length

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-[#FAF8F5] border-b border-[#C9A96E]/20">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-1">
              <ArrowLeft className="w-6 h-6 text-[#2D2A26]" />
            </button>
            <h1 className="text-lg font-semibold text-[#2D2A26]">下载管理</h1>
          </div>
          {completedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-[#C41E3A]"
              onClick={() => setShowClearDialog(true)}
            >
              清除已完成
            </Button>
          )}
        </div>

        {/* 存储空间信息 */}
        {storageInfo && (
          <div className="px-4 pb-3">
            <div className="bg-white rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm text-[#5C5C5C]">
                  <HardDrive className="w-4 h-4" />
                  <span>存储空间</span>
                </div>
                <span className="text-sm text-[#2D2A26]">
                  {formatFileSize(storageInfo.downloadUsed)} / {formatFileSize(storageInfo.totalSpace)}
                </span>
              </div>
              <Progress 
                value={(storageInfo.downloadUsed / storageInfo.totalSpace) * 100} 
                className="h-2"
              />
              <div className="flex gap-3 mt-2 text-xs text-[#8C8C8C]">
                {storageInfo.breakdown.filter(b => b.count > 0).map(b => (
                  <span key={b.type}>
                    {getFileTypeName(b.type)} {formatFileSize(b.size)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 切换 */}
        <div className="flex border-b border-[#C9A96E]/20">
          {TABS.map(tab => {
            const count = tab.key === 'downloading' ? downloadingCount : 
                         tab.key === 'completed' ? completedCount : downloads.length
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-3 text-sm font-medium relative ${
                  activeTab === tab.key 
                    ? 'text-[#C41E3A]' 
                    : 'text-[#5C5C5C]'
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`ml-1 text-xs ${
                    activeTab === tab.key ? 'text-[#C41E3A]' : 'text-[#8C8C8C]'
                  }`}>
                    ({count})
                  </span>
                )}
                {activeTab === tab.key && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-[#C41E3A]" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 内容区域 */}
      <DataState
        loading={loading}
        error={error}
        empty={downloads.length === 0}
        skeleton={renderSkeleton()}
        emptyMessage={activeTab === 'downloading' ? '暂无下载中的内容' : 
                     activeTab === 'completed' ? '暂无已完成的下载' : '暂无下载记录'}
        emptyIcon={<Download className="w-12 h-12 text-[#C9A96E]/50" />}
        onRetry={loadData}
      >
        <div className="p-4 space-y-3">
          {downloads.map(item => (
            <div 
              key={item.id}
              className="bg-white rounded-lg p-4 shadow-sm"
            >
              <div className="flex gap-3">
                {/* 封面/图标 */}
                <div className="w-16 h-16 bg-[#FAF8F5] rounded-lg flex items-center justify-center flex-shrink-0">
                  {item.cover ? (
                    <img 
                      src={item.cover} 
                      alt={item.fileName}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <FileTypeIcon type={item.fileType} className="w-8 h-8 text-[#C9A96E]" />
                  )}
                </div>

                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-[#2D2A26] truncate">
                        {item.fileName}
                      </h3>
                      <p className="text-xs text-[#8C8C8C] mt-0.5 truncate">
                        {item.sourceTitle}
                      </p>
                    </div>
                    
                    {/* 操作菜单 */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {item.status === 'completed' && (
                          <DropdownMenuItem onClick={() => handleOpenContent(item)}>
                            打开
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => setDeleteTarget(item)}
                          className="text-red-500"
                        >
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* 进度信息 */}
                  <div className="mt-2">
                    {item.status === 'downloading' && (
                      <>
                        <Progress value={item.progress} className="h-1.5 mb-1.5" />
                        <div className="flex items-center justify-between text-xs text-[#8C8C8C]">
                          <span>{item.progress}% · {formatFileSize(item.downloadedSize)}/{formatFileSize(item.fileSize)}</span>
                          {item.speed && <span>{formatSpeed(item.speed)}</span>}
                        </div>
                      </>
                    )}

                    {item.status === 'paused' && (
                      <>
                        <Progress value={item.progress} className="h-1.5 mb-1.5" />
                        <div className="flex items-center gap-1 text-xs text-yellow-600">
                          <StatusIcon status={item.status} />
                          <span>已暂停 · {item.progress}%</span>
                        </div>
                      </>
                    )}

                    {item.status === 'pending' && (
                      <div className="flex items-center gap-1 text-xs text-[#8C8C8C]">
                        <StatusIcon status={item.status} />
                        <span>等待中 · {formatFileSize(item.fileSize)}</span>
                      </div>
                    )}

                    {item.status === 'completed' && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <StatusIcon status={item.status} />
                          <span>已完成 · {formatFileSize(item.fileSize)}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-[#C41E3A] text-[#C41E3A]"
                          onClick={() => handleOpenContent(item)}
                        >
                          {item.fileType === 'video' || item.fileType === 'audio' ? '播放' : '阅读'}
                        </Button>
                      </div>
                    )}

                    {item.status === 'failed' && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-red-500">
                          <StatusIcon status={item.status} />
                          <span>{item.errorMsg || '下载失败'}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleRetry(item)}
                          disabled={actionLoading === item.id}
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          重试
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* 操作按钮 - 下载中/暂停状态 */}
                  {(item.status === 'downloading' || item.status === 'paused') && (
                    <div className="flex gap-2 mt-2">
                      {item.status === 'downloading' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs flex-1"
                          onClick={() => handlePause(item)}
                          disabled={actionLoading === item.id}
                        >
                          <Pause className="w-3 h-3 mr-1" />
                          暂停
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs flex-1 border-[#C41E3A] text-[#C41E3A]"
                          onClick={() => handleResume(item)}
                          disabled={actionLoading === item.id}
                        >
                          <Play className="w-3 h-3 mr-1" />
                          继续
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => setDeleteTarget(item)}
                        disabled={actionLoading === item.id}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </DataState>

      {/* 删除确认弹窗 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除下载</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除「{deleteTarget?.fileName}」吗？
              {deleteTarget?.status === 'completed' && '本地文件也将被删除。'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-[#C41E3A] hover:bg-[#A01830]"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 清除已完成确认弹窗 */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>清除已完成</AlertDialogTitle>
            <AlertDialogDescription>
              确定要清除所有已完成的下载记录吗？本地文件也将被删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearCompleted}
              className="bg-[#C41E3A] hover:bg-[#A01830]"
            >
              确定清除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
