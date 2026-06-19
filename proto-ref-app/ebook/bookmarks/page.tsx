"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  Bookmark,
  BookOpen,
  Trash2,
  ChevronRight,
  Search,
} from "lucide-react"
import Link from "next/link"

interface BookmarkItem {
  id: string
  bookId: string
  bookTitle: string
  bookCoverColor: string
  chapterId: string
  chapterTitle: string
  text: string      // first line of context
  pageNum: number
  createdAt: string
}

const bookmarks: BookmarkItem[] = [
  {
    id: "bm1",
    bookId: "1",
    bookTitle: "八字命理精解",
    bookCoverColor: "#1e3a5f",
    chapterId: "2",
    chapterTitle: "第二章 天干地支详解",
    text: "天干共有十个，分别是：甲、乙、丙、丁、戊、己、庚、辛、壬、癸。",
    pageNum: 45,
    createdAt: "今天 14:32",
  },
  {
    id: "bm2",
    bookId: "1",
    bookTitle: "八字命理精解",
    bookCoverColor: "#1e3a5f",
    chapterId: "3",
    chapterTitle: "第三章 五行生克制化",
    text: "五行之间存在着相生相克的关系，理解这一原理是学习八字命理的第一步。",
    pageNum: 78,
    createdAt: "昨天 09:15",
  },
  {
    id: "bm3",
    bookId: "3",
    bookTitle: "风水学基础教程",
    bookCoverColor: "#4a1942",
    chapterId: "1",
    chapterTitle: "第一章 风水学概论",
    text: "风水学是中国传统文化中的重要组成部分，讲究天地人三才合一。",
    pageNum: 12,
    createdAt: "3天前",
  },
  {
    id: "bm4",
    bookId: "5",
    bookTitle: "紫微斗数全书",
    bookCoverColor: "#1e3a5f",
    chapterId: "2",
    chapterTitle: "第二章 十四主星详解",
    text: "紫微星是斗数之首，入命宫主贵气，其人多有才华，气宇不凡。",
    pageNum: 56,
    createdAt: "1周前",
  },
]

// Group by book
function groupByBook(items: BookmarkItem[]) {
  return items.reduce<Record<string, BookmarkItem[]>>((acc, item) => {
    if (!acc[item.bookId]) acc[item.bookId] = []
    acc[item.bookId].push(item)
    return acc
  }, {})
}

export default function EbookBookmarksPage() {
  const [search, setSearch] = useState("")
  const [items, setItems] = useState(bookmarks)

  const filtered = items.filter(
    (b) =>
      !search ||
      b.bookTitle.includes(search) ||
      b.text.includes(search) ||
      b.chapterTitle.includes(search)
  )

  const grouped = groupByBook(filtered)

  const deleteBookmark = (id: string) => {
    setItems((prev) => prev.filter((b) => b.id !== id))
  }

  return (
    <div className="min-h-screen bg-[var(--ebook-bg)]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[var(--ebook-border)]">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/ebook/bookshelf" className="p-1.5 -ml-1.5 rounded-lg hover:bg-slate-100 active:scale-95 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-semibold text-base text-[var(--ebook-text)]">书签管理</h1>
          <span className="text-xs text-[var(--ebook-text-soft)]">{items.length} 个</span>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索书签..."
              className="w-full h-9 pl-9 pr-4 bg-slate-100 rounded-full text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[var(--ebook-primary)]"
            />
          </div>
        </div>
      </header>

      <main className="px-4 py-3 pb-8 space-y-5">
        {Object.keys(grouped).length === 0 ? (
          <div className="text-center py-16">
            <Bookmark className="w-12 h-12 mx-auto mb-3 text-slate-200" />
            <p className="text-[var(--ebook-text-soft)] font-medium mb-1">暂无书签</p>
            <p className="text-sm text-slate-400 mb-4">在阅读时点击书签按钮保存位置</p>
            <Button className="bg-[var(--ebook-primary)]" asChild>
              <Link href="/ebook/bookshelf">去阅读</Link>
            </Button>
          </div>
        ) : (
          Object.entries(grouped).map(([bookId, bms]) => {
            const book = bms[0]
            return (
              <div key={bookId}>
                {/* Book header */}
                <div className="flex items-center gap-2.5 mb-2">
                  <div
                    className="w-8 h-[46px] rounded shadow-sm flex-shrink-0 relative overflow-hidden"
                    style={{ background: book.bookCoverColor }}
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-white/20" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-[var(--ebook-text)] line-clamp-1">{book.bookTitle}</h3>
                    <p className="text-xs text-[var(--ebook-text-soft)]">{bms.length} 个书签</p>
                  </div>
                  <Link
                    href={`/ebook/reader/${bookId}`}
                    className="text-xs text-[var(--ebook-primary)] flex items-center gap-0.5"
                  >
                    继续读<ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Bookmarks list */}
                <div className="bg-white rounded-xl border border-[var(--ebook-border)] overflow-hidden divide-y divide-[var(--ebook-border)]">
                  {bms.map((bm) => (
                    <Link
                      key={bm.id}
                      href={`/ebook/reader/${bm.bookId}?chapter=${bm.chapterId}`}
                      className="flex items-start gap-3 px-4 py-3.5 hover:bg-slate-50 transition-all group"
                    >
                      <Bookmark className="w-4 h-4 text-[var(--ebook-primary)] flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[var(--ebook-text-soft)] mb-1">{bm.chapterTitle} · 第{bm.pageNum}页</p>
                        <p className="text-sm text-[var(--ebook-text)] line-clamp-2 leading-relaxed">{bm.text}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{bm.createdAt}</p>
                      </div>
                      <button
                        onClick={(e) => { e.preventDefault(); deleteBookmark(bm.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 transition-all text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </main>
    </div>
  )
}
