"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Masonry from "react-masonry-css"
import {
  Search, ShoppingBag, BookOpen, ScrollText,
  Play, Radio, TrendingUp, Flame, Bot, Users,
  Sparkles, ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { BottomNav } from "@/components/bottom-nav"
import {
  ProductCard, type ProductCardData,
  CourseCard, type CourseCardData,
  LiveCard, type LiveCardData,
  AgentCard, type AgentCardData,
  ClassicCard, type ClassicCardData,
  VideoCard, type VideoCardData,
} from "@/components/cards"

// ============================================
// 核心入口宫格 - 商业变现板块入口（高频在前）
// ============================================
const coreEntries = [
  { id: "course", icon: BookOpen, label: "课程", href: "/courses" },
  { id: "mall", icon: ShoppingBag, label: "商城", href: "/mall" },
  { id: "classics", icon: ScrollText, label: "古籍馆", href: "/classics/home" },
  { id: "agent", icon: Bot, label: "智能体广场", href: "/agents" },
  { id: "circles", icon: Users, label: "圈子广场", href: "/circles" },
  { id: "video", icon: Play, label: "视频", href: "/videos" },
  { id: "live", icon: Radio, label: "直播", href: "/live" },
  { id: "rank", icon: TrendingUp, label: "榜单", href: "/rankings" },
]

// ============================================
// 品类导航 - 10大内容品类（横向滑动）
// ============================================
const allCategory = { id: "all", label: "推荐" }
const categories = [
  { id: "classic", label: "经典" },
  { id: "poetry", label: "诗词" },
  { id: "mingli", label: "命理" },
  { id: "fengshui", label: "风水" },
  { id: "health", label: "养生" },
  { id: "martial", label: "武术" },
  { id: "tea", label: "茶道" },
  { id: "calligraphy", label: "书法" },
  { id: "painting", label: "国画" },
  { id: "music", label: "音乐" },
]

// ============================================
// 运营专栏 - 平台手动配置（横向滑动）
// ============================================
const columns = [
  { id: "best-courses", title: "精选好课", subtitle: "名师系统课程", count: 36, href: "/topic/精选好课", cover: "/discover/board-courses.png", accent: "#A0621A" },
  { id: "hot-products", title: "热门好物", subtitle: "开运法器精选", count: 128, href: "/topic/热门好物", cover: "/discover/board-products.png", accent: "#8B2E2E" },
  { id: "new-classics", title: "古籍新上", subtitle: "经典原著典藏", count: 24, href: "/topic/古籍新上", cover: "/discover/board-classics.png", accent: "#7A5A20" },
  { id: "rec-circles", title: "推荐圈子", subtitle: "同好交流社群", count: 52, href: "/topic/推荐圈子", cover: "/discover/board-circles.png", accent: "#5A3E6B" },
]

// ============================================
// 推荐内容流数据
// ============================================
type FeedItem =
  | { kind: "product"; data: ProductCardData }
  | { kind: "course"; data: CourseCardData }
  | { kind: "live"; data: LiveCardData }
  | { kind: "agent"; data: AgentCardData }
  | { kind: "classic"; data: ClassicCardData }
  | { kind: "video"; data: VideoCardData }

const feedItems: FeedItem[] = [
  { kind: "product", data: { id: "p1", title: "天然黑曜石貔貅手链 招财转运", cover: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400&q=80", coverRatio: "3:4", price: 128, originalPrice: 268, sales: 2600, tag: "热销" } },
  { kind: "agent", data: { id: "a1", name: "八字命理大师", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80", description: "精准分析四柱八字，解读事业财运婚姻", useCount: 128000, rating: 4.9, tag: "HOT" } },
  { kind: "course", data: { id: "c1", title: "紫微斗数入门到精通", cover: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&q=80", coverRatio: "1:1", teacher: "林道长", teacherAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80", price: 199, originalPrice: 399, students: 3200, lessons: 36, tag: "系统课" } },
  { kind: "live", data: { id: "l1", title: "八字实战：如何看婚姻宫", host: "易学张老师", hostAvatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&q=80", cover: "https://images.unsplash.com/photo-1557425493-6f90ae4659fc?w=400&q=80", coverRatio: "3:4", viewers: 13000, status: "live", liveType: "knowledge" } },
  { kind: "classic", data: { id: "b1", title: "渊海子平", author: "徐子平", dynasty: "宋", description: "命理学开山之作，八字预测必读经典", isFree: true, readers: 62000 } },
  { kind: "video", data: { id: "v1", title: "一分钟看懂你的命宫主星是什么", cover: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&q=80", coverRatio: "3:4", author: "紫微门人", plays: 286000, likes: 12000, duration: "01:23" } },
  { kind: "product", data: { id: "p2", title: "专业风水罗盘 纯铜精工", cover: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=400&q=80", coverRatio: "1:1", price: 298, originalPrice: 598, sales: 890, tag: "秒杀" } },
  { kind: "agent", data: { id: "a2", name: "周易占卜师", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80", description: "六爻起卦断事，趋吉避凶指引方向", useCount: 86000, rating: 4.8, tag: "精准" } },
  { kind: "course", data: { id: "c2", title: "风水堪舆实战班", cover: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80", coverRatio: "1:1", teacher: "王大师", teacherAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80", price: 299, originalPrice: 599, students: 1800, lessons: 48, tag: "TOP3" } },
  { kind: "classic", data: { id: "b2", title: "滴天髓", author: "刘伯温", dynasty: "明", description: "命理学巅峰之作，论命精髓尽在此书", hasAudio: true, readers: 45000 } },
  { kind: "live", data: { id: "l2", title: "开运水晶专场 限量秒杀", host: "福缘阁主", hostAvatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&q=80", cover: "https://images.unsplash.com/photo-1600721391689-2564bb8055de?w=400&q=80", coverRatio: "3:4", reservations: 328, status: "upcoming", scheduledTime: "今晚 20:00", liveType: "commerce" } },
  { kind: "video", data: { id: "v2", title: "客厅财位怎么找？三步定位法", cover: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=80", coverRatio: "1:1", author: "风水王老师", plays: 563000, likes: 38000, duration: "02:45" } },
  { kind: "product", data: { id: "p3", title: "开光五帝钱挂件 镇宅化煞", cover: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&q=80", coverRatio: "1:1", price: 58, originalPrice: 128, sales: 4500, tag: "新品" } },
  { kind: "course", data: { id: "c3", title: "六爻预测从零开始", cover: "https://images.unsplash.com/photo-1519791883288-dc8bd696e667?w=400&q=80", coverRatio: "3:4", teacher: "陈老师", teacherAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80", price: 128, originalPrice: 299, students: 1300, lessons: 24 } },
]

function renderFeedCard(item: FeedItem) {
  switch (item.kind) {
    case "product": return <ProductCard key={item.data.id} data={item.data} />
    case "course": return <CourseCard key={item.data.id} data={item.data} />
    case "live": return <LiveCard key={item.data.id} data={item.data} />
    case "agent": return <AgentCard key={item.data.id} data={item.data} context="discover" />
    case "classic": return <ClassicCard key={item.data.id} data={item.data} />
    case "video": return <VideoCard key={item.data.id} data={item.data} />
  }
}

const masonryBreakpoints = { default: 2, 1024: 2, 640: 2 }

// ============================================
// 骨架屏
// ============================================
function FeedSkeleton() {
  return (
    <div className="flex gap-[6px] px-[5px] sm:px-3">
      {[0, 1].map((col) => (
        <div key={col} className="flex-1 flex flex-col gap-[6px]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl bg-[var(--surface)] overflow-hidden">
              <div className={cn("bg-[var(--surface-sunken)] animate-pulse", i % 2 === 0 ? "aspect-[3/4]" : "aspect-square")} />
              <div className="p-2.5 space-y-2">
                <div className="h-3 bg-[var(--surface-sunken)] rounded animate-pulse" />
                <div className="h-3 w-2/3 bg-[var(--surface-sunken)] rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export default function DiscoverPage() {
  const [activeCategory, setActiveCategory] = useState("all")
  const [isLoading, setIsLoading] = useState(true)

  // 首次加载骨架屏
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 600)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="min-h-screen bg-[var(--surface-base)] pb-20">
      {/* ===== 顶部固定区：搜索栏 + 品类导航 ===== */}
      <div className="sticky top-0 z-30 bg-[var(--surface-base)]">
        {/* 搜索栏 - 跳转全局搜索中间页，带AI徽章 */}
        <div className="px-4 pt-12 pb-3">
          <Link href="/search" aria-label="AI搜索平台全部内容">
            <div className="flex items-center h-10 px-4 rounded-full bg-[var(--surface-sunken)] border border-[var(--line)]">
              <Search className="w-4 h-4 text-[var(--text-soft)] shrink-0" aria-hidden="true" />
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 mx-2 rounded-full bg-primary/15 shrink-0">
                <Sparkles className="w-2.5 h-2.5 text-primary" aria-hidden="true" />
                <span className="text-[9px] text-primary font-semibold leading-none">AI</span>
              </div>
              <span className="text-[13px] text-[var(--text-soft)] truncate">搜索课程、商品、古籍...</span>
            </div>
          </Link>

          {/* 热搜词 */}
          <div className="flex items-center gap-2 mt-3 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1 shrink-0">
              <Flame className="w-4 h-4 text-[var(--brand)]" aria-hidden="true" />
              <span className="text-xs text-[var(--text-soft)]">热搜</span>
            </div>
            {["八字入门", "紫微斗数", "风水罗盘", "开运水晶", "六爻占卜"].map((word, i) => (
              <Link
                key={word}
                href={`/search/result?keyword=${encodeURIComponent(word)}`}
                className={cn(
                  "shrink-0 px-3 py-1 rounded-full text-xs transition-colors",
                  i === 0
                    ? "bg-[var(--brand)]/10 text-[var(--brand)] font-medium"
                    : "bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-sunken)]"
                )}
              >
                {word}
              </Link>
            ))}
          </div>
        </div>

        {/* 品类导航 - 横向滑动，选中高亮 */}
        <div className="flex items-center gap-1 px-4 pb-2.5 overflow-x-auto no-scrollbar">
          {[allCategory, ...categories].map((cat) => {
            const active = activeCategory === cat.id
            const content = (
              <span
                className={cn(
                  "relative shrink-0 px-3 py-1.5 text-sm transition-colors whitespace-nowrap",
                  active ? "text-[var(--brand)] font-semibold" : "text-[var(--text)]"
                )}
              >
                {cat.label}
                {active && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-[var(--brand)]" aria-hidden="true" />
                )}
              </span>
            )
            // "推荐"为本页内筛选；其余品类跳转专栏聚合页
            return cat.id === "all" ? (
              <button key={cat.id} onClick={() => setActiveCategory("all")}>{content}</button>
            ) : (
              <Link key={cat.id} href={`/topic/${cat.label}`}>{content}</Link>
            )
          })}
        </div>
      </div>

      {/* ===== 核心入口宫格 ===== */}
      <div className="px-4 pt-4 pb-2">
        <div className="grid grid-cols-4 gap-x-2 gap-y-4">
          {coreEntries.map((entry) => (
            <Link key={entry.id} href={entry.href} className="flex flex-col items-center gap-1.5">
              <div className="w-12 h-12 rounded-2xl bg-[var(--brand)]/8 flex items-center justify-center">
                <entry.icon className="w-6 h-6 text-[var(--brand)]" aria-hidden="true" />
              </div>
              <span className="text-[11px] text-[var(--text-strong)] text-center leading-tight">{entry.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ===== 运营专栏 - 横向滑动 ===== */}
      <div className="pt-4">
        <div className="flex items-center justify-between px-4 mb-2.5">
          <h2 className="text-[15px] font-bold text-[var(--text-strong)]">精选专栏</h2>
          <Link href="/topic/全部专栏" className="flex items-center text-xs text-[var(--text-soft)]">
            更多 <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>
        <div className="flex gap-3 px-4 overflow-x-auto no-scrollbar pb-1">
          {columns.map((col) => (
            <Link key={col.id} href={col.href} className="shrink-0 w-[150px]">
              <article className="rounded-2xl overflow-hidden bg-[var(--surface)] shadow-[0_1px_8px_rgba(0,0,0,0.05)] active:scale-[0.98] transition-transform">
                <div className="relative aspect-[3/2] overflow-hidden">
                  <img src={col.cover || "/placeholder.svg"} alt={col.title} className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 40%, ${col.accent}E6 100%)` }} aria-hidden="true" />
                  <div className="absolute bottom-2 left-2.5 right-2.5">
                    <h3 className="text-white font-bold text-sm">{col.title}</h3>
                    <p className="text-white/85 text-[10px] mt-0.5">{col.subtitle}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between px-2.5 py-2">
                  <span className="text-[11px] text-[var(--text-soft)]">{col.count} 个内容</span>
                  <span className="text-[11px] text-[var(--brand)] font-medium">查看 ›</span>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </div>

      {/* ===== 推荐内容流 ===== */}
      <div className="pt-5">
        <div className="flex items-center gap-1.5 px-4 mb-2">
          <Sparkles className="w-4 h-4 text-[var(--brand)]" aria-hidden="true" />
          <h2 className="text-[15px] font-bold text-[var(--text-strong)]">为你推荐</h2>
        </div>
        {isLoading ? (
          <FeedSkeleton />
        ) : feedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <p className="text-sm text-[var(--text-soft)] mb-3">暂无推荐内容</p>
            <Link href="/" className="px-4 py-2 rounded-full bg-[var(--brand)] text-white text-sm">去首页逛逛</Link>
          </div>
        ) : (
          <div className="px-[5px] sm:px-3">
            <Masonry
              breakpointCols={masonryBreakpoints}
              className="masonry-grid"
              columnClassName="masonry-grid-column"
            >
              {feedItems.map(renderFeedCard)}
            </Masonry>
            <div className="flex items-center justify-center gap-3 py-6 text-[13px] text-[var(--text-soft)]">
              <span className="w-10 h-px bg-[var(--line)]" aria-hidden="true" />
              已经到底了
              <span className="w-10 h-px bg-[var(--line)]" aria-hidden="true" />
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
