"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, TrendingUp, TrendingDown, Users, DollarSign, BookOpen, Target, Star, ChevronRight } from "lucide-react"
import { BackButton } from "@/components/common/back-button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

// 模拟课程列表
const courses = [
  { id: 1, name: "八字命理入门精讲" },
  { id: 2, name: "紫微斗数实战课" },
  { id: 3, name: "风水堪舆基础" },
]

// 模拟数据
const analyticsData = {
  totalSales: 1280,
  salesGrowth: 12.5,
  totalRevenue: 255800,
  revenueGrowth: 18.2,
  activeStudents: 856,
  activeGrowth: 8.3,
  completionRate: 68.5,
  completionGrowth: 3.2,
  
  // 销售趋势
  salesTrend: [
    { date: "05/03", sales: 12, revenue: 2388 },
    { date: "05/04", sales: 18, revenue: 3582 },
    { date: "05/05", sales: 15, revenue: 2985 },
    { date: "05/06", sales: 22, revenue: 4378 },
    { date: "05/07", sales: 28, revenue: 5572 },
    { date: "05/08", sales: 20, revenue: 3980 },
    { date: "05/09", sales: 25, revenue: 4975 },
  ],
  
  // 学习漏斗
  funnel: [
    { stage: "已购买", count: 1280, percent: 100 },
    { stage: "已开始学习", count: 1024, percent: 80 },
    { stage: "学完50%", count: 768, percent: 60 },
    { stage: "学完100%", count: 512, percent: 40 },
  ],
  
  // 章节完课率
  chapters: [
    { name: "第1章 基础概念", rate: 95 },
    { name: "第2章 天干地支", rate: 88 },
    { name: "第3章 五行生克", rate: 82 },
    { name: "第4章 十神详解", rate: 75 },
    { name: "第5章 格局分析", rate: 68 },
    { name: "第6章 实战案例", rate: 55 },
  ],
  
  // 评分分布
  ratings: [
    { stars: 5, count: 856, percent: 67 },
    { stars: 4, count: 280, percent: 22 },
    { stars: 3, count: 102, percent: 8 },
    { stars: 2, count: 26, percent: 2 },
    { stars: 1, count: 16, percent: 1 },
  ],
  
  // 最近评价
  reviews: [
    { id: 1, user: "易学爱好者", avatar: "", rating: 5, content: "讲解非常清晰，适合入门学习，收获很大！", time: "10分钟前" },
    { id: 2, user: "命理研习生", avatar: "", rating: 5, content: "周易大师的课程质量一如既往的高，推荐！", time: "1小时前" },
    { id: 3, user: "风水学徒", avatar: "", rating: 4, content: "内容很专业，就是有些章节难度较高，需要多看几遍。", time: "3小时前" },
  ],
}

const dateRanges = ["今日", "近7天", "近30天", "近90天", "自定义"]

