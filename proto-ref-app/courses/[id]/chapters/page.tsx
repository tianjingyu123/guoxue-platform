"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Play, Lock, CheckCircle, Clock, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

// 章节状态类型
type LessonStatus = 'completed' | 'in-progress' | 'available' | 'locked'

// 模拟数据
const mockCourse = {
  id: "1",
  title: "八字命理入门到精通",
  totalLessons: 32,
  completedLessons: 12,
  progressPercent: 38,
}

const mockChapters = [
  {
    id: "ch1",
    title: "第一章 八字基础概念",
    lessons: [
      { id: "l1", title: "1.1 什么是八字命理", duration: 1520, status: 'completed' as LessonStatus },
      { id: "l2", title: "1.2 天干地支详解", duration: 1830, status: 'completed' as LessonStatus },
      { id: "l3", title: "1.3 阴阳五行基础", duration: 2100, status: 'completed' as LessonStatus },
      { id: "l4", title: "1.4 干支配合规律", duration: 1650, status: 'completed' as LessonStatus },
    ]
  },
  {
    id: "ch2",
    title: "第二章 排盘方法",
    lessons: [
      { id: "l5", title: "2.1 年柱的排法", duration: 1420, status: 'completed' as LessonStatus },
      { id: "l6", title: "2.2 月柱的排法", duration: 1680, status: 'completed' as LessonStatus },
      { id: "l7", title: "2.3 日柱的排法", duration: 1550, status: 'completed' as LessonStatus },
      { id: "l8", title: "2.4 时柱的排法", duration: 1720, status: 'completed' as LessonStatus },
    ]
  },
  {
    id: "ch3",
    title: "第三章 十神详解",
    lessons: [
      { id: "l9", title: "3.1 比劫的含义与作用", duration: 1850, status: 'completed' as LessonStatus },
      { id: "l10", title: "3.2 食伤的含义与作用", duration: 1920, status: 'completed' as LessonStatus },
      { id: "l11", title: "3.3 财星的含义与作用", duration: 1780, status: 'completed' as LessonStatus },
      { id: "l12", title: "3.4 官杀的含义与作用", duration: 1650, status: 'in-progress' as LessonStatus },
      { id: "l13", title: "3.5 印星的含义与作用", duration: 1880, status: 'available' as LessonStatus },
    ]
  },
  {
    id: "ch4",
    title: "第四章 格局分析",
    lessons: [
      { id: "l14", title: "4.1 八格的判定方法", duration: 2100, status: 'available' as LessonStatus },
      { id: "l15", title: "4.2 正格与变格", duration: 1950, status: 'available' as LessonStatus },
      { id: "l16", title: "4.3 用神的取法", duration: 2250, status: 'available' as LessonStatus },
      { id: "l17", title: "4.4 格局高低判断", duration: 1820, status: 'available' as LessonStatus },
    ]
  },
  {
    id: "ch5",
    title: "第五章 大运流年",
    lessons: [
      { id: "l18", title: "5.1 大运的排法", duration: 1680, status: 'locked' as LessonStatus },
      { id: "l19", title: "5.2 流年的看法", duration: 1750, status: 'locked' as LessonStatus },
      { id: "l20", title: "5.3 运年作用关系", duration: 1920, status: 'locked' as LessonStatus },
      { id: "l21", title: "5.4 吉凶判断要点", duration: 2080, status: 'locked' as LessonStatus },
    ]
  },
]

