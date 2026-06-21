"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Gift, Calendar, Check, Coins, BookOpen, MessageCircle, Share2, Eye, Star, Flame, ChevronRight, Award } from "lucide-react"
import { cn } from "@/lib/utils"

// 任务类型
interface DailyTask {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  points: number
  progress: number
  target: number
  completed: boolean
  action: string
  actionUrl: string
}

// 签到奖励配置
const checkInRewards = [
  { day: 1, points: 5 },
  { day: 2, points: 10 },
  { day: 3, points: 15 },
  { day: 4, points: 20 },
  { day: 5, points: 30 },
  { day: 6, points: 40 },
  { day: 7, points: 100, isSpecial: true },
]

// Mock 任务数据
const mockTasks: DailyTask[] = [
  {
    id: "read",
    title: "阅读文章",
    description: "阅读任意1篇文章",
    icon: <BookOpen className="w-5 h-5" />,
    points: 10,
    progress: 0,
    target: 1,
    completed: false,
    action: "去阅读",
    actionUrl: "/discover",
  },
  {
    id: "comment",
    title: "发表评论",
    description: "在任意内容下发表评论",
    icon: <MessageCircle className="w-5 h-5" />,
    points: 15,
    progress: 0,
    target: 1,
    completed: false,
    action: "去评论",
    actionUrl: "/discover",
  },
  {
    id: "share",
    title: "分享内容",
    description: "分享任意内容给好友",
    icon: <Share2 className="w-5 h-5" />,
    points: 20,
    progress: 0,
    target: 1,
    completed: false,
    action: "去分享",
    actionUrl: "/discover",
  },
  {
    id: "study",
    title: "学习课程",
    description: "学习课程满10分钟",
    icon: <Eye className="w-5 h-5" />,
    points: 30,
    progress: 5,
    target: 10,
    completed: false,
    action: "去学习",
    actionUrl: "/mine/my-courses",
  },
  {
    id: "collect",
    title: "收藏内容",
    description: "收藏2篇喜欢的内容",
    icon: <Star className="w-5 h-5" />,
    points: 10,
    progress: 1,
    target: 2,
    completed: false,
    action: "去收藏",
    actionUrl: "/discover",
  },
]

