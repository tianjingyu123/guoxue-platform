"use client"

import { useState, useEffect } from "react"
import { BackButton } from "@/components/common/back-button"
import { Upload, Video, FileDown, RefreshCw, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { TaskProgress, useTaskProgress } from "@/components/task-progress"
import Link from "next/link"

export default function ProgressDemoPage() {
  const taskProgress = useTaskProgress()
  const [demoInterval, setDemoInterval] = useState<NodeJS.Timeout | null>(null)

  // 模拟任务进度
  const simulateTask = (type: "upload" | "transcode" | "export" | "import" | "sync" | "generate", name: string) => {
    taskProgress.start(type, name)
    
    let progress = 0
    const steps = [
      "准备中...",
      "正在处理文件...",
      "正在传输数据...",
      "校验数据完整性...",
      "即将完成...",
    ]
    
    const interval = setInterval(() => {
      progress += Math.random() * 15
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)
        setDemoInterval(null)
        setTimeout(() => taskProgress.complete(), 500)
      }
      
      const stepIndex = Math.min(Math.floor(progress / 20), steps.length - 1)
      const remainingTime = Math.max(1, Math.ceil((100 - progress) / 10))
      
      taskProgress.updateProgress(
        Math.min(progress, 99),
        steps[stepIndex],
        progress < 100 ? `约${remainingTime}分钟` : undefined
      )
    }, 500)
    
    setDemoInterval(interval)
  }

  // 模拟失败
  const simulateFail = () => {
    taskProgress.start("upload", "测试视频.mp4")
    
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 20
      if (progress >= 45) {
        clearInterval(interval)
        setDemoInterval(null)
        taskProgress.fail()
        return
      }
      taskProgress.updateProgress(progress, "正在上传...", "约3分钟")
    }, 500)
    
    setDemoInterval(interval)
  }

  // 清理
  useEffect(() => {
    return () => {
      if (demoInterval) clearInterval(demoInterval)
    }
  }, [demoInterval])

  const handleCancel = () => {
    if (demoInterval) {
      clearInterval(demoInterval)
      setDemoInterval(null)
    }
    taskProgress.cancel()
  }

  const handleBackground = () => {
    taskProgress.close()
    // 任务继续在后台执行
  }

  const demos = [
    { type: "upload" as const, name: "八字入门第一课.mp4", icon: Upload, label: "视频上传", color: "bg-blue-500/10 text-blue-500" },
    { type: "transcode" as const, name: "紫微斗数精讲.mp4", icon: Video, label: "视频转码", color: "bg-purple-500/10 text-purple-500" },
    { type: "export" as const, name: "学员数据报表.xlsx", icon: FileDown, label: "数据导出", color: "bg-green-500/10 text-green-500" },
    { type: "sync" as const, name: "圈子内容同步", icon: RefreshCw, label: "数据同步", color: "bg-cyan-500/10 text-cyan-500" },
    { type: "generate" as const, name: "排盘分析报告", icon: Loader2, label: "AI生成", color: "bg-pink-500/10 text-pink-500" },
  ]

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      {/* 进度弹窗 */}
      <TaskProgress
        isOpen={taskProgress.isOpen}
        onClose={taskProgress.close}
        taskType={taskProgress.taskType}
        taskName={taskProgress.taskName}
        progress={taskProgress.progress}
        status={taskProgress.status}
        estimatedTime={taskProgress.estimatedTime}
        currentStep={taskProgress.currentStep}
        onCancel={handleCancel}
        onBackground={handleBackground}
        onRetry={() => simulateTask(taskProgress.taskType, taskProgress.taskName)}
      />

      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <BackButton fallbackPath="/demo" />
          <h1 className="font-semibold text-lg text-foreground">进度反馈演示</h1>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* 说明 */}
        <Card className="p-4 bg-secondary/30">
          <h2 className="font-medium text-sm text-foreground mb-2">全局等待进度组件</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            用于大文件上传、视频转码、数据导出等耗时任务的进度反馈。支持圆环进度条、预计时间显示、取消和后台执行操作。
          </p>
        </Card>

        {/* 任务类型演示 */}
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">任务类型演示</h3>
          <div className="space-y-3">
            {demos.map((demo) => (
              <Card
                key={demo.type}
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-secondary/50 transition-colors"
                onClick={() => simulateTask(demo.type, demo.name)}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${demo.color}`}>
                  <demo.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{demo.label}</p>
                  <p className="text-xs text-muted-foreground">{demo.name}</p>
                </div>
                <span className="text-xs text-primary">点击演示</span>
              </Card>
            ))}
          </div>
        </div>

        {/* 失败状态演示 */}
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">失败状态演示</h3>
          <Card
            className="flex items-center gap-3 p-4 cursor-pointer hover:bg-red-50 transition-colors border-red-200"
            onClick={simulateFail}
          >
            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <Upload className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">模拟上传失败</p>
              <p className="text-xs text-muted-foreground">进度到45%时触发失败</p>
            </div>
            <span className="text-xs text-red-500">点击演示</span>
          </Card>
        </div>

        {/* 使用说明 */}
        <Card className="p-4">
          <h3 className="font-medium text-sm text-foreground mb-2">使用方法</h3>
          <pre className="text-xs text-muted-foreground bg-secondary/50 p-3 rounded-lg overflow-x-auto">
{`import { useTaskProgress, TaskProgress } from "@/components/task-progress"

const taskProgress = useTaskProgress()

// 开始任务
taskProgress.start("upload", "视频文件.mp4")

// 更新进度
taskProgress.updateProgress(50, "正在上传...", "约2分钟")

// 完成/失败/取消
taskProgress.complete()
taskProgress.fail()
taskProgress.cancel()`}
          </pre>
        </Card>
      </div>
    </div>
  )
}
