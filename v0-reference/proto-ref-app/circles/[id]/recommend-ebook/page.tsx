"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Search, Plus, Check, X, BookOpen, Star, Users, Crown, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// Mock 圈子信息
const circleInfo = {
  id: "1",
  name: "八字命理研习圈",
}

// Mock 书库（平台全量电子书）
const allBooks = [
  { id: "1",  title: "《滴天髓》白话精解",    author: "古籍研究院",  cover: "", price: 68,   rating: 4.9, readers: 8560,  isMemberFree: false, isRecommended: true  },
  { id: "2",  title: "《穷通宝鉴》注解版",    author: "命理古籍馆",  cover: "", price: 0,    rating: 4.7, readers: 5280,  isMemberFree: true,  isRecommended: false },
  { id: "3",  title: "八字实战案例精选 100例", author: "玄微子",      cover: "", price: 48,   rating: 4.8, readers: 12800, isMemberFree: false, isRecommended: true  },
  { id: "4",  title: "紫微斗数入门到精通",    author: "星命研究所",  cover: "", price: 58,   rating: 4.6, readers: 7320,  isMemberFree: false, isRecommended: false },
  { id: "5",  title: "《三命通会》现代解析",  author: "传统命学院",  cover: "", price: 38,   rating: 4.5, readers: 4160,  isMemberFree: true,  isRecommended: false },
  { id: "6",  title: "六爻预测实战手册",      author: "易学大师",    cover: "", price: 42,   rating: 4.7, readers: 6890,  isMemberFree: false, isRecommended: false },
  { id: "7",  title: "四柱预测学精讲",        author: "邵伟华传承",  cover: "", price: 0,    rating: 4.8, readers: 15600, isMemberFree: false, isRecommended: false },
  { id: "8",  title: "命理十神详解",          author: "玄微子",      cover: "", price: 29,   rating: 4.9, readers: 9320,  isMemberFree: true,  isRecommended: false },
]

// 封面色（无图时）
const coverColors = [
  "#1e3a5f","#1a4731","#4a1942","#3d1f00",
  "#2d3561","#1e3a2f","#3a1a1a","#1a2a4a",
]

function BookCover({ book, size = "md" }: { book: typeof allBooks[0]; size?: "sm" | "md" }) {
  const color = coverColors[parseInt(book.id) % coverColors.length]
  const dim = size === "sm" ? "w-10 h-14" : "w-14 h-20"
  if (book.cover) {
    return <img src={book.cover} alt="" className={cn(dim, "object-cover rounded")} />
  }
  return (
    <div className={cn(dim, "rounded flex items-center justify-center shrink-0")} style={{ backgroundColor: color }}>
      <BookOpen className="w-4 h-4 text-white/60" />
    </div>
  )
}

