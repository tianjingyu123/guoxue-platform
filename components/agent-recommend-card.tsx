"use client"

import Link from "next/link"
import { Bot, Sparkles, ChevronRight, MessageCircle, Star } from "lucide-react"
import { cn } from "@/lib/utils"

// 智能体推荐数据
const defaultBots = [
  {
    id: "1",
    name: "八字命理大师",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=bazi&backgroundColor=c41e3a",
    description: "专业八字解读",
    rating: 4.9,
    useCount: 128000,
  },
  {
    id: "2",
    name: "奇门遁甲助手",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=qimen&backgroundColor=7c3aed",
    description: "起局断卦预测",
    rating: 4.8,
    useCount: 89000,
  },
  {
    id: "3",
    name: "国学经典导读",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=guoxue&backgroundColor=059669",
    description: "经典深度解读",
    rating: 4.9,
    useCount: 67000,
  },
]

interface AgentRecommendCardProps {
  title?: string
  subtitle?: string
  bots?: typeof defaultBots
  variant?: "horizontal" | "vertical" | "compact"
  context?: string // 来源场景，用于统计
  className?: string
}

// 格式化数量
function formatCount(num: number) {
  if (num >= 10000) {
    return `${(num / 10000).toFixed(1)}万`
  }
  return num.toLocaleString()
}

export function AgentRecommendCard({
  title = "智能体推荐",
  subtitle = "AI为您精选",
  bots = defaultBots,
  variant = "horizontal",
  context,
  className,
}: AgentRecommendCardProps) {
  // 紧凑模式 - 适合侧边栏、卡片内
  if (variant === "compact") {
    return (
      <div className={cn("bg-gradient-to-br from-[#C41E3A]/5 to-[#7C3AED]/5 rounded-xl p-3", className)}>
        <div className="flex items-center gap-2 mb-2">
          <Bot className="w-4 h-4 text-[#C41E3A]" />
          <span className="text-[12px] font-medium text-[#2C2C2C]">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {bots.slice(0, 3).map((bot, index) => (
            <Link
              key={bot.id}
              href={`/agent/${bot.id}${context ? `?from=${context}` : ""}`}
              className="flex-1"
            >
              <div className="flex flex-col items-center p-2 bg-white rounded-lg hover:shadow-sm transition-all">
                <img src={bot.avatar} alt="" className="w-8 h-8 rounded-lg" />
                <span className="text-[10px] text-[#666] mt-1 truncate w-full text-center">{bot.name.slice(0, 4)}</span>
              </div>
            </Link>
          ))}
          <Link href="/agents" className="flex-1">
            <div className="flex flex-col items-center p-2 bg-white rounded-lg hover:shadow-sm transition-all">
              <div className="w-8 h-8 rounded-lg bg-[#F5F0E8] flex items-center justify-center">
                <ChevronRight className="w-4 h-4 text-[#999]" />
              </div>
              <span className="text-[10px] text-[#999] mt-1">更多</span>
            </div>
          </Link>
        </div>
      </div>
    )
  }

  // 垂直模式 - 适合详情页侧边
  if (variant === "vertical") {
    return (
      <div className={cn("bg-white rounded-2xl p-4 shadow-sm", className)}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#C41E3A]" />
            <span className="font-bold text-[14px] text-[#2C2C2C]">{title}</span>
          </div>
          <Link href="/agents" className="text-[11px] text-[#999]">
            更多
          </Link>
        </div>
        <div className="space-y-3">
          {bots.map(bot => (
            <Link
              key={bot.id}
              href={`/agent/${bot.id}${context ? `?from=${context}` : ""}`}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#FAF8F5] transition-colors"
            >
              <img src={bot.avatar} alt="" className="w-10 h-10 rounded-xl" />
              <div className="flex-1 min-w-0">
                <h4 className="text-[13px] font-medium text-[#2C2C2C] truncate">{bot.name}</h4>
                <p className="text-[11px] text-[#999]">{bot.description}</p>
              </div>
              <MessageCircle className="w-4 h-4 text-[#C41E3A]" />
            </Link>
          ))}
        </div>
      </div>
    )
  }

  // 水平模式（默认）- 适合首页、信息流
  return (
    <div className={cn("", className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-[#C41E3A]" />
          <span className="font-bold text-[#2C2C2C]">{title}</span>
          <span className="text-[11px] text-[#999]">{subtitle}</span>
        </div>
        <Link href="/agents" className="text-[12px] text-[#C41E3A] flex items-center">
          全部 <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {bots.map(bot => (
          <Link
            key={bot.id}
            href={`/agent/${bot.id}${context ? `?from=${context}` : ""}`}
            className="flex-shrink-0 w-[140px]"
          >
            <div className="bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-2">
                <img src={bot.avatar} alt="" className="w-10 h-10 rounded-xl" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-[12px] font-medium text-[#2C2C2C] truncate">{bot.name}</h4>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-[#FFB800] fill-[#FFB800]" />
                    <span className="text-[10px] text-[#666]">{bot.rating}</span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-[#999] line-clamp-1">{bot.description}</p>
              <div className="mt-2 pt-2 border-t border-[#F5F0E8]">
                <span className="text-[10px] text-[#999]">{formatCount(bot.useCount)}次对话</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}

// 智能体问答入口组件 - 适合排盘结果页等场景
interface AgentAskEntryProps {
  botId?: string
  botName?: string
  botAvatar?: string
  question?: string
  context?: string
  className?: string
}

export function AgentAskEntry({
  botId = "1",
  botName = "八字命理大师",
  botAvatar = "https://api.dicebear.com/7.x/bottts/svg?seed=bazi&backgroundColor=c41e3a",
  question = "帮我解读这个命盘",
  context,
  className,
}: AgentAskEntryProps) {
  const href = `/agent/${botId}?q=${encodeURIComponent(question)}${context ? `&from=${context}` : ""}`
  
  return (
    <Link href={href} className={cn("block", className)}>
      <div className="bg-gradient-to-r from-[#C41E3A] to-[#A01530] rounded-xl p-3 flex items-center gap-3">
        <img src={botAvatar} alt="" className="w-10 h-10 rounded-xl bg-white/20" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium text-[13px]">{botName}</span>
            <span className="px-1.5 py-0.5 bg-white/20 text-white text-[10px] rounded">AI解读</span>
          </div>
          <p className="text-white/70 text-[11px] mt-0.5 truncate">{question}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          <MessageCircle className="w-4 h-4 text-white" />
        </div>
      </div>
    </Link>
  )
}
