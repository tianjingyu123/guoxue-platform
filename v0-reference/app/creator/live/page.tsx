"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { 
  ArrowLeft, Plus, Video, Users, Eye, TrendingUp, Gift, ShoppingBag,
  Calendar, Clock, MoreHorizontal, Edit3, BarChart2, Trash2, Play,
  Radio, BookOpen, ChevronRight, Bell, Settings
} from "lucide-react"
import { BackButton } from "@/components/common/back-button"

// 数据概览
const statsData = [
  { id: 1, label: "本月直播", value: "12", unit: "场", icon: Video, color: "from-blue-500 to-indigo-500" },
  { id: 2, label: "累计观看", value: "8.6", unit: "万", icon: Eye, color: "from-purple-500 to-violet-500" },
  { id: 3, label: "新增粉丝", value: "1,280", unit: "", icon: Users, color: "from-pink-500 to-rose-500" },
  { id: 4, label: "打赏收入", value: "¥3,680", unit: "", icon: Gift, color: "from-amber-500 to-orange-500" },
  { id: 5, label: "带货成交", value: "¥12,800", unit: "", icon: ShoppingBag, color: "from-emerald-500 to-teal-500" },
]

// 直播状态配置
const statusConfig = {
  preview: { label: "预告中", color: "bg-blue-500", textColor: "text-blue-600", bgColor: "bg-blue-50" },
  live: { label: "直播中", color: "bg-red-500", textColor: "text-red-600", bgColor: "bg-red-50" },
  ended: { label: "已结束", color: "bg-gray-400", textColor: "text-gray-600", bgColor: "bg-gray-50" },
  draft: { label: "草稿", color: "bg-yellow-500", textColor: "text-yellow-600", bgColor: "bg-yellow-50" },
}

// 直播列表数据
const liveList = [
  {
    id: 1,
    title: "八字命理入门：如何快速解读四柱八字",
    cover: "",
    type: "knowledge",
    status: "live",
    scheduledTime: "2024-01-15 20:00",
    duration: "进行中",
    viewers: 1258,
    peakViewers: 2100,
    income: 680,
    likes: 3200,
  },
  {
    id: 2,
    title: "开光貔貅专场：招财转运好物推荐",
    cover: "",
    type: "commerce",
    status: "preview",
    scheduledTime: "2024-01-16 19:30",
    duration: "-",
    viewers: 0,
    peakViewers: 0,
    income: 0,
    likes: 0,
    previewCount: 328,
  },
  {
    id: 3,
    title: "紫微斗数命盘实战解析",
    cover: "",
    type: "knowledge",
    status: "ended",
    scheduledTime: "2024-01-14 20:00",
    duration: "2小时15分",
    viewers: 5680,
    peakViewers: 3200,
    income: 1280,
    likes: 8900,
  },
  {
    id: 4,
    title: "风水布局直播：家居风水调整指南",
    cover: "",
    type: "knowledge",
    status: "ended",
    scheduledTime: "2024-01-12 19:00",
    duration: "1小时45分",
    viewers: 4200,
    peakViewers: 2800,
    income: 960,
    likes: 6500,
  },
  {
    id: 5,
    title: "新品预告直播（未发布）",
    cover: "",
    type: "commerce",
    status: "draft",
    scheduledTime: "",
    duration: "-",
    viewers: 0,
    peakViewers: 0,
    income: 0,
    likes: 0,
  },
]

// Tab配置
const tabs = [
  { key: "all", label: "全部" },
  { key: "preview", label: "预告中" },
  { key: "live", label: "直播中" },
  { key: "ended", label: "已结束" },
  { key: "draft", label: "草稿" },
]

