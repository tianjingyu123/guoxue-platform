"use client"

import Link from "next/link"
import { useStation, StationFeaturedItem } from "./station-context"
import { Star, BookOpen, Users, FileText, ChevronRight, Quote } from "lucide-react"
import { Badge } from "@/components/ui/badge"

// 分站精选模块 - 用于首页穿插展示
export function StationFeaturedSection() {
  const { station, isStationUser } = useStation()
  
  if (!isStationUser || !station || station.featured.length === 0) return null
  
  return (
    <section className="mx-4 my-4">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div 
            className="w-1 h-4 rounded-full"
            style={{ backgroundColor: station.themeColor }}
          />
          <span className="font-medium text-sm">{station.masterName}精选</span>
          <Badge 
            variant="secondary" 
            className="text-[10px] px-1.5 py-0"
            style={{ 
              backgroundColor: `${station.themeColor}15`,
              color: station.themeColor,
            }}
          >
            站长推荐
          </Badge>
        </div>
        <Link 
          href={`/station/${station.id}`}
          className="text-xs text-muted-foreground flex items-center"
        >
          查看全部 <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      
      {/* 精选内容列表 */}
      <div className="space-y-3">
        {station.featured.slice(0, 3).map((item) => (
          <StationFeaturedCard 
            key={item.id} 
            item={item} 
            themeColor={station.themeColor}
            masterName={station.masterName}
          />
        ))}
      </div>
    </section>
  )
}

// 单个精选卡片
function StationFeaturedCard({ 
  item, 
  themeColor,
  masterName,
}: { 
  item: StationFeaturedItem
  themeColor: string
  masterName: string
}) {
  const typeConfig = {
    article: { icon: FileText, label: "文章", href: `/articles/${item.id}` },
    course: { icon: BookOpen, label: "课程", href: `/courses/${item.id}` },
    circle: { icon: Users, label: "圈子", href: `/circles/${item.id}` },
  }
  
  const config = typeConfig[item.type]
  const Icon = config.icon
  
  return (
    <Link href={config.href}>
      <div 
        className="p-3 rounded-xl border transition-all active:scale-[0.98]"
        style={{ 
          borderColor: `${themeColor}30`,
          backgroundColor: `${themeColor}05`,
        }}
      >
        <div className="flex gap-3">
          {/* 封面图 */}
          <div className="w-20 h-20 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
            {item.cover ? (
              <img src={item.cover} alt="" className="w-full h-full object-cover" />
            ) : (
              <div 
                className="w-full h-full flex items-center justify-center"
                style={{ backgroundColor: `${themeColor}20` }}
              >
                <Icon className="w-8 h-8" style={{ color: themeColor }} />
              </div>
            )}
          </div>
          
          {/* 内容信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <Badge 
                variant="secondary" 
                className="text-[10px] px-1.5 py-0"
                style={{ 
                  backgroundColor: `${themeColor}15`,
                  color: themeColor,
                }}
              >
                {config.label}
              </Badge>
              {item.price !== undefined && item.price > 0 && (
                <span className="text-xs text-primary font-medium">¥{item.price}</span>
              )}
              {item.originalPrice && (
                <span className="text-[10px] text-muted-foreground line-through">
                  ¥{item.originalPrice}
                </span>
              )}
            </div>
            <h4 className="font-medium text-sm line-clamp-1 mb-1">{item.title}</h4>
            
            {/* 站长推荐语 */}
            {item.recommendation && (
              <div className="flex items-start gap-1 mt-1.5">
                <Quote className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground line-clamp-2 italic">
                  {item.recommendation}
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* 站长标识 */}
        <div className="flex items-center justify-end mt-2 pt-2 border-t border-border/50">
          <span className="text-[10px] text-muted-foreground">
            {masterName} 推荐
          </span>
        </div>
      </div>
    </Link>
  )
}

// 首页内容流中穿插的精选卡片（更简洁的样式）
export function StationFeaturedInline({ 
  item,
  themeColor,
  masterName,
}: { 
  item: StationFeaturedItem
  themeColor: string
  masterName: string
}) {
  const typeConfig = {
    article: { icon: FileText, label: "文章", href: `/articles/${item.id}` },
    course: { icon: BookOpen, label: "课程", href: `/courses/${item.id}` },
    circle: { icon: Users, label: "圈子", href: `/circles/${item.id}` },
  }
  
  const config = typeConfig[item.type]
  
  return (
    <Link href={config.href}>
      <div 
        className="mx-4 my-2 p-3 rounded-xl border-l-4 bg-card"
        style={{ borderLeftColor: themeColor }}
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <Star 
            className="w-3 h-3 fill-current" 
            style={{ color: themeColor }}
          />
          <span 
            className="text-[10px] font-medium"
            style={{ color: themeColor }}
          >
            {masterName}精选 · {config.label}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium line-clamp-1 flex-1">{item.title}</span>
          {item.price !== undefined && item.price > 0 && (
            <span className="text-sm font-bold text-primary ml-2">¥{item.price}</span>
          )}
        </div>
        {item.recommendation && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1 italic">
            "{item.recommendation}"
          </p>
        )}
      </div>
    </Link>
  )
}
