"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { 
  Clock, Users, Flame, TrendingUp, ShieldCheck, Award,
  Sparkles, Zap, Eye, ShoppingCart, Star, CheckCircle2
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

// ===== 价格锚点组件 - 强化原价对比 =====
interface PriceAnchorProps {
  currentPrice: number
  originalPrice: number
  discount?: number // 可选，自动计算
  showSaved?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

export function PriceAnchor({
  currentPrice,
  originalPrice,
  discount,
  showSaved = true,
  size = "md",
  className,
}: PriceAnchorProps) {
  const savedAmount = originalPrice - currentPrice
  const discountPercent = discount || Math.round((1 - currentPrice / originalPrice) * 100)
  
  const sizeConfig = {
    sm: { price: "text-lg", original: "text-xs", badge: "text-[9px] px-1 py-0.5" },
    md: { price: "text-2xl", original: "text-sm", badge: "text-[10px] px-1.5 py-0.5" },
    lg: { price: "text-3xl", original: "text-base", badge: "text-xs px-2 py-1" },
  }

  return (
    <div className={cn("flex flex-wrap items-baseline gap-2", className)}>
      {/* 现价 - 醒目红色 */}
      <div className="flex items-baseline">
        <span className={cn("font-bold text-primary", sizeConfig[size].price)}>
          <span className="text-sm mr-0.5">¥</span>
          {currentPrice}
        </span>
      </div>
      
      {/* 原价 - 删除线 */}
      {originalPrice > currentPrice && (
        <span className={cn(
          "text-muted-foreground line-through decoration-muted-foreground/50",
          sizeConfig[size].original
        )}>
          ¥{originalPrice}
        </span>
      )}
      
      {/* 折扣标签 */}
      {discountPercent > 0 && (
        <Badge className={cn(
          "bg-primary/10 text-primary border-primary/20 font-bold",
          sizeConfig[size].badge
        )}>
          {discountPercent}折
        </Badge>
      )}
      
      {/* 已省金额 */}
      {showSaved && savedAmount > 0 && (
        <span className={cn(
          "text-green-500 font-medium",
          sizeConfig[size].original
        )}>
          已省¥{savedAmount}
        </span>
      )}
    </div>
  )
}

// ===== 稀缺性提示组件 =====
interface ScarcityIndicatorProps {
  type: "stock" | "time" | "popularity" | "spots"
  value: number
  total?: number
  className?: string
}

export function ScarcityIndicator({
  type,
  value,
  total,
  className,
}: ScarcityIndicatorProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  
  useEffect(() => {
    // 间歇性闪烁吸引注意力
    const interval = setInterval(() => {
      setIsAnimating(true)
      setTimeout(() => setIsAnimating(false), 500)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const config = {
    stock: {
      icon: ShoppingCart,
      text: `仅剩 ${value} 件`,
      color: value <= 10 ? "text-red-500" : value <= 50 ? "text-amber-500" : "text-muted-foreground",
      bg: value <= 10 ? "bg-red-500/10" : value <= 50 ? "bg-amber-500/10" : "bg-secondary",
    },
    time: {
      icon: Clock,
      text: `限时优惠`,
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
    popularity: {
      icon: Eye,
      text: `${value} 人正在浏览`,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    spots: {
      icon: Users,
      text: total ? `已报名 ${value}/${total}` : `已有 ${value} 人报名`,
      color: total && value >= total * 0.9 ? "text-red-500" : "text-muted-foreground",
      bg: total && value >= total * 0.9 ? "bg-red-500/10" : "bg-secondary",
    },
  }

  const { icon: Icon, text, color, bg } = config[type]

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all",
      bg,
      color,
      isAnimating && "animate-pulse",
      className
    )}>
      <Icon className="w-3.5 h-3.5" />
      <span>{text}</span>
    </div>
  )
}

// ===== 社会证明组件 =====
interface SocialProofProps {
  type: "students" | "reviews" | "buyers" | "experts"
  count: number
  rating?: number
  recentBuyers?: string[]
  className?: string
}

export function SocialProof({
  type,
  count,
  rating,
  recentBuyers,
  className,
}: SocialProofProps) {
  const formatCount = (n: number) => {
    if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
    return n.toString()
  }

  const config = {
    students: {
      icon: Users,
      text: `${formatCount(count)} 人已学习`,
      subtext: "口碑好课，值得信赖",
    },
    reviews: {
      icon: Star,
      text: `${rating?.toFixed(1) || "4.9"} 分`,
      subtext: `${formatCount(count)} 条好评`,
    },
    buyers: {
      icon: ShoppingCart,
      text: `${formatCount(count)} 人已购买`,
      subtext: "复购率超高",
    },
    experts: {
      icon: Award,
      text: `${count} 位专家推荐`,
      subtext: "业内权威认可",
    },
  }

  const { icon: Icon, text, subtext } = config[type]

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border",
      className
    )}>
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{text}</p>
        <p className="text-xs text-muted-foreground">{subtext}</p>
      </div>
      
      {/* 最近购买者头像堆叠 */}
      {recentBuyers && recentBuyers.length > 0 && (
        <div className="flex -space-x-2">
          {recentBuyers.slice(0, 3).map((name, i) => (
            <div 
              key={i}
              className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border-2 border-card flex items-center justify-center text-[10px] font-medium text-foreground"
            >
              {name[0]}
            </div>
          ))}
          {recentBuyers.length > 3 && (
            <div className="w-7 h-7 rounded-full bg-secondary border-2 border-card flex items-center justify-center text-[10px] text-muted-foreground">
              +{recentBuyers.length - 3}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ===== 实时动态提示（XX刚刚购买）=====
interface LiveActivityProps {
  activities: { user: string; action: string; time: string }[]
  className?: string
}

export function LiveActivity({ activities, className }: LiveActivityProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (activities.length <= 1) return
    
    const interval = setInterval(() => {
      setIsVisible(false)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % activities.length)
        setIsVisible(true)
      }, 300)
    }, 4000)
    
    return () => clearInterval(interval)
  }, [activities.length])

  if (activities.length === 0) return null

  const current = activities[currentIndex]

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-full bg-secondary/80 backdrop-blur-sm text-xs transition-all duration-300",
      isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2",
      className
    )}>
      <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
        <CheckCircle2 className="w-3 h-3 text-green-500" />
      </div>
      <span className="text-muted-foreground">
        <span className="text-foreground font-medium">{current.user}</span>
        {" "}{current.action}
      </span>
      <span className="text-muted-foreground/60">{current.time}</span>
    </div>
  )
}