export default function CreatorLiveManagePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("all")
  const [showActions, setShowActions] = useState<number | null>(null)

  // 根据Tab筛选直播列表
  const filteredList = activeTab === "all" 
    ? liveList 
    : liveList.filter(item => item.status === activeTab)

  const formatNumber = (num: number) => {
    if (num >= 10000) return (num / 10000).toFixed(1) + "万"
    return num.toLocaleString()
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <BackButton fallbackPath="/profile" />
            <h1 className="font-semibold text-base text-foreground">直播管理</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-full hover:bg-secondary transition-colors">
              <Bell className="w-5 h-5 text-muted-foreground" />
            </button>
            <button className="p-2 rounded-full hover:bg-secondary transition-colors">
              <Settings className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      {/* 数据概览卡片 - 横向滑动 */}
      <section className="px-4 py-4">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
          {statsData.map((stat) => {
            const Icon = stat.icon
            return (
              <Card 
                key={stat.id}
                className={cn(
                  "flex-shrink-0 w-28 p-3 border-0 bg-gradient-to-br text-white",
                  stat.color
                )}
              >
                <Icon className="w-5 h-5 opacity-80 mb-2" />
                <div className="text-xl font-bold">{stat.value}<span className="text-sm font-normal opacity-80">{stat.unit}</span></div>
                <div className="text-xs opacity-80 mt-0.5">{stat.label}</div>
              </Card>
            )
          })}
        </div>
      </section>

      {/* 快捷操作区 - 创建直播按钮 */}
      <section className="px-4 mb-4">
        <Button 
          onClick={() => router.push("/creator/live/create")}
          className="w-full h-14 text-base font-semibold bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/20"
        >
          <Plus className="w-5 h-5 mr-2" />
          创建直播
        </Button>
        
        {/* 快捷入口 */}
        <div className="grid grid-cols-3 gap-3 mt-3">
          <Card className="p-3 flex flex-col items-center gap-1.5 cursor-pointer hover:bg-secondary/50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-xs text-muted-foreground">知识授课</span>
          </Card>
          <Card className="p-3 flex flex-col items-center gap-1.5 cursor-pointer hover:bg-secondary/50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-orange-500" />
            </div>
            <span className="text-xs text-muted-foreground">电商带货</span>
          </Card>
          <Card className="p-3 flex flex-col items-center gap-1.5 cursor-pointer hover:bg-secondary/50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Radio className="w-5 h-5 text-purple-500" />
            </div>
            <span className="text-xs text-muted-foreground">快速开播</span>
          </Card>
        </div>
      </section>

      {/* 直播列表区 */}
      <section className="px-4">
        {/* Tab切换 */}
        <div className="flex items-center gap-1 mb-4 overflow-x-auto scrollbar-hide -mx-4 px-4">
          {tabs.map((tab) => {
            const count = tab.key === "all" 
              ? liveList.length 
              : liveList.filter(item => item.status === tab.key).length
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors",
                  activeTab === tab.key 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                {count > 0 && (
                  <span className={cn(
                    "ml-1.5 text-xs",
                    activeTab === tab.key ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* 直播列表 */}
        {filteredList.length > 0 ? (
          <div className="space-y-3">
            {filteredList.map((item) => {
              const status = statusConfig[item.status as keyof typeof statusConfig]
              const isLive = item.status === "live"
              
              return (
                <Card 
                  key={item.id}
                  className={cn(
                    "overflow-hidden",
                    isLive && "ring-2 ring-red-500/30"
                  )}
                >
                  <div className="flex gap-3 p-3">
                    {/* 封面图 */}
                    <div className="relative w-28 h-20 rounded-lg bg-secondary flex-shrink-0 overflow-hidden">
                      {item.cover ? (
                        <img src={item.cover} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className="w-8 h-8 text-muted-foreground/30" />
                        </div>
                      )}
                      {/* 状态标签 */}
                      <Badge 
                        className={cn(
                          "absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0 border-0",
                          status.color, "text-white"
                        )}
                      >
                        {isLive && <span className="w-1.5 h-1.5 rounded-full bg-white mr-1 animate-pulse" />}
                        {status.label}
                      </Badge>
                      {/* 类型标签 */}
                      <Badge 
                        variant="secondary"
                        className="absolute bottom-1.5 right-1.5 text-[10px] px-1.5 py-0 bg-black/50 text-white border-0"
                      >
                        {item.type === "knowledge" ? "知识" : "带货"}
                      </Badge>
                    </div>

                    {/* 内容信息 */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h3 className="font-medium text-sm line-clamp-2">{item.title}</h3>
                        {item.scheduledTime && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>{item.scheduledTime}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* 数据统计 */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {item.status === "preview" ? (
                          <>
                            <span className="flex items-center gap-1">
                              <Bell className="w-3 h-3" />
                              {item.previewCount}人预约
                            </span>
                          </>
                        ) : item.status !== "draft" && (
                          <>
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {formatNumber(item.viewers)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {item.duration}
                            </span>
                            {item.income > 0 && (
                              <span className="flex items-center gap-1 text-amber-600">
                                <Gift className="w-3 h-3" />
                                ¥{item.income}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex flex-col items-end justify-between">
                      <button 
                        onClick={() => setShowActions(showActions === item.id ? null : item.id)}
                        className="p-1.5 rounded-full hover:bg-secondary"
                      >
                        <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                      </button>
                      
                      {isLive ? (
                        <Button size="sm" className="h-7 text-xs bg-red-500 hover:bg-red-600">
                          <Play className="w-3 h-3 mr-1" />
                          进入直播
                        </Button>
                      ) : item.status === "preview" ? (
                        <Button size="sm" variant="outline" className="h-7 text-xs">
                          <Edit3 className="w-3 h-3 mr-1" />
                          编辑
                        </Button>
                      ) : item.status === "draft" ? (
                        <Button size="sm" className="h-7 text-xs">
                          继续编辑
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground">
                          <BarChart2 className="w-3 h-3 mr-1" />
                          数据
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* 操作菜单 */}
                  {showActions === item.id && (
                    <div className="flex items-center justify-end gap-2 px-3 pb-3 pt-0 border-t border-border mt-2 pt-2">
                      <Button size="sm" variant="ghost" className="h-8 text-xs">
                        <Edit3 className="w-3.5 h-3.5 mr-1" />
                        编辑
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 text-xs">
                        <BarChart2 className="w-3.5 h-3.5 mr-1" />
                        数据详情
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 text-xs text-red-500 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        删除
                      </Button>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        ) : (
          /* 空状态 */
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-32 h-32 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
              <Video className="w-16 h-16 text-muted-foreground/30" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">暂无直播记录</h3>
            <p className="text-sm text-muted-foreground text-center mb-6">
              开始你的第一场直播，与粉丝实时互动
            </p>
            <Button 
              onClick={() => router.push("/creator/live/create")}
              className="bg-gradient-to-r from-primary to-accent"
            >
              <Plus className="w-4 h-4 mr-2" />
              创建直播
            </Button>
          </div>
        )}
      </section>

      {/* 底部悬浮按钮 - 快速开播 */}
      <div className="fixed bottom-6 right-4 z-30">
        <Button 
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg shadow-red-500/30 bg-gradient-to-br from-red-500 to-pink-500 hover:opacity-90"
          onClick={() => {}}
        >
          <Radio className="w-6 h-6" />
        </Button>
      </div>
    </div>
  )
}
