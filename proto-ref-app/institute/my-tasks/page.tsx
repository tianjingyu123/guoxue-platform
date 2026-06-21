"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  Clock, 
  Gift, 
  CheckCircle,
  AlertCircle,
  FileText,
  Video,
  MessageSquare,
  Radio,
  ClipboardCheck,
  MoreHorizontal,
  X,
  Upload,
  Coins
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { 
  getInstructorTasks,
  getTaskStats,
  acceptTask,
  submitTask,
  abandonTask,
  getTaskTypeLabel,
  getTaskTypeColor,
  getTaskStatusLabel,
  getTaskStatusColor,
} from "@/lib/api/institute"
import type { InstructorTask, TaskStats, TaskStatus } from "@/lib/types/institute"

// 骨架屏
function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-muted rounded", className)} />
}

// 任务类型图标
function TaskTypeIcon({ type }: { type: string }) {
  const icons: Record<string, React.ReactNode> = {
    course: <Video className="w-4 h-4" />,
    article: <FileText className="w-4 h-4" />,
    qa: <MessageSquare className="w-4 h-4" />,
    live: <Radio className="w-4 h-4" />,
    review: <ClipboardCheck className="w-4 h-4" />,
    other: <MoreHorizontal className="w-4 h-4" />,
  }
  return icons[type] || icons.other
}

// Tab 类型
type TabType = 'available' | 'in_progress' | 'completed'

