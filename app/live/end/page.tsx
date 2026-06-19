"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { ChevronLeft, Play, Eye, Users, Heart, Gift, UserPlus, Check, ChevronRight, Radio } from "lucide-react"
import { liveApi, type LiveRoom } from "@/lib/api"

// Mock数据
const mockRoom: LiveRoom & { 
  stats: { totalViewers: number; peakViewers: number; totalLikes: number; totalGifts: number; duration: number }
  hasReplay: boolean
  replayUrl?: string
} = {
  id: "1",
  title: "《周易》六十四卦精讲：乾卦的智慧",
  cover: "/placeholder.svg",
  status: "replay",
  host: {
    id: "h1",
    name: "易经大师·张道长",
    avatar: "/placeholder.svg",
    followers: 12580,
  },
  viewers: 0,
  likes: 8532,
  startTime: "2024-01-15T14:00:00",
  endTime: "2024-01-15T16:30:00",
  category: "易经",
  tags: ["周易", "六十四卦", "国学"],
  stats: {
    totalViewers: 15680,
    peakViewers: 3256,
    totalLikes: 8532,
    totalGifts: 1256,
    duration: 9000,
  },
  hasReplay: true,
  replayUrl: "/live/1?replay=true",
}

const mockRecommendLives: LiveRoom[] = [
  { id: "2", title: "紫微斗数入门：认识你的命盘", cover: "/placeholder.svg", status: "preview", host: { id: "h1", name: "易经大师·张道长", avatar: "/placeholder.svg", followers: 12580 }, viewers: 0, likes: 0, startTime: "2024-01-20T14:00:00", category: "紫微斗数", isBooked: false, bookedCount: 856 },
  { id: "3", title: "风水布局与家居吉凶", cover: "/placeholder.svg", status: "live", host: { id: "h2", name: "风水师·李明", avatar: "/placeholder.svg", followers: 8960 }, viewers: 1256, likes: 3200, category: "风水", tags: ["风水"] },
]

const mockRecommendCourses = [
  { id: "c1", title: "周易六十四卦系统课", cover: "/placeholder.svg", price: 299, lessons: 64 },
  { id: "c2", title: "紫微斗数精讲班", cover: "/placeholder.svg", price: 399, lessons: 48 },
]

function LiveEndContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const roomId = searchParams.get('id')
  
  const [room, setRoom] = useState(mockRoom)
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500)
    return () => clearTimeout(timer)
  }, [])

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}小时${mins}分钟`
    return `${mins}分钟`
  }

  const formatNumber = (num: number) => {
    if (num >= 10000) return (num / 10000).toFixed(1) + '万'
    return num.toString()
  }

  const handleFollow = () => {
    setIsFollowing(!isFollowing)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <div className="h-64 bg-gray-200 animate-pulse" />
        <div className="p-4 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl h-32 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-24">
      {/* 封面区域 */}
      <div className="relative h-64">
        <Image
          src={room.cover}
          alt={room.title}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />
        
        {/* 顶部导航 */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* 直播已结束标识 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="bg-black/60 backdrop-blur-sm rounded-2xl px-6 py-4 text-center">
            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-white/20 flex items-center justify-center">
              <Radio className="w-6 h-6 text-white" />
            </div>
            <div className="text-white font-medium">直播已结束</div>
            <div className="text-white/70 text-sm mt-1">
              时长 {formatDuration(room.stats.duration)}
            </div>
          </div>
        </div>

        {/* 底部信息 */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h1 className="text-white font-bold text-lg line-clamp-2">{room.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            {room.tags?.map(tag => (
              <span key={tag} className="px-2 py-0.5 bg-white/20 text-white text-xs rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 主播信息 */}
      <div className="mx-4 -mt-6 relative z-10 bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-3 flex-1 cursor-pointer"
            onClick={() => router.push(`/user/${room.host.id}`)}
          >
            <div className="relative w-12 h-12">
              <Image
                src={room.host.avatar}
                alt={room.host.name}
                fill
                className="rounded-full object-cover"
              />
            </div>
            <div>
              <div className="font-medium text-[#2C2C2C]">{room.host.name}</div>
              <div className="text-sm text-[#999999]">{formatNumber(room.host.followers)} 粉丝</div>
            </div>
          </div>
          <button
            onClick={handleFollow}
            className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              isFollowing
                ? "bg-[#FAF8F5] text-[#999999]"
                : "bg-[#C41E3A] text-white"
            }`}
          >
            {isFollowing ? (
              <>
                <Check className="w-4 h-4" />
                已关注
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                关注
              </>
            )}
          </button>
        </div>
      </div>

      {/* 直播数据统计 */}
      <div className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm">
        <h2 className="font-medium text-[#2C2C2C] mb-4">直播数据</h2>
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center p-3 bg-[#FAF8F5] rounded-xl">
            <Eye className="w-5 h-5 text-[#C41E3A] mx-auto mb-1" />
            <div className="text-lg font-bold text-[#2C2C2C]">{formatNumber(room.stats.totalViewers)}</div>
            <div className="text-xs text-[#999999]">总观看</div>
          </div>
          <div className="text-center p-3 bg-[#FAF8F5] rounded-xl">
            <Users className="w-5 h-5 text-[#C9A96E] mx-auto mb-1" />
            <div className="text-lg font-bold text-[#2C2C2C]">{formatNumber(room.stats.peakViewers)}</div>
            <div className="text-xs text-[#999999]">峰值在线</div>
          </div>
          <div className="text-center p-3 bg-[#FAF8F5] rounded-xl">
            <Heart className="w-5 h-5 text-pink-500 mx-auto mb-1" />
            <div className="text-lg font-bold text-[#2C2C2C]">{formatNumber(room.stats.totalLikes)}</div>
            <div className="text-xs text-[#999999]">总点赞</div>
          </div>
          <div className="text-center p-3 bg-[#FAF8F5] rounded-xl">
            <Gift className="w-5 h-5 text-orange-500 mx-auto mb-1" />
            <div className="text-lg font-bold text-[#2C2C2C]">{formatNumber(room.stats.totalGifts)}</div>
            <div className="text-xs text-[#999999]">礼物收入</div>
          </div>
        </div>
      </div>

      {/* 讲师其他直播 */}
      <div className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-[#2C2C2C]">讲师其他直播</h2>
          <button
            onClick={() => router.push(`/user/${room.host.id}?tab=lives`)}
            className="flex items-center text-sm text-[#999999]"
          >
            查看全部
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          {mockRecommendLives.map(live => (
            <div
              key={live.id}
              onClick={() => {
                if (live.status === "live") {
                  router.push(`/live/${live.id}`)
                } else if (live.status === "preview") {
                  router.push(`/live/preview?id=${live.id}`)
                }
              }}
              className="flex gap-3 cursor-pointer"
            >
              <div className="relative w-24 h-16 flex-shrink-0">
                <Image
                  src={live.cover}
                  alt={live.title}
                  fill
                  className="rounded-lg object-cover"
                />
                {live.status === "live" && (
                  <div className="absolute top-1 left-1 flex items-center gap-1 px-1.5 py-0.5 bg-[#C41E3A] text-white text-xs rounded">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    直播中
                  </div>
                )}
                {live.status === "preview" && (
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-[#C9A96E] text-white text-xs rounded">
                    预告
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[#2C2C2C] text-sm line-clamp-2">{live.title}</div>
                <div className="flex items-center gap-2 mt-1 text-xs text-[#999999]">
                  {live.status === "live" ? (
                    <span>{formatNumber(live.viewers)} 观看</span>
                  ) : (
                    <span>{live.bookedCount} 人预约</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 相关课程推荐 */}
      <div className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-[#2C2C2C]">相关课程推荐</h2>
          <button
            onClick={() => router.push('/courses')}
            className="flex items-center text-sm text-[#999999]"
          >
            查看更多
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {mockRecommendCourses.map(course => (
            <div
              key={course.id}
              onClick={() => router.push(`/courses/${course.id}`)}
              className="bg-[#FAF8F5] rounded-xl overflow-hidden cursor-pointer"
            >
              <div className="relative aspect-video">
                <Image
                  src={course.cover}
                  alt={course.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-3">
                <div className="font-medium text-[#2C2C2C] text-sm line-clamp-1">{course.title}</div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[#C41E3A] font-bold">¥{course.price}</span>
                  <span className="text-xs text-[#999999]">{course.lessons}课时</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 底部固定按钮 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E3DB] p-4 safe-area-inset-bottom">
        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/community/circles?hostId=${room.host.id}`)}
            className="flex-1 py-3 border border-[#E8E3DB] rounded-xl text-[#2C2C2C] font-medium"
          >
            进入讲师圈子
          </button>
          {room.hasReplay && (
            <button
              onClick={() => router.push(room.replayUrl || `/live/${room.id}?replay=true`)}
              className="flex-1 py-3 bg-[#C41E3A] text-white rounded-xl font-medium flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              查看回放
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="h-64 bg-gray-200 animate-pulse" />
      <div className="p-4 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl h-32 animate-pulse" />
        ))}
      </div>
    </div>
  )
}

export default function LiveEndPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LiveEndContent />
    </Suspense>
  )
}
