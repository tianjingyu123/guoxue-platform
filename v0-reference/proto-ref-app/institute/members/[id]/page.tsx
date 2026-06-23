"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import { 
  ChevronLeft, 
  Star, 
  Users, 
  BookOpen, 
  Award,
  GraduationCap,
  Briefcase,
  MessageSquare,
  Calendar,
  Share2,
  Heart,
  Check,
  ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { 
  getInstructorDetail,
  followInstructor,
  getInstructorLevelLabel
} from "@/lib/api/institute"
import type { InstructorDetail } from "@/lib/types/institute"

// 骨架屏
function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-muted rounded", className)} />
}

// 加载骨架屏
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="relative h-64 bg-muted">
        <Skeleton className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-24 h-24 rounded-full" />
      </div>
      <div className="pt-16 px-4 space-y-4">
        <Skeleton className="h-6 w-32 mx-auto" />
        <Skeleton className="h-4 w-48 mx-auto" />
        <div className="flex justify-center gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    </div>
  )
}

export default function InstructorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = Number(params.id)
  
  const [instructor, setInstructor] = useState<InstructorDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'intro' | 'courses' | 'reviews'>('intro')
  const [following, setFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  useEffect(() => {
    loadInstructor()
  }, [id])

  async function loadInstructor() {
    setLoading(true)
    try {
      const res = await getInstructorDetail(id)
      if (res.code === 200 && res.data) {
        setInstructor(res.data)
        setFollowing(res.data.isFollowing || false)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleFollow() {
    if (!instructor || followLoading) return
    setFollowLoading(true)
    try {
      const res = await followInstructor(instructor.id)
      if (res.code === 200) {
        setFollowing(res.data.isFollowing)
      }
    } finally {
      setFollowLoading(false)
    }
  }

  function handleShare() {
    if (navigator.share && instructor) {
      navigator.share({
        title: `${instructor.name} - 热卜研究院讲师`,
        text: instructor.bio || instructor.title,
        url: window.location.href,
      })
    }
  }

  if (loading) return <LoadingSkeleton />

  if (!instructor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">讲师不存在</p>
          <Button variant="link" onClick={() => router.back()}>返回</Button>
        </div>
      </div>
    )
  }

  const tabs = [
    { key: 'intro', label: '简介' },
    { key: 'courses', label: `课程(${instructor.courseCount})` },
    { key: 'reviews', label: `评价(${instructor.reviewCount})` },
  ]

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* 头部背景 */}
      <div className="relative h-48 bg-gradient-to-b from-primary/20 to-primary/5">
        {/* 返回和分享按钮 */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-full bg-white/80 backdrop-blur flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleShare}
            className="w-8 h-8 rounded-full bg-white/80 backdrop-blur flex items-center justify-center"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {/* 头像 */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
          <div className="relative">
            <Image
              src={instructor.avatar}
              alt={instructor.name}
              width={96}
              height={96}
              className="w-24 h-24 rounded-full border-4 border-background object-cover"
            />
            {instructor.verified && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-3.5 h-3.5 text-white" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 基本信息 */}
      <div className="pt-14 px-4 text-center">
        <h1 className="text-xl font-bold">{instructor.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">{instructor.title}</p>
        <div className="flex items-center justify-center gap-1 mt-1">
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            {getInstructorLevelLabel(instructor.level)}
          </span>
        </div>

        {/* 擅长领域 */}
        <div className="flex flex-wrap justify-center gap-2 mt-3">
          {instructor.specialties.map((s, i) => (
            <span 
              key={i}
              className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground"
            >
              {s}
            </span>
          ))}
        </div>

        {/* 统计数据 */}
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="text-center">
            <p className="text-lg font-bold">{instructor.studentCount}</p>
            <p className="text-xs text-muted-foreground">学员</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <p className="text-lg font-bold">{instructor.courseCount}</p>
            <p className="text-xs text-muted-foreground">课程</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center flex items-center justify-center gap-1">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <p className="text-lg font-bold">{instructor.rating.toFixed(1)}</p>
          </div>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="sticky top-0 z-10 bg-background border-b border-border mt-4">
        <div className="flex">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={cn(
                "flex-1 py-3 text-sm font-medium relative",
                activeTab === tab.key ? "text-primary" : "text-muted-foreground"
              )}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 内容 */}
      <div className="p-4">
        {activeTab === 'intro' && (
          <div className="space-y-6">
            {/* 个人简介 */}
            <section>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                个人简介
              </h3>
              <div 
                className="text-sm text-muted-foreground leading-relaxed"
                dangerouslySetInnerHTML={{ __html: instructor.introduction }}
              />
            </section>

            {/* 教育背景 */}
            {instructor.education && instructor.education.length > 0 && (
              <section>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-primary" />
                  教育背景
                </h3>
                <div className="space-y-2">
                  {instructor.education.map((edu, i) => (
                    <div key={i} className="text-sm text-muted-foreground pl-4 border-l-2 border-primary/30">
                      {edu}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 从业经历 */}
            {instructor.experience && instructor.experience.length > 0 && (
              <section>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-primary" />
                  从业经历
                </h3>
                <div className="space-y-2">
                  {instructor.experience.map((exp, i) => (
                    <div key={i} className="text-sm text-muted-foreground pl-4 border-l-2 border-primary/30">
                      {exp}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 资质证书 */}
            {instructor.certificates && instructor.certificates.length > 0 && (
              <section>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Award className="w-4 h-4 text-primary" />
                  资质证书
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {instructor.certificates.map((cert, i) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/50 border border-border">
                      <p className="text-sm font-medium">{cert.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {cert.issuer} · {cert.year}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab === 'courses' && (
          <div className="space-y-3">
            {instructor.featuredCourses && instructor.featuredCourses.length > 0 ? (
              instructor.featuredCourses.map(course => (
                <div 
                  key={course.id}
                  onClick={() => router.push(`/course/${course.id}`)}
                  className="flex gap-3 p-3 rounded-lg bg-card border border-border cursor-pointer active:bg-muted/50"
                >
                  <Image
                    src={course.cover}
                    alt={course.title}
                    width={80}
                    height={60}
                    className="w-20 h-15 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm line-clamp-2">{course.title}</h4>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {course.studentCount}人学习
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-500" />
                        {course.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 self-center" />
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>暂无课程</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-4">
            {instructor.reviews && instructor.reviews.length > 0 ? (
              instructor.reviews.map(review => (
                <div key={review.id} className="pb-4 border-b border-border last:border-0">
                  <div className="flex items-start gap-3">
                    <Image
                      src={review.user.avatar}
                      alt={review.user.name}
                      width={36}
                      height={36}
                      className="w-9 h-9 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{review.user.name}</span>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map(n => (
                            <Star
                              key={n}
                              className={cn(
                                "w-3 h-3",
                                n <= review.rating 
                                  ? "text-amber-500 fill-amber-500" 
                                  : "text-gray-200"
                              )}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                        {review.content}
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-2">{review.time}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>暂无评价</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleFollow}
            disabled={followLoading}
            className={cn(
              "flex flex-col items-center justify-center w-14",
              following ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Heart className={cn("w-5 h-5", following && "fill-primary")} />
            <span className="text-xs mt-0.5">{following ? '已关注' : '关注'}</span>
          </button>
          
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => router.push(`/im/chat/${instructor.id}`)}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            发起提问
          </Button>
          
          <Button 
            className="flex-1 bg-primary hover:bg-primary/90"
            onClick={() => router.push(`/offline/teacher-booking?teacherId=${instructor.id}`)}
          >
            <Calendar className="w-4 h-4 mr-2" />
            预约授课
          </Button>
        </div>
      </div>
    </div>
  )
}
