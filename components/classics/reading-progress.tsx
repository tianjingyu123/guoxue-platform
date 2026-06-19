"use client"

import { cn } from "@/lib/utils"
import { Check, Target, Award, Flame, BookOpen, Trophy } from "lucide-react"

interface ReadingProgressProps {
  current: number
  total: number
  showLabel?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

// 线性进度条
export function ReadingProgressBar({ 
  current, 
  total, 
  showLabel = true, 
  size = "md",
  className 
}: ReadingProgressProps) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0
  
  const heights = {
    sm: "h-1",
    md: "h-1.5",
    lg: "h-2",
  }
  
  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="flex items-center justify-between mb-1 text-xs">
          <span className="text-muted-foreground">阅读进度</span>
          <span className="text-amber-600 dark:text-amber-400 font-medium">{percent}%</span>
        </div>
      )}
      <div className={cn("w-full bg-secondary rounded-full overflow-hidden", heights[size])}>
        <div 
          className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

// 圆形进度环
export function ReadingProgressRing({ 
  current, 
  total, 
  showLabel = true,
  size = "md",
  className 
}: ReadingProgressProps) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0
  
  const sizes = {
    sm: { width: 40, stroke: 3, fontSize: "text-[10px]" },
    md: { width: 56, stroke: 4, fontSize: "text-xs" },
    lg: { width: 72, stroke: 5, fontSize: "text-sm" },
  }
  
  const { width, stroke, fontSize } = sizes[size]
  const radius = (width - stroke) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percent / 100) * circumference
  
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={width} height={width} className="-rotate-90">
        {/* 背景圆环 */}
        <circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-secondary"
        />
        {/* 进度圆环 */}
        <circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>
      </svg>
      {showLabel && (
        <span className={cn(
          "absolute font-medium text-amber-600 dark:text-amber-400",
          fontSize
        )}>
          {percent}%
        </span>
      )}
    </div>
  )
}

// 阅读打卡日历
interface ReadingCalendarProps {
  data: { date: string; hasRead: boolean }[]
  className?: string
}

export function ReadingCalendar({ data, className }: ReadingCalendarProps) {
  const weekDays = ["一", "二", "三", "四", "五", "六", "日"]
  
  // 取最近7天数据
  const recentDays = data.slice(-7)
  
  return (
    <div className={cn("flex gap-1.5", className)}>
      {weekDays.map((day, index) => {
        const dayData = recentDays[index]
        const hasRead = dayData?.hasRead ?? false
        
        return (
          <div key={day} className="flex flex-col items-center gap-1">
            <div className={cn(
              "w-7 h-7 rounded-md flex items-center justify-center text-xs transition-colors",
              hasRead 
                ? "bg-amber-500 text-white" 
                : "bg-secondary text-muted-foreground"
            )}>
              {hasRead ? <Check className="w-3.5 h-3.5" /> : day}
            </div>
            <span className="text-[10px] text-muted-foreground">{day}</span>
          </div>
        )
      })}
    </div>
  )
}

// 阅读统计卡片
interface ReadingStatsCardProps {
  totalMinutes: number
  totalBooks: number
  streak: number
  dailyGoal?: number // 每日阅读目标（分钟）
  todayMinutes?: number // 今日已读时长
  calendarData?: { date: string; hasRead: boolean }[]
  className?: string
}

export function ReadingStatsCard({ 
  totalMinutes, 
  totalBooks, 
  streak,
  dailyGoal = 30,
  todayMinutes = 0,
  calendarData = [],
  className 
}: ReadingStatsCardProps) {
  const goalProgress = dailyGoal > 0 ? Math.min(100, Math.round((todayMinutes / dailyGoal) * 100)) : 0
  const isGoalReached = todayMinutes >= dailyGoal
  
  return (
    <div className={cn(
      "bg-card rounded-xl border border-border/60 p-4",
      className
    )}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1">本周阅读</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-foreground">{totalMinutes}</span>
            <span className="text-sm text-muted-foreground">分钟</span>
          </div>
        </div>
        <ReadingCalendar data={calendarData} />
      </div>
      
      {/* 今日目标进度 */}
      <div className="mb-3 p-2.5 rounded-lg bg-secondary/50">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-[var(--classics-jing)]" />
            <span className="text-xs text-muted-foreground">今日目标</span>
          </div>
          <span className="text-xs font-medium">
            {todayMinutes}/{dailyGoal}分钟
            {isGoalReached && <span className="ml-1 text-[var(--classics-zi)]">已达成!</span>}
          </span>
        </div>
        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isGoalReached 
                ? "bg-[var(--classics-zi)]" 
                : "bg-gradient-to-r from-amber-500 to-amber-600"
            )}
            style={{ width: `${goalProgress}%` }}
          />
        </div>
      </div>
      
      <div className="flex items-center gap-6 text-sm">
        <div>
          <span className="text-muted-foreground">已读 </span>
          <span className="font-medium text-foreground">{totalBooks}</span>
          <span className="text-muted-foreground"> 本</span>
        </div>
        <div className="flex items-center gap-1">
          <Flame className="w-3.5 h-3.5 text-orange-500" />
          <span className="text-muted-foreground">连续 </span>
          <span className="font-medium text-amber-600 dark:text-amber-400">{streak}</span>
          <span className="text-muted-foreground"> 天</span>
        </div>
      </div>
    </div>
  )
}

// 成就徽章
interface AchievementBadgeProps {
  id: string
  name: string
  description: string
  icon: "flame" | "book" | "trophy" | "award"
  unlocked: boolean
  progress?: number // 0-100
  className?: string
}

export function AchievementBadge({ 
  name, 
  description, 
  icon, 
  unlocked, 
  progress = 0,
  className 
}: AchievementBadgeProps) {
  const icons = {
    flame: Flame,
    book: BookOpen,
    trophy: Trophy,
    award: Award,
  }
  const Icon = icons[icon]
  
  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-xl border transition-all",
      unlocked 
        ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800" 
        : "bg-secondary/30 border-border/60 opacity-60",
      className
    )}>
      <div className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center",
        unlocked 
          ? "bg-gradient-to-br from-amber-400 to-amber-600" 
          : "bg-secondary"
      )}>
        <Icon className={cn(
          "w-5 h-5",
          unlocked ? "text-white" : "text-muted-foreground"
        )} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium truncate",
          unlocked ? "text-foreground" : "text-muted-foreground"
        )}>{name}</p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
        {!unlocked && progress > 0 && (
          <div className="mt-1.5 w-full h-1 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-amber-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
      {unlocked && (
        <Check className="w-4 h-4 text-amber-600 flex-shrink-0" />
      )}
    </div>
  )
}

// 成就列表
interface AchievementsListProps {
  achievements: Omit<AchievementBadgeProps, 'className'>[]
  className?: string
}

export function AchievementsList({ achievements, className }: AchievementsListProps) {
  const unlockedCount = achievements.filter(a => a.unlocked).length
  
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Award className="w-4 h-4 text-amber-600" />
          <span className="font-medium text-sm">阅读成就</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {unlockedCount}/{achievements.length} 已解锁
        </span>
      </div>
      <div className="grid gap-2">
        {achievements.map(achievement => (
          <AchievementBadge key={achievement.id} {...achievement} />
        ))}
      </div>
    </div>
  )
}
