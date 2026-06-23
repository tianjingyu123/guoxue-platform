"use client"

import { useState } from "react"
import { 
  Check, X, Crown, Star, Sparkles, Zap, Shield, Gift,
  BookOpen, Bot, Radio, ShoppingBag, Clock, Users, TrendingUp
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface BenefitItem {
  name: string
  icon: React.ReactNode
  free: string | boolean
  vip: string | boolean
  highlight?: boolean
}

interface MembershipComparisonProps {
  onSelectVIP?: () => void
  className?: string
}

// 权益对比卡片组件
export function MembershipComparison({ onSelectVIP, className }: MembershipComparisonProps) {
  const [expanded, setExpanded] = useState(false)

  const benefits: BenefitItem[] = [
    { 
      name: "免费课程", 
      icon: <BookOpen className="w-4 h-4" />, 
      free: "20+", 
      vip: "500+",
      highlight: true 
    },
    { 
      name: "AI对话次数", 
      icon: <Bot className="w-4 h-4" />, 
      free: "5次/天", 
      vip: "无限",
      highlight: true 
    },
    { 
      name: "古籍阅读", 
      icon: <BookOpen className="w-4 h-4" />, 
      free: "部分", 
      vip: "全部" 
    },
    { 
      name: "直播回放", 
      icon: <Radio className="w-4 h-4" />, 
      free: "48小时", 
      vip: "永久" 
    },
    { 
      name: "商城折扣", 
      icon: <ShoppingBag className="w-4 h-4" />, 
      free: false, 
      vip: "95折" 
    },
    { 
      name: "每月国学币", 
      icon: <Gift className="w-4 h-4" />, 
      free: "0", 
      vip: "100",
      highlight: true 
    },
    { 
      name: "排盘功能", 
      icon: <Sparkles className="w-4 h-4" />, 
      free: "基础", 
      vip: "高级" 
    },
    { 
      name: "专属客服", 
      icon: <Users className="w-4 h-4" />, 
      free: false, 
      vip: true 
    },
    { 
      name: "专属标识", 
      icon: <Crown className="w-4 h-4" />, 
      free: false, 
      vip: true 
    },
    { 
      name: "优先连麦", 
      icon: <Radio className="w-4 h-4" />, 
      free: false, 
      vip: true 
    },
  ]

  const displayBenefits = expanded ? benefits : benefits.slice(0, 6)

  const renderValue = (value: string | boolean, isVip: boolean) => {
    if (typeof value === "boolean") {
      return value ? (
        <Check className={cn("w-4 h-4", isVip ? "text-green-500" : "text-muted-foreground")} />
      ) : (
        <X className="w-4 h-4 text-muted-foreground/50" />
      )
    }
    return <span className={cn("text-sm", isVip ? "text-foreground font-medium" : "text-muted-foreground")}>{value}</span>
  }

  // 计算省钱金额（模拟）
  const savedAmount = 1268

  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* 顶部对比头 */}
      <div className="grid grid-cols-3 border-b border-border">
        <div className="p-3 bg-secondary/30">
          <span className="text-xs text-muted-foreground">权益对比</span>
        </div>
        <div className="p-3 text-center bg-secondary/30 border-x border-border">
          <span className="text-sm text-muted-foreground">普通用户</span>
        </div>
        <div className="p-3 text-center bg-gradient-to-r from-amber-500/10 to-orange-500/10">
          <div className="flex items-center justify-center gap-1">
            <Crown className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold text-amber-600">VIP会员</span>
          </div>
        </div>
      </div>

      {/* 权益列表 */}
      <div className="divide-y divide-border">
        {displayBenefits.map((benefit, index) => (
          <div 
            key={index} 
            className={cn(
              "grid grid-cols-3",
              benefit.highlight && "bg-primary/5"
            )}
          >
            <div className="p-3 flex items-center gap-2">
              <span className="text-muted-foreground">{benefit.icon}</span>
              <span className="text-sm text-foreground">{benefit.name}</span>
              {benefit.highlight && (
                <Sparkles className="w-3 h-3 text-amber-500" />
              )}
            </div>
            <div className="p-3 flex items-center justify-center border-x border-border">
              {renderValue(benefit.free, false)}
            </div>
            <div className="p-3 flex items-center justify-center bg-gradient-to-r from-amber-500/5 to-orange-500/5">
              {renderValue(benefit.vip, true)}
            </div>
          </div>
        ))}
      </div>

      {/* 展开/收起 */}
      {benefits.length > 6 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-2 text-xs text-primary hover:bg-secondary/50 transition-colors border-t border-border"
        >
          {expanded ? "收起" : `查看全部 ${benefits.length} 项权益`}
        </button>
      )}

      {/* 底部CTA区域 */}
      <div className="p-4 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border-t border-amber-500/20">
        {/* 省钱提示 */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-green-500" />
          <span className="text-sm text-foreground">
            开通VIP后预计每年可省 
            <span className="text-green-500 font-bold text-lg mx-1">¥{savedAmount}</span>
          </span>
        </div>
        
        {/* 开通按钮 */}
        <Button 
          onClick={onSelectVIP}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0 shadow-lg shadow-amber-500/20"
        >
          <Crown className="w-4 h-4 mr-2" />
          立即开通VIP
          <Badge className="ml-2 bg-white/20 text-white border-0 text-[10px]">
            限时优惠
          </Badge>
        </Button>
        
        {/* 保障提示 */}
        <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-green-500" />
            7天无理由退款
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            即开即用
          </span>
        </div>
      </div>
    </Card>
  )
}

// 迷你版权益对比（用于弹窗或侧边栏）
export function MembershipComparisonMini({ onSelectVIP }: { onSelectVIP?: () => void }) {
  const highlights = [
    { label: "免费课程", free: "20+", vip: "500+" },
    { label: "AI对话", free: "5次/天", vip: "无限" },
    { label: "每月国学币", free: "0", vip: "100" },
  ]

  return (
    <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
      <div className="flex items-center gap-2 mb-3">
        <Crown className="w-5 h-5 text-amber-500" />
        <span className="font-semibold text-foreground">升级VIP解锁更多</span>
      </div>
      
      <div className="space-y-2 mb-4">
        {highlights.map((item, index) => (
          <div key={index} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{item.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground line-through text-xs">{item.free}</span>
              <Zap className="w-3 h-3 text-amber-500" />
              <span className="text-amber-600 font-medium">{item.vip}</span>
            </div>
          </div>
        ))}
      </div>
      
      <Button 
        onClick={onSelectVIP}
        size="sm"
        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white"
      >
        开通VIP
      </Button>
    </Card>
  )
}

// 权益解锁提示条（用于功能入口处）
export function VIPUnlockBanner({ 
  feature, 
  onUpgrade 
}: { 
  feature: string
  onUpgrade?: () => void 
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
      <div className="flex items-center gap-2">
        <Crown className="w-4 h-4 text-amber-500" />
        <span className="text-sm text-foreground">
          升级VIP解锁<span className="font-semibold text-amber-600">{feature}</span>
        </span>
      </div>
      <Button 
        onClick={onUpgrade}
        size="sm"
        variant="ghost"
        className="text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
      >
        立即解锁
      </Button>
    </div>
  )
}
