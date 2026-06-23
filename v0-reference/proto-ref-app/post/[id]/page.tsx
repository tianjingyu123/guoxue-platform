"use client"

import { useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { BackButton } from "@/components/common/back-button"
import { 
  MoreHorizontal, Heart, MessageCircle, Bookmark, Share2,
  Star, Pin, Trash2, Send, ChevronDown, ChevronUp, ThumbsUp, X,
  Download, Play, ImageIcon, FileText, Hash
} from "lucide-react"
import { cn } from "@/lib/utils"

// 模拟帖子数据
const postData = {
  id: 1,
  author: {
    id: 1,
    name: "周易大师",
    avatar: "",
    role: "圈主",
    isVerified: true,
  },
  publishTime: "2小时前",
  content: `今天分享一个有趣的八字案例分析。

这位朋友是甲木日主，生于寅月，地支寅卯辰三会木局，天干透甲乙，木气极旺。

从格局上看，这是一个「从强格」的典型案例。木旺喜水木相生，忌金克土泄。

关键分析点：
1. 日主甲木坐寅，得禄得地，根基稳固
2. 月令寅木当令，木气正旺
3. 地支三会木局，势不可挡

这种命格的人通常性格正直，有领导才能，但也要注意过刚易折的问题。

大家有什么看法？欢迎在评论区讨论！`,
  images: [
    { id: 1, url: "", caption: "八字排盘图" },
    { id: 2, url: "", caption: "五行分析" },
    { id: 3, url: "", caption: "大运走势" },
  ],
  files: [
    { id: 1, name: "八字案例分析.pdf", size: "2.3MB", type: "pdf" },
  ],
  video: null,
  tags: ["八字案例", "命理分析", "从强格"],
  likes: 128,
  comments: 36,
  collects: 45,
  isLiked: false,
  isCollected: false,
  isPinned: true,
  isEssence: true,
  circleName: "八字命理研习社",
  circleId: 1,
}

// 模拟评论数据
const commentsData = [
  {
    id: 1,
    author: { id: 2, name: "易学新手", avatar: "", role: "成员" },
    content: "周老师分析得太透彻了！请问如果大运走金运，是不是会比较艰难？",
    time: "1小时前",
    likes: 15,
    isLiked: false,
    replies: [
      {
        id: 11,
        author: { id: 1, name: "周易大师", avatar: "", role: "圈主" },
        replyTo: "易学新手",
        content: "是的，金运克木，对于从强格来说确实不利。但也要看具体流年配合，不能一概而论。",
        time: "50分钟前",
        likes: 8,
        isLiked: false,
      },
      {
        id: 12,
        author: { id: 3, name: "命理爱好者", avatar: "", role: "嘉宾" },
        replyTo: "周易大师",
        content: "周老师说得对，还要看大运地支的配合情况。",
        time: "30分钟前",
        likes: 3,
        isLiked: false,
      },
    ],
    hasMoreReplies: true,
    totalReplies: 5,
  },
  {
    id: 2,
    author: { id: 4, name: "紫微研究者", avatar: "", role: "成员" },
    content: "从紫微斗数的角度来看，这种命格的人在事业宫应该也很强。有机会可以对比分析一下两种命理体系的异同。",
    time: "45分钟前",
    likes: 22,
    isLiked: true,
    replies: [],
    hasMoreReplies: false,
    totalReplies: 0,
  },
  {
    id: 3,
    author: { id: 5, name: "风水学徒", avatar: "", role: "成员" },
    content: "学习了，请问周老师有没有关于从弱格的案例分析？",
    time: "20分钟前",
    likes: 6,
    isLiked: false,
    replies: [],
    hasMoreReplies: false,
    totalReplies: 0,
  },
]

export default function PostDetailPage() {
  const [post, setPost] = useState(postData)
  const [comments, setComments] = useState(commentsData)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [selectedImage, setSelectedImage] = useState<number | null>(null)
  const [commentInput, setCommentInput] = useState("")
  const [replyTo, setReplyTo] = useState<{ id: number; name: string } | null>(null)
  const [expandedReplies, setExpandedReplies] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showInputFocus, setShowInputFocus] = useState(false)

  // 用户角色（模拟）
  const userRole = "圈主" // 可以是 "圈主" | "管理员" | "成员"
  const isAdmin = userRole === "圈主" || userRole === "管理员"

  const handleLike = () => {
    setPost(prev => ({
      ...prev,
      isLiked: !prev.isLiked,
      likes: prev.isLiked ? prev.likes - 1 : prev.likes + 1,
    }))
  }

  const handleCollect = () => {
    setPost(prev => ({
      ...prev,
      isCollected: !prev.isCollected,
      collects: prev.isCollected ? prev.collects - 1 : prev.collects + 1,
    }))
  }

  const handleCommentLike = (commentId: number) => {
    setComments(prev => prev.map(c => 
      c.id === commentId 
        ? { ...c, isLiked: !c.isLiked, likes: c.isLiked ? c.likes - 1 : c.likes + 1 }
        : c
    ))
  }

  const handleSendComment = () => {
    if (!commentInput.trim()) return
    // 模拟发送评论
    const newComment = {
      id: Date.now(),
      author: { id: 999, name: "我", avatar: "", role: "成员" as const },
      content: replyTo ? `回复 @${replyTo.name}：${commentInput}` : commentInput,
      time: "刚刚",
      likes: 0,
      isLiked: false,
      replies: [],
      hasMoreReplies: false,
      totalReplies: 0,
    }
    setComments(prev => [newComment, ...prev])
    setCommentInput("")
    setReplyTo(null)
    setShowInputFocus(false)
  }

  const toggleReplies = (commentId: number) => {
    setExpandedReplies(prev => 
      prev.includes(commentId) 
        ? prev.filter(id => id !== commentId)
        : [...prev, commentId]
    )
  }

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case "圈主":
        return "bg-primary/20 text-primary border-primary/30"
      case "嘉宾":
        return "bg-accent/20 text-accent border-accent/30"
      case "管理员":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      default:
        return "bg-secondary text-muted-foreground border-border"
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 顶部导航 */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
        <div className="flex items-center justify-between px-4 h-12">
          <BackButton fallbackPath={`/circle/${post.circleId}/home`} />
          <h1 className="font-medium text-base text-foreground">帖子详情</h1>
          <div className="relative">
            <button 
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-2 -mr-2 rounded-full hover:bg-secondary transition-colors"
            >
              <MoreHorizontal className="w-5 h-5 text-foreground" />
            </button>
            
            {/* 更多菜单 */}
            {showMoreMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-36 bg-card rounded-xl shadow-xl border border-border overflow-hidden z-50">
                  {isAdmin && (
                    <>
                      <button className="flex items-center gap-2 w-full px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors">
                        <Star className="w-4 h-4 text-accent" />
                        {post.isEssence ? "取消加精" : "设为精华"}
                      </button>
                      <button className="flex items-center gap-2 w-full px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors">
                        <Pin className="w-4 h-4 text-primary" />
                        {post.isPinned ? "取消置顶" : "置顶帖子"}
                      </button>
                      <button className="flex items-center gap-2 w-full px-4 py-3 text-sm text-destructive hover:bg-secondary transition-colors">
                        <Trash2 className="w-4 h-4" />
                        删除帖子
                      </button>
                    </>
                  )}
                  {!isAdmin && (
                    <button className="flex items-center gap-2 w-full px-4 py-3 text-sm text-destructive hover:bg-secondary transition-colors">
                      举报
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="pt-12">
        {/* 帖子内容区 */}
        <div className="p-4 border-b border-border">
          {/* 发布者信息 */}
          <div className="flex items-center gap-3 mb-4">
            <Link href={`/user/${post.author.id}`}>
              <Avatar className="w-11 h-11">
                <AvatarImage src={post.author.avatar} alt={post.author.name} />
                <AvatarFallback className="bg-secondary text-foreground">
                  {post.author.name[0]}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-foreground">{post.author.name}</span>
                {post.author.isVerified && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-accent/20 text-accent border-0">V</Badge>
                )}
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", getRoleBadgeStyle(post.author.role))}>
                  {post.author.role}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{post.publishTime}</p>
            </div>
            {/* 标签 */}
            <div className="flex items-center gap-1">
              {post.isEssence && (
                <Badge className="text-[10px] px-1.5 py-0 bg-accent text-white border-0">精华</Badge>
              )}
              {post.isPinned && (
                <Badge className="text-[10px] px-1.5 py-0 bg-primary text-primary-foreground border-0">置顶</Badge>
              )}
            </div>
          </div>

          {/* 帖子正文 */}
          <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap mb-4">
            {post.content}
          </div>

          {/* 图片区域 */}
          {post.images && post.images.length > 0 && (
            <div className={cn(
              "grid gap-2 mb-4",
              post.images.length === 1 ? "grid-cols-1" : 
              post.images.length === 2 ? "grid-cols-2" : "grid-cols-3"
            )}>
              {post.images.map((img, index) => (
                <div 
                  key={img.id}
                  className={cn(
                    "relative bg-secondary rounded-lg overflow-hidden cursor-pointer",
                    post.images.length === 1 ? "aspect-video" : "aspect-square"
                  )}
                  onClick={() => setSelectedImage(index)}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 视频区域 */}
          {post.video && (
            <div className="relative aspect-video bg-secondary rounded-lg overflow-hidden mb-4">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
                  <Play className="w-6 h-6 text-primary fill-primary ml-1" />
                </div>
              </div>
            </div>
          )}

          {/* 文件附件 */}
          {post.files && post.files.length > 0 && (
            <div className="space-y-2 mb-4">
              {post.files.map(file => (
                <Card key={file.id} className="flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors cursor-pointer">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{file.size}</p>
                  </div>
                  <Download className="w-5 h-5 text-muted-foreground" />
                </Card>
              ))}
            </div>
          )}

          {/* 话题标签 */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.map(tag => (
                <Link 
                  key={tag}
                  href={`/circles/${post.circleId}/home?tag=${tag}`}
                  className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full hover:bg-primary/20 transition-colors"
                >
                  <Hash className="w-3 h-3" />
                  {tag}
                </Link>
              ))}
            </div>
          )}

          {/* 互动数据行 */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{post.likes} 点赞</span>
            <span>{post.comments} 评论</span>
            <span>{post.collects} 收藏</span>
          </div>
        </div>

        {/* 评论区 */}
        <div className="p-4">
          <h2 className="font-semibold text-base text-foreground mb-4">
            全部评论 ({post.comments})
          </h2>

          {comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <MessageCircle className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">暂无评论，来发表第一条吧</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map(comment => (
                <div key={comment.id} className="border-b border-border pb-4 last:border-0">
                  {/* 主评论 */}
                  <div className="flex gap-3">
                    <Link href={`/user/${comment.author.id}`}>
                      <Avatar className="w-9 h-9">
                        <AvatarImage src={comment.author.avatar} alt={comment.author.name} />
                        <AvatarFallback className="bg-secondary text-foreground text-xs">
                          {comment.author.name[0]}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-foreground">{comment.author.name}</span>
                        {comment.author.role !== "成员" && (
                          <Badge variant="outline" className={cn("text-[10px] px-1 py-0", getRoleBadgeStyle(comment.author.role))}>
                            {comment.author.role}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">{comment.time}</span>
                      </div>
                      <p className="text-sm text-foreground mb-2">{comment.content}</p>
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => handleCommentLike(comment.id)}
                          className={cn(
                            "flex items-center gap-1 text-xs transition-colors",
                            comment.isLiked ? "text-primary" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <ThumbsUp className={cn("w-3.5 h-3.5", comment.isLiked && "fill-primary")} />
                          {comment.likes > 0 && comment.likes}
                        </button>
                        <button 
                          onClick={() => {
                            setReplyTo({ id: comment.id, name: comment.author.name })
                            setShowInputFocus(true)
                          }}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          回复
                        </button>
                      </div>

                      {/* 子评论（楼中楼） */}
                      {comment.replies.length > 0 && (
                        <div className="mt-3 pl-3 border-l-2 border-border space-y-3">
                          {(expandedReplies.includes(comment.id) ? comment.replies : comment.replies.slice(0, 2)).map(reply => (
                            <div key={reply.id} className="text-sm">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-foreground">{reply.author.name}</span>
                                {reply.author.role !== "成员" && (
                                  <Badge variant="outline" className={cn("text-[10px] px-1 py-0", getRoleBadgeStyle(reply.author.role))}>
                                    {reply.author.role}
                                  </Badge>
                                )}
                                <span className="text-xs text-muted-foreground">{reply.time}</span>
                              </div>
                              <p className="text-foreground">
                                <span className="text-primary">@{reply.replyTo}</span>{" "}
                                {reply.content}
                              </p>
                            </div>
                          ))}
                          {comment.hasMoreReplies && comment.totalReplies > 2 && (
                            <button
                              onClick={() => toggleReplies(comment.id)}
                              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                            >
                              {expandedReplies.includes(comment.id) ? (
                                <>收起 <ChevronUp className="w-3 h-3" /></>
                              ) : (
                                <>展开更多回复 ({comment.totalReplies - 2}) <ChevronDown className="w-3 h-3" /></>
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 图片预览弹窗 */}
      {selectedImage !== null && post.images && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
          <button 
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors safe-area-pt z-10"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <div className="w-full h-full flex items-center justify-center p-4">
            <div className="max-w-lg w-full aspect-square bg-secondary/20 rounded-xl flex flex-col items-center justify-center">
              <ImageIcon className="w-16 h-16 text-white/40 mb-3" />
              <p className="text-white/60 text-sm">
                {post.images[selectedImage]?.caption || "图片预览"}
              </p>
            </div>
          </div>
          <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-2">
            {post.images.map((_, index) => (
              <button
                key={index}
                onClick={() => setSelectedImage(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  selectedImage === index ? "bg-white" : "bg-white/30"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* 底部固定操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border safe-area-pb z-30">
        <div className="flex items-center gap-2 px-4 h-14">
          {/* 点赞按钮 */}
          <button 
            onClick={handleLike}
            className={cn(
              "flex items-center gap-1 px-3 py-2 rounded-full transition-all",
              post.isLiked ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Heart className={cn("w-5 h-5 transition-transform", post.isLiked && "fill-primary scale-110")} />
            <span className="text-xs">{post.likes}</span>
          </button>

          {/* 收藏按钮 */}
          <button 
            onClick={handleCollect}
            className={cn(
              "flex items-center gap-1 px-3 py-2 rounded-full transition-all",
              post.isCollected ? "text-accent" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Bookmark className={cn("w-5 h-5 transition-transform", post.isCollected && "fill-accent scale-110")} />
            <span className="text-xs">{post.collects}</span>
          </button>

          {/* 评论输入框 */}
          <div 
            className="flex-1 flex items-center gap-2 px-4 py-2 bg-secondary rounded-full cursor-text"
            onClick={() => setShowInputFocus(true)}
          >
            <span className="text-sm text-muted-foreground">
              {replyTo ? `回复 @${replyTo.name}` : "说点什么..."}
            </span>
          </div>

          {/* 分享按钮 */}
          <button className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 评论输入弹窗 */}
      {showInputFocus && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={() => { setShowInputFocus(false); setReplyTo(null) }}>
          <div 
            className="bg-card border-t border-border p-4 safe-area-pb animate-in slide-in-from-bottom duration-200"
            onClick={e => e.stopPropagation()}
          >
            {replyTo && (
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">回复 @{replyTo.name}</span>
                <button onClick={() => setReplyTo(null)} className="text-xs text-primary">取消回复</button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <textarea
                value={commentInput}
                onChange={e => setCommentInput(e.target.value)}
                placeholder={replyTo ? `回复 @${replyTo.name}...` : "说点什么..."}
                className="flex-1 min-h-[80px] max-h-[160px] px-4 py-3 bg-secondary rounded-xl text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                autoFocus
              />
              <button
                onClick={handleSendComment}
                disabled={!commentInput.trim()}
                className={cn(
                  "p-3 rounded-full transition-colors",
                  commentInput.trim() 
                    ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                    : "bg-secondary text-muted-foreground"
                )}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
