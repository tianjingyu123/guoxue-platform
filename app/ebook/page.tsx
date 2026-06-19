"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft, Search, Star, BookOpen, Flame, Clock, TrendingUp,
  Crown, ChevronRight, Bookmark, Sparkles,
} from "lucide-react"
import Link from "next/link"
import { FlatBookCover, type EbookCoverColor as CoverColor } from "@/components/ebook"

const ebooks = [
  { id: "1", title: "八字命理精解", author: "李明华", color: "brown" as CoverColor, price: 68, originalPrice: 128, rating: 4.8, reviewCount: 2340, salesCount: 12800, category: "命理", isHot: true, isNew: false, isMemberFree: false, isFree: false },
  { id: "2", title: "易经入门与实践", author: "王道玄", color: "blue" as CoverColor, price: 0, originalPrice: 0, rating: 4.9, reviewCount: 5680, salesCount: 45000, category: "经典", isHot: true, isNew: false, isMemberFree: false, isFree: true },
  { id: "3", title: "风水学基础教程", author: "张天师", color: "green" as CoverColor, price: 88, originalPrice: 168, rating: 4.7, reviewCount: 1890, salesCount: 8900, category: "风水", isHot: false, isNew: true, isMemberFree: true, isFree: false },
  { id: "4", title: "六爻预测学完全指南", author: "陈易卦", color: "red" as CoverColor, price: 58, originalPrice: 98, rating: 4.6, reviewCount: 1230, salesCount: 5600, category: "术数", isHot: false, isNew: false, isMemberFree: false, isFree: false },
  { id: "5", title: "紫微斗数全书", author: "紫微居士", color: "purple" as CoverColor, price: 128, originalPrice: 258, rating: 4.9, reviewCount: 3450, salesCount: 18900, category: "命理", isHot: true, isNew: false, isMemberFree: true, isFree: false },
  { id: "6", title: "道德经白话详解", author: "老庄书院", color: "teal" as CoverColor, price: 0, originalPrice: 0, rating: 4.8, reviewCount: 8900, salesCount: 68000, category: "经典", isHot: true, isNew: false, isMemberFree: false, isFree: true },
]

const categories = [
  { id: "all", name: "全部" },
  { id: "mingli", name: "命理" },
  { id: "classic", name: "经典" },
  { id: "fengshui", name: "风水" },
  { id: "shushu", name: "术数" },
  { id: "health", name: "养生" },
]

const sortOptions = [
  { id: "hot", name: "热门", icon: Flame },
  { id: "new", name: "最新", icon: Clock },
  { id: "top", name: "好评", icon: TrendingUp },
]

