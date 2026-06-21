"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { 
  ArrowLeft, Share2, Heart, Star, MessageCircle, 
  MoreHorizontal, Users, ChevronRight, Eye, Clock
} from "lucide-react"
import { cn } from "@/lib/utils"
import { contentsApi, interactApi, authApi, type ContentDetail, type Comment, type FeedItem } from "@/lib/api"
import { CommentList, CommentSkeleton } from "@/components/content/comment-list"

// 骨架屏
function DetailSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] animate-pulse">
      {/* 封面骨架 */}
      <div className="aspect-video bg-[#E8E3DB]" />
      
      {/* 内容骨架 */}
      <div className="bg-white -mt-4 rounded-t-[20px] relative z-10 p-4 space-y-4">
        <div className="h-7 bg-[#F2EFEA] rounded w-3/4" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#F2EFEA]" />
          <div className="space-y-2">
            <div className="h-4 w-24 bg-[#F2EFEA] rounded" />
            <div className="h-3 w-16 bg-[#F2EFEA] rounded" />
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-4 bg-[#F2EFEA] rounded" style={{ width: `${100 - i * 10}%` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

// 默认数据
const defaultContent: ContentDetail = {
  id: "1",
  type: "article",
  title: "八字命理入门：如何看懂你的命盘",
  content: `
    <p>八字命理，又称四柱命理，是中国传统命理学的重要分支。它通过分析一个人出生时的年、月、日、时四柱天干地支，来推断人的命运走势。</p>
    
    <h2>什么是八字</h2>
    <p>八字是指一个人出生时的年、月、日、时所对应的天干地支，共八个字，故称"八字"。例如：甲子年、丙寅月、戊辰日、壬午时。</p>
    
    <h2>天干地支基础</h2>
    <p><strong>十天干：</strong>甲、乙、丙、丁、戊、己、庚、辛、壬、癸</p>
    <p><strong>十二地支：</strong>子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥</p>
    
    <h2>五行相生相克</h2>
    <p>五行学说是八字命理的基础：</p>
    <ul>
      <li>相生：木生火、火生土、土生金、金生水、水生木</li>
      <li>相克：木克土、土克水、水克火、火克金、金克木</li>
    </ul>
    
    <h2>日主与十神</h2>
    <p>日柱的天干代表命主本人，称为"日主"。根据日主与其他干支的关系，可以推导出十神：比肩、劫财、食神、伤官、正财、偏财、正官、七杀、正印、偏印。</p>
    
    <blockquote>
      "命由天定，运由己造。"了解命理不是为了宿命，而是为了更好地把握人生。
    </blockquote>
  `,
  cover: "/images/courses/course-1.jpg",
  author: {
    id: "author-1",
    name: "周易大师",
    avatar: "/images/experts/expert-1.jpg",
    title: "资深命理师 | 20年从业经验",
    followers: 12800,
    isFollowed: false,
  },
  publishedAt: "2024-03-15",
  views: 8560,
  likes: 1280,
  collects: 560,
  comments: 128,
  isLiked: false,
  isCollected: false,
  tags: ["八字入门", "命理学", "五行"],
  relatedCircle: {
    id: "circle-1",
    name: "八字研习社",
    cover: "/images/circles/circle-1.jpg",
    members: 12800,
  },
}

const defaultComments: Comment[] = [
  {
    id: "c1",
    content: "写得很好，对初学者很友好，期待更多入门教程！",
    author: { id: "u1", name: "国学爱好者", avatar: "/images/avatars/avatar-1.jpg" },
    createdAt: "2小时前",
    likes: 56,
    isLiked: false,
    replies: [
      {
        id: "c1-r1",
        content: "同意，讲解得很清楚易懂",
        author: { id: "u2", name: "命理新手", avatar: "/images/avatars/avatar-2.jpg" },
        createdAt: "1小时前",
        likes: 12,
        isLiked: false,
      },
      {
        id: "c1-r2",
        content: "已经收藏了，慢慢学习",
        author: { id: "u3", name: "学习中", avatar: "/images/avatars/avatar-3.jpg" },
        createdAt: "30分钟前",
        likes: 5,
        isLiked: false,
      },
    ],
    replyCount: 5,
  },
  {
    id: "c2",
    content: "请问老师，日主弱的人是不是运势就不好？有没有补救的方法？",
    author: { id: "u4", name: "求知者", avatar: "/images/avatars/avatar-4.jpg" },
    createdAt: "5小时前",
    likes: 23,
    isLiked: true,
    replies: [],
    replyCount: 0,
  },
]

// 主组件（内部，使用 useSearchParams）
function DetailPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const contentId = searchParams.get('id') || '1'
  
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState<ContentDetail | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentsTotal, setCommentsTotal] = useState(0)
  const [commentsPage, setCommentsPage] = useState(1)
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [hasMoreComments, setHasMoreComments] = useState(true)
  const [showComments, setShowComments] = useState(false)
  const [related, setRelated] = useState<FeedItem[]>([])

  // 加载内容详情
  useEffect(() => {
    const loadContent = async () => {
      try {
        const data = await contentsApi.detail(contentId)
        setContent(data)
      } catch (e) {
        // 使用默认数据
        setContent(defaultContent)
      } finally {
        setLoading(false)
      }
    }
    
    loadContent()
    loadComments(1)
  }, [contentId])

  // 加载评论
  const loadComments = async (page: number) => {
    if (commentsLoading) return
    setCommentsLoading(true)
    
    try {
      const res = await interactApi.comments(contentId, { page, pageSize: 20 })
      if (page === 1) {
        setComments(res.data)
      } else {
        setComments(prev => [...prev, ...res.data])
      }
      setCommentsTotal(res.total)
      setHasMoreComments(res.data.length === 20)
      setCommentsPage(page)
    } catch (e) {
      // 使用默认数据
      setComments(defaultComments)
      setCommentsTotal(128)
      setHasMoreComments(false)
    } finally {
      setCommentsLoading(false)
    }
  }

  // 点赞/收藏 - 乐观更新
  const handleLike = async () => {
    if (!content) return
    const newLiked = !content.isLiked
    setContent({
      ...content,
      isLiked: newLiked,
      likes: content.likes + (newLiked ? 1 : -1),
    })
    
    try {
      await interactApi.toggleLike(contentId, content.type)
    } catch (e) {
      // 回滚
      setContent({
        ...content,
        isLiked: !newLiked,
        likes: content.likes,
      })
    }
  }

  const handleCollect = async () => {
    if (!content) return
    const newCollected = !content.isCollected
    setContent({
      ...content,
      isCollected: newCollected,
      collects: content.collects + (newCollected ? 1 : -1),
    })
    
    try {
      await interactApi.toggleCollect(contentId, content.type)
    } catch (e) {
      // 回滚
      setContent({
        ...content,
        isCollected: !newCollected,
        collects: content.collects,
      })
    }
  }

  // 关注作者
  const handleFollow = async () => {
    if (!content) return
    const newFollowed = !content.author.isFollowed
    setContent({
      ...content,
      author: {
        ...content.author,
        isFollowed: newFollowed,
        followers: content.author.followers + (newFollowed ? 1 : -1),
      },
    })
    
    try {
      await authApi.followUser(content.author.id)
    } catch (e) {
      // 回滚
      setContent({
        ...content,
        author: {
          ...content.author,
          isFollowed: !newFollowed,
          followers: content.author.followers,
        },
      })
    }
  }

  // 添加评论
  const handleAddComment = async (text: string, replyTo?: string) => {
    const newComment = await interactApi.addComment(contentId, text, replyTo)
    setComments(prev => [newComment, ...prev])
    setCommentsTotal(prev => prev + 1)
    if (content) {
      setContent({ ...content, comments: content.comments + 1 })
    }
  }

  // 点赞评论
  const handleLikeComment = (commentId: string) => {
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        return { ...c, isLiked: !c.isLiked, likes: c.likes + (c.isLiked ? -1 : 1) }
      }
      if (c.replies) {
        return {
          ...c,
          replies: c.replies.map(r => 
            r.id === commentId 
              ? { ...r, isLiked: !r.isLiked, likes: r.likes + (r.isLiked ? -1 : 1) }
              : r
          ),
        }
      }
      return c
    }))
  }

  // 分享
  const handleShare = async () => {
    try {
      const res = await interactApi.shareContent(contentId)
      // TODO: 显示分享海报弹窗
      if (navigator.share) {
        await navigator.share({
          title: content?.title,
          url: res.shareUrl,
        })
      }
    } catch (e) {
      // 静默失败或使用默认分享
    }
  }

  if (loading) return <DetailSkeleton />
  if (!content) return null

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-20">
      {/* 顶部导航 - 透明渐变 */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/40 to-transparent">
        <div className="flex items-center justify-between px-4 py-3 pt-safe">
          <button 
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-black/30 backdrop-blur flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleShare}
              className="w-9 h-9 rounded-full bg-black/30 backdrop-blur flex items-center justify-center"
            >
              <Share2 className="w-5 h-5 text-white" />
            </button>
            <button className="w-9 h-9 rounded-full bg-black/30 backdrop-blur flex items-center justify-center">
              <MoreHorizontal className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* 封面图 */}
      {content.cover && (
        <div className="aspect-video relative">
          <img 
            src={content.cover} 
            alt={content.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#FAF8F5] to-transparent" />
        </div>
      )}

      {/* 内容区 */}
      <div className={cn(
        "bg-white rounded-t-[20px] relative z-10",
        content.cover ? "-mt-4" : "mt-12"
      )}>
        {/* 标题和元信息 */}
        <div className="p-4 border-b border-[#F0EBE3]">
          <h1 className="text-[20px] font-bold text-[#2C2C2C] leading-tight mb-3">
            {content.title}
          </h1>
          
          {/* 标签 */}
          {content.tags && content.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {content.tags.map((tag, i) => (
                <span 
                  key={i}
                  className="px-2 py-0.5 bg-[#C41E3A]/10 text-[#C41E3A] text-[11px] rounded"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
          
          {/* 统计信息 */}
          <div className="flex items-center gap-4 text-[12px] text-[#999999]">
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />{content.views}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />{content.publishedAt}
            </span>
          </div>
        </div>

        {/* 作者信息 */}
        <div className="flex items-center justify-between p-4 border-b border-[#F0EBE3]">
          <Link href={`/user/${content.author.id}`} className="flex items-center gap-3">
            <img 
              src={content.author.avatar || "/images/default-avatar.png"} 
              alt={content.author.name}
              className="w-12 h-12 rounded-full object-cover"
            />
            <div>
              <div className="font-medium text-[#2C2C2C]">{content.author.name}</div>
              <div className="text-[12px] text-[#999999]">{content.author.title}</div>
            </div>
          </Link>
          <button
            onClick={handleFollow}
            className={cn(
              "px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors",
              content.author.isFollowed
                ? "bg-[#F5F0E8] text-[#999999]"
                : "bg-[#C41E3A] text-white"
            )}
          >
            {content.author.isFollowed ? "已关注" : "+ 关注"}
          </button>
        </div>

        {/* 正文内容 */}
        <div 
          className="p-4 prose prose-sm max-w-none
            prose-headings:text-[#2C2C2C] prose-headings:font-bold
            prose-p:text-[#333333] prose-p:leading-relaxed
            prose-a:text-[#C41E3A] prose-a:no-underline
            prose-blockquote:border-l-[#C9A96E] prose-blockquote:bg-[#FAF8F5] prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:text-[#666666] prose-blockquote:italic
            prose-ul:text-[#333333] prose-li:marker:text-[#C41E3A]
            prose-strong:text-[#2C2C2C]"
          dangerouslySetInnerHTML={{ __html: content.content }}
        />

        {/* 加入圈子引导 */}
        {content.relatedCircle && (
          <div className="mx-4 mb-4 p-4 bg-gradient-to-r from-[#C41E3A]/5 to-[#C9A96E]/5 rounded-xl border border-[#C41E3A]/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img 
                  src={content.relatedCircle.cover} 
                  alt={content.relatedCircle.name}
                  className="w-12 h-12 rounded-xl object-cover"
                />
                <div>
                  <div className="font-medium text-[#2C2C2C]">{content.relatedCircle.name}</div>
                  <div className="flex items-center gap-1 text-[12px] text-[#999999]">
                    <Users className="w-3.5 h-3.5" />
                    {content.relatedCircle.members}成员
                  </div>
                </div>
              </div>
              <Link 
                href={`/circles/${content.relatedCircle.id}`}
                className="px-4 py-1.5 bg-[#C41E3A] text-white text-[13px] font-medium rounded-full"
              >
                加入圈子
              </Link>
            </div>
          </div>
        )}

        {/* 评论区 */}
        <div className="border-t-8 border-[#F5F0E8]">
          {commentsLoading && comments.length === 0 ? (
            <CommentSkeleton />
          ) : (
            <CommentList
              contentId={contentId}
              comments={comments}
              total={commentsTotal}
              onLoadMore={() => loadComments(commentsPage + 1)}
              onAddComment={handleAddComment}
              onLikeComment={handleLikeComment}
              hasMore={hasMoreComments}
              loading={commentsLoading}
            />
          )}
        </div>
      </div>

      {/* 底部固定操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#F0EBE3] z-40">
        <div className="flex items-center justify-around py-2 pb-safe">
          <button 
            onClick={handleLike}
            className="flex flex-col items-center gap-0.5 py-1 px-4"
          >
            <Heart className={cn(
              "w-6 h-6 transition-colors",
              content.isLiked ? "text-[#C41E3A] fill-current" : "text-[#666666]"
            )} />
            <span className={cn(
              "text-[10px]",
              content.isLiked ? "text-[#C41E3A]" : "text-[#666666]"
            )}>
              {content.likes > 0 ? content.likes : "点赞"}
            </span>
          </button>
          
          <button 
            onClick={handleCollect}
            className="flex flex-col items-center gap-0.5 py-1 px-4"
          >
            <Star className={cn(
              "w-6 h-6 transition-colors",
              content.isCollected ? "text-[#C9A96E] fill-current" : "text-[#666666]"
            )} />
            <span className={cn(
              "text-[10px]",
              content.isCollected ? "text-[#C9A96E]" : "text-[#666666]"
            )}>
              {content.collects > 0 ? content.collects : "收藏"}
            </span>
          </button>
          
          <button 
            onClick={() => setShowComments(true)}
            className="flex flex-col items-center gap-0.5 py-1 px-4"
          >
            <MessageCircle className="w-6 h-6 text-[#666666]" />
            <span className="text-[10px] text-[#666666]">
              {content.comments > 0 ? content.comments : "评论"}
            </span>
          </button>
          
          <button 
            onClick={handleShare}
            className="flex flex-col items-center gap-0.5 py-1 px-4"
          >
            <Share2 className="w-6 h-6 text-[#666666]" />
            <span className="text-[10px] text-[#666666]">分享</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// 导出的页面组件（包裹 Suspense）
export default function DetailPage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <DetailPageContent />
    </Suspense>
  )
}
