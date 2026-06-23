"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  Share2, BookmarkPlus, BookmarkCheck, ChevronRight, ChevronDown,
  Play, Headphones, Sparkles, FileText, Network, Eye, Star,
  MessageSquare, Heart,
} from "lucide-react"
import {
  ClassicsHeader, FlatCover, coverColorForBook,
  type CoverColor,
} from "@/components/classics"
import { DiscussionSheet } from "@/components/common/discussion-sheet"
import type { DiscussionConfig, DiscussionItem } from "@/lib/types/discussion"

interface BookInfo {
  id: string
  title: string
  author: string
  dynasty: string
  version: string
  description: string
  aiSummary: string
  reads: number
  rating: number
  totalChapters: number
  hasAI: boolean
  hasAudio: boolean
  hasTranslation: boolean
  isFree: boolean
  isInBookshelf: boolean
  color: CoverColor
  chapters: { id: string; title: string; hasChildren?: boolean; children?: { id: string; title: string }[] }[]
  relatedBooks: { id: string; title: string; author: string; dynasty: string; color: CoverColor }[]
}

const bookData: Record<string, BookInfo> = {
  "1": {
    id: "1", title: "周易", author: "伏羲/周文王/孔子", dynasty: "周", version: "通行本", color: "cream",
    description: "《周易》即《易经》，是传统经典之一，相传系周文王姬昌所作，内容包括《经》和《传》两个部分。",
    aiSummary: "群经之首，大道之源。《周易》以六十四卦推演天地万物的变化之理，既是占筮之书，更是一部蕴含宇宙观与处世智慧的哲学经典，读懂它便读懂了中国人的思维底层。",
    reads: 128600, rating: 4.9, totalChapters: 64, hasAI: true, hasAudio: true, hasTranslation: true, isFree: true, isInBookshelf: false,
    chapters: [
      { id: "c1", title: "扉页" },
      { id: "c2", title: "序跋", hasChildren: true, children: [{ id: "c2-1", title: "周易序" }, { id: "c2-2", title: "周易正义序" }] },
      { id: "c3", title: "周易卷首目次" },
      { id: "c4", title: "周易卷首", hasChildren: true },
      { id: "c5", title: "周易上经", hasChildren: true, children: [{ id: "c5-1", title: "乾卦第一" }, { id: "c5-2", title: "坤卦第二" }, { id: "c5-3", title: "屯卦第三" }] },
      { id: "c6", title: "周易下经", hasChildren: true },
      { id: "c7", title: "系辞上传" },
      { id: "c8", title: "系辞下传" },
      { id: "c9", title: "说卦传" },
      { id: "c10", title: "序卦传" },
      { id: "c11", title: "杂卦传" },
      { id: "c12", title: "结束页" },
    ],
    relatedBooks: [
      { id: "2", title: "道德经", author: "老子", dynasty: "春秋", color: "brown" },
      { id: "6", title: "论语", author: "孔子门人", dynasty: "春秋", color: "red" },
      { id: "4", title: "易传", author: "孔子", dynasty: "春秋", color: "green" },
    ],
  },
  "2": {
    id: "2", title: "道德经", author: "老子", dynasty: "春秋", version: "王弼注本", color: "brown",
    description: "《道德经》又称《老子》，是道家学派的经典著作，分《道经》和《德经》上下两篇，共八十一章。",
    aiSummary: "道法自然，无为而治。老子用五千字道出宇宙至理，引领人们探寻生命本真，是道家思想的源头活水。",
    reads: 145600, rating: 4.9, totalChapters: 81, hasAI: true, hasAudio: true, hasTranslation: true, isFree: true, isInBookshelf: true,
    chapters: [
      { id: "c1", title: "扉页" },
      { id: "c2", title: "序跋" },
      { id: "c3", title: "道经（第一至第三十七章）", hasChildren: true },
      { id: "c4", title: "德经（第三十八至第八十一章）", hasChildren: true },
      { id: "c5", title: "结束页" },
    ],
    relatedBooks: [
      { id: "1", title: "周易", author: "伏羲", dynasty: "周", color: "cream" },
      { id: "30", title: "庄子", author: "庄周", dynasty: "战国", color: "green" },
    ],
  },
}

