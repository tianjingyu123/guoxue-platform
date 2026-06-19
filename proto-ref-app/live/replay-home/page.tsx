"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Search, Play, Eye, Clock, ChevronRight, Filter, X } from "lucide-react"

interface ReplayCategory {
  id: string
  name: string
  icon: string
  count: number
}

interface ReplayItem {
  id: string
  title: string
  cover: string
  host: {
    id: string
    name: string
    avatar: string
  }
  duration: number
  views: number
  category: string
  createdAt: string
  isHot?: boolean
}

export default function ReplayHomePage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearch, setShowSearch] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const categories: ReplayCategory[] = [
    { id: "all", name: "全部", icon: "📚", count: 128 },
    { id: "yijing", name: "易经", icon: "☯️", count: 35 },
    { id: "fengshui", name: "风水", icon: "🏠", count: 28 },
    { id: "bazi", name: "八字", icon: "📅", count: 24 },
    { id: "meihua", name: "梅花", icon: "🌸", count: 18 },
    { id: "liuyao", name: "六爻", icon: "⚊", count: 15 },
    { id: "qimen", name: "奇门", icon: "🚪", count: 8 },
  ]

  const hotReplays: ReplayItem[] = [
    {
      id: "1",
      title: "2024甲辰年运势全解析",
      cover: "/placeholder.svg?height=400&width=600&text=甲辰年运势",
      host: { id: "h1", name: "玄真子", avatar: "/placeholder.svg?height=40&width=40&text=玄" },
      duration: 7200,
      views: 58600,
      category: "易经",
      createdAt: "2024-01-15",
      isHot: true,
    },
    {
      id: "2",
      title: "家居风水布局实战课",
      cover: "/placeholder.svg?height=400&width=600&text=风水布局",
      host: { id: "h2", name: "明德居士", avatar: "/placeholder.svg?height=40&width=40&text=明" },
      duration: 5400,
      views: 42300,
      category: "风水",
      createdAt: "2024-01-10",
      isHot: true,
    },
  ]

  const replayList: ReplayItem[] = [
    {
      id: "3",
      title: "八字入门：如何排盘与看命",
      cover: "/placeholder.svg?height=200&width=300&text=八字入门",
      host: { id: "h3", name: "子平先生", avatar: "/placeholder.svg?height=40&width=40&text=子" },
      duration: 4800,
      views: 28500,
      category: "八字",
      createdAt: "2024-01-20",
    },
    {
      id: "4",
      title: "梅花易数断卦技巧",
      cover: "/placeholder.svg?height=200&width=300&text=梅花断卦",
      host: { id: "h4", name: "易林", avatar: "/placeholder.svg?height=40&width=40&text=易" },
      duration: 3600,
      views: 19200,
      category: "梅花",
      createdAt: "2024-01-18",
    },
    {
      id: "5",
      title: "六爻预测实战案例分析",
      cover: "/placeholder.svg?height=200&width=300&text=六爻实战",
      host: { id: "h5", name: "卦象大师", avatar: "/placeholder.svg?height=40&width=40&text=卦" },
      duration: 5100,
      views: 15800,
      category: "六爻",
      createdAt: "2024-01-16",
    },
    {
      id: "6",
      title: "奇门遁甲入门指南",
      cover: "/placeholder.svg?height=200&width=300&text=奇门入门",
      host: { id: "h6", name: "遁甲居士", avatar: "/placeholder.svg?height=40&width=40&text=遁" },
      duration: 6000,
      views: 12400,
      category: "奇门",
      createdAt: "2024-01-14",
    },
  ]

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800)
    return () => clearTimeout(timer)
  }, [])

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return h > 0 ? `${h}小时${m}分钟` : `${m}分钟`
  }

  const formatViews = (num: number) => {
    if (num >= 10000) return `${(num / 10000).toFixed(1)}万`
    return num.toString()
  }

  const filteredReplays = selectedCategory && selectedCategory !== "all"
    ? replayList.filter(r => r.category === categories.find(c => c.id === selectedCategory)?.name)
    : replayList

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <div className="sticky top-0 z-20 bg-white border-b border-[#E8E3DB] px-4 py-3 h-14" />
        <div className="p-4 space-y-4">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="w-20 h-10 bg-gray-200 rounded-full animate-pulse shrink-0" />
            ))}
          </div>
          <div className="h-48 bg-gray-200 rounded-2xl animate-pulse" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="aspect-video bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-20 bg-gradient-to-r from-[#C41E3A] to-[#D4456A] text-white">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold">直播回放</h1>
          <button onClick={() => setShowSearch(true)} className="p-1 -mr-1">
            <Search className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 搜索覆盖层 */}
      {showSearch && (
        <div className="fixed inset-0 z-50 bg-white">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E8E3DB]">
            <div className="flex-1 flex items-center gap-2 bg-[#FAF8F5] rounded-full px-4 py-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索回放..."
                className="flex-1 bg-transparent text-sm outline-none"
                autoFocus
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")}>
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
            <button onClick={() => setShowSearch(false)} className="text-[#C41E3A] text-sm">
              取消
            </button>
          </div>
          <div className="p-4">
            {searchQuery ? (
              <div className="space-y-3">
                {replayList.filter(r => r.title.includes(searchQuery) || r.host.name.includes(searchQuery)).map(replay => (
                  <div
                    key={replay.id}
                    onClick={() => router.push(`/live/${replay.id}?mode=replay`)}
                    className="flex gap-3 p-2 bg-white rounded-xl cursor-pointer"
                  >
                    <div className="w-24 aspect-video bg-gray-100 rounded-lg overflow-hidden relative shrink-0">
                      <img src={replay.cover} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-[#2C2C2C] line-clamp-2">{replay.title}</h4>
                      <p className="text-xs text-gray-500 mt-1">{replay.host.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <h3 className="text-sm font-medium text-[#2C2C2C] mb-3">热门搜索</h3>
                <div className="flex flex-wrap gap-2">
                  {["易经入门", "风水布局", "八字排盘", "梅花易数", "运势解析"].map(tag => (
                    <button
                      key={tag}
                      onClick={() => setSearchQuery(tag)}
                      className="px-3 py-1.5 bg-[#FAF8F5] rounded-full text-sm text-gray-600"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="p-4 space-y-5">
        {/* 分类导航 */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === cat.id
                  ? "bg-[#C41E3A] text-white"
                  : "bg-white text-gray-600 border border-[#E8E3DB]"
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
              <span className="text-xs opacity-70">({cat.count})</span>
            </button>
          ))}
        </div>

        {/* 热门回放 */}
        {!selectedCategory && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-[#2C2C2C]">热门回放</h2>
              <button
                onClick={() => router.push("/live/replays")}
                className="flex items-center gap-1 text-sm text-[#C41E3A]"
              >
                更多
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              {hotReplays.map((replay, index) => (
                <div
                  key={replay.id}
                  onClick={() => router.push(`/live/${replay.id}?mode=replay`)}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm cursor-pointer"
                >
                  <div className="relative aspect-[16/9]">
                    <img src={replay.cover} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    {/* 热门标签 */}
                    <div className="absolute top-3 left-3 flex items-center gap-1 bg-[#C41E3A] text-white text-xs px-2 py-1 rounded-full">
                      <span>🔥</span>
                      <span>热门</span>
                    </div>
                    {/* 排名 */}
                    <div className="absolute top-3 right-3 w-8 h-8 bg-[#C9A96E] text-white rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    {/* 播放按钮 */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-14 h-14 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <Play className="w-7 h-7 text-white fill-white ml-1" />
                      </div>
                    </div>
                    {/* 时长 */}
                    <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/50 text-white text-xs px-2 py-1 rounded">
                      <Clock className="w-3 h-3" />
                      {formatDuration(replay.duration)}
                    </div>
                    {/* 底部信息 */}
                    <div className="absolute bottom-3 left-3 right-20">
                      <h3 className="text-white font-medium line-clamp-1">{replay.title}</h3>
                    </div>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img src={replay.host.avatar} alt="" className="w-8 h-8 rounded-full" />
                      <span className="text-sm text-gray-700">{replay.host.name}</span>
                      <span className="text-xs text-gray-400 px-2 py-0.5 bg-gray-100 rounded">{replay.category}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Eye className="w-4 h-4" />
                      {formatViews(replay.views)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 回放列表 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-[#2C2C2C]">
              {selectedCategory && selectedCategory !== "all"
                ? categories.find(c => c.id === selectedCategory)?.name + "回放"
                : "最新回放"}
            </h2>
            <button className="flex items-center gap-1 text-sm text-gray-500">
              <Filter className="w-4 h-4" />
              筛选
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {filteredReplays.map(replay => (
              <div
                key={replay.id}
                onClick={() => router.push(`/live/${replay.id}?mode=replay`)}
                className="bg-white rounded-xl overflow-hidden shadow-sm cursor-pointer"
              >
                <div className="relative aspect-video">
                  <img src={replay.cover} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  {/* 回放标识 */}
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                    <Play className="w-3 h-3 fill-white" />
                    回放
                  </div>
                  {/* 时长 */}
                  <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                    {formatDuration(replay.duration)}
                  </div>
                </div>
                <div className="p-2.5">
                  <h3 className="text-sm font-medium text-[#2C2C2C] line-clamp-2 leading-tight">{replay.title}</h3>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1.5">
                      <img src={replay.host.avatar} alt="" className="w-5 h-5 rounded-full" />
                      <span className="text-xs text-gray-500">{replay.host.name}</span>
                    </div>
                    <div className="flex items-center gap-0.5 text-xs text-gray-400">
                      <Eye className="w-3 h-3" />
                      {formatViews(replay.views)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 加载更多提示 */}
        <div className="text-center py-4">
          <p className="text-sm text-gray-400">上拉加载更多</p>
        </div>
      </div>
    </div>
  )
}
