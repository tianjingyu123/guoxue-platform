"use client"

import { useState } from "react"
import Link from "next/link"
import { BackButton } from "@/components/common/back-button"
import { Share2, ChevronRight, Bell, Megaphone, AlertTriangle, Gift } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

// 公告详情数据
const noticeData = {
  id: 1,
  title: "关于平台会员服务升级的公告",
  type: "system", // system | activity | warning | reward
  publishTime: "2026-05-01 10:00",
  readCount: 12580,
  content: [
    { type: "paragraph", text: "尊敬的热卜国学用户：" },
    { type: "paragraph", text: "为了给您提供更优质的服务体验，平台将于2026年5月15日对会员服务进行全面升级。本次升级将带来以下变化：" },
    { type: "heading", level: 2, text: "一、服务升级内容" },
    { type: "list", items: [
      "排盘工具：新增紫微斗数精批功能，支持更详细的命盘分析",
      "AI智能体：升级对话模型，回复更准确、更专业",
      "课程服务：新增离线下载功能，支持无网络学习",
      "圈子功能：优化互动体验，新增语音帖功能"
    ]},
    { type: "heading", level: 2, text: "二、会员权益调整" },
    { type: "paragraph", text: "本次升级后，会员权益将进行优化调整：" },
    { type: "table", headers: ["权益项目", "原权益", "升级后"], rows: [
      ["排盘次数", "每日10次", "每日20次"],
      ["AI对话", "每日50次", "每日100次"],
      ["课程折扣", "9折", "8.5折"],
      ["专属客服", "无", "7×12小时"]
    ]},
    { type: "heading", level: 2, text: "三、升级时间" },
    { type: "paragraph", text: "升级时间：2026年5月15日 00:00 - 06:00" },
    { type: "quote", text: "升级期间，部分服务可能暂时不可用，请您提前做好安排。给您带来的不便，敬请谅解。" },
    { type: "heading", level: 2, text: "四、联系我们" },
    { type: "paragraph", text: "如您有任何疑问，可通过以下方式联系我们：" },
    { type: "list", items: [
      "在线客服：APP内「我的」-「帮助中心」-「联系客服」",
      "客服邮箱：service@rebu.com",
      "客服电话：400-888-8888（工作日 9:00-18:00）"
    ]},
    { type: "paragraph", text: "感谢您一直以来对热卜国学的支持与信任！" },
    { type: "signature", text: "热卜国学运营团队", date: "2026年5月1日" }
  ],
  relatedNotices: [
    { id: 2, title: "五一活动：国学币充值双倍赠送", type: "activity" },
    { id: 3, title: "关于打击虚假宣传的声明", type: "warning" }
  ]
}

// 公告类型配置
const noticeTypeConfig = {
  system: { label: "系统公告", icon: Bell, color: "bg-blue-500/20 text-blue-400" },
  activity: { label: "活动通知", icon: Gift, color: "bg-accent/20 text-accent" },
  warning: { label: "重要提醒", icon: AlertTriangle, color: "bg-orange-500/20 text-orange-400" },
  reward: { label: "福利公告", icon: Megaphone, color: "bg-primary/20 text-primary" }
}

export default function NoticeDetailPage() {
  const [showShareTip, setShowShareTip] = useState(false)
  
  const typeConfig = noticeTypeConfig[noticeData.type as keyof typeof noticeTypeConfig]
  const TypeIcon = typeConfig.icon

  const handleShare = () => {
    setShowShareTip(true)
    setTimeout(() => setShowShareTip(false), 2000)
  }

  // 渲染富文本内容
  const renderContent = (item: any, index: number) => {
    switch (item.type) {
      case "heading":
        return (
          <h2 key={index} className={`font-bold text-foreground mt-6 mb-3 ${item.level === 2 ? "text-base" : "text-sm"}`}>
            {item.text}
          </h2>
        )
      case "paragraph":
        return (
          <p key={index} className="text-sm text-muted-foreground leading-relaxed mb-3">
            {item.text}
          </p>
        )
      case "list":
        return (
          <ul key={index} className="list-disc list-inside space-y-1.5 mb-4 pl-2">
            {item.items.map((li: string, i: number) => (
              <li key={i} className="text-sm text-muted-foreground leading-relaxed">{li}</li>
            ))}
          </ul>
        )
      case "quote":
        return (
          <blockquote key={index} className="border-l-3 border-accent pl-4 py-2 my-4 bg-accent/5 rounded-r-lg">
            <p className="text-sm text-muted-foreground italic">{item.text}</p>
          </blockquote>
        )
      case "table":
        return (
          <div key={index} className="overflow-x-auto my-4">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-secondary">
                <tr>
                  {item.headers.map((header: string, i: number) => (
                    <th key={i} className="px-3 py-2 text-left font-medium text-foreground">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {item.rows.map((row: string[], i: number) => (
                  <tr key={i} className="border-t border-border">
                    {row.map((cell: string, j: number) => (
                      <td key={j} className="px-3 py-2 text-muted-foreground">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      case "signature":
        return (
          <div key={index} className="text-right mt-8 mb-4">
            <p className="text-sm text-foreground font-medium">{item.text}</p>
            <p className="text-xs text-muted-foreground mt-1">{item.date}</p>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton fallbackPath="/notice" />
          <h1 className="font-semibold text-base text-foreground">公告详情</h1>
          <button 
            onClick={handleShare}
            className="p-2 -mr-2 rounded-full hover:bg-secondary transition-colors"
          >
            <Share2 className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </header>

      {/* 分享提示 */}
      {showShareTip && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-card border border-border rounded-lg shadow-lg animate-in fade-in slide-in-from-top-2">
          <p className="text-sm text-foreground">链接已复制，快去分享吧</p>
        </div>
      )}

      {/* 公告内容 */}
      <main className="px-4 py-6">
        {/* 公告标题区 */}
        <div className="mb-6">
          <Badge className={`${typeConfig.color} border-0 mb-3`}>
            <TypeIcon className="w-3 h-3 mr-1" />
            {typeConfig.label}
          </Badge>
          <h1 className="text-xl font-bold text-foreground leading-tight mb-3">
            {noticeData.title}
          </h1>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{noticeData.publishTime}</span>
            <span>{noticeData.readCount.toLocaleString()} 人已阅读</span>
          </div>
        </div>

        {/* 公告正文 */}
        <Card className="p-4 mb-6">
          {noticeData.content.map((item, index) => renderContent(item, index))}
        </Card>

        {/* 相关公告 */}
        {noticeData.relatedNotices.length > 0 && (
          <div>
            <h3 className="font-medium text-sm text-foreground mb-3">相关公告</h3>
            <Card className="divide-y divide-border">
              {noticeData.relatedNotices.map(notice => {
                const config = noticeTypeConfig[notice.type as keyof typeof noticeTypeConfig]
                return (
                  <Link
                    key={notice.id}
                    href={`/notice/${notice.id}`}
                    className="flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors"
                  >
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className={config.color}>
                        <config.icon className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-sm text-foreground line-clamp-1">{notice.title}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </Link>
                )
              })}
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
