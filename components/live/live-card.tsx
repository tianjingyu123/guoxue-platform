"use client"

import { useState } from "react"
import { Eye, Clock, Bell, Users } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface LiveCardProps {
  id: string
  title: string
  cover: string
  hostName: string
  hostAvatar: string
  viewerCount: number
  type: "knowledge" | "commerce"
  status: "live" | "upcoming" | "replay"
  scheduledTime?: string
  duration?: string // 回放时长
  orientation?: "vertical" | "horizontal" // 竖屏(手机直播)或横屏(OBS直播)
  priceType?: "free" | "paid" // 收费类型（与可见范围独立）
  price?: number // 付费价格
  circleFree?: boolean // 圈内成员免费（全平台可见的付费直播）
  productCount?: number // 电商带货商品数
  className?: string
}

export function LiveCard({
  id,
  title,
  cover,
  hostName,
  hostAvatar,
  viewerCount,
  type,
  status,
  scheduledTime,
  duration,
  orientation = "vertical",
  priceType = "free",
  price,
  circleFree = false,
  productCount,
  className
}: LiveCardProps) {
  const [isBooked, setIsBooked] = useState(false)

  const handleBook = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsBooked(!isBooked)
  }

  const typeLabel = type === "knowledge" ? "知识授课" : "电商带货"
  const typeColor = type === "knowledge" ? "bg-[#4A90D9]" : "bg-[#C9A96E]"

  // 根据方向决定封面比例
  // 横屏OBS直播: 16:9
  // 竖屏手机直播: 3:4
  const aspectClass = orientation === "horizontal" ? "aspect-video" : "aspect-[3/4]"

  return (
    <Link href={`/live/${id}`} className={className}>
      <Card className="overflow-hidden border-0 rounded-[10px] shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)] transition-all duration-300 active:scale-[0.98] bg-white">
        {/* 封面图 */}
        <div className={cn("relative bg-[#F2EFEA] overflow-hidden", aspectClass)}>
          <img
            src={cover}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          
          {/* 渐变遮罩 */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          {/* 类型标签 - 左上角 */}
          <Badge className={cn("absolute top-2 left-2 text-[10px] text-white border-0 font-medium", typeColor)}>
            {typeLabel}
          </Badge>
          
          {/* 状态标签 - 右上角 */}
          {status === "live" ? (
            // 直播中 - 红色呼吸灯
            <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-[#C41E3A] rounded live-indicator">
              <span className="w-1.5 h-1.5 bg-white rounded-full" />
              <span className="text-[10px] font-medium text-white">直播中</span>
            </div>
          ) : status === "upcoming" ? (
            // 预约中 - 蓝色标签+时间
            <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-[#4A90D9] rounded">
              <Clock className="w-3 h-3 text-white" />
              <span className="text-[10px] font-medium text-white">{scheduledTime}</span>
            </div>
          ) : (
            // 回放 - 灰色标签+时长
            <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-black/60 rounded">
              <span className="text-[10px] text-white">{duration || "回放"}</span>
            </div>
          )}
          
          {/* 观看人数/预约人数 - 左下角 */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 bg-black/50 backdrop-blur-sm rounded">
            {status === "live" ? (
              <>
                <Eye className="w-3 h-3 text-white/80" />
                <span className="text-[10px] text-white">
                  {viewerCount >= 10000 ? `${(viewerCount / 10000).toFixed(1)}万` : viewerCount}
                </span>
              </>
            ) : status === "upcoming" ? (
              <>
                <Users className="w-3 h-3 text-white/80" />
                <span className="text-[10px] text-white">{viewerCount}人预约</span>
              </>
            ) : (
              <>
                <Eye className="w-3 h-3 text-white/80" />
                <span className="text-[10px] text-white">{viewerCount}次观看</span>
              </>
            )}
          </div>
          
          {/* 预约按钮 - 右下角（仅预约中显示） */}
          {status === "upcoming" && (
            <button
              onClick={handleBook}
              className={cn(
                "absolute bottom-2 right-2 flex items-center gap-1 px-3 py-1 rounded text-[10px] font-medium transition-all",
                isBooked
                  ? "bg-white/20 text-white border border-white/30"
                  : "bg-[#4A90D9] text-white"
              )}
            >
              <Bell className="w-3 h-3" />
              {isBooked ? "已预约" : "预约"}
            </button>
          )}
        </div>
        
        {/* 主播信息 - 统一首页卡片样式 */}
        <div className="p-2.5">
          <h3 className="text-[15px] font-medium text-[#2C2C2C] line-clamp-2 leading-snug mb-2">
            {title}
          </h3>
          <div className="flex items-center gap-1.5">
            <Avatar className="w-5 h-5">
              <AvatarImage src={hostAvatar} alt={hostName} />
              <AvatarFallback className="text-[9px] bg-[#F5F1EB] text-[#666666]">{hostName[0]}</AvatarFallback>
            </Avatar>
            <span className="text-[11px] text-[#666666] truncate flex-1">{hostName}</span>
            {/* 收费标签 - 与可见范围独立 */}
            {priceType === "paid" ? (
              <span className="flex-shrink-0 text-danger text-[12px] font-bold leading-none">¥{price}</span>
            ) : (
              <span className="flex-shrink-0 text-success text-[10px] font-medium leading-none px-1.5 py-0.5 rounded bg-success/10">免费</span>
            )}
          </div>
          {/* 圈内免费 / 带货商品数 - 次级信息 */}
          {(circleFree || (type === "commerce" && productCount)) && (
            <div className="flex items-center gap-2 mt-1.5">
              {circleFree && (
                <span className="text-[10px] text-gold leading-none px-1.5 py-0.5 rounded bg-gold/10">圈内免费</span>
              )}
              {type === "commerce" && productCount ? (
                <span className="text-[10px] text-[#999999] leading-none">{productCount}件好物</span>
              ) : null}
            </div>
          )}
        </div>
      </Card>
    </Link>
  )
}
