"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Share2, Heart, Star, MessageCircle, MoreHorizontal,
  Users, ChevronRight, Eye, Clock, Volume2, Pause, Play, Sparkles,
  ShoppingBag, BookOpen, Bot, Compass, CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { interactApi, authApi, type Comment } from "@/lib/api"
import { CommentList } from "@/components/content/comment-list"

// ============================================
// 内容块模型 - 支持正文内联嵌入推荐卡
// ============================================
type EmbedType = "circle" | "course" | "product" | "paipan" | "agent"
type ContentBlock =
  | { type: "text"; content: string }
  | { type: "heading"; content: string }
  | { type: "quote"; content: string }
  | { type: "list"; items: string[] }
  | { type: "image"; src: string; caption?: string }
  | { type: "embed"; embedType: EmbedType; data: any }

interface ArticleData {
  id: string
  title: string
  cover?: string
  coverRatio?: "16:9" | "3:4"
  tags: string[]
  author: { id: string; name: string; avatar: string; title: string; followers: number; isFollowed: boolean }
  publishedAt: string
  views: number
  likes: number
  collects: number
  comments: number
  isLiked: boolean
  isCollected: boolean
  aiSummary?: string
  audioUrl?: string
  blocks: ContentBlock[]
  sourceCircle: { id: string; name: string; cover: string; description: string; members: number; postsToday: number; isJoined: boolean }
  authorOtherArticles: { id: string; title: string; cover?: string; views: number; likes: number }[]
  relatedArticles: { id: string; title: string; cover?: string; author: string; likes: number }[]
}

// ============================================
// 骨架屏
// ============================================
function ArticleSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--surface-base)] animate-pulse">
      <div className="aspect-video bg-[var(--surface-sunken)]" />
      <div className="bg-[var(--surface)] -mt-4 rounded-t-[20px] relative z-10 p-4 space-y-4">
        <div className="h-7 bg-[var(--surface-sunken)] rounded w-3/4" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--surface-sunken)]" />
          <div className="space-y-2">
            <div className="h-4 w-24 bg-[var(--surface-sunken)] rounded" />
            <div className="h-3 w-16 bg-[var(--surface-sunken)] rounded" />
          </div>
        </div>
        <div className="p-3 bg-[var(--surface-sunken)] rounded-lg space-y-2">
          <div className="h-4 w-20 bg-[var(--line)] rounded" />
          <div className="h-3 bg-[var(--line)] rounded w-full" />
          <div className="h-3 bg-[var(--line)] rounded w-4/5" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-4 bg-[var(--surface-sunken)] rounded" style={{ width: `${100 - i * 10}%` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================
// AI 智能摘要
// ============================================
function AISummary({ summary }: { summary: string }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="mx-4 mb-4 p-3 rounded-xl border border-[var(--line)] bg-[var(--surface-sunken)]">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-5 h-5 rounded-full bg-[var(--brand)] flex items-center justify-center">
          <Sparkles className="w-3 h-3 text-white" />
        </div>
        <span className="text-[12px] font-bold text-[var(--brand)]">AI 智能摘要</span>
      </div>
      <p className={cn("text-[13px] text-[var(--text)] leading-relaxed transition-all", !expanded && "line-clamp-2")}>
        {summary}
      </p>
      {summary.length > 60 && (
        <button onClick={() => setExpanded(!expanded)} className="text-[12px] text-[var(--brand)] mt-1">
          {expanded ? "收起" : "展开全部"}
        </button>
      )}
    </div>
  )
}

// ============================================
// 语音朗读
// ============================================
function AudioPlayer({ contentId, audioUrl }: { contentId: string; audioUrl?: string }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) audioRef.current.pause()
    else audioRef.current.play()
    setIsPlaying(!isPlaying)
  }
  const formatTime = (t: number) => `${Math.floor(t / 60)}:${Math.floor(t % 60).toString().padStart(2, "0")}`
  if (!audioUrl) return null

  return (
    <div className="mx-4 mb-4 p-3 bg-[var(--surface)] rounded-xl border border-[var(--line)] shadow-sm">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={() => audioRef.current && setProgress(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
        onEnded={() => setIsPlaying(false)}
      />
      <div className="flex items-center gap-3">
        <button onClick={togglePlay} className="w-10 h-10 rounded-full bg-[var(--brand)] flex items-center justify-center text-white shadow-md active:scale-95 transition-transform">
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>
        <div className="flex-1">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-soft)] mb-1">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <div className="h-1.5 bg-[var(--surface-sunken)] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--brand)] rounded-full transition-all" style={{ width: duration > 0 ? `${(progress / duration) * 100}%` : "0%" }} />
          </div>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-[var(--text-soft)]">
          <Volume2 className="w-3.5 h-3.5 text-[var(--accent)]" />朗读
        </div>
      </div>
    </div>
  )
}

