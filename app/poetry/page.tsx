"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft, Search, Volume2, Heart, Bookmark,
  ChevronRight, Sparkles, Shuffle, Calendar,
  TrendingUp, User,
} from "lucide-react"
import Link from "next/link"

const todayPoem = {
  id: "1",
  title: "静夜思",
  author: "李白",
  dynasty: "唐",
  lines: ["床前明月光，", "疑是地上霜。", "举头望明月，", "低头思故乡。"],
  tags: ["思乡", "月亮"],
  likes: 12800,
}

const poems = [
  { id: "2",  title: "登鹳雀楼",    author: "王之涣", dynasty: "唐", form: "五言绝句", preview: "白日依山尽，黄河入海流", tags: ["哲理"], likes: 8900 },
  { id: "3",  title: "春晓",        author: "孟浩然", dynasty: "唐", form: "五言绝句", preview: "春眠不觉晓，处处闻啼鸟", tags: ["春天"], likes: 7600 },
  { id: "4",  title: "相思",        author: "王维",   dynasty: "唐", form: "五言绝句", preview: "红豆生南国，春来发几枝", tags: ["相思"], likes: 9200 },
  { id: "5",  title: "悯农",        author: "李绅",   dynasty: "唐", form: "五言绝句", preview: "锄禾日当午，汗滴禾下土", tags: ["劳动"], likes: 6800 },
  { id: "6",  title: "江雪",        author: "柳宗元", dynasty: "唐", form: "五言绝句", preview: "千山鸟飞绝，万径人踪灭", tags: ["冬天"], likes: 5400 },
  { id: "7",  title: "水调歌头",    author: "苏轼",   dynasty: "宋", form: "词",       preview: "明月几时有，把酒问青天", tags: ["中秋"], likes: 11200 },
  { id: "8",  title: "声声慢",      author: "李清照", dynasty: "宋", form: "词",       preview: "寻寻觅觅，冷冷清清", tags: ["愁绪"], likes: 8300 },
]

const dynastyTabs = ["全部", "唐", "宋", "元", "明", "清", "先秦"]

const poets = [
  { id: "1", name: "李白",   dynasty: "唐", poemCount: 1184, avatar: "李" },
  { id: "2", name: "杜甫",   dynasty: "唐", poemCount: 1455, avatar: "杜" },
  { id: "3", name: "白居易", dynasty: "唐", poemCount: 3840, avatar: "白" },
  { id: "4", name: "苏轼",   dynasty: "宋", poemCount: 3459, avatar: "苏" },
  { id: "5", name: "李清照", dynasty: "宋", poemCount: 84,   avatar: "李" },
]