export default function DailyTasksPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [totalPoints, setTotalPoints] = useState(1280)
  const [streak, setStreak] = useState(4)
  const [todayCheckedIn, setTodayCheckedIn] = useState(false)
  const [tasks, setTasks] = useState<DailyTask[]>(mockTasks)
  const [showRewardAnim, setShowRewardAnim] = useState(false)
  const [earnedPoints, setEarnedPoints] = useState(0)

  // 获取本周签到状态
  const [weekCheckIns, setWeekCheckIns] = useState<boolean[]>([true, true, true, true, false, false, false])

  useEffect(() => {
    // 从 localStorage 加载数据
    const savedData = localStorage.getItem("daily_tasks_data")
    if (savedData) {
      try {
        const data = JSON.parse(savedData)
        const today = new Date().toDateString()
        if (data.lastCheckIn === today) {
          setTodayCheckedIn(true)
        }
        setStreak(data.streak || 0)
        setTotalPoints(data.points || 1280)
        if (data.tasks) {
          setTasks(data.tasks)
        }
        if (data.weekCheckIns) {
          setWeekCheckIns(data.weekCheckIns)
        }
      } catch (e) {
        console.error("Failed to parse saved data")
      }
    }
    setIsLoading(false)
  }, [])

  // 保存数据
  const saveData = (updates: Partial<{
    lastCheckIn: string
    streak: number
    points: number
    tasks: DailyTask[]
    weekCheckIns: boolean[]
  }>) => {
    const savedData = localStorage.getItem("daily_tasks_data")
    const data = savedData ? JSON.parse(savedData) : {}
    const newData = { ...data, ...updates }
    localStorage.setItem("daily_tasks_data", JSON.stringify(newData))
  }

  // 签到
  const handleCheckIn = () => {
    if (todayCheckedIn) return

    const newStreak = streak + 1
    const rewardIndex = Math.min(newStreak - 1, 6)
    const reward = checkInRewards[rewardIndex].points
    const newPoints = totalPoints + reward
    const newWeekCheckIns = [...weekCheckIns]
    const dayIndex = new Date().getDay()
    newWeekCheckIns[dayIndex === 0 ? 6 : dayIndex - 1] = true

    setTodayCheckedIn(true)
    setStreak(newStreak)
    setTotalPoints(newPoints)
    setWeekCheckIns(newWeekCheckIns)
    setEarnedPoints(reward)
    setShowRewardAnim(true)

    saveData({
      lastCheckIn: new Date().toDateString(),
      streak: newStreak,
      points: newPoints,
      weekCheckIns: newWeekCheckIns,
    })

    setTimeout(() => setShowRewardAnim(false), 2000)
  }

  // 完成任务
  const completeTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task || task.completed) return

    const newTasks = tasks.map(t => 
      t.id === taskId ? { ...t, completed: true, progress: t.target } : t
    )
    const newPoints = totalPoints + task.points

    setTasks(newTasks)
    setTotalPoints(newPoints)
    setEarnedPoints(task.points)
    setShowRewardAnim(true)

    saveData({ tasks: newTasks, points: newPoints })

    setTimeout(() => setShowRewardAnim(false), 2000)
  }

  // 计算今日已获积分
  const todayEarnedPoints = tasks.filter(t => t.completed).reduce((sum, t) => sum + t.points, 0) +
    (todayCheckedIn ? checkInRewards[Math.min(streak - 1, 6)].points : 0)

  // 计算任务完成数
  const completedCount = tasks.filter(t => t.completed).length

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <div className="animate-pulse">
          <div className="h-48 bg-gradient-to-b from-[#C41E3A] to-[#A01830]" />
          <div className="p-4 space-y-4">
            <div className="h-32 bg-white rounded-2xl" />
            <div className="h-64 bg-white rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-24">
      {/* 奖励动画 */}
      {showRewardAnim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="animate-bounce bg-gradient-to-r from-[#C9A96E] to-[#E8C878] text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2">
            <Coins className="w-5 h-5" />
            <span className="text-lg font-bold">+{earnedPoints} 积分</span>
          </div>
        </div>
      )}

      {/* 顶部背景 */}
      <div className="bg-gradient-to-b from-[#C41E3A] to-[#A01830] pt-12 pb-24 px-4 relative overflow-hidden">
        {/* 装饰 */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        {/* 导航 */}
        <div className="flex items-center justify-between mb-6 relative z-10">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-lg font-bold text-white">每日任务</h1>
          <button onClick={() => router.push("/points/exchange")} className="p-2 -mr-2">
            <Gift className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* 积分展示 */}
        <div className="text-center relative z-10">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Coins className="w-5 h-5 text-[#FFD700]" />
            <span className="text-sm text-white/80">我的积分</span>
          </div>
          <div className="text-4xl font-black text-white mb-2">{totalPoints.toLocaleString()}</div>
          <div className="text-sm text-white/60">今日已获 +{todayEarnedPoints} 积分</div>
        </div>
      </div>

      {/* 签到卡片 */}
      <div className="px-4 -mt-16 relative z-10">
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
          {/* 签到头部 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#FF8C42] flex items-center justify-center">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-sm font-bold text-[#2C2C2C]">连续签到 {streak} 天</div>
                <div className="text-xs text-[#999999]">再签{7 - (streak % 7)}天可获100积分大奖</div>
              </div>
            </div>
            <button
              onClick={handleCheckIn}
              disabled={todayCheckedIn}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-bold transition-all",
                todayCheckedIn
                  ? "bg-[#E8E3DB] text-[#999999]"
                  : "bg-gradient-to-r from-[#C41E3A] to-[#E74C3C] text-white shadow-md active:scale-95"
              )}
            >
              {todayCheckedIn ? "已签到" : "签到"}
            </button>
          </div>

          {/* 签到日历 */}
          <div className="grid grid-cols-7 gap-2">
            {checkInRewards.map((reward, index) => {
              const isChecked = weekCheckIns[index]
              const isToday = index === (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1)
              const isFuture = index > (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1)

              return (
                <div key={reward.day} className="text-center">
                  <div
                    className={cn(
                      "w-full aspect-square rounded-xl flex flex-col items-center justify-center mb-1 relative overflow-hidden",
                      isChecked
                        ? "bg-gradient-to-br from-[#C41E3A] to-[#E74C3C]"
                        : isToday
                        ? "bg-gradient-to-br from-[#FFF5F0] to-[#FFE4D6] border-2 border-[#C41E3A] border-dashed"
                        : "bg-[#F5F0E8]"
                    )}
                  >
                    {isChecked ? (
                      <Check className="w-5 h-5 text-white" />
                    ) : reward.isSpecial ? (
                      <Award className="w-5 h-5 text-[#C9A96E]" />
                    ) : (
                      <Coins className="w-4 h-4 text-[#C9A96E]" />
                    )}
                    {reward.isSpecial && !isChecked && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF6B35] rounded-full flex items-center justify-center">
                        <span className="text-[8px] text-white font-bold">!</span>
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] text-[#666666]">
                    {reward.isSpecial ? (
                      <span className="text-[#C9A96E] font-bold">+{reward.points}</span>
                    ) : (
                      `+${reward.points}`
                    )}
                  </div>
                  <div className="text-[10px] text-[#999999]">第{reward.day}天</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 任务列表 */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* 任务头部 */}
          <div className="p-4 border-b border-[#F5F0E8] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#C41E3A]" />
              <span className="font-bold text-[#2C2C2C]">每日任务</span>
            </div>
            <span className="text-sm text-[#999999]">
              已完成 <span className="text-[#C41E3A] font-bold">{completedCount}</span>/{tasks.length}
            </span>
          </div>

          {/* 任务项 */}
          <div className="divide-y divide-[#F5F0E8]">
            {tasks.map((task) => (
              <div key={task.id} className="p-4 flex items-center gap-4">
                {/* 图标 */}
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                    task.completed ? "bg-[#E8F5E9]" : "bg-[#FFF5F0]"
                  )}
                >
                  <div className={task.completed ? "text-[#4CAF50]" : "text-[#FF6B35]"}>
                    {task.completed ? <Check className="w-5 h-5" /> : task.icon}
                  </div>
                </div>

                {/* 信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-[#2C2C2C]">{task.title}</span>
                    <span className="text-xs text-[#C9A96E] bg-[#C9A96E]/10 px-2 py-0.5 rounded-full">
                      +{task.points}积分
                    </span>
                  </div>
                  <div className="text-xs text-[#999999] mb-2">{task.description}</div>
                  {/* 进度条 */}
                  {!task.completed && task.target > 1 && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-[#F5F0E8] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#FF6B35] to-[#FF8C42] rounded-full transition-all"
                          style={{ width: `${(task.progress / task.target) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-[#999999]">
                        {task.progress}/{task.target}
                      </span>
                    </div>
                  )}
                </div>

                {/* 操作按钮 */}
                <button
                  onClick={() => {
                    if (task.completed) return
                    // Demo: 直接完成任务
                    if (task.progress >= task.target - 1) {
                      completeTask(task.id)
                    } else {
                      router.push(task.actionUrl)
                    }
                  }}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium flex-shrink-0 transition-all",
                    task.completed
                      ? "bg-[#E8F5E9] text-[#4CAF50]"
                      : "bg-gradient-to-r from-[#FF6B35] to-[#FF8C42] text-white active:scale-95"
                  )}
                >
                  {task.completed ? "已完成" : task.action}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 积分兑换入口 */}
        <div 
          onClick={() => router.push("/points/exchange")}
          className="mt-4 bg-gradient-to-r from-[#C9A96E] to-[#E8C878] rounded-2xl p-4 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Gift className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-white font-bold">积分商城</div>
              <div className="text-white/80 text-sm">用积分兑换精美好礼</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-white/80" />
        </div>

        {/* 规则说明 */}
        <div className="mt-4 p-4 bg-white rounded-2xl">
          <div className="text-sm font-bold text-[#2C2C2C] mb-2">活动规则</div>
          <ul className="text-xs text-[#999999] space-y-1">
            <li>1. 每日任务每天0点重置，请及时完成</li>
            <li>2. 连续签到7天可获得100积分大奖</li>
            <li>3. 断签后连续天数重新计算</li>
            <li>4. 积分可在积分商城兑换课程、实物等奖品</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