// ============================================
// 内联推荐卡片
// ============================================
function EmbedCircle({ data }: { data: any }) {
  const [joined, setJoined] = useState(!!data.isJoined)
  return (
    <div className="my-5 p-4 rounded-xl border border-[var(--line)] bg-[var(--surface-sunken)]">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-[var(--brand-soft)]/20 flex items-center justify-center shrink-0">
          <Users className="w-6 h-6 text-[var(--brand)]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-[var(--text-strong)] truncate">{data.name}</h4>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#8B7BB8]/15 text-[#8B7BB8] shrink-0">圈子</span>
          </div>
          <p className="text-sm text-[var(--text-soft)] mt-1 line-clamp-2">{data.description}</p>
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-[var(--text-soft)]">{data.members} 成员</span>
            <button
              onClick={() => setJoined(!joined)}
              className={cn("px-4 py-1.5 text-sm font-medium rounded-full transition-all",
                joined ? "bg-[var(--surface-sunken)] text-[var(--text-soft)] border border-[var(--line)]" : "bg-[var(--brand)] text-white")}
            >
              {joined ? "已加入" : "加入圈子"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function EmbedCourse({ data }: { data: any }) {
  return (
    <Link href={`/courses/${data.id}`} className="block my-5">
      <div className="p-3 bg-[var(--surface)] rounded-xl border border-[var(--line)] shadow-sm flex gap-3 active:bg-[var(--surface-sunken)] transition-colors">
        <div className="w-20 h-20 rounded-lg overflow-hidden bg-[var(--surface-sunken)] shrink-0">
          <img src={data.cover || "/images/courses/course-1.jpg"} alt={data.title} className="w-full h-full object-cover" crossOrigin="anonymous" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-1">
            <BookOpen className="w-3 h-3 text-[var(--info)]" />
            <span className="text-[10px] text-[var(--info)] font-medium">相关课程</span>
          </div>
          <h4 className="text-[13px] font-medium text-[var(--text-strong)] line-clamp-2 mb-1">{data.title}</h4>
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-bold text-[var(--brand)]">¥{data.price}</span>
            <span className="text-[11px] text-[var(--text-soft)]">{data.students}人学习</span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-[var(--text-soft)] self-center shrink-0" />
      </div>
    </Link>
  )
}

function EmbedProduct({ data }: { data: any }) {
  return (
    <Link href={`/mall/product/${data.id}`} className="block my-5">
      <div className="p-3 bg-[var(--surface)] rounded-xl border border-[var(--line)] shadow-sm flex gap-3 active:bg-[var(--surface-sunken)] transition-colors">
        <div className="w-20 h-20 rounded-lg overflow-hidden bg-[var(--surface-sunken)] shrink-0">
          <img src={data.cover || "/images/products/book-1.jpg"} alt={data.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-1">
            <ShoppingBag className="w-3 h-3 text-[var(--brand)]" />
            <span className="text-[10px] text-[var(--brand)] font-medium">相关商品</span>
          </div>
          <h4 className="text-[13px] font-medium text-[var(--text-strong)] line-clamp-2 mb-1">{data.name}</h4>
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-[15px] font-bold text-[var(--brand)]">¥{data.price}</span>
              {data.originalPrice && <span className="text-[11px] text-[var(--text-soft)] line-through">¥{data.originalPrice}</span>}
            </div>
            <span className="px-3 py-1 text-xs font-medium rounded-full bg-[var(--brand)] text-white">立即购买</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

function EmbedPaipan({ data }: { data: any }) {
  return (
    <Link href="/paipan" className="block my-5">
      <div className="p-4 rounded-xl border border-[var(--brand)]/30 bg-[var(--surface-sunken)] flex items-center gap-4 active:opacity-90 transition-opacity">
        <div className="w-12 h-12 rounded-full bg-[var(--brand)] flex items-center justify-center shrink-0 shadow-md">
          <Compass className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-[var(--text-strong)]">{data.title}</h4>
          <p className="text-sm text-[var(--text-soft)] mt-0.5 line-clamp-1">{data.description}</p>
        </div>
        <span className="px-4 py-2 text-sm font-medium rounded-full bg-[var(--brand)] text-white shrink-0">免费排盘</span>
      </div>
    </Link>
  )
}

function EmbedAgent({ data }: { data: any }) {
  return (
    <Link href={`/agent/${data.id}`} className="block my-5">
      <div className="p-4 rounded-xl border border-[#8B7BB8]/30 bg-[var(--surface-sunken)] flex items-center gap-4 active:opacity-90 transition-opacity">
        <div className="w-12 h-12 rounded-xl bg-[#8B7BB8] flex items-center justify-center shrink-0 shadow-md">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-[var(--text-strong)] truncate">{data.name}</h4>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#8B7BB8]/15 text-[#8B7BB8] shrink-0">AI</span>
          </div>
          <p className="text-sm text-[var(--text-soft)] mt-0.5 line-clamp-1">{data.description}</p>
        </div>
        <span className="px-4 py-2 text-sm font-medium rounded-full bg-[#8B7BB8] text-white shrink-0">体验</span>
      </div>
    </Link>
  )
}

function renderBlock(block: ContentBlock, i: number) {
  switch (block.type) {
    case "heading":
      return <h2 key={i} className="text-[17px] font-bold text-[var(--text-strong)] mt-7 mb-3 leading-snug">{block.content}</h2>
    case "text":
      return <p key={i} className="text-[15px] text-[var(--text)] leading-[1.9] mb-4 tracking-[0.01em]">{block.content}</p>
    case "quote":
      return (
        <blockquote key={i} className="my-5 pl-4 pr-3 py-3 border-l-[3px] border-[var(--accent)] bg-[var(--surface-sunken)] rounded-r-lg text-[14px] text-[var(--text-soft)] leading-relaxed">
          {block.content}
        </blockquote>
      )
    case "list":
      return (
        <ul key={i} className="my-4 space-y-2">
          {block.items.map((it, k) => (
            <li key={k} className="flex gap-2 text-[15px] text-[var(--text)] leading-relaxed">
              <span className="text-[var(--brand)] mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--brand)] shrink-0" />
              <span>{it}</span>
            </li>
          ))}
        </ul>
      )
    case "image":
      return (
        <figure key={i} className="my-6">
          <div className="rounded-xl overflow-hidden bg-[var(--surface-sunken)]">
            <img src={block.src} alt={block.caption || ""} className="w-full h-auto object-cover" crossOrigin="anonymous" />
          </div>
          {block.caption && <figcaption className="text-center text-[12px] text-[var(--text-soft)] mt-2">{block.caption}</figcaption>}
        </figure>
      )
    case "embed":
      switch (block.embedType) {
        case "circle": return <EmbedCircle key={i} data={block.data} />
        case "course": return <EmbedCourse key={i} data={block.data} />
        case "product": return <EmbedProduct key={i} data={block.data} />
        case "paipan": return <EmbedPaipan key={i} data={block.data} />
        case "agent": return <EmbedAgent key={i} data={block.data} />
      }
  }
}

// ============================================
// Mock 数据
// ============================================
const mockArticle: ArticleData = {
  id: "1",
  title: "八字入门：如何正确排出你的生辰八字",
  cover: "/images/feed/article-1.jpg",
  coverRatio: "16:9",
  tags: ["八字入门", "命理学", "五行"],
  author: { id: "author-1", name: "玄微子", avatar: "/images/experts/expert-1.jpg", title: "易学传承人 · 20年经验", followers: 12680, isFollowed: false },
  publishedAt: "2024-01-15",
  views: 8520,
  likes: 1256,
  collects: 892,
  comments: 2,
  isLiked: false,
  isCollected: false,
  aiSummary: "本文系统介绍了八字命理的基础概念，包括天干地支、四柱构成、真太阳时校正与五行十神关系，适合零基础读者建立完整的八字认知框架。",
  audioUrl: "/audio/article-1.mp3",
  blocks: [
    { type: "text", content: "八字，又称四柱，是中国传统命理学的核心方法之一。它以一个人出生的年、月、日、时四个时间点，各配以天干地支���形成八个字，故称「八字」。" },
    { type: "heading", content: "一、什么是八字？" },
    { type: "text", content: "八字命理学认为，一个人出生时的天干地支，蕴含着其一生的命运信息。通过分析八字中的五行生克、十神关系、神煞等要素，可以推断一个人的性格、事业、婚姻、财运等方面的情况。" },
    { type: "list", items: ["天干十个：甲乙丙丁戊己庚辛壬癸", "地支十二个：子丑寅卯辰巳午未申酉戌亥", "天干地支两两相配，循环六十，称为六十甲子"] },
    { type: "embed", embedType: "paipan", data: { title: "AI 智能排盘", description: "输入生辰，一键生成专业八字命盘" } },
    { type: "heading", content: "二、如何排八字？" },
    { type: "text", content: "排八字的第一步是确定出生的准确时间。需要注意的是，八字使用的是真太阳时，而非北京时间，不同地区需根据经度进行时差校正。" },
    { type: "quote", content: "年柱以立春为界，月柱以节气为准，日柱以子时为分界，时柱则根据出生时辰确定。" },
    { type: "embed", embedType: "course", data: { id: "c1", title: "八字命理系统课程：从零到精通", cover: "/images/courses/course-1.jpg", price: 299, students: 1580 } },
    { type: "heading", content: "三、八字的基本构成" },
    { type: "text", content: "八字由四柱组成，每柱包含一个天干和一个地支。年柱代表祖上和童年，月柱代表父母和青年，日柱代表自己和配偶，时柱代表子女和晚年。日干是八字的核心，称为「日主」，代表命主本人。" },
    { type: "embed", embedType: "product", data: { id: "p1", name: "《渊海子平》精装典藏版", cover: "/images/products/book-1.jpg", price: 128, originalPrice: 168 } },
    { type: "heading", content: "四、学习建议" },
    { type: "text", content: "学习八字需要循序渐进，建议从基础概念开始，先熟悉天干地支、五行生克、十神含义，再逐步深入到格局、用神、大运流年等高级内容。实践是最好的老师，多分析真实案例、与同好交流探讨尤为重要。" },
    { type: "embed", embedType: "agent", data: { id: "a1", name: "八字智能解读", description: "AI 分析你的命盘，给出专业解读" } },
  ],
  sourceCircle: { id: "circle-1", name: "八字命理研究社", cover: "/images/circles/circle-1.jpg", description: "专注八字命理研究，分享实战案例与学习心得", members: 3280, postsToday: 56, isJoined: false },
  authorOtherArticles: [
    { id: "2", title: "紫微斗数与八字命理的区别与联系", cover: "/images/feed/article-2.jpg", views: 3200, likes: 456 },
    { id: "3", title: "如何从八字看财运旺衰", views: 5600, likes: 890 },
    { id: "4", title: "八字合婚的基本原则", cover: "/images/feed/article-1.jpg", views: 4500, likes: 678 },
  ],
  relatedArticles: [
    { id: "5", title: "十神详解：正官七杀的吉凶判断", cover: "/images/feed/article-2.jpg", author: "李命理", likes: 320 },
    { id: "6", title: "大运流年如何影响一生运势", author: "周易大师", likes: 540 },
  ],
}

const mockComments: Comment[] = [
  {
    id: "c1", content: "写得很好，对初学者很友好，期待更多入门教程！",
    author: { id: "u1", name: "国学爱好者", avatar: "/images/avatars/avatar-1.jpg" },
    createdAt: "2小时前", likes: 56, isLiked: false,
    replies: [{ id: "c1-r1", content: "同感！终于找到一篇能看懂的入门文章", author: { id: "u2", name: "命理新手", avatar: "/images/avatars/avatar-2.jpg" }, createdAt: "1小时前", likes: 12, isLiked: false }],
    replyCount: 3,
  },
  {
    id: "c2", content: "五行相生相克那部分讲得特别清楚，以前总是记不住",
    author: { id: "u3", name: "学习中", avatar: "/images/avatars/avatar-3.jpg" },
    createdAt: "5小时前", likes: 34, isLiked: true,
  },
]

// ============================================
// 主组件
// ============================================
export default function ArticleDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = (params?.id as string) || "1"

  const [article, setArticle] = useState<ArticleData | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [isFollowed, setIsFollowed] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [isCollected, setIsCollected] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [collectCount, setCollectCount] = useState(0)
  const [joinedCircle, setJoinedCircle] = useState(false)

  useEffect(() => {
    let active = true
    const load = async () => {
      setIsLoading(true)
      try {
        // TODO: const data = await contentsApi.detail(id)
        await new Promise((r) => setTimeout(r, 600))
        if (!active) return
        const data = mockArticle
        setArticle(data)
        setComments(mockComments)
        setIsFollowed(data.author.isFollowed)
        setIsLiked(data.isLiked)
        setIsCollected(data.isCollected)
        setLikeCount(data.likes)
        setCollectCount(data.collects)
        setJoinedCircle(data.sourceCircle.isJoined)
      } catch {
        if (active) setNotFound(true)
      } finally {
        if (active) setIsLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [id])

  const handleFollow = async () => {
    setIsFollowed((v) => !v)
    try { await authApi.followUser(article?.author.id || "") } catch { setIsFollowed((v) => !v) }
  }
  const handleLike = async () => {
    const next = !isLiked
    setIsLiked(next); setLikeCount((c) => next ? c + 1 : c - 1)
    try { await interactApi.toggleLike(id, "article") } catch { setIsLiked(!next); setLikeCount((c) => next ? c - 1 : c + 1) }
  }
  const handleCollect = async () => {
    const next = !isCollected
    setIsCollected(next); setCollectCount((c) => next ? c + 1 : c - 1)
    try { await interactApi.toggleCollect(id, "article") } catch { setIsCollected(!next); setCollectCount((c) => next ? c - 1 : c + 1) }
  }
  const handleShare = async () => {
    router.push(`/common/share-poster?type=article&targetId=${id}`)
  }

  // 评论交互
  const handleAddComment = useCallback(async (content: string, replyTo?: string) => {
    const newComment: Comment = {
      id: `local-${Date.now()}`, content,
      author: { id: "me", name: "我", avatar: "/images/avatars/avatar-1.jpg" },
      createdAt: "刚刚", likes: 0, isLiked: false,
    }
    setComments((prev) => [newComment, ...prev])
  }, [])
  const handleLikeComment = useCallback((commentId: string) => {
    setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, isLiked: !c.isLiked, likes: c.isLiked ? c.likes - 1 : c.likes + 1 } : c))
  }, [])

  if (isLoading) return <ArticleSkeleton />

  if (notFound || !article) {
    return (
      <div className="min-h-screen bg-[var(--surface-base)] flex flex-col items-center justify-center px-8 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--surface-sunken)] flex items-center justify-center mb-4">
          <BookOpen className="w-8 h-8 text-[var(--text-soft)]" />
        </div>
        <h2 className="text-[16px] font-bold text-[var(--text-strong)] mb-1">文章不存在或已删除</h2>
        <p className="text-[13px] text-[var(--text-soft)] mb-5">该文章可能已被作者删除或转为私密</p>
        <button onClick={() => router.push("/")} className="px-5 py-2 rounded-full bg-[var(--brand)] text-white text-[14px] font-medium">
          返回首页
        </button>
      </div>
    )
  }

  const showJoinGuide = !joinedCircle

  return (
    <div className="min-h-screen bg-[var(--surface-base)]" style={{ paddingBottom: showJoinGuide ? "132px" : "72px" }}>
      {/* 顶部导航 */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[var(--surface)]/95 backdrop-blur-sm border-b border-[var(--line)]">
        <div className="flex items-center justify-between px-4 h-11 max-w-3xl mx-auto">
          <button onClick={() => (typeof window !== "undefined" && window.history.length > 1 ? router.back() : router.push("/discover"))} className="w-8 h-8 flex items-center justify-center -ml-2" aria-label="返回">
            <ArrowLeft className="w-5 h-5 text-[var(--text-strong)]" />
          </button>
          <span className="text-[14px] font-medium text-[var(--text-strong)]">文章详情</span>
          <div className="flex items-center gap-1">
            <button onClick={handleShare} className="w-8 h-8 flex items-center justify-center" aria-label="分享">
              <Share2 className="w-5 h-5 text-[var(--text-strong)]" />
            </button>
            <button className="w-8 h-8 flex items-center justify-center" aria-label="更多">
              <MoreHorizontal className="w-5 h-5 text-[var(--text-strong)]" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        {/* 封面图 */}
        {article.cover && (
          <div className="pt-11">
            <div className={cn("bg-[var(--surface-sunken)]", article.coverRatio === "3:4" ? "aspect-[3/4]" : "aspect-video")}>
              <img src={article.cover} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />
            </div>
          </div>
        )}

        {/* 内容卡片 */}
        <div className={cn("bg-[var(--surface)] relative z-10", article.cover ? "rounded-t-[20px] -mt-4" : "mt-11")}>
          {/* 标题 + 标签 + 作者 */}
          <div className="px-4 pt-5 pb-3">
            <h1 className="text-[22px] font-bold text-[var(--text-strong)] leading-tight mb-3 font-serif text-pretty">{article.title}</h1>

            {article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {article.tags.map((tag) => (
                  <Link key={tag} href={`/topic/${encodeURIComponent(tag)}`} className="px-2 py-0.5 bg-[var(--surface-sunken)] rounded-full text-[11px] text-[var(--text-soft)]">
                    #{tag}
                  </Link>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between">
              <Link href={`/user/${article.author.id}`} className="flex items-center gap-3 min-w-0">
                <img src={article.author.avatar} alt="" className="w-10 h-10 rounded-full border border-[var(--line)] object-cover" crossOrigin="anonymous" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[14px] font-medium text-[var(--text-strong)] truncate">{article.author.name}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--brand)] shrink-0" />
                  </div>
                  <div className="text-[11px] text-[var(--text-soft)] truncate">{article.author.title}</div>
                </div>
              </Link>
              <button
                onClick={handleFollow}
                className={cn("px-4 py-1.5 rounded-full text-[12px] font-medium transition-all shrink-0",
                  isFollowed ? "bg-[var(--surface-sunken)] text-[var(--text-soft)] border border-[var(--line)]" : "bg-[var(--brand)] text-white")}
              >
                {isFollowed ? "已关注" : "+ 关注"}
              </button>
            </div>

            <div className="flex items-center gap-4 mt-3 text-[11px] text-[var(--text-soft)]">
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{article.views} 阅读</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{article.publishedAt}</span>
            </div>
          </div>

          {article.aiSummary && <AISummary summary={article.aiSummary} />}
          {article.audioUrl && <AudioPlayer contentId={article.id} audioUrl={article.audioUrl} />}

          {/* 正文 - 块级渲染，推荐卡内联 */}
          <div className="px-4 pb-2">
            {article.blocks.map((block, i) => renderBlock(block, i))}
          </div>

          {/* 作者其他文章 */}
          {article.authorOtherArticles.length > 0 && (
            <div className="px-4 py-4 mt-2 border-t border-[var(--line)]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[14px] font-bold text-[var(--text-strong)]">{article.author.name}的其他文章</h3>
                <Link href={`/user/${article.author.id}`} className="text-[12px] text-[var(--brand)] flex items-center gap-0.5">
                  更多 <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-3">
                {article.authorOtherArticles.slice(0, 3).map((a) => (
                  <Link key={a.id} href={`/articles/${a.id}`} className="flex gap-3 active:opacity-80 transition-opacity">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[13px] font-medium text-[var(--text-strong)] line-clamp-2 mb-2">{a.title}</h4>
                      <div className="flex items-center gap-3 text-[11px] text-[var(--text-soft)]">
                        <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{a.views}</span>
                        <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" />{a.likes}</span>
                      </div>
                    </div>
                    {a.cover && (
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-[var(--surface-sunken)] shrink-0">
                        <img src={a.cover} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 相关推荐 / 猜你喜欢 */}
          {article.relatedArticles.length > 0 && (
            <div className="px-4 py-4 border-t border-[var(--line)]">
              <h3 className="text-[14px] font-bold text-[var(--text-strong)] mb-3">猜你喜欢</h3>
              <div className="space-y-3">
                {article.relatedArticles.map((a) => (
                  <Link key={a.id} href={`/articles/${a.id}`} className="flex gap-3 active:opacity-80 transition-opacity">
                    {a.cover && (
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-[var(--surface-sunken)] shrink-0">
                        <img src={a.cover} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[13px] font-medium text-[var(--text-strong)] line-clamp-2 mb-2">{a.title}</h4>
                      <div className="flex items-center gap-3 text-[11px] text-[var(--text-soft)]">
                        <span>{a.author}</span>
                        <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" />{a.likes}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 评论区 */}
          <div className="border-t border-[var(--line)]">
            <div id="article-comment-anchor" className="px-4 py-3 scroll-mt-14">
              <h3 className="text-[15px] font-bold text-[var(--text-strong)]">评论 ({article.comments})</h3>
            </div>
            <CommentList
              contentId={article.id}
              comments={comments}
              total={article.comments}
              onLoadMore={() => {}}
              onAddComment={handleAddComment}
              onLikeComment={handleLikeComment}
              hasMore={false}
              loading={false}
            />
          </div>
        </div>
      </div>

      {/* 底部来源圈子引流（非成员可见） */}
      {showJoinGuide && (
        <div className="fixed bottom-[60px] left-0 right-0 z-40 bg-[var(--surface)]/95 backdrop-blur-lg border-t border-[var(--line)] px-4 py-2.5">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <Link href={`/circles/${article.sourceCircle.id}`} className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-11 h-11 rounded-xl overflow-hidden bg-[var(--surface-sunken)] shrink-0">
                <img src={article.sourceCircle.cover} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-[var(--text-strong)] truncate">{article.sourceCircle.name}</div>
                <div className="text-[11px] text-[var(--text-soft)] truncate">{article.sourceCircle.members}成员 · 今日{article.sourceCircle.postsToday}条动态</div>
              </div>
            </Link>
            <button
              onClick={() => setJoinedCircle(true)}
              className="px-5 py-2 text-[13px] font-medium rounded-full bg-[var(--brand)] text-white shrink-0"
            >
              加入圈子
            </button>
          </div>
        </div>
      )}

      {/* 底部互动栏 */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--surface)] border-t border-[var(--line)]">
        <div className="max-w-3xl mx-auto flex items-center gap-3 px-4 py-2">
          <button
            onClick={() => document.getElementById("article-comment-anchor")?.scrollIntoView({ behavior: "smooth" })}
            className="flex-1 h-9 bg-[var(--surface-sunken)] rounded-full flex items-center justify-center gap-1.5 text-[13px] text-[var(--text-soft)]"
          >
            <MessageCircle className="w-4 h-4" />写评论...
          </button>
          <button onClick={handleLike} className="flex flex-col items-center gap-0.5 px-3" aria-label="点赞">
            <Heart className={cn("w-6 h-6 transition-colors", isLiked ? "fill-[var(--brand)] text-[var(--brand)]" : "text-[var(--text)]")} />
            <span className="text-[10px] text-[var(--text-soft)]">{likeCount}</span>
          </button>
          <button onClick={handleCollect} className="flex flex-col items-center gap-0.5 px-3" aria-label="收藏">
            <Star className={cn("w-6 h-6 transition-colors", isCollected ? "fill-[var(--accent)] text-[var(--accent)]" : "text-[var(--text)]")} />
            <span className="text-[10px] text-[var(--text-soft)]">{collectCount}</span>
          </button>
          <button onClick={handleShare} className="flex flex-col items-center gap-0.5 px-3" aria-label="分享">
            <Share2 className="w-6 h-6 text-[var(--text)]" />
            <span className="text-[10px] text-[var(--text-soft)]">分享</span>
          </button>
        </div>
      </div>
    </div>
  )
}