export default function RecommendEbookPage() {
  const router = useRouter()
  const params = useParams()
  const circleId = params.id as string

  const [search, setSearch] = useState("")
  const [recommended, setRecommended] = useState<Set<string>>(
    new Set(allBooks.filter(b => b.isRecommended).map(b => b.id))
  )
  const [activeTab, setActiveTab] = useState<"search" | "recommended">("recommended")
  const [isSaving, setIsSaving] = useState(false)

  const filteredBooks = allBooks.filter(b =>
    b.title.includes(search) || b.author.includes(search)
  )

  const recommendedBooks = allBooks.filter(b => recommended.has(b.id))

  function toggleRecommend(bookId: string) {
    setRecommended(prev => {
      const next = new Set(prev)
      if (next.has(bookId)) {
        next.delete(bookId)
      } else {
        if (next.size >= 12) return prev // 最多12本
        next.add(bookId)
      }
    return next
    })
  }

  async function handleSave() {
    setIsSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setIsSaving(false)
    router.back()
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--ebook-bg)", color: "var(--ebook-text)" }}>

      {/* 顶部栏 */}
      <header className="sticky top-0 z-50 border-b px-4 py-3 flex items-center justify-between bg-white/95 backdrop-blur-sm" style={{ borderColor: "var(--ebook-border)" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" style={{ color: "var(--ebook-text-soft)" }} />
          </button>
          <div>
            <h1 className="text-[15px] font-bold" style={{ color: "var(--ebook-text)" }}>推荐电子书</h1>
            <p className="text-[11px]" style={{ color: "var(--ebook-text-soft)" }}>{circleInfo.name}</p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
          style={{ backgroundColor: "var(--ebook-primary)", color: "#fff" }}
          className="h-8 px-4 text-xs"
        >
          {isSaving ? "保存中…" : "保存"}
        </Button>
      </header>

      {/* 说明提示 */}
      <div className="mx-4 mt-3 mb-2 px-3 py-2 rounded-lg flex items-center gap-2 text-[12px]"
        style={{ backgroundColor: "var(--ebook-primary-soft)", color: "var(--ebook-primary)" }}>
        <Crown className="w-3.5 h-3.5 shrink-0" />
        <span>圈主推荐的电子书将显示在圈子首页，吸引成员购买阅读（最多 12 本）</span>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1 mx-4 mt-3 mb-1">
        {(["recommended", "search"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-2 text-[13px] font-medium rounded-lg transition-colors",
              activeTab === tab
                ? "text-white"
                : "text-[var(--ebook-text-soft)] bg-white"
            )}
            style={activeTab === tab ? { backgroundColor: "var(--ebook-primary)" } : {}}
          >
            {tab === "recommended"
              ? `已推荐 (${recommended.size}/12)`
              : "选书"}
          </button>
        ))}
      </div>

      {/* 选书 Tab */}
      {activeTab === "search" && (
        <div className="px-4 pb-8">
          <div className="relative my-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--ebook-text-soft)" }} />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索书名、作者…"
              className="pl-9 border-0 bg-white"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
            />
          </div>

          <div className="space-y-2">
            {filteredBooks.map(book => {
              const isSelected = recommended.has(book.id)
              return (
                <div
                  key={book.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl bg-white transition-all",
                    isSelected ? "ring-1" : ""
                  )}
                  style={{
                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                    ...(isSelected ? { ringColor: "var(--ebook-primary)" } : {})
                  }}
                >
                  <BookCover book={book} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium line-clamp-1" style={{ color: "var(--ebook-text)" }}>{book.title}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--ebook-text-soft)" }}>{book.author}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {book.isMemberFree ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: "var(--ebook-member-soft)", color: "var(--ebook-member)" }}>
                          会员免费
                        </span>
                      ) : book.price === 0 ? (
                        <span className="text-[10px] font-bold" style={{ color: "var(--ebook-free)" }}>免费</span>
                      ) : (
                        <span className="text-[11px] font-bold" style={{ color: "var(--ebook-price)" }}>¥{book.price}</span>
                      )}
                      <span className="text-[10px] flex items-center gap-0.5" style={{ color: "var(--ebook-text-soft)" }}>
                        <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                        {book.rating}
                      </span>
                      <span className="text-[10px] flex items-center gap-0.5" style={{ color: "var(--ebook-text-soft)" }}>
                        <Users className="w-2.5 h-2.5" />{book.readers.toLocaleString()}人读过
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleRecommend(book.id)}
                    className={cn("w-7 h-7 rounded-full flex items-center justify-center transition-colors shrink-0")}
                    style={isSelected
                      ? { backgroundColor: "var(--ebook-primary)", color: "#fff" }
                      : { backgroundColor: "#f1f5f9", color: "var(--ebook-text-soft)" }
                    }
                  >
                    {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 已推荐 Tab */}
      {activeTab === "recommended" && (
        <div className="px-4 pb-8 mt-3">
          {recommendedBooks.length === 0 ? (
            <div className="text-center py-16">
              <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: "var(--ebook-primary)" }} />
              <p className="text-sm" style={{ color: "var(--ebook-text-soft)" }}>还没有推荐电子书</p>
              <p className="text-xs mt-1" style={{ color: "var(--ebook-text-soft)" }}>切换到「选书」Tab 添加推荐</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recommendedBooks.map((book, i) => (
                <div
                  key={book.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white"
                  style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
                >
                  <span className="text-[12px] font-mono w-4 shrink-0 text-center" style={{ color: "var(--ebook-text-soft)" }}>
                    {i + 1}
                  </span>
                  <BookCover book={book} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium line-clamp-1" style={{ color: "var(--ebook-text)" }}>{book.title}</p>
                    <p className="text-[11px]" style={{ color: "var(--ebook-text-soft)" }}>{book.author}</p>
                    {book.price === 0 && !book.isMemberFree ? (
                      <span className="text-[10px] font-bold" style={{ color: "var(--ebook-free)" }}>免费</span>
                    ) : book.isMemberFree ? (
                      <span className="text-[10px]" style={{ color: "var(--ebook-member)" }}>会员免费</span>
                    ) : (
                      <span className="text-[10px] font-bold" style={{ color: "var(--ebook-price)" }}>¥{book.price}</span>
                    )}
                  </div>
                  <button
                    onClick={() => toggleRecommend(book.id)}
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
