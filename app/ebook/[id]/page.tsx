"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft, Share2, Star, Heart, BookOpen, MessageSquare,
  ChevronRight, Lock, CheckCircle, Crown, Users, FileText, Play,
} from "lucide-react"
import Link from "next/link"
import { FlatBookCover, ebookColorFromHex } from "@/components/ebook"
import { CommentSheet, type ClassicComment } from "@/components/classics"

const EBOOK_ACCENT = "#2563eb"

const bookDetail = {
  id: "1",
  title: "八字命理精解",
  subtitle: "从入门到精通的命理学习指南",
  author: "李明华",
  authorTitle: "资深命理师 · 从业22年",
  coverColor: "#1e3a5f",
  price: 68,
  originalPrice: 128,
  rating: 4.8,
  reviewCount: 2340,
  salesCount: 12800,
  wordCount: 186000,
  pageCount: 320,
  category: "命理",
  isHot: true,
  isFree: false,
  isMemberFree: true,
  hasPreview: true,
  isPurchased: false,
  description: `《八字命理精解》是一本系统讲解八字命理学的专业书籍。本书从基础理论讲起，循序渐进地介绍了天干地支、五行生克、十神定位、大运流年等核心概念。

书中配有大量实例分析，帮助读者理解命理学的实际应用。无论是命理学入门者还是有一定基础的学习者，都能从本书中获得启发。

本书特点：
• 理论与实践相结合
• 大量真实案例分析
• 配套练习题
• 作者答疑互动`,
  chapters: [
    { id: "1", title: "第一章 八字基础概论", pageCount: 28, isFree: true },
    { id: "2", title: "第二章 天干地支详解", pageCount: 35, isFree: true },
    { id: "3", title: "第三章 五行生克制化", pageCount: 42, isFree: false },
    { id: "4", title: "第四章 十神定位与作用", pageCount: 48, isFree: false },
    { id: "5", title: "第五章 格局取用神", pageCount: 38, isFree: false },
    { id: "6", title: "第六章 大运流年断法", pageCount: 52, isFree: false },
    { id: "7", title: "第七章 实例精解", pageCount: 77, isFree: false },
  ],
  relatedBooks: [
    { id: "2", title: "紫微斗数入门", author: "紫微居士", price: 58, coverColor: "#4a1942" },
    { id: "3", title: "六爻预测实战", author: "陈易卦", price: 68, coverColor: "#1a4731" },
    { id: "4", title: "风水学基础", author: "张天师", price: 88, coverColor: "#3d1f00" },
  ],
}

// 书友讨论数据
const BOOK_COMMENTS: ClassicComment[] = [
  {
    id: "e1", user: "易学爱好者", time: "3天前", likes: 128, liked: false, chapter: "读后总评",
    content: "这本书讲解得非常清晰，案例丰富，对于入门者来说是非常好的学习资料。尤其是天干地支那章，配图很到位。",
    replies: [
      { id: "e1r1", user: "命理研究生", content: "同意，作者功底深厚，深入浅出。", time: "2天前", likes: 14 },
      { id: "e1r2", user: "初学小王", content: "请问需要先看哪本打基础？", time: "2天前", likes: 3 },
    ],
  },
  {
    id: "e2", user: "命理研究生", time: "5天前", likes: 89, liked: false, chapter: "第七章 实例精解",
    content: "第七章的实例分析非常有价值，把前面的理论全部串起来了，反复看了三遍。",
    replies: [],
  },
  {
    id: "e3", user: "学习中的小白", time: "1周前", likes: 45, liked: false,
    content: "内容很好，就是有些地方稍显深奥，需要反复阅读理解。建议配合作者的答疑一起学。",
    replies: [
      { id: "e3r1", user: "易学爱好者", content: "可以加入读者群，作者会定期答疑。", time: "6天前", likes: 7 },
    ],
  },
]

