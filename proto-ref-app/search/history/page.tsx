"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, X, Search, Clock, Flame, TrendingUp, Sparkles } from "lucide-react"

interface HistoryItem {
  keyword: string
  time: string
}

interface HotItem {
  id: string
  keyword: string
  heat: number
  isNew?: boolean
  isHot?: boolean
  trend?: 'up' | 'down' | 'stable'
}

interface Suggestion {
  keyword: string
  type: 'history' | 'hot' | 'suggest'
  count?: number
}

export default function SearchHistoryPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [keyword, setKeyword] = useState("")
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [hotList, setHotList] = useState<HotItem[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    inputRef.current?.focus()
    loadData()
  }, [])

  useEffect(() => {
    if (keyword.trim()) {
      const timer = setTimeout(() => {
        loadSuggestions(keyword)
      }, 300)
      return () => clearTimeout(timer)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [keyword])

  const loadData = async () => {
    setIsLoading(true)
    await new Promise(resolve => setTimeout(resolve, 500))
    
    setHistory([
      { keyword: "易经入门", time: "2024-01-15" },
      { keyword: "八字排盘", time: "2024-01-14" },
      { keyword: "梅花易数教程", time: "2024-01-13" },
      { keyword: "风水布局", time: "2024-01-12" },
      { keyword: "六爻预测", time: "2024-01-11" },
      { keyword: "奇门遁甲", time: "2024-01-10" },
    ])
    
    setHotList([
      { id: "1", keyword: "2024年运势解析", heat: 98532, isHot: true, trend: 'up' },
      { id: "2", keyword: "易经六十四卦详解", heat: 87421, isNew: true, trend: 'up' },
      { id: "3", keyword: "八字合婚", heat: 76543, isHot: true, trend: 'stable' },
      { id: "4", keyword: "家居风水禁忌", heat: 65432, trend: 'up' },
      { id: "5", keyword: "梅花易数起卦方法", heat: 54321, trend: 'down' },
      { id: "6", keyword: "紫微斗数入门", heat: 43210, isNew: true, trend: 'up' },
      { id: "7", keyword: "面相学基础", heat: 32109, trend: 'stable' },
      { id: "8", keyword: "六爻占卜实例", heat: 21098, trend: 'down' },
      { id: "9", keyword: "奇门遁甲排盘", heat: 19876, trend: 'up' },
      { id: "10", keyword: "风水罗盘使用", heat: 18765, trend: 'stable' },
    ])
    
    setIsLoading(false)
  }

  const loadSuggestions = async (kw: string) => {
    await new Promise(resolve => setTimeout(resolve, 200))
    setSuggestions([
      { keyword: `${kw}入门教程`, type: 'suggest', count: 12580 },
      { keyword: `${kw}视频课程`, type: 'suggest', count: 8932 },
      { keyword: `${kw}实战案例`, type: 'hot', count: 6543 },
      { keyword: `${kw}学习路径`, type: 'suggest', count: 4321 },
      { keyword: `${kw}名师讲解`, type: 'history' },
    ])
    setShowSuggestions(true)
  }

  const handleSearch = (kw: string) => {
    if (!kw.trim()) return
    router.push(`/search/result?keyword=${encodeURIComponent(kw)}`)
  }

  const handleClearHistory = async () => {
    setHistory([])
    setShowClearConfirm(false)
  }

  const removeHistoryItem = (kw: string) => {
    setHistory(prev => prev.filter(item => item.keyword !== kw))
  }

  const formatHeat = (heat: number) => {
    if (heat >= 10000) return `${(heat / 10000).toFixed(1)}万`
    return heat.toString()
  }

  const highlightKeyword = (text: string, kw: string) => {
    if (!kw) return text
    const parts = text.split(new RegExp(`(${kw})`, 'gi'))
    return parts.map((part, i) => 
      part.toLowerCase() === kw.toLowerCase() 
        ? <span key={i} className="text-[#C41E3A]">{part}</span>
        : part
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 顶部搜索栏 */}
      <div className="sticky top-0 z-20 bg-white border-b border-[#E8E3DB] px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-[#666]">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999]" />
            <input
              ref={inputRef}
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(keyword)}
              placeholder="搜索课程、圈子、商品、用户..."
              className="w-full pl-10 pr-10 py-2.5 bg-[#F5F5F5] rounded-full text-sm outline-none focus:ring-2 focus:ring-[#C41E3A]/20"
            />
            {keyword && (
              <button 
                onClick={() => setKeyword("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button 
            onClick={() => handleSearch(keyword)}
            className="text-[#C41E3A] font-medium text-sm"
          >
            搜索
          </button>
        </div>
      </div>

      {/* 实时联想 */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-[60px] left-0 right-0 bg-white border-b border-[#E8E3DB] z-30">
          {suggestions.map((item, index) => (
            <button
              key={index}
              onClick={() => handleSearch(item.keyword)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[#FAF8F5] transition-colors border-b border-[#F5F5F5] last:border-b-0"
            >
              {item.type === 'history' ? (
                <Clock className="w-4 h-4 text-[#999]" />
              ) : item.type === 'hot' ? (
                <Flame className="w-4 h-4 text-[#FF6B35]" />
              ) : (
                <Search className="w-4 h-4 text-[#999]" />
              )}
              <span className="flex-1 text-left text-sm text-[#333]">
                {highlightKeyword(item.keyword, keyword)}
              </span>
              {item.count && (
                <span className="text-xs text-[#999]">{formatHeat(item.count)}次搜索</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* 主内容 */}
      {!showSuggestions && (
        <div className="p-4 space-y-6">
          {/* 搜索历史 */}
          {history.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#666]" />
                  <span className="text-sm font-medium text-[#333]">搜索历史</span>
                </div>
                <button 
                  onClick={() => setShowClearConfirm(true)}
                  className="text-xs text-[#999]"
                >
                  清除全部
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {history.map((item, index) => (
                  <div 
                    key={index}
                    className="group flex items-center gap-1 px-3 py-1.5 bg-white rounded-full border border-[#E8E3DB]"
                  >
                    <button 
                      onClick={() => handleSearch(item.keyword)}
                      className="text-sm text-[#666]"
                    >
                      {item.keyword}
                    </button>
                    <button 
                      onClick={() => removeHistoryItem(item.keyword)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-[#999]" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 热门搜索 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-4 h-4 text-[#FF6B35]" />
              <span className="text-sm font-medium text-[#333]">热门搜索</span>
              <Sparkles className="w-3 h-3 text-[#C9A96E]" />
            </div>
            
            {isLoading ? (
              <div className="space-y-3">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-6 h-6 bg-gray-200 rounded" />
                    <div className="flex-1 h-4 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                {hotList.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => handleSearch(item.keyword)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[#FAF8F5] transition-colors border-b border-[#F5F5F5] last:border-b-0"
                  >
                    {/* 排名 */}
                    <div className={`w-6 h-6 rounded flex items-center justify-center text-sm font-bold ${
                      index < 3 
                        ? 'bg-gradient-to-br from-[#C41E3A] to-[#E85A71] text-white' 
                        : 'bg-[#F5F5F5] text-[#999]'
                    }`}>
                      {index + 1}
                    </div>
                    
                    {/* 关键词 */}
                    <span className="flex-1 text-left text-sm text-[#333] truncate">
                      {item.keyword}
                    </span>
                    
                    {/* 标签 */}
                    {item.isNew && (
                      <span className="px-1.5 py-0.5 text-[10px] bg-[#52C41A]/10 text-[#52C41A] rounded">
                        新
                      </span>
                    )}
                    {item.isHot && (
                      <span className="px-1.5 py-0.5 text-[10px] bg-[#FF6B35]/10 text-[#FF6B35] rounded">
                        热
                      </span>
                    )}
                    
                    {/* 趋势 */}
                    {item.trend === 'up' && (
                      <TrendingUp className="w-3 h-3 text-[#C41E3A]" />
                    )}
                    
                    {/* 热度 */}
                    <span className="text-xs text-[#999]">{formatHeat(item.heat)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 猜你想搜 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-[#C9A96E]" />
              <span className="text-sm font-medium text-[#333]">猜你想搜</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {["八字入门", "风水学", "梅花易数", "紫微斗数", "面相学", "手相学"].map((kw, index) => (
                <button
                  key={index}
                  onClick={() => handleSearch(kw)}
                  className="px-4 py-2 bg-gradient-to-r from-[#FAF8F5] to-white rounded-full text-sm text-[#666] border border-[#E8E3DB] hover:border-[#C41E3A]/30 hover:text-[#C41E3A] transition-colors"
                >
                  {kw}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 清除历史确认弹窗 */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-[280px] text-center">
            <div className="w-12 h-12 bg-[#FFF2F0] rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-6 h-6 text-[#C41E3A]" />
            </div>
            <h3 className="text-lg font-medium text-[#333] mb-2">清除搜索历史</h3>
            <p className="text-sm text-[#666] mb-6">确定要清除全部搜索历史吗？</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 rounded-full border border-[#E8E3DB] text-sm text-[#666]"
              >
                取消
              </button>
              <button
                onClick={handleClearHistory}
                className="flex-1 py-2.5 rounded-full bg-[#C41E3A] text-white text-sm"
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
