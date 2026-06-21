"use client"

import { useState } from "react"
import Link from "next/link"
import { BackButton } from "@/components/common/back-button"
import { Search, Star, MessageCircle, Phone, ChevronDown, Filter, X, Sparkles } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { AISearchButton, AISearchModal, useAISearch } from "@/components/ai-search"

// 分类数据
const categories = [
  { id: "all", name: "全部" },
  { id: "bazi", name: "八字命理" },
  { id: "ziwei", name: "紫微斗数" },
  { id: "fengshui", name: "风水堪舆" },
  { id: "name", name: "姓名学" },
  { id: "health", name: "中医养生" },
  { id: "taoism", name: "道家文化" },
]

// 排序选项
const sortOptions = [
  { id: "default", name: "综合排序" },
  { id: "rating", name: "评分最高" },
  { id: "consults", name: "咨询最多" },
  { id: "price_low", name: "价格最低" },
]

// 讲师数据
const expertsData = [
  {
    id: 1,
    name: "周易大师",
    avatar: "/images/experts/expert-1.jpg",
    isVerified: true,
    title: "资深命理师",
    tags: ["八字命理", "紫微斗数", "风水"],
    intro: "从业20年，擅长八字精批、流年运势分析，已服务超过10000位学员",
    rating: 4.9,
    reviews: 1286,
    consults: 3560,
    askPrice: 30,
    callPrice: 10,
    isOnline: true,
  },
  {
    id: 2,
    name: "张玄风",
    avatar: "/images/experts/expert-2.jpg",
    isVerified: true,
    title: "紫微斗数传承人",
    tags: ["紫微斗数", "择日"],
    intro: "紫微斗数第四代传人，专注命盘分析与人生规划指导",
    rating: 4.8,
    reviews: 856,
    consults: 2180,
    askPrice: 50,
    callPrice: 15,
    isOnline: true,
  },
  {
    id: 3,
    name: "陈风水",
    avatar: "/images/experts/expert-1.jpg",
    isVerified: true,
    title: "风水堪舆专家",
    tags: ["风水堪舆", "阳宅", "商业风水"],
    intro: "实战派风水师，擅长住宅、商铺、办公室风水布局",
    rating: 4.7,
    reviews: 628,
    consults: 1560,
    askPrice: 40,
    callPrice: 20,
    isOnline: false,
  },
  {
    id: 4,
    name: "李姓名",
    avatar: "/images/experts/expert-2.jpg",
    isVerified: true,
    title: "姓名学研究者",
    tags: ["姓名学", "起名改名"],
    intro: "专注姓名学研究15年，起名改名案例超5000例",
    rating: 4.9,
    reviews: 1024,
    consults: 2860,
    askPrice: 25,
    callPrice: 8,
    isOnline: true,
  },
  {
    id: 5,
    name: "王养生",
    avatar: "/images/experts/expert-1.jpg",
    isVerified: false,
    title: "中医养生顾问",
    tags: ["中医养生", "体质调理"],
    intro: "中医世家出身，擅长根据命理分析体质特点，给出养生建议",
    rating: 4.6,
    reviews: 420,
    consults: 980,
    askPrice: 20,
    callPrice: 10,
    isOnline: false,
  },
  {
    id: 6,
    name: "道一真人",
    avatar: "/images/experts/expert-2.jpg",
    isVerified: true,
    title: "道家文化传播者",
    tags: ["道家文化", "修行指导"],
    intro: "武当山道士，专注道家养生与修行文化传播",
    rating: 4.8,
    reviews: 560,
    consults: 1280,
    askPrice: 35,
    callPrice: 12,
    isOnline: true,
  },
]

