"use client"

import { useState } from "react"
import Link from "next/link"
import { BackButton } from "@/components/common/back-button"
import { TrendingUp, TrendingDown, Users, UserPlus, Activity, DollarSign, ChevronDown, FileText, Heart, MessageCircle, Crown } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// 日期范围选项
const dateRanges = [
  { id: "today", label: "今日" },
  { id: "7days", label: "近7天" },
  { id: "30days", label: "近30天" },
  { id: "custom", label: "自定义" },
]

// 核心数据
const coreMetrics = {
  totalMembers: { value: 1280, change: 12.5, trend: "up" },
  newMembers: { value: 86, change: 23.1, trend: "up" },
  activeMembers: { value: 428, change: -5.2, trend: "down" },
  monthlyRevenue: { value: 12680, change: 18.6, trend: "up" },
}

// 成员增长数据（近7天）
const memberGrowthData = [
  { day: "周一", value: 12 },
  { day: "周二", value: 8 },
  { day: "周三", value: 15 },
  { day: "周四", value: 10 },
  { day: "周五", value: 18 },
  { day: "周六", value: 14 },
  { day: "周日", value: 9 },
]

// 内容互动数据
const contentStats = {
  posts: { value: 156, label: "帖子发布" },
  comments: { value: 892, label: "评论数" },
  likes: { value: 2340, label: "点赞数" },
}

// 热门内容Top10
const hotContents = [
  { id: 1, title: "八字入门：如何看懂自己的命盘", type: "article", views: 1280, likes: 356, comments: 89 },
  { id: 2, title: "今日分享：食神制杀格局详解", type: "post", views: 986, likes: 234, comments: 67 },
  { id: 3, title: "紫微斗数与八字的区别与联系", type: "article", views: 876, likes: 198, comments: 54 },
  { id: 4, title: "风水小知识：办公桌摆放禁忌", type: "post", views: 765, likes: 167, comments: 42 },
  { id: 5, title: "学员案例分析：日主身弱如何补救", type: "article", views: 654, likes: 145, comments: 38 },
]

// 活跃成员榜
const activeMembers = [
  { id: 1, name: "易学小白", avatar: "", posts: 28, interactions: 156, contribution: 184 },
  { id: 2, name: "命理爱好者", avatar: "", posts: 22, interactions: 134, contribution: 156 },
  { id: 3, name: "风水研究员", avatar: "", posts: 18, interactions: 128, contribution: 146 },
  { id: 4, name: "紫微新手", avatar: "", posts: 15, interactions: 112, contribution: 127 },
  { id: 5, name: "八字学徒", avatar: "", posts: 12, interactions: 98, contribution: 110 },
]

// 收入来源数据
const revenueSourceData = [
  { name: "入圈费", value: 4860, percent: 38, color: "bg-primary" },
  { name: "课程销售", value: 3580, percent: 28, color: "bg-accent" },
  { name: "商品分佣", value: 2120, percent: 17, color: "bg-blue-500" },
  { name: "直播打赏", value: 1280, percent: 10, color: "bg-purple-500" },
  { name: "付费问答", value: 840, percent: 7, color: "bg-green-500" },
]

