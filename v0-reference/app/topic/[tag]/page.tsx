"use client"

import { useState } from "react"
import Link from "next/link"
import { BackButton } from "@/components/common/back-button"
import { Share2, Hash, FileText, Video, MessageSquare, Heart, MessageCircle, Eye, Play, ChevronDown, Plus, Check, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// 话题数据
const topicData = {
  tag: "八字案例",
  contentCount: 1286,
  followCount: 3560,
  description: "分享八字命理实战案例，探讨命盘分析技法",
  isFollowed: false,
}

// 内容列表
const contentList = [
  {
    id: 1,
    type: "article",
    title: "从一个八字看事业转机：从低谷到高峰的命理分析",
    cover: "",
    excerpt: "今天分享一个真实案例，命主在2023年经历了事业的重大转折...",
    author: { name: "周易大师", avatar: "", isVerified: true },
    likes: 328,
    comments: 56,
    time: "2小时前",
  },
  {
    id: 2,
    type: "post",
    content: "刚看完一个财运很旺的八字，年柱甲子、月柱庚申、日柱壬寅、时柱癸卯。大家觉得这个八字有什么特点？#八字案例# #命理分析#",
    images: ["", "", ""],
    author: { name: "命理小白", avatar: "", isVerified: false },
    likes: 89,
    comments: 23,
    time: "3小时前",
  },
  {
    id: 3,
    type: "video",
    title: "实战讲解：如何从八字看婚姻缘分",
    cover: "",
    duration: "05:32",
    author: { name: "玄学研究员", avatar: "", isVerified: true },
    likes: 1256,
    views: 8900,
    time: "昨天",
  },
  {
    id: 4,
    type: "article",
    title: "八字中的食伤生财格局详解",
    cover: "",
    excerpt: "食伤生财是八字中常见的富贵格局之一，今天我们通过几个实际案例来分析...",
    author: { name: "易学传承", avatar: "", isVerified: true },
    likes: 456,
    comments: 78,
    time: "昨天",
  },
  {
    id: 5,
    type: "post",
    content: "请教各位大师，这个八字的用神应该怎么取？感觉木火土金水都有点道理...",
    images: [""],
    author: { name: "初学者小王", avatar: "", isVerified: false },
    likes: 45,
    comments: 67,
    time: "2天前",
  },
  {
    id: 6,
    type: "video",
    title: "一分钟看懂八字十神关系",
    cover: "",
    duration: "01:28",
    author: { name: "周易大师", avatar: "", isVerified: true },
    likes: 2345,
    views: 15600,
    time: "3天前",
  },
]

export default function TopicPage({ params }: { params: { tag: string } }) {
  const [isFollowed, setIsFollowed] = useState(topicData.isFollowed)
  const [sortBy, setSortBy] = useState<"latest" | "hot">("latest")
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const handleFollow = () => {
    setIsFollowed(!isFollowed)
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const handleLoadMore = () => {
    setIsLoadingMore(true)
    setTimeout(() => setIsLoadingMore(false), 1000)
  }

  const sortedContent = [...contentList].sort((a, b) => {
    if (sortBy === "hot") {
      return b.likes - a.likes
    }
    return 0
  })

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
  <div className="flex items-center justify-between px-4 h-14">
  <BackButton />
  <h1 className="font-semibold text-base text-foreground">话题</h1>
          <button className="p-2 -mr-2 rounded-full hover:bg-secondary transition-colors">
            <Share2 className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </header>

      {/* 话题信息区 */}
      <div className="px-4 py-5 border-b border-border">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Hash className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">#{topicData.tag}#</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{topicData.description}</p>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-foreground">
                <span className="font-semibold">{topicData.contentCount.toLocaleString()}</span>
                <span className="text-muted-foreground ml-1">篇内容</span>
              </span>
              <span className="text-foreground">
                <span className="font-semibold">{topicData.followCount.toLocaleString()}</span>
                <span className="text-muted-foreground ml-1">人关注</span>
              </span>
            </div>
          </div>
          <button
            onClick={handleFollow}
            className={cn(
              "flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition-all",
              isFollowed
                ? "bg-secondary text-muted-foreground"
                : "bg-primary text-primary-foreground"
            )}
          >
            {isFollowed ? (
              <>
                <Check className="w-4 h-4" />
                已关注
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                关注
              </>
            )}
          </button>
        </div>
      </div>

      {/* 排序切换 */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-border">
        <div className="relative">
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="flex items-center gap-1 text-sm text-foreground"
          >
            {sortBy === "latest" ? "最新发布" : "最受欢迎"}
            <ChevronDown className={cn("w-4 h-4 transition-transform", showSortMenu && "rotate-180")} />
          </button>
          {showSortMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
              <div className="absolute top-full left-0 mt-1 w-28 bg-card rounded-lg shadow-lg border border-border overflow-hidden z-50">
                <button
                  onClick={() => { setSortBy("latest"); setShowSortMenu(false) }}
                  className={cn(
                    "w-full px-4 py-2.5 text-left text-sm transition-colors",
                    sortBy === "latest" ? "text-primary bg-primary/5" : "text-foreground hover:bg-secondary"
                  )}
                >
                  最新发布
                </button>
                <button
                  onClick={() => { setSortBy("hot"); setShowSortMenu(false) }}
                  className={cn(
                    "w-full px-4 py-2.5 text-left text-sm transition-colors",
                    sortBy === "hot" ? "text-primary bg-primary/5" : "text-foreground hover:bg-secondary"
                  )}
                >
                  最受欢迎
                </button>
              </div>
            </>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="text-sm text-primary"
        >
          {isRefreshing ? "刷新中..." : "刷新"}
        </button>
      </div>

      {/* 内容列表 */}
      <div className="divide-y divide-border">
        {sortedContent.length > 0 ? (
          sortedContent.map((item) => (
            <Link
              key={item.id}
              href={
                item.type === "article" ? `/articles/${item.id}` :
                item.type === "video" ? `/video/${item.id}` :
                `/post/${item.id}`
              }
              className="block"
            >
              {item.type === "article" && (
                <Card className="p-4 rounded-none border-0 hover:bg-secondary/30 transition-colors">
                  <div className="flex gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-500 border-0">
                          <FileText className="w-3 h-3 mr-0.5" />
                          文章
                        </Badge>
                      </div>
                      <h3 className="font-medium text-sm text-foreground line-clamp-2 mb-1.5">{item.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{item.excerpt}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-5 h-5">
                            <AvatarImage src={item.author.avatar} />
                            <AvatarFallback className="text-[10px]">{item.author.name[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">{item.author.name}</span>
                          {item.author.isVerified && (
                            <Badge variant="secondary" className="text-[8px] px-1 py-0 bg-accent/20 text-accent border-0">V</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3" /> {item.likes}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" /> {item.comments}
                          </span>
                          <span>{item.time}</span>
                        </div>
                      </div>
                    </div>
                    <div className="w-24 h-16 rounded-lg bg-secondary flex-shrink-0 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-muted-foreground/40" />
                    </div>
                  </div>
                </Card>
              )}

              {item.type === "post" && (
                <Card className="p-4 rounded-none border-0 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={item.author.avatar} />
                      <AvatarFallback className="text-xs">{item.author.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-foreground">{item.author.name}</span>
                        {item.author.isVerified && (
                          <Badge variant="secondary" className="text-[8px] px-1 py-0 bg-accent/20 text-accent border-0">V</Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground">{item.time}</span>
                    </div>
                    <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0 bg-green-500/10 text-green-500 border-0">
                      <MessageSquare className="w-3 h-3 mr-0.5" />
                      帖子
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground mb-3 line-clamp-3">{item.content}</p>
                  {item.images && item.images.length > 0 && (
                    <div className={cn(
                      "grid gap-1 mb-3",
                      item.images.length === 1 && "grid-cols-1",
                      item.images.length === 2 && "grid-cols-2",
                      item.images.length >= 3 && "grid-cols-3"
                    )}>
                      {item.images.slice(0, 3).map((img, idx) => (
                        <div key={idx} className="aspect-square rounded-lg bg-secondary flex items-center justify-center relative">
                          <MessageSquare className="w-6 h-6 text-muted-foreground/40" />
                          {idx === 2 && item.images && item.images.length > 3 && (
                            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                              <span className="text-white text-sm font-medium">+{item.images.length - 3}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5" /> {item.likes}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5" /> {item.comments}
                    </span>
                  </div>
                </Card>
              )}

              {item.type === "video" && (
                <Card className="p-4 rounded-none border-0 hover:bg-secondary/30 transition-colors">
                  <div className="flex gap-3">
                    <div className="w-32 aspect-[9/16] rounded-lg bg-secondary flex-shrink-0 relative flex items-center justify-center">
                      <Video className="w-8 h-8 text-muted-foreground/40" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center">
                          <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                        </div>
                      </div>
                      <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px]">
                        {item.duration}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col">
                      <Badge variant="secondary" className="self-start text-[10px] px-1.5 py-0 bg-purple-500/10 text-purple-500 border-0 mb-1.5">
                        <Video className="w-3 h-3 mr-0.5" />
                        视频
                      </Badge>
                      <h3 className="font-medium text-sm text-foreground line-clamp-2 mb-auto">{item.title}</h3>
                      <div className="flex items-center gap-2 mt-2">
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={item.author.avatar} />
                          <AvatarFallback className="text-[10px]">{item.author.name[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">{item.author.name}</span>
                        {item.author.isVerified && (
                          <Badge variant="secondary" className="text-[8px] px-1 py-0 bg-accent/20 text-accent border-0">V</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" /> {item.likes}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {item.views}
                        </span>
                        <span>{item.time}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </Link>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Hash className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm text-center mb-4">
              还没有相关内容<br />成为第一个发布的人吧
            </p>
            <Link
              href="/publish"
              className="px-6 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 transition-colors"
            >
              去发布
            </Link>
          </div>
        )}
      </div>

      {/* 加载更多 */}
      {sortedContent.length > 0 && (
        <div className="flex items-center justify-center py-6">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                加载中...
              </>
            ) : (
              "点击加载更多"
            )}
          </button>
        </div>
      )}
    </div>
  )
}
