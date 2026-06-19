"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { BackButton } from "@/components/common/back-button"
import { Search, X, Trash2, Flame, Users, BookOpen, ShoppingBag, Bot, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { AISearchButton, AISearchModal, useAISearch } from "@/components/ai-search"

// 热门搜索关键词
const hotSearches = [
  { keyword: "八字入门", isHot: true, rank: 1 },
  { keyword: "紫微斗数", isHot: true, rank: 2 },
  { keyword: "风水布局", isHot: false, rank: 3 },
  { keyword: "奇门遁甲", isHot: true, rank: 4 },
  { keyword: "六爻预测", isHot: false, rank: 5 },
  { keyword: "梅花易数", isHot: false, rank: 6 },
  { keyword: "姓名学", isHot: false, rank: 7 },
  { keyword: "面相手相", isHot: false, rank: 8 },
]

// 搜索联想数据
const searchSuggestions: Record<string, { keyword: string; count: number }[]> = {
  "八": [
    { keyword: "八字排盘", count: 12800 },
    { keyword: "八字入门教程", count: 8560 },
    { keyword: "八字看婚姻", count: 6280 },
    { keyword: "八字看财运", count: 5120 },
    { keyword: "八字命理书籍", count: 3680 },
  ],
  "紫": [
    { keyword: "紫微斗数", count: 15600 },
    { keyword: "紫微斗数入门", count: 8920 },
    { keyword: "紫微斗数排盘", count: 7680 },
    { keyword: "紫微斗数课程", count: 4520 },
  ],
  "风": [
    { keyword: "风水学", count: 18200 },
    { keyword: "风水布局", count: 12800 },
    { keyword: "风水入门", count: 9560 },
    { keyword: "风水大师", count: 6280 },
  ],
}

// 场景化 placeholder（根据来源页面）
const scenePlaceholder: Record<string, string> = {
  course: "搜索相关课程...",
  mall: "搜索商品、好物...",
  shop: "搜索商品、好物...",
  classics: "搜索古籍、诗词...",
  circle: "搜索圈子...",
  default: "搜索课程、商品、圈子、古籍...",
}

function SearchPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get("from") || "default"

  const [keyword, setKeyword] = useState("")
  const [searchHistory, setSearchHistory] = useState<string[]>([
    "八字排盘", "紫微斗数入门", "风水课程", "易经"
  ])
  const [suggestions, setSuggestions] = useState<{ keyword: string; count: number }[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const aiSearch = useAISearch()

  useEffect(() => {
    // 自动聚焦输入框，弹起键盘
    inputRef.current?.focus()
  }, [])

  // 监听输入变化，更新实时联想词
  useEffect(() => {
    if (keyword) {
      const firstChar = keyword[0]
      const matched = searchSuggestions[firstChar] || []
      setSuggestions(matched.filter(s => s.keyword.toLowerCase().includes(keyword.toLowerCase())))
    } else {
      setSuggestions([])
    }
  }, [keyword])

  // 执行搜索 → 跳转结果页（携带来源用于智能默认Tab）
  const handleSearch = (searchKeyword?: string) => {
    const term = (searchKeyword || keyword).trim()
    if (!term) return
    if (!searchHistory.includes(term)) {
      setSearchHistory(prev => [term, ...prev.slice(0, 9)])
    }
    const fromParam = from !== "default" ? `&from=${from}` : ""
    router.push(`/search/result?keyword=${encodeURIComponent(term)}${fromParam}`)
  }

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      {/* AI对话式搜索弹窗 */}
      <AISearchModal
        isOpen={aiSearch.isOpen}
        onClose={aiSearch.close}
        placeholder="问我任何国学问题..."
      />

      {/* 顶部搜索栏 */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
        <div className="flex items-center gap-2 p-3">
          <BackButton />
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            {/* AI 徽章 */}
            <div className="absolute left-8 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/15">
              <Sparkles className="w-2.5 h-2.5 text-primary" />
              <span className="text-[9px] text-primary font-semibold leading-none">AI</span>
            </div>
            <input
              ref={inputRef}
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder={scenePlaceholder[from] || scenePlaceholder.default}
              className="w-full h-10 pl-[4.25rem] pr-9 bg-secondary rounded-full text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {keyword && (
              <button
                onClick={() => { setKeyword(""); inputRef.current?.focus() }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded-full"
                aria-label="清空"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <AISearchButton onClick={aiSearch.open} />
          <button
            onClick={() => keyword ? handleSearch() : window.history.back()}
            className="px-3 py-2 text-sm text-primary font-medium"
          >
            {keyword ? "搜索" : "取消"}
          </button>
        </div>
      </header>

      <main className="p-4">
        {/* 输入时：实时联想词 */}
        {keyword && suggestions.length > 0 && (
          <div className="space-y-1">
            {suggestions.map((item, index) => (
              <button
                key={index}
                onClick={() => handleSearch(item.keyword)}
                className="flex items-center justify-between w-full px-3 py-3 hover:bg-secondary/50 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">
                    <span className="text-primary">{keyword}</span>
                    {item.keyword.slice(keyword.length)}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">约{(item.count / 1000).toFixed(1)}k条结果</span>
              </button>
            ))}
          </div>
        )}

        {/* 输入但无联想词 */}
        {keyword && suggestions.length === 0 && (
          <button
            onClick={() => handleSearch()}
            className="flex items-center gap-3 w-full px-3 py-3 hover:bg-secondary/50 rounded-lg transition-colors"
          >
            <Search className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground">搜索 “<span className="text-primary">{keyword}</span>”</span>
          </button>
        )}

        {/* 未输入：搜索历史 + 热门搜索 + 猜你想搜 */}
        {!keyword && (
          <div className="space-y-6">
            {/* 搜索历史 */}
            {searchHistory.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-medium text-foreground">搜索历史</h2>
                  <button
                    onClick={() => setSearchHistory([])}
                    className="p-1 hover:bg-secondary rounded-full transition-colors"
                    aria-label="清除搜索历史"
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {searchHistory.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => handleSearch(item)}
                      className="px-3 py-1.5 bg-secondary text-sm text-foreground rounded-full hover:bg-secondary/80 transition-colors"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 热门搜索 */}
            <div>
              <h2 className="text-sm font-medium text-foreground mb-3">热门搜索</h2>
              <div className="space-y-2">
                {hotSearches.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearch(item.keyword)}
                    className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-secondary/50 rounded-lg transition-colors"
                  >
                    <span className={cn(
                      "w-5 h-5 rounded text-xs font-bold flex items-center justify-center",
                      item.rank <= 3 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                    )}>
                      {item.rank}
                    </span>
                    <span className="text-sm text-foreground flex-1 text-left">{item.keyword}</span>
                    {item.isHot && <Flame className="w-4 h-4 text-primary" />}
                  </button>
                ))}
              </div>
            </div>

            {/* 猜你想搜 */}
            <div>
              <h2 className="text-sm font-medium text-foreground mb-3">猜你想搜</h2>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: Bot, label: "AI八字分析", desc: "智能命盘解读" },
                  { icon: BookOpen, label: "入门必读", desc: "新手推荐课程" },
                  { icon: Users, label: "热门圈子", desc: "万人交流社区" },
                  { icon: ShoppingBag, label: "经典古籍", desc: "传世典藏好书" },
                ].map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearch(item.label)}
                    className="flex items-center gap-3 p-3 bg-card rounded-xl hover:bg-secondary/50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SearchPageContent />
    </Suspense>
  )
}