export default function EbookListPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState("all")
  const [activeSort, setActiveSort] = useState("hot")

  const filteredEbooks = ebooks.filter((b) => {
    const matchCat =
      activeCategory === "all" ||
      (activeCategory === "mingli" && b.category === "命理") ||
      (activeCategory === "classic" && b.category === "经典") ||
      (activeCategory === "fengshui" && b.category === "风水") ||
      (activeCategory === "shushu" && b.category === "术数")
    const matchSearch = !searchQuery || b.title.includes(searchQuery) || b.author.includes(searchQuery)
    return matchCat && matchSearch
  })

  const featured = ebooks[1]

  return (
    <div className="min-h-screen bg-[var(--ebook-bg)]">
      {/* 顶部导航 - 毛玻璃 */}
      <header className="sticky top-0 z-50 bg-[var(--ebook-bg)]/85 backdrop-blur-xl">
        <div className="flex items-center gap-2 px-4 h-14">
          <Link href="/" className="w-9 h-9 -ml-1.5 rounded-full flex items-center justify-center active:bg-black/5 transition-colors">
            <ArrowLeft className="w-5 h-5 text-[var(--ebook-text)]" />
          </Link>
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ebook-text-soft)]" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索电子书、作者…"
              className="w-full pl-10 pr-4 h-9 bg-black/[0.05] rounded-full text-sm text-[var(--ebook-text)] placeholder:text-[var(--ebook-text-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--ebook-primary)]/25"
            />
          </div>
          <Link href="/ebook/bookshelf" className="w-9 h-9 -mr-1.5 rounded-full flex items-center justify-center active:bg-black/5 transition-colors">
            <Bookmark className="w-5 h-5 text-[var(--ebook-text)]" />
          </Link>
        </div>
      </header>

      <main className="px-5 pb-10">
        {/* 编辑式大标题 */}
        <section className="pt-3 pb-5">
          <h1 className="text-[32px] leading-[1.1] font-serif font-bold tracking-tight text-[var(--ebook-text)] text-balance">
            电子书馆
          </h1>
          <p className="text-[15px] text-[var(--ebook-text-soft)] mt-1.5">精品好书，随身畅读</p>
        </section>

        {/* 会员主打大卡 - App Store Today 风格 */}
        <Link href="/vip" className="block mb-7">
          <div className="relative rounded-3xl overflow-hidden p-5 shadow-sm" style={{ background: "linear-gradient(135deg, #2d3a8c, #1e2660)" }}>
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 mb-2">
                  <Crown className="w-3.5 h-3.5" />VIP 会员
                </span>
                <h2 className="text-white text-[20px] font-bold leading-tight text-balance">开通会员 畅读全场</h2>
                <p className="text-white/70 text-[13px] mt-1">数百本精品电子书 免费畅读</p>
              </div>
              <Button className="flex-shrink-0 bg-white text-[#1e2660] hover:bg-white/90 font-bold rounded-full px-5 h-9">
                立即开通
              </Button>
            </div>
          </div>
        </Link>

        {/* 编辑精选 */}
        <section className="mb-7">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-[var(--ebook-primary)]" />
            <h2 className="text-[19px] font-bold tracking-tight text-[var(--ebook-text)]">编辑精选</h2>
          </div>
          <Link href={`/ebook/${featured.id}`}>
            <div className="rounded-2xl bg-[var(--ebook-card)] p-4 shadow-sm ring-1 ring-black/[0.04] flex gap-4 active:scale-[0.99] transition-transform">
              <FlatBookCover title={featured.title} author={featured.author} color={featured.color} className="w-24 aspect-[3/4] flex-shrink-0" />
              <div className="flex-1 min-w-0 flex flex-col">
                <span className="text-[11px] font-medium text-[var(--ebook-free)]">限时免费</span>
                <h3 className="text-[17px] font-bold text-[var(--ebook-text)] mt-1 leading-snug">{featured.title}</h3>
                <p className="text-[13px] text-[var(--ebook-text-soft)] mt-1">{featured.author}</p>
                <div className="flex items-center gap-1 mt-2">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-[13px] font-semibold text-[var(--ebook-text)]">{featured.rating}</span>
                  <span className="text-[11px] text-[var(--ebook-text-soft)]">· {(featured.salesCount / 1000).toFixed(0)}k人在读</span>
                </div>
                <div className="mt-auto pt-2">
                  <span className="inline-flex items-center gap-1 text-[14px] font-semibold text-[var(--ebook-primary)]">
                    立即阅读 <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </section>

        {/* 分类筛选 */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5 mb-4">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "flex-shrink-0 px-4 py-1.5 rounded-full text-[13px] font-medium transition-all",
                activeCategory === cat.id
                  ? "bg-[var(--ebook-primary)] text-white shadow-sm"
                  : "bg-black/[0.05] text-[var(--ebook-text-soft)]"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* 排序 */}
        <div className="flex gap-1 mb-4">
          {sortOptions.map((opt) => {
            const Icon = opt.icon
            return (
              <button
                key={opt.id}
                onClick={() => setActiveSort(opt.id)}
                className={cn(
                  "flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all",
                  activeSort === opt.id ? "bg-[var(--ebook-primary-soft)] text-[var(--ebook-primary)]" : "text-[var(--ebook-text-soft)]"
                )}
              >
                <Icon className="w-3.5 h-3.5" />{opt.name}
              </button>
            )
          })}
        </div>

        {/* 全部书籍 - 大封面网格 */}
        <section>
          <h2 className="text-[19px] font-bold tracking-tight text-[var(--ebook-text)] mb-3.5">全部好书</h2>
          {filteredEbooks.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-[var(--ebook-text-soft)]/40" />
              <p className="text-[var(--ebook-text-soft)]">没有找到相关电子书</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-x-4 gap-y-6">
              {filteredEbooks.map((book) => (
                <Link key={book.id} href={`/ebook/${book.id}`} className="group">
                  <div className="relative">
                    <FlatBookCover title={book.title} author={book.author} color={book.color} className="w-full aspect-[3/4] transition-transform group-active:scale-[0.97]" />
                    {book.isMemberFree && (
                      <span className="absolute top-1.5 right-1.5 bg-[var(--ebook-member)] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md leading-none">会员</span>
                    )}
                    {book.isFree && !book.isMemberFree && (
                      <span className="absolute top-1.5 right-1.5 bg-[var(--ebook-free)] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md leading-none">免费</span>
                    )}
                  </div>
                  <p className="text-[13px] font-medium text-[var(--ebook-text)] line-clamp-1 mt-2">{book.title}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {book.isFree ? (
                      <span className="text-[13px] font-bold text-[var(--ebook-free)]">免费</span>
                    ) : book.isMemberFree ? (
                      <span className="text-[12px] font-bold text-[var(--ebook-member)]">会员免费</span>
                    ) : (
                      <span className="text-[13px] font-bold text-[var(--ebook-price)]">¥{book.price}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
