"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  MessageSquare,
  ChevronRight,
  Search,
  Trash2,
  Share2,
  Download,
  Highlighter,
  PenLine,
} from "lucide-react"
import Link from "next/link"

type NoteType = "highlight" | "note"

interface NoteItem {
  id: string
  type: NoteType
  bookId: string
  bookTitle: string
  bookCoverColor: string
  chapterId: string
  chapterTitle: string
  selectedText: string
  noteContent?: string
  highlightColor?: string
  createdAt: string
}

const notesData: NoteItem[] = [
  {
    id: "n1",
    type: "note",
    bookId: "1",
    bookTitle: "八字命理精解",
    bookCoverColor: "#1e3a5f",
    chapterId: "2",
    chapterTitle: "第二章 天干地支详解",
    selectedText: "天干共有十个，分别是：甲、乙、丙、丁、戊、己、庚、辛、壬、癸。",
    noteContent: "这十个天干需要熟记，并对应五行属性：甲乙木、丙丁火、戊己土、庚辛金、壬癸水",
    createdAt: "今天 14:32",
  },
  {
    id: "n2",
    type: "highlight",
    bookId: "1",
    bookTitle: "八字命理精解",
    bookCoverColor: "#1e3a5f",
    chapterId: "3",
    chapterTitle: "第三章 五行生克制化",
    selectedText: "五行之间存在着相生相克的关系：相生：木生火，火生土，土生金，金生水，水生木",
    highlightColor: "#fef08a",
    createdAt: "昨天 09:15",
  },
  {
    id: "n3",
    type: "highlight",
    bookId: "1",
    bookTitle: "八字命理精解",
    bookCoverColor: "#1e3a5f",
    chapterId: "3",
    chapterTitle: "第三章 五行生克制化",
    selectedText: "相克：木克土，土克水，水克火，火克金，金克木",
    highlightColor: "#bbf7d0",
    createdAt: "昨天 09:18",
  },
  {
    id: "n4",
    type: "note",
    bookId: "3",
    bookTitle: "风水学基础教程",
    bookCoverColor: "#4a1942",
    chapterId: "1",
    chapterTitle: "第一章 风水学概论",
    selectedText: "风水学是中国传统文化中的重要组成部分，讲究天地人三才合一。",
    noteContent: "风水的核心思想：「气」的流动与聚散决定了居住环境的吉凶",
    createdAt: "3天前",
  },
]

function groupByBook(items: NoteItem[]) {
  return items.reduce<Record<string, NoteItem[]>>((acc, item) => {
    if (!acc[item.bookId]) acc[item.bookId] = []
    acc[item.bookId].push(item)
    return acc
  }, {})
}

type FilterType = "all" | "note" | "highlight"

export default function EbookNotesPage() {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<FilterType>("all")
  const [items, setItems] = useState(notesData)

  const filtered = items.filter((n) => {
    const matchSearch = !search || n.selectedText.includes(search) || (n.noteContent || "").includes(search)
    const matchFilter =
      filter === "all" || (filter === "note" && n.type === "note") || (filter === "highlight" && n.type === "highlight")
    return matchSearch && matchFilter
  })

  const grouped = groupByBook(filtered)

  const deleteNote = (id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id))
  }

  const totalNotes = items.filter((n) => n.type === "note").length
  const totalHighlights = items.filter((n) => n.type === "highlight").length

  return (
    <div className="min-h-screen bg-[var(--ebook-bg)]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[var(--ebook-border)]">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/ebook/bookshelf" className="p-1.5 -ml-1.5 rounded-lg hover:bg-slate-100 active:scale-95 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-semibold text-base text-[var(--ebook-text)]">笔记 & 划线</h1>
          <button className="p-1.5 rounded-lg hover:bg-slate-100 transition-all">
            <Download className="w-5 h-5 text-[var(--ebook-primary)]" />
          </button>
        </div>

        {/* Summary */}
        <div className="flex items-center gap-4 px-4 pb-3">
          <div className="flex items-center gap-1.5 text-sm text-[var(--ebook-text-soft)]">
            <PenLine className="w-4 h-4 text-[var(--ebook-primary)]" />
            <span>{totalNotes} 条笔记</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-[var(--ebook-text-soft)]">
            <Highlighter className="w-4 h-4 text-amber-500" />
            <span>{totalHighlights} 处划线</span>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索笔记内容..."
              className="w-full h-9 pl-9 pr-4 bg-slate-100 rounded-full text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[var(--ebook-primary)]"
            />
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 px-4 pb-3">
          {[
            { id: "all" as FilterType, label: "全部" },
            { id: "note" as FilterType, label: "笔记" },
            { id: "highlight" as FilterType, label: "划线" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-medium transition-all",
                filter === f.id
                  ? "bg-[var(--ebook-primary)] text-white"
                  : "bg-white border border-[var(--ebook-border)] text-[var(--ebook-text-soft)]"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 py-3 pb-8 space-y-5">
        {Object.keys(grouped).length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-200" />
            <p className="text-[var(--ebook-text-soft)] font-medium mb-1">暂无笔记</p>
            <p className="text-sm text-slate-400 mb-4">在阅读时选中文字，可以划线或添加笔记</p>
            <Button className="bg-[var(--ebook-primary)]" asChild>
              <Link href="/ebook/bookshelf">去阅读</Link>
            </Button>
          </div>
        ) : (
          Object.entries(grouped).map(([bookId, notes]) => {
            const book = notes[0]
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
                    <p className="text-xs text-[var(--ebook-text-soft)]">{notes.length} 条记录</p>
                  </div>
                  <Link
                    href={`/ebook/reader/${bookId}`}
                    className="text-xs text-[var(--ebook-primary)] flex items-center gap-0.5"
                  >
                    继续读<ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="bg-white rounded-xl border border-[var(--ebook-border)] overflow-hidden divide-y divide-[var(--ebook-border)]">
                  {notes.map((note) => (
                    <div key={note.id} className="px-4 py-4 group">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          {note.type === "highlight" ? (
                            <Highlighter className="w-3.5 h-3.5 text-amber-500" />
                          ) : (
                            <PenLine className="w-3.5 h-3.5 text-[var(--ebook-primary)]" />
                          )}
                          <span className="text-xs text-[var(--ebook-text-soft)]">{note.chapterTitle}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-1 rounded hover:bg-slate-100">
                            <Share2 className="w-3 h-3 text-slate-400" />
                          </button>
                          <button onClick={() => deleteNote(note.id)} className="p-1 rounded hover:bg-red-50">
                            <Trash2 className="w-3 h-3 text-red-400" />
                          </button>
                        </div>
                      </div>

                      {/* Selected text with highlight */}
                      <div
                        className="text-sm text-[var(--ebook-text)] leading-relaxed px-3 py-2 rounded-lg mb-2 border-l-4"
                        style={{
                          background: note.highlightColor ? note.highlightColor + "40" : "#eff6ff",
                          borderLeftColor: note.highlightColor || "var(--ebook-primary)",
                        }}
                      >
                        {note.selectedText}
                      </div>

                      {/* Note content */}
                      {note.noteContent && (
                        <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                          <p className="text-xs text-[var(--ebook-text-soft)] mb-1 flex items-center gap-1">
                            <PenLine className="w-3 h-3" />笔记
                          </p>
                          <p className="text-sm text-[var(--ebook-text)] leading-relaxed">{note.noteContent}</p>
                        </div>
                      )}

                      <p className="text-[10px] text-slate-400 mt-2">{note.createdAt}</p>
                    </div>
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