export default function CircleAnalyticsPage() {
  const [dateRange, setDateRange] = useState("7days")
  const [showDatePicker, setShowDatePicker] = useState(false)

  const maxGrowth = Math.max(...memberGrowthData.map(d => d.value))

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <BackButton fallbackPath="/circle/1/home" />
            <h1 className="font-semibold text-lg text-foreground">圈子数据</h1>
          </div>
          
          {/* 日期选择 */}
          <div className="relative">
            <button 
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-1 px-3 py-1.5 bg-secondary rounded-lg text-sm text-foreground"
            >
              {dateRanges.find(r => r.id === dateRange)?.label}
              <ChevronDown className="w-4 h-4" />
            </button>
            {showDatePicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDatePicker(false)} />
                <div className="absolute right-0 top-full mt-1 w-32 bg-card rounded-lg shadow-lg border border-border overflow-hidden z-50">
                  {dateRanges.map(range => (
                    <button
                      key={range.id}
                      onClick={() => { setDateRange(range.id); setShowDatePicker(false) }}
                      className={cn(
                        "w-full px-3 py-2 text-sm text-left hover:bg-secondary transition-colors",
                        dateRange === range.id ? "bg-primary/10 text-primary" : "text-foreground"
                      )}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* 核心数据卡片 */}
        <div className="grid grid-cols-2 gap-3">
          {/* 总成员数 */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground">总成员数</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{coreMetrics.totalMembers.value.toLocaleString()}</p>
            <div className={cn(
              "flex items-center gap-1 text-xs mt-1",
              coreMetrics.totalMembers.trend === "up" ? "text-green-500" : "text-red-500"
            )}>
              {coreMetrics.totalMembers.trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {coreMetrics.totalMembers.change}%
            </div>
          </Card>

          {/* 新增成员 */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <UserPlus className="w-4 h-4 text-accent" />
              </div>
              <span className="text-xs text-muted-foreground">新增成员</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{coreMetrics.newMembers.value}</p>
            <div className={cn(
              "flex items-center gap-1 text-xs mt-1",
              coreMetrics.newMembers.trend === "up" ? "text-green-500" : "text-red-500"
            )}>
              {coreMetrics.newMembers.trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {coreMetrics.newMembers.change}%
            </div>
          </Card>

          {/* 活跃成员 */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Activity className="w-4 h-4 text-blue-500" />
              </div>
              <span className="text-xs text-muted-foreground">活跃成员</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{coreMetrics.activeMembers.value}</p>
            <div className={cn(
              "flex items-center gap-1 text-xs mt-1",
              coreMetrics.activeMembers.trend === "up" ? "text-green-500" : "text-red-500"
            )}>
              {coreMetrics.activeMembers.trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(coreMetrics.activeMembers.change)}%
            </div>
          </Card>

          {/* 本月收入 */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-green-500" />
              </div>
              <span className="text-xs text-muted-foreground">本月收入</span>
            </div>
            <p className="text-2xl font-bold text-foreground">¥{coreMetrics.monthlyRevenue.value.toLocaleString()}</p>
            <div className={cn(
              "flex items-center gap-1 text-xs mt-1",
              coreMetrics.monthlyRevenue.trend === "up" ? "text-green-500" : "text-red-500"
            )}>
              {coreMetrics.monthlyRevenue.trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {coreMetrics.monthlyRevenue.change}%
            </div>
          </Card>
        </div>

        {/* 成员增长趋势图 */}
        <Card className="p-4">
          <h3 className="font-semibold text-sm text-foreground mb-4">成员增长趋势</h3>
          <div className="flex items-end gap-2 h-32">
            {memberGrowthData.map((item, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-muted-foreground">{item.value}</span>
                <div 
                  className="w-full bg-primary/80 rounded-t transition-all hover:bg-primary"
                  style={{ height: `${(item.value / maxGrowth) * 100}%` }}
                />
                <span className="text-[10px] text-muted-foreground">{item.day}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* 内容互动概览 */}
        <Card className="p-4">
          <h3 className="font-semibold text-sm text-foreground mb-4">内容互动概览</h3>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(contentStats).map(([key, stat]) => (
              <div key={key} className="text-center">
                <p className="text-xl font-bold text-foreground">{stat.value.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* 收入来源饼图 */}
        <Card className="p-4">
          <h3 className="font-semibold text-sm text-foreground mb-4">收入来源分布</h3>
          <div className="flex items-center gap-6">
            {/* 简化饼图 */}
            <div className="relative w-24 h-24 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                {revenueSourceData.reduce((acc, item, index) => {
                  const offset = acc.offset
                  acc.elements.push(
                    <circle
                      key={index}
                      cx="18"
                      cy="18"
                      r="15.9"
                      fill="none"
                      stroke={["oklch(0.55 0.2 25)", "oklch(0.75 0.15 75)", "#3b82f6", "#a855f7", "#22c55e"][index]}
                      strokeWidth="4"
                      strokeDasharray={`${item.percent} ${100 - item.percent}`}
                      strokeDashoffset={-offset}
                    />
                  )
                  acc.offset += item.percent
                  return acc
                }, { elements: [] as React.ReactNode[], offset: 0 }).elements}
              </svg>
            </div>
            {/* 图例 */}
            <div className="flex-1 space-y-2">
              {revenueSourceData.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", item.color)} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="text-foreground font-medium">¥{item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* 热门内容Top10 */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm text-foreground">热门内容 Top5</h3>
            <Link href="/circles/1/analytics/contents" className="text-xs text-primary">查看全部</Link>
          </div>
          <div className="space-y-3">
            {hotContents.map((item, index) => (
              <div key={item.id} className="flex items-start gap-3">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold",
                  index < 3 ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"
                )}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground line-clamp-1">{item.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      {item.type === "article" ? "文章" : "帖子"}
                    </Badge>
                    <span className="flex items-center gap-0.5">
                      <Heart className="w-3 h-3" /> {item.likes}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <MessageCircle className="w-3 h-3" /> {item.comments}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* 活跃成员榜 */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm text-foreground">活跃成员榜</h3>
            <Link href="/circle/1/members" className="text-xs text-primary">查看全部</Link>
          </div>
          <div className="space-y-3">
            {activeMembers.map((member, index) => (
              <div key={member.id} className="flex items-center gap-3">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold",
                  index < 3 ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"
                )}>
                  {index === 0 ? <Crown className="w-3 h-3" /> : index + 1}
                </div>
                <Avatar className="w-8 h-8">
                  <AvatarImage src={member.avatar} alt={member.name} />
                  <AvatarFallback className="bg-secondary text-foreground text-xs">
                    {member.name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{member.name}</p>
                  <p className="text-xs text-muted-foreground">
                    发帖 {member.posts} · 互动 {member.interactions}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-accent">{member.contribution}</p>
                  <p className="text-[10px] text-muted-foreground">���献值</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