const AI_FEATURES = [
  { icon: FileText, label: "文白翻译" },
  { icon: Sparkles, label: "智能查词" },
  { icon: Headphones, label: "AI 听书" },
  { icon: Network, label: "知识图谱" },
]

// 整本书的书友讨论（接入讨论母版，含认证标识/精选置顶/划线引用）
const BOOK_DISCUSSIONS: DiscussionItem[] = [
  {
    id: "b1",
    author: { id: 1, name: "山间煮茶", badge: "master" },
    content:
      "读了三遍才慢慢咂摸出味道。古人讲『书读百遍其义自见』，诚不我欺。建议配合注疏一起看，单读原文容易囫囵吞枣。",
    time: "3天前",
    likeCount: 128,
    featured: true,
    quote: { text: "书读百遍，其义自见。", source: "读后总评" },
    replies: [
      { id: "b1r1", author: { id: 11, name: "知秋" }, content: "同感，第一遍真的看不懂，坚持下来豁然开朗。", time: "2天前", likeCount: 12, replyToName: "山间煮茶" },
      { id: "b1r2", author: { id: 12, name: "未名" }, content: "请问您看的是哪个注本？", time: "2天前", likeCount: 3, replyToName: "山间煮茶" },
    ],
    replyCount: 2,
  },
  {
    id: "b2",
    author: { id: 2, name: "竹影清风", badge: "teacher" },
    content: "这个版本的排版和句读做得很用心，AI 译文也比较克制，没有过度发挥，对初学者很友好。",
    time: "5天前",
    likeCount: 86,
    replies: [],
  },
  {
    id: "b3",
    author: { id: 3, name: "归园田居", level: 5 },
    content: "开篇即是高峰。能把如此深奥的道理用这般简练的文字道出，足见先贤功力。每读一次都有新的体会。",
    time: "1周前",
    likeCount: 54,
    quote: { text: "大道至简。", source: "卷首" },
    replies: [
      { id: "b3r1", author: { id: 31, name: "听雨轩主" }, content: "『大道至简』四个字概括得好。", time: "6天前", likeCount: 8, replyToName: "归园田居" },
    ],
    replyCount: 1,
  },
]

