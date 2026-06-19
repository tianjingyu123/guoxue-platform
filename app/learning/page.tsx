"use client"

import { useState } from "react"
import { Play, Clock, Trophy, Target, ChevronRight, BookOpen, Award, Flame, Sparkles } from "lucide-react"
import { BackButton } from "@/components/common/back-button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { LearningPath, presetPaths } from "@/components/learning/learning-path"
import { AchievementBadges, presetBadges } from "@/components/learning/achievement-badges"

// 学习统计数据
const statsData = {
  totalMinutes: 1280,
  totalCourses: 12,
  completedCourses: 5,
  streak: 7,
  weeklyTarget: 300,
  weeklyProgress: 180,
}

// 正在学习的课程
const learningCourses = [
  { id: 1, title: "八字入门实战课", instructor: "周易大师", progress: 65, lastChapter: "第5章 十神详解", lastTime: "昨天 14:30", totalChapters: 28, completedChapters: 18 },
  { id: 2, title: "紫微斗数精讲", instructor: "张玄风", progress: 40, lastChapter: "第12章 四化详解", lastTime: "3天前", totalChapters: 36, completedChapters: 14 },
  { id: 3, title: "风水布局入门", instructor: "陈风水", progress: 15, lastChapter: "第2章 八宅风水", lastTime: "1周前", totalChapters: 12, completedChapters: 2 },
]

// 已完成的课程
const completedCourses = [
  { id: 4, title: "易经六十四卦速记", instructor: "周易大师", completedDate: "2024-01-10", rating: 5, certificate: true },
  { id: 5, title: "八字看婚姻专题", instructor: "玄学居士", completedDate: "2024-01-05", rating: 4, certificate: true },
  { id: 6, title: "姓名学入门", instructor: "李国学", completedDate: "2023-12-28", rating: 5, certificate: false },
]

// 学习日历数据（最近7天）
const calendarData = [
  { day: "一", date: 6, minutes: 45, completed: true },
  { day: "二", date: 7, minutes: 30, completed: true },
  { day: "三", date: 8, minutes: 60, completed: true },
  { day: "四", date: 9, minutes: 0, completed: false },
  { day: "五", date: 10, minutes: 45, completed: true },
  { day: "六", date: 11, minutes: 0, completed: false },
  { day: "日", date: 12, minutes: 0, completed: false, isToday: true },
]

