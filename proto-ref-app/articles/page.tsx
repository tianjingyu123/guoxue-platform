"use client"

import { useState } from "react"
import Link from "next/link"
import { BackButton } from "@/components/common/back-button"
import { Search, Heart, MessageCircle, ChevronDown, FileText, X, Sparkles } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { AISearchButton, AISearchModal, useAISearch } from "@/components/ai-search"

// 分类数据
const categories = [
  { id: "all", name: "全部" },
  { id: "mingli", name: "命理研究" },
  { id: "fengshui", name: "风水案例" },
  { id: "guoxue", name: "国学经典" },
  { id: "yangsheng", name: "养生文化" },
]

// 文章数据
const articlesData = [
  {
    id: 1,
    title: "八字命理入门：如何看懂自己的四柱八字",
    excerpt: "八字命理是中国传统命理学的核心，通过分析一个人出生的年、月、日、时四柱，来推断其命运走向...",
    cover: "/images/articles/article-1.jpg",
    author: { name: "周易大师", avatar: "/images/experts/expert-1.jpg", isVerified: true },
    category: "mingli",
    likes: 1280,
    comments: 156,
    createdAt: "2024-01-15",
    isTop: true,
  },
  {
    id: 2,
    title: "家居风水布局：客厅沙发摆放的五大禁忌",
    excerpt: "客厅是家庭的核心区域，沙发的摆放位置直接影响家庭的运势和健康。本文详细解析沙发摆放的风水要点...",
    cover: "/images/articles/article-2.jpg",
    author: { name: "陈风水", avatar: "/images/experts/expert-2.jpg", isVerified: true },
    category: "fengshui",
    likes: 856,
    comments: 98,
    createdAt: "2024-01-14",
    isTop: false,
  },
  {
    id: 3,
    title: "《易经》乾卦详解：自强不息的人生智慧",
    excerpt: "乾卦是易经六十四卦之首，象征天道运行，刚健有力。乾卦的核心精神是自强不息，这对现代人的启示...",
    cover: "/images/articles/article-3.jpg",
    author: { name: "张玄风", avatar: "/images/experts/expert-1.jpg", isVerified: true },
    category: "guoxue",
    likes: 2156,
    comments: 234,
    createdAt: "2024-01-13",
    isTop: false,
  },
  {
    id: 4,
    title: "中医养生：春季养肝的十个小妙招",
    excerpt: "春季是养肝的最佳时节，肝属木，与春季相应。本文从饮食、起居、情志等方面，分享十个实用的养肝方法...",
    cover: "/images/articles/article-1.jpg",
    author: { name: "李易安", avatar: "/images/experts/expert-2.jpg", isVerified: false },
    category: "yangsheng",
    likes: 568,
    comments: 67,
    createdAt: "2024-01-12",
    isTop: false,
  },
  {
    id: 5,
    title: "紫微斗数：命宫主星的性格特征分析",
    excerpt: "命宫是紫微斗数中最重要的宫位，命宫主星决定了一个人的基本性格特征。本文逐一分析十四主星的性格...",
    cover: "/images/articles/article-2.jpg",
    author: { name: "周易大师", avatar: "/images/experts/expert-1.jpg", isVerified: true },
    category: "mingli",
    likes: 1024,
    comments: 128,
    createdAt: "2024-01-11",
    isTop: false,
  },
  {
    id: 6,
    title: "办公室风水：提升事业运的桌面布局",
    excerpt: "办公桌的布局对事业运势有着重要影响。本文从方位、物品摆放、色彩搭配等角度，教你打造旺运办公环境...",
    cover: "/images/articles/article-3.jpg",
    author: { name: "陈风水", avatar: "/images/experts/expert-2.jpg", isVerified: true },
    category: "fengshui",
    likes: 756,
    comments: 89,
    createdAt: "2024-01-10",
    isTop: false,
  },
]

