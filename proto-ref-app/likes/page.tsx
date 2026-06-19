"use client"

import { useState } from "react"
import Link from "next/link"
import { BackButton } from "@/components/common/back-button"
import { Heart, FileText, Video, BookOpen, MessageSquare, Play } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// 点赞记录数据
const likedItems = [
  {
    id: 1,
    type: "article",
    title: "八字命理入门：如何看懂你的命盘",
    summary: "八字命理是中国传统文化的重要组成部分，本文将带你从零开始了解八字的基本概念...",
    cover: "",
    author: "周易大师",
    likedAt: "2小时前",
    href: "/articles/1"
  },
  {
    id: 2,
    type: "video",
    title: "三分钟看懂十神关系",
    duration: "03:25",
    cover: "",
    author: "命理小课堂",
    likes: 2580,
    likedAt: "5小时前",
    href: "/video/1"
  },
  {
    id: 3,
    type: "post",
    title: "今日案例分析：乙木生于子月",
    summary: "分享一个最近遇到的命盘，乙木日主生于子月，地支一片水旺...",
    images: 2,
    author: "八字研习者",
    likedAt: "昨天",
    href: "/post/1"
  },
  {
    id: 4,
    type: "course",
    title: "紫微斗数入门到精通",
    instructor: "张玄风",
    price: 299,
    cover: "",
    likedAt: "3天前",
    href: "/course/1"
  },
  {
    id: 5,
    type: "article",
    title: "风水布局的五大禁忌",
    summary: "家居风水关系到一家人的运势，这些常见的风水禁忌你一定要知道...",
    cover: "",
    author: "陈风水",
    likedAt: "1周前",
    href: "/articles/2"
  },
  {
    id: 6,
    type: "video",
    title: "手把手教你排八字",
    duration: "08:42",
    cover: "",
    author: "国学小白",
    likes: 5680,
    likedAt: "1周前",
    href: "/video/2"
  },
]

const tabs = [
  { id: "all", label: "全部", icon: null },
  { id: "post", label: "帖子", icon: MessageSquare },
  { id: "article", label: "文章", icon: FileText },
  { id: "video", label: "短视频", icon: Video },
  { id: "course", label: "课程", icon: BookOpen },
]

const typeConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  post: { label: "帖子", color: "bg-blue-500/10 text-blue-500", icon: MessageSquare },
  article: { label: "文章", color: "bg-green-500/10 text-green-500", icon: FileText },
  video: { label: "视频", color: "bg-purple-500/10 text-purple-500", icon: Video },
  course: { label: "课程", color: "bg-accent/10 text-accent", icon: BookOpen },
}

export default function LikesPage() {
  const [activeTab, setActiveTab] = useState("all")
  const [items, setItems] = useState(likedItems)
  
  const filteredItems = activeTab === "all" 
    ? items 
    : items.filter(item => item.type === activeTab)
  
  const handleUnlike = (id: number) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton fallbackPath="/profile" />
          <h1 className="font-semibold text-base text-foreground">我的点赞</h1>
          <div className="w-9" />
        </div>
      </header>

      {/* 类型筛选Tab */}
      <div className="sticky top-14 z-30 bg-background border-b border-border">
        <div className="flex items-center px-2 overflow-x-auto scrollbar-hide">
          {tabs.map(tab => {
            const count = tab.id === "all" 
              ? items.length 
              : items.filter(i => i.type === tab.id).length
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                  activeTab === tab.id
                    ? "text-primary border-primary"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                )}
              >
                {tab.icon && <tab.icon className="w-4 h-4" />}
                {tab.label}
                {count > 0 && (
                  <span className="text-xs text-muted-foreground">({count})</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 点赞列表 */}
      <div className="p-4 space-y-3">
        {filteredItems.length > 0 ? (
          filteredItems.map(item => {
            const config = typeConfig[item.type]
            const Icon = config.icon
            
            return (
              <Card key={item.id} className="overflow-hidden">
                <div className="flex">
                  {/* 封面图 */}
                  <Link 
                    href={item.href}
                    className="flex-shrink-0 w-28 aspect-[4/3] bg-secondary flex items-center justify-center relative"
                  >
                    {item.type === "video" ? (
                      <>
                        <Play className="w-8 h-8 text-muted-foreground/40" />
                        {item.duration && (
                          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 text-white text-[10px] rounded">
                            {item.duration}
                          </span>
                        )}
                      </>
                    ) : item.type === "course" ? (
                      <BookOpen className="w-8 h-8 text-accent/40" />
                    ) : (
                      <FileText className="w-8 h-8 text-muted-foreground/40" />
                    )}
                  </Link>
                  
                  {/* 内容 */}
                  <div className="flex-1 p-3 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {/* 类型标签 */}
                        <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0 mb-1.5", config.color)}>
                          <Icon className="w-3 h-3 mr-0.5" />
                          {config.label}
                        </Badge>
                        
                        {/* 标题 */}
                        <Link href={item.href}>
                          <h3 className="font-medium text-sm text-foreground line-clamp-2 hover:text-primary transition-colors">
                            {item.title}
                          </h3>
                        </Link>
                        
                        {/* 摘要 */}
                        {item.summary && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                            {item.summary}
                          </p>
                        )}
                        
                        {/* 底部信息 */}
                        <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                          <span>{item.author || item.instructor}</span>
                          {item.type === "course" && item.price && (
                            <span className="text-primary font-medium">¥{item.price}</span>
                          )}
                          {item.type === "video" && item.likes && (
                            <span>{item.likes} 点赞</span>
                          )}
                          <span>· {item.likedAt}</span>
                        </div>
                      </div>
                      
                      {/* 取消点赞按钮 */}
                      <button
                        onClick={() => handleUnlike(item.id)}
                        className="flex-shrink-0 p-2 rounded-full text-primary hover:bg-primary/10 transition-colors"
                      >
                        <Heart className="w-5 h-5 fill-primary" />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })
        ) : (
          /* 空状态 */
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Heart className="w-10 h-10 text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground text-sm">暂无点赞记录</p>
            <p className="text-muted-foreground/70 text-xs mt-1">看到喜欢的内容，点个赞吧</p>
            <Link
              href="/"
              className="mt-4 px-6 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 transition-colors"
            >
              去发现内容
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
