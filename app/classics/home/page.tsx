"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  ArrowLeft, Search, ChevronRight,
  Headphones, Play, ScrollText, BookOpen, Lightbulb, PenLine,
  Flame, Sparkles,
} from "lucide-react"
import { FlatCover, TypeFilter, coverColorForBook, type CoverColor } from "@/components/classics"

// 馆藏概览
const libraryStats = [
  { value: "12,860", label: "部典籍" },
  { value: "48", label: "门类" },
  { value: "1,200+", label: "白话译注" },
]

// 四库分类 - 苹果风彩色瓷砖
const categories = [
  { id: "jing", name: "经部", desc: "儒家经典", count: "3,210 部", icon: ScrollText, from: "#a06a38", to: "#7a4d22" },
  { id: "shi", name: "史部", desc: "历史典籍", count: "2,680 部", icon: BookOpen, from: "#3a6196", to: "#243f63" },
  { id: "zi", name: "子部", desc: "诸子百家", count: "4,150 部", icon: Lightbulb, from: "#3f8560", to: "#27543b" },
  { id: "ji", name: "集部", desc: "诗词文集", count: "2,820 部", icon: PenLine, from: "#9a4f6b", to: "#6e3147" },
]

// 今日导读 - App Store「今日」式大卡
const todayFeature = {
  id: "2",
  title: "道德经",
  author: "老子 · 春秋",
  coverColor: "brown" as CoverColor,
  tagline: "今日导读",
  quote: "道可道，非常道；名可名，非常名。",
  desc: "五千言道尽天地至理，读懂中国人的处世智慧。",
}

// 继续阅读
const lastReading = { id: "2", title: "道德经", author: "老子", progress: 68, coverColor: "brown" as CoverColor }
const weeklyMinutes = 127

// 专题书单
const bookLists = [
  { id: "1", title: "国学经典必读", desc: "入门必备，经典永流传", count: 12, color: "red" as CoverColor, books: [
    { title: "周易", color: "cream" as CoverColor }, { title: "论语", color: "brown" as CoverColor },
    { title: "道德经", color: "green" as CoverColor },
  ] },
  { id: "2", title: "命理入门书单", desc: "八字命理学习路径", count: 8, color: "blue" as CoverColor, books: [
    { title: "滴天髓", color: "gray" as CoverColor }, { title: "子平真诠", color: "blue" as CoverColor },
    { title: "穷通宝鉴", color: "brown" as CoverColor },
  ] },
  { id: "3", title: "道家养生典籍", desc: "修身养性，道法自然", count: 10, color: "green" as CoverColor, books: [
    { title: "道德经", color: "green" as CoverColor }, { title: "庄子", color: "cream" as CoverColor },
    { title: "抱朴子", color: "brown" as CoverColor },
  ] },
]

// 推荐榜
const rankingData = [
  { id: "1", title: "周易", author: "伏羲", dynasty: "周", desc: "群经之首，大道之源", reads: 128600, coverColor: "cream" as CoverColor },
  { id: "2", title: "道德经", author: "老子", dynasty: "春秋", desc: "道法自然，无为而治", reads: 145600, coverColor: "brown" as CoverColor },
  { id: "3", title: "黄帝内经", author: "佚名", dynasty: "战国", desc: "中医奠基，养生之本", reads: 98500, coverColor: "green" as CoverColor },
  { id: "4", title: "论语", author: "孔门", dynasty: "春秋", desc: "仁义礼智，修身齐家", reads: 156800, coverColor: "red" as CoverColor },
  { id: "5", title: "鬼谷子", author: "鬼谷子", dynasty: "战国", desc: "纵横捭阖，谋略奇书", reads: 76200, coverColor: "gray" as CoverColor },
]

// 听书
const audioBooks = [
  { id: "1", title: "金瓶梅", narrator: "专业主播", desc: "明代四大奇书之首", coverColor: "cream" as CoverColor },
  { id: "2", title: "山海经", narrator: "古籍朗读", desc: "上古奇书，神话之源", coverColor: "blue" as CoverColor },
  { id: "3", title: "聊斋志异", narrator: "学术讲解", desc: "鬼狐有性格，笑骂成文", coverColor: "brown" as CoverColor },
]