export default function EbookDetailPage() {
  const [isFavorite, setIsFavorite] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [descExpanded, setDescExpanded] = useState(false)

  const book = bookDetail
  const isPurchased = book.isPurchased
  const coverColor = ebookColorFromHex(book.coverColor)
  const commentCount = BOOK_COMMENTS.reduce((n, c) => n + 1 + c.replies.length, 0)

  return (
    <div className="min-h-screen bg-[var(--ebook-bg)] pb-28">
      {/* 顶部导航 - 毛玻璃 */}
      <header className="sticky top-0 z-50 bg-[var(--ebook-bg)]/85 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/ebook" className="w-9 h-9 -ml-1.5 rounded-full flex items-center justify-center active:bg-black/5 transition-colors">
            <ArrowLeft className="w-5 h-5 text-[var(--ebook-text)]" />
          </Link>
          <h1 className="font-medium text-sm text-[var(--ebook-text)]">书籍详情</h1>
          <button className="w-9 h-9 -mr-1.5 rounded-full flex items-center justify-center active:bg-black/5 transition-colors">
            <Share2 className="w-5 h-5 text-[var(--ebook-text)]" />
          </button>
        </div>
      </header>

      <main className="px-5">
        {/* Hero */}
        <section className="pt-4 pb-6">
          <div className="flex gap-5">
            <FlatBookCover
              title={book.title}
              author={book.author}
              color={coverColor}
              className="w-28 aspect-[3/4] flex-shrink-0"
              titleClassName="text-[17px]"
            />
            <div className="flex-1 min-w-0 flex flex-col">
              <h1 className="font-bold text-[20px] leading-snug text-[var(--ebook-text)] text-balance">{book.title}</h1>
              <p className="text-[13px] text-[var(--ebook-text-soft)] mt-1 line-clamp-1">{book.subtitle}</p>
              <div className="flex items-center gap-1.5 mt-2.5">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0" style={{ background: EBOOK_ACCENT }}>
                  {book.author.charAt(0)}
                </span>
                <span className="text-[13px] text-[var(--ebook-text-soft)]">{book.author}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="text-[15px] font-bold text-[var(--ebook-text)]">{book.rating}</span>
                <span className="text-[12px] text-[var(--ebook-text-soft)]">{book.reviewCount}条评价</span>
              </div>
            </div>
          </div>

          {/* 数据条 */}
          <div className="flex items-center justify-around mt-5 py-3.5 bg-[var(--ebook-card)] rounded-2xl shadow-sm ring-1 ring-black/[0.04]">
            {[
              { v: `${(book.wordCount / 10000).toFixed(1)}万`, l: "字数" },
              { v: book.pageCount, l: "页数" },
              { v: `${(book.salesCount / 1000).toFixed(1)}k`, l: "已购" },
              { v: book.chapters.length, l: "章节" },
            ].map((s, i) => (
              <div key={s.l} className="flex items-center">
                {i > 0 && <span className="w-px h-7 bg-black/5 mr-4 sm:mr-6" />}
                <div className="text-center">
                  <p className="text-[16px] font-bold text-[var(--ebook-text)]">{s.v}</p>
                  <p className="text-[11px] text-[var(--ebook-text-soft)] mt-0.5">{s.l}</p>
                </div>
                <span className="w-0 ml-4 sm:ml-6" />
              </div>
            ))}
          </div>
        </section>

        {/* 简介 */}
        <section className="pb-6">
          <h2 className="text-[18px] font-bold tracking-tight text-[var(--ebook-text)] mb-3">书籍简介</h2>
          <div className="rounded-2xl bg-[var(--ebook-card)] p-4 shadow-sm ring-1 ring-black/[0.04]">
            <p className={cn("text-[14px] text-[var(--ebook-text-soft)] whitespace-pre-line leading-relaxed text-pretty", !descExpanded && "line-clamp-4")}>
              {book.description}
            </p>
            <button onClick={() => setDescExpanded(!descExpanded)} className="text-[13px] font-medium mt-2 flex items-center gap-0.5" style={{ color: EBOOK_ACCENT }}>
              {descExpanded ? "收起" : "展开全部"}
              <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", descExpanded && "rotate-90")} />
            </button>
          </div>
        </section>

        {/* 作者 */}
        <section className="pb-6">
          <div className="rounded-2xl bg-[var(--ebook-card)] p-4 shadow-sm ring-1 ring-black/[0.04] flex items-center gap-3">
            <span className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-serif font-bold flex-shrink-0" style={{ background: `linear-gradient(135deg, #3b6fd4, #27488f)` }}>
              {book.author.charAt(0)}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[15px] text-[var(--ebook-text)]">{book.author}</p>
              <p className="text-[12px] text-[var(--ebook-text-soft)] mt-0.5">{book.authorTitle}</p>
            </div>
            <Button variant="outline" size="sm" className="rounded-full border-0 bg-[var(--ebook-primary-soft)] text-[var(--ebook-primary)] font-medium">关注</Button>
          </div>
        </section>

        {/* 目录 */}
        <section className="pb-6">
          <h2 className="text-[18px] font-bold tracking-tight text-[var(--ebook-text)] mb-3">目录 · {book.chapters.length}章</h2>
          <div className="rounded-2xl bg-[var(--ebook-card)] overflow-hidden shadow-sm ring-1 ring-black/[0.04]">
            {book.chapters.map((chapter, index) => {
              const canRead = chapter.isFree || isPurchased
              return (
                <Link
                  key={chapter.id}
                  href={canRead ? `/ebook/reader/${book.id}?chapter=${chapter.id}` : `/ebook/checkout/${book.id}`}
                  className={cn(
                    "flex items-center justify-between px-4 py-3.5 transition-colors border-b border-black/[0.04] last:border-0",
                    canRead ? "active:bg-black/[0.03]" : "opacity-55"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 text-[13px] text-[var(--ebook-text-soft)] font-medium flex-shrink-0">{index + 1}</span>
                    <span className="text-[14px] text-[var(--ebook-text)] truncate">{chapter.title}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {chapter.isFree ? (
                      <Badge className="text-[10px] border-0 bg-[var(--ebook-free)]/12 text-[var(--ebook-free)]">试读</Badge>
                    ) : !isPurchased ? (
                      <Lock className="w-3.5 h-3.5 text-[var(--ebook-text-soft)]" />
                    ) : null}
                    <span className="text-[11px] text-[var(--ebook-text-soft)]">{chapter.pageCount}页</span>
                  </div>
                </Link>
              )
            })}
          </div>
          {!isPurchased && (
            <p className="text-center text-[12px] text-[var(--ebook-text-soft)] mt-3">购买后可阅读全部 {book.chapters.length} 章</p>
          )}
        </section>

        {/* 书友讨论 - 点击展开 */}
        <section className="pb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[18px] font-bold tracking-tight text-[var(--ebook-text)]">书友讨论</h2>
            <span className="text-[12px] text-[var(--ebook-text-soft)]">{commentCount} 条</span>
          </div>
          <button
            onClick={() => setShowComments(true)}
            className="w-full text-left rounded-2xl bg-[var(--ebook-card)] shadow-sm ring-1 ring-black/[0.04] overflow-hidden active:scale-[0.99] transition-transform"
          >
            <div className="flex items-start gap-3 p-4">
              <span className="w-9 h-9 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0 text-sm" style={{ background: "#a06a38" }} aria-hidden>
                {BOOK_COMMENTS[0].user.charAt(0)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[var(--ebook-text)]">{BOOK_COMMENTS[0].user}</p>
                <p className="text-[13px] text-[var(--ebook-text)]/80 leading-relaxed mt-0.5 line-clamp-2 text-pretty">{BOOK_COMMENTS[0].content}</p>
                <span className="inline-flex items-center gap-1 text-[12px] text-[var(--ebook-text-soft)] mt-1.5">
                  <Heart className="w-3.5 h-3.5" />{BOOK_COMMENTS[0].likes}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-1.5 py-3 border-t border-black/[0.04] text-[14px] font-medium" style={{ color: EBOOK_ACCENT }}>
              <MessageSquare className="w-4 h-4" />
              查看全部 {commentCount} 条讨论
            </div>
          </button>
        </section>

        {/* 相关推荐 */}
        <section className="pb-6">
          <h2 className="text-[18px] font-bold tracking-tight text-[var(--ebook-text)] mb-3">相关推荐</h2>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-1">
            {book.relatedBooks.map((rb) => (
              <Link key={rb.id} href={`/ebook/${rb.id}`} className="flex-shrink-0 w-24">
                <FlatBookCover title={rb.title} author={rb.author} color={ebookColorFromHex(rb.coverColor)} className="w-full aspect-[3/4] mb-2" titleClassName="text-[13px]" />
                <p className="text-[12px] font-medium line-clamp-1 text-[var(--ebook-text)]">{rb.title}</p>
                <p className="text-[12px] font-bold text-[var(--ebook-price)] mt-0.5">¥{rb.price}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* 平台标识 */}
        <div className="flex items-center gap-2 text-[12px] text-[var(--ebook-text-soft)] mb-2">
          <FileText className="w-4 h-4" style={{ color: EBOOK_ACCENT }} />
          <span>本书由平台官方提供，内容经专业审核</span>
        </div>
      </main>

      {/* 底部操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--ebook-bg)]/90 backdrop-blur-xl border-t border-black/[0.06] px-4 py-3 z-50 safe-area-inset-bottom">
        <div className="flex items-center gap-2 max-w-screen-lg mx-auto">
          <button onClick={() => setIsFavorite(!isFavorite)} className="flex flex-col items-center gap-0.5 px-2 text-[var(--ebook-text-soft)]">
            <Heart className={cn("w-5 h-5", isFavorite && "fill-red-500 text-red-500")} />
            <span className="text-[10px]">收藏</span>
          </button>
          <button onClick={() => setShowComments(true)} className="flex flex-col items-center gap-0.5 px-2 text-[var(--ebook-text-soft)]">
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px]">评论</span>
          </button>

          <div className="flex-1 flex gap-2 ml-1">
            {isPurchased ? (
              <Button className="flex-1 h-11 rounded-full text-white" style={{ background: EBOOK_ACCENT }} asChild>
                <Link href={`/ebook/reader/${book.id}`}>
                  <BookOpen className="w-4 h-4 mr-1.5" />继续阅读
                </Link>
              </Button>
            ) : (
              <>
                {book.hasPreview && (
                  <Button variant="outline" className="flex-1 h-11 rounded-full border-[var(--ebook-primary)] text-[var(--ebook-primary)]" asChild>
                    <Link href={`/ebook/reader/${book.id}?preview=true`}>
                      <Play className="w-4 h-4 mr-1.5" />试读
                    </Link>
                  </Button>
                )}
                {book.isMemberFree ? (
                  <Button className="flex-1 h-11 rounded-full bg-[var(--ebook-member)] hover:bg-[var(--ebook-member)]/90 text-white" asChild>
                    <Link href={`/ebook/checkout/${book.id}?type=member`}>
                      <Crown className="w-4 h-4 mr-1.5" />会员免费领取
                    </Link>
                  </Button>
                ) : book.isFree ? (
                  <Button className="flex-1 h-11 rounded-full bg-[var(--ebook-free)] hover:bg-[var(--ebook-free)]/90 text-white" asChild>
                    <Link href={`/ebook/reader/${book.id}`}>
                      <BookOpen className="w-4 h-4 mr-1.5" />免费阅读
                    </Link>
                  </Button>
                ) : (
                  <Button className="flex-1 h-11 rounded-full text-white" style={{ background: EBOOK_ACCENT }} asChild>
                    <Link href={`/ebook/checkout/${book.id}`}>¥{book.price} 立即购买</Link>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* 书友讨论抽屉 */}
      <CommentSheet
        open={showComments}
        onClose={() => setShowComments(false)}
        title={book.title}
        scope="book"
        initialComments={BOOK_COMMENTS}
        accentColor={EBOOK_ACCENT}
      />
    </div>
  )
}
