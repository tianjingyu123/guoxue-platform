"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ChevronLeft, Search, Bot, MessageCircle, Heart, Sparkles, Plus, Settings } from "lucide-react"
import { botApi, circleApi } from "@/lib/api"
import type { CircleBot, CircleDetail } from "@/lib/api"

// Mock data
const mockCircle: CircleDetail = {
  id: "1",
  name: "周易研习社",
  cover: "/placeholder.svg?height=200&width=400",
  description: "传承易学精髓，探索宇宙奥秘",
  category: "易经",
  members: 12800,
  posts: 3560,
  isJoined: true,
  createdAt: "2024-01-01",
  owner: { id: "1", name: "周易大师", avatar: "/placeholder.svg?height=48&width=48" },
  tags: ["周易", "八卦", "风水"],
}

const mockBots: CircleBot[] = [
  {
    id: "1",
    name: "周易解卦助手",
    avatar: "/placeholder.svg?height=80&width=80",
    description: "专业解读六十四卦，帮助您理解卦象含义与人生指引",
    category: "占卜解读",
    chats: 12580,
    likes: 3420,
    isOfficial: true,
    createdAt: "2024-01-15",
  },
  {
    id: "2",
    name: "风水顾问",
    avatar: "/placeholder.svg?height=80&width=80",
    description: "提供家居风水布局建议，助您打造和谐居住环境",
    category: "风水堪舆",
    chats: 8960,
    likes: 2180,
    isOfficial: true,
    createdAt: "2024-02-01",
  },
  {
    id: "3",
    name: "八字命理分析",
    avatar: "/placeholder.svg?height=80&width=80",
    description: "根据生辰八字分析命理运势，提供人生建议",
    category: "命理分析",
    chats: 15620,
    likes: 4890,
    isOfficial: false,
    createdAt: "2024-02-15",
  },
  {
    id: "4",
    name: "易经学习导师",
    avatar: "/placeholder.svg?height=80&width=80",
    description: "系统讲解易经知识，从入门到精通的学习伴侣",
    category: "学习辅导",
    chats: 6780,
    likes: 1560,
    isOfficial: false,
    createdAt: "2024-03-01",
  },
]

// Skeleton component
function BotSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-xl bg-[#E8E3DB]" />
        <div className="flex-1">
          <div className="h-4 bg-[#E8E3DB] rounded w-24 mb-2" />
          <div className="h-3 bg-[#E8E3DB] rounded w-full mb-1" />
          <div className="h-3 bg-[#E8E3DB] rounded w-3/4" />
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#E8E3DB]">
        <div className="h-3 bg-[#E8E3DB] rounded w-20" />
        <div className="h-8 bg-[#E8E3DB] rounded-full w-16" />
      </div>
    </div>
  )
}

export default function CircleBotsPage() {
  const params = useParams()
  const router = useRouter()
  const circleId = params.id as string

  const [circle, setCircle] = useState<CircleDetail | null>(null)
  const [bots, setBots] = useState<CircleBot[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAdmin] = useState(true) // Mock admin status

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [circleRes, botsRes] = await Promise.all([
          circleApi.detail(circleId),
          botApi.circleBots(circleId),
        ])
        setCircle(circleRes)
        setBots(botsRes)
      } catch {
        setCircle(mockCircle)
        setBots(mockBots)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [circleId])

  const filteredBots = bots.filter(
    (bot) =>
      bot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bot.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bot.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatNumber = (num: number) => {
    if (num >= 10000) return (num / 10000).toFixed(1) + "万"
    if (num >= 1000) return (num / 1000).toFixed(1) + "k"
    return num.toString()
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#FAF8F5] border-b border-[#E8E3DB]">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ChevronLeft className="w-6 h-6 text-[#2C2C2C]" />
          </button>
          <h1 className="text-lg font-semibold text-[#2C2C2C]">圈子智能体</h1>
          {isAdmin && (
            <button
              onClick={() => router.push(`/circles/${circleId}/bots/manage`)}
              className="p-2 -mr-2"
            >
              <Settings className="w-5 h-5 text-[#666666]" />
            </button>
          )}
        </div>
      </div>

      {/* Circle Info */}
      {circle && (
        <div className="px-4 py-3 bg-white border-b border-[#E8E3DB]">
          <div className="flex items-center gap-3">
            <img
              src={circle.cover}
              alt={circle.name}
              className="w-12 h-12 rounded-xl object-cover"
            />
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-[#2C2C2C] truncate">{circle.name}</h2>
              <p className="text-xs text-[#999999]">
                {formatNumber(circle.members)} 成员 · {bots.length} 个智能体
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999999]" />
          <input
            type="text"
            placeholder="搜索智能体..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E8E3DB] rounded-full text-sm text-[#2C2C2C] placeholder:text-[#999999] focus:outline-none focus:border-[#C41E3A]"
          />
        </div>
      </div>

      {/* Bots Grid */}
      <div className="px-4 pb-24">
        {loading ? (
          <div className="grid grid-cols-1 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <BotSkeleton key={i} />
            ))}
          </div>
        ) : filteredBots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-full bg-[#E8E3DB] flex items-center justify-center mb-4">
              <Bot className="w-10 h-10 text-[#999999]" />
            </div>
            <p className="text-[#666666] mb-2">
              {searchQuery ? "未找到相关智能体" : "暂无智能体"}
            </p>
            {isAdmin && !searchQuery && (
              <button
                onClick={() => router.push(`/circles/${circleId}/bots/create`)}
                className="mt-4 px-6 py-2.5 bg-[#C41E3A] text-white rounded-full text-sm font-medium"
              >
                创建智能体
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredBots.map((bot) => (
              <div
                key={bot.id}
                onClick={() => router.push(`/bot/${bot.id}`)}
                className="bg-white rounded-2xl p-4 active:scale-[0.98] transition-transform cursor-pointer shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <img
                      src={bot.avatar}
                      alt={bot.name}
                      className="w-14 h-14 rounded-xl object-cover"
                    />
                    {bot.isOfficial && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#C41E3A] rounded-full flex items-center justify-center">
                        <Sparkles className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-[#2C2C2C] truncate">{bot.name}</h3>
                      <span className="px-2 py-0.5 bg-[#FAF8F5] text-[#999999] text-xs rounded-full shrink-0">
                        {bot.category}
                      </span>
                    </div>
                    <p className="text-sm text-[#666666] mt-1 line-clamp-2">{bot.description}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#E8E3DB]">
                  <div className="flex items-center gap-4 text-xs text-[#999999]">
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5" />
                      {formatNumber(bot.chats)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5" />
                      {formatNumber(bot.likes)}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/bot/${bot.id}`)
                    }}
                    className="px-4 py-1.5 bg-[#C41E3A] text-white text-xs rounded-full font-medium"
                  >
                    对话
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Bot FAB (Admin only) */}
      {isAdmin && !loading && bots.length > 0 && (
        <button
          onClick={() => router.push(`/circles/${circleId}/bots/create`)}
          className="fixed bottom-24 right-4 w-14 h-14 bg-[#C41E3A] rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus className="w-6 h-6 text-white" />
        </button>
      )}
    </div>
  )
}
