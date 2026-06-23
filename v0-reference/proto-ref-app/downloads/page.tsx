"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { 
  ArrowLeft, Pause, Play, X, Trash2, BookOpen, Video, FileText,
  MoreHorizontal, FolderOpen, HardDrive, ChevronDown, ChevronUp,
  CheckCircle, AlertCircle, Clock
} from "lucide-react"
import { BackButton } from "@/components/common/back-button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// 下载任务类型
type DownloadStatus = "downloading" | "paused" | "completed" | "failed" | "waiting"

interface DownloadTask {
  id: number
  name: string
  type: "ebook" | "video" | "audio" | "document"
  size: number // MB
  downloaded: number // MB
  speed: number // KB/s
  status: DownloadStatus
  progress: number // 0-100
  source: string // 来源（课程名/圈子名）
  createdAt: string
}

// 模拟下载任务数据
const initialTasks: DownloadTask[] = [
  { id: 1, name: "八字命理入门精讲 - 第1章", type: "video", size: 256, downloaded: 168, speed: 1024, status: "downloading", progress: 65, source: "八字命理入门", createdAt: "2026-05-10 14:30" },
  { id: 2, name: "渊海子平（完整版）", type: "ebook", size: 48, downloaded: 24, speed: 0, status: "paused", progress: 50, source: "古籍书库", createdAt: "2026-05-10 14:25" },
  { id: 3, name: "紫微斗数基础课 - 第3章", type: "video", size: 180, downloaded: 36, speed: 512, status: "downloading", progress: 20, source: "紫微斗数基础", createdAt: "2026-05-10 14:20" },
  { id: 4, name: "滴天髓精解", type: "ebook", size: 32, downloaded: 32, speed: 0, status: "completed", progress: 100, source: "古籍书库", createdAt: "2026-05-09 10:15" },
  { id: 5, name: "八字命理入门精讲 - 第2章", type: "video", size: 220, downloaded: 220, speed: 0, status: "completed", progress: 100, source: "八字命理入门", createdAt: "2026-05-09 09:30" },
  { id: 6, name: "风水堪舆讲座音频", type: "audio", size: 86, downloaded: 86, speed: 0, status: "completed", progress: 100, source: "风水研习圈", createdAt: "2026-05-08 16:20" },
  { id: 7, name: "奇门遁甲入门 - 第1章", type: "video", size: 150, downloaded: 0, speed: 0, status: "failed", progress: 0, source: "奇门遁甲课程", createdAt: "2026-05-10 14:00" },
]

// 存储空间信息
const storageInfo = {
  used: 846, // MB
  total: 2048, // MB
  videoSize: 620,
  ebookSize: 156,
  audioSize: 70,
}

