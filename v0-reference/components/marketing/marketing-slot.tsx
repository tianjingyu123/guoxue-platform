"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { X, ChevronRight, Zap, Gift, Users, Ticket, Sparkles } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// 营销位置配置类型
export interface MarketingSlotConfig {
  id: string
  type: "banner" | "seckill" | "groupbuy" | "coupon" | "activity" | "recommend" | "empty"
  title?: string
  subtitle?: string
  image?: string
  link?: string
  bgGradient?: string
  startTime?: Date
  endTime?: Date
  targetAudience?: "all" | "member" | "new" | "vip"
  closeable?: boolean
  priority?: number
}

// 模拟后台配置数据获取
export function useMarketingSlot(slotId: string, page: string): MarketingSlotConfig | null {
  const [config, setConfig] = useState<MarketingSlotConfig | null>(null)
  
  useEffect(() => {
    // 模拟从后台获取配置
    const mockConfigs: Record<string, MarketingSlotConfig> = {
      "home-feed-3": {
        id: "home-feed-3",
        type: "activity",
        title: "双十一国学节",
        subtitle: "精品课程5折起，好物满减",
        bgGradient: "from-red-500 to-orange-500",
        link: "/activity/double11",
        closeable: false,
      },
      "home-top-banner": {
        id: "home-top-banner",
        type: "banner",
        title: "易学大师直播周",
        subtitle: "名师云集，在线答疑",
        bgGradient: "from-purple-600 to-indigo-600",
        link: "/live",
        closeable: true,
      },
      "course-detail-countdown": {
        id: "course-detail-countdown",
        type: "seckill",
        title: "限时特惠",
        subtitle: "距离优惠结束",
        bgGradient: "from-red-500 to-pink-500",
        closeable: false,
      },
      "course-detail-coupon": {
        id: "course-detail-coupon",
        type: "coupon",
        title: "领券立减",
        subtitle: "满199减30",
        closeable: false,
      },
      "product-detail-promo": {
        id: "product-detail-promo",
        type: "groupbuy",
        title: "3人拼团更优惠",
        subtitle: "立省¥50",
        link: "/groupbuy/123",
        closeable: false,
      },
      "discover-top-banner": {
        id: "discover-top-banner",
        type: "banner",
        title: "新人专享福利",
        subtitle: "首单立减20元",
        bgGradient: "from-emerald-500 to-teal-500",
        link: "/coupons/center",
        closeable: true,
      },
      "profile-member": {
        id: "profile-member",
        type: "activity",
        title: "升级VIP会员",
        subtitle: "享受全场9折特权",
        bgGradient: "from-amber-500 to-orange-500",
        link: "/vip",
        closeable: false,
      },
      "payment-success-recommend": {
        id: "payment-success-recommend",
        type: "recommend",
        title: "猜你喜欢",
        subtitle: "买了此课程的人还买了",
        closeable: false,
      },
    }
    
    const key = `${page}-${slotId}`
    setConfig(mockConfigs[key] || null)
  }, [slotId, page])
  
  return config
}

// ===== 通用营销横幅组件 =====
interface MarketingBannerProps {
  config: MarketingSlotConfig
  onClose?: () => void
  className?: string
}

