"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Masonry from "react-masonry-css"
import { 
  Heart, MessageCircle, Eye, Play, BookOpen, 
  Sparkles, Clock, ChevronRight,
  EyeOff, Zap, Bot, Wind, Star
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { CircleCard, type CircleData } from "@/components/circle/circle-card"

// ============================================
// 数字动效组件
// ============================================
function AnimatedNumber({ value, suffix = "" }: { value: number | string; suffix?: string }) {
  const [display, setDisplay] = useState(0)
  const num = typeof value === "string" ? parseFloat(value.replace(/[^\d.]/g, "")) : value
  const hasUnit = typeof value === "string" && value.includes("万")

  useEffect(() => {
    const dur = 800
    const start = Date.now()
    const tick = () => {
      const p = Math.min((Date.now() - start) / dur, 1)
      const ease = 1 - Math.pow(1 - p, 4)
      setDisplay(num * ease)
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [num])

  const fmt = (n: number) =>
    hasUnit ? n.toFixed(1) + "万" : Math.round(n).toLocaleString() + suffix

  return <span>{fmt(display)}</span>
}

// ============================================
// 真实内容数据 - 多种类型混合（千人千面示例数据）
// ============================================
const feedItems = [
  // 1. 课程 - 竖版3:4
  { id: 1,  type: "course",   title: "八字入门实战课：从零开始学命理",        author: "周易大师",  authorAvatar: "周", price: 199, originalPrice: 399, students: 2860, cover: "/images/feed/course-1.jpg",       coverRatio: "3:4" },
  // 2. 直播中 - 竖版3:4，呼吸灯
  { id: 2,  type: "live",     title: "八字看2026下半年运势走向",               author: "周易大师",  authorAvatar: "周", viewers: 1280, isLive: true,  cover: "/images/feed/live-1.jpg",          coverRatio: "3:4" },
  // 3. 文章 - 竖版图3:4
  { id: 3,  type: "article",  title: "八字食神制杀格局详解与实例分析",         author: "张玄风",    authorAvatar: "张", likes: 328, comments: 56, excerpt: "食神制杀是八字中常见的贵格之一，具有文武双全的特点。通过实例来详细分析格局的形成条件和断语要点。", cover: "/images/feed/article-1.jpg", coverRatio: "3:4" },
  // 4. 商品 - 竖版3:4
  { id: 4,  type: "product",  title: "《渊海子平》精装典藏版",                 author: "",          authorAvatar: "",   price: 68,  originalPrice: 128, sales: 1280, tag: "热销", cover: "/images/feed/product-1.jpg",  coverRatio: "3:4" },
  // 5. 圈子 - 已加入成员
  { id: 5,  type: "circle",   circleName: "八字研习社", isMember: true,          author: "张玄风",    authorAvatar: "/images/experts/expert-1.jpg", content: "每日案例解析，从入门到精通的八字学习社区", members: 12800, likes: 42, comments: 18, cover: "/images/circles/circle-1.jpg", coverRatio: "4:3", price: 0, rating: 4.9, tags: ["活跃", "干货多"], isVerified: true, ownerTitle: "资深命理师", todayPosts: 56, recentJoiners: ["/images/avatars/avatar-1.jpg", "/images/avatars/avatar-2.jpg", "/images/avatars/avatar-3.jpg"] },
  // 6. 排盘引导大卡 - 在 buildItems 中第6位插入
  // 7. 电子书 - 竖版3:4
  { id: 7,  type: "ebook",    title: "《滴天髓》白话精解",                     author: "古籍研究院", authorAvatar: "古",  readers: 8560, chapters: 32, price: 68,  cover: "/images/feed/ebook-1.jpg",         coverRatio: "3:4" },
  // 8. 横屏直播 - 16:9，完整展示卡片自然变矮
  { id: 8,  type: "live",     title: "手把手教你排八字命盘",                   author: "李命理",    authorAvatar: "李", viewers: 856, isLive: true,  cover: "/images/feed/live-horizontal.jpg", coverRatio: "16:9" },
  // 9. 短视频 - 竖版3:4，右下角时长+播放图标
  { id: 9,  type: "video",    title: "3分钟看懂十二地支含义",                  author: "国学小课堂", authorAvatar: "国", duration: "03:21", plays: "8.5万", likes: 1256, cover: "/images/feed/video-1.jpg",  coverRatio: "3:4" },
  // 10. 文章横版 - 16:9，完整展示变矮
  { id: 10, type: "article",  title: "从易经看人生的三个重要阶段",             author: "国学研究院", authorAvatar: "国",  likes: 425, comments: 78, excerpt: "易经告诉我们，人生可分为三个重要阶段：少年为乾，壮年为坤，晚年为泰。理解这些帮助把握人生节奏。", cover: "/images/feed/live-horizontal.jpg", coverRatio: "16:9" },
  // 11. 课程
  { id: 11, type: "course",   title: "紫微斗数命盘解读进阶班",                author: "张玄风",    authorAvatar: "张", price: 299, originalPrice: 599, students: 1560, cover: "/images/feed/course-2.jpg",       coverRatio: "3:4" },
  // 12. 纯文字文章（无封面）
  { id: 12, type: "article",  title: "为什么八字中财星不一定代表有钱",         author: "命理研究院", authorAvatar: "命",  likes: 856, comments: 124, excerpt: "很多人一看到八字中有财星就觉得会发财，但财星代表的是你能掌控的资源和机会，而非直接金钱收入。今天深入分析财星的真正含义和应用方法。", cover: null },
  // 13. 商品
  { id: 13, type: "product",  title: "专业堪舆罗盘套装",                       author: "",          authorAvatar: "",   price: 298, originalPrice: 498, sales: 860, tag: "新品", cover: "/images/feed/product-2.jpg",  coverRatio: "3:4" },
  // 14. 短视频横版
  { id: 14, type: "video",    title: "五行相生相克的本质原理详解",             author: "易学研究",  authorAvatar: "易", duration: "08:42", plays: "3.2万", likes: 1890, cover: "/images/feed/live-horizontal.jpg", coverRatio: "16:9" },
  // 15. 圈子 - 未加入
  { id: 15, type: "circle",   circleName: "六爻预测实战", isMember: false,       author: "六爻居士",  authorAvatar: "/images/experts/expert-2.jpg", content: "铜钱起卦、断卦技法，实战案例每日更新", members: 3280, likes: 35, comments: 22, cover: "/images/circles/circle-2.jpg", coverRatio: "4:3", price: 58, rating: 4.7, tags: ["进阶", "实战派"], isVerified: true, ownerTitle: "六爻研究者", todayPosts: 28, recentJoiners: ["/images/avatars/avatar-2.jpg", "/images/avatars/avatar-3.jpg", "/images/avatars/avatar-1.jpg"] },
  // 16. 纯文字帖子
  { id: 16, type: "post",     title: "请教：甲木日主酉月身弱如何调整",         author: "易学新人",  authorAvatar: "易", likes: 42, comments: 28, content: "我的八字甲木日主，生在酉月，地支有申酉戌三会金局，这样的命局是不是身弱财旺？应该怎么调整？求各位老师指点！", cover: null },
  // 17. 文章竖版
  { id: 17, type: "article",  title: "梅花易数预测实例深度分析",               author: "梅花居士",  authorAvatar: "梅", likes: 312, comments: 45, excerpt: "梅花易数以简洁著称，但其中蕴含的道理极为深刻。通过这个预测实例看看如何运用时间起卦法进行日常占断。", cover: "/images/feed/article-1.jpg", coverRatio: "3:4" },
  // 18. 课程
  { id: 18, type: "course",   title: "风水堪舆入门精讲",                       author: "陈风水",    authorAvatar: "陈", price: 168, originalPrice: 299, students: 980,  cover: "/images/feed/course-3.jpg",  coverRatio: "3:4" },
  // 19. 直播预约
  { id: 19, type: "live",     title: "紫微斗数十二宫位详解直播",               author: "紫微大师",  authorAvatar: "紫", time: "明天19:30", reservations: 520, isLive: false, cover: "/images/feed/live-horizontal.jpg", coverRatio: "16:9" },
  // 20. 商品
  { id: 20, type: "product",  title: "开运水晶手链套装",                       author: "",          authorAvatar: "",   price: 158, originalPrice: 258, sales: 2680, tag: "秒杀", cover: "/images/feed/product-3.jpg", coverRatio: "3:4" },
  // 21. 电子书
  { id: 21, type: "ebook",    title: "《穷通宝鉴》注解版",                     author: "命理古籍馆", authorAvatar: "命",  readers: 5280, chapters: 24, price: 0,   cover: "/images/feed/ebook-2.jpg",   coverRatio: "3:4" },
  // 22. 文章横版
  { id: 22, type: "article",  title: "如何通过八字看适合的职业方向",           author: "职业规划师", authorAvatar: "职",  likes: 568, comments: 89, excerpt: "八字中的十神代表了不同的社会角色和性格特点，分析日主旺衰找到最适合的职业发展方向。", cover: "/images/feed/live-horizontal.jpg", coverRatio: "16:9" },
  // 23. 课程横版
  { id: 23, type: "course",   title: "奇门遁甲零基础入门精讲",                author: "奇门研究院", authorAvatar: "奇",  price: 399, originalPrice: 799, students: 1680, cover: "/images/feed/live-horizontal.jpg", coverRatio: "16:9" },
  // 24. 短视频
  { id: 24, type: "video",    title: "天干地支快速记忆法",                     author: "玄学日历",  authorAvatar: "玄", duration: "02:15", plays: "1.2万", likes: 2560, cover: "/images/feed/video-1.jpg",  coverRatio: "3:4" },
  // 25. 每日一首诗词 - 沉浸式深色大卡
  { id: 25, type: "poem_daily", title: "静夜思", author: "李白", authorAvatar: "李", dynasty: "唐", form: "五言绝句", lines: ["床前明月光，", "疑是地上霜。", "举头望明月，", "低头思故乡。"], tags: ["思乡", "月亮"], likes: 12800, cover: null },
  // 26. 普通诗词推荐卡
  { id: 26, type: "poem", title: "水调歌头", author: "苏轼", authorAvatar: "苏", dynasty: "宋", form: "词", preview: "明月几时有，把酒问青天，不知天上宫阙，今夕是何年。", tags: ["中秋"], likes: 11200, cover: null },
]

// ============================================
// 智能体类型 → 颜色主题映射（5套，后台可扩展）
// type 字段决定卡片配色，与名称解耦，后台新增时只需传 type
// ============================================
const agentThemes: Record<string, {
  gradientClass: string
  iconFallback: React.ReactNode
  accentHex: string
}> = {
  bazi: {
    gradientClass: "agent-gradient-warm",
    iconFallback: <svg viewBox="0 0 24 24" className="w-7 h-7 text-white/90" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
    accentHex: "#E8A44A",
  },
  ziwei: {
    gradientClass: "agent-gradient-cool",
    iconFallback: <Star className="w-7 h-7 text-white/90" />,
    accentHex: "#7B9ED9",
  },
  fengshui: {
    gradientClass: "agent-gradient-earth",
    iconFallback: <Wind className="w-7 h-7 text-white/90" />,
    accentHex: "#6BAF8A",
  },
  naming: {
    gradientClass: "agent-gradient-sky",
    iconFallback: <Zap className="w-7 h-7 text-white/90" />,
    accentHex: "#5BA8C8",
  },
  general: {
    gradientClass: "agent-gradient-warm",
    iconFallback: <Bot className="w-7 h-7 text-white/90" />,
    accentHex: "#C9A96E",
  },
}

// 智能体数据 - 后台只需传 name/desc/intro/avatar/type 即可自动渲染
const agents = [
  { id: 1, name: "八字大师",  desc: "精准解读四柱八字",   intro: "一键生成专业命理分析报告", type: "bazi",     avatar: "",  online: true, users: "12.8万", isHot: true  },
  { id: 2, name: "紫微顾问",  desc: "紫微斗数命盘分析",   intro: "AI解读十二宫位运势密码",   type: "ziwei",    avatar: "",  online: true, users: "8.5万",  isHot: true  },
  { id: 3, name: "风水先生",  desc: "居家办公风水布局",   intro: "上传户型图一键诊断吉凶",   type: "fengshui", avatar: "",  online: true, users: "6.2万",  isHot: false },
  { id: 4, name: "起名助手",  desc: "姓名五行吉凶分析",   intro: "输入生辰智能推荐好名",     type: "naming",   avatar: "",  online: true, users: "9.8万",  isHot: false },
]

// ============================================
// 类型角标配置
// ============================================
const typeConfig: Record<string, { label: string; bg: string }> = {
  live:       { label: "直播",    bg: "bg-[#C41E3A]/90" },   // 品红 - 紧迫感/直播专属
  article:    { label: "文章",    bg: "bg-[#6B5B9E]/90" },   // 藤紫 - 文字/内容
  post:       { label: "帖子",    bg: "bg-[#3D7A5C]/90" },   // 苔绿 - 社区/自然
  course:     { label: "课程",    bg: "bg-[#A0621A]/90" },   // 琥珀金 - 学习/收获
  product:    { label: "好物",    bg: "bg-[#8B2E2E]/90" },   // 栗红 - 商品/质感
  video:      { label: "视频",    bg: "bg-[#1E5A8A]/90" },   // 深靛蓝 - 影像/科技
  circle:     { label: "圈子",    bg: "bg-[#5A3E6B]/90" },   // 紫棕 - 圈层/社群
  ebook:      { label: "电子书",  bg: "bg-[#2E6B8A]/90" },   // 深青蓝 - 阅读/知识
  poem:       { label: "诗词",    bg: "bg-[#7A5A20]/90" },   // 古金 - 传统/诗意
  poem_daily: { label: "每日一首", bg: "bg-[#7A5A20]/90" },  // 古金 - 传统/诗意
}

// ============================================
// 封面比例规则：
//   3:4  竖版 → aspect-[3/4]
//   16:9 横版 → aspect-video（完整展示，卡片自然变矮，不裁切）
//   4:3  圈子 → aspect-[4/3]（圈子卡片专用）
//   其余  → aspect-[3/4]（默认竖版）
// ============================================
type CoverRatio = "3:4" | "16:9" | "4:3" | "1:1"
function getCoverAspectClass(coverRatio?: string): string {
  if (coverRatio === "16:9") return "aspect-video"
  if (coverRatio === "4:3")  return "aspect-[4/3]"
  if (coverRatio === "1:1")  return "aspect-square"
  return "aspect-[3/4]"
}

// ============================================
// 通用图片组件 - 带占位骨架
// naturalWidth/naturalHeight 自动检测真实比例
// ============================================
function CoverImage({ src, alt, className, onNaturalRatio }: {
  src?: string | null
  alt: string
  className?: string
  onNaturalRatio?: (ratio: string) => void
}) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  if (!src || error) {
    return (
      <div className={cn("absolute inset-0 bg-gradient-to-br from-[#F2EFEA] to-[#EAE5DC] flex items-center justify-center", className)}>
        <BookOpen className="w-8 h-8 text-[#C9A96E]/40" />
      </div>
    )
  }

  return (
    <>
      {!loaded && <div className="absolute inset-0 bg-[#F2EFEA] animate-pulse" />}
      <img
        src={src}
        alt={alt}
        className={cn("absolute inset-0 w-full h-full object-cover transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0")}
        loading="lazy"
        onLoad={(e) => {
          setLoaded(true)
          if (onNaturalRatio) {
            const img = e.currentTarget
            const w = img.naturalWidth
            const h = img.naturalHeight
            if (w && h) {
              const r = w / h
              // 自动归类：宽屏(>1.5)→16:9 方图(0.85-1.15)→1:1 竖图(<0.85)→3:4
              onNaturalRatio(r > 1.5 ? "16:9" : r > 0.85 ? "1:1" : "3:4")
            }
          }
        }}
        onError={() => setError(true)}
      />
    </>
  )
}

// ============================================
// 类型角标
// ============================================
function TypeBadge({ type }: { type: string }) {
  const cfg = typeConfig[type]
  if (!cfg) return null
  return (
    <span className={cn("absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full text-white/95 font-medium tracking-wide backdrop-blur-md", cfg.bg)}>
      {cfg.label}
    </span>
  )
}

// ============================================
// 骨架屏 - 精确���配瀑布流形状
// ============================================
function FeedSkeleton() {
  const col1 = ["aspect-[3/4]", "aspect-video", "aspect-[3/4]"]
  const col2 = ["aspect-video", "aspect-[3/4]", "aspect-[4/5]"]
  const SkeletonCard = ({ aspectClass }: { aspectClass: string }) => (
    <div className="mb-[6px] sm:mb-[8px] break-inside-avoid">
      <div className="bg-[var(--surface)] rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
        <div className={cn("bg-[var(--surface-sunken)] animate-pulse", aspectClass)} />
        <div className="p-2.5 space-y-2">
          <div className="h-3.5 bg-[var(--surface-sunken)] rounded animate-pulse w-full" />
          <div className="h-3.5 bg-[var(--surface-sunken)] rounded animate-pulse w-3/4" />
          <div className="h-3 bg-[var(--surface-sunken)] rounded animate-pulse w-1/2" />
        </div>
      </div>
    </div>
  )
  return (
    <div className="px-[5px] sm:px-3">
      <div className="mb-[6px] sm:mb-[8px]">
        <div className="bg-[var(--surface)] rounded-2xl h-20 animate-pulse shadow-[0_2px_12px_rgba(0,0,0,0.04)]" />
      </div>
      <div className="flex gap-[6px] sm:gap-2">
        <div className="flex-1 space-y-0">{col1.map((a, i) => <SkeletonCard key={i} aspectClass={a} />)}</div>
        <div className="flex-1 space-y-0">{col2.map((a, i) => <SkeletonCard key={i} aspectClass={a} />)}</div>
      </div>
    </div>
  )
}

// ============================================
// 下拉刷新指示器 - 太极旋转动画
// ============================================
function PullRefreshIndicator({ isRefreshing }: { isRefreshing: boolean }) {
  if (!isRefreshing) return null
  return (
    <div className="fixed top-[88px] inset-x-0 z-30 flex items-center justify-center py-3">
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--surface)] shadow-[0_2px_12px_rgba(0,0,0,0.10)]">
        <svg viewBox="0 0 24 24" className="w-5 h-5 taiji-rotate-fast">
          <circle cx="12" cy="12" r="10" stroke="#C9A96E" strokeWidth="1.5" fill="none" />
          <path d="M12 2 A5 5 0 0 1 12 12 A5 5 0 0 0 12 22 A10 10 0 0 1 12 2" fill="#C9A96E" />
          <circle cx="12" cy="7" r="1.5" fill="#FAF8F5" />
          <circle cx="12" cy="17" r="1.5" fill="#C9A96E" />
        </svg>
        <span className="text-[13px] text-[var(--text-soft)]">正在刷新...</span>
      </div>
    </div>
  )
}

