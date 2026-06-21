"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
  ChevronLeft, ChevronRight, GraduationCap, Video, MapPin, Mic,
  CheckCircle, Clock, AlertTriangle, Trophy, Gift, Calendar,
  CreditCard, Users, Star, RefreshCw, ArrowRight, Target, Sparkles
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"

// ============================================
// 成员信息 Mock
// ============================================
const memberInfo = {
  id: "1",
  name: "张玄风",
  avatar: "/placeholder.svg",
  title: "研究院成员",
  joinDate: "2023-12-15",
  expireDate: "2024-12-15",
  daysLeft: 40,
  circleName: "八字命理研习社",
  circleId: "1",
  depositStatus: "paid" as "paid" | "refunding" | "refunded",
  depositAmount: 10000,
}

// ============================================
// 任务进度 Mock
// ============================================
interface Task {
  id: string
  type: "monthly" | "quarterly" | "yearly"
  title: string
  icon: typeof Video
  target: number
  completed: number
  period: string
  deadline: string
  status: "completed" | "in_progress" | "not_started"
}

const tasks: Task[] = [
  {
    id: "1",
    type: "monthly",
    title: "线上直播",
    icon: Video,
    target: 2,
    completed: 2,
    period: "2024年1月",
    deadline: "2024-01-31",
    status: "completed"
  },
  {
    id: "2",
    type: "monthly",
    title: "线上直播",
    icon: Video,
    target: 2,
    completed: 1,
    period: "2024年2月",
    deadline: "2024-02-29",
    status: "in_progress"
  },
  {
    id: "3",
    type: "quarterly",
    title: "线下小范围交流",
    icon: MapPin,
    target: 1,
    completed: 1,
    period: "2024年Q1",
    deadline: "2024-03-31",
    status: "completed"
  },
  {
    id: "4",
    type: "yearly",
    title: "大范围交流分享",
    icon: Mic,
    target: 1,
    completed: 0,
    period: "2024年",
    deadline: "2024-12-31",
    status: "not_started"
  },
]

// ============================================
// 收益记录 Mock
// ============================================
const incomeRecords = [
  { id: "1", title: "研究院分红", amount: 500, date: "2024-01-15", type: "dividend" },
  { id: "2", title: "优秀老师奖励", amount: 200, date: "2024-01-10", type: "reward" },
  { id: "3", title: "直播打赏分成", amount: 150, date: "2024-01-05", type: "share" },
]

// ============================================
// 近期活动 Mock
// ============================================
const upcomingEvents = [
  { 
    id: "1", 
    title: "月度研讨会：八字流年解析", 
    date: "2024-02-15 19:00",
    type: "online",
    enrolled: true
  },
  { 
    id: "2", 
    title: "季度线下交流会·北京站", 
    date: "2024-03-20 14:00",
    type: "offline",
    enrolled: false
  },
]

