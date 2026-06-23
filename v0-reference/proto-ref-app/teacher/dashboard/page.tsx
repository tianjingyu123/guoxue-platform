"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  ChevronLeft,
  Star,
  Users,
  BookOpen,
  Wallet,
  FileText,
  MessageSquare,
  Calendar,
  TrendingUp,
  Clock,
  ChevronRight,
  Bell,
  Settings,
  Award,
  Video,
  PenSquare,
  CheckCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// 骨架屏
function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-muted rounded", className)} />
}

// Mock 数据
const mockStats = {
  rating: 4.9,
  ratingCount: 328,
  studentCount: 3256,
  courseCount: 12,
  totalIncome: 128650,
  monthIncome: 15680,
}

const mockPendingItems = [
  { id: 1, type: 'homework', title: '八字命理入门-第3章作业', count: 8, time: '最近提交: 10分钟前' },
  { id: 2, type: 'question', title: '学员提问待回答', count: 5, time: '最近提问: 30分钟前' },
  { id: 3, type: 'booking', title: '预约咨询待确认', count: 2, time: '最近预约: 1小时前' },
  { id: 4, type: 'review', title: '课程评价待回复', count: 3, time: '最近评价: 2小时前' },
]

const mockRecentCourses = [
  { id: 1, title: '八字命理入门实战班', students: 1256, rating: 4.9, status: 'active' },
  { id: 2, title: '紫微斗数进阶课程', students: 890, rating: 4.8, status: 'active' },
  { id: 3, title: '风水堪舆基础', students: 567, rating: 4.7, status: 'draft' },
]

const mockIncomeTrend = [
  { month: '1月', income: 12500 },
  { month: '2月', income: 15200 },
  { month: '3月', income: 11800 },
  { month: '4月', income: 18600 },
  { month: '5月', income: 16400 },
  { month: '6月', income: 15680 },
]

export default function TeacherDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(mockStats)
  const [pendingItems, setPendingItems] = useState(mockPendingItems)
  const [courses, setCourses] = useState(mockRecentCourses)
  const [incomeTrend, setIncomeTrend] = useState(mockIncomeTrend)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500)
    return () => clearTimeout(timer)
  }, [])

  const getPendingIcon = (type: string) => {
    switch (type) {
      case 'homework': return <FileText className="w-5 h-5 text-blue-600" />
      case 'question': return <MessageSquare className="w-5 h-5 text-green-600" />
      case 'booking': return <Calendar className="w-5 h-5 text-purple-600" />
      case 'review': return <Star className="w-5 h-5 text-orange-600" />
      default: return <Bell className="w-5 h-5 text-gray-600" />
    }
  }

  const getPendingPath = (type: string) => {
    switch (type) {
      case 'homework': return '/teacher/homework'
      case 'question': return '/teacher/questions'
      case 'booking': return '/teacher/bookings'
      case 'review': return '/teacher/reviews'
      default: return '/teacher/dashboard'
    }
  }

  const maxIncome = Math.max(...incomeTrend.map(d => d.income))

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="w-8 h-8 rounded-full" />
          </div>
        </header>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 头部 */}
      <header className="sticky top-0 z-10 bg-primary text-primary-foreground px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-1 -ml-1 rounded-full hover:bg-white/10">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold">讲师工作台</h1>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => router.push('/notifications')}
              className="p-2 rounded-full hover:bg-white/10 relative"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <button 
              onClick={() => router.push('/teacher/settings')}
              className="p-2 rounded-full hover:bg-white/10"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* 讲师身份卡片 */}
      <div className="bg-primary text-primary-foreground px-4 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
            <Award className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-lg">李明德</span>
              <span className="px-2 py-0.5 text-xs bg-gold/20 text-gold rounded-full">金牌讲师</span>
            </div>
            <p className="text-sm text-white/70 mt-1">命理咨询师 · 从业20年</p>
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-4 h-4 fill-gold text-gold" />
              <span className="text-sm font-medium">{stats.rating}</span>
              <span className="text-xs text-white/60">({stats.ratingCount}评价)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-3 space-y-4">
        {/* 数据概览 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Users className="w-4 h-4" />
              <span className="text-sm">累计学员</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.studentCount.toLocaleString()}</p>
            <p className="text-xs text-green-600 mt-1">+128 本月新增</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <BookOpen className="w-4 h-4" />
              <span className="text-sm">课程数量</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.courseCount}</p>
            <p className="text-xs text-muted-foreground mt-1">3 门草稿中</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Wallet className="w-4 h-4" />
              <span className="text-sm">累计收入</span>
            </div>
            <p className="text-2xl font-bold text-primary">¥{(stats.totalIncome / 10000).toFixed(1)}万</p>
            <p className="text-xs text-muted-foreground mt-1">可提现 ¥8,650</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">本月收入</span>
            </div>
            <p className="text-2xl font-bold text-foreground">¥{stats.monthIncome.toLocaleString()}</p>
            <p className="text-xs text-green-600 mt-1">+12.5% 环比</p>
          </div>
        </div>

        {/* 待处理事项 */}
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-foreground">待处理事项</h3>
            <span className="text-xs text-muted-foreground">
              共 {pendingItems.reduce((sum, item) => sum + item.count, 0)} 项
            </span>
          </div>
          <div className="divide-y divide-border">
            {pendingItems.map(item => (
              <button
                key={item.id}
                onClick={() => router.push(getPendingPath(item.type))}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  {getPendingIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.time}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
                    {item.count}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 收入趋势 */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">收入趋势</h3>
            <button 
              onClick={() => router.push('/teacher/income')}
              className="text-xs text-primary flex items-center gap-1"
            >
              查看详情 <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex items-end gap-2 h-32">
            {incomeTrend.map((item, index) => (
              <div key={item.month} className="flex-1 flex flex-col items-center gap-1">
                <div 
                  className={cn(
                    "w-full rounded-t transition-all",
                    index === incomeTrend.length - 1 ? "bg-primary" : "bg-primary/30"
                  )}
                  style={{ height: `${(item.income / maxIncome) * 100}%`, minHeight: 8 }}
                />
                <span className="text-xs text-muted-foreground">{item.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 我的课程 */}
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-foreground">我的课程</h3>
            <button 
              onClick={() => router.push('/teacher/courses')}
              className="text-xs text-primary flex items-center gap-1"
            >
              全部课程 <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-border">
            {courses.map(course => (
              <button
                key={course.id}
                onClick={() => router.push(`/teacher/courses/${course.id}`)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Video className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{course.title}</p>
                    {course.status === 'draft' && (
                      <span className="px-1.5 py-0.5 text-xs bg-orange-100 text-orange-600 rounded">草稿</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" /> {course.students}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-gold text-gold" /> {course.rating}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>

        {/* 快捷操作 */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-4">
          <h3 className="font-semibold text-foreground mb-3">快捷操作</h3>
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: PenSquare, label: '发布课程', path: '/teacher/courses/create' },
              { icon: Video, label: '开始直播', path: '/live/create' },
              { icon: FileText, label: '发布文章', path: '/teacher/articles/create' },
              { icon: Calendar, label: '预约管理', path: '/teacher/bookings' },
            ].map(item => (
              <button
                key={item.label}
                onClick={() => router.push(item.path)}
                className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xs text-foreground">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
