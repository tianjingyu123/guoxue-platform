"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Play, Award, Clock, RefreshCw, BookOpen, TrendingUp, Calendar, AlertTriangle, Flame } from "lucide-react"
import { cn } from "@/lib/utils"
import { courseApi, type MyCourse } from "@/lib/api"

// 学习统计数据
const studyStats = {
  todayMinutes: 45,
  weekMinutes: 280,
  totalMinutes: 2400,
  streak: 7,
  todayGoal: 60,
  weekGoal: 300,
}

// 模拟数据
const mockCourses: MyCourse[] = [
  {
    id: "1",
    title: "八字命理入门到精通",
    cover: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop",
    instructor: { id: "1", name: "张明远", avatar: "" },
    totalLessons: 32,
    completedLessons: 18,
    progressPercent: 56,
    status: "learning",
    lastStudyAt: "2024-01-15T10:30:00Z",
    lastLesson: { id: "lesson-18", title: "第18课：大运流年的推算" },
    purchasedAt: "2024-01-01T00:00:00Z",
    expireAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7天后过期
  },
  {
    id: "2",
    title: "紫微斗数零基础入门",
    cover: "https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=400&h=300&fit=crop",
    instructor: { id: "2", name: "李玄机", avatar: "" },
    totalLessons: 24,
    completedLessons: 8,
    progressPercent: 33,
    status: "learning",
    lastStudyAt: "2024-01-14T15:20:00Z",
    lastLesson: { id: "lesson-8", title: "第8课：命宫的奥秘" },
    purchasedAt: "2024-01-05T00:00:00Z",
    expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30天后过期
  },
  {
    id: "3",
    title: "风水堪舆实战课程",
    cover: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=300&fit=crop",
    instructor: { id: "3", name: "王德华", avatar: "" },
    totalLessons: 20,
    completedLessons: 20,
    progressPercent: 100,
    status: "completed",
    certificateId: "cert-001",
    purchasedAt: "2023-10-01T00:00:00Z",
  },
  {
    id: "4",
    title: "易经六十四卦详解",
    cover: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop",
    instructor: { id: "4", name: "赵无极", avatar: "" },
    totalLessons: 64,
    completedLessons: 64,
    progressPercent: 100,
    status: "completed",
    certificateId: "cert-002",
    purchasedAt: "2023-08-15T00:00:00Z",
  },
]