// ============================================
// 主组件
// ============================================
export default function MyInstitutePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"tasks" | "income" | "events">("tasks")

  // 计算任务完成率
  const completedTasks = tasks.filter(t => t.status === "completed").length
  const totalTasks = tasks.length
  const taskCompletionRate = Math.round((completedTasks / totalTasks) * 100)

  // 总收益
  const totalIncome = incomeRecords.reduce((sum, r) => sum + r.amount, 0)

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto pb-24">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-operator text-white">
        <div className="flex items-center justify-between h-12 px-4">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-base">我的研究院</h1>
          <Link href="/institute" className="text-xs opacity-80">
            研究院首页
          </Link>
        </div>
      </header>

      {/* 成员信息卡片 */}
      <div className="bg-gradient-to-b from-operator to-operator/80 px-4 pb-6">
        <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="w-14 h-14 ring-2 ring-white/30">
              <AvatarImage src={memberInfo.avatar} />
              <AvatarFallback className="bg-white/20 text-white">
                {memberInfo.name[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">{memberInfo.name}</span>
                <Badge className="bg-white/20 text-white text-[10px]">
                  <GraduationCap className="w-3 h-3 mr-1" />
                  研究院成员
                </Badge>
              </div>
              <p className="text-xs text-white/70 mt-0.5">
                {memberInfo.circleName}
              </p>
            </div>
          </div>

          {/* 有效期 */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/70">会员有效期</span>
            <span className="text-xs text-white">
              {memberInfo.joinDate} ~ {memberInfo.expireDate}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Progress value={(memberInfo.daysLeft / 365) * 100} className="flex-1 h-1.5 bg-white/20" />
            <span className={cn(
              "text-xs font-medium",
              memberInfo.daysLeft <= 30 ? "text-amber-300" : "text-white"
            )}>
              剩余{memberInfo.daysLeft}天
            </span>
          </div>

          {memberInfo.daysLeft <= 30 && (
            <div className="mt-3 flex items-center justify-between p-2 bg-amber-500/20 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-300" />
                <span className="text-xs text-amber-100">会员即将到期</span>
              </div>
              <Link href="/renew?type=institute">
                <Button size="sm" className="h-6 text-xs bg-white text-operator hover:bg-white/90">
                  立即续费
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="px-4 -mt-3">
        <Card className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-operator">{taskCompletionRate}%</p>
              <p className="text-[10px] text-muted-foreground">任务完成率</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">¥{totalIncome}</p>
              <p className="text-[10px] text-muted-foreground">累计收益</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gold">
                {memberInfo.depositStatus === "paid" ? "待退还" : 
                 memberInfo.depositStatus === "refunding" ? "退还中" : "已退还"}
              </p>
              <p className="text-[10px] text-muted-foreground">保证金状态</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tab切换 */}
      <div className="sticky top-12 z-40 bg-background border-b border-border mt-4">
        <div className="flex items-center px-4">
          {[
            { key: "tasks", label: "任务进度", icon: Target },
            { key: "income", label: "我的收益", icon: CreditCard },
            { key: "events", label: "活动日程", icon: Calendar },
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium border-b-2 transition-colors",
                  activeTab === tab.key
                    ? "border-operator text-operator"
                    : "border-transparent text-muted-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* 内容区 */}
      <main className="p-4 space-y-4">
        {activeTab === "tasks" && (
          <>
            {/* 任务总览 */}
            <Card className="p-4 bg-gradient-to-r from-operator/10 to-operator/5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Target className="w-4 h-4 text-operator" />
                  任务完成情况
                </h3>
                <span className="text-xs text-muted-foreground">
                  完成全部任务可退还保证金
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-20 h-20">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50" cy="50" r="40"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-muted/30"
                    />
                    <circle
                      cx="50" cy="50" r="40"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${taskCompletionRate * 2.51} 251`}
                      className="text-operator"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold">{taskCompletionRate}%</span>
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">月度任务</span>
                    <span className="text-green-600">2/2 已完成</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">季度任务</span>
                    <span className="text-green-600">1/1 已完成</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">年度任务</span>
                    <span className="text-amber-600">0/1 进行中</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* 任务列表 */}
            <div className="space-y-3">
              {tasks.map((task) => {
                const Icon = task.icon
                const progress = (task.completed / task.target) * 100
                return (
                  <Card key={task.id} className="p-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        task.status === "completed" ? "bg-green-100" :
                        task.status === "in_progress" ? "bg-blue-100" : "bg-muted"
                      )}>
                        <Icon className={cn(
                          "w-5 h-5",
                          task.status === "completed" ? "text-green-600" :
                          task.status === "in_progress" ? "text-blue-600" : "text-muted-foreground"
                        )} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{task.title}</span>
                          <Badge className={cn(
                            "text-[10px]",
                            task.status === "completed" ? "bg-green-100 text-green-600" :
                            task.status === "in_progress" ? "bg-blue-100 text-blue-600" :
                            "bg-muted text-muted-foreground"
                          )}>
                            {task.status === "completed" ? "已完成" :
                             task.status === "in_progress" ? "进行中" : "未开始"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] text-muted-foreground">
                            {task.period} · 截止 {task.deadline}
                          </span>
                          <span className="text-xs font-medium">
                            {task.completed}/{task.target}
                          </span>
                        </div>
                        <Progress value={progress} className="h-1 mt-2" />
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>

            {/* 保证金状态 */}
            <Card className="p-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-operator" />
                保证金状态
              </h3>
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl">
                <div>
                  <p className="text-2xl font-bold">¥{memberInfo.depositAmount.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {memberInfo.depositStatus === "paid" ? "完成全部任务后可申请退还" :
                     memberInfo.depositStatus === "refunding" ? "退还申请审核中" : "已退还至原支付账户"}
                  </p>
                </div>
                {memberInfo.depositStatus === "paid" && taskCompletionRate === 100 && (
                  <Button size="sm" className="bg-operator hover:bg-operator/90">
                    申请退还
                  </Button>
                )}
              </div>
            </Card>
          </>
        )}

        {activeTab === "income" && (
          <>
            {/* 收益总览 */}
            <Card className="p-4 bg-gradient-to-r from-green-50 to-green-50/50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-green-600" />
                  累计收益
                </h3>
                <Link href="/mine/wallet" className="text-xs text-primary flex items-center gap-1">
                  钱包 <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <p className="text-3xl font-bold text-green-600">¥{totalIncome}</p>
              <p className="text-xs text-muted-foreground mt-1">
                包含分红、奖励、直播分成等
              </p>
            </Card>

            {/* 收益记录 */}
            <Card className="p-4">
              <h3 className="font-medium mb-3">收益明细</h3>
              <div className="space-y-3">
                {incomeRecords.map((record) => (
                  <div key={record.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{record.title}</p>
                      <p className="text-[10px] text-muted-foreground">{record.date}</p>
                    </div>
                    <span className="font-bold text-green-600">+¥{record.amount}</span>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-3" size="sm">
                查看全部记录
              </Button>
            </Card>
          </>
        )}

        {activeTab === "events" && (
          <>
            {/* 近期活动 */}
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <Card key={event.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={cn(
                          "text-[10px]",
                          event.type === "online" ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"
                        )}>
                          {event.type === "online" ? "线上" : "线下"}
                        </Badge>
                        {event.enrolled && (
                          <Badge className="text-[10px] bg-operator/10 text-operator">
                            已报名
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-medium text-sm">{event.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {event.date}
                      </p>
                    </div>
                    {!event.enrolled && (
                      <Button size="sm" variant="outline" className="text-xs">
                        报名
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            <Link href="/institute/events">
              <Button variant="outline" className="w-full">
                查看更多活动
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </>
        )}
      </main>
    </div>
  )
}
