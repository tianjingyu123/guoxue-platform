"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Trash2, Heart, BookOpen, Headphones, Video, GraduationCap, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { ClassicsHeader, FlatCover, coverColorForBook, type CoverColor } from "@/components/classics"

type MediaType = "audiobook" | "article" | "video" | "course"

interface CollectionItem {
  id: string
  title: string
  type: MediaType
  author: string
  addedDate: string
  plays: number
  color: CoverColor
}

const mockCollections: CollectionItem[] = [
  { id: "1", title: "《道德经》完整版朗读", type: "audiobook", author: "王教授", addedDate: "2024-01-18", plays: 45, color: "brown" },
  { id: "2", title: "易经入门必读", type: "article", author: "易学研究院", addedDate: "2024-01-17", plays: 0, color: "cream" },
  { id: "3", title: "四书五经核心讲座", type: "video", author: "孔子学堂", addedDate: "2024-01-16", plays: 28, color: "red" },
  { id: "4", title: "黄帝内经养生秘诀", type: "article", author: "中医学院", addedDate: "2024-01-15", plays: 12, color: "green" },
  { id: "5", title: "奇门遁甲应用指南", type: "course", author: "命理大师", addedDate: "2024-01-14", plays: 0, color: "blue" },
]

const TYPE_META: Record<MediaType, { label: string; icon: typeof BookOpen }> = {
  audiobook: { label: "有声书", icon: Headphones },
  article: { label: "文章", icon: BookOpen },
  video: { label: "视频", icon: Video },
  course: { label: "课程", icon: GraduationCap },
}

const FILTERS = [
  { id: "all", label: "全部" },
  { id: "article", label: "文章" },
  { id: "audiobook", label: "有声书" },
  { id: "video", label: "视频" },
  { id: "course", label: "课程" },
] as const

export default function ClassicsCollectionsPage() {
  const router = useRouter()
  const [searchText, setSearchText] = useState("")
  const [filter, setFilter] = useState<string>("all")
  const [collections, setCollections] = useState(mockCollections)

  const filtered = collections.filter(
    (item) =>
      (filter === "all" || item.type === filter) &&
      (item.title.includes(searchText) || item.author.includes(searchText)),
  )

  const removeCollection = (id: string) => setCollections((prev) => prev.filter((item) => item.id !== id))

  const openCollection = (item: CollectionItem) => {
    switch (item.type) {
      case "audiobook":
        router.push(`/classics/audiobooks/${item.id}`)
        break
      case "video":
        router.push(`/video/${item.id}`)
        break
      case "course":
        router.push(`/courses/${item.id}`)
        break
      default:
        router.push(`/classics/${item.id}`)
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f2ee] dark:bg-background pb-20 sm:pb-10">
      <ClassicsHeader title="我的收藏" showSearch={false} />

      <main className="max-w-screen-xl mx-auto">
        {/* Hero */}
        <section className="px-5 sm:px-6 pt-2 pb-4">
          <p className="text-[13px] font-semibold tracking-wide text-[#c41e3a] dark:text-amber-400 mb-1.5">珍藏一处</p>
          <h2 className="text-[34px] leading-[1.1] font-bold tracking-tight text-foreground">我的收藏</h2>
        </section>

        {/* 搜索 */}
        <section className="px-5 sm:px-6 pb-3">
          <div className="flex items-center gap-2.5 w-full h-11 px-4 rounded-2xl bg-card shadow-sm ring-1 ring-black/[0.04] dark:ring-white/5">
            <Search className="w-[18px] h-[18px] text-muted-foreground flex-shrink-0" />
            <input
              placeholder="搜索收藏的内容"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="flex-1 bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
        </section>

        {/* 类型筛选 */}
        <section className="pb-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide px-5 sm:px-6">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "flex-shrink-0 h-8 px-3.5 rounded-full text-[13px] font-medium transition-colors",
                  filter === f.id
                    ? "bg-foreground text-background"
                    : "bg-card text-muted-foreground ring-1 ring-black/[0.04] dark:ring-white/5",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </section>

        {/* 收藏列表 */}
        <section className="px-5 sm:px-6">
          {filtered.length > 0 ? (
            <div className="space-y-3">
              {filtered.map((item) => {
                const meta = TYPE_META[item.type]
                const Icon = meta.icon
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-4 bg-card rounded-2xl shadow-sm ring-1 ring-black/[0.04] dark:ring-white/5"
                  >
                    <button onClick={() => openCollection(item)} className="flex items-center gap-4 flex-1 min-w-0 text-left active:scale-[0.99] transition-transform">
                      <FlatCover title={item.title.replace(/[《》]/g, "").slice(0, 4)} coverColor={coverColorForBook(item.title)} className="w-14 flex-shrink-0" titleClassName="text-xs" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[15px] text-foreground line-clamp-1">{item.title}</h3>
                        <p className="text-[12px] text-muted-foreground mt-1 flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5" />
                          <span className="px-1.5 py-0.5 rounded-md bg-muted text-[11px]">{meta.label}</span>
                          <span>{item.author}</span>
                        </p>
                        {item.plays > 0 && (
                          <p className="text-[11px] text-muted-foreground/70 mt-1">已播放 {item.plays} 次</p>
                        )}
                      </div>
                    </button>
                    <button
                      onClick={() => removeCollection(item.id)}
                      className="p-2 text-muted-foreground/60 active:text-[#c41e3a] transition-colors flex-shrink-0"
                      aria-label="移除收藏"
                    >
                      <Trash2 className="w-[18px] h-[18px]" />
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-3xl bg-card shadow-sm ring-1 ring-black/[0.04] dark:ring-white/5 p-10 text-center">
              <span className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Heart className="w-6 h-6 text-muted-foreground" />
              </span>
              <p className="text-[15px] text-foreground font-medium">还没有收藏任何内容</p>
              <p className="text-[13px] text-muted-foreground mt-1">浏览古籍，把喜欢的收进来</p>
              <button
                onClick={() => router.push("/classics/home")}
                className="mt-5 inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-[#c41e3a] dark:bg-amber-500 text-white text-[14px] font-semibold active:scale-[0.98] transition-transform"
              >
                <BookOpen className="w-4 h-4" />去逛古籍馆
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
