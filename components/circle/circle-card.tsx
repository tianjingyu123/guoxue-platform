"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Star, CheckCircle, Crown } from "lucide-react"
import { cn } from "@/lib/utils"

// 圈子数据类型
export interface CircleData {
  id: number
  name: string
  cover: string
  description?: string
  highlight?: string
  members: number
  posts?: number
  todayPosts?: number
  category?: string
  price: number
  owner: string
  ownerAvatar: string
  ownerTitle?: string
  isVerified?: boolean
  tags?: string[]
  rating?: number
  ratingCount?: number
  recentJoiners?: string[]
}

interface CircleCardProps {
  circle: CircleData
  rank?: number // 排名，1-3显示角标
  isJoined?: boolean
  onJoin?: (id: number, e: React.MouseEvent) => void
  variant?: "default" | "compact" | "mini" | "masonry" // 卡片变体
}

// 根据标签获取样式
function getTagStyle(tag: string): string {
  if (tag === "活跃" || tag === "干货多") return "bg-[#E6F7E6] text-[#52C41A]"
  if (tag === "大咖入驻" || tag === "TOP1") return "bg-[#FFF1F0] text-[#C41E3A]"
  if (tag === "精华多" || tag === "稀缺" || tag === "高阶") return "bg-[#FFF9E6] text-[#C9A96E]"
  if (tag === "免费" || tag === "新手友好" || tag === "入门") return "bg-[#E6F4FF] text-[#1890FF]"
  if (tag === "实战派" || tag === "进阶" || tag === "科普") return "bg-[#F0E6FF] text-[#722ED1]"
  return "bg-[#F5F1EB] text-[#666666]"
}

