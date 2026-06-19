"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft, Share2, Volume2, VolumeX,
  Heart, Bookmark, BookmarkCheck, Copy, Check,
  Sparkles, X, ChevronRight, RefreshCw,
  Image as ImageIcon, Download, Loader2, AlertCircle,
  MessageCircle,
} from "lucide-react"
import Link from "next/link"
import { CommentSheet, type ClassicComment } from "@/components/classics"

// 诗词品评强调色：深琥珀（配白字对比充足）
const POEM_ACCENT = "#a8741f"

// 诗词品评（示例）
const POEM_COMMENTS: ClassicComment[] = [
  {
    id: "p1", user: "明月客", time: "2天前", likes: 96, liked: false, chapter: "全诗品评",
    content: "二十字写尽天下游子心。最妙在『疑』字，半梦半醒间把月光错认成霜，那份恍惚正是思乡情最真实的模样。",
    replies: [
      { id: "p1r1", user: "归雁", content: "『疑是地上霜』这一『疑』，比直接写愁高明太多。", time: "1天前", likes: 14 },
      { id: "p1r2", user: "采薇", content: "李白的绝句就是这样，看似平淡，回味无穷。", time: "1天前", likes: 7 },
    ],
  },
  {
    id: "p2", user: "竹下听雨", time: "4天前", likes: 58, liked: false,
    content: "举头、低头两个动作，把思绪从天上拉回心里，短短十字完成了一次完整的情感起落，太见功力。",
    replies: [],
  },
  {
    id: "p3", user: "青莲居士迷", time: "1周前", likes: 33, liked: false, chapter: "字句探讨",
    content: "请教各位，『床』字到底作何解？有说是井栏，有说是坐具，有说是窗的通假，哪种更合理？",
    replies: [
      { id: "p3r1", user: "明月客", content: "我倾向井栏说，月夜立于井边望月更有画面感。", time: "6天前", likes: 11 },
    ],
  },
]

const poemDetail = {
  id: "1",
  title: "静夜思",
  author: "李白",
  authorId: "1",
  dynasty: "唐",
  form: "五言绝句",
  content: [
    { line: "床前明月光，", pinyin: "chuáng qián míng yuè guāng，" },
    { line: "疑是地上霜。", pinyin: "yí shì dì shàng shuāng。" },
    { line: "举头望明月，", pinyin: "jǔ tóu wàng míng yuè，" },
    { line: "低头思故乡。", pinyin: "dī tóu sī gù xiāng。" },
  ],
  translation: "明亮的月光洒在床前，好像地上泛起了一层霜。抬头望着天上的明月，低下头思念起远方的故乡。",
  appreciation: `这首诗写的是在寂静的月夜思念家乡的感受。

诗的前两句，是写诗人在作客他乡的特定环境中一刹那间所产生的错觉。一个独处他乡的人，白天奔波忙碌，倒还能冲淡离愁，然而一到夜深人静的时候，心头就难免泛起阵阵思念故乡的波澜。何况是在月明之夜，更何况是月色如霜的秋夜。

"疑"字生动地表达了诗人睡梦初醒，迷离恍惚中将照射在床前的清冷月光误作铺在地面的浓霜。"霜"字用得更妙，既形容了月光的皎洁，又表达了季节的寒冷，还烘托出诗人飘泊他乡的孤寂凄凉之情。

后两句通过动作神态的刻画，深化思乡之情。"举头望明月"把诗人的思绪由地上引向天上，由近处引向远处。"低头思故乡"是诗人完成从疑到望再到思这一系列心理活动的终点。`,
  aiAppreciation: `**创作背景**

此诗当作于唐玄宗开元十四年（726年），李白二十六岁时。是年秋，诗人离故乡赴长安求仕途，旅宿扬州旅舍，月夜难眠，感怀乡愁而作。

**意象分析**

- **月光如霜**：以"疑"字将月光与白霜并置，形成触觉（冷）与视觉（白）的通感，将静夜的凄清具象化
- **举头 / 低头**：两组对仗动作构成完整的心理弧线——由外物（月）引发内情（乡愁），以行为外化情感
- **故乡**：全诗至此才点出主旨，是蓄势后的情感爆发，留白与克制是李白绝句的典型风格

**情感解读**

全诗20字，无一字言"愁"，却字字含愁。李白用最简洁的笔墨完成了从"疑"到"望"再到"思"的完整情感旅程，是唐诗中"以少总多"手法的极致体现。`,
  notes: [
    { word: "床", note: "此指井栏，或作井边的围栏解。一说为窗的通假字。" },
    { word: "疑", note: "好像、似乎。" },
    { word: "举头", note: "抬头。" },
    { word: "思", note: "思念。" },
  ],
  authorInfo: {
    name: "李白",
    dynasty: "唐",
    years: "701-762",
    title: "诗仙",
    intro: "李白（701年—762年），字太白，号青莲居士，唐代伟大的浪漫主义诗人，被后人誉为\"诗仙\"。",
    poemCount: 1184,
  },
  relatedPoems: [
    { id: "2", title: "月下独酌", author: "李白", preview: "花间一壶酒，独酌无相亲..." },
    { id: "3", title: "望庐山瀑布", author: "李白", preview: "日照香炉生紫烟..." },
    { id: "4", title: "早发白帝城", author: "李白", preview: "朝辞白帝彩云间..." },
  ],
  tags: ["思乡", "月亮", "夜晚", "五言绝句"],
  likes: 12800,
  collections: 8900,
}