export default function MyTasksPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('available')
  const [tasks, setTasks] = useState<InstructorTask[]>([])
  const [stats, setStats] = useState<TaskStats | null>(null)
  const [loading, setLoading] = useState(true)
  
  // 提交任务弹窗
  const [submitModalOpen, setSubmitModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<InstructorTask | null>(null)
  const [submitContent, setSubmitContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  
  // 放弃任务弹窗
  const [abandonModalOpen, setAbandonModalOpen] = useState(false)
  const [abandonReason, setAbandonReason] = useState('')

  const tabs: { key: TabType; label: string; count?: number }[] = [
    { key: 'available', label: '可领取', count: stats?.available },
    { key: 'in_progress', label: '进行中', count: stats?.inProgress },
    { key: 'completed', label: '已完成', count: stats?.completed },
  ]

  useEffect(() => {
    loadData()
  }, [activeTab])

  const loadData = async () => {
    setLoading(true)
    try {
      const [tasksRes, statsRes] = await Promise.all([
        getInstructorTasks({ status: activeTab }),
        getTaskStats(),
      ])
      if (tasksRes.code === 200) {
        setTasks(tasksRes.data.list)
      }
      if (statsRes.code === 200) {
        setStats(statsRes.data)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptTask = async (task: InstructorTask) => {
    if (!confirm('确定领取此任务吗？领取后请在截止日期前完成。')) return
    
    const res = await acceptTask(task.id)
    if (res.code === 200) {
      loadData()
    }
  }

  const handleOpenSubmit = (task: InstructorTask) => {
    setSelectedTask(task)
    setSubmitContent(task.submission?.content || '')
    setSubmitModalOpen(true)
  }

  const handleSubmitTask = async () => {
    if (!selectedTask || !submitContent.trim()) return
    
    setSubmitting(true)
    try {
      const res = await submitTask(selectedTask.id, { content: submitContent })
      if (res.code === 200) {
        setSubmitModalOpen(false)
        setSelectedTask(null)
        setSubmitContent('')
        loadData()
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenAbandon = (task: InstructorTask) => {
    setSelectedTask(task)
    setAbandonReason('')
    setAbandonModalOpen(true)
  }

  const handleAbandonTask = async () => {
    if (!selectedTask) return
    
    const res = await abandonTask(selectedTask.id, abandonReason)
    if (res.code === 200) {
      setAbandonModalOpen(false)
      setSelectedTask(null)
      setAbandonReason('')
      loadData()
    }
  }

  const getDaysLeft = (deadline: string) => {
    const now = new Date()
    const end = new Date(deadline)
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return '已过期'
    if (diff === 0) return '今天截止'
    return `剩余${diff}天`
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 头部 */}
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.back()}
              className="p-1 -ml-1 hover:bg-muted rounded-full transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold">我的任务</h1>
          </div>
        </div>
      </header>

      {/* 统计卡片 */}
      <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">累计奖励</p>
            <p className="text-2xl font-bold text-primary">
              {stats?.totalReward || 0}
              <span className="text-sm font-normal ml-1">积分</span>
            </p>
          </div>
          <Coins className="w-10 h-10 text-primary/30" />
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="sticky top-[57px] z-10 bg-background border-b border-border">
        <div className="flex">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex-1 py-3 text-sm font-medium relative transition-colors",
                activeTab === tab.key 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={cn(
                  "ml-1 px-1.5 py-0.5 text-xs rounded-full",
                  activeTab === tab.key 
                    ? "bg-primary/10 text-primary" 
                    : "bg-muted text-muted-foreground"
                )}>
                  {tab.count}
                </span>
              )}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 任务列表 */}
      <div className="p-4 space-y-3">
        {loading ? (
          // 骨架屏
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card rounded-xl p-4 border border-border space-y-3">
              <div className="flex items-start justify-between">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-12 w-full" />
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ))
        ) : tasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              {activeTab === 'available' ? '暂无可领取的任务' : 
               activeTab === 'in_progress' ? '暂无进行中的任务' : '暂无已完成的任务'}
            </p>
          </div>
        ) : (
          tasks.map(task => (
            <div 
              key={task.id}
              className="bg-card rounded-xl border border-border overflow-hidden"
            >
              <div className="p-4">
                {/* 标题行 */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full",
                      getTaskTypeColor(task.type)
                    )}>
                      <TaskTypeIcon type={task.type} />
                      {getTaskTypeLabel(task.type)}
                    </span>
                    <h3 className="font-medium line-clamp-1">{task.title}</h3>
                  </div>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full flex-shrink-0",
                    getTaskStatusColor(task.status)
                  )}>
                    {getTaskStatusLabel(task.status)}
                  </span>
                </div>

                {/* 描述 */}
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {task.description}
                </p>

                {/* 要求 */}
                {task.requirements && task.requirements.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground mb-1">任务要求：</p>
                    <div className="flex flex-wrap gap-1">
                      {task.requirements.slice(0, 3).map((req, i) => (
                        <span 
                          key={i}
                          className="text-xs px-2 py-0.5 bg-muted rounded-full"
                        >
                          {req}
                        </span>
                      ))}
                      {task.requirements.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{task.requirements.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* 信息行 */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span className={cn(
                      getDaysLeft(task.deadline).includes('已过期') && "text-red-500"
                    )}>
                      {getDaysLeft(task.deadline)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-primary">
                    <Gift className="w-4 h-4" />
                    <span>{task.reward.points}积分</span>
                    {task.reward.bonus && (
                      <span className="text-amber-600">+¥{task.reward.bonus}</span>
                    )}
                  </div>
                </div>

                {/* 已提交内容 */}
                {task.submission && (
                  <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">已提交内容：</p>
                    <p className="text-sm line-clamp-2">{task.submission.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      提交于 {task.submission.submittedAt}
                    </p>
                  </div>
                )}
              </div>

              {/* 操作按钮 */}
              <div className="border-t border-border p-3 flex gap-2">
                {task.status === 'available' && (
                  <Button 
                    className="flex-1"
                    onClick={() => handleAcceptTask(task)}
                  >
                    领取任务
                  </Button>
                )}
                {task.status === 'in_progress' && (
                  <>
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleOpenAbandon(task)}
                    >
                      放弃任务
                    </Button>
                    <Button 
                      className="flex-1"
                      onClick={() => handleOpenSubmit(task)}
                    >
                      提交成果
                    </Button>
                  </>
                )}
                {task.status === 'submitted' && (
                  <div className="flex-1 flex items-center justify-center gap-2 text-orange-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">等待审核中</span>
                  </div>
                )}
                {task.status === 'completed' && (
                  <div className="flex-1 flex items-center justify-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">已完成，奖励已发放</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 提交任务弹窗 */}
      {submitModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="w-full bg-background rounded-t-2xl max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
              <h3 className="font-semibold">提交任务成果</h3>
              <button 
                onClick={() => setSubmitModalOpen(false)}
                className="p-1 hover:bg-muted rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">任务</p>
                <p className="font-medium">{selectedTask.title}</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  成果描述 <span className="text-red-500">*</span>
                </label>
                <Textarea
                  value={submitContent}
                  onChange={(e) => setSubmitContent(e.target.value)}
                  placeholder="请描述您的任务完成情况和成果..."
                  rows={5}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  附件（可选）
                </label>
                <button className="w-full border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">点击上传附件</p>
                </button>
              </div>

              <Button 
                className="w-full"
                disabled={!submitContent.trim() || submitting}
                onClick={handleSubmitTask}
              >
                {submitting ? '提交中...' : '确认提交'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 放弃任务弹窗 */}
      {abandonModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-background rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-center">确认放弃任务</h3>
            </div>
            
            <div className="p-4 space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                放弃后任务将重新进入可领取状态，确定要放弃吗？
              </p>

              <div>
                <label className="block text-sm font-medium mb-2">
                  放弃原因（可选）
                </label>
                <Textarea
                  value={abandonReason}
                  onChange={(e) => setAbandonReason(e.target.value)}
                  placeholder="请输入放弃原因..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setAbandonModalOpen(false)}
                >
                  取消
                </Button>
                <Button 
                  variant="destructive"
                  className="flex-1"
                  onClick={handleAbandonTask}
                >
                  确认放弃
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