export function MarketingBanner({ config, onClose, className }: MarketingBannerProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  
  if (!isVisible || dismissed) return null
  
  const handleClose = () => {
    setDismissed(true)
    onClose?.()
  }
  
  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl",
      className
    )}>
      <Link href={config.link || "#"} className="block">
        <div className={cn(
          "relative px-4 py-3 bg-gradient-to-r text-white",
          config.bgGradient || "from-primary to-primary/80"
        )}>
          {/* 装饰背景 */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/30" />
            <div className="absolute -left-2 -bottom-2 w-16 h-16 rounded-full bg-white/20" />
          </div>
          
          <div className="relative flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-pulse" />
                <span className="font-bold text-sm">{config.title}</span>
              </div>
              {config.subtitle && (
                <p className="text-xs text-white/80 mt-0.5">{config.subtitle}</p>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-white/70" />
          </div>
        </div>
      </Link>
      
      {config.closeable && (
        <button 
          onClick={(e) => { e.preventDefault(); handleClose() }}
          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/30 flex items-center justify-center"
        >
          <X className="w-3 h-3 text-white" />
        </button>
      )}
    </div>
  )
}

// ===== 活动入口卡片 =====
interface ActivityCardProps {
  config: MarketingSlotConfig
  className?: string
}

export function ActivityCard({ config, className }: ActivityCardProps) {
  return (
    <Link href={config.link || "#"}>
      <Card className={cn(
        "relative overflow-hidden border-0",
        className
      )}>
        <div className={cn(
          "relative px-4 py-4 bg-gradient-to-r text-white",
          config.bgGradient || "from-red-500 to-orange-500"
        )}>
          {/* 动态角标 */}
          <Badge className="absolute top-2 right-2 bg-white/20 text-white text-[10px] border-0 animate-pulse">
            HOT
          </Badge>
          
          {/* 装饰元素 */}
          <div className="absolute right-4 bottom-0 opacity-20">
            <Sparkles className="w-16 h-16" />
          </div>
          
          <div className="relative">
            <h3 className="font-bold text-lg">{config.title}</h3>
            <p className="text-sm text-white/80 mt-1">{config.subtitle}</p>
            <Button size="sm" className="mt-3 bg-white text-gray-900 hover:bg-white/90 h-7 text-xs">
              立即参与
            </Button>
          </div>
        </div>
      </Card>
    </Link>
  )
}

// ===== 限时优惠倒计时横幅 =====
interface CountdownBannerProps {
  endTime: Date
  title?: string
  discountAmount?: number
  className?: string
}

export function CountdownBanner({ endTime, title = "限时特惠", discountAmount, className }: CountdownBannerProps) {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 })
  
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime()
      const end = endTime.getTime()
      const diff = Math.max(0, end - now)
      
      const h = Math.floor(diff / (1000 * 60 * 60))
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const s = Math.floor((diff % (1000 * 60)) / 1000)
      
      setTimeLeft({ h, m, s })
    }
    
    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [endTime])
  
  const fmt = (n: number) => n.toString().padStart(2, "0")
  
  return (
    <div className={cn(
      "relative overflow-hidden rounded-lg bg-gradient-to-r from-red-500 to-pink-500 px-3 py-2",
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-white animate-pulse" />
          <span className="text-white text-sm font-medium">{title}</span>
          {discountAmount && (
            <Badge className="bg-white/20 text-white text-[10px] border-0">
              省¥{discountAmount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-white/70 text-xs mr-1">剩余</span>
          <span className="px-1.5 py-0.5 bg-white/20 text-white text-xs font-mono rounded">{fmt(timeLeft.h)}</span>
          <span className="text-white">:</span>
          <span className="px-1.5 py-0.5 bg-white/20 text-white text-xs font-mono rounded">{fmt(timeLeft.m)}</span>
          <span className="text-white">:</span>
          <span className="px-1.5 py-0.5 bg-white/20 text-white text-xs font-mono rounded">{fmt(timeLeft.s)}</span>
        </div>
      </div>
    </div>
  )
}

// ===== 优惠券领取卡片 =====
interface CouponClaimCardProps {
  amount: number
  threshold: number
  onClaim?: () => void
  claimed?: boolean
  className?: string
}

export function CouponClaimCard({ amount, threshold, onClaim, claimed = false, className }: CouponClaimCardProps) {
  const [isClaimed, setIsClaimed] = useState(claimed)
  
  const handleClaim = () => {
    setIsClaimed(true)
    onClaim?.()
  }
  
  return (
    <div className={cn(
      "relative overflow-hidden rounded-lg border border-red-200 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 dark:border-red-800/30",
      className
    )}>
      {/* 锯齿装饰 */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-6 bg-background rounded-r-full" />
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-6 bg-background rounded-l-full" />
      
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="text-center">
            <div className="flex items-baseline text-red-500">
              <span className="text-xs">¥</span>
              <span className="text-2xl font-bold">{amount}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">满{threshold}可用</p>
          </div>
          <div className="h-8 w-px bg-red-200 dark:bg-red-800/30" />
          <div>
            <p className="text-sm font-medium">课程优惠券</p>
            <p className="text-[10px] text-muted-foreground">全场课程通用</p>
          </div>
        </div>
        <Button 
          size="sm" 
          variant={isClaimed ? "secondary" : "default"}
          className={cn(
            "h-7 text-xs rounded-full",
            !isClaimed && "bg-red-500 hover:bg-red-600"
          )}
          onClick={handleClaim}
          disabled={isClaimed}
        >
          {isClaimed ? "已领取" : "立即领取"}
        </Button>
      </div>
    </div>
  )
}

// ===== 会员升级优惠卡片 =====
interface MemberUpgradeCardProps {
  currentLevel: string
  nextLevel: string
  discount: number
  link?: string
  className?: string
}

export function MemberUpgradeCard({ currentLevel, nextLevel, discount, link = "/vip", className }: MemberUpgradeCardProps) {
  return (
    <Link href={link}>
      <div className={cn(
        "relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-white",
        className
      )}>
        {/* 装饰 */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-20">
          <Gift className="w-12 h-12" />
        </div>
        
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge className="bg-white/20 text-white text-[10px] border-0">{currentLevel}</Badge>
              <ChevronRight className="w-3 h-3" />
              <Badge className="bg-white text-amber-600 text-[10px] border-0">{nextLevel}</Badge>
            </div>
            <p className="text-sm font-medium mt-1">升级享全场{discount}折特权</p>
          </div>
          <Button size="sm" className="bg-white text-amber-600 hover:bg-white/90 h-7 text-xs">
            立即升级
          </Button>
        </div>
      </div>
    </Link>
  )
}

// ===== 拼团信息卡片 =====
interface GroupBuyInfoCardProps {
  groupPrice: number
  originalPrice: number
  peopleNeeded: number
  currentPeople: number
  endTime: Date
  className?: string
}

export function GroupBuyInfoCard({ groupPrice, originalPrice, peopleNeeded, currentPeople, endTime, className }: GroupBuyInfoCardProps) {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 })
  
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime()
      const end = endTime.getTime()
      const diff = Math.max(0, end - now)
      
      const h = Math.floor(diff / (1000 * 60 * 60))
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const s = Math.floor((diff % (1000 * 60)) / 1000)
      
      setTimeLeft({ h, m, s })
    }
    
    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [endTime])
  
  const fmt = (n: number) => n.toString().padStart(2, "0")
  
  return (
    <div className={cn(
      "rounded-xl border border-pink-200 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/30 dark:to-purple-950/30 dark:border-pink-800/30 p-3",
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-pink-500" />
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-pink-500">¥{groupPrice}</span>
              <span className="text-xs text-muted-foreground line-through">¥{originalPrice}</span>
              <Badge className="bg-pink-500 text-white text-[10px] border-0">
                {peopleNeeded}人团
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              已有{currentPeople}人参团，还差{peopleNeeded - currentPeople}人成团
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground">剩余时间</p>
          <div className="flex items-center gap-0.5 text-pink-500 font-mono text-xs">
            {fmt(timeLeft.h)}:{fmt(timeLeft.m)}:{fmt(timeLeft.s)}
          </div>
        </div>
      </div>
      <Button size="sm" className="w-full mt-2 bg-pink-500 hover:bg-pink-600 h-8 text-xs">
        立即参团，省¥{originalPrice - groupPrice}
      </Button>
    </div>
  )
}

// ===== 支付成功推荐卡片 =====
interface PaymentSuccessRecommendProps {
  products: Array<{
    id: string
    name: string
    price: number
    originalPrice: number
    image?: string
  }>
  coupon?: {
    amount: number
    threshold: number
  }
  className?: string
}

export function PaymentSuccessRecommend({ products, coupon, className }: PaymentSuccessRecommendProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* 优惠券发放 */}
      {coupon && (
        <div className="rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 dark:border-green-800/30 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                <Ticket className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-400">恭喜获得优惠券</p>
                <p className="text-xs text-muted-foreground">满{coupon.threshold}减{coupon.amount}，已放入卡包</p>
              </div>
            </div>
            <Link href="/coupons">
              <Button size="sm" variant="outline" className="h-7 text-xs border-green-500 text-green-600">
                去使用
              </Button>
            </Link>
          </div>
        </div>
      )}
      
      {/* 关联商品推荐 */}
      <div>
        <h4 className="text-sm font-medium mb-2">猜你还喜欢</h4>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {products.map((product) => (
            <Link key={product.id} href={`/mall/product/${product.id}`} className="flex-shrink-0 w-28">
              <div className="aspect-square rounded-lg bg-secondary flex items-center justify-center mb-1.5">
                <Gift className="w-6 h-6 text-muted-foreground/30" />
              </div>
              <p className="text-xs line-clamp-2">{product.name}</p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xs text-primary font-medium">¥{product.price}</span>
                <span className="text-[10px] text-muted-foreground line-through">¥{product.originalPrice}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

// ===== 营销位置渲染器 =====
interface MarketingSlotRendererProps {
  slotId: string
  page: string
  className?: string
  onClose?: () => void
}

export function MarketingSlotRenderer({ slotId, page, className, onClose }: MarketingSlotRendererProps) {
  const config = useMarketingSlot(slotId, page)
  
  if (!config || config.type === "empty") return null
  
  switch (config.type) {
    case "banner":
      return <MarketingBanner config={config} onClose={onClose} className={className} />
    case "activity":
      return <ActivityCard config={config} className={className} />
    case "seckill":
      return <CountdownBanner endTime={new Date(Date.now() + 2 * 60 * 60 * 1000)} className={className} />
    case "coupon":
      return <CouponClaimCard amount={30} threshold={199} className={className} />
    case "groupbuy":
      return <GroupBuyInfoCard 
        groupPrice={199} 
        originalPrice={299} 
        peopleNeeded={3} 
        currentPeople={1}
        endTime={new Date(Date.now() + 24 * 60 * 60 * 1000)}
        className={className} 
      />
    default:
      return null
  }
}
