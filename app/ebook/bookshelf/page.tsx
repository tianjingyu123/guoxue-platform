"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  BookOpen,
  Search,
  Grid3X3,
  List,
  Clock,
  MoreVertical,
  Download,
  BookMarked,
  Trash2,
  ChevronRight,
} from "lucide-react"
import Link from "next/link"

const shelfBooks = [
  {
    id: "1",
    title: "八字命理精解",
    author: "李明华",
    coverColor: "#1e3a5f",
    progress: 45,
    currentChapter: 3,
    totalChapters: 7,
    lastReadAt: "刚刚",
    isDownloaded: true,
    category: "命理",
  },
  {
    id: "5",
    title: "紫微斗数全书",
    author: "紫微居士",
    coverColor: "#1e3a5f",
    progress: 12,
    currentChapter: 1,
    totalChapters: 9,
    lastReadAt: "昨天",
    isDownloaded: false,
    category: "命理",
  },
  {
    id: "3",
    title: "风水学基础教程",
    author: "张天师",
    coverColor: "#4a1942",
    progress: 78,
    currentChapter: 6,
    totalChapters: 8,
    lastReadAt: "3天前",
    isDownloaded: true,
    category: "风水",
  },
  {
    id: "2",
    title: "易经入门与实践",
    author: "王道玄",
    coverColor: "#1a4731",
    progress: 100,
    currentChapter: 5,
    totalChapters: 5,
    lastReadAt: "1周前",
    isDownloaded: false,
    category: "经典",
  },
  {
    id: "4",
    title: "六爻预测学",
    author: "陈易卦",
    coverColor: "#3d1f00",
    progress: 0,
    currentChapter: 0,
    totalChapters: 6,
    lastReadAt: "未读",
    isDownloaded: false,
    category: "术数",
  },
]

type FilterType = "all" | "reading" | "finished" | "unread"

function BookCover({ color, title, className }: { color: string; title: string; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg shadow-md", className)} style={{ background: color }}>
      <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-white/10" />
      <div className="absolute inset-0 flex items-center justify-center p-1.5">
        <p className="text-white/80 font-semibold text-[10px] text-center leading-snug line-clamp-4">{title}</p>
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-white/8 to-transparent pointer-events-none" />
    </div>
  )
}

