"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { 
  Search, Mic, ChevronRight, MessageCircle, 
  TrendingUp, Star, Crown, Zap, Bot,
  Flame, Clock, X, Eye, ChevronDown, Volume2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { BottomNav } from "@/components/bottom-nav"

// 热门智能体数据（来自Coze API）
const hotBots = [
  {
    id: "1",
    name: "八字命理大师",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=bazi&backgroundColor=c41e3a",
    description: "专业八字排盘解读，精准分析命局特点，为您揭示人生密码",
    category: "bazi",
    categoryName: "八字命理",
    hotScore: 9856,
    useCount: 128000,
    rating: 4.9,
    ratingCount: 3256,
    tags: ["八字", "命理", "流年运势"],
    isOfficial: true,
    isRecommended: true,
    isNew: false,
    isFree: false,
    capabilities: ["语音对话", "图片识别", "深度解析"],
    gradient: "from-[#C41E3A] to-[#A01530]",
  },
  {
    id: "2",
    name: "奇门遁甲助手",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=qimen&backgroundColor=7c3aed",
    description: "奇门遁甲起局断卦，预测事业、感情、财运，指点迷津",
    category: "qimen",
    categoryName: "奇门遁甲",
    hotScore: 7823,
    useCount: 89000,
    rating: 4.8,
    ratingCount: 2134,
    tags: ["奇门", "预测", "决策"],
    isOfficial: true,
    isRecommended: true,
    isNew: false,
    isFree: true,
    capabilities: ["实时起局", "详细解读"],
    gradient: "from-[#7C3AED] to-[#5B21B6]",
  },
  {
    id: "3",
    name: "国学经典导读",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=guoxue&backgroundColor=059669",
    description: "《易经》《道德经》等国学经典深度解读，让古籍活起来",
    category: "guoxue",
    categoryName: "国学经典",
    hotScore: 6542,
    useCount: 67000,
    rating: 4.9,
    ratingCount: 1876,
    tags: ["易经", "国学", "智慧"],
    isOfficial: true,
    isRecommended: false,
    isNew: true,
    isFree: true,
    capabilities: ["语音朗读", "原文释义", "智慧问答"],
    gradient: "from-[#059669] to-[#047857]",
  },
  {
    id: "4",
    name: "智能起名顾问",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=naming&backgroundColor=ea580c",
    description: "结合八字五行、三才五格，为宝宝取一个吉祥好名",
    category: "naming",
    categoryName: "起名改名",
    hotScore: 8234,
    useCount: 102000,
    rating: 4.7,
    ratingCount: 2567,
    tags: ["起名", "五行", "吉祥"],
    isOfficial: false,
    isRecommended: true,
    isNew: false,
    isFree: false,
    price: 9.9,
    capabilities: ["五行分析", "寓意解读", "多方案推荐"],
    gradient: "from-[#EA580C] to-[#C2410C]",
  },
  {
    id: "5",
    name: "紫微斗数解盘",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=ziwei&backgroundColor=6366f1",
    description: "紫微斗数命盘解读，十二宫位详解，了解命运轨迹",
    category: "ziwei",
    categoryName: "紫微斗数",
    hotScore: 5678,
    useCount: 56000,
    rating: 4.8,
    ratingCount: 1432,
    tags: ["紫微", "命盘", "宫位"],
    isOfficial: true,
    isRecommended: false,
    isNew: false,
    isFree: true,
    capabilities: ["命盘生成", "详细解读"],
    gradient: "from-[#6366F1] to-[#4F46E5]",
  },
  {
    id: "6",
    name: "国学文案大师",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=copywrite&backgroundColor=0891b2",
    description: "一键生成国学风格推广文案、朋友圈文案、短视频脚本",
    category: "content",
    categoryName: "文案创作",
    hotScore: 9234,
    useCount: 156000,
    rating: 4.9,
    ratingCount: 3567,
    tags: ["文案", "朋友圈", "短视频"],
    isOfficial: true,
    isRecommended: true,
    isNew: false,
    isFree: true,
    capabilities: ["多风格文案", "一键生成", "智能改写"],
    gradient: "from-[#0891B2] to-[#0E7490]",
  },
]