export default function DownloadsPage() {
  const [tasks, setTasks] = useState<DownloadTask[]>(initialTasks)
  const [showCompleted, setShowCompleted] = useState(true)
  const [showMenu, setShowMenu] = useState<number | null>(null)
  const [allPaused, setAllPaused] = useState(false)

  // 模拟下载进度更新
  useEffect(() => {
    const interval = setInterval(() => {
      setTasks(prev => prev.map(task => {
        if (task.status === "downloading" && !allPaused) {
          const newDownloaded = Math.min(task.downloaded + (task.speed / 1024) * 0.5, task.size)
          const newProgress = Math.round((newDownloaded / task.size) * 100)
          return {
            ...task,
            downloaded: newDownloaded,
            progress: newProgress,
            status: newProgress >= 100 ? "completed" : "downloading",
            speed: newProgress >= 100 ? 0 : task.speed
          }
        }
        return task
      }))
    }, 500)
    return () => clearInterval(interval)
  }, [allPaused])

  const downloadingTasks = tasks.filter(t => t.status === "downloading" || t.status === "paused" || t.status === "waiting" || t.status === "failed")
  const completedTasks = tasks.filter(t => t.status === "completed")

  const toggleTask = (id: number) => {
    setTasks(prev => prev.map(task => {
      if (task.id === id) {
        if (task.status === "downloading") {
          return { ...task, status: "paused" as DownloadStatus, speed: 0 }
        } else if (task.status === "paused" || task.status === "failed") {
          return { ...task, status: "downloading" as DownloadStatus, speed: Math.floor(Math.random() * 1024) + 512 }
        }
      }
      return task
    }))
  }

  const cancelTask = (id: number) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    setShowMenu(null)
  }

  const deleteCompleted = (id: number) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    setShowMenu(null)
  }

  const toggleAllTasks = () => {
    setAllPaused(!allPaused)
    setTasks(prev => prev.map(task => {
      if (task.status === "downloading" || task.status === "paused") {
        return { 
          ...task, 
          status: allPaused ? "downloading" : "paused" as DownloadStatus,
          speed: allPaused ? Math.floor(Math.random() * 1024) + 512 : 0
        }
      }
      return task
    }))
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "ebook": return <BookOpen className="w-5 h-5" />
      case "video": return <Video className="w-5 h-5" />
      case "audio": return <FileText className="w-5 h-5" />
      default: return <FileText className="w-5 h-5" />
    }
  }

  const getStatusInfo = (status: DownloadStatus) => {
    switch (status) {
      case "downloading": return { label: "下载中", color: "text-primary", bgColor: "bg-primary/10" }
      case "paused": return { label: "已暂停", color: "text-muted-foreground", bgColor: "bg-secondary" }
      case "completed": return { label: "已完成", color: "text-green-500", bgColor: "bg-green-500/10" }
      case "failed": return { label: "下载失败", color: "text-destructive", bgColor: "bg-destructive/10" }
      case "waiting": return { label: "等待中", color: "text-amber-500", bgColor: "bg-amber-500/10" }
    }
  }

  const formatSpeed = (speed: number) => {
    if (speed >= 1024) return `${(speed / 1024).toFixed(1)} MB/s`
    return `${speed} KB/s`
  }

  const formatSize = (mb: number) => {
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
    return `${mb} MB`
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton fallbackPath="/profile" />
          <h1 className="font-semibold text-base text-foreground">下载管理</h1>
          {downloadingTasks.length > 0 && (
            <button
              onClick={toggleAllTasks}
              className="text-sm text-primary font-medium"
            >
              {allPaused ? "全部开始" : "全部暂停"}
            </button>
          )}
          {downloadingTasks.length === 0 && <div className="w-16" />}
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* 下载中列表 */}
        {downloadingTasks.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              下载中 ({downloadingTasks.length})
            </h2>
            <div className="space-y-3">
              {downloadingTasks.map(task => {
                const statusInfo = getStatusInfo(task.status)
                return (
                  <Card key={task.id} className="p-3">
                    <div className="flex items-start gap-3">
                      {/* 类型图标 */}
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                        task.type === "video" ? "bg-blue-500/10 text-blue-500" :
                        task.type === "ebook" ? "bg-amber-500/10 text-amber-500" :
                        "bg-purple-500/10 text-purple-500"
                      )}>
                        {getTypeIcon(task.type)}
                      </div>

                      {/* 内容 */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground line-clamp-1">{task.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{task.source}</p>
                        
                        {/* 进度条 */}
                        <div className="mt-2">
                          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all duration-300",
                                task.status === "failed" ? "bg-destructive" :
                                task.status === "paused" ? "bg-muted-foreground" : "bg-primary"
                              )}
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-muted-foreground">
                              {formatSize(task.downloaded)} / {formatSize(task.size)}
                            </span>
                            <div className="flex items-center gap-2">
                              {task.status === "downloading" && (
                                <span className="text-xs text-primary">{formatSpeed(task.speed)}</span>
                              )}
                              <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", statusInfo.bgColor, statusInfo.color)}>
                                {statusInfo.label}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => toggleTask(task.id)}
                          className={cn(
                            "p-2 rounded-full transition-colors",
                            task.status === "downloading" 
                              ? "bg-primary/10 text-primary hover:bg-primary/20"
                              : "bg-secondary text-foreground hover:bg-secondary/80"
                          )}
                        >
                          {task.status === "downloading" ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => cancelTask(task.id)}
                          className="p-2 rounded-full bg-secondary text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* 已完成列表 */}
        {completedTasks.length > 0 && (
          <div>
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="w-full flex items-center justify-between text-sm font-medium text-foreground mb-3"
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>已完成 ({completedTasks.length})</span>
              </div>
              {showCompleted ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {showCompleted && (
              <div className="space-y-2">
                {completedTasks.map(task => (
                  <Card key={task.id} className="p-3">
                    <div className="flex items-center gap-3">
                      {/* 类型图标 */}
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                        task.type === "video" ? "bg-blue-500/10 text-blue-500" :
                        task.type === "ebook" ? "bg-amber-500/10 text-amber-500" :
                        "bg-purple-500/10 text-purple-500"
                      )}>
                        {getTypeIcon(task.type)}
                      </div>

                      {/* 内容 */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground line-clamp-1">{task.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{formatSize(task.size)}</span>
                          <span className="text-xs text-muted-foreground">|</span>
                          <span className="text-xs text-muted-foreground">{task.createdAt.split(" ")[0]}</span>
                        </div>
                      </div>

                      {/* 操作 */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Link
                          href={task.type === "ebook" ? `/reader/${task.id}` : `/learn/${task.id}`}
                          className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-full hover:bg-primary/90 transition-colors"
                        >
                          {task.type === "ebook" ? "阅读" : "播放"}
                        </Link>
                        <div className="relative">
                          <button
                            onClick={() => setShowMenu(showMenu === task.id ? null : task.id)}
                            className="p-2 rounded-full hover:bg-secondary transition-colors"
                          >
                            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                          </button>
                          {showMenu === task.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(null)} />
                              <div className="absolute right-0 top-full mt-1 w-32 bg-card rounded-lg shadow-lg border border-border z-50 py-1">
                                <button
                                  onClick={() => deleteCompleted(task.id)}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-secondary transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  删除文件
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 空状态 */}
        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
              <FolderOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">暂无下载任务</p>
            <Link
              href="/discover"
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-full"
            >
              去发现内容
            </Link>
          </div>
        )}
      </div>

      {/* 底部存储空间 */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border p-4 safe-area-pb">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">存储空间</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {formatSize(storageInfo.used)} / {formatSize(storageInfo.total)}
            </span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden flex">
            <div 
              className="h-full bg-blue-500" 
              style={{ width: `${(storageInfo.videoSize / storageInfo.total) * 100}%` }} 
            />
            <div 
              className="h-full bg-amber-500" 
              style={{ width: `${(storageInfo.ebookSize / storageInfo.total) * 100}%` }} 
            />
            <div 
              className="h-full bg-purple-500" 
              style={{ width: `${(storageInfo.audioSize / storageInfo.total) * 100}%` }} 
            />
          </div>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-xs text-muted-foreground">视频 {formatSize(storageInfo.videoSize)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-xs text-muted-foreground">电子书 {formatSize(storageInfo.ebookSize)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-xs text-muted-foreground">音频 {formatSize(storageInfo.audioSize)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
