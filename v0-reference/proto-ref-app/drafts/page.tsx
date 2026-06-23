"use client"

import { useState } from "react"
import { BackButton } from "@/components/common/back-button"
import { FileText, Video, MessageSquare, Trash2, Edit3, MoreHorizontal } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import Link from "next/link"
import { cn } from "@/lib/utils"

// 草稿数据
const draftsData = [
  {
    id: 1,
    type: "article",
    title: "八字命理学习心得分享",
    content: "学习八字已有三年，从最初的懵懂到现在能够独立排盘分析，这一路走来收获颇丰...",
    savedAt: "2026-05-09 14:30",
    circle: "八字命理研习社",
  },
  {
    id: 2,
    type: "post",
    title: "",
    content: "今天研究了一个很有意思的命盘，日主甲木生于子月，天干透出壬水...",
    savedAt: "2026-05-08 20:15",
    circle: "八字命理研习社",
  },
  {
    id: 3,
    type: "video",
    title: "紫微斗数入门讲解",
    content: "视频时长: 05:32 | 已选封面",
    savedAt: "2026-05-07 16:45",
    circle: "紫微斗数交流圈",
    thumbnail: "",
  },
  {
    id: 4,
    type: "article",
    title: "",
    content: "风水学中，阳宅的选择至关重要，需要考虑的因素包括...",
    savedAt: "2026-05-06 09:20",
    circle: "风水堪舆学院",
  },
  {
    id: 5,
    type: "post",
    title: "求教一个问题",
    content: "各位老师好，请教一下关于大运流年的问题...",
    savedAt: "2026-05-05 11:00",
    circle: "八字命理研习社",
  },
]

const typeConfig = {
  post: { label: "帖子", icon: MessageSquare, color: "bg-blue-500", editPath: "/publish?type=post" },
  article: { label: "文章", icon: FileText, color: "bg-accent", editPath: "/publish?type=article" },
  video: { label: "短视频", icon: Video, color: "bg-primary", editPath: "/publish/video" },
}

const tabs = [
  { id: "all", label: "全部" },
  { id: "post", label: "帖子" },
  { id: "article", label: "文章" },
  { id: "video", label: "短视频" },
]

export default function DraftsPage() {
  const [activeTab, setActiveTab] = useState("all")
  const [drafts, setDrafts] = useState(draftsData)
  const [swipedId, setSwipedId] = useState<number | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null)

  const filteredDrafts = activeTab === "all" 
    ? drafts 
    : drafts.filter(d => d.type === activeTab)

  const handleDelete = (id: number) => {
    setDrafts(drafts.filter(d => d.id !== id))
    setShowDeleteConfirm(null)
    setSwipedId(null)
  }

  const formatTime = (time: string) => {
    const date = new Date(time)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) return "今天 " + time.split(" ")[1]
    if (days === 1) return "昨天 " + time.split(" ")[1]
    if (days < 7) return `${days}天前`
    return time.split(" ")[0]
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton fallbackPath="/profile" />
          <h1 className="font-semibold text-base text-foreground">草稿箱</h1>
          <div className="w-9" />
        </div>

        {/* 类型筛选Tab */}
        <div className="flex items-center px-4 pb-3 gap-2 overflow-x-auto scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-all",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {tab.id !== "all" && (
                <span className="ml-1 text-xs opacity-70">
                  ({drafts.filter(d => d.type === tab.id).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* 草稿列表 */}
      <div className="p-4">
        {filteredDrafts.length > 0 ? (
          <div className="space-y-3">
            {filteredDrafts.map(draft => {
              const config = typeConfig[draft.type as keyof typeof typeConfig]
              const Icon = config.icon
              const isSwiped = swipedId === draft.id

              return (
                <div 
                  key={draft.id} 
                  className="relative overflow-hidden rounded-xl"
                >
                  {/* 删除按钮（左滑显示） */}
                  <div 
                    className={cn(
                      "absolute right-0 top-0 bottom-0 w-20 bg-destructive flex items-center justify-center transition-transform duration-200",
                      isSwiped ? "translate-x-0" : "translate-x-full"
                    )}
                  >
                    <button
                      onClick={() => setShowDeleteConfirm(draft.id)}
                      className="flex flex-col items-center gap-1 text-destructive-foreground"
                    >
                      <Trash2 className="w-5 h-5" />
                      <span className="text-xs">删除</span>
                    </button>
                  </div>

                  {/* 草稿卡片 */}
                  <Card 
                    className={cn(
                      "relative bg-card transition-transform duration-200 cursor-pointer",
                      isSwiped ? "-translate-x-20" : "translate-x-0"
                    )}
                    onClick={() => {
                      if (isSwiped) {
                        setSwipedId(null)
                      }
                    }}
                    onTouchStart={(e) => {
                      const touch = e.touches[0]
                      const startX = touch.clientX
                      const handleTouchMove = (moveEvent: TouchEvent) => {
                        const moveTouch = moveEvent.touches[0]
                        const diff = startX - moveTouch.clientX
                        if (diff > 50) {
                          setSwipedId(draft.id)
                        } else if (diff < -50) {
                          setSwipedId(null)
                        }
                      }
                      const handleTouchEnd = () => {
                        document.removeEventListener("touchmove", handleTouchMove)
                        document.removeEventListener("touchend", handleTouchEnd)
                      }
                      document.addEventListener("touchmove", handleTouchMove)
                      document.addEventListener("touchend", handleTouchEnd)
                    }}
                  >
                    <Link href={`${config.editPath}&draft=${draft.id}`}>
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          {/* 类型图标/视频缩略图 */}
                          {draft.type === "video" ? (
                            <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 relative">
                              <Video className="w-6 h-6 text-muted-foreground" />
                              <Badge className={cn("absolute -top-1 -right-1 text-[10px] px-1.5 py-0", config.color, "text-white border-0")}>
                                视频
                              </Badge>
                            </div>
                          ) : (
                            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", config.color)}>
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                          )}

                          {/* 内容 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-sm text-foreground line-clamp-1">
                                {draft.title || "无标题草稿"}
                              </h3>
                              {draft.type !== "video" && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground flex-shrink-0">
                                  {config.label}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                              {draft.content}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-muted-foreground/70">
                                {draft.circle}
                              </span>
                              <span className="text-[10px] text-muted-foreground/70">
                                {formatTime(draft.savedAt)}
                              </span>
                            </div>
                          </div>

                          {/* 编辑图标 */}
                          <Edit3 className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                        </div>
                      </div>
                    </Link>
                  </Card>
                </div>
              )
            })}
          </div>
        ) : (
          /* 空状态 */
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mb-4">
              <FileText className="w-10 h-10 text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground text-sm mb-1">暂无草稿</p>
            <p className="text-muted-foreground/70 text-xs mb-4">发布内容时可保存为草稿</p>
            <Link
              href="/publish"
              className="px-6 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 transition-colors"
            >
              去发布内容
            </Link>
          </div>
        )}
      </div>

      {/* 删除确认弹窗 */}
      {showDeleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-[80%] max-w-sm bg-card rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-destructive" />
              </div>
              <h3 className="font-semibold text-base text-foreground mb-2">确认删除草稿？</h3>
              <p className="text-sm text-muted-foreground">删除后无法恢复，请确认是否继续</p>
            </div>
            <div className="flex border-t border-border">
              <button
                onClick={() => {
                  setShowDeleteConfirm(null)
                  setSwipedId(null)
                }}
                className="flex-1 py-3.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors border-r border-border"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="flex-1 py-3.5 text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
