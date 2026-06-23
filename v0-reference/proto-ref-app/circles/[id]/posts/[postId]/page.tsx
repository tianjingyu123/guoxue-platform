"use client"

import { useState, useRef, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, MoreHorizontal, Heart, MessageCircle, Bookmark, Share2, Play, Pause, ChevronDown, ChevronUp, Send, AtSign, X, Star, Pin, Crown, Clock, Eye, Image, Volume2, FileText, ThumbsUp, Gift, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

// 帖子详情数据 - 增强版
const postDetail = {
  id: "1",
  type: "article", // normal | article | audio | qa
  circleId: "1",
  circleName: "八字命理研习社",
  title: "八字命理中的十神关系详解 - 正财与偏财的本质区别",
  content: `
在八字命理学中，十神是分析命局的核心概念之一。今天我们重点探讨**正财**与**偏财**的区别，这对于理解一个人的财运特质至关重要。

## 一、正财的定义与特性

正财，是指日干所克之物，且阴阳相异者。比如甲木日主见己土、乙木日主见戊土，这都是正财。

**正财的核心特质：**
1. 代表正当、稳定的收入来源
2. 体现务实、保守的理财观念
3. 象征妻财（男命）、俸禄、工薪
4. 为人勤俭、重视积累

> 《滴天髓》云："财为养命之源，不可无，亦不可过旺。"

## 二、偏财的定义与特性

偏财，同样是日干所克之物，但阴阳相同。如甲木日主见戊土、乙木日主见己土。

**偏财的核心特质：**
1. 代表意外之财、投机收入
2. 体现慷慨、大方的用财态度
3. 象征父亲、情人（男命）、横财
4. 为人豪爽、不拘小节

## 三、实战案例分析

让我们看一个具体的八字案例：

**八字：甲子、丙寅、戊辰、壬戌**

此八字日主戊土，生于寅月木旺之时。年干甲木、月令寅木均为七杀（偏官），时干壬水为偏财。

从财运角度分析：
- 时柱见偏财壬水，主中晚年财运较好
- 偏财坐戌土（日主之根），财有根基
- 但财星被年月木克，需注意投资风险

## 四、总结与建议

正财与偏财各有特点，在实际批命中需要结合整体格局来判断。

**实践建议：**
- 正财旺者适合稳定职业，如公务员、企业职员
- 偏财旺者可尝试投资理财，但需控制风险
- 财星太弱需补财运，可从方位、颜色等方面调理

---

*本文为原创内容，欢迎讨论交流。如需转载请注明出处。*
  `,
  images: [
    { url: "https://picsum.photos/800/400?random=101", caption: "图1：十神关系图解" },
    { url: "https://picsum.photos/800/400?random=102", caption: "图2：八字排盘示例" },
  ],
  audio: {
    url: "/audio/lesson-01.mp3",
    duration: 856, // 秒
    title: "音频讲解版",
  },
  author: {
    id: "1",
    name: "周易大师",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=master",
    title: "资深命理师",
    level: 8,
    levelName: "一代宗师",
    isFollowed: false,
    followers: 12800,
    posts: 256,
  },
  createdAt: "2024-01-15 10:30",
  readTime: 8, // 分钟
  views: 3256,
  likes: 328,
  collects: 156,
  comments: 89,
  shares: 45,
  isLiked: false,
  isCollected: false,
  isPinned: true,
  isEssence: true,
  reward: 128, // 打赏金额
  rewardCount: 23, // 打赏人数
}

// 评论数据
const comments = [
  {
    id: "c1",
    content: "老师讲得太好了！正财偏财的区别一直困扰我很久，看完这篇文章豁然开朗。",
    author: { id: "u1", name: "命理新手", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=u1", level: 3 },
    createdAt: "1小时前",
    likes: 28,
    isLiked: false,
    isPinned: true,
    replies: [
      { id: "c1-r1", content: "同感！收藏了", author: { id: "u2", name: "学习中", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=u2" }, createdAt: "45分钟前", likes: 5, isLiked: false },
      { id: "c1-r2", content: "感谢支持，有问题随时讨论", author: { id: "1", name: "周易大师", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=master", title: "作者" }, createdAt: "30分钟前", likes: 12, isLiked: false },
    ],
  },
  {
    id: "c2",
    content: "请问老师，如果八字中正财偏财都有，而且力量差不多，应该怎么分析呢？",
    author: { id: "u3", name: "易学爱好者", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=u3", level: 4 },
    createdAt: "30分钟前",
    likes: 15,
    isLiked: true,
    replies: [],
  },
]

// 格式化时长
function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 音频播放器组件
function AudioPlayer({ audio }: { audio: typeof postDetail.audio }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  // 模拟播放进度
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= audio.duration) {
            setIsPlaying(false)
            return 0
          }
          return prev + 1
        })
        setProgress(prev => {
          if (prev >= 100) return 0
          return (currentTime / audio.duration) * 100
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isPlaying, currentTime, audio.duration])

  return (
    <div className="bg-gradient-to-r from-[#1a1a2e] to-[#16213e] rounded-2xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <button 
          onClick={togglePlay}
          className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center"
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 text-white" />
          ) : (
            <Play className="w-6 h-6 text-white ml-1" />
          )}
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Volume2 className="w-4 h-4 text-white/70" />
            <span className="text-white font-medium text-[14px]">{audio.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/50 text-[12px]">{formatDuration(currentTime)}</span>
            <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-white/50 text-[12px]">{formatDuration(audio.duration)}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-white/50 text-[11px]">边听边看，学习更高效</span>
        <div className="flex items-center gap-2">
          <button className="text-white/70 text-[12px]">0.75x</button>
          <button className="text-white text-[12px] font-medium">1.0x</button>
          <button className="text-white/70 text-[12px]">1.5x</button>
        </div>
      </div>
    </div>
  )
}

// Markdown渲染组件（简化版）
function MarkdownContent({ content }: { content: string }) {
  // 简单的 Markdown 解析
  const renderContent = () => {
    const lines = content.trim().split('\n')
    const elements: React.ReactNode[] = []
    let inBlockquote = false
    let inList = false
    
    lines.forEach((line, idx) => {
      const trimmedLine = line.trim()
      
      if (trimmedLine.startsWith('## ')) {
        elements.push(
          <h2 key={idx} className="text-[18px] font-bold text-[#2C2C2C] mt-6 mb-3">
            {trimmedLine.slice(3)}
          </h2>
        )
      } else if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
        elements.push(
          <p key={idx} className="text-[15px] font-semibold text-[#2C2C2C] my-2">
            {trimmedLine.slice(2, -2)}
          </p>
        )
      } else if (trimmedLine.startsWith('> ')) {
        elements.push(
          <blockquote key={idx} className="border-l-4 border-[#C9A96E] bg-[#FFF8E7] px-4 py-3 my-4 rounded-r-lg">
            <p className="text-[14px] text-[#666] italic">{trimmedLine.slice(2)}</p>
          </blockquote>
        )
      } else if (trimmedLine.startsWith('- ')) {
        elements.push(
          <li key={idx} className="text-[15px] text-[#2C2C2C] leading-relaxed ml-4 my-1">
            {trimmedLine.slice(2)}
          </li>
        )
      } else if (trimmedLine.match(/^\d+\. /)) {
        elements.push(
          <li key={idx} className="text-[15px] text-[#2C2C2C] leading-relaxed ml-4 my-1 list-decimal">
            {trimmedLine.replace(/^\d+\. /, '')}
          </li>
        )
      } else if (trimmedLine.startsWith('---')) {
        elements.push(<hr key={idx} className="my-6 border-[#E8E3DB]" />)
      } else if (trimmedLine.startsWith('*') && trimmedLine.endsWith('*')) {
        elements.push(
          <p key={idx} className="text-[14px] text-[#999] italic my-2">
            {trimmedLine.slice(1, -1)}
          </p>
        )
      } else if (trimmedLine) {
        // 处理行内加粗
        const boldProcessed = trimmedLine.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        elements.push(
          <p 
            key={idx} 
            className="text-[15px] text-[#2C2C2C] leading-relaxed my-2"
            dangerouslySetInnerHTML={{ __html: boldProcessed }}
          />
        )
      }
    })
    
    return elements
  }

  return <div className="article-content">{renderContent()}</div>
}

// 评论组件
function CommentItem({ comment, onReply }: { comment: typeof comments[0]; onReply: (c: typeof comments[0]) => void }) {
  const [showReplies, setShowReplies] = useState(false)
  const [liked, setLiked] = useState(comment.isLiked)
  const [likes, setLikes] = useState(comment.likes)

  const handleLike = () => {
    setLiked(!liked)
    setLikes(prev => liked ? prev - 1 : prev + 1)
  }

  return (
    <div className="py-4">
      <div className="flex gap-3">
        <img src={comment.author.avatar} alt="" className="w-9 h-9 rounded-full flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[14px] font-medium text-[#2C2C2C]">{comment.author.name}</span>
            {comment.author.level && (
              <span className="px-1.5 py-0.5 bg-[#C41E3A]/10 text-[#C41E3A] text-[10px] rounded">Lv.{comment.author.level}</span>
            )}
            {comment.author.title && (
              <span className="px-1.5 py-0.5 bg-[#C9A96E]/10 text-[#C9A96E] text-[10px] rounded">{comment.author.title}</span>
            )}
            {comment.isPinned && (
              <span className="px-1.5 py-0.5 bg-[#52C41A]/10 text-[#52C41A] text-[10px] rounded flex items-center gap-0.5">
                <Pin className="w-3 h-3" />置顶
              </span>
            )}
          </div>
          <p className="text-[14px] text-[#2C2C2C] leading-relaxed mb-2">{comment.content}</p>
          <div className="flex items-center gap-4">
            <span className="text-[12px] text-[#999]">{comment.createdAt}</span>
            <button onClick={handleLike} className="flex items-center gap-1 text-[12px] text-[#999]">
              <Heart className={cn("w-3.5 h-3.5", liked && "fill-[#C41E3A] text-[#C41E3A]")} />
              {likes > 0 && <span className={cn(liked && "text-[#C41E3A]")}>{likes}</span>}
            </button>
            <button onClick={() => onReply(comment)} className="text-[12px] text-[#999]">回复</button>
          </div>

          {/* 子评论 */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 pl-3 border-l-2 border-[#F5F0E8]">
              {!showReplies ? (
                <button 
                  onClick={() => setShowReplies(true)}
                  className="text-[13px] text-[#C41E3A] flex items-center gap-1"
                >
                  展开{comment.replies.length}条回复 <ChevronDown className="w-4 h-4" />
                </button>
              ) : (
                <div className="space-y-3">
                  {comment.replies.map(reply => (
                    <div key={reply.id} className="flex gap-2">
                      <img src={reply.author.avatar} alt="" className="w-7 h-7 rounded-full flex-shrink-0" />
                      <div>
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className="text-[13px] font-medium text-[#2C2C2C]">{reply.author.name}</span>
                          {reply.author.title && (
                            <span className="px-1 py-0.5 bg-[#C9A96E]/10 text-[#C9A96E] text-[9px] rounded">{reply.author.title}</span>
                          )}
                        </div>
                        <p className="text-[13px] text-[#2C2C2C]">{reply.content}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[11px] text-[#999]">{reply.createdAt}</span>
                          <button className="flex items-center gap-1 text-[11px] text-[#999]">
                            <Heart className="w-3 h-3" />{reply.likes}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={() => setShowReplies(false)}
                    className="text-[12px] text-[#999] flex items-center gap-1"
                  >
                    收起 <ChevronUp className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PostDetailPage() {
  const params = useParams()
  const router = useRouter()
  const circleId = params.id as string
  const postId = params.postId as string

  const [post, setPost] = useState(postDetail)
  const [isLiked, setIsLiked] = useState(post.isLiked)
  const [isCollected, setIsCollected] = useState(post.isCollected)
  const [likes, setLikes] = useState(post.likes)
  const [collects, setCollects] = useState(post.collects)
  const [isFollowed, setIsFollowed] = useState(post.author.isFollowed)
  const [commentText, setCommentText] = useState("")
  const [replyTo, setReplyTo] = useState<typeof comments[0] | null>(null)
  const [showRewardModal, setShowRewardModal] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleLike = () => {
    setIsLiked(!isLiked)
    setLikes(prev => isLiked ? prev - 1 : prev + 1)
  }

  const handleCollect = () => {
    setIsCollected(!isCollected)
    setCollects(prev => isCollected ? prev - 1 : prev + 1)
  }

  const handleFollow = () => {
    setIsFollowed(!isFollowed)
  }

  const handleReply = (comment: typeof comments[0]) => {
    setReplyTo(comment)
    inputRef.current?.focus()
  }

  const handleSubmitComment = () => {
    if (!commentText.trim()) return
    // 提交评论逻辑
    setCommentText("")
    setReplyTo(null)
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* 顶部导航 */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-[#E8E3DB]">
        <div className="flex items-center justify-between px-4 h-12">
          <button onClick={() => router.back()} className="p-1">
            <ArrowLeft className="w-5 h-5 text-[#2C2C2C]" />
          </button>
          <Link href={`/circles/${circleId}`} className="flex items-center gap-1">
            <span className="text-[14px] font-medium text-[#2C2C2C]">{post.circleName}</span>
          </Link>
          <button className="p-1">
            <MoreHorizontal className="w-5 h-5 text-[#666]" />
          </button>
        </div>
      </header>

      <main className="pt-12">
        {/* 文章内容 */}
        <article className="px-4 py-4">
          {/* 标签 */}
          <div className="flex items-center gap-2 mb-3">
            {post.isPinned && (
              <span className="px-2 py-0.5 bg-[#C41E3A]/10 text-[#C41E3A] text-[11px] rounded-full flex items-center gap-1">
                <Pin className="w-3 h-3" />置顶
              </span>
            )}
            {post.isEssence && (
              <span className="px-2 py-0.5 bg-[#C9A96E]/10 text-[#C9A96E] text-[11px] rounded-full flex items-center gap-1">
                <Star className="w-3 h-3" />精华
              </span>
            )}
            {post.type === 'article' && (
              <span className="px-2 py-0.5 bg-[#1890FF]/10 text-[#1890FF] text-[11px] rounded-full flex items-center gap-1">
                <FileText className="w-3 h-3" />长文
              </span>
            )}
          </div>

          {/* 标题 */}
          <h1 className="text-[22px] font-bold text-[#2C2C2C] leading-tight mb-4">{post.title}</h1>

          {/* 作者信息 */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#F5F0E8]">
            <Link href={`/user/${post.author.id}`} className="flex items-center gap-3">
              <div className="relative">
                <img src={post.author.avatar} alt="" className="w-11 h-11 rounded-full" />
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#C41E3A] flex items-center justify-center text-[9px] text-white font-bold">
                  {post.author.level}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[15px] text-[#2C2C2C]">{post.author.name}</span>
                  <span className="px-1.5 py-0.5 bg-[#C9A96E]/10 text-[#C9A96E] text-[10px] rounded">{post.author.title}</span>
                </div>
                <div className="flex items-center gap-2 text-[12px] text-[#999]">
                  <span>{post.author.followers}粉丝</span>
                  <span>·</span>
                  <span>{post.author.posts}篇文章</span>
                </div>
              </div>
            </Link>
            <button 
              onClick={handleFollow}
              className={cn(
                "px-4 py-1.5 rounded-full text-[13px] font-medium transition-all",
                isFollowed ? "bg-[#F5F0E8] text-[#999]" : "bg-[#C41E3A] text-white"
              )}
            >
              {isFollowed ? "已关注" : "关注"}
            </button>
          </div>

          {/* 元信息 */}
          <div className="flex items-center gap-4 text-[12px] text-[#999] mb-6">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {post.createdAt}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {post.views}阅读
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              约{post.readTime}分钟
            </span>
          </div>

          {/* 音频播放器 */}
          {post.audio && (
            <div className="mb-6">
              <AudioPlayer audio={post.audio} />
            </div>
          )}

          {/* 正文内容 */}
          <div className="prose-content">
            <MarkdownContent content={post.content} />
          </div>

          {/* 图片展示 */}
          {post.images && post.images.length > 0 && (
            <div className="mt-6 space-y-3">
              {post.images.map((img, idx) => (
                <div key={idx} className="rounded-xl overflow-hidden">
                  <img 
                    src={img.url} 
                    alt={img.caption}
                    onClick={() => setPreviewImage(img.url)}
                    className="w-full cursor-pointer"
                  />
                  {img.caption && (
                    <div className="px-3 py-2 bg-[#FAF8F5] text-center">
                      <span className="text-[12px] text-[#999]">{img.caption}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 打赏区 */}
          <div className="mt-8 pt-6 border-t border-[#E8E3DB]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-[#C9A96E]" />
                <span className="font-medium text-[#2C2C2C]">打赏作者</span>
              </div>
              <span className="text-[12px] text-[#999]">{post.rewardCount}人已打赏</span>
            </div>
            <div className="flex items-center justify-center gap-3 mb-4">
              {[5, 10, 20, 50].map(amount => (
                <button
                  key={amount}
                  onClick={() => setShowRewardModal(true)}
                  className="w-16 h-16 rounded-xl bg-[#FAF8F5] flex flex-col items-center justify-center hover:bg-[#FFF8E7] transition-colors"
                >
                  <Sparkles className="w-5 h-5 text-[#C9A96E] mb-1" />
                  <span className="text-[14px] font-medium text-[#2C2C2C]">{amount}</span>
                </button>
              ))}
            </div>
            <p className="text-center text-[12px] text-[#999]">累计收到 {post.reward} 国学币打赏</p>
          </div>
        </article>

        {/* 互动数据 */}
        <div className="px-4 py-4 bg-[#FAF8F5] flex items-center justify-around">
          <button onClick={handleLike} className="flex flex-col items-center">
            <Heart className={cn("w-6 h-6 mb-1", isLiked ? "fill-[#C41E3A] text-[#C41E3A]" : "text-[#666]")} />
            <span className={cn("text-[12px]", isLiked ? "text-[#C41E3A]" : "text-[#666]")}>{likes}</span>
          </button>
          <button className="flex flex-col items-center">
            <MessageCircle className="w-6 h-6 mb-1 text-[#666]" />
            <span className="text-[12px] text-[#666]">{post.comments}</span>
          </button>
          <button onClick={handleCollect} className="flex flex-col items-center">
            <Bookmark className={cn("w-6 h-6 mb-1", isCollected ? "fill-[#C9A96E] text-[#C9A96E]" : "text-[#666]")} />
            <span className={cn("text-[12px]", isCollected ? "text-[#C9A96E]" : "text-[#666]")}>{collects}</span>
          </button>
          <button className="flex flex-col items-center">
            <Share2 className="w-6 h-6 mb-1 text-[#666]" />
            <span className="text-[12px] text-[#666]">{post.shares}</span>
          </button>
        </div>

        {/* 评论区 */}
        <div className="px-4 pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-[#2C2C2C]">评论 {post.comments}</span>
            <div className="flex items-center gap-2">
              <button className="text-[13px] text-[#C41E3A]">最热</button>
              <span className="text-[#E8E3DB]">|</span>
              <button className="text-[13px] text-[#999]">最新</button>
            </div>
          </div>
          <div className="divide-y divide-[#F5F0E8]">
            {comments.map(comment => (
              <CommentItem key={comment.id} comment={comment} onReply={handleReply} />
            ))}
          </div>
        </div>
      </main>

      {/* 底部评论输入 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E3DB] px-4 py-3 z-50">
        {replyTo && (
          <div className="flex items-center justify-between mb-2 px-3 py-1.5 bg-[#F5F0E8] rounded-lg">
            <span className="text-[12px] text-[#666]">
              <AtSign className="w-3 h-3 inline mr-1" />
              回复 {replyTo.author.name}
            </span>
            <button onClick={() => setReplyTo(null)}>
              <X className="w-4 h-4 text-[#999]" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={replyTo ? `回复 ${replyTo.author.name}...` : "写评论..."}
            className="flex-1 h-10 px-4 bg-[#F5F0E8] rounded-full text-[14px] outline-none"
          />
          <button 
            onClick={handleSubmitComment}
            disabled={!commentText.trim()}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
              commentText.trim() ? "bg-[#C41E3A] text-white" : "bg-[#E8E3DB] text-[#999]"
            )}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 图片预览 */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onClick={() => setPreviewImage(null)}
        >
          <button className="absolute top-4 right-4 text-white">
            <X className="w-6 h-6" />
          </button>
          <img src={previewImage} alt="" className="max-w-full max-h-full object-contain" />
        </div>
      )}

      {/* 打赏弹窗 */}
      {showRewardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-[85%] max-w-sm bg-white rounded-2xl p-6 animate-in fade-in zoom-in-95">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-[#C9A96E] to-[#E8D5B5] flex items-center justify-center mb-3">
                <Gift className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-[18px] font-bold text-[#2C2C2C] mb-1">打赏作者</h3>
              <p className="text-[14px] text-[#999]">感谢 {post.author.name} 的精彩分享</p>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-6">
              {[5, 10, 20, 50, 100, 200, 500, 1000].map(amount => (
                <button key={amount} className="py-2 rounded-lg bg-[#FAF8F5] text-[14px] font-medium text-[#2C2C2C] hover:bg-[#FFF8E7]">
                  {amount}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowRewardModal(false)}
                className="flex-1 py-3 rounded-full bg-[#F5F0E8] text-[#666] font-medium"
              >
                取消
              </button>
              <button className="flex-1 py-3 rounded-full bg-gradient-to-r from-[#C9A96E] to-[#E8D5B5] text-white font-medium">
                确认打赏
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
