"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Play, Clock, Users, Star, ChevronDown, ChevronUp, Lock, CheckCircle, Share2, Heart, BookOpen, MessageCircle, UserPlus, QrCode, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { courseApi } from "@/lib/api"
import type { CourseDetail, Chapter, CourseReview } from "@/lib/api"

// Mock数据
const mockCourse: CourseDetail = {
  id: "1",
  title: "八字命理入门到精通",
  cover: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=800&h=450&fit=crop",
  instructor: {
    id: "ins1",
    name: "张明远",
    avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=master1",
    title: "资深命理师"
  },
  price: 299,
  originalPrice: 599,
  students: 12860,
  rating: 4.9,
  chapters: 32,
  category: "命理",
  tag: "热门",
  isFree: false,
  description: "本课程由资深命理师张明远老师主讲，从零基础开始，系统讲解八字命理的核心理论与实战技巧。课程涵盖天干地支、五行生克、十神论命、大运流年等核心内容，配合大量真实案例分析，让你快速掌握八字命理的精髓。",
  objectives: [
    "掌握天干地支的基本概念和五行属性",
    "理解八字排盘的原理和方法",
    "学会分析日主强弱和用神取用",
    "能够独立进行八字命盘分析"
  ],
  suitable: ["对命理学感兴趣的初学者", "希望系统学习八字的爱好者", "想要提升命理水平的从业者"],
  outline: [],
  reviews: [],
  isEnrolled: false,
  progress: 0
}

const mockChapters: Chapter[] = [
  {
    id: "c1",
    title: "第一章 八字命理概述",
    duration: 45,
    isFree: true,
    lessons: [
      { id: "l1", title: "1.1 什么是八字命理", duration: 15, isFree: true },
      { id: "l2", title: "1.2 八字命理的历史渊源", duration: 18, isFree: true },
      { id: "l3", title: "1.3 学习八字的正确方法", duration: 12, isFree: false },
    ]
  },
  {
    id: "c2",
    title: "第二章 天干地支基础",
    duration: 68,
    isFree: false,
    lessons: [
      { id: "l4", title: "2.1 十天干详解", duration: 22, isFree: false },
      { id: "l5", title: "2.2 十二地支详解", duration: 25, isFree: false },
      { id: "l6", title: "2.3 干支配合规律", duration: 21, isFree: false },
    ]
  },
  {
    id: "c3",
    title: "第三章 五行生克制化",
    duration: 72,
    isFree: false,
    lessons: [
      { id: "l7", title: "3.1 五行的基本概念", duration: 18, isFree: false },
      { id: "l8", title: "3.2 五行生克关系", duration: 28, isFree: false },
      { id: "l9", title: "3.3 五行在命理中的应用", duration: 26, isFree: false },
    ]
  },
  {
    id: "c4",
    title: "第四章 八字排盘实战",
    duration: 85,
    isFree: false,
    lessons: [
      { id: "l10", title: "4.1 年柱的排法", duration: 20, isFree: false },
      { id: "l11", title: "4.2 月柱的排法", duration: 22, isFree: false },
      { id: "l12", title: "4.3 日柱的排法", duration: 18, isFree: false },
      { id: "l13", title: "4.4 时柱的排法", duration: 25, isFree: false },
    ]
  },
]

const mockReviews: CourseReview[] = [
  {
    id: "r1",
    user: { id: "u1", name: "易学爱好者", avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=user1" },
    rating: 5,
    content: "张老师讲得非常清晰，从零基础开始学完全能听懂。案例分析特别实用，已经可以给朋友简单看看八字了！",
    createdAt: "2024-01-15"
  },
  {
    id: "r2",
    user: { id: "u2", name: "命理新手", avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=user2" },
    rating: 5,
    content: "课程内容很系统，比看书效率高多了。特别是五行生克那部分，老师用图解的方式讲解，一下子就理解了。",
    createdAt: "2024-01-10"
  },
  {
    id: "r3",
    user: { id: "u3", name: "学习中", avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=user3" },
    rating: 4,
    content: "整体不错，就是希望能多一些实战案例的讲解。期待老师出进阶课程！",
    createdAt: "2024-01-05"
  },
]

// 骨架屏组件
function DetailSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] animate-pulse">
      <div className="h-56 bg-[#E8E3DB]" />
      <div className="px-4 -mt-6 relative z-10">
        <div className="bg-white rounded-t-[20px] p-4">
          <div className="h-6 bg-[#E8E3DB] rounded w-3/4 mb-3" />
          <div className="h-4 bg-[#E8E3DB] rounded w-1/2 mb-4" />
          <div className="flex gap-4">
            <div className="h-10 bg-[#E8E3DB] rounded w-20" />
            <div className="h-10 bg-[#E8E3DB] rounded w-20" />
          </div>
        </div>
      </div>
    </div>
  )
}

