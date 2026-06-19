"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Zap, ChevronRight, Clock, ShoppingBag } from "lucide-react"

interface SeckillProduct {
  id: number
  name: string
  image?: string
  seckillPrice: number
  originalPrice: number
  soldPercent: number
  stock: number
}

interface SeckillCardProps {
  title?: string
  endTime: Date
  products: SeckillProduct[]
  className?: string
}

// 倒计时Hook
function useCountdown(endTime: Date) {
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false
  })

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const end = endTime.getTime()
      const diff = end - now

      if (diff <= 0) {
        return { hours: 0, minutes: 0, seconds: 0, isExpired: true }
      }

      return {
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
        isExpired: false
      }
    }

    setTimeLeft(calculateTimeLeft())
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000)
    return () => clearInterval(timer)
  }, [endTime])

  return timeLeft
}

// 格式化数字（补零）
const padZero = (num: number) => num.toString().padStart(2, "0")

// 秒杀专场入口卡片（用于首页信息流）
export function SeckillEntryCard({ title = "限时秒杀", endTime, products, className }: SeckillCardProps) {
  const { hours, minutes, seconds, isExpired } = useCountdown(endTime)

  if (isExpired) return null

  return (
    <Card className={cn("p-3 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-red-200/50 dark:border-red-800/30", className)}>
      {/* 顶部标题栏 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge className="bg-red-500 text-white border-0 px-2 py-0.5 text-xs font-bold animate-pulse">
            <Zap className="w-3 h-3 mr-1" />
            {title}
          </Badge>
          {/* 倒计时 */}
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-red-500" />
            <span className="text-[10px] text-red-600 dark:text-red-400">距结束</span>
            <div className="flex items-center gap-0.5">
              <span className="px-1 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded">{padZero(hours)}</span>
              <span className="text-red-500 text-xs font-bold">:</span>
              <span className="px-1 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded">{padZero(minutes)}</span>
              <span className="text-red-500 text-xs font-bold">:</span>
              <span className="px-1 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded">{padZero(seconds)}</span>
            </div>
          </div>
        </div>
        <Link href="/seckill" className="text-[10px] text-red-500 flex items-center hover:underline">
          全部秒杀<ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* 商品横向滚动 */}
      <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
        {products.slice(0, 5).map((product) => (
          <Link 
            key={product.id} 
            href={`/seckill/${product.id}`}
            className="flex-shrink-0 w-24 group"
          >
            {/* 商品图 */}
            <div className="aspect-square rounded-lg bg-white dark:bg-secondary relative overflow-hidden mb-1.5 group-active:scale-95 transition-transform">
              {product.image ? (
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingBag className="w-8 h-8 text-muted-foreground/20" />
                </div>
              )}
              {/* 折扣标签 */}
              <Badge className="absolute top-1 left-1 bg-red-500 text-white text-[8px] px-1 py-0 border-0">
                {Math.round((1 - product.seckillPrice / product.originalPrice) * 100)}% OFF
              </Badge>
            </div>
            {/* 商品名 */}
            <p className="text-[11px] font-medium line-clamp-1 mb-1">{product.name}</p>
            {/* 价格 */}
            <div className="flex items-baseline gap-1">
              <span className="text-sm text-red-500 font-bold">¥{product.seckillPrice}</span>
              <span className="text-[10px] text-muted-foreground line-through">¥{product.originalPrice}</span>
            </div>
            {/* 已抢进度条 */}
            <div className="mt-1.5 relative">
              <div className="h-4 bg-red-100 dark:bg-red-900/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all duration-500 flex items-center justify-end pr-1"
                  style={{ width: `${Math.max(product.soldPercent, 20)}%` }}
                >
                  <span className="text-[8px] text-white font-bold">已抢{product.soldPercent}%</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  )
}

// 秒杀商品详情卡片
interface SeckillDetailCardProps {
  product: SeckillProduct
  endTime: Date
  startTime?: Date
  status: "upcoming" | "ongoing" | "ended" | "soldout"
  onBuy?: () => void
}

export function SeckillDetailCard({ product, endTime, startTime, status, onBuy }: SeckillDetailCardProps) {
  const countdown = useCountdown(status === "upcoming" && startTime ? startTime : endTime)

  const getButtonState = () => {
    switch (status) {
      case "upcoming":
        return { text: "未开始", disabled: true, className: "bg-muted text-muted-foreground" }
      case "ongoing":
        return { text: "立即秒杀", disabled: false, className: "bg-red-500 hover:bg-red-600 text-white animate-pulse" }
      case "soldout":
        return { text: "已抢光", disabled: true, className: "bg-muted text-muted-foreground" }
      case "ended":
        return { text: "已结束", disabled: true, className: "bg-muted text-muted-foreground" }
      default:
        return { text: "立即秒杀", disabled: false, className: "bg-red-500 text-white" }
    }
  }

  const buttonState = getButtonState()

  return (
    <Card className="overflow-hidden">
      {/* 顶部倒计时条 */}
      <div className="bg-gradient-to-r from-red-500 to-orange-500 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-white" />
          <span className="text-white font-bold">
            {status === "upcoming" ? "距开始" : status === "ongoing" ? "距结束" : "秒杀已结束"}
          </span>
        </div>
        {(status === "upcoming" || status === "ongoing") && (
          <div className="flex items-center gap-1">
            <span className="px-2 py-1 bg-white/20 text-white text-sm font-bold rounded">{padZero(countdown.hours)}</span>
            <span className="text-white font-bold">:</span>
            <span className="px-2 py-1 bg-white/20 text-white text-sm font-bold rounded">{padZero(countdown.minutes)}</span>
            <span className="text-white font-bold">:</span>
            <span className="px-2 py-1 bg-white/20 text-white text-sm font-bold rounded">{padZero(countdown.seconds)}</span>
          </div>
        )}
      </div>

      {/* 商品信息 */}
      <div className="p-4">
        <div className="flex gap-4">
          {/* 商品图 */}
          <div className="w-32 h-32 rounded-lg bg-secondary flex-shrink-0 overflow-hidden">
            {product.image ? (
              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ShoppingBag className="w-12 h-12 text-muted-foreground/20" />
              </div>
            )}
          </div>
          {/* 商品详情 */}
          <div className="flex-1">
            <h3 className="font-medium line-clamp-2 mb-2">{product.name}</h3>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl text-red-500 font-bold">¥{product.seckillPrice}</span>
              <span className="text-sm text-muted-foreground line-through">¥{product.originalPrice}</span>
            </div>
            {/* 库存进度 */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>已抢 {product.soldPercent}%</span>
                <span>剩余 {product.stock} 件</span>
              </div>
              <div className="h-2 bg-red-100 dark:bg-red-900/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all"
                  style={{ width: `${product.soldPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 秒杀按钮 */}
        <Button 
          className={cn("w-full mt-4 h-12 text-base font-bold", buttonState.className)}
          disabled={buttonState.disabled}
          onClick={onBuy}
        >
          {buttonState.text}
        </Button>
      </div>
    </Card>
  )
}

export default SeckillEntryCard