// 精选古籍
const featuredBooks = [
  { id: "1", title: "周易", author: "伏羲 · 周", desc: "群经之首，大道之源", isFree: true, coverColor: "cream" as CoverColor },
  { id: "5", title: "黄帝内经", author: "佚名 · 战国", desc: "中医学奠基之作", isFree: true, coverColor: "green" as CoverColor },
  { id: "3", title: "滴天髓", author: "刘基 · 明", desc: "八字命理经典", isFree: false, coverColor: "gray" as CoverColor },
  { id: "6", title: "论语", author: "孔门 · 春秋", desc: "儒家经典核心", isFree: true, coverColor: "red" as CoverColor },
]

function fmtReads(n: number) {
  return n >= 10000 ? `${(n / 10000).toFixed(1)}万` : `${n}`
}

function SectionHeader({ title, sub, href, linkText = "查看全部" }: { title: string; sub?: string; href: string; linkText?: string }) {
  return (
    <div className="flex items-end justify-between px-5 sm:px-6 mb-3.5">
      <div>
        <h2 className="text-[22px] sm:text-2xl font-bold tracking-tight text-foreground">{title}</h2>
        {sub ? <p className="text-[13px] text-muted-foreground mt-0.5">{sub}</p> : null}
      </div>
      <Link href={href} className="text-[13px] text-[#c41e3a] dark:text-amber-400 flex items-center font-medium flex-shrink-0">
        {linkText}<ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  )
}