// 章节列表组件
function ChapterList({ 
  chapters, 
  hasAccess,
  onLessonClick 
}: { 
  chapters: Chapter[]
  hasAccess: boolean
  onLessonClick: (chapterId: string, lessonId: string) => void
}) {
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set(["c1"]))

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters(prev => {
      const next = new Set(prev)
      if (next.has(chapterId)) {
        next.delete(chapterId)
      } else {
        next.add(chapterId)
      }
      return next
    })
  }

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return `${hours}小时${mins > 0 ? mins + '分钟' : ''}`
    }
    return `${minutes}分钟`
  }

  return (
    <div className="space-y-3">
      {chapters.map((chapter, index) => (
        <Card key={chapter.id} className="overflow-hidden border-0 shadow-sm">
          {/* 章节标题 */}
          <button
            onClick={() => toggleChapter(chapter.id)}
            className="w-full px-4 py-3 flex items-center justify-between bg-white hover:bg-[#FAF8F5] transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-[#C41E3A]/10 text-[#C41E3A] text-[12px] font-bold flex items-center justify-center">
                {index + 1}
              </span>
              <div className="text-left">
                <h4 className="text-[14px] font-medium text-[#2C2C2C]">{chapter.title}</h4>
                <p className="text-[12px] text-[#999999]">
                  {chapter.lessons?.length || 0}节 · {formatDuration(chapter.duration)}
                  {chapter.isFree && <span className="ml-2 text-[#52C41A]">免费试看</span>}
                </p>
              </div>
            </div>
            {expandedChapters.has(chapter.id) ? (
              <ChevronUp className="w-5 h-5 text-[#999999]" />
            ) : (
              <ChevronDown className="w-5 h-5 text-[#999999]" />
            )}
          </button>

          {/* 课时列表 */}
          {expandedChapters.has(chapter.id) && chapter.lessons && (
            <div className="border-t border-[#F2EFEA]">
              {chapter.lessons.map((lesson, lessonIndex) => (
                <button
                  key={lesson.id}
                  onClick={() => onLessonClick(chapter.id, lesson.id)}
                  disabled={!hasAccess && !lesson.isFree}
                  className={cn(
                    "w-full px-4 py-3 flex items-center justify-between text-left transition-colors",
                    hasAccess || lesson.isFree 
                      ? "hover:bg-[#FAF8F5]" 
                      : "opacity-60 cursor-not-allowed",
                    lessonIndex > 0 && "border-t border-[#F2EFEA]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      lesson.isFree ? "bg-[#52C41A]/10" : "bg-[#F2EFEA]"
                    )}>
                      {hasAccess || lesson.isFree ? (
                        <Play className={cn("w-4 h-4", lesson.isFree ? "text-[#52C41A]" : "text-[#666666]")} />
                      ) : (
                        <Lock className="w-4 h-4 text-[#999999]" />
                      )}
                    </div>
                    <div>
                      <p className="text-[13px] text-[#2C2C2C]">{lesson.title}</p>
                      <p className="text-[11px] text-[#999999]">{lesson.duration}分钟</p>
                    </div>
                  </div>
                  {lesson.isFree && !hasAccess && (
                    <span className="text-[11px] text-[#52C41A] bg-[#52C41A]/10 px-2 py-0.5 rounded">试看</span>
                  )}
                  {lesson.isCompleted && (
                    <CheckCircle className="w-4 h-4 text-[#52C41A]" />
                  )}
                </button>
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}

// 评价列表组件
function ReviewList({ reviews }: { reviews: CourseReview[] }) {
  return (
    <div className="space-y-4">
      {reviews.map(review => (
        <div key={review.id} className="bg-white rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <img src={review.user.avatar} alt="" className="w-9 h-9 rounded-full bg-[#F2EFEA]" />
            <div className="flex-1">
              <p className="text-[13px] font-medium text-[#2C2C2C]">{review.user.name}</p>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={cn(
                      "w-3 h-3",
                      i < review.rating ? "text-[#FAAD14] fill-[#FAAD14]" : "text-[#E8E3DB]"
                    )} 
                  />
                ))}
                <span className="text-[11px] text-[#999999] ml-1">{review.createdAt}</span>
              </div>
            </div>
          </div>
          <p className="text-[13px] text-[#666666] leading-relaxed">{review.content}</p>
        </div>
      ))}
    </div>
  )
}

export default function CourseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [reviews, setReviews] = useState<CourseReview[]>([])
  const [hasAccess, setHasAccess] = useState(false)
  const [activeTab, setActiveTab] = useState<'intro' | 'chapters' | 'reviews'>('intro')
  const [showGroupBuyBanner, setShowGroupBuyBanner] = useState(true)
  const [showConsultPanel, setShowConsultPanel] = useState(false)
  const [showGroupPanel, setShowGroupPanel] = useState(false)
  const [isLiked, setIsLiked] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        // 并行请求数据
        // const [courseRes, chaptersRes, accessRes, reviewsRes] = await Promise.all([
        //   courseApi.detail(courseId),
        //   courseApi.chapters(courseId),
        //   courseApi.checkAccess(courseId),
        //   courseApi.getReviews(courseId)
        // ])
        // setCourse(courseRes)
        // setChapters(chaptersRes)
        // setHasAccess(accessRes.hasAccess)
        // setReviews(reviewsRes.data)

        // Mock数据
        await new Promise(r => setTimeout(r, 800))
        setCourse(mockCourse)
        setChapters(mockChapters)
        setReviews(mockReviews)
        setHasAccess(false)
      } catch (error) {
        console.error('Failed to load course:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [courseId])

  const handleLessonClick = (chapterId: string, lessonId: string) => {
    router.push(`/courses/${courseId}/learn?chapter=${chapterId}&lesson=${lessonId}`)
  }

  const handlePurchase = () => {
    router.push(`/courses/${courseId}/purchase`)
  }

  const handleStartLearning = () => {
    router.push(`/courses/${courseId}/learn`)
  }

  if (isLoading) {
    return <DetailSkeleton />
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <p className="text-[#999999]">课程不存在</p>
      </div>
    )
  }

  const totalDuration = chapters.reduce((sum, c) => sum + c.duration, 0)
  const totalLessons = chapters.reduce((sum, c) => sum + (c.lessons?.length || 0), 0)

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-24">
      {/* 封面区域 */}
      <div className="relative h-56">
        <img 
          src={course.cover} 
          alt={course.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        
        {/* 顶部导航 */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <button 
            onClick={() => (typeof window !== "undefined" && window.history.length > 1 ? router.back() : router.push("/courses"))}
            className="w-9 h-9 rounded-full bg-black/30 backdrop-blur flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsLiked(!isLiked)}
              className="w-9 h-9 rounded-full bg-black/30 backdrop-blur flex items-center justify-center"
            >
              <Heart className={cn("w-5 h-5", isLiked ? "text-[#C41E3A] fill-[#C41E3A]" : "text-white")} />
            </button>
            <button className="w-9 h-9 rounded-full bg-black/30 backdrop-blur flex items-center justify-center">
              <Share2 className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* 课程基本信息 */}
        <div className="absolute bottom-4 left-4 right-4">
          {course.tag && (
            <span className="inline-block px-2 py-0.5 bg-[#C41E3A] text-white text-[11px] font-bold rounded mb-2">
              {course.tag}
            </span>
          )}
          <h1 className="text-[20px] font-bold text-white mb-2 line-clamp-2">{course.title}</h1>
          <div className="flex items-center gap-4 text-white/80 text-[12px]">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {course.students.toLocaleString()}人学习
            </span>
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-[#FAAD14] fill-[#FAAD14]" />
              {course.rating}分
            </span>
            <span className="flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              {totalLessons}节课
            </span>
          </div>
        </div>
      </div>

      {/* 讲师信息 */}
      <div className="px-4 -mt-2 relative z-10">
        <Card className="p-4 border-0 shadow-sm">
          <Link href={`/instructor/${course.instructor.id}`} className="flex items-center gap-3">
            <img 
              src={course.instructor.avatar} 
              alt={course.instructor.name}
              className="w-12 h-12 rounded-full bg-[#F2EFEA]"
            />
            <div className="flex-1">
              <p className="text-[15px] font-medium text-[#2C2C2C]">{course.instructor.name}</p>
              <p className="text-[12px] text-[#999999]">{course.instructor.title}</p>
            </div>
            <span className="text-[12px] text-[#C41E3A]">查看主页 &gt;</span>
          </Link>
        </Card>
      </div>

      {/* Tab切换 */}
      <div className="px-4 mt-4">
        <div className="flex gap-6 border-b border-[#E8E3DB]">
          {[
            { key: 'intro', label: '简介' },
            { key: 'chapters', label: `目录(${totalLessons})` },
            { key: 'reviews', label: `评价(${reviews.length})` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={cn(
                "pb-3 text-[14px] font-medium relative transition-colors",
                activeTab === tab.key ? "text-[#C41E3A]" : "text-[#666666]"
              )}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-[#C41E3A] rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab内容 */}
      <div className="px-4 mt-4">
        {activeTab === 'intro' && (
          <div className="space-y-6">
            {/* 课程简介 */}
            <div>
              <h3 className="text-[15px] font-bold text-[#2C2C2C] mb-3">课程简介</h3>
              <p className="text-[13px] text-[#666666] leading-relaxed">{course.description}</p>
            </div>

            {/* 学习目标 */}
            <div>
              <h3 className="text-[15px] font-bold text-[#2C2C2C] mb-3">学完你将收获</h3>
              <div className="space-y-2">
                {course.objectives.map((obj, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-[#52C41A] mt-0.5 flex-shrink-0" />
                    <span className="text-[13px] text-[#666666]">{obj}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 适合人群 */}
            <div>
              <h3 className="text-[15px] font-bold text-[#2C2C2C] mb-3">适合人群</h3>
              <div className="flex flex-wrap gap-2">
                {course.suitable.map((item, i) => (
                  <span key={i} className="px-3 py-1.5 bg-[#C41E3A]/5 text-[#C41E3A] text-[12px] rounded-full">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* 课程数据 */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-3 border-0 shadow-sm text-center">
                <p className="text-[20px] font-bold text-[#C41E3A]">{totalLessons}</p>
                <p className="text-[11px] text-[#999999]">课时</p>
              </Card>
              <Card className="p-3 border-0 shadow-sm text-center">
                <p className="text-[20px] font-bold text-[#C41E3A]">{Math.floor(totalDuration / 60)}+</p>
                <p className="text-[11px] text-[#999999]">小时</p>
              </Card>
              <Card className="p-3 border-0 shadow-sm text-center">
                <p className="text-[20px] font-bold text-[#C41E3A]">{course.students.toLocaleString()}</p>
                <p className="text-[11px] text-[#999999]">学员</p>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'chapters' && (
          <ChapterList 
            chapters={chapters} 
            hasAccess={hasAccess}
            onLessonClick={handleLessonClick}
          />
        )}

        {activeTab === 'reviews' && (
          <div>
            {/* 评分概览 */}
            <Card className="p-4 border-0 shadow-sm mb-4">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-[32px] font-bold text-[#C41E3A]">{course.rating}</p>
                  <div className="flex items-center gap-0.5 justify-center">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={cn(
                          "w-3 h-3",
                          i < Math.floor(course.rating) ? "text-[#FAAD14] fill-[#FAAD14]" : "text-[#E8E3DB]"
                        )} 
                      />
                    ))}
                  </div>
                  <p className="text-[11px] text-[#999999] mt-1">{reviews.length}条评价</p>
                </div>
                <div className="flex-1 space-y-1">
                  {[5, 4, 3, 2, 1].map(star => {
                    const count = reviews.filter(r => r.rating === star).length
                    const percent = reviews.length > 0 ? (count / reviews.length) * 100 : 0
                    return (
                      <div key={star} className="flex items-center gap-2">
                        <span className="text-[11px] text-[#999999] w-4">{star}星</span>
                        <div className="flex-1 h-1.5 bg-[#F2EFEA] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#FAAD14] rounded-full"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </Card>

            <ReviewList reviews={reviews} />
          </div>
        )}
      </div>

      {/* 底部固定购买栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E3DB] px-4 py-3 flex items-center gap-3 z-50">
        {/* 咨询和学习群按钮 */}
        <button 
          onClick={() => setShowConsultPanel(true)}
          className="flex flex-col items-center text-[#666666]"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">咨询</span>
        </button>
        <button 
          onClick={() => setShowGroupPanel(true)}
          className="flex flex-col items-center text-[#666666]"
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">学习群</span>
        </button>
        
        <div className="flex-1 ml-2">
          {course.isFree ? (
            <p className="text-[18px] font-bold text-[#52C41A]">免费</p>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-[12px] text-[#C41E3A]">¥</span>
              <span className="text-[24px] font-bold text-[#C41E3A]">{course.price}</span>
              <span className="text-[12px] text-[#999999] line-through">¥{course.originalPrice}</span>
            </div>
          )}
        </div>
        {hasAccess ? (
          <Button 
            onClick={handleStartLearning}
            className="px-8 h-11 bg-gradient-to-r from-[#C41E3A] to-[#E74C3C] text-white font-bold rounded-full"
          >
            继续学习
          </Button>
        ) : (
          <Button 
            onClick={handlePurchase}
            className="px-8 h-11 bg-gradient-to-r from-[#C41E3A] to-[#E74C3C] text-white font-bold rounded-full"
          >
            立即购买
          </Button>
        )}
      </div>
      
      {/* 拼课优惠Banner */}
      {showGroupBuyBanner && !hasAccess && !course.isFree && (
        <div className="fixed bottom-[72px] left-4 right-4 z-40">
          <div className="bg-gradient-to-r from-[#FF6B35] to-[#FF8C5A] rounded-xl p-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-white" />
                <div>
                  <p className="text-white text-sm font-medium">邀请好友拼课，立省¥100</p>
                  <p className="text-white/80 text-xs">2人成团，每人仅需¥{course.price - 50}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 bg-white text-[#FF6B35] text-xs font-medium rounded-full">
                  发起拼课
                </button>
                <button onClick={() => setShowGroupBuyBanner(false)}>
                  <X className="w-4 h-4 text-white/70" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 课程咨询弹窗 */}
      {showConsultPanel && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowConsultPanel(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-4 pb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">课程咨询</h3>
              <button onClick={() => setShowConsultPanel(false)}>
                <X className="w-5 h-5 text-[#999999]" />
              </button>
            </div>
            <div className="space-y-3">
              <button className="w-full p-4 bg-[#F5F1EB] rounded-xl flex items-center gap-3 active:bg-[#E8E0D5]">
                <div className="w-10 h-10 bg-[#C41E3A] rounded-full flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-[#2C2C2C]">在线客服</p>
                  <p className="text-xs text-[#999999]">9:00-22:00 在线解答</p>
                </div>
              </button>
              <button className="w-full p-4 bg-[#F5F1EB] rounded-xl flex items-center gap-3 active:bg-[#E8E0D5]">
                <div className="w-10 h-10 bg-[#07C160] rounded-full flex items-center justify-center">
                  <QrCode className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-[#2C2C2C]">微信咨询</p>
                  <p className="text-xs text-[#999999]">扫码添加课程顾问</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 学习群弹窗 */}
      {showGroupPanel && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowGroupPanel(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-4 pb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">加入学习群</h3>
              <button onClick={() => setShowGroupPanel(false)}>
                <X className="w-5 h-5 text-[#999999]" />
              </button>
            </div>
            <div className="text-center py-4">
              <div className="w-40 h-40 mx-auto bg-[#F5F1EB] rounded-xl flex items-center justify-center mb-3">
                <QrCode className="w-20 h-20 text-[#999999]" />
              </div>
              <p className="text-sm text-[#666666] mb-1">扫码加入「{course.title}」学习群</p>
              <p className="text-xs text-[#999999]">与{course.students.toLocaleString()}位同学一起学习交流</p>
            </div>
            <div className="bg-[#FFF9E6] rounded-xl p-3 mt-2">
              <p className="text-xs text-[#996600]">
                入群福利：课程答疑、学习资料、作业批改、结业证书
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