export default function LearningPage() {
  const [activeTab, setActiveTab] = useState<"learning" | "completed">("learning")

  // 格式化时间
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}小时${mins > 0 ? `${mins}分钟` : ''}` : `${mins}分钟`
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton fallbackPath="/profile" />
          <h1 className="font-semibold text-base text-foreground">学习进度</h1>
          <div className="w-9" />
        </div>
      </header>

      {/* 学习统计卡片 */}
      <div className="px-4 py-4">
        <Card className="bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 border-primary/20 p-4">
          {/* 连续学习天数 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-medium text-foreground">连续学习 {statsData.streak} 天</span>
            </div>
            <Badge className="bg-orange-500/10 text-orange-600">坚持就是胜利</Badge>
          </div>

          {/* 学习日历 */}
          <div className="flex justify-between mb-4">
            {calendarData.map((day, index) => (
              <div key={index} className="flex flex-col items-center">
                <span className="text-[10px] text-muted-foreground mb-1">{day.day}</span>
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
                  day.isToday && "ring-2 ring-primary",
                  day.completed 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-secondary text-muted-foreground"
                )}>
                  {day.date}
                </div>
                {day.minutes > 0 && (
                  <span className="text-[10px] text-muted-foreground mt-1">{day.minutes}分</span>
                )}
              </div>
            ))}
          </div>

          {/* 本周目标进度 */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground flex items-center gap-1">
                <Target className="w-3 h-3" /> 本周目标
              </span>
              <span className="text-foreground font-medium">
                {formatTime(statsData.weeklyProgress)} / {formatTime(statsData.weeklyTarget)}
              </span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
                style={{ width: `${(statsData.weeklyProgress / statsData.weeklyTarget) * 100}%` }}
              />
            </div>
          </div>
        </Card>

        {/* 统计数据网格 */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <Card className="p-3 text-center">
            <Clock className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{formatTime(statsData.totalMinutes)}</p>
            <p className="text-[10px] text-muted-foreground">累计学习</p>
          </Card>
          <Card className="p-3 text-center">
            <BookOpen className="w-5 h-5 text-accent mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{statsData.totalCourses}</p>
            <p className="text-[10px] text-muted-foreground">学习课程</p>
          </Card>
          <Card className="p-3 text-center">
            <Trophy className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{statsData.completedCourses}</p>
            <p className="text-[10px] text-muted-foreground">已完成</p>
          </Card>
        </div>
      </div>

      {/* Tab切换 */}
      <div className="px-4 mb-4">
        <div className="flex bg-secondary rounded-xl p-1">
          <button
            onClick={() => setActiveTab("learning")}
            className={cn(
              "flex-1 py-2 text-sm font-medium rounded-lg transition-colors",
              activeTab === "learning"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground"
            )}
          >
            正在学习 ({learningCourses.length})
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={cn(
              "flex-1 py-2 text-sm font-medium rounded-lg transition-colors",
              activeTab === "completed"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground"
            )}
          >
            已完成 ({completedCourses.length})
          </button>
        </div>
      </div>

      {/* 课程列表 */}
      <div className="px-4 space-y-3">
        {activeTab === "learning" ? (
          learningCourses.map(course => (
            <Link key={course.id} href={`/learn/${course.id}`}>
              <Card className="p-4 hover:bg-secondary/50 transition-colors">
                <div className="flex gap-3">
                  {/* 封面 */}
                  <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                    <Play className="w-8 h-8 text-primary/60" />
                  </div>

                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm text-foreground line-clamp-1 mb-1">{course.title}</h3>
                    <p className="text-xs text-muted-foreground mb-2">{course.instructor}</p>
                    
                    {/* 进度条 */}
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                        <span>已学 {course.completedChapters}/{course.totalChapters} 章</span>
                        <span>{course.progress}%</span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-muted-foreground">
                        上次学到：{course.lastChapter}
                      </p>
                      <span className="text-[10px] text-muted-foreground">{course.lastTime}</span>
                    </div>
                  </div>
                </div>

                {/* 继续学习按钮 */}
                <button className="w-full mt-3 py-2 bg-primary/10 text-primary text-sm font-medium rounded-lg hover:bg-primary/20 transition-colors">
                  继续学习
                </button>
              </Card>
            </Link>
          ))
        ) : (
          completedCourses.map(course => (
            <Link key={course.id} href={`/course/${course.id}`}>
              <Card className="p-4 hover:bg-secondary/50 transition-colors">
                <div className="flex gap-3">
                  {/* 封面 */}
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center flex-shrink-0 relative">
                    <Trophy className="w-6 h-6 text-green-600" />
                    {course.certificate && (
                      <Award className="w-4 h-4 text-amber-500 absolute -top-1 -right-1" />
                    )}
                  </div>

                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-sm text-foreground line-clamp-1">{course.title}</h3>
                      <Badge className="bg-green-500/10 text-green-600 text-[10px] px-1.5 py-0">已完成</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{course.instructor}</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <span 
                            key={i} 
                            className={cn(
                              "text-xs",
                              i < course.rating ? "text-amber-400" : "text-muted-foreground/30"
                            )}
                          >
                            ★
                          </span>
                        ))}
                        <span className="text-[10px] text-muted-foreground ml-1">我的评分</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">完成于 {course.completedDate}</span>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-muted-foreground self-center" />
                </div>

                {course.certificate && (
                  <button className="w-full mt-3 py-2 bg-amber-500/10 text-amber-600 text-sm font-medium rounded-lg hover:bg-amber-500/20 transition-colors flex items-center justify-center gap-2">
                    <Award className="w-4 h-4" />
                    查看结业证书
                  </button>
                )}
              </Card>
            </Link>
          ))
        )}
      </div>

      {/* 学习路径 */}
      <div className="px-4 mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-base text-foreground">我的学习路径</h2>
        </div>
        <LearningPath {...presetPaths.bazi} />
      </div>

      {/* 成就徽章 */}
      <div className="px-4 mt-6 pb-6">
        <AchievementBadges badges={presetBadges} />
      </div>
    </div>
  )
}
