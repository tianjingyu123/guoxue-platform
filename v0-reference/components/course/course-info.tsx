"use client"

import { useState, useEffect } from "react"
import { Users, ShieldCheck, Award, Star, TrendingUp, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface CourseInfoProps {
  title: string
  currentPrice: number
  originalPrice: number
  studentsCount: number
  tags?: string[]
  rating?: number
  reviewCount?: number
}

// 模拟实时购买动态
const recentBuyers = [
  { name: "张**", time: "刚刚" },
  { name: "李**", time: "2分钟前" },
  { name: "王**", time: "5分钟前" },
  { name: "陈**", time: "8分钟前" },
]

export function CourseInfo({ 
  title, 
  currentPrice, 
  originalPrice, 
  studentsCount,
  tags = [],
  rating = 4.9,
  reviewCount = 326
}: CourseInfoProps) {
  const [currentBuyerIndex, setCurrentBuyerIndex] = useState(0)
  const [showBuyer, setShowBuyer] = useState(true)
  
  const savedAmount = originalPrice - currentPrice
  const discountPercent = Math.round((1 - currentPrice / originalPrice) * 100)

  // 轮播显示最近购买者
  useEffect(() => {
    const interval = setInterval(() => {
      setShowBuyer(false)
      setTimeout(() => {
        setCurrentBuyerIndex((prev) => (prev + 1) % recentBuyers.length)
        setShowBuyer(true)
      }, 300)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const currentBuyer = recentBuyers[currentBuyerIndex]

  return (
    <div className="p-4 bg-card border-b border-border">
      {/* 实时购买提示 */}
      <div className={cn(
        "flex items-center gap-2 mb-3 text-xs transition-all duration-300",
        showBuyer ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
      )}>
        <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
          <CheckCircle2 className="w-3 h-3 text-green-500" />
        </div>
        <span className="text-muted-foreground">
          <span className="text-foreground font-medium">{currentBuyer.name}</span>
          {" "}刚刚购买了此课程
        </span>
        <span className="text-muted-foreground/60">{currentBuyer.time}</span>
      </div>

      {/* 标题 */}
      <h1 className="text-lg font-bold text-foreground leading-tight text-balance">
        {title}
      </h1>
      
      {/* 标签 */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {tags.map((tag, index) => (
            <span 
              key={index}
              className="px-2 py-0.5 text-xs rounded bg-primary/10 text-primary"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      
      {/* 价格区域 - 强化锚点效果 */}
      <div className="flex items-end justify-between mt-3">
        <div className="flex flex-wrap items-baseline gap-2">
          {/* 现价 */}
          <span className="text-2xl font-bold text-primary">
            <span className="text-sm">¥</span>{currentPrice}
          </span>
          {/* 原价 */}
          <span className="text-sm text-muted-foreground line-through decoration-muted-foreground/50">
            ¥{originalPrice}
          </span>
          {/* 折扣标签 */}
          <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
            {10 - Math.floor(discountPercent / 10)}折
          </Badge>
          {/* 已省金额 */}
          <span className="text-xs text-green-500 font-medium">
            已省¥{savedAmount}
          </span>
        </div>
        
        {/* 评分和学习人数 */}
        <div className="flex flex-col items-end gap-0.5">
          <div className="flex items-center gap-1 text-xs">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="text-foreground font-semibold">{rating}</span>
            <span className="text-muted-foreground">({reviewCount}评)</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground text-xs">
            <Users className="w-3.5 h-3.5" />
            <span>{studentsCount.toLocaleString()}人学习</span>
          </div>
        </div>
      </div>

      {/* 信任徽章 */}
      <div className="flex items-center justify-start gap-4 mt-3 pt-3 border-t border-border/50">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
          <span>7天无理由</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Award className="w-3.5 h-3.5 text-green-500" />
          <span>品质保障</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <TrendingUp className="w-3.5 h-3.5 text-green-500" />
          <span>永久回看</span>
        </div>
      </div>
    </div>
  )
}