export default function CourseAnalyticsPage() {
  const [selectedRange, setSelectedRange] = useState("近7天")
  const [selectedCourse, setSelectedCourse] = useState(courses[0])
  const [showCourseDropdown, setShowCourseDropdown] = useState(false)
  const [trendType, setTrendType] = useState<"sales" | "revenue">("sales")
  
  const maxSales = Math.max(...analyticsData.salesTrend.map(d => trendType === "sales" ? d.sales : d.revenue / 100))
  
  return (
    <div className="min-h-screen bg-background pb-6">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
        <div className="flex items-center justify-between px-4 h-14">
  <div className="flex items-center gap-3">
  <BackButton fallbackPath="/manage/course" />
  <h1 className="font-semibold text-foreground">课程数据</h1>
          </div>
        </div>
      </header>

      {/* 课程选择和日期范围 */}
      <div className="px-4 py-3 space-y-3">
        {/* 课程选择 */}
        <div className="relative">
          <button
            onClick={() => setShowCourseDropdown(!showCourseDropdown)}
            className="w-full flex items-center justify-between px-4 py-3 bg-card rounded-xl border border-border"
          >
            <span className="font-medium text-foreground">{selectedCourse.name}</span>
            <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform", showCourseDropdown && "rotate-180")} />
          </button>
          {showCourseDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-10 overflow-hidden">
              {courses.map(course => (
                <button
                  key={course.id}
                  onClick={() => { setSelectedCourse(course); setShowCourseDropdown(false) }}
                  className={cn(
                    "w-full px-4 py-3 text-left text-sm hover:bg-secondary transition-colors",
                    selectedCourse.id === course.id && "bg-primary/10 text-primary"
                  )}
                >
                  {course.name}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* 日期范围 */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {dateRanges.map(range => (
            <button
              key={range}
              onClick={() => setSelectedRange(range)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors",
                selectedRange === range
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* 核心数据卡片 */}
      <div className="px-4 grid grid-cols-2 gap-3">
        {[
          { label: "累计销量", value: analyticsData.totalSales.toLocaleString(), unit: "人", growth: analyticsData.salesGrowth, icon: Users, color: "text-primary" },
          { label: "累计收入", value: (analyticsData.totalRevenue / 100).toLocaleString(), unit: "元", growth: analyticsData.revenueGrowth, icon: DollarSign, color: "text-accent" },
          { label: "在学人数", value: analyticsData.activeStudents.toLocaleString(), unit: "人", growth: analyticsData.activeGrowth, icon: BookOpen, color: "text-blue-500" },
          { label: "完课率", value: analyticsData.completionRate.toString(), unit: "%", growth: analyticsData.completionGrowth, icon: Target, color: "text-green-500" },
        ].map((item, index) => {
          const Icon = item.icon
          return (
            <Card key={index} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <Icon className={cn("w-4 h-4", item.color)} />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-foreground">{item.value}</span>
                <span className="text-sm text-muted-foreground">{item.unit}</span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                {item.growth >= 0 ? (
                  <TrendingUp className="w-3 h-3 text-green-500" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-500" />
                )}
                <span className={cn("text-xs", item.growth >= 0 ? "text-green-500" : "text-red-500")}>
                  {item.growth >= 0 ? "+" : ""}{item.growth}%
                </span>
                <span className="text-xs text-muted-foreground">环比</span>
              </div>
            </Card>
          )
        })}
      </div>

      {/* 销售趋势图 */}
      <div className="px-4 mt-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">销售趋势</h3>
            <div className="flex gap-1 p-0.5 bg-secondary rounded-lg">
              <button
                onClick={() => setTrendType("sales")}
                className={cn(
                  "px-3 py-1 text-xs rounded-md transition-colors",
                  trendType === "sales" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                )}
              >
                销量
              </button>
              <button
                onClick={() => setTrendType("revenue")}
                className={cn(
                  "px-3 py-1 text-xs rounded-md transition-colors",
                  trendType === "revenue" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                )}
              >
                收入
              </button>
            </div>
          </div>
          <div className="h-40 flex items-end gap-2">
            {analyticsData.salesTrend.map((day, index) => {
              const value = trendType === "sales" ? day.sales : day.revenue / 100
              const height = (value / maxSales) * 100
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">
                    {trendType === "sales" ? day.sales : `¥${(day.revenue / 100).toFixed(0)}`}
                  </span>
                  <div
                    className="w-full bg-primary/80 rounded-t-sm transition-all"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[10px] text-muted-foreground">{day.date}</span>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* 学习漏斗 */}
      <div className="px-4 mt-4">
        <Card className="p-4">
          <h3 className="font-semibold text-foreground mb-4">学员学习进度</h3>
          <div className="space-y-3">
            {analyticsData.funnel.map((stage, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-foreground">{stage.stage}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{stage.count}</span>
                    <span className="text-xs text-muted-foreground">({stage.percent}%)</span>
                  </div>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
                    style={{ width: `${stage.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 章节完课率 */}
      <div className="px-4 mt-4">
        <Card className="p-4">
          <h3 className="font-semibold text-foreground mb-4">章节完课率</h3>
          <div className="space-y-3">
            {analyticsData.chapters.map((chapter, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground line-clamp-1 flex-1">{chapter.name}</span>
                  <span className={cn(
                    "text-xs font-medium ml-2",
                    chapter.rate >= 80 ? "text-green-500" : chapter.rate >= 60 ? "text-accent" : "text-red-500"
                  )}>
                    {chapter.rate}%
                  </span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      chapter.rate >= 80 ? "bg-green-500" : chapter.rate >= 60 ? "bg-accent" : "bg-red-500"
                    )}
                    style={{ width: `${chapter.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            提示：第6章流失率较高，建议优化内容或增加互动
          </p>
        </Card>
      </div>

      {/* 评分分布 */}
      <div className="px-4 mt-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">学员评分</h3>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-accent fill-accent" />
              <span className="font-bold text-foreground">4.8</span>
              <span className="text-xs text-muted-foreground">({analyticsData.ratings.reduce((a, b) => a + b.count, 0)}条)</span>
            </div>
          </div>
          <div className="space-y-2">
            {analyticsData.ratings.map((rating) => (
              <div key={rating.stars} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-8">{rating.stars}星</span>
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full"
                    style={{ width: `${rating.percent}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-12 text-right">{rating.count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 最近评价 */}
      <div className="px-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">最近评价</h3>
          <Link href="/manage/course/1/reviews" className="flex items-center gap-1 text-xs text-muted-foreground">
            全部评价 <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="space-y-3">
          {analyticsData.reviews.map(review => (
            <Card key={review.id} className="p-3">
              <div className="flex items-start gap-3">
                <Avatar className="w-9 h-9">
                  <AvatarImage src={review.avatar} alt={review.user} />
                  <AvatarFallback className="bg-secondary text-foreground text-xs">
                    {review.user[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{review.user}</span>
                    <span className="text-xs text-muted-foreground">{review.time}</span>
                  </div>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "w-3 h-3",
                          i < review.rating ? "text-accent fill-accent" : "text-muted-foreground/30"
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{review.content}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