// 热门问答
const hotQuestions = [
  { id: "q1", question: "我的八字适合创业还是打工？", botId: "1", botName: "八字命理大师", botAvatar: hotBots[0].avatar, views: 12800 },
  { id: "q2", question: "2024年下半年财运如何？", botId: "1", botName: "八字命理大师", botAvatar: hotBots[0].avatar, views: 9600 },
  { id: "q3", question: "奇门遁甲如何预测项目成败？", botId: "2", botName: "奇门遁甲助手", botAvatar: hotBots[1].avatar, views: 8700 },
  { id: "q4", question: "给属龙宝宝起名有什么讲究？", botId: "4", botName: "智能起名顾问", botAvatar: hotBots[3].avatar, views: 7500 },
  { id: "q5", question: "如何入门学习《易经》？", botId: "3", botName: "国学经典导读", botAvatar: hotBots[2].avatar, views: 6800 },
]

// 格式化数量
function formatCount(num: number) {
  if (num >= 10000) {
    return `${(num / 10000).toFixed(1)}万`
  }
  return num.toLocaleString()
}

export default function AgentsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [showAllBots, setShowAllBots] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  // 语音搜索
  const handleVoiceSearch = () => {
    setIsListening(true)
    setTimeout(() => {
      setIsListening(false)
      setSearchQuery("八字分析")
    }, 2000)
  }

  // 显示的智能体列表
  const displayBots = showAllBots ? hotBots : hotBots.slice(0, 4)

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-24">
      {/* 顶部搜索区 */}
      <div className="sticky top-0 z-50 bg-gradient-to-b from-[#C41E3A] to-[#A01530] pt-safe">
        <div className="px-4 pt-3 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h1 className="text-[20px] font-bold text-white">智能体广场</h1>
              <span className="px-2 py-0.5 bg-white/20 rounded-full text-[11px] text-white/90 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {hotBots.length}个在线
              </span>
            </div>
            <Link href="/agents/history" className="text-[12px] text-white/80 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              对话记录
            </Link>
          </div>
          
          {/* 搜索框 */}
          <div className="relative">
            <div className="flex items-center bg-white rounded-xl px-3 py-2.5 shadow-lg">
              <Search className="w-5 h-5 text-[#999] flex-shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索智能体或直接提问..."
                className="flex-1 ml-2 text-[14px] bg-transparent outline-none text-[#333] placeholder:text-[#999]"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="p-1">
                  <X className="w-4 h-4 text-[#999]" />
                </button>
              )}
              <div className="w-px h-5 bg-[#E5E5E5] mx-2" />
              <button 
                onClick={handleVoiceSearch}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                  isListening ? "bg-[#C41E3A] animate-pulse" : "bg-[#F5F0E8]"
                )}
              >
                <Mic className={cn("w-4 h-4", isListening ? "text-white" : "text-[#666]")} />
              </button>
            </div>
            {isListening && (
              <div className="absolute inset-0 flex items-center justify-center bg-white rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#C41E3A] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-[#C41E3A] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-[#C41E3A] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  <span className="ml-2 text-[14px] text-[#666]">正在聆听...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 主智能客服入口 */}
      <div className="px-4 pt-4">
        <Link href="/agent/main" className="block">
          <div className="relative bg-gradient-to-r from-[#1a1a2e] to-[#16213e] rounded-2xl p-4 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#C41E3A]/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#7C3AED]/20 rounded-full blur-2xl" />
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#C41E3A] to-[#7C3AED] flex items-center justify-center shadow-lg">
                <Bot className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-bold text-[16px]">热卜智能助手</h3>
                  <span className="px-1.5 py-0.5 bg-[#52C41A] text-white text-[10px] rounded">在线</span>
                </div>
                <p className="text-white/60 text-[12px] mt-1">有任何问题都可以问我，我来帮您解答</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* 热门问答 - 用户关心的问题 */}
      <div className="px-4 pt-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-[#FF6B35]" />
            <span className="font-bold text-[#2C2C2C]">大家都在问</span>
          </div>
          <Link href="/agents/questions" className="text-[12px] text-[#999] flex items-center">
            更多 <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="space-y-2">
          {hotQuestions.slice(0, 3).map((q, index) => (
            <Link 
              key={q.id} 
              href={`/agent/${q.botId}?q=${encodeURIComponent(q.question)}`}
              className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm"
            >
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0",
                index === 0 ? "bg-[#FF6B35] text-white" : 
                index === 1 ? "bg-[#FFB800] text-white" : 
                "bg-[#E8E3DB] text-[#666]"
              )}>
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-[#2C2C2C] line-clamp-1">{q.question}</p>
                <div className="flex items-center gap-2 mt-1">
                  <img src={q.botAvatar} alt="" className="w-4 h-4 rounded" />
                  <span className="text-[11px] text-[#999]">{q.botName}</span>
                  <span className="text-[11px] text-[#BBB]">·</span>
                  <span className="text-[11px] text-[#999]">{formatCount(q.views)}浏览</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#CCC] flex-shrink-0" />
            </Link>
          ))}
        </div>
      </div>

      {/* 智能体列表 */}
      <div className="px-4 pt-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#C41E3A]" />
            <span className="font-bold text-[#2C2C2C]">智能体</span>
          </div>
          <Link href="/agents/ranking" className="flex items-center gap-1 text-[12px] text-[#C9A96E]">
            <Crown className="w-3.5 h-3.5" />
            热度榜
          </Link>
        </div>

        {/* 智能体卡片 */}
        <div className="space-y-3">
          {displayBots.map((bot, index) => (
            <Link key={bot.id} href={`/agent/${bot.id}`} className="block">
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  {/* 头像 */}
                  <div className="relative flex-shrink-0">
                    <div className={cn("w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center", bot.gradient)}>
                      <img src={bot.avatar} alt="" className="w-10 h-10" />
                    </div>
                    {index < 3 && (
                      <div className={cn(
                        "absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow",
                        index === 0 ? "bg-[#FFD700] text-[#333]" : 
                        index === 1 ? "bg-[#C0C0C0] text-white" : 
                        "bg-[#CD7F32] text-white"
                      )}>
                        {index + 1}
                      </div>
                    )}
                  </div>
                  
                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-[15px] text-[#2C2C2C] truncate">{bot.name}</h3>
                      {bot.isOfficial && <Crown className="w-4 h-4 text-[#C9A96E] flex-shrink-0" />}
                      {bot.isNew && <span className="px-1.5 py-0.5 bg-[#52C41A] text-white text-[9px] rounded flex-shrink-0">NEW</span>}
                    </div>
                    <p className="text-[12px] text-[#666] line-clamp-2 mt-1">{bot.description}</p>
                    
                    {/* 能力标签 */}
                    {bot.capabilities && bot.capabilities.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {bot.capabilities.slice(0, 3).map((cap, i) => (
                          <span key={i} className="px-2 py-0.5 bg-[#F5F0E8] text-[#8B7355] text-[10px] rounded-full">
                            {cap}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* 数据统计 */}
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-[#FFB800] fill-[#FFB800]" />
                        <span className="text-[12px] text-[#666]">{bot.rating}</span>
                      </div>
                      <span className="text-[12px] text-[#999]">{formatCount(bot.useCount)}次对话</span>
                      {bot.capabilities?.includes("语音对话") && (
                        <span className="flex items-center gap-0.5 text-[11px] text-[#7C3AED]">
                          <Volume2 className="w-3.5 h-3.5" />语音
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 对话按钮 */}
                  <button 
                    onClick={(e) => {
                      e.preventDefault()
                      router.push(`/agent/${bot.id}`)
                    }}
                    className="px-4 py-2 bg-[#C41E3A] text-white text-[13px] font-medium rounded-full flex-shrink-0"
                  >
                    对话
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* 展开/收起 */}
        {hotBots.length > 4 && (
          <button
            onClick={() => setShowAllBots(!showAllBots)}
            className="w-full mt-3 py-2.5 bg-white rounded-xl text-[13px] text-[#666] flex items-center justify-center gap-1 shadow-sm"
          >
            {showAllBots ? "收起" : `查看全部${hotBots.length}个智能体`}
            <ChevronDown className={cn("w-4 h-4 transition-transform", showAllBots && "rotate-180")} />
          </button>
        )}
      </div>

      {/* 底部间距 */}
      <div className="h-8" />

      <BottomNav />
    </div>
  )
}