export default function ClassicsDetailPage() {
  const router = useRouter()
  const params = useParams()
  const bookId = params.id as string
  const book = bookData[bookId] || bookData["1"]

  const [isInBookshelf, setIsInBookshelf] = useState(book.isInBookshelf)
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())
  const [showAllChapters, setShowAllChapters] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const commentCount = BOOK_DISCUSSIONS.reduce((n, c) => n + 1 + c.replies.length, 0)

  const toggleChapter = (id: string) =>
    setExpandedChapters((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const displayedChapters = showAllChapters ? book.chapters : book.chapters.slice(0, 6)

  return (
    <div className="min-h-screen bg-[#f4f2ee] dark:bg-background pb-28">
      <ClassicsHeader
        title={book.title}
        showSearch={false}
        rightSlot={
          <button className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform" aria-label="分享">
            <Share2 className="w-[20px] h-[20px] text-foreground" />
          </button>
        }
      />

      <main className="max-w-screen-xl mx-auto">
        {/* 封面区 */}
        <section className="px-5 sm:px-6 pt-3 pb-5">
          <div className="flex gap-5">
            <FlatCover
              title={book.title}
              label={book.dynasty}
              footer={book.author.split("/")[0]}
              coverColor={coverColorForBook(book.title)}
              className="w-28 flex-shrink-0 shadow-lg"
              titleClassName="text-lg"
            />
            <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
              <div>
                <h1 className="font-serif text-2xl font-bold text-foreground leading-tight">{book.title}</h1>
                <p className="text-[14px] text-muted-foreground mt-1.5">[{book.dynasty}] {book.author}</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground">{book.version}</span>
                  {book.hasTranslation && <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">译文</span>}
                  {book.isFree && <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">免费</span>}
                </div>
              </div>
              <div className="flex items-center gap-4 text-[12px] text-muted-foreground mt-3">
                <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />{book.rating}</span>
                <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{(book.reads / 10000).toFixed(1)}万</span>
                <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{book.totalChapters}篇</span>
              </div>
            </div>
          </div>
        </section>

        {/* AI 智能导读 */}
        <section className="px-5 sm:px-6 pb-4">
          <div className="rounded-2xl p-4 bg-card shadow-sm ring-1 ring-black/[0.04] dark:ring-white/5">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(150deg, #c8324c, #9e1b30)" }}>
                <Sparkles className="w-3 h-3 text-white" />
              </span>
              <span className="text-[13px] font-semibold text-[#c41e3a] dark:text-amber-400">AI 智能导读</span>
            </div>
            <p className="text-[14px] text-foreground/90 leading-relaxed">{book.aiSummary}</p>
          </div>
        </section>

        {/* AI 功能亮点 */}
        {book.hasAI && (
          <section className="px-5 sm:px-6 pb-5">
            <div className="grid grid-cols-4 gap-2.5">
              {AI_FEATURES.map((feat) => {
                const Icon = feat.icon
                return (
                  <div key={feat.label} className="flex flex-col items-center gap-2 py-3.5 rounded-2xl bg-card shadow-sm ring-1 ring-black/[0.04] dark:ring-white/5">
                    <span className="w-9 h-9 rounded-full bg-[#c41e3a]/10 dark:bg-amber-400/15 flex items-center justify-center">
                      <Icon className="w-[18px] h-[18px] text-[#c41e3a] dark:text-amber-400" />
                    </span>
                    <span className="text-[11px] text-muted-foreground">{feat.label}</span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* 听书入口 */}
        {book.hasAudio && (
          <section className="px-5 sm:px-6 pb-5">
            <Link
              href={`/classics/audiobooks/${book.id}`}
              className="flex items-center gap-3 p-4 rounded-2xl bg-card shadow-sm ring-1 ring-black/[0.04] dark:ring-white/5 active:scale-[0.99] transition-transform"
            >
              <span className="w-11 h-11 rounded-full bg-[#a06a38] flex items-center justify-center flex-shrink-0">
                <Headphones className="w-5 h-5 text-white" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[15px] text-foreground">听书版本</p>
                <p className="text-[12px] text-muted-foreground mt-0.5">名家朗读 · 全本</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground/40" />
            </Link>
          </section>
        )}

        {/* 目录 */}
        <section className="px-5 sm:px-6 pb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[18px] font-bold tracking-tight text-foreground">目录</h2>
            <span className="text-[12px] text-muted-foreground">共 {book.totalChapters} 卷</span>
          </div>
          <div className="rounded-2xl bg-card shadow-sm ring-1 ring-black/[0.04] dark:ring-white/5 overflow-hidden">
            {displayedChapters.map((chapter, index) => (
              <div key={chapter.id} className={cn(index > 0 && "border-t border-border/60")}>
                <button
                  onClick={() => (chapter.hasChildren ? toggleChapter(chapter.id) : router.push(`/reader/${book.id}?chapter=${chapter.id}`))}
                  className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-muted/50 transition-colors text-left"
                >
                  {chapter.hasChildren ? (
                    <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", expandedChapters.has(chapter.id) && "rotate-180")} />
                  ) : (
                    <span className="w-4" />
                  )}
                  <span className="text-[14px] flex-1 text-foreground">{chapter.title}</span>
                </button>
                {chapter.hasChildren && chapter.children && expandedChapters.has(chapter.id) && (
                  <div className="bg-muted/30">
                    {chapter.children.map((child) => (
                      <Link
                        key={child.id}
                        href={`/reader/${book.id}?chapter=${child.id}`}
                        className="flex items-center px-4 py-2.5 pl-11 active:bg-muted/50 transition-colors"
                      >
                        <span className="text-[13px] text-muted-foreground">{child.title}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {!showAllChapters && book.chapters.length > 6 && (
              <button
                onClick={() => setShowAllChapters(true)}
                className="w-full py-3.5 text-[14px] font-medium text-[#c41e3a] dark:text-amber-400 border-t border-border/60 active:bg-muted/50 transition-colors"
              >
                查看全部 {book.chapters.length} 个章节
              </button>
            )}
          </div>
        </section>

        {/* 书友讨论 - 点击展开 */}
        <section className="px-5 sm:px-6 pb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[18px] font-bold tracking-tight text-foreground">书友讨论</h2>
            <span className="text-[12px] text-muted-foreground">{commentCount} 条</span>
          </div>
          <button
            onClick={() => setShowComments(true)}
            className="w-full text-left rounded-2xl bg-card shadow-sm ring-1 ring-black/[0.04] dark:ring-white/5 overflow-hidden active:scale-[0.99] transition-transform"
          >
            <div className="flex items-start gap-3 p-4">
              <span className="w-9 h-9 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0 text-sm" style={{ background: "#a06a38" }} aria-hidden>
                {BOOK_DISCUSSIONS[0].author.name.charAt(0)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground">{BOOK_DISCUSSIONS[0].author.name}</p>
                <p className="text-[13px] text-foreground/80 leading-relaxed mt-0.5 line-clamp-2 text-pretty">{BOOK_DISCUSSIONS[0].content}</p>
                <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground mt-1.5">
                  <Heart className="w-3.5 h-3.5" />{BOOK_DISCUSSIONS[0].likeCount}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-1.5 py-3 border-t border-border/60 text-[14px] font-medium text-[#c41e3a] dark:text-amber-400">
              <MessageSquare className="w-4 h-4" />
              查看全部 {commentCount} 条讨论
            </div>
          </button>
        </section>

        {/* 相关推荐 */}
        <section className="pb-6">
          <h2 className="text-[18px] font-bold tracking-tight text-foreground mb-3 px-5 sm:px-6">相关推荐</h2>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-1 px-5 sm:px-6">
            {book.relatedBooks.map((related) => (
              <Link key={related.id} href={`/classics/${related.id}`} className="flex-shrink-0 w-[88px]">
                  <FlatCover title={related.title} coverColor={coverColorForBook(related.title)} className="w-full shadow-md mb-2" titleClassName="text-sm" />
                <p className="text-[12px] text-center truncate text-foreground">{related.title}</p>
                <p className="text-[10px] text-muted-foreground text-center truncate">{related.author}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>

      {/* 底部固定操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#f4f2ee]/90 dark:bg-background/90 backdrop-blur-xl border-t border-border/60 px-5 sm:px-6 py-3">
        <div className="flex gap-3 max-w-screen-xl mx-auto">
          <button
            onClick={() => setIsInBookshelf((v) => !v)}
            className={cn(
              "flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 text-[15px] font-semibold ring-1 transition-colors active:scale-[0.98]",
              isInBookshelf
                ? "bg-[#c41e3a]/10 text-[#c41e3a] ring-[#c41e3a]/30 dark:bg-amber-400/15 dark:text-amber-400 dark:ring-amber-400/30"
                : "bg-card text-foreground ring-black/[0.06] dark:ring-white/10",
            )}
          >
            {isInBookshelf ? <BookmarkCheck className="w-5 h-5" /> : <BookmarkPlus className="w-5 h-5" />}
            {isInBookshelf ? "已在书架" : "加入书架"}
          </button>
          <Link
            href={`/reader/${book.id}`}
            className="flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 bg-[#c41e3a] dark:bg-amber-500 text-white text-[15px] font-semibold shadow-sm active:scale-[0.98] transition-transform"
          >
            <Play className="w-5 h-5 fill-current" />开始阅读
          </Link>
        </div>
      </div>

      {/* 书友讨论抽屉（接入讨论母版 + AI 辅助） */}
      <DiscussionSheet
        open={showComments}
        onClose={() => setShowComments(false)}
        config={{
          scene: "classic",
          mode: "comment",
          title: "书友讨论",
          accentColor: "#c41e3a",
          placeholder: "各抒己见，友善交流…",
        } satisfies DiscussionConfig}
        items={BOOK_DISCUSSIONS}
        enableAIAssist
      />
    </div>
  )
}
