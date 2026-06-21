"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CourseCover } from "@/components/course/course-cover"
import { CourseInfo } from "@/components/course/course-info"
import { InstructorCard } from "@/components/course/instructor-card"
import { CourseDescription } from "@/components/course/course-description"
import { CourseChapters } from "@/components/course/course-chapters"
import { CourseReviews } from "@/components/course/course-reviews"
import { CourseBottomBar } from "@/components/course/course-bottom-bar"
import { CountdownBanner, CouponClaimCard } from "@/components/marketing/marketing-slot"
import { Disclaimer } from "@/components/compliance/disclaimer"

// 模拟课程数据
const mockCourse = {
  id: "1",
  title: "八字命理学入门到精通：从基础理论到实战应用",
  images: [
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=450&fit=crop",
    "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&h=450&fit=crop",
    "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=800&h=450&fit=crop",
  ],
  currentPrice: 199,
  originalPrice: 599,
  studentsCount: 3286,
  tags: ["八字入门", "命理学", "实战案例"],
  instructor: {
    name: "李易轩",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
    title: "命理大师",
    description: "20年命理学研究，著有《八字精解》等多部著作",
    coursesCount: 12,
    studentsCount: 28600,
    isVerified: true,
  },
  description: `本课程是一套系统的八字命理学习课程，从零基础入门到高级实战，帮助学员全面掌握八字命理的核心知识。

课程内容涵盖：
• 八字基础理论：天干地支、阴阳五行、十神关系
• 命局分析方法：格局判断、喜忌分析、大运流年
• 实战案例解析：婚姻感情、事业财运、健康寿元
• 高级技法：神煞应用、纳音断命、特殊格局

学完本课程，你将能够独立分析八字命盘，准确判断人生各方面的吉凶祸福。`,
  highlights: ["系统教学", "案例实操", "一对一答疑", "永久回看"],
  sections: [
    {
      id: "s1",
      title: "第一章 八字命理基础",
      chapters: [
        { id: "c1", title: "1.1 什么是八字命理", duration: "12分钟", isFree: true },
        { id: "c2", title: "1.2 天干地支详解", duration: "18分钟", isFree: true },
        { id: "c3", title: "1.3 阴阳五行理论", duration: "25分钟", isFree: false },
        { id: "c4", title: "1.4 十神关系入门", duration: "22分钟", isFree: false },
      ],
    },
    {
      id: "s2",
      title: "第二章 命局分析方法",
      chapters: [
        { id: "c5", title: "2.1 八字格局判断", duration: "28分钟", isFree: false },
        { id: "c6", title: "2.2 喜用神分析", duration: "32分钟", isFree: false },
        { id: "c7", title: "2.3 大运流年解读", duration: "35分钟", isFree: false },
      ],
    },
    {
      id: "s3",
      title: "第三章 实战案例解析",
      chapters: [
        { id: "c8", title: "3.1 婚姻感情案例", duration: "40分钟", isFree: false },
        { id: "c9", title: "3.2 事业财运案例", duration: "38分钟", isFree: false },
        { id: "c10", title: "3.3 健康寿元案例", duration: "30分钟", isFree: false },
      ],
    },
    {
      id: "s4",
      title: "第四章 高级进阶技法",
      chapters: [
        { id: "c11", title: "4.1 神煞的实战应用", duration: "45分钟", isFree: false },
        { id: "c12", title: "4.2 纳音断命法", duration: "35分钟", isFree: false },
        { id: "c13", title: "4.3 特殊格局详解", duration: "42分钟", isFree: false },
      ],
    },
  ],
  reviews: [
    {
      id: "r1",
      userName: "易学爱好者",
      userAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop",
      rating: 5,
      content: "讲得非常清晰，从零基础到能看懂命盘，大概学了一个月。老师的讲解很有耐心，案例分析特别实用。",
      date: "2024-01-15",
      likes: 128,
    },
    {
      id: "r2",
      userName: "命理初学者",
      userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
      rating: 5,
      content: "一直想系统学习八字，这个课程正好满足需求。内容由浅入深，适合入门学习。",
      date: "2024-01-10",
      likes: 86,
    },
    {
      id: "r3",
      userName: "周易研习",
      userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
      rating: 4,
      content: "整体不错，就是希望能多一些实战案例。理论部分讲得很透彻，期待出进阶课程。",
      date: "2024-01-05",
      likes: 52,
    },
  ],
  averageRating: 4.8,
  totalReviews: 326,
}

