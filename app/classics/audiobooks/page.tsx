"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Play, Heart, Headphones, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { ClassicsHeader, FlatCover, coverColorForBook, type CoverColor } from "@/components/classics"

interface AudioBook {
  id: string
  title: string
  shortTitle: string
  author: string
  duration: string
  narrator: string
  plays: number
  likes: number
  quality: string
  size: string
  desc: string
  color: CoverColor
}

const mockAudioBooks: AudioBook[] = [
  { id: "1", title: "《道德经》完整版朗读", shortTitle: "道德经", author: "王教授", duration: "4小时32分", narrator: "张三", plays: 12850, likes: 1250, quality: "高保真", size: "450MB", desc: "五千言道尽天地至理，名家逐句精讲。", color: "brown" },
  { id: "2", title: "《易经》上下经讲解", shortTitle: "易经", author: "李明星", duration: "6小时15分", narrator: "李四", plays: 9850, likes: 850, quality: "高保真", size: "520MB", desc: "六十四卦层层拆解，听懂群经之首。", color: "cream" },
  { id: "3", title: "《四书五经》核心讲座", shortTitle: "四书五经", author: "孔子研究院", duration: "8小时20分", narrator: "王五", plays: 7420, likes: 620, quality: "高保真", size: "650MB", desc: "儒学经典系统串讲，通识入门首选。", color: "red" },
  { id: "4", title: "《黄帝内经》全文诵读", shortTitle: "黄帝内经", author: "中医学院", duration: "5小时45分", narrator: "赵六", plays: 5840, likes: 480, quality: "标清", size: "380MB", desc: "中医奠基之作，养生智慧娓娓道来。", color: "green" },
]

function fmtPlays(n: number) {
  return n >= 10000 ? `${(n / 10000).toFixed(1)}万` : `${n}`
}

export default function ClassicsAudiobooksPage() {
  const router = useRouter()
  const [favorites, setFavorites] = useState<string[]>([])

  const toggleFavorite = (id: string) =>
    setFavorites((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]))

  const [feature, ...rest] = mockAudioBooks

  return (
    <div className="min-h-screen bg-[#f4f2ee] dark:bg-background pb-20 sm:pb-10">
      <ClassicsHeader title="听书" />

      <main className="max-w-screen-xl mx-auto">
        {/* Hero */}
        <section className="px-5 sm:px-6 pt-2 pb-4">
          <p className="text-[13px] font-semibold tracking-wide text-[#c41e3a] dark:text-amber-400 mb-1.5">名家播讲</p>
          <h2 className="text-[34px] leading-[1.1] font-bold tracking-tight text-foreground">轻松听典籍</h2>
        </section>

        {/* 今日主打 - 大卡 */}
        <section className="px-5 sm:px-6 pb-5">
          <button
            onClick={() => router.push(`/classics/audiobooks/${feature.id}`)}
            className="block w-full text-left group"
          >
            <div
              className="relative rounded-[28px] overflow-hidden p-6 shadow-lg ring-1 ring-black/5 active:scale-[0.99] transition-transform"
              style={{ background: "linear-gradient(150deg, #a06a38, #5f3a1a)" }}
            >
              <p className="text-[12px] font-semibold tracking-[0.2em] text-white/70 uppercase">编辑主打</p>
              <div className="mt-4 flex items-center gap-4">
                <FlatCover title={feature.shortTitle} coverColor={coverColorForBook(feature.shortTitle)} className="w-[92px] flex-shrink-0 shadow-xl" titleClassName="text-lg" />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-xl">{feature.title}</p>
                  <p className="text-white/70 text-[13px] mt-1 line-clamp-2">{feature.desc}</p>
                  <div className="mt-2 flex items-center gap-3 text-white/70 text-[12px]">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{feature.duration}</span>
                    <span className="flex items-center gap-1"><Headphones className="w-3.5 h-3.5" />{fmtPlays(feature.plays)}</span>
                  </div>
                  <span className="mt-3 inline-flex items-center gap-1.5 h-9 px-5 rounded-full bg-white text-[#6f4521] text-[14px] font-semibold shadow-sm">
                    <Play className="w-4 h-4 fill-current" />立即收听
                  </span>
                </div>
              </div>
            </div>
          </button>
        </section>

        {/* 全部有声书 */}
        <section className="px-5 sm:px-6">
          <h3 className="text-[22px] font-bold tracking-tight text-foreground mb-3.5">全部有声书</h3>
          <div className="space-y-3">
            {rest.map((book) => (
              <div key={book.id} className="flex items-center gap-4 p-4 bg-card rounded-2xl shadow-sm ring-1 ring-black/[0.04] dark:ring-white/5">
                <button onClick={() => router.push(`/classics/audiobooks/${book.id}`)} className="flex items-center gap-4 flex-1 min-w-0 text-left active:scale-[0.99] transition-transform">
                  <FlatCover title={book.shortTitle} coverColor={coverColorForBook(book.shortTitle)} className="w-16 flex-shrink-0" titleClassName="text-xs" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[15px] text-foreground line-clamp-1">{book.title}</h3>
                    <p className="text-[12px] text-muted-foreground mt-1 line-clamp-1">{book.desc}</p>
                    <div className="mt-1.5 flex items-center gap-2.5 text-[11px] text-muted-foreground/70">
                      <span className="px-1.5 py-0.5 rounded-md bg-muted">{book.quality}</span>
                      <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{book.duration}</span>
                      <span className="flex items-center gap-0.5"><Headphones className="w-3 h-3" />{fmtPlays(book.plays)}</span>
                    </div>
                  </div>
                </button>
                <div className="flex flex-col items-center gap-3 flex-shrink-0">
                  <button onClick={() => toggleFavorite(book.id)} aria-label="收藏" className="active:scale-90 transition-transform">
                    <Heart className={cn("w-5 h-5", favorites.includes(book.id) ? "fill-[#c41e3a] text-[#c41e3a]" : "text-muted-foreground/50")} />
                  </button>
                  <button
                    onClick={() => router.push(`/classics/audiobooks/${book.id}`)}
                    className="w-9 h-9 rounded-full bg-[#c41e3a] dark:bg-amber-500 flex items-center justify-center shadow-sm active:scale-90 transition-transform"
                    aria-label="播放"
                  >
                    <Play className="w-4 h-4 text-white ml-0.5" fill="white" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