// 骨架屏
function CourseSkeleton() {
  return (
    <div className="animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-xl p-3 mb-3 flex gap-3">
          <div className="w-28 h-20 bg-[#F2EFEA] rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-[#F2EFEA] rounded w-full" />
            <div className="h-3 bg-[#F2EFEA] rounded w-2/3" />
            <div className="h-2 bg-[#F2EFEA] rounded w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

// 空状态
function EmptyState({ type }: { type: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-20 h-20 rounded-full bg-[#F5F0E8] flex items-center justify-center mb-4">
        <BookOpen className="w-10 h-10 text-[#C9A96E]" />
      </div>
      <p className="text-[#666666] mb-2">
        {type === "learning" ? "暂无学习中的课程" : "暂无已完结的课程"}
      </p>
      <Link 
        href="/courses-list"
        className="text-[#C41E3A] text-sm font-medium"
      >
        去发现精品课程
      </Link>
    </div>
  )
}

// 课程卡片
function CourseCard({ course }: { course: MyCourse }) {
  const router = useRouter()
  const isCompleted = course.status === "completed"
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) return "今天"
    if (days === 1) return "昨天"
    if (days < 7) return `${days}天前`
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }
  
  const handleClick = () => {
    if (isCompleted) {
      router.push(`/courses/${course.id}`)
    } else {
      router.push(`/courses/${course.id}/learn`)
    }
  }
  
  return (
    <div 
      className="bg-white rounded-xl p-3 mb-3 shadow-sm active:bg-[#F9F6F2] transition-colors"
      onClick={handleClick}
    >
      <div className="flex gap-3">
        {/* 封面 */}
        <div className="w-28 h-20 rounded-lg overflow-hidden flex-shrink-0 relative">
          <img 
            src={course.cover} 
            alt={course.title}
            className="w-full h-full object-cover"
          />
          {isCompleted && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="bg-[#C9A96E] rounded-full p-1.5">
                <Award className="w-4 h-4 text-white" />
              </div>
            </div>
          )}
        </div>
        
        {/* 信息 */}
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-medium text-[#2C2C2C] line-clamp-1 mb-1">
            {course.title}
          </h3>
          <p className="text-[12px] text-[#999999] mb-2">
            {course.instructor.name} · {course.totalLessons}课时
          </p>
          
          {/* 进度条 */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-[#666666]">
                {isCompleted ? "已完成" : `${course.completedLessons}/${course.totalLessons}课时`}
              </span>
              <span className={cn(
                "text-[11px] font-medium",
                isCompleted ? "text-[#C9A96E]" : "text-[#C41E3A]"
              )}>
                {course.progressPercent}%
              </span>
            </div>
            <div className="h-1.5 bg-[#F2EFEA] rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all",
                  isCompleted 
                    ? "bg-gradient-to-r from-[#C9A96E] to-[#D4B896]" 
                    : "bg-gradient-to-r from-[#C41E3A] to-[#E74C3C]"
                )}
                style={{ width: `${course.progressPercent}%` }}
              />
            </div>
          </div>
          
          {/* 底部信息 */}
          <div className="flex items-center justify-between">
            {isCompleted ? (
              <span className="text-[11px] text-[#C9A96E] flex items-center gap-1">
                <Award className="w-3 h-3" />
                已获得证书
              </span>
            ) : (
              <span className="text-[11px] text-[#999999] flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {course.lastStudyAt ? formatDate(course.lastStudyAt) : "未开始学习"}
              </span>
            )}
            
            {!isCompleted && (
              <button 
                className="flex items-center gap-1 px-2.5 py-1 bg-[#C41E3A] text-white text-[11px] font-medium rounded-full"
                onClick={(e) => {
                  e.stopPropagation()
                  router.push(`/courses/${course.id}/player?lesson=${course.lastLesson?.id || ''}`)
                }}
              >
                <Play className="w-3 h-3" fill="white" />
                继续学习
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* 上次学习位置 */}
      {!isCompleted && course.lastLesson && (
        <div className="mt-2 pt-2 border-t border-[#F2EFEA]">
          <p className="text-[11px] text-[#999999] line-clamp-1">
            上次学到: {course.lastLesson.title}
          </p>
        </div>
      )}
      
      {/* 即将过期提醒 */}
      {!isCompleted && course.expireAt && (() => {
        const daysLeft = Math.ceil((new Date(course.expireAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        if (daysLeft <= 7 && daysLeft > 0) {
          return (
            <div className="mt-2 pt-2 border-t border-[#F2EFEA] flex items-center gap-1.5 text-amber-600">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="text-[11px]">课程将在{daysLeft}天后过期，请尽快学习</span>
            </div>
          )
        }
        return null
      })()}
    </div>
  )
}

// 主内容组件
function MyCoursesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = searchParams.get("tab") || "learning"
  
  const [activeTab, setActiveTab] = useState<"learning" | "completed">(initialTab as any)
  const [courses, setCourses] = useState<MyCourse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const tabs = [
    { id: "learning", label: "学习中" },
    { id: "completed", label: "已完结" },
  ]
  
  // 加载数据
  const loadCourses = async (refresh = false) => {
    if (refresh) setIsRefreshing(true)
    else setIsLoading(true)
    
    try {
      // TODO: 替换为真实API
      // const res = await courseApi.myCourses({ status: activeTab })
      // setCourses(res.data)
      
      await new Promise(resolve => setTimeout(resolve, 800))
      setCourses(mockCourses.filter(c => c.status === activeTab))
    } catch (error) {
      console.error("Failed to load courses:", error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }
  
  useEffect(() => {
    loadCourses()
  }, [activeTab])
  
  // 切换Tab
  const handleTabChange = (tab: "learning" | "completed") => {
    setActiveTab(tab)
    router.replace(`/mine/my-courses?tab=${tab}`, { scroll: false })
  }
  
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-50 bg-[#FAF8F5] border-b border-[#E8E3DB]">
        <div className="flex items-center justify-between px-4 h-12">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ChevronLeft className="w-6 h-6 text-[#2C2C2C]" />
          </button>
          <h1 className="text-[17px] font-semibold text-[#2C2C2C]">我的课程</h1>
          <button 
            onClick={() => loadCourses(true)}
            className={cn("p-1 -mr-1", isRefreshing && "animate-spin")}
          >
            <RefreshCw className="w-5 h-5 text-[#666666]" />
          </button>
        </div>
        
        {/* Tab切换 */}
        <div className="flex px-4 gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as any)}
              className={cn(
                "py-3 text-[15px] font-medium relative",
                activeTab === tab.id ? "text-[#C41E3A]" : "text-[#666666]"
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#C41E3A] rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>
      
      {/* 学习统计卡片 */}
      <div className="px-4 pt-4 pb-2">
        <div className="bg-gradient-to-br from-[#C41E3A] to-[#E74C3C] rounded-2xl p-4 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              <span className="font-medium">本周学习统计</span>
            </div>
            <Link href="/courses/study-plan" className="text-xs text-white/80 flex items-center gap-1">
              学习计划 <ChevronLeft className="w-3 h-3 rotate-180" />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{studyStats.todayMinutes}</div>
              <div className="text-xs text-white/70">今日/分钟</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{studyStats.weekMinutes}</div>
              <div className="text-xs text-white/70">本周/分钟</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1">
                <Flame className="w-5 h-5 text-yellow-300" />
                <span className="text-2xl font-bold">{studyStats.streak}</span>
              </div>
              <div className="text-xs text-white/70">连续天数</div>
            </div>
          </div>
          {/* 今日进度 */}
          <div className="mt-3 pt-3 border-t border-white/20">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-white/80">今日目标</span>
              <span>{studyStats.todayMinutes}/{studyStats.todayGoal}分钟</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-yellow-300 rounded-full"
                style={{ width: `${Math.min(100, (studyStats.todayMinutes / studyStats.todayGoal) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* 课程列表 */}
      <div className="p-4">
        {isLoading ? (
          <CourseSkeleton />
        ) : courses.length === 0 ? (
          <EmptyState type={activeTab} />
        ) : (
          <div>
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// 加载状态
function LoadingState() {
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="sticky top-0 z-50 bg-[#FAF8F5] border-b border-[#E8E3DB]">
        <div className="flex items-center justify-center h-12">
          <div className="w-20 h-4 bg-[#F2EFEA] rounded animate-pulse" />
        </div>
      </div>
      <div className="p-4">
        <CourseSkeleton />
      </div>
    </div>
  )
}

// 导出组件
export default function MyCoursesPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <MyCoursesContent />
    </Suspense>
  )
}
