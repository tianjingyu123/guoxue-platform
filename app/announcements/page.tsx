"use client"

import { useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { 
  ArrowLeft, Bell, Megaphone, Gift, AlertTriangle, 
  Wrench, ChevronRight, Clock
} from "lucide-react"

// 公告类型
const announcementTypes = [
  { id: "all", label: "全部" },
  { id: "notice", label: "平台通知", icon: Bell },
  { id: "activity", label: "活动公告", icon: Gift },
  { id: "update", label: "功能更新", icon: Wrench },
  { id: "important", label: "重要公告", icon: AlertTriangle },
]

// 公告列表
const announcements = [
  {
    id: 1,
    type: "important",
    title: "关于平台服务升级的通知",
    summary: "为提升用户体验，平台将于4月20日凌晨2:00-6:00进行系统升级维护，届时部分功能将暂停使用。",
    time: "2024-03-18",
    isTop: true,
    isNew: true,
  },
  {
    id: 2,
    type: "activity",
    title: "2024春季国学文化节活动开启",
    summary: "春暖花开，热卜国学平台联合多位名师举办春季国学文化节，精彩课程限时优惠，更有神秘大奖等你来拿！",
    time: "2024-03-15",
    isTop: true,
    isNew: true,
  },
  {
    id: 3,
    type: "update",
    title: "新功能上线：研究院正式开放申请",
    summary: "研究院是平台知识分享和学术交流的核心组织，现面向全体圈主开放申请，快来加入我们！",
    time: "2024-03-12",
    isTop: false,
    isNew: false,
  },
  {
    id: 4,
    type: "notice",
    title: "关于加强内容审核的说明",
    summary: "为维护平台良好的学习氛围，我们将进一步加强对平台内容的审核，请各位圈主和创作者遵守平台规范。",
    time: "2024-03-10",
    isTop: false,
    isNew: false,
  },
  {
    id: 5,
    type: "activity",
    title: "分站招募计划正式启动",
    summary: "成为热卜国学分站站长，享受专属权益和分佣收益，首批站长限时优惠中！",
    time: "2024-03-05",
    isTop: false,
    isNew: false,
  },
  {
    id: 6,
    type: "update",
    title: "APP新版本2.0发布",
    summary: "全新设计界面，优化课程播放体验，新增AI排盘助手功能，快来体验吧！",
    time: "2024-02-28",
    isTop: false,
    isNew: false,
  },
  {
    id: 7,
    type: "notice",
    title: "关于调整圈子管理规则的通知",
    summary: "为促进圈子健康发展，平台对圈子管理规则进行了部分调整，请各位圈主仔细阅读。",
    time: "2024-02-20",
    isTop: false,
    isNew: false,
  },
]

const typeConfig: Record<string, { icon: typeof Bell; color: string; bgColor: string }> = {
  notice: { icon: Bell, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  activity: { icon: Gift, color: "text-pink-500", bgColor: "bg-pink-500/10" },
  update: { icon: Wrench, color: "text-green-500", bgColor: "bg-green-500/10" },
  important: { icon: AlertTriangle, color: "text-red-500", bgColor: "bg-red-500/10" },
}

export default function AnnouncementsPage() {
  const [activeType, setActiveType] = useState("all")

  const filteredAnnouncements = activeType === "all" 
    ? announcements 
    : announcements.filter(a => a.type === activeType)

  // 置顶的公告
  const topAnnouncements = filteredAnnouncements.filter(a => a.isTop)
  // 普通公告
  const normalAnnouncements = filteredAnnouncements.filter(a => !a.isTop)

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center px-4 h-12">
          <Link href="/" className="p-1 mr-3">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="font-medium">平台公告</span>
        </div>
      </header>

      {/* 分类筛选 */}
      <div className="sticky top-12 z-40 bg-background border-b border-border">
        <div className="flex overflow-x-auto scrollbar-hide px-4 py-2 gap-2">
          {announcementTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setActiveType(type.id)}
              className={cn(
                "flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                activeType === type.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              )}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* 公告列表 */}
      <div className="px-4 py-4 space-y-3">
        {/* 置顶公告 */}
        {topAnnouncements.length > 0 && (
          <div className="space-y-3">
            {topAnnouncements.map((item) => {
              const config = typeConfig[item.type]
              return (
                <Link key={item.id} href={`/announcements/${item.id}`}>
                  <Card className="p-4 border-primary/30 bg-primary/5">
                    <div className="flex items-start gap-3">
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", config.bgColor)}>
                        <config.icon className={cn("w-5 h-5", config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-red-500 text-white text-[10px] px-1.5">置顶</Badge>
                          {item.isNew && (
                            <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5">NEW</Badge>
                          )}
                        </div>
                        <p className="font-medium mt-1">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.summary}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {item.time}
                          </span>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}

        {/* 普通公告 */}
        {normalAnnouncements.length > 0 && (
          <div className="space-y-3">
            {normalAnnouncements.map((item) => {
              const config = typeConfig[item.type]
              return (
                <Link key={item.id} href={`/announcements/${item.id}`}>
                  <Card className="p-4 hover:bg-secondary/30 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", config.bgColor)}>
                        <config.icon className={cn("w-5 h-5", config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium flex-1 truncate">{item.title}</p>
                          {item.isNew && (
                            <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5">NEW</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.summary}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {item.time}
                          </span>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}

        {filteredAnnouncements.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Megaphone className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无相关公告</p>
          </div>
        )}
      </div>
    </div>
  )
}
