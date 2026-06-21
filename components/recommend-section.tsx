"use client"

import Link from "next/link"
import { ChevronRight, Sparkles, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

interface RecommendItem {
  id: string
  type: "course" | "circle" | "article" | "product" | "bot"
  title: string
  subtitle: string
  image: string
  botId?: string
  botName?: string
  botAvatar?: string
  link: string
  price?: number
  originalPrice?: number
}

interface Props {
  title?: string
  subtitle?: string
  items: RecommendItem[]
  showRefresh?: boolean
  onRefresh?: () => void
  maxItems?: number
  layout?: "list" | "grid" | "horizontal"
  className?: string
}

const typeLabels = {
  course: { text: "课程", color: "bg-[#7C3AED]/10 text-[#7C3AED]" },
  circle: { text: "圈子", color: "bg-[#52C41A]/10 text-[#52C41A]" },
  article: { text: "文章", color: "bg-[#1890FF]/10 text-[#1890FF]" },
  product: { text: "商品", color: "bg-[#FF6B35]/10 text-[#FF6B35]" },
  bot: { text: "智能体", color: "bg-[#C41E3A]/10 text-[#C41E3A]" },
}

export function RecommendSection({
  title = "猜你喜欢",
  subtitle = "智能体为您精选",
  items,
  showRefresh = true,
  onRefresh,
  maxItems = 4,
  layout = "list",
  className,
}: Props) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = () => {
    if (onRefresh) {
      setIsRefreshing(true)
      onRefresh()
      setTimeout(() => setIsRefreshing(false), 500)
    }
  }

  const displayItems = items.slice(0, maxItems)

  return (
    <div className={className}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#7C3AED]" />
          <span className="font-bold text-[#2C2C2C]">{title}</span>
          {subtitle && <span className="text-[11px] text-[#999]">{subtitle}</span>}
        </div>
        {showRefresh && onRefresh ? (
          <button 
            onClick={handleRefresh}
            className="text-[12px] text-[#7C3AED] flex items-center gap-1"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
            换一批
          </button>
        ) : (
          <Link href="/discover" className="text-[12px] text-[#7C3AED] flex items-center">
            更多 <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* 列表布局 */}
      {layout === "list" && (
        <div className="space-y-3">
          {displayItems.map(item => (
            <Link key={item.id} href={item.link}>
              <div className="bg-white rounded-xl p-3 shadow-sm flex gap-3 hover:shadow-md transition-all">
                <img src={item.image} alt="" className="w-24 h-16 rounded-lg object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", typeLabels[item.type].color)}>
                        {typeLabels[item.type].text}
                      </span>
                      {item.price !== undefined && (
                        <span className="text-[10px] text-[#FF6B35] font-medium">
                          {item.price === 0 ? "免费" : `¥${item.price}`}
                        </span>
                      )}
                    </div>
                    <h4 className="text-[13px] font-medium text-[#2C2C2C] line-clamp-1">{item.title}</h4>
                    <p className="text-[11px] text-[#999] mt-0.5 line-clamp-1">{item.subtitle}</p>
                  </div>
                  {item.botName && item.botAvatar && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <img src={item.botAvatar} alt="" className="w-4 h-4 rounded" />
                      <span className="text-[10px] text-[#C41E3A]">{item.botName}推荐</span>
                    </div>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-[#CCC] self-center" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 网格布局 */}
      {layout === "grid" && (
        <div className="grid grid-cols-2 gap-3">
          {displayItems.map(item => (
            <Link key={item.id} href={item.link}>
              <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                <img src={item.image} alt="" className="w-full h-24 object-cover" />
                <div className="p-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded", typeLabels[item.type].color)}>
                      {typeLabels[item.type].text}
                    </span>
                  </div>
                  <h4 className="text-[12px] font-medium text-[#2C2C2C] line-clamp-2">{item.title}</h4>
                  {item.botName && (
                    <p className="text-[10px] text-[#C41E3A] mt-1">{item.botName}推荐</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 横向滚动布局 */}
      {layout === "horizontal" && (
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
          {displayItems.map(item => (
            <Link key={item.id} href={item.link} className="flex-shrink-0 w-40">
              <div className="bg-white rounded-xl overflow-hidden shadow-sm">
                <img src={item.image} alt="" className="w-full h-20 object-cover" />
                <div className="p-2">
                  <span className={cn("text-[9px] px-1 py-0.5 rounded", typeLabels[item.type].color)}>
                    {typeLabels[item.type].text}
                  </span>
                  <h4 className="text-[11px] font-medium text-[#2C2C2C] line-clamp-2 mt-1">{item.title}</h4>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