export default function EbookBookshelfPage() {
  const [filter, setFilter] = useState<FilterType>("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [activeBookMenu, setActiveBookMenu] = useState<string | null>(null)

  const filters: { id: FilterType; label: string }[] = [
    { id: "all", label: "全部" },
    { id: "reading", label: "阅读中" },
    { id: "finished", label: "已读完" },
    { id: "unread", label: "未读" },
  ]

  const filtered = shelfBooks.filter((b) => {
    if (filter === "reading") return b.progress > 0 && b.progress < 100
    if (filter === "finished") return b.progress === 100
    if (filter === "unread") return b.progress === 0
    return true
  })

  // Sort: recent first (non-zero progress first, then unread)
  const sorted = [...filtered].sort((a, b) => {
    if (a.progress > 0 && b.progress === 0) return -1
    if (a.progress === 0 && b.progress > 0) return 1
    return 0
  })

  return (
    <div className="min-h-screen bg-[var(--ebook-bg)]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[var(--ebook-border)]">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/profile" className="p-1.5 -ml-1.5 rounded-lg hover:bg-slate-100 active:scale-95 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-semibold text-base text-[var(--ebook-text)]">我的书架</h1>
          <div className="flex items-center gap-1">
            <Link href="/ebook" className="p-1.5 rounded-lg hover:bg-slate-100 transition-all">
              <BookOpen className="w-5 h-5 text-[var(--ebook-primary)]" />
            </Link>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex border-b border-[var(--ebook-border)]">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "flex-1 py-3 text-sm font-medium transition-all border-b-2",
                filter === f.id
                  ? "border-[var(--ebook-primary)] text-[var(--ebook-primary)]"
                  : "border-transparent text-[var(--ebook-text-soft)] hover:text-[var(--ebook-text)]"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* View toggle + count */}
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-xs text-[var(--ebook-text-soft)]">共 {sorted.length} 本</span>
          <div className="flex gap-0.5 p-0.5 bg-slate-100 rounded-lg">
            <button
              onClick={() => setViewMode("grid")}
              className={cn("p-1.5 rounded-md transition-all", viewMode === "grid" ? "bg-white shadow-sm text-[var(--ebook-primary)]" : "text-slate-500")}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn("p-1.5 rounded-md transition-all", viewMode === "list" ? "bg-white shadow-sm text-[var(--ebook-primary)]" : "text-slate-500")}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-3 pb-8">
        {sorted.length === 0 ? (
          <div className="text-center py-20">
            <BookMarked className="w-14 h-14 mx-auto mb-4 text-slate-200" />
            <p className="text-[var(--ebook-text-soft)] font-medium mb-1">书架空空如也</p>
            <p className="text-sm text-slate-400 mb-4">去买几本好书吧</p>
            <Button className="bg-[var(--ebook-primary)] hover:bg-[var(--ebook-primary)]/90" asChild>
              <Link href="/ebook">浏览电子书</Link>
            </Button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
            {sorted.map((book) => (
              <GridShelfCard
                key={book.id}
                book={book}
                isMenuOpen={activeBookMenu === book.id}
                onMenuToggle={(id) => setActiveBookMenu(activeBookMenu === id ? null : id)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((book) => (
              <ListShelfCard
                key={book.id}
                book={book}
                isMenuOpen={activeBookMenu === book.id}
                onMenuToggle={(id) => setActiveBookMenu(activeBookMenu === id ? null : id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function GridShelfCard({
  book,
  isMenuOpen,
  onMenuToggle,
}: {
  book: (typeof shelfBooks)[0]
  isMenuOpen: boolean
  onMenuToggle: (id: string) => void
}) {
  return (
    <div className="relative group">
      <Link href={`/ebook/reader/${book.id}`} className="block">
        <div className="relative">
          <BookCover color={book.coverColor} title={book.title} className="w-full aspect-[2/3]" />
          {/* Progress overlay at bottom */}
          {book.progress > 0 && book.progress < 100 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30 rounded-b-lg overflow-hidden">
              <div
                className="h-full bg-[var(--ebook-primary)] transition-all"
                style={{ width: `${book.progress}%` }}
              />
            </div>
          )}
          {book.progress === 100 && (
            <div className="absolute top-1.5 right-1.5 bg-[var(--ebook-free)] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm">
              已读完
            </div>
          )}
          {book.isDownloaded && (
            <div className="absolute bottom-1.5 right-1.5 bg-black/40 rounded-full p-0.5">
              <Download className="w-2.5 h-2.5 text-white" />
            </div>
          )}
        </div>
        <div className="mt-2">
          <p className="text-[12px] font-medium text-[var(--ebook-text)] line-clamp-2 leading-snug">{book.title}</p>
          <div className="flex items-center justify-between mt-0.5">
            <p className="text-[10px] text-[var(--ebook-text-soft)]">
              {book.progress === 0 ? "未读" : book.progress === 100 ? "已读完" : `${book.progress}%`}
            </p>
            <p className="text-[10px] text-[var(--ebook-text-soft)] flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />{book.lastReadAt}
            </p>
          </div>
        </div>
      </Link>
      {/* Context menu button */}
      <button
        onClick={(e) => { e.preventDefault(); onMenuToggle(book.id); }}
        className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-full p-0.5"
      >
        <MoreVertical className="w-3 h-3 text-white" />
      </button>
      {isMenuOpen && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-white rounded-xl shadow-xl border border-[var(--ebook-border)] p-2 space-y-1">
          <button className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 rounded-lg flex items-center gap-2">
            <Download className="w-3.5 h-3.5 text-[var(--ebook-primary)]" />
            {book.isDownloaded ? "已下载" : "下载离线"}
          </button>
          <button className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 rounded-lg flex items-center gap-2 text-red-500">
            <Trash2 className="w-3.5 h-3.5" />
            移出书架
          </button>
        </div>
      )}
    </div>
  )
}

function ListShelfCard({
  book,
  isMenuOpen,
  onMenuToggle,
}: {
  book: (typeof shelfBooks)[0]
  isMenuOpen: boolean
  onMenuToggle: (id: string) => void
}) {
  return (
    <div className="bg-white rounded-xl border border-[var(--ebook-border)] overflow-hidden">
      <Link href={`/ebook/reader/${book.id}`} className="flex gap-3 p-3">
        <BookCover color={book.coverColor} title={book.title} className="w-[56px] h-[84px] flex-shrink-0" />
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div>
            <h3 className="text-[14px] font-semibold text-[var(--ebook-text)] line-clamp-1">{book.title}</h3>
            <p className="text-xs text-[var(--ebook-text-soft)] mt-0.5">{book.author} · {book.category}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Clock className="w-3 h-3 text-slate-400" />
              <span className="text-xs text-slate-400">{book.lastReadAt}</span>
              {book.isDownloaded && (
                <Badge className="text-[9px] px-1 py-0 h-4 bg-[var(--ebook-primary-soft)] text-[var(--ebook-primary)] border-0">
                  <Download className="w-2.5 h-2.5 mr-0.5" />
                  已下载
                </Badge>
              )}
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[var(--ebook-text-soft)]">
                {book.progress === 0
                  ? "未读"
                  : book.progress === 100
                  ? "已读完"
                  : `已读 ${book.progress}% · 第${book.currentChapter}章`}
              </span>
              <span className="text-[10px] text-[var(--ebook-text-soft)]">{book.totalChapters}章</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  book.progress === 100 ? "bg-[var(--ebook-free)]" : "bg-[var(--ebook-primary)]"
                )}
                style={{ width: `${book.progress}%` }}
              />
            </div>
          </div>
        </div>
        <button
          onClick={(e) => { e.preventDefault(); onMenuToggle(book.id); }}
          className="self-start p-1 -mr-1 rounded-lg hover:bg-slate-100 transition-all"
        >
          <MoreVertical className="w-4 h-4 text-slate-400" />
        </button>
      </Link>
      {isMenuOpen && (
        <div className="border-t border-[var(--ebook-border)] flex divide-x divide-[var(--ebook-border)]">
          <button className="flex-1 py-2.5 text-xs text-[var(--ebook-primary)] flex items-center justify-center gap-1 hover:bg-slate-50">
            <Download className="w-3.5 h-3.5" />{book.isDownloaded ? "已下载" : "下载"}
          </button>
          <Link href={`/ebook/${book.id}`} className="flex-1 py-2.5 text-xs text-[var(--ebook-text-soft)] flex items-center justify-center gap-1 hover:bg-slate-50">
            <BookOpen className="w-3.5 h-3.5" />详情
          </Link>
          <button className="flex-1 py-2.5 text-xs text-red-500 flex items-center justify-center gap-1 hover:bg-red-50">
            <Trash2 className="w-3.5 h-3.5" />移出
          </button>
        </div>
      )}
    </div>
  )
}
