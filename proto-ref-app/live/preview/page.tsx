"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, Share2, Bell, BellOff, Clock, Users, Calendar, Play, CheckCircle2 } from "lucide-react"
import { liveApi, type LiveRoomDetail } from "@/lib/api"

// Mock数据
const mockRoom: LiveRoomDetail = {
  id: "1",
  title: "紫微斗数入门：十二宫位详解与命盘分析实战",
  cover: "/placeholder.svg?height=600&width=400",
  status: "preview",
  host: {
    id: "h1",
    name: "云中子",
    avatar: "/placeholder.svg?height=80&width=80",
    followers: 12800,
  },
  viewers: 0,
  likes: 0,
  startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  category: "命理学",
  tags: ["紫微斗数", "入门课程", "命盘分析"],
  isBooked: false,
  bookedCount: 1268,
  estimatedDuration: 90,
  description: `### 课程简介

本次直播将深入讲解紫微斗数的十二宫位体系，帮助初学者建立完整的命盘分析框架。

### 课程大纲

1. **命宫与身宫** - 了解自我与人生方向
2. **兄弟宫与夫妻宫** - 人际关系的奥秘
3. **子女宫与财帛宫** - 子嗣与财运分析
4. **疾厄宫与迁移宫** - 健康与出行运势
5. **交友宫与官禄宫** - 社交与事业发展
6. **田宅宫与福德宫** - 家宅与精神层面
7. **父母宫** - 长辈缘分与早年运势

### 适合人群

- 对紫微斗数感兴趣的初学者
- 希望系统学习命理知识的爱好者
- 想要了解自我命运的求知者

### 讲师简介

云中子老师，从事命理研究二十余年，师承多位名家，融会贯通各派精华。`,
  playUrl: "",
  replayUrl: "",
  gifts: [],
  messages: [],
}

function LivePreviewContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const roomId = searchParams.get("id") || "1"
  
  const [room, setRoom] = useState<LiveRoomDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [isBooked, setIsBooked] = useState(false)
  const [bookedCount, setBookedCount] = useState(0)
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [bookLoading, setBookLoading] = useState(false)

  useEffect(() => {
    const loadRoom = async () => {
      setLoading(true)
      try {
        // const data = await liveApi.roomDetail(roomId)
        // setRoom(data)
        setRoom(mockRoom)
        setIsBooked(mockRoom.isBooked || false)
        setBookedCount(mockRoom.bookedCount || 0)
      } catch (error) {
        console.error("Failed to load room:", error)
      } finally {
        setLoading(false)
      }
    }
    loadRoom()
  }, [roomId])

  useEffect(() => {
    if (!room?.startTime) return
    
    const updateCountdown = () => {
      const now = new Date().getTime()
      const start = new Date(room.startTime!).getTime()
      const diff = start - now
      
      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        return
      }
      
      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      })
    }
    
    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [room?.startTime])

  const handleBook = async () => {
    if (bookLoading) return
    setBookLoading(true)
    
    // 乐观更新
    const newBooked = !isBooked
    setIsBooked(newBooked)
    setBookedCount(prev => newBooked ? prev + 1 : prev - 1)
    
    try {
      if (newBooked) {
        await liveApi.book(roomId)
      } else {
        await liveApi.unbook(roomId)
      }
    } catch (error) {
      // 回滚
      setIsBooked(!newBooked)
      setBookedCount(prev => newBooked ? prev - 1 : prev + 1)
    } finally {
      setBookLoading(false)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: room?.title,
          text: `${room?.host.name}的直播预告：${room?.title}`,
          url: window.location.href,
        })
      } catch (error) {
        console.error("Share failed:", error)
      }
    }
  }

  const isStartingSoon = countdown.days === 0 && countdown.hours === 0 && countdown.minutes < 60

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <div className="h-[50vh] bg-gray-200 animate-pulse" />
        <div className="p-4 space-y-4">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-20 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="text-center text-[#999999]">直播不存在</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-24">
      {/* 封面区域 */}
      <div className="relative h-[50vh] min-h-[320px]">
        <img
          src={room.cover}
          alt={room.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        {/* 顶部导航 */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={handleShare}
            className="w-10 h-10 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
        
        {/* 预告标签 */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2">
          <div className="px-4 py-1.5 bg-[#C41E3A] text-white text-sm font-medium rounded-full flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            <span>直播预告</span>
          </div>
        </div>
        
        {/* 底部信息 */}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <h1 className="text-xl font-bold leading-tight mb-3">{room.title}</h1>
          
          {/* 讲师信息 */}
          <button
            onClick={() => router.push(`/profile/${room.host.id}`)}
            className="flex items-center gap-3 mb-4"
          >
            <img
              src={room.host.avatar}
              alt={room.host.name}
              className="w-12 h-12 rounded-full border-2 border-white/30"
            />
            <div>
              <div className="font-medium">{room.host.name}</div>
              <div className="text-sm text-white/70">{room.host.followers.toLocaleString()} 粉丝</div>
            </div>
          </button>
          
          {/* 倒计时 */}
          <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4">
            {isStartingSoon ? (
              <div className="flex items-center justify-center gap-2 text-[#FFD700]">
                <Play className="w-5 h-5" />
                <span className="text-lg font-bold">即将开始</span>
              </div>
            ) : (
              <>
                <div className="text-sm text-white/70 text-center mb-2">距开播还有</div>
                <div className="flex items-center justify-center gap-2">
                  {countdown.days > 0 && (
                    <>
                      <div className="bg-white/20 rounded-lg px-3 py-2 min-w-[50px] text-center">
                        <div className="text-2xl font-bold">{countdown.days}</div>
                        <div className="text-xs text-white/70">天</div>
                      </div>
                      <span className="text-xl font-bold">:</span>
                    </>
                  )}
                  <div className="bg-white/20 rounded-lg px-3 py-2 min-w-[50px] text-center">
                    <div className="text-2xl font-bold">{String(countdown.hours).padStart(2, '0')}</div>
                    <div className="text-xs text-white/70">时</div>
                  </div>
                  <span className="text-xl font-bold">:</span>
                  <div className="bg-white/20 rounded-lg px-3 py-2 min-w-[50px] text-center">
                    <div className="text-2xl font-bold">{String(countdown.minutes).padStart(2, '0')}</div>
                    <div className="text-xs text-white/70">分</div>
                  </div>
                  <span className="text-xl font-bold">:</span>
                  <div className="bg-white/20 rounded-lg px-3 py-2 min-w-[50px] text-center">
                    <div className="text-2xl font-bold">{String(countdown.seconds).padStart(2, '0')}</div>
                    <div className="text-xs text-white/70">秒</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* 详情内容 */}
      <div className="p-4 space-y-4">
        {/* 信息卡片 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="flex items-center justify-center gap-1 text-[#C41E3A] mb-1">
                <Users className="w-4 h-4" />
                <span className="text-lg font-bold">{bookedCount.toLocaleString()}</span>
              </div>
              <div className="text-xs text-[#999999]">已预约</div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-[#C9A96E] mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-lg font-bold">{room.estimatedDuration || 60}</span>
              </div>
              <div className="text-xs text-[#999999]">预计时长(分钟)</div>
            </div>
            <div>
              <div className="text-lg font-bold text-[#2C2C2C] mb-1">
                {new Date(room.startTime!).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}
              </div>
              <div className="text-xs text-[#999999]">
                {new Date(room.startTime!).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
        </div>
        
        {/* 标签 */}
        {room.tags && room.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {room.tags.map((tag, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-[#C41E3A]/10 text-[#C41E3A] text-sm rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        
        {/* 直播简介 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-lg font-bold text-[#2C2C2C] mb-3">直播简介</h2>
          <div className="prose prose-sm max-w-none text-[#666666] leading-relaxed whitespace-pre-wrap">
            {room.description.split('\n').map((line, index) => {
              if (line.startsWith('### ')) {
                return <h3 key={index} className="text-base font-bold text-[#2C2C2C] mt-4 mb-2">{line.replace('### ', '')}</h3>
              }
              if (line.startsWith('**') && line.endsWith('**')) {
                return <p key={index} className="font-medium text-[#2C2C2C]">{line.replace(/\*\*/g, '')}</p>
              }
              if (line.startsWith('- ')) {
                return <p key={index} className="pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-[#C41E3A]">{line.replace('- ', '')}</p>
              }
              if (line.match(/^\d+\./)) {
                return <p key={index} className="pl-4">{line}</p>
              }
              return line ? <p key={index}>{line}</p> : <br key={index} />
            })}
          </div>
        </div>
        
        {/* 讲师卡片 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-lg font-bold text-[#2C2C2C] mb-3">讲师介绍</h2>
          <button
            onClick={() => router.push(`/profile/${room.host.id}`)}
            className="w-full flex items-center gap-4"
          >
            <img
              src={room.host.avatar}
              alt={room.host.name}
              className="w-16 h-16 rounded-full"
            />
            <div className="flex-1 text-left">
              <div className="font-bold text-[#2C2C2C]">{room.host.name}</div>
              <div className="text-sm text-[#999999] mt-1">{room.host.followers.toLocaleString()} 粉丝</div>
            </div>
            <div className="text-[#C41E3A] text-sm">查看主页 →</div>
          </button>
        </div>
      </div>
      
      {/* 底部固定按钮 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E3DB] p-4 flex items-center gap-3">
        <div className="flex-1">
          <button
            onClick={handleBook}
            disabled={bookLoading}
            className={`w-full py-3.5 rounded-xl font-medium text-base flex items-center justify-center gap-2 transition-all ${
              isBooked
                ? "bg-[#F5F5F5] text-[#666666]"
                : "bg-[#C41E3A] text-white"
            }`}
          >
            {isBooked ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>已预约</span>
              </>
            ) : (
              <>
                <Bell className="w-5 h-5" />
                <span>立即预约</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="h-[50vh] bg-gray-200 animate-pulse" />
      <div className="p-4 space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="h-20 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  )
}

export default function LivePreviewPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LivePreviewContent />
    </Suspense>
  )
}
