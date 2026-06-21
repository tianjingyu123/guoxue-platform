"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Search, Play, Clock, Eye, User, SlidersHorizontal, X } from "lucide-react"
import { liveApi, type LiveRoom } from "@/lib/api"

// Mock数据
const mockReplays: LiveRoom[] = [
  { id: "1", title: "《周易》六十四卦详解 - 乾卦篇", cover: "/placeholder.svg", status: "replay", host: { id: "h1", name: "张道长", avatar: "/placeholder.svg", followers: 12800 }, viewers: 8520, likes: 2340, duration: 7200, endTime: "2024-01-15T20:00:00Z", category: "易经" },
  { id: "2", title: "紫微斗数入门：命盘基础解读", cover: "/placeholder.svg", status: "replay", host: { id: "h2", name: "李命师", avatar: "/placeholder.svg", followers: 9600 }, viewers: 6230, likes: 1890, duration: 5400, endTime: "2024-01-14T19:30:00Z", category: "紫微斗数" },
  { id: "3", title: "八字命理：如何看流年运势", cover: "/placeholder.svg", status: "replay", host: { id: "h3", name: "王半仙", avatar: "/placeholder.svg", followers: 15200 }, viewers: 12800, likes: 3560, duration: 6800, endTime: "2024-01-13T20:00:00Z", category: "八字命理" },
  { id: "4", title: "梅花易数：起卦与断卦技巧", cover: "/placeholder.svg", status: "replay", host: { id: "h4", name: "赵易师", avatar: "/placeholder.svg", followers: 7800 }, viewers: 4520, likes: 1230, duration: 4800, endTime: "2024-01-12T19:00:00Z", category: "梅花易数" },
  { id: "5", title: "风水布局：家居风水入门", cover: "/placeholder.svg", status: "replay", host: { id: "h5", name: "陈风水", avatar: "/placeholder.svg", followers: 11200 }, viewers: 9800, likes: 2780, duration: 5600, endTime: "2024-01-11T20:30:00Z", category: "风水" },
]