export default function ClassicsHomePage() {
  const router = useRouter()
  const [activeType, setActiveType] = useState("all")
  const handleRefreshRanking = useCallback(() => {}, [])

  return (
    <div className="min-h-screen bg-[#f4f2ee] dark:bg-background pb-20 sm:pb-10">
      {/* 顶部导航 - 苹果式半透明 */}
      <header className="sticky top-0 z-50 bg-[#f4f2ee]/80 dark:bg-background/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-3 sm:px-6 h-12 sm:h-14 max-w-screen-xl mx-auto">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            aria-label="返回"
          >
            <ArrowLeft className="w-[22px] h-[22px] text-foreground" />
          </button>
          <h1 className="text-[17px] font-semibold tracking-tight text-foreground">古籍馆</h1>
          <Link
            href="/classics/search"
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            aria-label="搜索"
          >
            <Search className="w-[22px] h-[22px] text-foreground" />
          </Link>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto">
        {/* ===== Hero 大标题 ===== */}
        <section className="px-5 sm:px-6 pt-3 pb-5">
          <p className="text-[13px] font-semibold tracking-wide text-[#c41e3a] dark:text-amber-400 mb-1.5">中华典籍 · 经史子集</p>
          <h2 className="text-[40px] leading-[1.05] sm:text-6xl font-bold tracking-tight text-foreground text-balance">
            千年典籍，<br />尽收一馆
          </h2>
          {/* 规模数据 - 小字一行 */}
          <div className="mt-4 flex items-center gap-4 text-[13px] text-muted-foreground">
            {libraryStats.map((s, i) => (
              <span key={s.label} className="flex items-center gap-1.5">
                {i > 0 && <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />}
                <span className="font-semibold text-foreground tabular-nums">{s.value}</span>{s.label}
              </span>
            ))}
          </div>
        </section>

        {/* ===== 搜索栏 ===== */}
        <section className="px-5 sm:px-6 pb-4">
          <Link
            href="/classics/search"
            className="flex items-center gap-2.5 w-full h-11 px-4 rounded-2xl bg-card shadow-sm ring-1 ring-black/[0.04] dark:ring-white/5 active:scale-[0.99] transition-transform"
          >
            <Search className="w-[18px] h-[18px] text-muted-foreground" />
            <span className="text-[15px] text-muted-foreground">搜书名、作者、朝代或门类</span>
          </Link>
        </section>

        {/* ===== 今日导读 - App Store「今日」式大卡 ===== */}
        <section className="px-5 sm:px-6 pb-5">
          <Link href={`/classics/${todayFeature.id}`} className="block group">
            <div className="relative rounded-[28px] overflow-hidden shadow-lg ring-1 ring-black/5 active:scale-[0.99] transition-transform">
              {/* 渐变背景 */}
              <div className="absolute inset-0" style={{ background: "linear-gradient(155deg, #a06a38, #5f3a1a)" }} />
              <div className="relative p-6 sm:p-8 flex flex-col gap-5">
                <div>
                  <p className="text-[12px] font-semibold tracking-[0.2em] text-white/70 uppercase">{todayFeature.tagline}</p>
                  <p className="mt-3 font-serif text-2xl sm:text-3xl font-bold text-white leading-snug text-balance">
                    {todayFeature.quote}
                  </p>
                  <p className="mt-3 text-[14px] text-white/75 leading-relaxed max-w-sm">{todayFeature.desc}</p>
                </div>
                <div className="flex items-center gap-4">
                  <FlatCover
                    title={todayFeature.title}
                    label={todayFeature.author.split(" · ")[1]}
                    footer={todayFeature.author.split(" · ")[0]}
                    coverColor={coverColorForBook(todayFeature.title)}
                    className="w-[96px] flex-shrink-0 shadow-xl"
                    titleClassName="text-lg"
                  />
                  <div className="flex-1">
                    <p className="text-white font-semibold text-lg">{todayFeature.title}</p>
                    <p className="text-white/70 text-[13px] mt-0.5">{todayFeature.author}</p>
                    <span className="mt-3 inline-flex items-center gap-1.5 h-9 px-5 rounded-full bg-white text-[#6f4521] text-[14px] font-semibold shadow-sm">
                      <BookOpen className="w-4 h-4" />立即阅读
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </section>

        {/* ===== 继续阅读 - 纤细一条 ===== */}
        <section className="px-5 sm:px-6 pb-5">
          <Link href={`/classics/${lastReading.id}`} className="flex items-center gap-3 p-2.5 rounded-2xl bg-card shadow-sm ring-1 ring-black/[0.04] dark:ring-white/5 active:scale-[0.99] transition-transform">
            <FlatCover title={lastReading.title} coverColor={coverColorForBook(lastReading.title)} className="w-11 flex-shrink-0" titleClassName="text-[11px]" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted-foreground">继续阅读</p>
              <p className="text-[15px] font-semibold truncate text-foreground">{lastReading.title}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden max-w-[140px]">
                  <div className="h-full bg-[#c41e3a] dark:bg-amber-400 rounded-full" style={{ width: `${lastReading.progress}%` }} />
                </div>
                <span className="text-[11px] text-[#c41e3a] dark:text-amber-400 font-semibold tabular-nums">{lastReading.progress}%</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 pl-3 ml-1 border-l border-border flex-shrink-0">
              <Flame className="w-4 h-4 text-[#e0894a]" />
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground leading-none">本周</p>
                <p className="text-[13px] font-bold text-foreground tabular-nums leading-tight">{weeklyMinutes}<span className="font-normal text-muted-foreground text-[10px]">分</span></p>
              </div>
            </div>
          </Link>
        </section>

        {/* ===== 四库分类 - 彩色瓷砖 ===== */}
        <section className="px-5 sm:px-6 pb-6">
          <div className="grid grid-cols-2 gap-3">
            {categories.map((cat) => {
              const Icon = cat.icon
              return (
                <button
                  key={cat.id}
                  onClick={() => router.push(`/classics/category/${cat.id}`)}
                  className="relative h-[88px] rounded-3xl overflow-hidden p-4 flex flex-col justify-between text-left active:scale-[0.97] transition-transform shadow-sm ring-1 ring-black/5"
                  style={{ background: `linear-gradient(150deg, ${cat.from}, ${cat.to})` }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white font-bold text-lg tracking-wide">{cat.name}</span>
                    <Icon className="w-5 h-5 text-white/80" />
                  </div>
                  <div>
                    <p className="text-white/90 text-[12px] font-medium">{cat.desc}</p>
                    <p className="text-white/60 text-[11px] tabular-nums">{cat.count}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* ===== 经典书单 ===== */}
        <section className="pb-6">
          <SectionHeader title="经典书单" sub="名家精选，循路而读" href="/classics/lists" linkText="全部书单" />
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 px-5 sm:px-6">
            {bookLists.map((list) => (
              <Link key={list.id} href={`/classics/collection/${list.id}`} className="flex-shrink-0 w-[260px] group">
                <div className="rounded-3xl p-5 bg-card shadow-sm ring-1 ring-black/[0.04] dark:ring-white/5 active:scale-[0.99] transition-transform h-full">
                  <h3 className="font-bold text-[17px] text-foreground">{list.title}</h3>
                  <p className="text-[12px] text-muted-foreground mt-0.5 mb-4">{list.desc} · {list.count} 本</p>
                  <div className="flex items-end gap-2.5">
                    {list.books.map((b, i) => (
                      <FlatCover
                        key={i}
                        title={b.title}
                        coverColor={coverColorForBook(b.title)}
                        className="flex-1 transition-transform group-hover:-translate-y-0.5"
                        titleClassName="text-sm"
                      />
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ===== 推荐榜 - Apple Books 排行榜式清单 ===== */}
        <section className="pb-6">
          <SectionHeader title="推荐榜" sub="读者公认的传世经典" href="/classics/ranking" linkText="完整榜单" />
          <div className="px-5 sm:px-6 mb-3">
            <TypeFilter activeType={activeType} onTypeChange={setActiveType} />
          </div>
          <div className="px-5 sm:px-6">
            <div className="rounded-3xl bg-card shadow-sm ring-1 ring-black/[0.04] dark:ring-white/5 overflow-hidden">
              {rankingData.map((book, index) => (
                <Link
                  key={book.id}
                  href={`/classics/${book.id}`}
                  className={cn(
                    "flex items-center gap-3.5 p-3 active:bg-muted/50 transition-colors",
                    index > 0 && "border-t border-border/60",
                  )}
                >
                  <span className={cn(
                    "w-6 text-center font-bold text-lg tabular-nums flex-shrink-0",
                    index < 3 ? "text-[#c41e3a] dark:text-amber-400" : "text-muted-foreground",
                  )}>
                    {index + 1}
                  </span>
                  <FlatCover title={book.title} coverColor={coverColorForBook(book.title)} className="w-14 flex-shrink-0" titleClassName="text-xs" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[15px] text-foreground truncate">{book.title}</p>
                    <p className="text-[12px] text-muted-foreground truncate mt-0.5">{book.desc}</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">{book.author} · {book.dynasty} · {fmtReads(book.reads)}人读</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground/40 flex-shrink-0" />
                </Link>
              ))}
            </div>
            <button
              onClick={handleRefreshRanking}
              className="w-full mt-3 py-2.5 text-[14px] font-medium text-muted-foreground bg-card rounded-2xl shadow-sm ring-1 ring-black/[0.04] dark:ring-white/5 active:scale-[0.99] transition-transform"
            >
              换一批
            </button>
          </div>
        </section>

        {/* ===== 听书 ===== */}
        <section className="pb-6">
          <SectionHeader title="听书" sub="轻松听，不啃厚书" href="/classics/audiobooks" linkText="更多" />
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 px-5 sm:px-6">
            {audioBooks.map((book) => (
              <Link key={book.id} href={`/classics/audiobooks/${book.id}`} className="flex-shrink-0 w-[240px]">
                <div className="flex gap-3 p-3 bg-card rounded-2xl shadow-sm ring-1 ring-black/[0.04] dark:ring-white/5 active:scale-[0.99] transition-transform">
                  <FlatCover title={book.title} coverColor={coverColorForBook(book.title)} className="w-14 flex-shrink-0" titleClassName="text-xs" />
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div>
                      <h3 className="font-semibold text-[15px] text-foreground truncate">{book.title}</h3>
                      <p className="text-[12px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">{book.desc}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">{book.narrator}</span>
                      <span className="w-8 h-8 rounded-full bg-[#c41e3a] dark:bg-amber-500 flex items-center justify-center shadow-sm">
                        <Play className="w-3.5 h-3.5 text-white ml-0.5" fill="white" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ===== 精选古籍 ===== */}
        <section className="pb-6">
          <SectionHeader title="精选古籍" sub="编辑甄选，值得细读" href="/classics/lists" linkText="更多" />
          <div className="px-5 sm:px-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {featuredBooks.map((book) => (
              <Link key={book.id} href={`/classics/${book.id}`} className="flex gap-4 p-4 bg-card rounded-2xl shadow-sm ring-1 ring-black/[0.04] dark:ring-white/5 active:scale-[0.99] transition-transform">
                <FlatCover title={book.title} coverColor={coverColorForBook(book.title)} className="w-16 flex-shrink-0" titleClassName="text-sm" />
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-[16px] text-foreground">{book.title}</h3>
                      {book.isFree && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">免费</span>
                      )}
                    </div>
                    <p className="text-[12px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{book.desc}</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground/70">{book.author}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ===== 底部 AI 入口（仅引导，AI 辅助阅读在阅读器内） ===== */}
        <section className="px-5 sm:px-6 pb-4">
          <Link href="/classics/ai-assistant" className="flex items-center gap-3 p-4 rounded-2xl bg-card shadow-sm ring-1 ring-black/[0.04] dark:ring-white/5 active:scale-[0.99] transition-transform">
            <span className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(150deg, #c8324c, #9e1b30)" }}>
              <Sparkles className="w-5 h-5 text-white" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[15px] text-foreground">AI 国学助手</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">不懂就问，白话解读古籍疑难</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground/40" />
          </Link>
        </section>
      </main>
    </div>
  )
}
