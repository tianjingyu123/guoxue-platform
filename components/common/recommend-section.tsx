"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ChevronRight, Play, Users, FileText, ShoppingBag, Radio, Bot, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"

// 通用推荐内容类型
type RecommendItem = {
  id: number
  type: "course" | "circle" | "article" | "product" | "live" | "agent" | "ebook"
  title: string
  subtitle?: string
  image?: string
  price?: number
  originalPrice?: number
  extra?: string // 如人数、阅读量等
}

// 推荐数据
const defaultRecommends: RecommendItem[] = [
  { id: 1, type: "course", title: "八字命理入门精讲", subtitle: "周易大师", price: 199, extra: "1.2万人学习" },
  { id: 2, type: "circle", title: "紫微斗数研习社", subtitle: "3280成员", extra: "每日更新" },
  { id: 3, type: "article", title: "八字看婚姻感情详解", subtitle: "周易大师", extra: "阅读2.3万" },
  { id: 4, type: "product", title: "八卦罗盘精装版", price: 168, originalPrice: 298, extra: "已售526件" },
  { id: 5, type: "live", title: "今晚8点：紫微斗数答疑", subtitle: "张玄风", extra: "预约中" },
  { id: 6, type: "agent", title: "八字智能解读", subtitle: "AI命理助手", extra: "12.8万人使用" },
]

const typeConfig = {
  course: { icon: Play, color: "bg-blue-500/10 text-blue-600", label: "课程", href: (id: number) => `/course/${id}` },
  circle: { icon: Users, color: "bg-green-500/10 text-green-600", label: "圈子", href: (id: number) => `/circle/${id}` },
  article: { icon: FileText, color: "bg-purple-500/10 text-purple-600", label: "文章", href: (id: number) => `/articles/${id}` },
  product: { icon: ShoppingBag, color: "bg-orange-500/10 text-orange-500", label: "商品", href: (id: number) => `/mall/product/${id}` },
  live: { icon: Radio, color: "bg-red-500/10 text-red-500", label: "直播", href: (id: number) => `/live/${id}` },
  agent: { icon: Bot, color: "bg-violet-500/10 text-violet-600", label: "智能体", href: (id: number) => `/agent/${id}` },
  ebook: { icon: BookOpen, color: "bg-amber-500/10 text-amber-600", label: "电子书", href: (id: number) => `/reader/${id}` },
}

interface RecommendSectionProps {
  title?: string
  moreHref?: string
  items?: RecommendItem[]
  layout?: "horizontal" | "vertical" | "grid"
  showType?: boolean
  className?: string
}

export function RecommendSection({
  title = "猜你喜欢",
  moreHref = "/discover",
  items = defaultRecommends,
  layout = "horizontal",
  showType = true,
  className,
}: RecommendSectionProps) {
  if (!items || items.length === 0) return null

  return (
    <div className={cn("py-4", className)}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <Link href={moreHref} className="flex items-center text-xs text-muted-foreground hover:text-primary transition-colors">
          更多
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* 横向滚动布局 */}
      {layout === "horizontal" && (
        <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2">
          {items.map((item) => {
            const config = typeConfig[item.type]
            const Icon = config.icon
            return (
              <Link
                key={`${item.type}-${item.id}`}
                href={config.href(item.id)}
                className="flex-shrink-0 w-36"
              >
                <Card className="overflow-hidden hover:shadow-md transition-shadow">
                  <div className="aspect-[4/3] bg-gradient-to-br from-secondary to-secondary/50 flex items-center justify-center relative">
                    <Icon className="w-8 h-8 text-muted-foreground/30" />
                    {showType && (
                      <Badge className={cn("absolute top-2 left-2 text-[10px] border-0", config.color)}>
                        {config.label}
                      </Badge>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-medium line-clamp-2 mb-1">{item.title}</p>
                    {item.subtitle && (
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{item.subtitle}</p>
                    )}
                    <div className="flex items-center justify-between mt-1.5">
                      {item.price !== undefined ? (
                        <span className="text-xs text-primary font-bold">¥{item.price}</span>
                      ) : item.extra ? (
                        <span className="text-[10px] text-muted-foreground">{item.extra}</span>
                      ) : null}
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {/* 垂直列表布局 */}
      {layout === "vertical" && (
        <div className="space-y-2 px-4">
          {items.map((item) => {
            const config = typeConfig[item.type]
            const Icon = config.icon
            return (
              <Link
                key={`${item.type}-${item.id}`}
                href={config.href(item.id)}
              >
                <Card className="flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors">
                  <div className="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {showType && (
                        <Badge className={cn("text-[10px] border-0 px-1.5", config.color)}>
                          {config.label}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium line-clamp-1 mt-1">{item.title}</p>
                    {item.subtitle && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{item.subtitle}</p>
                    )}
                  </div>
                  {item.price !== undefined ? (
                    <span className="text-sm text-primary font-bold flex-shrink-0">¥{item.price}</span>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {/* 网格布局 */}
      {layout === "grid" && (
        <div className="grid grid-cols-2 gap-3 px-4">
          {items.slice(0, 4).map((item) => {
            const config = typeConfig[item.type]
            const Icon = config.icon
            return (
              <Link
                key={`${item.type}-${item.id}`}
                href={config.href(item.id)}
              >
                <Card className="overflow-hidden hover:shadow-md transition-shadow">
                  <div className="aspect-[4/3] bg-gradient-to-br from-secondary to-secondary/50 flex items-center justify-center relative">
                    <Icon className="w-8 h-8 text-muted-foreground/30" />
                    {showType && (
                      <Badge className={cn("absolute top-2 left-2 text-[10px] border-0", config.color)}>
                        {config.label}
                      </Badge>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-medium line-clamp-2 mb-1">{item.title}</p>
                    <div className="flex items-center justify-between">
                      {item.price !== undefined ? (
                        <span className="text-xs text-primary font-bold">¥{item.price}</span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">{item.extra}</span>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

// 详情页底部推荐（紧凑版）
interface DetailRecommendProps {
  title?: string
  type: "course" | "circle" | "article" | "product" | "live" | "agent"
  currentId: number
  className?: string
}

export function DetailRecommend({
  title = "相关推荐",
  type,
  currentId,
  className,
}: DetailRecommendProps) {
  // 过滤当前项
  const filteredItems = defaultRecommends
    .filter(item => item.type === type && item.id !== currentId)
    .slice(0, 3)

  if (filteredItems.length === 0) {
    // 如果没有同类型的，显示其他类型的推荐
    return (
      <RecommendSection
        title={title}
        items={defaultRecommends.filter(item => item.id !== currentId).slice(0, 4)}
        layout="horizontal"
        className={className}
      />
    )
  }

  return (
    <RecommendSection
      title={title}
      items={filteredItems}
      layout="horizontal"
      moreHref={type === "course" ? "/courses-list" : type === "circle" ? "/circle" : type === "product" ? "/mall" : "/discover"}
      className={className}
    />
  )
}
