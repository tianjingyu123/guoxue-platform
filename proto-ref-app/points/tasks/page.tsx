'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, FileText, Users, ShoppingBag, CheckCircle, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { DataState } from '@/components/data-state'
import { getPointsInfo, getPointsTasks, completeTask } from '@/lib/api/points'
import type { PointsInfo, PointsTask } from '@/lib/types/points'

const TASK_ICONS: Record<string, React.ReactNode> = {
  Calendar: <Calendar className="w-5 h-5" />,
  FileText: <FileText className="w-5 h-5" />,
  Users: <Users className="w-5 h-5" />,
  ShoppingBag: <ShoppingBag className="w-5 h-5" />,
}

const TASK_COLORS = [
  'text-primary bg-primary/10',
  'text-blue-600 bg-blue-50',
  'text-green-600 bg-green-50',
  'text-amber-600 bg-amber-50',
  'text-purple-600 bg-purple-50',
]

export default function PointsTasksPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pointsInfo, setPointsInfo] = useState<PointsInfo | null>(null)
  const [tasks, setTasks] = useState<PointsTask[]>([])
  const [completing, setCompleting] = useState<number | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [infoRes, tasksRes] = await Promise.all([getPointsInfo(), getPointsTasks()])
      if (infoRes.code === 200) setPointsInfo(infoRes.data)
      else setError('加载积分信息失败')
      if (tasksRes.code === 200) setTasks(tasksRes.data)
    } catch {
      setError('加载失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async (task: PointsTask) => {
    if (task.completed || completing !== null) return
    setCompleting(task.id)
    try {
      const res = await completeTask(task.id)
      if (res.code === 200) {
        setTasks(prev =>
          prev.map(t => (t.id === task.id ? { ...t, completed: true } : t))
        )
        if (pointsInfo) {
          setPointsInfo({
            ...pointsInfo,
            balance: pointsInfo.balance + res.data.points,
            todayEarned: pointsInfo.todayEarned + res.data.points,
          })
        }
      }
    } finally {
      setCompleting(null)
    }
  }

  const completedCount = tasks.filter(t => t.completed).length
  const totalTasks = tasks.length

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} className="p-1">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">积分任务</h1>
          <div className="w-8" />
        </div>
      </div>

      <DataState
        loading={loading}
        error={error}
        empty={tasks.length === 0}
        onRetry={loadData}
        skeleton={
          <div className="p-4 space-y-4">
            <div className="h-36 bg-gray-200 rounded-2xl animate-pulse" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        }
      >
        <div className="pb-20">
          {/* 积分总览 */}
          {pointsInfo && (
            <div className="mx-4 mt-4 p-5 bg-gradient-to-br from-gold to-yellow-600 rounded-2xl text-white">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-sm opacity-80 mb-1">当前积分</div>
                  <div className="text-4xl font-bold">{pointsInfo.balance.toLocaleString()}</div>
                  <div className="text-sm opacity-70 mt-1">今日已获 +{pointsInfo.todayEarned}</div>
                </div>
                <button
                  onClick={() => router.push('/points/exchange')}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-full text-sm font-medium flex items-center gap-1 transition-colors"
                >
                  积分兑换 <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              {/* 任务完成进度 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="opacity-80">今日任务进度</span>
                  <span className="font-semibold">{completedCount}/{totalTasks}</span>
                </div>
                <Progress
                  value={totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0}
                  className="h-2 bg-white/20"
                />
              </div>
            </div>
          )}

          {/* 任务列表 */}
          <div className="mx-4 mt-5">
            <h2 className="text-sm font-semibold text-foreground mb-3">可完成任务</h2>
            <div className="space-y-2">
              {tasks.map((task, idx) => (
                <Card key={task.id} className={`p-4 ${task.completed ? 'opacity-60' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      TASK_COLORS[idx % TASK_COLORS.length]
                    }`}>
                      {TASK_ICONS[task.icon] ?? <Calendar className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{task.title}</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800">
                          +{task.points} 积分
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{task.limit}</div>
                      {task.max !== undefined && task.current !== undefined && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span>进度</span>
                            <span>{task.current}/{task.max}</span>
                          </div>
                          <Progress value={(task.current / task.max) * 100} className="h-1.5" />
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      {task.completed ? (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span>已完成</span>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleComplete(task)}
                          disabled={completing === task.id}
                          className="h-7 px-3 text-xs bg-primary hover:bg-primary/90"
                        >
                          {completing === task.id ? '...' : task.action}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* 其他获取方式 */}
          <div className="mx-4 mt-6 p-4 bg-muted/50 rounded-xl">
            <h4 className="text-sm font-semibold text-foreground mb-2">更多积分获取方式</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• 每次消费 ¥1 = 1 积分</li>
              <li>• 邀请好友注册 = 100 积分</li>
              <li>• 参与平台活动可获得额外积分</li>
            </ul>
          </div>
        </div>
      </DataState>
    </div>
  )
}
