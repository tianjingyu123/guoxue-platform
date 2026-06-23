"use client"

import { useState } from "react"
import Link from "next/link"
import { Eye, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { ClassicsHeader, FlatCover, coverColorForBook, type CoverColor } from "@/components/classics"

type RankType = "hot" | "new" | "rating"

interface ClassicBook {
  id: string
  rank: number
  title: string
  author: string
  dynasty: string
  views: string
  rating: number
  category: string
  color: CoverColor
}

const books: ClassicBook[] = [
  { id: "1", rank: 1, title: "周易", author: "伏羲、周文王", dynasty: "先秦", views: "128.5万", rating: 4.9, category: "易经", color: "cream" },
  { id: "3", rank: 2, title: "滴天髓", author: "任铁樵注", dynasty: "明", views: "86.3万", rating: 4.8, category: "命理", color: "gray" },
  { id: "20", rank: 3, title: "三命通会", author: "万民英", dynasty: "明", views: "72.1万", rating: 4.8, category: "命理", color: "brown" },
  { id: "21", rank: 4, title: "紫微斗数全书", author: "陈希夷", dynasty: "宋", views: "65.4万", rating: 4.7, category: "紫微", color: "blue" },
  { id: "22", rank: 5, title: "葬经", author: "郭璞", dynasty: "晋", views: "54.8万", rating: 4.7, category: "风水", color: "green" },
  { id: "23", rank: 6, title: "奇门遁甲大全", author: "刘伯温", dynasty: "明", views: "48.2万", rating: 4.6, category: "奇门", color: "red" },
  { id: "24", rank: 7, title: "渊海子平", author: "徐大升", dynasty: "宋", views: "43.6万", rating: 4.6, category: "命理", color: "brown" },
  { id: "25", rank: 8, title: "梅花易数", author: "邵雍", dynasty: "宋", views: "38.9万", rating: 4.5, category: "预测", color: "cream" },
  { id: "26", rank: 9, title: "阳宅三要", author: "赵九峰", dynasty: "清", views: "34.2万", rating: 4.5, category: "风水", color: "green" },
  { id: "27", rank: 10, title: "地理五诀", author: "赵九峰", dynasty: "清", views: "29.8万", rating: 4.4, category: "风水", color: "blue" },
]

const RANK_TABS = [
  { key: "hot", label: "热门" },
  { key: "new", label: "最新" },
  { key: "rating", label: "评分" },
] as const

export default function ClassicsRankingPage() {
  const [rankType, setRankType] = useState<RankType>("hot")
  const top3 = books.slice(0, 3)
  const rest = books.slice(3)

  return (
    <div className="min-h-screen bg-[#f4f2ee] dark:bg-background pb-20 sm:pb-10">
      <ClassicsHeader title="推荐榜" />

      <main className="max-w-screen-xl mx-auto">
        {/* Hero */}
        <section className="px-5 sm:px-6 pt-2 pb-4">
          <p className="text-[13px] font-semibold tracking-wide text-[#c41e3a] dark:text-amber-400 mb-1.5">读者公认</p>
          <h2 className="text-[34px] leading-[1.1] font-bold tracking-tight text-foreground">传世经典榜</h2>
        </section>

        {/* 切换 */}
        <section className="px-5 sm:px-6 pb-4">
          <div className="inline-flex items-center gap-1 bg-card rounded-full p-0.5 ring-1 ring-black/[0.04] dark:ring-white/5">
            {RANK_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setRankType(t.key)}
                className={cn(
                  "h-8 px-4 rounded-full text-[13px] font-medium transition-colors",
                  rankType === t.key ? "bg-[#c41e3a] text-white dark:bg-amber-500" : "text-muted-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </section>

        {/* 三甲 - 大卡突出 */}
        <section className="px-5 sm:px-6 pb-4 grid grid-cols-3 gap-3">
          {top3.map((book) => (
            <Link key={book.id} href={`/classics/${book.id}`} className="group">
              <div className="relative">
                <FlatCover
                  title={book.title}
                  coverColor={coverColorForBook(book.title, book.category)}
                  className="w-full shadow-md transition-transform group-active:scale-[0.98]"
                  titleClassName="text-base sm:text-lg"
                />
                <span
                  className={cn(
                    "absolute -top-2 -left-2 w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[15px] shadow-md tabular-nums",
                    book.rank === 1 ? "bg-[#c41e3a]" : book.rank === 2 ? "bg-[#c9a96e]" : "bg-[#a06a38]",
                  )}
                >
                  {book.rank}
                </span>
              </div>
              <p className="mt-2 text-[13px] font-semibold text-foreground truncate text-center">{book.title}</p>
              <p className="text-[11px] text-muted-foreground/70 text-center flex items-center justify-center gap-0.5">
                <Eye className="w-3 h-3" />{book.views}
              </p>
            </Link>
          ))}
        </section>

        {/* 其余榜单 - 清单 */}
        <section className="px-5 sm:px-6">
          <div className="rounded-3xl bg-card shadow-sm ring-1 ring-black/[0.04] dark:ring-white/5 overflow-hidden">
            {rest.map((book, i) => (
              <Link
                key={book.id}
                href={`/classics/${book.id}`}
                className={cn(
                  "flex items-center gap-3.5 p-3 active:bg-muted/50 transition-colors",
                  i > 0 && "border-t border-border/60",
                )}
              >
                <span className="w-6 text-center font-bold text-lg tabular-nums text-muted-foreground flex-shrink-0">
                  {book.rank}
                </span>
                <FlatCover title={book.title} coverColor={coverColorForBook(book.title, book.category)} className="w-14 flex-shrink-0" titleClassName="text-xs" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[15px] text-foreground truncate">{book.title}</p>
                  <p className="text-[12px] text-muted-foreground truncate mt-0.5">{book.author} · {book.dynasty}</p>
                  <div className="flex items-center gap-2.5 mt-1">
                    <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md">{book.category}</span>
                    <span className="text-[11px] text-muted-foreground/70 flex items-center gap-0.5">
                      <Eye className="w-3 h-3" />{book.views}
                    </span>
                    <span className="text-[11px] text-muted-foreground/70 flex items-center gap-0.5">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />{book.rating}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