export default function PoetryPage() {
  const [searchQuery, setSearchQuery]   = useState("")
  const [activeDynasty, setActiveDynasty] = useState("全部")
  const [isLiked, setIsLiked]           = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)

  const filtered = poems.filter(p =>
    (activeDynasty === "全部" || p.dynasty === activeDynasty) &&
    (!searchQuery || p.title.includes(searchQuery) || p.author.includes(searchQuery))
  )

  return (
    <div className="poem-page min-h-screen pb-10" style={{ color: "var(--poem-text)" }}>
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 backdrop-blur-md"
        style={{ background: "rgba(28, 18, 8, 0.92)", borderBottom: "1px solid var(--poem-border)" }}>
        <div className="flex items-center gap-3 px-4 h-14">
          <Link href="/" className="p-1.5 -ml-1.5 rounded-xl hover:bg-white/10 active:scale-95 transition-all">
            <ArrowLeft className="w-5 h-5" style={{ color: "var(--poem-text)" }} />
          </Link>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--poem-text-muted)" }} />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索诗词、诗人…"
              className="pl-9 pr-4 h-9 rounded-full text-sm border-0"
              style={{ background: "var(--poem-surface)", color: "var(--poem-text)" }}
            />
          </div>
          <Link href="/poetry/categories"
            className="p-1.5 -mr-1.5 rounded-xl hover:bg-white/10 transition-all" title="随机">
            <Shuffle className="w-5 h-5" style={{ color: "var(--poem-text-soft)" }} />
          </Link>
        </div>
      </header>

      <main className="px-4 pt-4 space-y-6">

        {/* 编辑式大标题 */}
        <section className="pb-1">
          <h1 className="text-[30px] leading-[1.1] font-serif font-bold tracking-tight text-balance" style={{ color: "var(--poem-gold)" }}>
            诗词雅集
          </h1>
          <p className="text-[14px] mt-1.5" style={{ color: "var(--poem-text-soft)" }}>品味千年风雅，与诗为友</p>
        </section>

        {/* 每日一首 —— 仪式感卡片 */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4" style={{ color: "var(--poem-gold)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--poem-gold)" }}>每日一首</span>
            <span className="text-xs" style={{ color: "var(--poem-text-muted)" }}>今日精选</span>
          </div>

          {/* 卡片：深色背景 + 竖排摘句 —— 区别于文章白底卡 */}
          <Link href={`/poetry/${todayPoem.id}`}>
            <div className="relative rounded-2xl overflow-hidden p-5"
              style={{
                background: "linear-gradient(135deg, #2e1f10 0%, #1c1208 60%, #241a0e 100%)",
                border: "1px solid var(--poem-gold-dim)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(232,192,122,0.15)",
              }}>
              {/* 装饰圆 */}
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(232,192,122,0.08) 0%, transparent 70%)" }} />

              <div className="flex items-stretch gap-5">
                {/* 竖排诗句摘录 */}
                <div className="poem-vertical text-[18px] font-serif shrink-0"
                  style={{ color: "var(--poem-text)", height: "112px", letterSpacing: "0.3em" }}>
                  {todayPoem.lines[0]}{todayPoem.lines[1]}
                </div>
                <div className="w-px shrink-0" style={{ background: "var(--poem-border)" }} />

                <div className="flex flex-col justify-between flex-1 min-w-0">
                  <div>
                    <h2 className="text-xl font-serif font-bold mb-1" style={{ color: "var(--poem-gold)" }}>
                      {todayPoem.title}
                    </h2>
                    <p className="text-sm" style={{ color: "var(--poem-text-soft)" }}>
                      〔{todayPoem.dynasty}〕{todayPoem.author}
                    </p>
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {todayPoem.tags.map(t => (
                        <span key={t} className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ background: "var(--poem-gold-soft)", color: "var(--poem-gold)" }}>{t}</span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-3">
                      <button onClick={(e) => { e.preventDefault(); setIsLiked(!isLiked) }}
                        className="flex items-center gap-1">
                        <Heart className={cn("w-4 h-4", isLiked ? "fill-[var(--poem-red)]" : "")}
                          style={{ color: isLiked ? "var(--poem-red)" : "var(--poem-text-muted)" }} />
                        <span className="text-xs" style={{ color: "var(--poem-text-muted)" }}>
                          {(todayPoem.likes / 1000).toFixed(1)}k
                        </span>
                      </button>
                      <button onClick={(e) => { e.preventDefault(); setIsBookmarked(!isBookmarked) }}>
                        <Bookmark className={cn("w-4 h-4", isBookmarked ? "fill-[var(--poem-gold)]" : "")}
                          style={{ color: isBookmarked ? "var(--poem-gold)" : "var(--poem-text-muted)" }} />
                      </button>
                      <Volume2 className="w-4 h-4" style={{ color: "var(--poem-text-muted)" }} />
                    </div>
                    <span className="text-xs flex items-center gap-0.5" style={{ color: "var(--poem-gold)" }}>
                      阅读全文 <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </section>

        {/* 朝代 Tab */}
        <section>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {dynastyTabs.map(d => (
              <button
                key={d}
                onClick={() => setActiveDynasty(d)}
                className="shrink-0 px-4 py-1.5 rounded-full text-sm transition-all"
                style={{
                  background: activeDynasty === d ? "var(--poem-gold)" : "var(--poem-surface)",
                  color: activeDynasty === d ? "var(--poem-bg)" : "var(--poem-text-soft)",
                  border: `1px solid ${activeDynasty === d ? "transparent" : "var(--poem-border)"}`,
                  fontWeight: activeDynasty === d ? 600 : 400,
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </section>

        {/* 著名诗人 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" style={{ color: "var(--poem-gold)" }} />
              <span className="font-medium text-sm" style={{ color: "var(--poem-text)" }}>著名诗人</span>
            </div>
            <Link href="/poetry/collections" className="text-xs flex items-center"
              style={{ color: "var(--poem-text-muted)" }}>
              更多 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {poets.map(poet => (
              <Link key={poet.id} href={`/poetry/poet/${poet.id}`} className="shrink-0">
                <div className="w-20 p-3 rounded-xl text-center transition-all hover:opacity-80"
                  style={{ background: "var(--poem-surface)", border: "1px solid var(--poem-border)" }}>
                  <div className="w-11 h-11 mx-auto rounded-full flex items-center justify-center mb-2"
                    style={{ background: "linear-gradient(135deg, var(--poem-gold-soft), var(--poem-ai-soft))" }}>
                    <span className="font-serif font-bold text-lg" style={{ color: "var(--poem-gold)" }}>
                      {poet.avatar}
                    </span>
                  </div>
                  <p className="text-sm font-medium" style={{ color: "var(--poem-text)" }}>{poet.name}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--poem-text-muted)" }}>
                    {poet.dynasty} · {poet.poemCount}首
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 热门诗词列表 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: "var(--poem-gold)" }} />
              <span className="font-medium text-sm" style={{ color: "var(--poem-text)" }}>热门诗词</span>
            </div>
            <Link href="/poetry/categories" className="text-xs flex items-center"
              style={{ color: "var(--poem-text-muted)" }}>
              分类浏览 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-2">
            {filtered.length > 0
                ? filtered.map((poem, idx) => (
                  <Link key={poem.id} href={`/poetry/${poem.id}`}>
                    <div className="flex items-center gap-3 p-3 rounded-xl transition-all hover:opacity-80"
                      style={{ background: "var(--poem-surface)", border: "1px solid var(--poem-border)" }}>
                      {/* 排名 */}
                      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0")}
                        style={{
                          background: idx < 3 ? "var(--poem-gold)" : "var(--poem-border)",
                          color: idx < 3 ? "var(--poem-bg)" : "var(--poem-text-muted)",
                        }}>
                        {idx + 1}
                      </div>
                      {/* 内容 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium" style={{ color: "var(--poem-text)" }}>{poem.title}</span>
                          <span className="text-[10px]" style={{ color: "var(--poem-text-muted)" }}>
                            〔{poem.dynasty}〕{poem.author}
                          </span>
                          {/* 诗词类型角标 */}
                          <span className="text-[9px] px-1.5 py-px rounded-full shrink-0"
                            style={{ background: "rgba(232,192,122,0.12)", color: "var(--poem-gold)" }}>
                            {poem.form}
                          </span>
                        </div>
                        <p className="text-xs truncate" style={{ color: "var(--poem-text-muted)" }}>{poem.preview}…</p>
                      </div>
                      {/* 点赞 */}
                      <div className="flex items-center gap-1 shrink-0" style={{ color: "var(--poem-text-muted)" }}>
                        <Heart className="w-3.5 h-3.5" />
                        <span className="text-xs">{(poem.likes / 1000).toFixed(1)}k</span>
                      </div>
                    </div>
                  </Link>
                ))
                : (
                  <div className="text-center py-12">
                    <p className="text-sm" style={{ color: "var(--poem-text-muted)" }}>暂无相关诗词</p>
                  </div>
                )
            }
          </div>
        </section>

        {/* AI 诗词创作入口 —— 低调，不破坏沉浸感 */}
        <section>
          <Link href="/publish?type=poem">
            <div className="flex items-center gap-3 p-4 rounded-xl transition-all hover:opacity-80"
              style={{ background: "var(--poem-ai-soft)", border: "1px solid rgba(155,126,200,0.2)" }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "rgba(155,126,200,0.25)" }}>
                <Sparkles className="w-4 h-4" style={{ color: "var(--poem-ai)" }} />
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium" style={{ color: "var(--poem-ai)" }}>AI 诗词创作辅助</span>
                <p className="text-xs mt-0.5" style={{ color: "var(--poem-text-muted)" }}>
                  输入主题，AI 生成草稿，你来润色
                </p>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "var(--poem-ai)" }} />
            </div>
          </Link>
        </section>

      </main>
    </div>
  )
}