export default function ExpertsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState("all")
  const [activeSort, setActiveSort] = useState("default")
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100])
  const [onlyOnline, setOnlyOnline] = useState(false)
  const aiSearch = useAISearch()

  // 筛选和排序
  const filteredExperts = expertsData
    .filter(expert => {
      // 搜索筛选
      if (searchQuery && !expert.name.includes(searchQuery) && !expert.tags.some(t => t.includes(searchQuery))) {
        return false
      }
      // 分类筛选
      if (activeCategory !== "all") {
        const categoryMap: Record<string, string[]> = {
          bazi: ["八字命理"],
          ziwei: ["紫微斗数"],
          fengshui: ["风水堪舆", "风水", "阳宅"],
          name: ["姓名学", "起名改名"],
          health: ["中医养生", "体质调理"],
          taoism: ["道家文化", "修行指导"],
        }
        if (!expert.tags.some(t => categoryMap[activeCategory]?.some(c => t.includes(c)))) {
          return false
        }
      }
      // 价格筛选
      if (expert.askPrice < priceRange[0] || expert.askPrice > priceRange[1]) {
        return false
      }
      // 在线筛选
      if (onlyOnline && !expert.isOnline) {
        return false
      }
      return true
    })
    .sort((a, b) => {
      switch (activeSort) {
        case "rating":
          return b.rating - a.rating
        case "consults":
          return b.consults - a.consults
        case "price_low":
          return a.askPrice - b.askPrice
        default:
          return b.rating * b.consults - a.rating * a.consults
      }
    })

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* AI搜索弹窗 */}
      <AISearchModal isOpen={aiSearch.isOpen} onClose={aiSearch.close} context="讲师" />

      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
  <div className="flex items-center gap-2 px-4 h-14">
  <BackButton fallbackPath="/discover" />
          
          {/* 搜索框 */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索讲师/达人"
              className="w-full h-9 pl-9 pr-4 bg-secondary rounded-full text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <AISearchButton onClick={aiSearch.open} />
        </div>

        {/* 分类Tab */}
        <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors",
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* 排序和筛选 */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border">
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-1 text-sm text-foreground"
            >
              {sortOptions.find(s => s.id === activeSort)?.name}
              <ChevronDown className={cn("w-4 h-4 transition-transform", showSortMenu && "rotate-180")} />
            </button>
            
            {showSortMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
                <div className="absolute top-full left-0 mt-1 bg-card rounded-lg shadow-lg border border-border overflow-hidden z-20 min-w-32">
                  {sortOptions.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => { setActiveSort(opt.id); setShowSortMenu(false) }}
                      className={cn(
                        "w-full px-4 py-2.5 text-sm text-left hover:bg-secondary transition-colors",
                        activeSort === opt.id ? "text-primary bg-primary/5" : "text-foreground"
                      )}
                    >
                      {opt.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => setShowFilter(true)}
            className="flex items-center gap-1 text-sm text-muted-foreground"
          >
            <Filter className="w-4 h-4" />
            筛选
          </button>
        </div>
      </header>

      {/* 讲师列表 */}
      <div className="p-4 space-y-2">
        {filteredExperts.length > 0 ? (
          filteredExperts.map(expert => (
            <Link key={expert.id} href={`/expert/${expert.id}`}>
              <Card className="p-3 border-0 rounded-[10px] shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)] transition-all duration-300 bg-white">
                <div className="flex gap-3">
                  {/* 头像 */}
                  <div className="relative flex-shrink-0">
                    <Avatar className="w-16 h-16 rounded-[10px]">
                      <AvatarImage src={expert.avatar} alt={expert.name} className="rounded-[10px]" />
                      <AvatarFallback className="bg-[#F5F1EB] text-[#C41E3A] text-lg font-medium rounded-[10px]">
                        {expert.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    {expert.isOnline && (
                      <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </div>

                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[15px] font-semibold text-[#2C2C2C]">{expert.name}</span>
                      {expert.isVerified && (
                        <Badge className="text-[10px] px-1 py-0 bg-[#C9A96E]/20 text-[#C9A96E] border-0">V</Badge>
                      )}
                      <span className="text-[11px] text-[#666666]">{expert.title}</span>
                    </div>

                    {/* 标签 */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {expert.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} className="text-[10px] px-1.5 py-0 bg-[#F5F1EB] text-[#666666] border-0">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    {/* 简介 */}
                    <p className="text-[11px] text-[#666666] line-clamp-1 mb-2">{expert.intro}</p>

                    {/* 评分和数据 */}
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="flex items-center gap-0.5 text-[#C9A96E]">
                        <Star className="w-3.5 h-3.5 fill-[#C9A96E]" />
                        {expert.rating}
                      </span>
                      <span className="text-[#999999]">{expert.reviews}条评价</span>
                      <span className="text-[#999999]">{expert.consults}次咨询</span>
                    </div>
                  </div>
                </div>

                {/* 价格和操作 */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#F0EDE8]">
                  <div className="flex items-center gap-4 text-[11px]">
                    <span className="text-[#666666]">
                      提问 <span className="text-[#C41E3A] font-bold">{expert.askPrice}币/次</span>
                    </span>
                    <span className="text-[#666666]">
                      连麦 <span className="text-[#C41E3A] font-bold">{expert.callPrice}币/分钟</span>
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => { e.preventDefault(); }}
                      className="px-3 py-1.5 text-[11px] font-medium border border-[#C41E3A] text-[#C41E3A] rounded-full hover:bg-[#C41E3A]/10 transition-colors"
                    >
                      <MessageCircle className="w-3 h-3 inline mr-1" />
                      提问
                    </button>
                    <button 
                      onClick={(e) => { e.preventDefault(); }}
                      className={cn(
                        "px-3 py-1.5 text-[11px] font-medium rounded-full transition-colors",
                        expert.isOnline
                          ? "bg-[#C41E3A] text-white hover:bg-[#A01830]"
                          : "bg-[#F5F1EB] text-[#999999] cursor-not-allowed"
                      )}
                      disabled={!expert.isOnline}
                    >
                      <Phone className="w-3 h-3 inline mr-1" />
                      {expert.isOnline ? "连麦" : "离线"}
                    </button>
                  </div>
                </div>
              </Card>
            </Link>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">未找到相关讲师</p>
            <p className="text-muted-foreground/70 text-xs mt-1">试试其他关键词或筛选条件</p>
          </div>
        )}
      </div>

      {/* 筛选弹窗 */}
      {showFilter && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
          <div className="w-full max-w-lg bg-card rounded-t-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <span className="font-semibold text-foreground">筛选</span>
              <button onClick={() => setShowFilter(false)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              {/* 价格区间 */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">提问价格（币/次）</h4>
                <div className="flex flex-wrap gap-2">
                  {[[0, 100], [0, 20], [20, 50], [50, 100]].map(([min, max]) => (
                    <button
                      key={`${min}-${max}`}
                      onClick={() => setPriceRange([min, max])}
                      className={cn(
                        "px-4 py-2 text-sm rounded-lg transition-colors",
                        priceRange[0] === min && priceRange[1] === max
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground hover:bg-secondary/80"
                      )}
                    >
                      {min === 0 && max === 100 ? "不限" : `${min}-${max}币`}
                    </button>
                  ))}
                </div>
              </div>

              {/* 在线状态 */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">在线状态</h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOnlyOnline(false)}
                    className={cn(
                      "px-4 py-2 text-sm rounded-lg transition-colors",
                      !onlyOnline ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                    )}
                  >
                    全部
                  </button>
                  <button
                    onClick={() => setOnlyOnline(true)}
                    className={cn(
                      "px-4 py-2 text-sm rounded-lg transition-colors",
                      onlyOnline ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                    )}
                  >
                    仅看在线
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-4 border-t border-border">
              <button
                onClick={() => { setPriceRange([0, 100]); setOnlyOnline(false) }}
                className="flex-1 py-3 text-sm font-medium text-foreground bg-secondary rounded-xl hover:bg-secondary/80 transition-colors"
              >
                重置
              </button>
              <button
                onClick={() => setShowFilter(false)}
                className="flex-1 py-3 text-sm font-medium text-primary-foreground bg-primary rounded-xl hover:bg-primary/90 transition-colors"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