export default function ArticlesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState("all")
  const [sortBy, setSortBy] = useState<"latest" | "popular">("latest")
  const [showSortMenu, setShowSortMenu] = useState(false)
  const aiSearch = useAISearch()

  // 筛选文章
  const filteredArticles = articlesData
    .filter(article => {
      const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           article.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = activeCategory === "all" || article.category === activeCategory
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      if (sortBy === "popular") {
        return b.likes - a.likes
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

  // 格式化时间
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return "今天"
    if (diffDays === 1) return "昨天"
    if (diffDays < 7) return `${diffDays}天前`
    return `${date.getMonth() + 1}-${date.getDate()}`
  }

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      {/* AI搜索弹窗 */}
      <AISearchModal isOpen={aiSearch.isOpen} onClose={aiSearch.close} context="文章" />

      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
  <div className="flex items-center gap-3 px-4 h-14">
  <BackButton />
  <h1 className="font-semibold text-lg text-foreground">文章</h1>
          <div className="flex-1" />
          <AISearchButton onClick={aiSearch.open} />
        </div>

        {/* 搜索框 */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索文章标题或内容"
              className="w-full h-10 pl-10 pr-10 bg-secondary rounded-full text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* 分类Tab */}
        <div className="flex items-center gap-1 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-all flex-shrink-0",
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </header>

      {/* 排序栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm text-muted-foreground">
          共 {filteredArticles.length} 篇文章
        </span>
        <div className="relative">
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="flex items-center gap-1 text-sm text-foreground"
          >
            {sortBy === "latest" ? "最新发布" : "最受欢迎"}
            <ChevronDown className={cn("w-4 h-4 transition-transform", showSortMenu && "rotate-180")} />
          </button>
          {showSortMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-28 bg-card rounded-lg shadow-lg border border-border z-50 overflow-hidden">
                <button
                  onClick={() => { setSortBy("latest"); setShowSortMenu(false) }}
                  className={cn(
                    "w-full px-4 py-2.5 text-sm text-left hover:bg-secondary transition-colors",
                    sortBy === "latest" ? "text-primary font-medium" : "text-foreground"
                  )}
                >
                  最新发布
                </button>
                <button
                  onClick={() => { setSortBy("popular"); setShowSortMenu(false) }}
                  className={cn(
                    "w-full px-4 py-2.5 text-sm text-left hover:bg-secondary transition-colors",
                    sortBy === "popular" ? "text-primary font-medium" : "text-foreground"
                  )}
                >
                  最受欢迎
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 文章列表 */}
      <div className="p-4 space-y-0">
        {filteredArticles.length > 0 ? (
          filteredArticles.map(article => (
            <Link key={article.id} href={`/article/${article.id}`}>
              <Card className="flex gap-3 p-3 border-0 rounded-[10px] shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)] transition-all duration-300 bg-white mb-2">
                {/* 封面图 */}
                <div className="w-28 h-20 rounded-[8px] flex-shrink-0 overflow-hidden">
                  <img src={article.cover} alt={article.title} className="w-full h-full object-cover" loading="lazy" />
                </div>

                {/* 文章信息 */}
                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="flex items-start gap-2">
                    {article.isTop && (
                      <Badge className="text-[10px] px-1.5 py-0 bg-[#C41E3A]/10 text-[#C41E3A] border-0 flex-shrink-0">
                        置顶
                      </Badge>
                    )}
                    <h3 className="text-[15px] font-medium text-[#2C2C2C] line-clamp-2 flex-1 leading-snug">
                      {article.title}
                    </h3>
                  </div>

                  <p className="text-[11px] text-[#666666] line-clamp-1 mt-1">
                    {article.excerpt}
                  </p>

                  <div className="flex items-center justify-between mt-auto pt-2">
                    <div className="flex items-center gap-1.5">
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={article.author.avatar} />
                        <AvatarFallback className="text-[9px] bg-[#F5F1EB] text-[#666666]">
                          {article.author.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[11px] text-[#666666]">{article.author.name}</span>
                      {article.author.isVerified && (
                        <Badge className="text-[8px] px-1 py-0 bg-[#C9A96E]/20 text-[#C9A96E] border-0">V</Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-[#999999]">
                      <span className="flex items-center gap-0.5">
                        <Heart className="w-3.5 h-3.5" />
                        {article.likes}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <MessageCircle className="w-3.5 h-3.5" />
                        {article.comments}
                      </span>
                      <span>{formatDate(article.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">暂无相关文章</p>
            <p className="text-muted-foreground/70 text-xs mt-1">换个关键词试试</p>
          </div>
        )}

        {/* 加载更多 */}
        {filteredArticles.length > 0 && (
          <div className="flex items-center justify-center py-6">
            <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              点击加载更多
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