// ===== 信任徽章组 =====
interface TrustBadgesProps {
  badges?: ("guarantee" | "secure" | "quality" | "support" | "official")[]
  className?: string
}

export function TrustBadges({ 
  badges = ["guarantee", "secure", "quality"],
  className 
}: TrustBadgesProps) {
  const badgeConfig = {
    guarantee: { icon: ShieldCheck, text: "7天无理由" },
    secure: { icon: ShieldCheck, text: "安全支付" },
    quality: { icon: Award, text: "品质保障" },
    support: { icon: Users, text: "专属客服" },
    official: { icon: CheckCircle2, text: "官方正品" },
  }

  return (
    <div className={cn("flex items-center justify-center gap-4 py-2", className)}>
      {badges.map((badge) => {
        const { icon: Icon, text } = badgeConfig[badge]
        return (
          <div key={badge} className="flex items-center gap-1 text-xs text-muted-foreground">
            <Icon className="w-3.5 h-3.5 text-green-500" />
            <span>{text}</span>
          </div>
        )
      })}
    </div>
  )
}

// ===== 限时倒计时增强版 =====
interface CountdownTimerProps {
  endTime: Date
  title?: string
  onEnd?: () => void
  variant?: "inline" | "card" | "banner"
  className?: string
}

export function CountdownTimer({
  endTime,
  title = "限时特惠",
  onEnd,
  variant = "inline",
  className,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })
  const [isUrgent, setIsUrgent] = useState(false)

  useEffect(() => {
    const calculateTimeLeft = () => {
      const diff = endTime.getTime() - Date.now()
      if (diff <= 0) {
        onEnd?.()
        return { hours: 0, minutes: 0, seconds: 0 }
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      
      // 最后30分钟进入紧迫状态
      setIsUrgent(diff <= 30 * 60 * 1000)
      
      return { hours, minutes, seconds }
    }

    setTimeLeft(calculateTimeLeft())
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000)
    return () => clearInterval(timer)
  }, [endTime, onEnd])

  const TimeBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className={cn(
        "w-8 h-8 rounded-md flex items-center justify-center font-mono font-bold text-sm",
        isUrgent ? "bg-red-500 text-white animate-pulse" : "bg-primary/10 text-primary"
      )}>
        {value.toString().padStart(2, "0")}
      </div>
      <span className="text-[10px] text-muted-foreground mt-0.5">{label}</span>
    </div>
  )

  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Zap className={cn("w-4 h-4", isUrgent ? "text-red-500" : "text-primary")} />
        <span className="text-xs text-muted-foreground">{title}</span>
        <div className="flex items-center gap-1">
          <span className={cn(
            "font-mono text-sm font-bold",
            isUrgent ? "text-red-500" : "text-foreground"
          )}>
            {timeLeft.hours.toString().padStart(2, "0")}:
            {timeLeft.minutes.toString().padStart(2, "0")}:
            {timeLeft.seconds.toString().padStart(2, "0")}
          </span>
        </div>
      </div>
    )
  }

  if (variant === "card") {
    return (
      <div className={cn(
        "flex items-center justify-between p-3 rounded-xl border",
        isUrgent ? "bg-red-500/5 border-red-500/20" : "bg-primary/5 border-primary/20",
        className
      )}>
        <div className="flex items-center gap-2">
          <Zap className={cn("w-5 h-5", isUrgent ? "text-red-500 animate-bounce" : "text-primary")} />
          <div>
            <p className={cn("text-sm font-semibold", isUrgent ? "text-red-500" : "text-foreground")}>
              {title}
            </p>
            <p className="text-xs text-muted-foreground">距结束还剩</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <TimeBlock value={timeLeft.hours} label="时" />
          <span className="text-muted-foreground font-bold">:</span>
          <TimeBlock value={timeLeft.minutes} label="分" />
          <span className="text-muted-foreground font-bold">:</span>
          <TimeBlock value={timeLeft.seconds} label="秒" />
        </div>
      </div>
    )
  }

  // banner variant
  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl p-4",
      isUrgent 
        ? "bg-gradient-to-r from-red-500 to-orange-500" 
        : "bg-gradient-to-r from-primary to-primary/80",
      className
    )}>
      {/* 装饰背景 */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/30" />
        <div className="absolute -left-4 -bottom-4 w-20 h-20 rounded-full bg-white/20" />
      </div>
      
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold">{title}</p>
            <p className="text-white/80 text-xs">错过再等一年</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {[
            { value: timeLeft.hours, label: "时" },
            { value: timeLeft.minutes, label: "分" },
            { value: timeLeft.seconds, label: "秒" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <span className="text-white font-mono font-bold">
                  {item.value.toString().padStart(2, "0")}
                </span>
              </div>
              <span className="text-white/60 text-xs">{item.label}</span>
              {i < 2 && <span className="text-white/60 font-bold mx-0.5">:</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ===== 增强版CTA按钮 =====
interface EnhancedCTAProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  variant?: "primary" | "urgent" | "success"
  size?: "sm" | "md" | "lg"
  className?: string
}

export function EnhancedCTA({
  children,
  onClick,
  disabled,
  loading,
  variant = "primary",
  size = "md",
  className,
}: EnhancedCTAProps) {
  const sizeConfig = {
    sm: "h-9 px-4 text-sm",
    md: "h-11 px-6 text-base",
    lg: "h-14 px-8 text-lg",
  }

  const variantConfig = {
    primary: "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-primary-foreground shadow-lg shadow-primary/20",
    urgent: "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-lg shadow-red-500/20 animate-pulse",
    success: "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg shadow-green-500/20",
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "relative font-bold rounded-xl transition-all duration-200 overflow-hidden",
        "active:scale-[0.98] hover:scale-[1.02]",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
        sizeConfig[size],
        variantConfig[variant],
        className
      )}
    >
      {/* 闪光动效 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>
      
      <span className="relative flex items-center justify-center gap-2">
        {loading ? (
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          children
        )}
      </span>
    </button>
  )
}