// 默认完整卡片
export function CircleCard({ circle, rank, isJoined = false, onJoin, variant = "default" }: CircleCardProps) {
  if (variant === "compact") {
    return <CircleCardCompact circle={circle} rank={rank} isJoined={isJoined} onJoin={onJoin} />
  }
  
  if (variant === "mini") {
    return <CircleCardMini circle={circle} isJoined={isJoined} onJoin={onJoin} />
  }
  
  if (variant === "masonry") {
    return <CircleCardMasonry circle={circle} isJoined={isJoined} onJoin={onJoin} />
  }

  return (
    <Link href={`/circles/${circle.id}`} className="block">
      <Card className="overflow-hidden border-0 rounded-[14px] shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-all duration-300 bg-white active:scale-[0.99]">
        {/* 顶部大图区 - 4:3比例 */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <img src={circle.cover} alt={circle.name} className="w-full h-full object-cover" />
          
          {/* 右上角：今日新增 - 活跃度标签 */}
          {circle.todayPosts && circle.todayPosts > 20 && (
            <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-[#52C41A] text-white text-[10px] font-bold shadow-md animate-pulse">
              今日+{circle.todayPosts}
            </div>
          )}
        </div>
        
        {/* 底部详情区 */}
        <div className="p-4">
          {/* 第一行：名称 + 核心数据 */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[17px] font-bold text-[#2C2C2C] flex-1 line-clamp-1">{circle.name}</h3>
            <div className="flex items-center gap-1.5 ml-2">
              {circle.rating && (
                <div className="flex items-center gap-0.5 bg-[#FFF9E6] px-2 py-0.5 rounded-full">
                  <Star className="w-3.5 h-3.5 text-[#C9A96E] fill-[#C9A96E]" />
                  <span className="text-[12px] font-bold text-[#C9A96E]">{circle.rating}</span>
                </div>
              )}
              <span className="text-[11px] text-[#999999]">{circle.members >= 10000 ? `${(circle.members / 10000).toFixed(1)}万` : circle.members}人</span>
            </div>
          </div>
          
          {/* 亮点描述 */}
          {(circle.highlight || circle.description) && (
            <p className="text-[13px] text-[#666666] line-clamp-2 mb-3 leading-relaxed">
              {circle.highlight || circle.description}
            </p>
          )}
          
          {/* 标签 - 区分颜色 */}
          {circle.tags && circle.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {circle.tags.slice(0, 3).map(tag => (
                <Badge key={tag} className={cn("text-[10px] px-2 py-0.5 border-0 font-medium", getTagStyle(tag))}>
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          
          {/* 圈主信息区 - 带浅色背景 */}
          <div className="bg-[#FAFAFA] rounded-lg p-3 mb-3">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 border-2 border-[#C9A96E]/30 shadow-sm">
                <AvatarImage src={circle.ownerAvatar} alt={circle.owner} />
                <AvatarFallback className="bg-[#F5F1EB] text-[#C9A96E] text-sm">{circle.owner[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-semibold text-[#2C2C2C]">{circle.owner}</span>
                  {circle.isVerified && (
                    <div className="flex items-center gap-0.5 bg-[#C9A96E]/10 px-1.5 py-0.5 rounded">
                      <CheckCircle className="w-3 h-3 text-[#C9A96E]" />
                      <span className="text-[9px] text-[#C9A96E] font-medium">认证</span>
                    </div>
                  )}
                </div>
                {circle.ownerTitle && (
                  <span className="text-[11px] text-[#999999]">{circle.ownerTitle}</span>
                )}
              </div>
              
              {/* 最近加入者头像堆叠 */}
              {circle.recentJoiners && circle.recentJoiners.length > 0 && (
                <div className="flex items-center">
                  <div className="flex -space-x-2">
                    {circle.recentJoiners.slice(0, 3).map((avatar, i) => (
                      <Avatar key={i} className="w-6 h-6 border-2 border-white shadow-sm">
                        <AvatarImage src={avatar} />
                        <AvatarFallback className="bg-[#F5F1EB] text-[8px]">U</AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  <span className="text-[10px] text-[#999999] ml-1.5">刚加入</span>
                </div>
              )}
            </div>
          </div>
          
          {/* 加入按钮 - 显示价格 */}
          <button
            onClick={(e) => {
              e.preventDefault()
              onJoin?.(circle.id, e)
            }}
            className={cn(
              "w-full py-2.5 text-[14px] font-bold rounded-lg transition-all active:scale-[0.98]",
              isJoined
                ? "bg-[#C9A96E] text-white shadow-md hover:bg-[#B8985F]"
                : "bg-gradient-to-r from-[#C41E3A] to-[#E02D4A] text-white shadow-md hover:shadow-lg"
            )}
          >
            {isJoined 
              ? "进入圈子" 
              : circle.price > 0 
                ? `¥${circle.price} 立即加入` 
                : "免费加入"
            }
          </button>
        </div>
      </Card>
    </Link>
  )
}

// 紧凑版卡片 - 用于横向滚动列表
function CircleCardCompact({ circle, rank, isJoined = false, onJoin }: Omit<CircleCardProps, 'variant'>) {
  return (
    <Link href={`/circles/${circle.id}`} className="block flex-shrink-0 w-[260px]">
      <Card className="overflow-hidden border-0 rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)] transition-all duration-300 bg-white active:scale-[0.98]">
        {/* 封面图 - 4:3比例 */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <img src={circle.cover} alt={circle.name} className="w-full h-full object-cover" />
          
          {/* 排名角标 */}
          {rank && rank <= 3 && (
            <div className={cn(
              "absolute -top-1 -left-1 w-12 h-12 flex items-end justify-end pb-1 pr-1",
              rank === 1 ? "bg-gradient-to-br from-[#FFD700] via-[#FFA500] to-transparent" :
              rank === 2 ? "bg-gradient-to-br from-[#C0C0C0] via-[#A8A8A8] to-transparent" :
              "bg-gradient-to-br from-[#CD7F32] via-[#B87333] to-transparent"
            )} style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }}>
              <span className="text-white text-[10px] font-bold transform -rotate-45 translate-x-0.5 -translate-y-0.5">
                TOP{rank}
              </span>
            </div>
          )}
          
          {/* 活跃标签 */}
          {circle.todayPosts && circle.todayPosts > 20 && (
            <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-[#52C41A] text-white text-[9px] font-bold shadow-sm">
              +{circle.todayPosts}
            </div>
          )}
        </div>
        
        {/* 信息区 */}
        <div className="p-3">
          {/* 标题 + 评分 */}
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[14px] font-bold text-[#2C2C2C] flex-1 line-clamp-1">{circle.name}</h3>
            {circle.rating && (
              <div className="flex items-center gap-0.5">
                <Star className="w-3 h-3 text-[#C9A96E] fill-[#C9A96E]" />
                <span className="text-[11px] font-bold text-[#C9A96E]">{circle.rating}</span>
              </div>
            )}
          </div>
          
          {/* 简介 */}
          <p className="text-[11px] text-[#666666] line-clamp-1 mb-2">
            {circle.highlight || circle.description}
          </p>
          
          {/* 标签 */}
          {circle.tags && (
            <div className="flex flex-wrap gap-1 mb-2">
              {circle.tags.slice(0, 2).map(tag => (
                <Badge key={tag} className={cn("text-[9px] px-1.5 py-0 border-0", getTagStyle(tag))}>
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          
          {/* 底部：圈主 + 加入按钮 */}
          <div className="flex items-center justify-between pt-2 border-t border-[#F0EDE8]">
            <div className="flex items-center gap-1.5">
              <Avatar className="w-6 h-6 border border-[#C9A96E]/30">
                <AvatarImage src={circle.ownerAvatar} />
                <AvatarFallback className="text-[8px] bg-[#F5F1EB]">{circle.owner[0]}</AvatarFallback>
              </Avatar>
              <span className="text-[10px] text-[#666666]">{circle.owner}</span>
              <span className="text-[10px] text-[#999999]">·</span>
              <span className="text-[10px] text-[#999999]">{circle.members >= 1000 ? `${(circle.members / 1000).toFixed(1)}k` : circle.members}人</span>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault()
                onJoin?.(circle.id, e)
              }}
              className={cn(
                "px-3 py-1 text-[11px] font-bold rounded-full transition-all active:scale-95",
                isJoined
                  ? "bg-[#C9A96E] text-white"
                  : "bg-[#C41E3A] text-white"
              )}
            >
              {isJoined ? "进入" : circle.price > 0 ? `¥${circle.price}` : "加入"}
            </button>
          </div>
        </div>
      </Card>
    </Link>
  )
}

// 瀑布流版卡片 - 专为首页双列瀑布流设计，保留热门卡片精华
function CircleCardMasonry({ circle, isJoined = false, onJoin }: Omit<CircleCardProps, 'variant' | 'rank'>) {
  return (
    <Link href={`/circles/${circle.id}`} className="block">
      <Card className="overflow-hidden border-0 rounded-[10px] shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)] transition-all duration-300 bg-white active:scale-[0.98]">
        {/* 封面图 - 4:3比例 */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <img src={circle.cover} alt={circle.name} className="w-full h-full object-cover" />
          
          {/* 活跃标签 */}
          {circle.todayPosts && circle.todayPosts > 20 && (
            <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-[#52C41A] text-white text-[9px] font-bold shadow-sm">
              +{circle.todayPosts}
            </div>
          )}
        </div>
        
        {/* 信息区 */}
        <div className="p-2.5">
          {/* 标题 + 评分 */}
          <div className="flex items-center justify-between gap-1 mb-1">
            <h3 className="text-[13px] font-bold text-[#2C2C2C] flex-1 line-clamp-1">{circle.name}</h3>
            {circle.rating && (
              <div className="flex items-center gap-0.5 bg-[#FFF9E6] px-1.5 py-0.5 rounded-full">
                <Star className="w-3 h-3 text-[#C9A96E] fill-[#C9A96E]" />
                <span className="text-[10px] font-bold text-[#C9A96E]">{circle.rating}</span>
              </div>
            )}
          </div>
          
          {/* 简介 */}
          <p className="text-[11px] text-[#666666] line-clamp-2 leading-relaxed mb-2">
            {circle.highlight || circle.description}
          </p>
          
          {/* 标签 - 彩色区分 */}
          {circle.tags && circle.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {circle.tags.slice(0, 2).map(tag => (
                <Badge key={tag} className={cn("text-[9px] px-1.5 py-0 border-0 font-medium", getTagStyle(tag))}>
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          
          {/* 圈主信息 + 成员数 */}
          <div className="flex items-center gap-1.5 pb-2 border-b border-[#F0EDE8]">
            <Avatar className="w-5 h-5 border border-[#C9A96E]/30">
              <AvatarImage src={circle.ownerAvatar} />
              <AvatarFallback className="text-[8px] bg-[#F5F1EB]">{circle.owner[0]}</AvatarFallback>
            </Avatar>
            <span className="text-[10px] text-[#666666]">{circle.owner}</span>
            {circle.isVerified && (
              <CheckCircle className="w-3 h-3 text-[#C9A96E]" />
            )}
            <span className="text-[10px] text-[#999999] ml-auto">{circle.members >= 1000 ? `${(circle.members / 1000).toFixed(1)}k` : circle.members}人</span>
          </div>
          
          {/* 最近加入者 */}
          {circle.recentJoiners && circle.recentJoiners.length > 0 && (
            <div className="flex items-center pt-2 mb-2">
              <div className="flex -space-x-1.5">
                {circle.recentJoiners.slice(0, 3).map((avatar, i) => (
                  <Avatar key={i} className="w-5 h-5 border-2 border-white shadow-sm">
                    <AvatarImage src={avatar} />
                    <AvatarFallback className="bg-[#F5F1EB] text-[7px]">U</AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span className="text-[9px] text-[#999999] ml-1.5">等{circle.members >= 100 ? Math.floor(circle.members / 100) * 100 : circle.members}+人已加入</span>
            </div>
          )}
          
          {/* 加入按钮 - 全宽置底 */}
          <button
            onClick={(e) => {
              e.preventDefault()
              onJoin?.(circle.id, e)
            }}
            className={cn(
              "w-full py-2 text-[11px] font-bold rounded-lg transition-all active:scale-[0.98] mt-auto",
              isJoined
                ? "bg-[#C9A96E] text-white"
                : "bg-gradient-to-r from-[#C41E3A] to-[#E02D4A] text-white shadow-sm"
            )}
          >
            {isJoined ? "进入圈子" : circle.price > 0 ? `¥${circle.price} 立即加入` : "免费加入"}
          </button>
        </div>
      </Card>
    </Link>
  )
}

// 迷你版卡片 - 用于双列网格（更简洁版本）
function CircleCardMini({ circle, isJoined = false, onJoin }: Omit<CircleCardProps, 'variant' | 'rank'>) {
  return (
    <Link href={`/circles/${circle.id}`} className="block">
      <Card className="overflow-hidden border-0 rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)] transition-all duration-300 bg-white active:scale-[0.98]">
        {/* 封面图 - 4:3比例 */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <img src={circle.cover} alt={circle.name} className="w-full h-full object-cover" />
          
          {/* 活跃标签 */}
          {circle.todayPosts && circle.todayPosts > 20 && (
            <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-[#52C41A] text-white text-[9px] font-bold shadow-sm">
              +{circle.todayPosts}
            </div>
          )}
        </div>
        
        {/* 信息区 */}
        <div className="p-3">
          {/* 标题 + 价格 */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <h3 className="text-[14px] font-bold text-[#2C2C2C] flex-1 line-clamp-1">{circle.name}</h3>
            {circle.price > 0 ? (
              <span className="text-[12px] font-bold text-[#C9A96E] flex-shrink-0">¥{circle.price}</span>
            ) : (
              <span className="text-[11px] font-medium text-[#52C41A] flex-shrink-0">免费</span>
            )}
          </div>
          
          {/* 分类标签 */}
          {circle.category && (
            <Badge className="text-[10px] px-1.5 py-0 bg-[#F5F1EB] text-[#666666] border-0 mb-1.5">
              {circle.category}
            </Badge>
          )}
          
          {/* 简介 */}
          <p className="text-[11px] text-[#666666] line-clamp-2 leading-relaxed mb-2">
            {circle.highlight || circle.description}
          </p>
          
          {/* 底部：圈主+人数 */}
          <div className="flex items-center justify-between pt-2 border-t border-[#F0EDE8]">
            <div className="flex items-center gap-1.5">
              <Avatar className="w-5 h-5">
                <AvatarImage src={circle.ownerAvatar} />
                <AvatarFallback className="text-[8px] bg-[#F5F1EB]">{circle.owner[0]}</AvatarFallback>
              </Avatar>
              <span className="text-[11px] text-[#666666]">{circle.owner}</span>
            </div>
            <span className="text-[11px] text-[#999999]">{circle.members >= 1000 ? `${(circle.members / 1000).toFixed(1)}k` : circle.members}人</span>
          </div>
        </div>
      </Card>
    </Link>
  )
}

// 圈子卡片列表容器
export function CircleCardList({ 
  circles, 
  joinedIds = [],
  onJoin,
  showRank = false,
  variant = "default"
}: { 
  circles: CircleData[]
  joinedIds?: number[]
  onJoin?: (id: number, e: React.MouseEvent) => void
  showRank?: boolean
  variant?: "default" | "compact" | "mini" | "masonry"
}) {
  if (variant === "compact") {
    return (
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
        {circles.map((circle, index) => (
          <CircleCard 
            key={circle.id} 
            circle={circle} 
            rank={showRank ? index + 1 : undefined}
            isJoined={joinedIds.includes(circle.id)}
            onJoin={onJoin}
            variant="compact"
          />
        ))}
      </div>
    )
  }
  
  if (variant === "mini") {
    return (
      <div className="grid grid-cols-2 gap-2">
        {circles.map((circle) => (
          <CircleCard 
            key={circle.id} 
            circle={circle}
            isJoined={joinedIds.includes(circle.id)}
            onJoin={onJoin}
            variant="mini"
          />
        ))}
      </div>
    )
  }
  
  if (variant === "masonry") {
    return (
      <div className="grid grid-cols-2 gap-2">
        {circles.map((circle) => (
          <CircleCard 
            key={circle.id} 
            circle={circle}
            isJoined={joinedIds.includes(circle.id)}
            onJoin={onJoin}
            variant="masonry"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {circles.map((circle, index) => (
        <CircleCard 
          key={circle.id} 
          circle={circle} 
          rank={showRank ? index + 1 : undefined}
          isJoined={joinedIds.includes(circle.id)}
          onJoin={onJoin}
        />
      ))}
    </div>
  )
}
