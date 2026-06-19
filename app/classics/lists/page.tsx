"use client"

import { useState } from "react"
import Link from "next/link"
import { Heart, Share2, Plus, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { ClassicsHeader, FlatCover, coverColorForBook, type CoverColor } from "@/components/classics"

interface BookList {
  id: string
  title: string
  author: string
  bookCount: number
  likes: number
  desc: string
  tags: string[]
  liked: boolean
  color: CoverColor
  books: { title: string; color: CoverColor }[]
}

const bookLists: BookList[] = [
  {
    id: "1", title: "命理入门必读书单", author: "周易大师", bookCount: 12, likes: 3420,
    desc: "从零开始学命理，精选入门到进阶书目", tags: ["命理", "八字", "入门"], liked: true, color: "brown",
    books: [{ title: "滴天髓", color: "gray" }, { title: "子平真诠", color: "blue" }, { title: "穷通宝鉴", color: "brown" }],
  },
  {
    id: "2", title: "风水经典传世之作", author: "王德华", bookCount: 8, likes: 2156,
    desc: "风水学不可不读的经典著作精选", tags: ["风水", "堪舆"], liked: false, color: "green",
    books: [{ title: "葬经", color: "green" }, { title: "阳宅三要", color: "cream" }, { title: "地理五诀", color: "blue" }],
  },
  {
    id: "3", title: "易经原典研读书单", author: "李玄机", bookCount: 6, likes: 1843,
    desc: "系统研读易经原典的推荐书目", tags: ["易经", "原典"], liked: false, color: "cream",
    books: [{ title: "周易", color: "cream" }, { title: "易传", color: "brown" }, { title: "梅花易数", color: "red" }],
  },
  {
    id: "4", title: "国学文化综合推荐", author: "儒布官方", bookCount: 20, likes: 5678,
    desc: "国学文化爱好者必读的综合书单", tags: ["国学", "文化"], liked: true, color: "red",
    books: [{ title: "论语", color: "red" }, { title: "道德经", color: "green" }, { title: "庄子", color: "cream" }],
  },
  {
    id: "5", title: "诗词古籍鉴赏入门", author: "陈梅花", bookCount: 10, likes: 1320,
    desc: "诗词古籍赏析与学习的推荐阅读路径", tags: ["诗词", "古籍"], liked: false, color: "blue",
    books: [{ title: "楚辞", color: "red" }, { title: "李太白集", color: "blue" }, { title: "漱玉词", color: "brown" }],
  },
]

export default function ClassicsListsPage() {
  const [lists, setLists] = useState(bookLists)

  const toggleLike = (id: string) =>
    setLists((prev) =>
      prev.map((l) => (l.id === id ? { ...l, liked: !l.liked, likes: l.liked ? l.likes - 1 : l.likes + 1 } : l)),
    )

  return (
    <div className="min-h-screen bg-[#f4f2ee] dark:bg-background pb-20 sm:pb-10">
      <ClassicsHeader
        title="精选书单"
        rightSlot={
          <button className="flex items-center gap-1 text-[13px] text-[#c41e3a] dark:text-amber-400 font-medium">
            <Plus className="w-4 h-4" />创建
          </button>
        }
      />

      <main className="max-w-screen-xl mx-auto">
        {/* Hero */}
        <section className="px-5 sm:px-6 pt-2 pb-4">
          <p className="text-[13px] font-semibold tracking-wide text-[#c41e3a] dark:text-amber-400 mb-1.5">名家甄选</p>
          <h2 className="text-[34px] leading-[1.1] font-bold tracking-tight text-foreground">循路而读</h2>
          <p className="text-[14px] text-muted-foreground mt-2">编辑与达人整理的主题书单，少走弯路。</p>
        </section>

        <section className="px-5 sm:px-6 space-y-4">
          {lists.map((list) => (
            <div key={list.id} className="rounded-3xl bg-card shadow-sm ring-1 ring-black/[0.04] dark:ring-white/5 overflow-hidden">
              <Link href={`/classics/collection/${list.id}`} className="block p-5 active:bg-muted/30 transition-colors">
                <h3 className="font-bold text-[18px] text-foreground">{list.title}</h3>
                <p className="text-[12px] text-muted-foreground mt-0.5">@{list.author} · {list.bookCount} 本书</p>
                <p className="text-[13px] text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{list.desc}</p>
                {/* 书封陈列 */}
                <div className="flex items-end gap-2.5 mt-4">
                  {list.books.map((b, i) => (
                    <FlatCover key={i} title={b.title} coverColor={coverColorForBook(b.title)} className="flex-1 max-w-[80px]" titleClassName="text-sm" />
                  ))}
                  <div className="flex-1 max-w-[72px] aspect-[3/4] rounded-2xl bg-muted flex flex-col items-center justify-center text-muted-foreground">
                    <span className="text-[15px] font-bold tabular-nums">+{list.bookCount - list.books.length}</span>
                    <span className="text-[10px]">本</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {list.tags.map((tag) => (
                    <span key={tag} className="text-[11px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">#{tag}</span>
                  ))}
                </div>
              </Link>
              <div className="flex items-center gap-4 px-5 py-3 border-t border-border/60">
                <button onClick={() => toggleLike(list.id)} className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                  <Heart className={cn("w-4 h-4", list.liked && "text-[#c41e3a] fill-[#c41e3a]")} />
                  {list.likes.toLocaleString()}
                </button>
                <button className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                  <Share2 className="w-4 h-4" />分享
                </button>
                <Link href={`/classics/collection/${list.id}`} className="ml-auto flex items-center gap-0.5 text-[13px] text-[#c41e3a] dark:text-amber-400 font-medium">
                  查看书单<ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  )
}
