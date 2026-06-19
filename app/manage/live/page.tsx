"use client"

import { useState } from "react"
import Link from "next/link"
import { BackButton } from "@/components/common/back-button"
import { Plus, Radio, Eye, Clock, MoreHorizontal, Play, Trash2, Edit, Copy, Video } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

// 模拟直播历史数据
const liveHistory = [
  {
    id: 1,
    title: "八字命理入门：如何看懂你的命盘",
    cover: "/placeholder.svg",
    type: "knowledge",
    status: "ended",
    viewers: 1234,
    peakViewers: 456,
    duration: "1小时32分",
    startTime: "2024-01-15 20:00",
    endTime: "2024-01-15 21:32",
    hasReplay: true,
  },
  {
    id: 2,
    title: "国学文创好物推荐专场",
    cover: "/placeholder.svg",
    type: "ecommerce",
    status: "ended",
    viewers: 2567,
    peakViewers: 890,
    duration: "2小时15分",
    startTime: "2024-01-12 19:30",
    endTime: "2024-01-12 21:45",
    hasReplay: true,
    salesAmount: 12680,
    orderCount: 156,
  },
  {
    id: 3,
    title: "紫微斗数精讲第三期",
    cover: "/placeholder.svg",
    type: "knowledge",
    status: "scheduled",
    scheduledTime: "2024-01-20 20:00",
    reserveCount: 328,
  },
  {
    id: 4,
    title: "风水布局实战讲解",
    cover: "/placeholder.svg",
    type: "knowledge",
    status: "draft",
    updatedAt: "2024-01-10 15:30",
  },
]

export default function LiveManagePage() {
  const [showMenu, setShowMenu] = useState<number | null>(null)
  const [filter, setFilter] = useState<"all" | "ended" | "scheduled" | "draft">("all")

  const filteredLives = liveHistory.filter(live => {
    if (filter === "all") return true
    return live.status === filter
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ended":
        return <Badge variant="secondary" className="text-[10px] bg-secondary text-muted-foreground">已结束</Badge>
      case "scheduled":
        return <Badge variant="secondary" className="text-[10px] bg-accent/20 text-accent">待开播</Badge>
      case "draft":
        return <Badge variant="secondary" className="text-[10px] bg-muted text-muted-foreground">草稿</Badge>
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <BackButton fallbackPath="/profile" />
            <h1 className="font-semibold text-lg text-foreground">直播管理</h1>
          </div>
        </div>
      </header>

      <main className="p-4 pb-20 max-w-2xl mx-auto">
        {/* 创建直播入口 */}
        <Link href="/manage/live/create">
          <Card className="p-6 bg-gradient-to-br from-primary/10 to-accent/5 border-primary/20 hover:border-primary/40 transition-all cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <Plus className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">创建直播</h2>
                <p className="text-sm text-muted-foreground mt-0.5">开启一场知识授课或电商带货直播</p>
              </div>
            </div>
          </Card>
        </Link>

        {/* 数据概览 */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">12</p>
            <p className="text-xs text-muted-foreground mt-1">累计直播</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-accent">8.6万</p>
            <p className="text-xs text-muted-foreground mt-1">总观看</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">¥3.2万</p>
            <p className="text-xs text-muted-foreground mt-1">带货金额</p>
          </Card>
        </div>

        {/* 筛选Tab */}
        <div className="flex items-center gap-2 mt-6 mb-4">
          {[
            { key: "all", label: "全部" },
            { key: "ended", label: "已结束" },
            { key: "scheduled", label: "待开播" },
            { key: "draft", label: "草稿" },
          ].map(item => (
            <button
              key={item.key}
              onClick={() => setFilter(item.key as typeof filter)}
              className={cn(
                "px-4 py-1.5 text-sm rounded-full transition-colors",
                filter === item.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* 直播列表 */}
        <div className="space-y-3">
          {filteredLives.map(live => (
            <Card key={live.id} className="p-4 bg-card hover:bg-secondary/30 transition-colors">
              <div className="flex gap-4">
                {/* 封面 */}
                <div className="w-28 h-16 rounded-lg bg-secondary flex items-center justify-center relative overflow-hidden flex-shrink-0">
                  <Video className="w-8 h-8 text-muted-foreground/50" />
                  {live.type === "knowledge" && (
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-blue-500/90 rounded text-[10px] text-white">
                      知识
                    </div>
                  )}
                  {live.type === "ecommerce" && (
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-orange-500/90 rounded text-[10px] text-white">
                      带货
                    </div>
                  )}
                  {live.hasReplay && (
                    <div className="absolute bottom-1 right-1 p-1 bg-black/60 rounded">
                      <Play className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>

                {/* 信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-sm text-foreground line-clamp-1">{live.title}</h3>
                    {getStatusBadge(live.status)}
                  </div>

                  {live.status === "ended" && (
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        {live.viewers}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {live.duration}
                      </span>
                      {live.salesAmount && (
                        <span className="text-accent">¥{live.salesAmount}</span>
                      )}
                    </div>
                  )}

                  {live.status === "scheduled" && (
                    <p className="text-xs text-muted-foreground mt-2">
                      预约开播: {live.scheduledTime} · {live.reserveCount}人预约
                    </p>
                  )}

                  {live.status === "draft" && (
                    <p className="text-xs text-muted-foreground mt-2">
                      更新于: {live.updatedAt}
                    </p>
                  )}

                  <p className="text-[10px] text-muted-foreground/70 mt-1">
                    {live.startTime || live.scheduledTime || live.updatedAt}
                  </p>
                </div>

                {/* 更多操作 */}
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(showMenu === live.id ? null : live.id)}
                    className="p-2 hover:bg-secondary rounded-full transition-colors"
                  >
                    <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                  </button>

                  {showMenu === live.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowMenu(null)} />
                      <div className="absolute right-0 top-10 z-50 w-36 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                        {live.hasReplay && (
                          <button className="flex items-center gap-2 w-full px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors">
                            <Play className="w-4 h-4" />
                            查看回放
                          </button>
                        )}
                        <button className="flex items-center gap-2 w-full px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors">
                          <Edit className="w-4 h-4" />
                          编辑
                        </button>
                        <button className="flex items-center gap-2 w-full px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors">
                          <Copy className="w-4 h-4" />
                          复制链接
                        </button>
                        <button className="flex items-center gap-2 w-full px-4 py-3 text-sm text-destructive hover:bg-secondary transition-colors">
                          <Trash2 className="w-4 h-4" />
                          删除
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filteredLives.length === 0 && (
          <div className="text-center py-12">
            <Radio className="w-12 h-12 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground mt-3">暂无直播记录</p>
          </div>
        )}
      </main>
    </div>
  )
}