// ============================================
// 1. 通用视觉卡片 - 课程/商品/直播(竖)/视频/电子书
//    coverRatio 决定封面高度：3:4 竖版 | 16:9 横版（完整展示不裁切）
// ============================================
function VisualCard({ item, onLike, isLiked }: {
  item: typeof feedItems[0]
  onLike?: (id: number, e: React.MouseEvent) => void
  isLiked?: boolean
}) {
  // 允许图片加载后用自然尺寸覆盖 coverRatio 字段
  const [detectedRatio, setDetectedRatio] = useState<string | undefined>(undefined)
  const effectiveRatio = detectedRatio ?? item.coverRatio

  const href = item.type === "live"    ? `/live/${item.id}`
             : item.type === "course"  ? `/course/${item.id}`
             : item.type === "video"   ? `/video/${item.id}`
             : item.type === "ebook"   ? `/ebook/${item.id}`
             : item.type === "product" ? `/mall/product/${item.id}`
             : `/articles/${item.id}`

  const isLiveNow = item.type === "live" && item.isLive
  const coverAspect = getCoverAspectClass(effectiveRatio)

  return (
    <Link href={href} className="block mb-[6px] sm:mb-2 break-inside-avoid">
      <article className={cn(
        "overflow-hidden bg-[var(--surface)] rounded-2xl transition-all duration-300",
        "shadow-[0_1px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.10)]",
        "active:scale-[0.98] card-press",
        isLiveNow && "ring-1 ring-[var(--brand)]/40 live-card-glow"
      )}>
        {/* 封面区 */}
        <div className={cn("relative overflow-hidden bg-[var(--surface-sunken)]", coverAspect)}>
          <CoverImage src={item.cover} alt={item.title || ""} onNaturalRatio={setDetectedRatio} />
          <TypeBadge type={item.type} />

          {/* 直播中呼吸灯 - 1.5s周期 */}
          {isLiveNow && (
            <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[var(--brand)] text-white text-[9px] live-indicator">
              <span className="w-1.5 h-1.5 bg-white rounded-full" aria-hidden="true" />直播中
            </div>
          )}
          {/* 直播预约时间 */}
          {item.type === "live" && !item.isLive && item.time && (
            <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[var(--info)] text-white text-[9px]">
              <Clock className="w-2.5 h-2.5" aria-hidden="true" />{item.time}
            </div>
          )}
          {/* 商品标签 */}
          {item.type === "product" && item.tag && (
            <span className={cn(
              "absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full font-medium",
              item.tag === "秒杀" ? "bg-[var(--danger)] text-white"
              : item.tag === "热销" ? "bg-[var(--brand)] text-white"
              : "bg-black/35 backdrop-blur-md text-white/95"
            )}>{item.tag}</span>
          )}
          {/* 视频播放图标 + 右下角时长 */}
          {item.type === "video" && (
            <>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                  <Play className="w-5 h-5 text-white fill-white ml-0.5" aria-hidden="true" />
                </div>
              </div>
              <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-[4px] bg-black/60 text-white text-[9px] font-mono">{item.duration}</div>
            </>
          )}
          {/* 直播观看/预约数 */}
          {item.type === "live" && (
            <div className="absolute bottom-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-[4px] bg-black/50 text-white text-[9px]">
              <Eye className="w-2.5 h-2.5" aria-hidden="true" />
              <AnimatedNumber value={item.isLive ? (item.viewers ?? 0) : (item.reservations ?? 0)} />
            </div>
          )}
          {/* 电子书：价格或会员免费角标 */}
          {item.type === "ebook" && (
            <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-[4px] bg-[#4A7FA5]/90 text-white text-[9px] font-medium">
              {item.price ? `¥${item.price}` : "会员免费"}
            </div>
          )}
        </div>

        {/* 信息区 */}
        <div className="p-2.5">
          <h3 className="text-[14px] font-medium text-[var(--text-strong)] line-clamp-2 leading-[1.5] mb-1.5 tracking-[0.01em]">
            {item.title}
          </h3>
          {(item.type === "course" || item.type === "product") && (
            <div className="flex items-baseline gap-1.5 mb-1.5">
              <span className="text-[16px] font-bold text-[var(--brand)] font-mono">¥{item.price}</span>
              {item.originalPrice && (
                <span className="text-[11px] text-[var(--text-soft)] line-through">¥{item.originalPrice}</span>
              )}
            </div>
          )}
          {item.type === "ebook" && (
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[15px] font-bold text-[#4A7FA5] font-mono">
                {item.price ? `¥${item.price}` : "免费"}
              </span>
              <span className="text-[11px] text-[var(--text-soft)] flex items-center gap-0.5">
                <Eye className="w-3 h-3" aria-hidden="true" /><AnimatedNumber value={item.readers ?? 0} />人读过
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            {(item.type === "course" || item.type === "product") ? (
              <span className="text-[11px] text-[var(--text)]">
                {item.type === "course"
                  ? <><AnimatedNumber value={item.students ?? 0} />人已学</>
                  : <>已售<AnimatedNumber value={item.sales ?? 0} /></>}
              </span>
            ) : (
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-full bg-[var(--text-soft)]/20 flex items-center justify-center overflow-hidden">
                  <span className="text-[8px] text-[var(--text)]">{(item.authorAvatar || item.author || "").charAt(0)}</span>
                </div>
                <span className="text-[11px] text-[var(--text)] truncate max-w-[68px]">{item.author}</span>
              </div>
            )}
            {item.type === "video" && (
              <button
                onClick={(e) => { e.preventDefault(); onLike?.(item.id, e) }}
                aria-label={isLiked ? "取消点赞" : "点赞"}
                className="flex items-center gap-0.5 text-[11px] text-[var(--text-soft)] transition-colors"
              >
                <Heart className={cn("w-3.5 h-3.5 transition-colors", isLiked ? "fill-[var(--brand)] text-[var(--brand)]" : "")} aria-hidden="true" />
                {(item.likes ?? 0) + (isLiked ? 1 : 0)}
              </button>
            )}
            {item.type === "ebook" && (
              <span className="text-[11px] text-[#92715A] font-medium">{item.author}</span>
            )}
          </div>
        </div>
      </article>
    </Link>
  )
}

// ============================================
// 2. 文章卡片 - 竖版封面(3:4) 或 横版封面(16:9，完整展示变矮)
// ============================================
function ArticleCard({ item }: { item: typeof feedItems[0] }) {
  const [detectedRatio, setDetectedRatio] = useState<string | undefined>(undefined)
  const effectiveRatio = detectedRatio ?? item.coverRatio
  const isHorizontal = effectiveRatio === "16:9"
  const coverAspect = isHorizontal ? "aspect-video" : "aspect-[3/4]"

  return (
    <Link href={`/articles/${item.id}`} className="block mb-[6px] sm:mb-2 break-inside-avoid">
      <article className="overflow-hidden bg-[var(--surface)] rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.10)] transition-all duration-300 active:scale-[0.98] card-press">
        {item.cover && (
          <div className={cn("relative overflow-hidden bg-[var(--surface-sunken)]", coverAspect)}>
          <CoverImage src={item.cover} alt={item.title || ""} onNaturalRatio={setDetectedRatio} />
            <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-[#6B5B9E]/90 backdrop-blur-md text-white font-medium">文章</span>
          </div>
        )}
        <div className="p-2.5">
          <h3 className={cn(
            "font-bold text-[var(--text-strong)] line-clamp-2 leading-snug mb-1.5 font-serif",
            isHorizontal ? "text-[15px]" : "text-[14px]",
            !item.cover && "text-[15px]"
          )}>{item.title}</h3>
          {item.excerpt && (
            <p className={cn(
              "text-[12px] text-[var(--text)] leading-relaxed mb-2",
              isHorizontal ? "line-clamp-3" : "line-clamp-2",
              !item.cover && "line-clamp-4"
            )}>{item.excerpt}</p>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded-full bg-[var(--text-soft)]/20 flex items-center justify-center">
                <span className="text-[8px] text-[var(--text)]">{(item.authorAvatar || item.author || "").charAt(0)}</span>
              </div>
              <span className="text-[11px] text-[var(--text)]">{item.author}</span>
            </div>
            <span className="text-[11px] text-[var(--text-soft)] flex items-center gap-0.5">
              <Heart className="w-3 h-3" aria-hidden="true" />{item.likes}
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}

// ============================================
// 3. 纯文字卡片 - 无封面，内边距24rpx(p-3)
// ============================================
function TextOnlyCard({ item }: { item: typeof feedItems[0] }) {
  const href = item.type === "article" ? `/articles/${item.id}` : `/post/${item.id}`
  const cfg = typeConfig[item.type] ?? { label: "文章", bg: "bg-[var(--info)]" }
  return (
    <Link href={href} className="block mb-[6px] sm:mb-2 break-inside-avoid">
      <article className="overflow-hidden bg-[var(--surface)] rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.10)] transition-all duration-300 active:scale-[0.98] card-press">
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className={cn("text-[9px] px-1.5 py-0.5 rounded-[4px] text-white font-medium", cfg.bg)}>{cfg.label}</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded-full bg-[var(--text-soft)]/20 flex items-center justify-center">
                <span className="text-[8px] text-[var(--text)]">{(item.authorAvatar || item.author || "").charAt(0)}</span>
              </div>
              <span className="text-[11px] text-[var(--text)] truncate max-w-[56px]">{item.author}</span>
            </div>
          </div>
          <h3 className="text-[15px] font-bold text-[var(--text-strong)] line-clamp-3 leading-snug mb-1.5 font-serif tracking-[0.01em]">{item.title}</h3>
          {(item.excerpt || item.content) && (
            <p className="text-[13px] text-[var(--text)] line-clamp-5 leading-[1.75] mb-2.5">{item.excerpt || item.content}</p>
          )}
          <div className="flex items-center gap-4 pt-2 border-t border-[var(--line)]/60">
            <span className="flex items-center gap-1 text-[11px] text-[var(--text-soft)]">
              <Heart className="w-3 h-3" aria-hidden="true" />{item.likes}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-[var(--text-soft)]">
              <MessageCircle className="w-3 h-3" aria-hidden="true" />{item.comments}
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}

// ============================================
// 4. 智能体卡片
//    - 头像区：优先显示 avatar 图片，无图降级为 SVG 图标+呼吸光效
//    - 颜色模板：由 type 字段决定（bazi/ziwei/fengshui/naming/general）
//    - 后台新增：只需传 name/desc/intro/avatar/type，自动匹配模板
// ============================================
function AgentCard({ agent }: { agent: typeof agents[0] }) {
  const theme = agentThemes[agent.type] ?? agentThemes.general
  const [avatarError, setAvatarError] = useState(false)
  const showAvatar = !!agent.avatar && !avatarError

  return (
    <Link href={`/agent/${agent.id}`} className="block mb-[6px] sm:mb-2 break-inside-avoid">
      <article className="overflow-hidden bg-[var(--surface)] rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.10)] transition-all duration-300 active:scale-[0.98] card-press">
        {/* 渐变封面 - 4:5 比例 */}
        <div className={cn(
          "relative aspect-[4/5] flex flex-col items-center justify-center overflow-hidden gradient-flow px-3",
          theme.gradientClass
        )}>
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-black/20" />

          {/* AI角标 */}
          <span className="absolute top-2 left-2 flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-[4px] bg-violet-500 text-white font-medium z-10">
            <Sparkles className="w-2.5 h-2.5" aria-hidden="true" />AI
          </span>
          {agent.isHot && (
            <span className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded-[4px] bg-[var(--brand)] text-white font-medium badge-flash z-10">HOT</span>
          )}

          {/* 头像区：有图用头像圆形，无图用图标+呼吸光效 */}
          <div className="relative z-10 flex flex-col items-center text-center">
            {showAvatar ? (
              <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-white/30 mb-2.5 agent-icon-glow">
                <img
                  src={agent.avatar}
                  alt={agent.name}
                  className="w-full h-full object-cover"
                  onError={() => setAvatarError(true)}
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2.5 agent-icon-glow border border-white/20">
                {theme.iconFallback}
              </div>
            )}
            <p className="text-[12px] text-white/90 line-clamp-2 leading-relaxed mb-2 font-medium px-1">{agent.intro}</p>
            {agent.online && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-online-glow" aria-hidden="true" />
                <span className="text-[9px] text-white">在线</span>
              </div>
            )}
          </div>
        </div>

        {/* 信息区 */}
        <div className="p-2.5">
          <h3 className="text-[14px] font-bold text-[var(--text-strong)]">{agent.name}</h3>
          <p className="text-[11px] text-[var(--text)] mt-0.5 line-clamp-1">{agent.desc}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] text-[var(--text-soft)]">{agent.users}人使用</span>
            <span className="text-[11px] text-white font-medium bg-violet-500 px-2.5 py-1 rounded-full hover:bg-violet-600 transition-colors">
              立即对话
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}

// ============================================
// 5. 排盘引导大卡 - 全宽，宣纸纹理+淡金边框（导出供 page.tsx 使用）
// ============================================
export function PaipanGuideCard() {
  return (
    <Link href="/paipan" className="block mb-[6px] sm:mb-2">
      <article
        className="overflow-hidden rounded-2xl transition-all duration-300 active:scale-[0.99] card-press relative"
        style={{
          background: "linear-gradient(135deg, #FAF3E8 0%, #FDF8F0 40%, #FAF3E8 100%)",
          border: "1px solid rgba(201,169,110,0.35)",
          boxShadow: "0 2px 16px rgba(201,169,110,0.15), 0 1px 4px rgba(0,0,0,0.04)",
        }}
      >
        {/* 宣纸纹理层 */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(139,100,50,0.3) 3px, rgba(139,100,50,0.3) 4px)" }}
          aria-hidden="true"
        />
        {/* 八卦背景装饰 */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-[0.06] pointer-events-none" aria-hidden="true">
          <svg viewBox="0 0 80 80" className="w-20 h-20">
            <circle cx="40" cy="40" r="36" stroke="#C9A96E" strokeWidth="1.5" fill="none" />
            <circle cx="40" cy="40" r="24" stroke="#C9A96E" strokeWidth="1" fill="none" />
            <circle cx="40" cy="40" r="12" stroke="#C9A96E" strokeWidth="1" fill="none" />
            {[0,45,90,135,180,225,270,315].map(deg => (
              <line key={deg}
                x1={40 + 12 * Math.cos(deg * Math.PI / 180)} y1={40 + 12 * Math.sin(deg * Math.PI / 180)}
                x2={40 + 36 * Math.cos(deg * Math.PI / 180)} y2={40 + 36 * Math.sin(deg * Math.PI / 180)}
                stroke="#C9A96E" strokeWidth="0.8"
              />
            ))}
          </svg>
        </div>
        <div className="relative px-4 py-3.5 flex items-center gap-4">
          {/* 太极旋转图标容器 */}
          <div className="relative w-[52px] h-[52px] rounded-2xl flex items-center justify-center flex-shrink-0 gold-glow"
            style={{ background: "linear-gradient(135deg, #C9A96E, #B8985F)" }}>
            <svg viewBox="0 0 24 24" className="w-8 h-8 taiji-rotate" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="#FAF8F5" strokeWidth="1" fill="none" />
              <path d="M12 2 A5 5 0 0 1 12 12 A5 5 0 0 0 12 22 A10 10 0 0 1 12 2" fill="#FAF8F5" />
              <circle cx="12" cy="7" r="1.5" fill="#C9A96E" />
              <circle cx="12" cy="17" r="1.5" fill="#FAF8F5" />
            </svg>
          </div>
          {/* 文案区 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-serif font-bold text-[17px] text-[var(--text-strong)] tracking-[0.02em]">排盘工具</h3>
              <span className="px-1.5 py-0.5 rounded-[4px] bg-[var(--brand)]/10 text-[var(--brand)] text-[9px] font-medium">免费使用</span>
            </div>
            <p className="text-[12px] text-[var(--text)] mb-2">易学工具大全，算法精准，功能全面</p>
            <div className="flex items-center gap-1.5">
              {["八字", "紫微", "六爻", "奇门"].map(t => (
                <span key={t} className="px-2 py-0.5 rounded-full bg-white/70 text-[10px] text-[var(--gold)] border border-[var(--gold)]/25 font-medium">{t}</span>
              ))}
            </div>
          </div>
          {/* CTA 按钮 */}
          <div className="flex items-center gap-1 px-3.5 py-2 rounded-full text-white text-[13px] font-medium flex-shrink-0 btn-shimmer"
            style={{ background: "var(--brand)", boxShadow: "0 3px 12px rgba(196,30,58,0.25)" }}>
            立即体验<ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          </div>
        </div>
      </article>
    </Link>
  )
}

// ============================================
// 6. 营销/活动入口卡片 - 可配置，全宽（导出供 page.tsx 使用，可控显隐）
// ============================================
const marketingBanners = [
  {
    label: "限时优惠",
    title: "新人专属 · 首月免费",
    subtitle: "加入圈子，与万名命理爱好者共同成长",
    href: "/activity/new-user",
    bgFrom: "#C41E3A",
    bgTo: "#8B1228",
    accent: "rgba(255,220,180,0.95)",
  },
  {
    label: "精品课程",
    title: "八字精研班 · 开课倒计时",
    subtitle: "名师带教，系统掌握四柱命理核心",
    href: "/activity/bazi-class",
    bgFrom: "#7B4F12",
    bgTo: "#4A2E08",
    accent: "rgba(255,210,130,0.95)",
  },
  {
    label: "线下活动",
    title: "研学营 · 实地勘察风水",
    subtitle: "理论结合实践，深度感受山川气场",
    href: "/activity/study-camp",
    bgFrom: "#1A4A2E",
    bgTo: "#0D2E1A",
    accent: "rgba(180,230,180,0.95)",
  },
]

export function MarketingCard() {
  const [idx, setIdx] = useState(0)
  const banner = marketingBanners[idx]

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % marketingBanners.length), 5000)
    return () => clearInterval(t)
  }, [])

  return (
    <Link href={banner.href} className="block mb-[6px] sm:mb-2">
      <article
        className="overflow-hidden rounded-2xl transition-all duration-300 active:scale-[0.99] card-press relative"
        style={{
          background: `linear-gradient(135deg, ${banner.bgFrom} 0%, ${banner.bgTo} 100%)`,
          boxShadow: `0 4px 20px ${banner.bgFrom}40`,
        }}
      >
        <div className="relative px-4 py-3 flex items-center justify-between overflow-hidden">
          {/* 装饰圆 */}
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-[0.12]"
            style={{ background: banner.accent }} aria-hidden="true" />
          <div className="absolute -right-2 bottom-0 w-16 h-16 rounded-full opacity-[0.08]"
            style={{ background: banner.accent }} aria-hidden="true" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold text-[var(--brand)]"
                style={{ background: banner.accent }}>
                {banner.label}
              </span>
            </div>
            <h3 className="text-white font-bold text-[16px] font-serif tracking-wide">{banner.title}</h3>
            <p className="text-white/80 text-[12px] mt-0.5">{banner.subtitle}</p>
          </div>

          <div className="relative z-10 flex items-center gap-1 px-4 py-2 rounded-full text-[13px] font-bold flex-shrink-0"
            style={{ background: banner.accent, color: banner.bgTo }}>
            立即领取<ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          </div>
        </div>

        {/* 指示器 */}
        {marketingBanners.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1" aria-hidden="true">
            {marketingBanners.map((_, i) => (
              <span key={i} className={cn(
                "h-1 rounded-full transition-all duration-300",
                i === idx ? "w-4 bg-white" : "w-1.5 bg-white/40"
              )} />
            ))}
          </div>
        )}
      </article>
    </Link>
  )
}

// ============================================
// 每日一首 - 「古籍书页」风格
//   白色底 + 左侧金色书脊竖线 + 印章标签 + 竖排正文 + 细线署名区
// ============================================
function PoemDailyCard({ item }: { item: typeof feedItems[0] }) {
  return (
    <div className="mb-[6px] sm:mb-2 break-inside-avoid">
      <Link href={`/poetry/${item.id}`}>
        <article
          className="relative rounded-2xl overflow-hidden active:scale-[0.98] transition-transform duration-200 bg-[var(--surface)]"
          style={{
            boxShadow: "0 2px 16px rgba(201,169,110,0.12), 0 1px 4px rgba(0,0,0,0.04)",
            border: "1px solid rgba(201,169,110,0.20)",
          }}
        >
          {/* 左侧金色书脊 */}
          <div
            className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl"
            style={{ background: "linear-gradient(180deg, #E8C87A 0%, #C9A96E 50%, #B8985F 100%)" }}
            aria-hidden="true"
          />
          {/* 顶部轻纹理横条 */}
          <div
            className="absolute top-0 left-[3px] right-0 h-[2px]"
            style={{ background: "linear-gradient(90deg, rgba(201,169,110,0.4) 0%, rgba(201,169,110,0.08) 100%)" }}
            aria-hidden="true"
          />

          <div className="pl-4 pr-3.5 pt-3.5 pb-3">
            {/* 头部：印章标签 + 朝代作者 */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                {/* 印章风格标签 */}
                <span
                  className="text-[9px] px-2 py-0.5 rounded font-bold tracking-widest"
                  style={{
                    border: "1px solid rgba(196,30,58,0.50)",
                    color: "#C41E3A",
                    background: "rgba(196,30,58,0.04)",
                    letterSpacing: "0.2em",
                  }}
                >每日</span>
              </div>
              <span className="text-[10px] text-[var(--text-soft)] font-serif">
                〔{item.dynasty}〕{item.author}
              </span>
            </div>

            {/* 竖排诗句区 */}
            <div className="flex justify-center py-2">
              <div className="flex flex-row-reverse gap-4" style={{ minHeight: "80px" }}>
                {item.lines && (item.lines as string[]).map((line, i) => (
                  <p
                    key={i}
                    className="font-serif text-[15px] text-[var(--text-strong)]"
                    style={{ writingMode: "vertical-rl", letterSpacing: "0.3em", lineHeight: "1.9" }}
                  >
                    {line}
                  </p>
                ))}
              </div>
            </div>

            {/* 底部细线 + 标题 + 互动 */}
            <div
              className="flex items-center justify-between mt-3 pt-2.5"
              style={{ borderTop: "1px solid rgba(201,169,110,0.25)" }}
            >
              <span className="font-serif font-bold text-[14px] text-[var(--gold)] tracking-[0.05em]">
                {item.title}
              </span>
              <div className="flex items-center gap-1 text-[var(--text-soft)]">
                <Heart className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="text-[11px]">
                  {(item.likes ?? 0) >= 1000
                    ? `${((item.likes ?? 0) / 1000).toFixed(1)}k`
                    : item.likes}
                </span>
              </div>
            </div>
          </div>
        </article>
      </Link>
    </div>
  )
}

// ============================================
// 普通诗词推荐卡 - 「书签」风格
//   宣纸底色 + 顶部金色渐变横条(2px) + 竖向三段式布局 + 淡金边框
// ============================================
function PoemCard({ item }: { item: typeof feedItems[0] }) {
  return (
    <div className="mb-[6px] sm:mb-2 break-inside-avoid">
      <Link href={`/poetry/${item.id}`}>
        <article
          className="relative rounded-2xl overflow-hidden active:scale-[0.98] transition-transform duration-200"
          style={{
            background: "linear-gradient(160deg, #FDFAF4 0%, #FAF3E8 100%)",
            border: "1px solid rgba(201,169,110,0.22)",
            boxShadow: "0 1px 8px rgba(201,169,110,0.08)",
          }}
        >
          {/* 顶部金色渐变横条 - 书签感 */}
          <div
            className="h-[3px] w-full"
            style={{ background: "linear-gradient(90deg, #C9A96E 0%, #E8C87A 50%, rgba(201,169,110,0.2) 100%)" }}
            aria-hidden="true"
          />

          <div className="p-3.5">
            {/* 标题行：词牌/诗名 + 词体标签 */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-baseline gap-1.5 min-w-0">
                <span className="font-serif font-bold text-[15px] text-[var(--gold)] shrink-0">
                  {item.title}
                </span>
                <span className="text-[10px] text-[var(--text-soft)] font-serif truncate">
                  · {item.author}
                </span>
              </div>
              {item.form && (
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded shrink-0 font-medium"
                  style={{ background: "rgba(201,169,110,0.12)", color: "#92715A" }}
                >
                  {item.form}
                </span>
              )}
            </div>

            {/* 诗句预览 - 左侧竖线装饰 */}
            <p
              className="text-[13px] leading-[1.9] text-[var(--text)] line-clamp-3 italic font-serif"
              style={{ paddingLeft: "10px", borderLeft: "2px solid rgba(201,169,110,0.40)" }}
            >
              {item.preview}
            </p>

            {/* 底部：标签 + 互动 */}
            <div className="flex items-center justify-between mt-2.5">
              <div className="flex gap-1 flex-wrap">
                {item.tags && (item.tags as string[]).map((t) => (
                  <span
                    key={t}
                    className="text-[9px] px-1.5 py-0.5 rounded-full"
                    style={{ background: "rgba(201,169,110,0.10)", color: "#92715A" }}
                  >
                    {t}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-1 text-[var(--text-soft)] shrink-0">
                <Heart className="w-3 h-3" aria-hidden="true" />
                <span className="text-[10px]">
                  {(item.likes ?? 0) >= 1000
                    ? `${((item.likes ?? 0) / 1000).toFixed(1)}k`
                    : item.likes}
                </span>
              </div>
            </div>
          </div>
        </article>
      </Link>
    </div>
  )
}

// ============================================
// 错误态 - 带重试
// ============================================
function FeedError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8">
      <div className="w-16 h-16 rounded-full bg-[var(--surface-sunken)] flex items-center justify-center mb-4">
        <EyeOff className="w-7 h-7 text-[var(--text-soft)]" aria-hidden="true" />
      </div>
      <p className="text-[15px] font-serif text-[var(--text-strong)] mb-1">内容加载失败</p>
      <p className="text-[13px] text-[var(--text-soft)] mb-5 text-center">请检查网络后重试</p>
      <button onClick={onRetry} className="px-6 py-2 rounded-full bg-[var(--brand)] text-white text-[14px] font-medium">
        重新加载
      </button>
    </div>
  )
}

// ============================================
// 主组件
// ============================================
const masonryBreakpoints = {
  default: 4,
  1023: 3,
  767: 2,
}

export function HomeFeed() {
  const [liked, setLiked] = useState<Set<number>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [hidden, setHidden] = useState<Set<number>>(new Set())
  const [contextMenu, setContextMenu] = useState<{ id: number; x: number; y: number } | null>(null)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)

  // 模拟初始加载骨架屏
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 800)
    return () => clearTimeout(t)
  }, [])

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true)
    setIsError(false)
    setTimeout(() => setIsRefreshing(false), 1500)
  }, [])

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    setTimeout(() => {
      setLoadingMore(false)
      setHasMore(false) // 演示：加载一次后到底
    }, 1000)
  }, [loadingMore, hasMore])

  const toggleLike = (id: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setLiked(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  const handleLongPressStart = (id: number, e: React.TouchEvent | React.MouseEvent) => {
    const x = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    const y = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY
    longPressTimer.current = setTimeout(() => setContextMenu({ id, x, y }), 500)
  }
  const handleLongPressEnd = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
  }

  // 卡片路由选择器
  const renderCard = (item: typeof feedItems[0]) => {
    if (item.type === "poem_daily") return <PoemDailyCard key={item.id} item={item} />
    if (item.type === "poem")       return <PoemCard key={item.id} item={item} />
    if (!item.cover)                return <TextOnlyCard key={item.id} item={item} />
    if (item.type === "article")    return <ArticleCard key={item.id} item={item} />
    if (item.type === "circle") {
      const cd: CircleData = {
        id: item.id, name: item.circleName || "", cover: item.cover,
        description: item.content, highlight: item.content,
        members: item.members || 0, todayPosts: item.todayPosts, price: item.price || 0,
        owner: item.author || "", ownerAvatar: item.authorAvatar || "",
        ownerTitle: item.ownerTitle, isVerified: item.isVerified,
        tags: item.tags, rating: item.rating, recentJoiners: item.recentJoiners,
      }
      // 圈子跳转由 CircleCard 内部 <Link> 处理，外层不能再套 <Link>（避免嵌套 <a>）
      // CircleCard(masonry) 内部已跳转 /circles/${id}，预览逻辑通过 onJoin 回调处理
      return (
        <div key={item.id} className="mb-[6px] sm:mb-2 break-inside-avoid">
          <CircleCard
            circle={cd}
            variant="masonry"
            isJoined={!!item.isMember}
            onJoin={(id, e) => {
              e.preventDefault()
              if (item.isMember) {
                window.location.href = `/circle/${id}`
              } else {
                window.location.href = `/circles/${id}/preview`
              }
            }}
          />
        </div>
      )
    }
    return <VisualCard key={item.id} item={item} onLike={toggleLike} isLiked={liked.has(item.id)} />
  }

  // 构建瀑布流内容列表
  // 排盘大卡在第6位(pos=5)和第20位(pos=19)插入（全宽，在瀑布流外单独渲染）
  // 营销��在第13位(pos=12)插入
  // 每12个��片插入一个智能体卡片
  const buildItems = () => {
    const visible = feedItems.filter(it => !hidden.has(it.id))
    const result: React.ReactNode[] = []
    let feedIdx = 0
    let agentIdx = 0
    let pos = 0

    while (pos < 32) {
      // 每12个内容卡片插入一个智能体
      if (pos > 0 && pos % 12 === 0 && agentIdx < agents.length) {
        result.push(
          <AgentCard key={`agent-${agents[agentIdx].id}`} agent={agents[agentIdx]} />
        )
        agentIdx++
        pos++
        continue
      }
      if (feedIdx < visible.length) {
        const item = visible[feedIdx]
        result.push(
          <div
            key={item.id}
            onTouchStart={e => handleLongPressStart(item.id, e)}
            onTouchEnd={handleLongPressEnd}
            onTouchCancel={handleLongPressEnd}
            onMouseDown={e => handleLongPressStart(item.id, e)}
            onMouseUp={handleLongPressEnd}
            onMouseLeave={handleLongPressEnd}
          >
            {renderCard(item)}
          </div>
        )
        feedIdx++
      }
      pos++
    }
    return result
  }

  if (isLoading) return <FeedSkeleton />
  if (isError)   return <FeedError onRetry={handleRefresh} />

  const items = buildItems()

  return (
    <div
      className="bg-[var(--surface-base)] min-h-screen relative"
      onClick={() => setContextMenu(null)}
    >
      <PullRefreshIndicator isRefreshing={isRefreshing} />

      {/* 长按菜单 */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-[var(--surface)] rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.12)] border border-[var(--line)] overflow-hidden"
          style={{ left: Math.min(contextMenu.x, window.innerWidth - 150), top: contextMenu.y - 50 }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => { setHidden(p => new Set(p).add(contextMenu.id)); setContextMenu(null) }}
            className="flex items-center gap-2 px-4 py-3 text-[13px] text-[var(--text)] hover:bg-[var(--surface-sunken)] transition-colors w-full"
          >
            <EyeOff className="w-4 h-4 text-[var(--text-soft)]" aria-hidden="true" />
            不感兴趣
          </button>
        </div>
      )}

      {/* 单一连贯瀑布流 - 不分段，保证卡片排列连续整体 */}
      <div className="pb-24 px-[5px] sm:px-3">
        <Masonry breakpointCols={masonryBreakpoints} className="masonry-grid" columnClassName="masonry-grid-column">
          {items}
        </Masonry>

        {/* 加载更多 / 到底 */}
        <div className="py-6 text-center">
          {loadingMore ? (
            <div className="flex items-center justify-center gap-2 text-[13px] text-[var(--text-soft)]">
              <svg viewBox="0 0 24 24" className="w-4 h-4 taiji-rotate-fast" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="#C9A96E" strokeWidth="1.5" fill="none" />
                <path d="M12 2 A5 5 0 0 1 12 12 A5 5 0 0 0 12 22 A10 10 0 0 1 12 2" fill="#C9A96E" />
              </svg>
              正在加载更多精彩内容...
            </div>
          ) : hasMore ? (
            <button
              onClick={handleLoadMore}
              className="text-[13px] text-[var(--text-soft)] hover:text-[var(--text)] transition-colors py-2"
            >
              加载更多...
            </button>
          ) : (
            <div className="flex items-center justify-center gap-3 text-[13px] text-[var(--text-soft)]">
              <span className="w-10 h-px bg-[var(--line)]" aria-hidden="true" />
              已经到底了
              <span className="w-10 h-px bg-[var(--line)]" aria-hidden="true" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