// AI赏析面板
function AiAppreciationPanel({
  onClose,
}: {
  onClose: () => void
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [displayed, setDisplayed] = useState("")
  const full = poemDetail.aiAppreciation

  const generate = () => {
    setStatus("loading")
    setDisplayed("")
    let i = 0
    const timer = setInterval(() => {
      i += 3
      setDisplayed(full.slice(0, i))
      if (i >= full.length) {
        clearInterval(timer)
        setStatus("done")
      }
    }, 30)
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col">
      {/* 半透明背景 */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      {/* 面板 */}
      <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] rounded-t-2xl flex flex-col overflow-hidden animate-slide-up"
        style={{ background: "var(--poem-surface)", borderTop: "1px solid var(--poem-border)" }}>
        {/* 面板头 */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--poem-border)" }}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: "var(--poem-ai)" }} />
            <span className="font-medium text-[15px]" style={{ color: "var(--poem-text)" }}>AI 深度赏析</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ background: "var(--poem-ai-soft)", color: "var(--poem-ai)" }}>AI 生成</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
            <X className="w-4 h-4" style={{ color: "var(--poem-text-soft)" }} />
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {status === "idle" && (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: "var(--poem-ai-soft)" }}>
                <Sparkles className="w-7 h-7" style={{ color: "var(--poem-ai)" }} />
              </div>
              <div className="text-center">
                <p className="font-medium mb-1" style={{ color: "var(--poem-text)" }}>AI 深度解读《{poemDetail.title}》</p>
                <p className="text-sm" style={{ color: "var(--poem-text-soft)" }}>
                  从创作背景、意象分析、情感解读三个维度深入解析
                </p>
              </div>
              <Button onClick={generate} className="px-8"
                style={{ background: "var(--poem-ai)", color: "#fff" }}>
                开始解析
              </Button>
            </div>
          )}

          {status === "loading" && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--poem-ai)" }} />
                <span className="text-sm" style={{ color: "var(--poem-text-soft)" }}>AI 正在解读诗词意境…</span>
              </div>
              <div className="text-sm leading-relaxed whitespace-pre-line ai-cursor"
                style={{ color: "var(--poem-text)", lineHeight: "1.9" }}
                dangerouslySetInnerHTML={{ __html: displayed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
            </div>
          )}

          {status === "done" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" style={{ color: "var(--poem-gold)" }} />
                  <span className="text-xs" style={{ color: "var(--poem-text-soft)" }}>解析完成</span>
                </div>
                <button onClick={generate} className="flex items-center gap-1 text-xs"
                  style={{ color: "var(--poem-ai)" }}>
                  <RefreshCw className="w-3 h-3" />重新生成
                </button>
              </div>
              <div className="text-sm leading-relaxed whitespace-pre-line"
                style={{ color: "var(--poem-text)", lineHeight: "1.9" }}
                dangerouslySetInnerHTML={{ __html: displayed.replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--poem-gold)">$1</strong>') }} />
              {/* 相关诗词推荐 */}
              <div className="mt-6 pt-4" style={{ borderTop: "1px solid var(--poem-border)" }}>
                <p className="text-xs mb-3" style={{ color: "var(--poem-text-soft)" }}>AI 赏析后的延伸阅读</p>
                <div className="space-y-2">
                  {poemDetail.relatedPoems.slice(0, 2).map(p => (
                    <Link key={p.id} href={`/poetry/${p.id}`} onClick={onClose}>
                      <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors"
                        style={{ border: "1px solid var(--poem-border)" }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium" style={{ color: "var(--poem-text)" }}>{p.title}</p>
                          <p className="text-xs truncate" style={{ color: "var(--poem-text-muted)" }}>{p.preview}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "var(--poem-text-muted)" }} />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <AlertCircle className="w-10 h-10" style={{ color: "var(--poem-red)" }} />
              <p className="text-sm" style={{ color: "var(--poem-text-soft)" }}>解析失败，请检查网络后重试</p>
              <Button variant="outline" onClick={generate} size="sm">重试</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// AI配图分享面板
function AiImageSharePanel({ onClose }: { onClose: () => void }) {
  const [imgStatus, setImgStatus] = useState<"idle" | "generating" | "done">("idle")
  const [useAiImage, setUseAiImage] = useState(true)

  const generate = () => {
    setImgStatus("generating")
    setTimeout(() => setImgStatus("done"), 2200)
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl animate-slide-up overflow-hidden"
        style={{ background: "var(--poem-surface)", borderTop: "1px solid var(--poem-border)" }}>
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--poem-border)" }}>
          <span className="font-medium" style={{ color: "var(--poem-text)" }}>生成诗词海报</span>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10">
            <X className="w-4 h-4" style={{ color: "var(--poem-text-soft)" }} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* 配图选项 */}
          <div className="flex gap-3">
            <button onClick={() => setUseAiImage(true)}
              className={cn("flex-1 p-3 rounded-xl border text-sm transition-all", useAiImage ? "border-[var(--poem-ai)]" : "")}
              style={{
                background: useAiImage ? "var(--poem-ai-soft)" : "var(--poem-bg-2)",
                borderColor: useAiImage ? "var(--poem-ai)" : "var(--poem-border)",
                color: "var(--poem-text)",
              }}>
              <Sparkles className="w-4 h-4 mx-auto mb-1" style={{ color: useAiImage ? "var(--poem-ai)" : "var(--poem-text-muted)" }} />
              AI 配图
              {useAiImage && <p className="text-[10px] mt-0.5" style={{ color: "var(--poem-ai)" }}>AI 生成</p>}
            </button>
            <button onClick={() => setUseAiImage(false)}
              className="flex-1 p-3 rounded-xl border text-sm transition-all"
              style={{
                background: !useAiImage ? "var(--poem-gold-soft)" : "var(--poem-bg-2)",
                borderColor: !useAiImage ? "var(--poem-gold)" : "var(--poem-border)",
                color: "var(--poem-text)",
              }}>
              <ImageIcon className="w-4 h-4 mx-auto mb-1" style={{ color: !useAiImage ? "var(--poem-gold)" : "var(--poem-text-muted)" }} />
              默认样式
            </button>
          </div>

          {/* 预览区 */}
          <div className="aspect-[3/4] rounded-2xl flex items-center justify-center overflow-hidden"
            style={{ background: "linear-gradient(135deg, #1a0e05 0%, #2e1f10 100%)", border: "1px solid var(--poem-border)" }}>
            {imgStatus === "idle" && (
              <div className="text-center px-6">
                <div className="poem-vertical text-xl mb-4" style={{ color: "var(--poem-text)", height: "9rem" }}>
                  {poemDetail.content.map((c, i) => <span key={i}>{c.line}</span>)}
                </div>
                <p className="text-xs" style={{ color: "var(--poem-text-muted)" }}>
                  {useAiImage ? "点击生成 AI 配图" : "默认深色背景海报"}
                </p>
              </div>
            )}
            {imgStatus === "generating" && (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--poem-ai)" }} />
                <p className="text-sm" style={{ color: "var(--poem-text-soft)" }}>AI 正在感受诗词意境…</p>
              </div>
            )}
            {imgStatus === "done" && (
              <div className="w-full h-full relative flex items-center justify-center"
                style={{ background: "linear-gradient(160deg, #0d1a2e 0%, #1a0e05 50%, #2e1f10 100%)" }}>
                <div className="text-center px-6">
                  <div className="poem-vertical text-xl mb-4" style={{ color: "var(--poem-text)", height: "9rem" }}>
                    {poemDetail.content.map((c, i) => <span key={i}>{c.line}</span>)}
                  </div>
                  <p className="text-xs" style={{ color: "var(--poem-gold)" }}>— {poemDetail.dynasty} · {poemDetail.author}</p>
                </div>
                <div className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded-full"
                  style={{ background: "var(--poem-ai-soft)", color: "var(--poem-ai)" }}>AI 生成</div>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3 pb-2">
            {imgStatus === "idle" && (
              <Button className="flex-1 h-11" onClick={generate}
                style={{ background: "var(--poem-ai)", color: "#fff" }}>
                <Sparkles className="w-4 h-4 mr-1.5" />
                {useAiImage ? "生成 AI 配图" : "生成海报"}
              </Button>
            )}
            {imgStatus === "generating" && (
              <Button className="flex-1 h-11" disabled
                style={{ background: "var(--poem-ai)", color: "#fff" }}>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />生成中…
              </Button>
            )}
            {imgStatus === "done" && (
              <>
                <Button variant="outline" className="flex-1 h-11 border-white/20 text-white hover:bg-white/10" onClick={generate}>
                  <RefreshCw className="w-4 h-4 mr-1.5" />重新生成
                </Button>
                <Button className="flex-1 h-11" style={{ background: "var(--poem-gold)", color: "#1c1208" }}>
                  <Download className="w-4 h-4 mr-1.5" />保存分享
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// 声波动画组件（TTS朗读中）
function SoundWave() {
  return (
    <div className="flex items-center gap-[3px] h-5">
      {[1, 2, 3, 4, 5].map(n => (
        <div
          key={n}
          className={`w-[3px] rounded-full bar-wave-${n}`}
          style={{ height: "18px", background: "var(--poem-gold)", transformOrigin: "bottom" }}
        />
      ))}
    </div>
  )
}

type TabKey = "poem" | "appreciation" | "translation" | "notes"

export default function PoemDetailPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabKey>("poem")
  const [isLiked, setIsLiked] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showPinyin, setShowPinyin] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showAiPanel, setShowAiPanel] = useState(false)
  const [showSharePanel, setShowSharePanel] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const commentCount = POEM_COMMENTS.reduce((n, c) => n + 1 + c.replies.length, 0)

  const handleCopy = () => {
    const text = poemDetail.content.map(c => c.line).join("\n")
    navigator.clipboard.writeText(`${poemDetail.title}\n【${poemDetail.dynasty}】${poemDetail.author}\n\n${text}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: "poem", label: "原文" },
    { key: "appreciation", label: "赏析" },
    { key: "translation", label: "译文" },
    { key: "notes", label: "注释" },
  ]

  return (
    <div className="poem-page min-h-screen pb-24" style={{ color: "var(--poem-text)" }}>
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 backdrop-blur-md"
        style={{ background: "rgba(28, 18, 8, 0.92)", borderBottom: "1px solid var(--poem-border)" }}>
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => router.back()}
            className="p-1.5 -ml-1.5 rounded-xl hover:bg-white/10 active:scale-95 transition-all">
            <ArrowLeft className="w-5 h-5" style={{ color: "var(--poem-text)" }} />
          </button>
          <h1 className="font-serif font-medium" style={{ color: "var(--poem-text)" }}>诗词详情</h1>
          <button onClick={() => setShowSharePanel(true)}
            className="p-1.5 -mr-1.5 rounded-xl hover:bg-white/10 active:scale-95 transition-all">
            <Share2 className="w-5 h-5" style={{ color: "var(--poem-text)" }} />
          </button>
        </div>
      </header>

      <main className="px-4 pt-6 space-y-0">
        {/* 诗题与作者 */}
        <div className="text-center mb-6">
          <h1 className="text-[28px] font-serif font-bold tracking-wider mb-2" style={{ color: "var(--poem-gold)" }}>
            {poemDetail.title}
          </h1>
          <p className="text-sm" style={{ color: "var(--poem-text-soft)" }}>
            〔{poemDetail.dynasty}〕{poemDetail.author} · {poemDetail.form}
          </p>
          <div className="flex flex-wrap justify-center gap-1.5 mt-3">
            {poemDetail.tags.map(tag => (
              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: "var(--poem-gold-soft)", color: "var(--poem-gold)" }}>
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Tab 导航 */}
        <div className="flex mb-0" style={{ borderBottom: "1px solid var(--poem-border)" }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 py-3 text-sm font-medium transition-colors relative"
              style={{ color: activeTab === tab.key ? "var(--poem-gold)" : "var(--poem-text-soft)" }}
            >
              {tab.label}
              {/* 赏析 Tab 旁的 AI 按钮 */}
              {tab.key === "appreciation" && (
                <span
                  onClick={(e) => { e.stopPropagation(); setShowAiPanel(true) }}
                  className="ml-1 text-[9px] px-1.5 py-0.5 rounded-full align-middle cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ background: "var(--poem-ai-soft)", color: "var(--poem-ai)" }}
                >
                  AI
                </span>
              )}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full"
                  style={{ background: "var(--poem-gold)" }} />
              )}
            </button>
          ))}
        </div>

        {/* Tab 内容区 */}
        <div className="py-6">

          {/* 原文 Tab —— 竖排核心展示 */}
          {activeTab === "poem" && (
            <div className="space-y-6">
              {/* 拼音切换 */}
              <div className="flex justify-center">
                <button
                  onClick={() => setShowPinyin(!showPinyin)}
                  className="text-xs px-3 py-1 rounded-full transition-all"
                  style={{
                    background: showPinyin ? "var(--poem-gold-soft)" : "var(--poem-line)",
                    color: showPinyin ? "var(--poem-gold)" : "var(--poem-text-soft)",
                    border: `1px solid ${showPinyin ? "var(--poem-gold-dim)" : "transparent"}`,
                  }}
                >
                  拼音
                </button>
              </div>

              {/* 竖排诗文 —— 从右到左，传统竖书形态 */}
              <div className="flex justify-center items-start" style={{ minHeight: "220px" }}>
                <div
                  className="poem-vertical flex"
                  style={{
                    height: showPinyin ? "260px" : "200px",
                    gap: "2.5rem",
                    flexDirection: "row",
                    alignItems: "flex-start",
                  }}
                >
                  {/* 竖排从右向左：列逆序渲染 */}
                  {[...poemDetail.content].reverse().map((item, i) => (
                    <div key={i} className="flex flex-col items-center" style={{ writingMode: "vertical-rl" }}>
                      {showPinyin && (
                        <p className="text-[10px] mb-2" style={{ color: "var(--poem-text-muted)", writingMode: "vertical-rl", letterSpacing: "0.1em" }}>
                          {item.pinyin}
                        </p>
                      )}
                      <p className="font-serif text-[22px] leading-none"
                        style={{
                          color: "var(--poem-text)",
                          writingMode: "vertical-rl",
                          letterSpacing: "0.3em",
                          lineHeight: "2.2",
                        }}>
                        {item.line}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 装饰分隔线 */}
              <div className="flex items-center gap-3 px-8">
                <div className="flex-1 h-px" style={{ background: "var(--poem-border)" }} />
                <span className="text-xs" style={{ color: "var(--poem-text-muted)" }}>✦</span>
                <div className="flex-1 h-px" style={{ background: "var(--poem-border)" }} />
              </div>

              {/* 互动统计 */}
              <div className="flex items-center justify-center gap-8">
                <button onClick={() => setIsLiked(!isLiked)} className="flex flex-col items-center gap-1.5 group">
                  <div className={cn("w-11 h-11 rounded-full flex items-center justify-center transition-all",
                    isLiked ? "scale-110" : "group-hover:scale-105")}
                    style={{ background: isLiked ? "rgba(192,67,58,0.2)" : "var(--poem-gold-soft)" }}>
                    <Heart className={cn("w-5 h-5 transition-all", isLiked ? "fill-[var(--poem-red)] scale-110" : "")}
                      style={{ color: isLiked ? "var(--poem-red)" : "var(--poem-gold)" }} />
                  </div>
                  <span className="text-xs" style={{ color: "var(--poem-text-soft)" }}>
                    {(poemDetail.likes / 1000).toFixed(1)}k
                  </span>
                </button>

                <button onClick={() => setIsBookmarked(!isBookmarked)} className="flex flex-col items-center gap-1.5 group">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center transition-all group-hover:scale-105"
                    style={{ background: isBookmarked ? "var(--poem-gold-soft)" : "var(--poem-gold-soft)" }}>
                    {isBookmarked
                      ? <BookmarkCheck className="w-5 h-5" style={{ color: "var(--poem-gold)" }} />
                      : <Bookmark className="w-5 h-5" style={{ color: "var(--poem-gold)" }} />}
                  </div>
                  <span className="text-xs" style={{ color: "var(--poem-text-soft)" }}>
                    {(poemDetail.collections / 1000).toFixed(1)}k
                  </span>
                </button>

                <button onClick={handleCopy} className="flex flex-col items-center gap-1.5 group">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center transition-all group-hover:scale-105"
                    style={{ background: "var(--poem-gold-soft)" }}>
                    {copied
                      ? <Check className="w-5 h-5" style={{ color: "var(--poem-gold)" }} />
                      : <Copy className="w-5 h-5" style={{ color: "var(--poem-gold)" }} />}
                  </div>
                  <span className="text-xs" style={{ color: "var(--poem-text-soft)" }}>
                    {copied ? "已复制" : "复制"}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* 赏析 Tab */}
          {activeTab === "appreciation" && (
            <div className="space-y-4">
              {/* AI 赏析入口卡片 —— 低调融入，不抢眼 */}
              <button
                onClick={() => setShowAiPanel(true)}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:opacity-80"
                style={{ background: "var(--poem-ai-soft)", border: "1px solid rgba(155,126,200,0.25)" }}
              >
                <Sparkles className="w-4 h-4 shrink-0" style={{ color: "var(--poem-ai)" }} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm" style={{ color: "var(--poem-ai)" }}>AI 深度赏析</span>
                  <span className="ml-2 text-[10px] px-1 py-0.5 rounded-sm"
                    style={{ background: "rgba(155,126,200,0.2)", color: "var(--poem-ai)" }}>AI 生成</span>
                  <p className="text-xs mt-0.5" style={{ color: "var(--poem-text-muted)" }}>
                    创作背景 · 意象分析 · 情感解读
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "var(--poem-ai)" }} />
              </button>

              {/* 人工赏析 */}
              <div className="rounded-xl p-4 space-y-3"
                style={{ background: "var(--poem-surface)", border: "1px solid var(--poem-border)" }}>
                <p className="text-xs font-medium mb-3" style={{ color: "var(--poem-gold)" }}>人工赏析</p>
                <p className="text-sm leading-[1.95] whitespace-pre-line" style={{ color: "var(--poem-text)" }}>
                  {poemDetail.appreciation}
                </p>
              </div>
            </div>
          )}

          {/* 译文 Tab */}
          {activeTab === "translation" && (
            <div className="rounded-xl p-5 space-y-4"
              style={{ background: "var(--poem-surface)", border: "1px solid var(--poem-border)" }}>
              {poemDetail.content.map((item, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <p className="font-serif text-base shrink-0 leading-relaxed" style={{ color: "var(--poem-gold)" }}>
                    {item.line}
                  </p>
                  <div className="w-px self-stretch shrink-0" style={{ background: "var(--poem-border)" }} />
                  <p className="text-sm leading-relaxed" style={{ color: "var(--poem-text-soft)" }}>
                    {["明亮的月光洒在床前，", "好像地上泛起了一层霜。", "抬头望着天上的明月，", "低下头思念起远方的故乡。"][i]}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* 注释 Tab */}
          {activeTab === "notes" && (
            <div className="space-y-2">
              {poemDetail.notes.map((note, i) => (
                <div key={i} className="flex gap-3 items-start p-4 rounded-xl"
                  style={{ background: "var(--poem-surface)", border: "1px solid var(--poem-border)" }}>
                  <span className="font-serif text-base font-bold shrink-0 w-8 text-center"
                    style={{ color: "var(--poem-gold)" }}>{note.word}</span>
                  <div className="w-px self-stretch shrink-0" style={{ background: "var(--poem-border)" }} />
                  <p className="text-sm leading-relaxed" style={{ color: "var(--poem-text-soft)" }}>{note.note}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 作者简介 */}
        <div className="pt-2 pb-2" style={{ borderTop: "1px solid var(--poem-border)" }}>
          <Link href={`/poetry/poet/${poemDetail.authorId}`}
            className="flex items-center gap-4 py-4 hover:opacity-80 transition-opacity">
            <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, var(--poem-gold-soft) 0%, var(--poem-ai-soft) 100%)", border: "1px solid var(--poem-border)" }}>
              <span className="font-serif font-bold text-xl" style={{ color: "var(--poem-gold)" }}>
                {poemDetail.authorInfo.name[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium" style={{ color: "var(--poem-text)" }}>{poemDetail.authorInfo.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{ background: "var(--poem-gold-soft)", color: "var(--poem-gold)" }}>
                  {poemDetail.authorInfo.title}
                </span>
              </div>
              <p className="text-xs mb-1" style={{ color: "var(--poem-text-muted)" }}>
                {poemDetail.authorInfo.dynasty} · {poemDetail.authorInfo.years} · {poemDetail.authorInfo.poemCount} 首
              </p>
              <p className="text-sm line-clamp-2" style={{ color: "var(--poem-text-soft)" }}>
                {poemDetail.authorInfo.intro}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 shrink-0" style={{ color: "var(--poem-text-muted)" }} />
          </Link>
        </div>

        {/* 诗词品评 - 点击展开 */}
        <div className="pb-2" style={{ borderTop: "1px solid var(--poem-border)" }}>
          <div className="flex items-center justify-between py-4">
            <span className="font-medium text-sm" style={{ color: "var(--poem-text)" }}>诗词品评</span>
            <span className="text-xs" style={{ color: "var(--poem-text-muted)" }}>{commentCount} 条</span>
          </div>
          <button
            onClick={() => setShowComments(true)}
            className="w-full text-left rounded-xl overflow-hidden transition-all hover:opacity-90"
            style={{ background: "var(--poem-surface)", border: "1px solid var(--poem-border)" }}
          >
            <div className="flex items-start gap-3 p-3.5">
              <span className="w-8 h-8 rounded-full flex items-center justify-center font-medium flex-shrink-0 text-sm"
                style={{ background: "var(--poem-gold-soft)", color: "var(--poem-gold)" }} aria-hidden>
                {POEM_COMMENTS[0].user.charAt(0)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium" style={{ color: "var(--poem-text)" }}>{POEM_COMMENTS[0].user}</p>
                <p className="text-[13px] leading-relaxed mt-0.5 line-clamp-2" style={{ color: "var(--poem-text-soft)" }}>
                  {POEM_COMMENTS[0].content}
                </p>
                <span className="inline-flex items-center gap-1 text-[12px] mt-1.5" style={{ color: "var(--poem-text-muted)" }}>
                  <Heart className="w-3.5 h-3.5" />{POEM_COMMENTS[0].likes}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-1.5 py-2.5 text-[14px] font-medium"
              style={{ borderTop: "1px solid var(--poem-border)", color: "var(--poem-gold)" }}>
              <MessageCircle className="w-4 h-4" />
              查看全部 {commentCount} 条品评
            </div>
          </button>
        </div>

        {/* 相关诗词 */}
        <div className="pb-6" style={{ borderTop: "1px solid var(--poem-border)" }}>
          <div className="flex items-center justify-between py-4">
            <span className="font-medium text-sm" style={{ color: "var(--poem-text)" }}>相关诗词</span>
            <Link href="/poetry" className="text-xs flex items-center" style={{ color: "var(--poem-text-muted)" }}>
              更多 <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-2">
            {poemDetail.relatedPoems.map(poem => (
              <Link key={poem.id} href={`/poetry/${poem.id}`}>
                <div className="flex items-center gap-3 p-3 rounded-xl transition-all hover:opacity-80"
                  style={{ background: "var(--poem-surface)", border: "1px solid var(--poem-border)" }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium mb-0.5" style={{ color: "var(--poem-text)" }}>{poem.title}</p>
                    <p className="text-xs truncate" style={{ color: "var(--poem-text-muted)" }}>{poem.preview}</p>
                  </div>
                  <span className="text-xs shrink-0" style={{ color: "var(--poem-text-muted)" }}>{poem.author}</span>
                  <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "var(--poem-text-muted)" }} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>

      {/* 底部操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 px-4 py-3"
        style={{ background: "rgba(28, 18, 8, 0.96)", borderTop: "1px solid var(--poem-border)", backdropFilter: "blur(12px)" }}>
        <div className="flex items-center gap-3 max-w-screen-lg mx-auto">
          {/* 朗读按钮 —— 含声波动画 */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-2 flex-1 h-11 rounded-xl justify-center transition-all"
            style={{
              background: isPlaying ? "var(--poem-gold-soft)" : "var(--poem-surface)",
              border: `1px solid ${isPlaying ? "var(--poem-gold-dim)" : "var(--poem-border)"}`,
              color: isPlaying ? "var(--poem-gold)" : "var(--poem-text-soft)",
            }}
          >
            {isPlaying ? (
              <>
                <SoundWave />
                <span className="text-sm">朗读中</span>
                <VolumeX className="w-4 h-4" />
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4" />
                <span className="text-sm">朗读</span>
              </>
            )}
          </button>

          {/* 收藏 */}
          <button
            onClick={() => setIsBookmarked(!isBookmarked)}
            className="w-11 h-11 rounded-xl flex items-center justify-center transition-all"
            style={{
              background: isBookmarked ? "var(--poem-gold-soft)" : "var(--poem-surface)",
              border: `1px solid ${isBookmarked ? "var(--poem-gold-dim)" : "var(--poem-border)"}`,
            }}>
            {isBookmarked
              ? <BookmarkCheck className="w-5 h-5" style={{ color: "var(--poem-gold)" }} />
              : <Bookmark className="w-5 h-5" style={{ color: "var(--poem-text-soft)" }} />}
          </button>

          {/* 点赞 */}
          <button
            onClick={() => setIsLiked(!isLiked)}
            className="w-11 h-11 rounded-xl flex items-center justify-center transition-all"
            style={{
              background: isLiked ? "rgba(192,67,58,0.15)" : "var(--poem-surface)",
              border: `1px solid ${isLiked ? "rgba(192,67,58,0.4)" : "var(--poem-border)"}`,
            }}>
            <Heart className={cn("w-5 h-5 transition-all", isLiked ? "fill-[var(--poem-red)]" : "")}
              style={{ color: isLiked ? "var(--poem-red)" : "var(--poem-text-soft)" }} />
          </button>

          {/* 品评讨论 */}
          <button
            onClick={() => setShowComments(true)}
            className="relative w-11 h-11 rounded-xl flex items-center justify-center transition-all"
            style={{ background: "var(--poem-surface)", border: "1px solid var(--poem-border)" }}
            aria-label="诗词品评">
            <MessageCircle className="w-5 h-5" style={{ color: "var(--poem-text-soft)" }} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: "var(--poem-gold)" }} />
          </button>

          {/* 分享（含AI配图） */}
          <button
            onClick={() => setShowSharePanel(true)}
            className="w-11 h-11 rounded-xl flex items-center justify-center transition-all"
            style={{ background: "var(--poem-surface)", border: "1px solid var(--poem-border)" }}>
            <Share2 className="w-5 h-5" style={{ color: "var(--poem-text-soft)" }} />
          </button>
        </div>
      </div>

      {/* 浮层 */}
      {showAiPanel && <AiAppreciationPanel onClose={() => setShowAiPanel(false)} />}
      {showSharePanel && <AiImageSharePanel onClose={() => setShowSharePanel(false)} />}

      {/* 诗词品评抽屉 */}
      <CommentSheet
        open={showComments}
        onClose={() => setShowComments(false)}
        title={poemDetail.title}
        scope="book"
        initialComments={POEM_COMMENTS}
        accentColor={POEM_ACCENT}
        bookLabel="诗词品评"
      />
    </div>
  )
}
