"use client"

import { useState, useEffect } from "react"
import { Star, Award, Clock, BookOpen, Zap, Share2, Download, ChevronRight, Check, Sparkles } from "lucide-react"
import { BackButton } from "@/components/common/back-button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { AchievementMoment } from "@/components/common/achievement-moment"
import type { AchievementData } from "@/lib/types/achievement"

// 课程数据
const courseData = {
  id: 1,
  title: "八字入门实战课",
  instructor: "周易大师",
  instructorAvatar: "",
  completedAt: "2026-05-10",
  totalDuration: 1860, // 分钟
  chaptersCount: 24,
  earnedPoints: 500,
  hasCertificate: true,
}

// 推荐进阶课程
const recommendedCourses = [
  { id: 2, title: "八字进阶实战课", instructor: "周易大师", price: 399, students: 1024, level: "进阶" },
  { id: 3, title: "紫微斗数精讲", instructor: "张玄风", price: 299, students: 856, level: "入门" },
  { id: 4, title: "八字看婚姻专题", instructor: "周易大师", price: 199, students: 628, level: "专题" },
]

export default function CourseCompletePage() {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [review, setReview] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [showConfetti, setShowConfetti] = useState(true)
  const [showCert, setShowCert] = useState(false)

  useEffect(() => {
    // 3秒后隐藏庆祝动画
    const timer = setTimeout(() => setShowConfetti(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  const handleSubmitReview = async () => {
    if (rating === 0) return
    setIsSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSubmitting(false)
    setIsSubmitted(true)
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}小时${mins > 0 ? mins + '分钟' : ''}`
  }

  const certData: AchievementData = {
    type: "certificate",
    userName: "周明远",
    subject: courseData.title,
    date: courseData.completedAt,
    stats: [
      { label: "学习时长", value: `${Math.floor(courseData.totalDuration / 60)}h` },
      { label: "完成章节", value: `${courseData.chaptersCount}节` },
      { label: "获得积分", value: `${courseData.earnedPoints}` },
    ],
    aiComment: `在热卜国学完成了《${courseData.title}》，探寻东方智慧的旅程，刚刚开始。`,
    serialNo: `RB${courseData.completedAt.replace(/-/g, "")}${String(courseData.id).padStart(2, "0")}`,
    instructor: courseData.instructor,
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* 庆祝动画背景 */}
      {showConfetti && (
        <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-${Math.random() * 20 + 10}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              <Sparkles className={cn(
                "w-4 h-4",
                i % 3 === 0 ? "text-primary" : i % 3 === 1 ? "text-accent" : "text-yellow-400"
              )} />
            </div>
          ))}
        </div>
      )}

      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
  <div className="flex items-center justify-between px-4 h-14">
  <BackButton fallbackPath="/learning" />
  <h1 className="font-semibold text-base text-foreground">学习完成</h1>
          <div className="w-9" />
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* 成就展示区 */}
        <Card className="overflow-hidden">
          {/* 庆祝背景 */}
          <div className="relative bg-gradient-to-br from-primary via-primary/80 to-accent p-6 text-center">
            {/* 装饰元素 */}
            <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/10" />
            <div className="absolute top-8 right-6 w-4 h-4 rounded-full bg-white/20" />
            <div className="absolute bottom-4 left-8 w-6 h-6 rounded-full bg-white/15" />
            
            {/* 成就图标 */}
            <div className="relative w-24 h-24 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full bg-white/20 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="relative w-full h-full rounded-full bg-white/30 flex items-center justify-center">
                <Award className="w-12 h-12 text-white" />
              </div>
            </div>
            
            <h2 className="text-xl font-bold text-white mb-2">
              恭喜你完成学习！
            </h2>
            <p className="text-white/80 text-sm">
              《{courseData.title}》
            </p>
          </div>

          {/* 学习数据 */}
          <div className="grid grid-cols-3 divide-x divide-border">
            <div className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-primary mb-1">
                <Clock className="w-4 h-4" />
              </div>
              <p className="text-lg font-bold text-foreground">{formatDuration(courseData.totalDuration)}</p>
              <p className="text-xs text-muted-foreground">总学习时长</p>
            </div>
            <div className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-accent mb-1">
                <BookOpen className="w-4 h-4" />
              </div>
              <p className="text-lg font-bold text-foreground">{courseData.chaptersCount}节</p>
              <p className="text-xs text-muted-foreground">完成章节</p>
            </div>
            <div className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-yellow-500 mb-1">
                <Zap className="w-4 h-4" />
              </div>
              <p className="text-lg font-bold text-foreground">+{courseData.earnedPoints}</p>
              <p className="text-xs text-muted-foreground">获得积分</p>
            </div>
          </div>
        </Card>

        {/* 结业证书入口（唤起成就时刻母版） */}
        {courseData.hasCertificate && (
          <button onClick={() => setShowCert(true)} className="w-full text-left">
            <Card className="p-4 bg-gradient-to-r from-accent/10 via-accent/5 to-transparent border-accent/30 hover:border-accent/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-accent/20 flex items-center justify-center">
                  <Award className="w-7 h-7 text-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">结业证书已生成</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">点击查看并保存你的专属证书</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </Card>
          </button>
        )}

        {/* 评价邀请区 */}
        <Card className="p-4">
          <h3 className="font-semibold text-foreground mb-4">为课程评分</h3>
          
          {!isSubmitted ? (
            <>
              {/* 星级评分 */}
              <div className="flex items-center justify-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={cn(
                        "w-8 h-8 transition-colors",
                        (hoverRating || rating) >= star
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-muted-foreground"
                      )}
                    />
                  </button>
                ))}
              </div>
              
              <p className="text-center text-sm text-muted-foreground mb-4">
                {rating === 0 ? "点击星星评分" : 
                 rating === 1 ? "很不满意" :
                 rating === 2 ? "不太满意" :
                 rating === 3 ? "一般" :
                 rating === 4 ? "比较满意" : "非常满意"}
              </p>

              {/* 评价输入框 */}
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="分享你的学习感受...（选填）"
                rows={3}
                className="w-full px-4 py-3 bg-secondary rounded-xl text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              />

              <button
                onClick={handleSubmitReview}
                disabled={rating === 0 || isSubmitting}
                className={cn(
                  "w-full mt-4 py-3 rounded-xl font-medium text-sm transition-all",
                  rating > 0
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-secondary text-muted-foreground cursor-not-allowed"
                )}
              >
                {isSubmitting ? "提交中..." : "提交评价"}
              </button>
            </>
          ) : (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <p className="font-medium text-foreground">感谢你的评价！</p>
              <p className="text-sm text-muted-foreground mt-1">你的反馈将帮助更多学员</p>
            </div>
          )}
        </Card>

        {/* 进阶推荐区 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground">学完这门课的人还学了</h3>
            <Link href="/courses" className="text-xs text-primary">
              更多课程
            </Link>
          </div>
          
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {recommendedCourses.map((course) => (
              <Link
                key={course.id}
                href={`/course/${course.id}`}
                className="flex-shrink-0 w-44"
              >
                <Card className="overflow-hidden hover:bg-secondary/50 transition-colors">
                  <div className="aspect-[4/3] bg-gradient-to-br from-primary/20 via-accent/10 to-secondary flex items-center justify-center relative">
                    <BookOpen className="w-10 h-10 text-accent/60" />
                    <Badge className="absolute top-2 right-2 text-[10px] bg-accent/90 text-white border-0">
                      {course.level}
                    </Badge>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-foreground line-clamp-2">{course.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{course.instructor}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-primary font-bold">¥{course.price}</span>
                      <span className="text-[10px] text-muted-foreground">{course.students}人学习</span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* 讲师感谢卡片 */}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={courseData.instructorAvatar} alt={courseData.instructor} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {courseData.instructor[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">来自讲师 {courseData.instructor}</p>
              <p className="text-foreground mt-0.5">感谢你的学习，期待下次相见！</p>
            </div>
          </div>
        </Card>
      </div>

      {/* 底部操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border safe-area-pb">
        <div className="flex items-center gap-3 px-4 h-16 max-w-lg mx-auto">
          <Link 
            href="/"
            className="flex-1 py-3 bg-secondary text-foreground text-sm font-medium rounded-xl text-center hover:bg-secondary/80 transition-colors"
          >
            返回首页
          </Link>
          <button
            onClick={() => setShowCert(true)}
            className="flex-1 py-3 bg-primary text-primary-foreground text-sm font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            分享成就
          </button>
        </div>
      </div>

      <AchievementMoment
        open={showCert}
        data={certData}
        onClose={() => setShowCert(false)}
        continueLabel="查看更多课程"
      />
    </div>
  )
}
