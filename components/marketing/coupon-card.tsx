"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Ticket, Check, Clock, Gift } from "lucide-react"

interface CouponData {
  id: number
  amount: number
  type: "满减" | "折扣" | "无门槛"
  condition?: string
  minAmount?: number
  scope: string
  scopeIds?: number[]
  startDate: string
  endDate: string
  isReceived?: boolean
}

interface CouponCardProps {
  coupon: CouponData
  size?: "small" | "medium" | "large"
  onReceive?: (id: number) => void
  onUse?: (id: number) => void
  className?: string
}

// 可领取的优惠券卡片
export function CouponReceiveCard({ coupon, size = "medium", onReceive, onUse, className }: CouponCardProps) {
  const [isReceived, setIsReceived] = useState(coupon.isReceived || false)
  const [isAnimating, setIsAnimating] = useState(false)

  const handleReceive = () => {
    setIsAnimating(true)
    setTimeout(() => {
      setIsReceived(true)
      setIsAnimating(false)
      onReceive?.(coupon.id)
    }, 300)
  }

  const isDiscount = coupon.type === "折扣"
  
  const sizeClasses = {
    small: "h-20",
    medium: "h-24",
    large: "h-28"
  }

  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-xl",
        sizeClasses[size],
        isAnimating && "animate-like-bounce",
        className
      )}
    >
      {/* 背景渐变 */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary to-primary/90" />
      
      {/* 锯齿装饰 */}
      <div className="absolute right-[30%] top-0 bottom-0 flex flex-col justify-around py-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="w-3 h-3 rounded-full bg-background -mr-1.5" />
        ))}
      </div>

      <div className="relative h-full flex">
        {/* 左侧金额区 */}
        <div className="w-[30%] flex flex-col items-center justify-center text-white">
          {isDiscount ? (
            <div className="text-center">
              <span className="text-3xl font-bold">{coupon.amount}</span>
              <span className="text-lg font-bold">折</span>
            </div>
          ) : (
            <div className="text-center">
              <span className="text-lg">¥</span>
              <span className="text-3xl font-bold">{coupon.amount}</span>
            </div>
          )}
          <p className="text-xs text-white/80 mt-0.5">
            {coupon.condition || (coupon.minAmount ? `满${coupon.minAmount}可用` : "无门槛")}
          </p>
        </div>

        {/* 右侧信息区 */}
        <div className="flex-1 flex items-center justify-between px-4 bg-card rounded-r-xl">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary">
                {coupon.type}券
              </Badge>
            </div>
            <h4 className="font-medium text-sm mb-0.5">{coupon.scope}</h4>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {coupon.startDate} - {coupon.endDate}
            </p>
          </div>

          {/* 领取按钮 */}
          {isReceived ? (
            <Button 
              size="sm" 
              variant="outline"
              className="h-8 px-4 text-xs border-primary text-primary"
              onClick={() => onUse?.(coupon.id)}
            >
              去使用
            </Button>
          ) : (
            <Button 
              size="sm" 
              className="h-8 px-4 text-xs"
              onClick={handleReceive}
            >
              立即领取
            </Button>
          )}
        </div>
      </div>

      {/* 已领取标记 */}
      {isReceived && (
        <div className="absolute top-2 right-2">
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
        </div>
      )}
    </div>
  )
}

// 优惠券领取入口卡片（可插入页面任意位置）
interface CouponEntryCardProps {
  coupons: CouponData[]
  title?: string
  onReceive?: (id: number) => void
  className?: string
}