// 格式化时长
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 骨架屏
function ChaptersSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 顶部导航骨架 */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB]">
        <div className="h-14 px-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-[#F2EFEA] rounded-full animate-pulse" />
          <div className="h-5 bg-[#F2EFEA] rounded w-40 animate-pulse" />
        </div>
        {/* 进度条骨架 */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="h-4 bg-[#F2EFEA] rounded w-24 animate-pulse" />
            <div className="h-4 bg-[#F2EFEA] rounded w-16 animate-pulse" />
          </div>
          <div className="h-2 bg-[#F2EFEA] rounded-full animate-pulse" />
        </div>
      </div>
      
      {/* 章节列表骨架 */}
      <div className="p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
            <div className="h-5 bg-[#F2EFEA] rounded w-48 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#F2EFEA] rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-[#F2EFEA] rounded w-3/4 mb-1" />
                    <div className="h-3 bg-[#F2EFEA] rounded w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// 课时状态图标
function LessonStatusIcon({ status }: { status: LessonStatus }) {
  switch (status) {
    case 'completed':
      return (
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-green-600" />
        </div>
      )
    case 'in-progress':
      return (
        <div className="w-8 h-8 rounded-full bg-[#C41E3A]/10 flex items-center justify-center relative">
          <div className="w-3 h-3 rounded-full bg-[#C41E3A] animate-pulse" />
          <svg className="absolute inset-0 w-8 h-8 -rotate-90">
            <circle cx="16" cy="16" r="14" fill="none" stroke="#C41E3A" strokeWidth="2" strokeDasharray="88" strokeDashoffset="44" opacity="0.3" />
          </svg>
        </div>
      )
    case 'available':
      return (
        <div className="w-8 h-8 rounded-full bg-[#C41E3A]/10 flex items-center justify-center">
          <Play className="w-4 h-4 text-[#C41E3A] ml-0.5" fill="currentColor" />
        </div>
      )
    case 'locked':
      return (
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
          <Lock className="w-4 h-4 text-gray-400" />
        </div>
      )
  }
}

export default function ChaptersPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.id as string
  
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [course, setCourse] = useState(mockCourse)
  const [chapters, setChapters] = useState(mockChapters)
  
  // 模拟加载数据
  const loadData = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    
    // 模拟API调用
    // const [chaptersRes, progressRes] = await Promise.all([
    //   courseApi.chapters(courseId),
    //   courseApi.myProgress(courseId)
    // ])
    
    await new Promise(resolve => setTimeout(resolve, refresh ? 500 : 800))
    
    setCourse(mockCourse)
    setChapters(mockChapters)
    setIsLoading(false)
    setIsRefreshing(false)
  }, [courseId])
  
  useEffect(() => {
    loadData()
  }, [loadData])
  
  // 处理课时点击
  const handleLessonClick = (lesson: typeof mockChapters[0]['lessons'][0]) => {
    if (lesson.status === 'locked') {
      // 显示解锁提示
      alert('请先完成前面的课程或购买完整课程以解锁此内容')
      return
    }
    // 跳转到播放器
    router.push(`/courses/${courseId}/player?lesson=${lesson.id}`)
  }
  
  // 下拉刷新
  const handleRefresh = () => {
    loadData(true)
  }
  
  if (isLoading) {
    return <ChaptersSkeleton />
  }
  
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 顶部导航 + 进度条 */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB] shadow-sm">
        {/* 导航栏 */}
        <div className="h-14 px-4 flex items-center gap-3">
          <button 
            onClick={() => router.back()}
            className="w-8 h-8 rounded-full bg-[#F5F0E8] flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-[#2C2C2C]" />
          </button>
          <h1 className="flex-1 font-medium text-[#2C2C2C] truncate">{course.title}</h1>
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-8 h-8 rounded-full bg-[#F5F0E8] flex items-center justify-center"
          >
            <RefreshCw className={cn("w-4 h-4 text-[#666666]", isRefreshing && "animate-spin")} />
          </button>
        </div>
        
        {/* 总进度条 */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#666666]">
              学习进度 <span className="text-[#C41E3A] font-medium">{course.completedLessons}</span>/{course.totalLessons}课时
            </span>
            <span className="text-sm font-bold text-[#C41E3A]">{course.progressPercent}%</span>
          </div>
          <div className="h-2 bg-[#F2EFEA] rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#C41E3A] to-[#E85A71] rounded-full transition-all duration-500"
              style={{ width: `${course.progressPercent}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* 章节列表 */}
      <div className="p-4 space-y-4 pb-8">
        {chapters.map((chapter, chapterIndex) => {
          // 计算章节完成数
          const completedCount = chapter.lessons.filter(l => l.status === 'completed').length
          const totalCount = chapter.lessons.length
          const isChapterComplete = completedCount === totalCount
          
          return (
            <div key={chapter.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              {/* 章节标题 */}
              <div className="px-4 py-3 border-b border-[#F2EFEA] flex items-center justify-between">
                <h2 className="font-medium text-[#2C2C2C]">{chapter.title}</h2>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  isChapterComplete 
                    ? "bg-green-100 text-green-600" 
                    : "bg-[#F5F0E8] text-[#666666]"
                )}>
                  {completedCount}/{totalCount}
                </span>
              </div>
              
              {/* 课时列表 */}
              <div className="divide-y divide-[#F5F0E8]">
                {chapter.lessons.map((lesson, lessonIndex) => (
                  <button
                    key={lesson.id}
                    onClick={() => handleLessonClick(lesson)}
                    className={cn(
                      "w-full px-4 py-3 flex items-center gap-3 text-left transition-colors",
                      lesson.status === 'locked' 
                        ? "opacity-60 cursor-not-allowed" 
                        : "hover:bg-[#FAF8F5] active:bg-[#F5F0E8]"
                    )}
                  >
                    {/* 状态图标 */}
                    <LessonStatusIcon status={lesson.status} />
                    
                    {/* 课时信息 */}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm truncate",
                        lesson.status === 'completed' ? "text-[#999999]" : "text-[#2C2C2C]",
                        lesson.status === 'in-progress' && "text-[#C41E3A] font-medium"
                      )}>
                        {lesson.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Clock className="w-3 h-3 text-[#999999]" />
                        <span className="text-xs text-[#999999]">{formatDuration(lesson.duration)}</span>
                        {lesson.status === 'in-progress' && (
                          <span className="text-xs text-[#C41E3A]">学习中</span>
                        )}
                      </div>
                    </div>
                    
                    {/* 右侧箭头/锁定图标 */}
                    {lesson.status !== 'locked' && lesson.status !== 'completed' && (
                      <Play className="w-4 h-4 text-[#C41E3A]" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      
      {/* 底部安全区域 */}
      <div className="h-6" />
    </div>
  )
}