const sortOptions = [
  { value: "latest", label: "最新发布" },
  { value: "popular", label: "最多播放" },
  { value: "duration", label: "时长最长" },
]

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}小时${minutes}分钟`
  }
  return `${minutes}分钟`
}

function formatViews(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  }
  return num.toString()
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  if (days < 30) return `${Math.floor(days / 7)}周前`
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

export default function ReplaysPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [replays, setReplays] = useState<LiveRoom[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("latest")
  const [showSortSheet, setShowSortSheet] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    loadReplays()
  }, [sortBy])

  const loadReplays = async (reset = true) => {
    setLoading(true)
    try {
      // const res = await liveApi.rooms({ status: 'ended', page: reset ? 1 : page, pageSize: 20 })
      // if (reset) {
      //   setReplays(res.data)
      //   setPage(2)
      // } else {
      //   setReplays(prev => [...prev, ...res.data])
      //   setPage(prev => prev + 1)
      // }
      // setHasMore(res.data.length === 20)
      
      await new Promise(r => setTimeout(r, 500))
      let sorted = [...mockReplays]
      if (sortBy === 'popular') {
        sorted.sort((a, b) => b.viewers - a.viewers)
      } else if (sortBy === 'duration') {
        sorted.sort((a, b) => (b.duration || 0) - (a.duration || 0))
      }
      setReplays(sorted)
      setHasMore(false)
    } catch (error) {
      console.error('Load replays error:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredReplays = replays.filter(replay => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return replay.title.toLowerCase().includes(query) || 
           replay.host.name.toLowerCase().includes(query)
  })

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-20 bg-white border-b border-[#E8E3DB]">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ChevronLeft className="w-6 h-6 text-[#2C2C2C]" />
          </button>
          <h1 className="text-lg font-semibold text-[#2C2C2C]">直播回放</h1>
        </div>
        
        {/* 搜索栏 */}
        <div className="px-4 pb-3 flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999999]" />
            <input
              type="text"
              placeholder="搜索讲师或标题"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-[#F5F5F5] rounded-full text-sm placeholder:text-[#999999] focus:outline-none focus:ring-2 focus:ring-[#C41E3A]/20"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-[#999999]" />
              </button>
            )}
          </div>
          <button 
            onClick={() => setShowSortSheet(true)}
            className="flex items-center gap-1 px-3 py-2 text-sm text-[#666666] bg-[#F5F5F5] rounded-full"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>{sortOptions.find(o => o.value === sortBy)?.label}</span>
          </button>
        </div>
      </div>

      {/* 回放列表 */}
      <div className="p-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                <div className="flex gap-3 p-3">
                  <div className="w-36 h-20 bg-gray-200 rounded-xl flex-shrink-0" />
                  <div className="flex-1 py-1">
                    <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-2/3 mb-3" />
                    <div className="flex gap-3">
                      <div className="h-3 bg-gray-200 rounded w-16" />
                      <div className="h-3 bg-gray-200 rounded w-16" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredReplays.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#F5F5F5] flex items-center justify-center">
              <Play className="w-8 h-8 text-[#CCCCCC]" />
            </div>
            <p className="text-[#999999] mb-2">暂无回放内容</p>
            <p className="text-sm text-[#CCCCCC]">
              {searchQuery ? "换个关键词试试" : "精彩内容即将上线"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReplays.map((replay) => (
              <div
                key={replay.id}
                onClick={() => router.push(`/live/${replay.id}?mode=replay`)}
                className="bg-white rounded-2xl overflow-hidden shadow-sm active:scale-[0.99] transition-transform"
              >
                <div className="flex gap-3 p-3">
                  {/* 封面 */}
                  <div className="relative w-36 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
                    <img 
                      src={replay.cover} 
                      alt={replay.title}
                      className="w-full h-full object-cover"
                    />
                    {/* 回放标识 */}
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/60 rounded text-[10px] text-white flex items-center gap-0.5">
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>回放</span>
                    </div>
                    {/* 时长 */}
                    <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/60 rounded text-[10px] text-white">
                      {formatDuration(replay.duration || 0)}
                    </div>
                  </div>
                  
                  {/* 信息 */}
                  <div className="flex-1 min-w-0 py-0.5 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-[#2C2C2C] line-clamp-2 leading-snug">
                        {replay.title}
                      </h3>
                    </div>
                    
                    <div className="space-y-1.5">
                      {/* 讲师 */}
                      <div className="flex items-center gap-1.5">
                        <img 
                          src={replay.host.avatar} 
                          alt={replay.host.name}
                          className="w-4 h-4 rounded-full"
                        />
                        <span className="text-xs text-[#666666]">{replay.host.name}</span>
                        <span className="text-[10px] text-[#999999] px-1.5 py-0.5 bg-[#F5F5F5] rounded">
                          {replay.category}
                        </span>
                      </div>
                      
                      {/* 数据 */}
                      <div className="flex items-center gap-3 text-xs text-[#999999]">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {formatViews(replay.viewers)}次播放
                        </span>
                        <span>{formatDate(replay.endTime || '')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* 加载更多 */}
            {hasMore && (
              <button
                onClick={() => loadReplays(false)}
                className="w-full py-3 text-sm text-[#666666]"
              >
                加载更多
              </button>
            )}
            
            {!hasMore && filteredReplays.length > 0 && (
              <p className="py-4 text-center text-xs text-[#CCCCCC]">已显示全部回放</p>
            )}
          </div>
        )}
      </div>

      {/* 排序面板 */}
      {showSortSheet && (
        <div className="fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowSortSheet(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between p-4 border-b border-[#E8E3DB]">
              <span className="text-base font-medium text-[#2C2C2C]">排序方式</span>
              <button onClick={() => setShowSortSheet(false)}>
                <X className="w-5 h-5 text-[#999999]" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setSortBy(option.value)
                    setShowSortSheet(false)
                  }}
                  className={`w-full py-3 rounded-xl text-center transition-colors ${
                    sortBy === option.value
                      ? 'bg-[#C41E3A]/10 text-[#C41E3A] font-medium'
                      : 'bg-[#F5F5F5] text-[#666666]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="h-safe-area-inset-bottom" />
          </div>
        </div>
      )}
    </div>
  )
}