export default function CourseDetailPage() {
  const router = useRouter()
  // 模拟购买状态，可切换测试
  const [isPurchased, setIsPurchased] = useState(false)
  const [isFavorited, setIsFavorited] = useState(false)
  const [cartCount, setCartCount] = useState(2)

  const handlePlayChapter = (chapterId: string) => {
    // 跳转到学习页面播放章节
    router.push(`/learn/${mockCourse.id}?chapter=${chapterId}`)
  }

  const handleFavorite = () => {
    setIsFavorited(!isFavorited)
  }

  const handleShare = () => {
    router.push(`/common/share-poster?type=course&targetId=${mockCourse.id}`)
  }

  const handleAddToCart = () => {
    setCartCount(prev => prev + 1)
  }

  const handleBuy = () => {
    // 跳转到订单确认页
    router.push(`/checkout?type=course&id=${mockCourse.id}&price=${mockCourse.currentPrice}`)
  }

  const handleStartLearning = () => {
    // 跳转到学习页面，从上次位置继续
    router.push(`/learn/${mockCourse.id}`)
  }

  // 中医养生/健康类课程：需展示专业医疗免责声明
  const healthKeywords = ["中医", "养生", "健康", "保健", "理疗", "艾灸", "推拿", "经络", "食疗", "针灸"]
  const courseText = `${mockCourse.title} ${mockCourse.description ?? ""} ${(mockCourse.tags ?? []).join(" ")}`
  const isHealthCourse = healthKeywords.some((kw) => courseText.includes(kw))

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-20 lg:pb-0">
      {/* 响应式布局容器 */}
      <div className="lg:flex lg:max-w-6xl lg:mx-auto lg:gap-6 lg:p-6">
        {/* 左侧主内容区 */}
        <div className="lg:flex-1 lg:min-w-0">
          {/* 封面图轮播 */}
          <div className="lg:rounded-xl lg:overflow-hidden">
            <CourseCover 
              images={mockCourse.images} 
              title={mockCourse.title} 
            />
          </div>

          {/* 营销位：课程封面下方 - 限时优惠倒计时横幅 */}
          {!isPurchased && (
            <div className="px-4 py-2 lg:px-0 lg:mt-4">
              <CountdownBanner 
                endTime={new Date(Date.now() + 2 * 60 * 60 * 1000 + 35 * 60 * 1000)} 
                title="限时特惠"
                discountAmount={mockCourse.originalPrice - mockCourse.currentPrice}
              />
            </div>
          )}

          {/* 课程基本信息 - 移动端显示 */}
          <div className="lg:hidden">
            <CourseInfo
              title={mockCourse.title}
              currentPrice={mockCourse.currentPrice}
              originalPrice={mockCourse.originalPrice}
              studentsCount={mockCourse.studentsCount}
              tags={mockCourse.tags}
            />
          </div>

          {/* 讲师信息 */}
          <div className="lg:mt-4 lg:rounded-xl lg:overflow-hidden">
            <InstructorCard
              name={mockCourse.instructor.name}
              avatar={mockCourse.instructor.avatar}
              title={mockCourse.instructor.title}
              description={mockCourse.instructor.description}
              coursesCount={mockCourse.instructor.coursesCount}
              studentsCount={mockCourse.instructor.studentsCount}
              isVerified={mockCourse.instructor.isVerified}
            />
          </div>

          {/* 营销位：课程介绍上方 - 优惠券领取卡片 */}
          {!isPurchased && (
            <div className="px-4 py-2 lg:px-0 lg:mt-4">
              <CouponClaimCard amount={30} threshold={199} />
            </div>
          )}

          {/* 课程介绍 */}
          <div className="lg:mt-4">
            <CourseDescription
              content={mockCourse.description}
              highlights={mockCourse.highlights}
            />
          </div>

          {/* 中医养生类课程：专业医疗免责声明 */}
          {isHealthCourse && (
            <div className="px-4 lg:px-0 lg:mt-4">
              <Disclaimer variant="medical" tone="card" />
            </div>
          )}

          {/* 课程目录 */}
          <div className="lg:mt-4">
            <CourseChapters
              sections={mockCourse.sections}
              isPurchased={isPurchased}
              onPlayChapter={handlePlayChapter}
            />
          </div>

          {/* 学员评价 */}
          <div className="lg:mt-4 lg:mb-6">
            <CourseReviews
              averageRating={mockCourse.averageRating}
              totalReviews={mockCourse.totalReviews}
              reviews={mockCourse.reviews}
            />
          </div>
        </div>

        {/* 右侧购买卡片 - 仅PC端显示 */}
        <aside className="hidden lg:block lg:w-80 lg:flex-shrink-0">
          <div className="sticky top-6">
            {/* 课程信息卡片 */}
            <div className="bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-4 mb-4 border-0">
              <h1 className="text-lg font-bold text-foreground leading-tight mb-3">
                {mockCourse.title}
              </h1>
              <div className="flex flex-wrap gap-2 mb-4">
                {mockCourse.tags.map((tag, index) => (
                  <span key={index} className="px-2 py-0.5 text-xs rounded bg-primary/10 text-primary">
                    {tag}
                  </span>
                ))}
              </div>
              
              {/* 价格区 */}
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-bold text-primary">
                  <span className="text-lg">¥</span>{mockCourse.currentPrice}
                </span>
                <span className="text-sm text-muted-foreground line-through">
                  ¥{mockCourse.originalPrice}
                </span>
                <span className="text-xs text-green-500 font-medium">
                  省¥{mockCourse.originalPrice - mockCourse.currentPrice}
                </span>
              </div>

              {/* 学习人数 */}
              <p className="text-sm text-muted-foreground mb-4">
                {mockCourse.studentsCount.toLocaleString()} 人已学习
              </p>

              {/* 购买按钮 */}
              {isPurchased ? (
                <button
                  onClick={handleStartLearning}
                  className="w-full py-3 rounded-lg bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors"
                >
                  继续学习
                </button>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={handleBuy}
                    className="w-full py-3 rounded-lg bg-[#C41E3A] text-white font-semibold shadow-lg shadow-[#C41E3A]/20 hover:shadow-[#C41E3A]/30 hover:bg-[#A01830] transition-all"
                  >
                    立即购买
                  </button>
                  <button
                    onClick={handleAddToCart}
                    className="w-full py-3 rounded-lg bg-[#C9A96E]/20 text-[#C9A96E] font-semibold hover:bg-[#C9A96E]/30 transition-colors"
                  >
                    加入购物车
                  </button>
                </div>
              )}

              {/* 信任标签 */}
              <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
                <span>7天无理由</span>
                <span>•</span>
                <span>永久回看</span>
                <span>•</span>
                <span>品质保障</span>
              </div>
            </div>

            {/* 收藏分享 */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleFavorite}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 text-sm hover:bg-secondary transition-colors"
              >
                {isFavorited ? "已收藏" : "收藏"}
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 text-sm hover:bg-secondary transition-colors"
              >
                分享
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* 底部固定栏 - 仅移动端显示 */}
      <div className="lg:hidden">
        <CourseBottomBar
          price={mockCourse.currentPrice}
          originalPrice={mockCourse.originalPrice}
          studentsCount={mockCourse.studentsCount}
          isPurchased={isPurchased}
          isFavorited={isFavorited}
          cartCount={cartCount}
          isUrgent={true}
          onFavorite={handleFavorite}
          onShare={handleShare}
          onAddToCart={handleAddToCart}
          onBuy={handleBuy}
          onStartLearning={handleStartLearning}
        />
      </div>
    </div>
  )
}