export function CouponEntryCard({ coupons, title = "新人专享券包", onReceive, className }: CouponEntryCardProps) {
  const [receivedIds, setReceivedIds] = useState<number[]>([])

  const handleReceive = (id: number) => {
    setReceivedIds(prev => [...prev, id])
    onReceive?.(id)
  }

  const handleReceiveAll = () => {
    const unreceived = coupons.filter(c => !receivedIds.includes(c.id)).map(c => c.id)
    setReceivedIds(prev => [...prev, ...unreceived])
    unreceived.forEach(id => onReceive?.(id))
  }

  const allReceived = coupons.every(c => receivedIds.includes(c.id))

  return (
    <Card className={cn("p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200/50 dark:border-amber-800/30", className)}>
      {/* 标题 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-amber-500" />
          <span className="font-bold text-sm">{title}</span>
        </div>
        <Button 
          size="sm" 
          variant="ghost" 
          className="h-7 text-xs text-amber-600 hover:text-amber-700"
          onClick={handleReceiveAll}
          disabled={allReceived}
        >
          {allReceived ? "已全部领取" : "一键领取"}
        </Button>
      </div>

      {/* 优惠券列表 */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {coupons.map((coupon) => (
          <div key={coupon.id} className="flex-shrink-0 w-32">
            <div className={cn(
              "relative rounded-lg overflow-hidden border transition-all",
              receivedIds.includes(coupon.id) 
                ? "border-green-500/50 bg-green-50 dark:bg-green-950/20" 
                : "border-primary/30 bg-white dark:bg-card"
            )}>
              {/* 金额 */}
              <div className="p-2 text-center border-b border-dashed border-border">
                {coupon.type === "折扣" ? (
                  <p className="text-xl font-bold text-primary">{coupon.amount}<span className="text-sm">折</span></p>
                ) : (
                  <p className="text-xl font-bold text-primary">¥{coupon.amount}</p>
                )}
                <p className="text-[10px] text-muted-foreground">
                  {coupon.condition || (coupon.minAmount ? `满${coupon.minAmount}可用` : "无门槛")}
                </p>
              </div>
              {/* 领取按钮 */}
              <button
                onClick={() => handleReceive(coupon.id)}
                disabled={receivedIds.includes(coupon.id)}
                className={cn(
                  "w-full py-2 text-xs font-medium transition-colors",
                  receivedIds.includes(coupon.id)
                    ? "text-green-600 bg-green-100 dark:bg-green-900/30"
                    : "text-primary hover:bg-primary/10"
                )}
              >
                {receivedIds.includes(coupon.id) ? (
                  <span className="flex items-center justify-center gap-1">
                    <Check className="w-3 h-3" />已领取
                  </span>
                ) : "领取"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

// 积分兑换券卡片
interface PointsCouponCardProps {
  coupon: CouponData & { points: number }
  userPoints: number
  onExchange?: (id: number) => void
}

export function PointsCouponCard({ coupon, userPoints, onExchange }: PointsCouponCardProps) {
  const canExchange = userPoints >= coupon.points
  const isDiscount = coupon.type === "折扣"

  return (
    <Card className="p-3 flex items-center gap-3">
      {/* 券面值 */}
      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex flex-col items-center justify-center text-white">
        {isDiscount ? (
          <>
            <span className="text-xl font-bold">{coupon.amount}</span>
            <span className="text-[10px]">折</span>
          </>
        ) : (
          <>
            <span className="text-[10px]">¥</span>
            <span className="text-xl font-bold">{coupon.amount}</span>
          </>
        )}
      </div>
      
      {/* 信息 */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate">{coupon.scope}</h4>
        <p className="text-xs text-muted-foreground">
          {coupon.condition || (coupon.minAmount ? `满${coupon.minAmount}可用` : "无门槛")}
        </p>
        <p className="text-xs text-amber-600 mt-1">{coupon.points} 积分兑换</p>
      </div>

      {/* 兑换按钮 */}
      <Button
        size="sm"
        variant={canExchange ? "default" : "outline"}
        disabled={!canExchange}
        onClick={() => onExchange?.(coupon.id)}
        className="h-8 px-3 text-xs"
      >
        {canExchange ? "兑换" : "积分不足"}
      </Button>
    </Card>
  )
}

export default CouponReceiveCard
