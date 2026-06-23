"use client"

import { useState } from "react"
import Link from "next/link"
import { BackButton } from "@/components/common/back-button"
import { Bell, Gift, AlertTriangle, Megaphone, ChevronRight, Check } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

// 公告类型配置
const noticeTypeConfig = {
  system: { label: "系统公告", icon: Bell, color: "bg-blue-500/20 text-blue-400" },
  activity: { label: "活动通知", icon: Gift, color: "bg-accent/20 text-accent" },
  warning: { label: "重要提醒", icon: AlertTriangle, color: "bg-orange-500/20 text-orange-400" },
  reward: { label: "福利公告", icon: Megaphone, color: "bg-primary/20 text-primary" }
}

// 公告列表数据
const noticeList = [
  {
    id: 1,
    title: "关于平台会员服务升级的公告",
    summary: "为了给您提供更优质的服务体验，平台将于2026年5月15日对会员服务进行全面升级...",
    type: "system",
    publishTime: "2026-05-01 10:00",
    isRead: false,
    isTop: true
  },
  {
    id: 2,
    title: "五一活动：国学币充值双倍赠送",
    summary: "5月1日至5月7日期间，充值国学币即享双倍赠送，多充多送，上不封顶...",
    type: "activity",
    publishTime: "2026-04-30 18:00",
    isRead: false,
    isTop: true
  },
  {
    id: 3,
    title: "关于打击虚假宣传的声明",
    summary: "近期发现部分用户发布虚假宣传内容，平台将严厉打击此类行为...",
    type: "warning",
    publishTime: "2026-04-28 14:30",
    isRead: true,
    isTop: false
  },
  {
    id: 4,
    title: "新功能上线：AI语音问答",
    summary: "热卜国学AI智能体现已支持语音对话功能，让交流更自然便捷...",
    type: "system",
    publishTime: "2026-04-25 10:00",
    isRead: true,
    isTop: false
  },
  {
    id: 5,
    title: "老用户专属福利发放通知",
    summary: "感谢您对热卜国学的支持，作为老用户，您将获得专属福利礼包...",
    type: "reward",
    publishTime: "2026-04-20 09:00",
    isRead: true,
    isTop: false
  },
  {
    id: 6,
    title: "平台服务条款更新公告",
    summary: "根据相关法律法规要求，平台对服务条款进行了部分更新...",
    type: "system",
    publishTime: "2026-04-15 16:00",
    isRead: true,
    isTop: false
  }
]

const tabs = [
  { id: "all", label: "全部" },
  { id: "system", label: "系统公告" },
  { id: "activity", label: "活动通知" },
  { id: "warning", label: "重要提醒" }
]

export default function NoticeListPage() {
  const [activeTab, setActiveTab] = useState("all")
  const [notices, setNotices] = useState(noticeList)

  const filteredNotices = notices.filter(notice => 
    activeTab === "all" || notice.type === activeTab
  )

  const unreadCount = notices.filter(n => !n.isRead).length

  const handleMarkAllRead = () => {
    setNotices(notices.map(n => ({ ...n, isRead: true })))
  }

  const handleNoticeClick = (id: number) => {
    setNotices(notices.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    ))
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton fallbackPath="/settings" />
          <h1 className="font-semibold text-base text-foreground">平台公告</h1>
          {unreadCount > 0 ? (
            <button 
              onClick={handleMarkAllRead}
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              全部已读
            </button>
          ) : (
            <div className="w-12" />
          )}
        </div>

        {/* Tab筛选 */}
        <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-all",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* 公告列表 */}
      <div className="px-4 pt-4">
        {filteredNotices.length > 0 ? (
          <div className="space-y-3">
            {filteredNotices.map(notice => {
              const config = noticeTypeConfig[notice.type as keyof typeof noticeTypeConfig]
              const Icon = config.icon
              
              return (
                <Link
                  key={notice.id}
                  href={`/notice/${notice.id}`}
                  onClick={() => handleNoticeClick(notice.id)}
                >
                  <Card className={cn(
                    "p-4 transition-colors",
                    !notice.isRead && "bg-primary/5 border-primary/20"
                  )}>
                    <div className="flex gap-3">
                      {/* 图标 */}
                      <Avatar className="w-10 h-10 flex-shrink-0">
                        <AvatarFallback className={config.color}>
                          <Icon className="w-5 h-5" />
                        </AvatarFallback>
                      </Avatar>

                      {/* 内容 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 mb-1">
                          {notice.isTop && (
                            <Badge variant="destructive" className="text-[10px] px-1 py-0 flex-shrink-0">
                              置顶
                            </Badge>
                          )}
                          <h3 className={cn(
                            "text-sm line-clamp-1",
                            !notice.isRead ? "font-semibold text-foreground" : "font-medium text-foreground"
                          )}>
                            {notice.title}
                          </h3>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {notice.summary}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground/70">
                            {notice.publishTime}
                          </span>
                          {notice.isRead ? (
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                              <Check className="w-3 h-3" />
                              已读
                            </span>
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                      </div>

                      {/* 箭头 */}
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-3" />
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">暂无公告</p>
          </div>
        )}
      </div>
    </div>
  )
}
