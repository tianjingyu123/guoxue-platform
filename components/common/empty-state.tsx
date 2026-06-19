"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { 
  BookOpen, ShoppingBag, Users, FileText, Play, Radio, Bot, 
  Compass, Search, Heart, MessageCircle, Package, Ticket,
  Wallet, Clock, Star
} from "lucide-react"
import { cn } from "@/lib/utils"

// 空状态类型配置
const emptyStateConfig: Record<string, {
  icon: any
  title: string
  description: string
  primaryAction?: { label: string; href: string }
  secondaryAction?: { label: string; href: string }
}> = {
  course: {
    icon: BookOpen,
    title: "还没有课程",
    description: "去发现更多精彩课程，开启你的学习之旅",
    primaryAction: { label: "发现课程", href: "/discover" },
    secondaryAction: { label: "浏览分类", href: "/courses-list" },
  },
  order: {
    icon: Package,
    title: "暂无订单",
    description: "快去逛逛，发现你感兴趣的内容",
    primaryAction: { label: "去逛逛", href: "/" },
    secondaryAction: { label: "浏览课程", href: "/discover" },
  },
  favorite: {
    icon: Heart,
    title: "还没有收藏",
    description: "收藏你感兴趣的内容，方便下次查看",
    primaryAction: { label: "去发现", href: "/discover" },
  },
  circle: {
    icon: Users,
    title: "还没有加入圈子",
    description: "加入志同道合的圈子，一起学习交流",
    primaryAction: { label: "发现圈子", href: "/circle" },
  },
  article: {
    icon: FileText,
    title: "暂无文章",
    description: "去发现更多精彩内容",
    primaryAction: { label: "浏览文章", href: "/articles" },
  },
  live: {
    icon: Radio,
    title: "暂无直播",
    description: "关注你喜欢的主播，不错过任何精彩直播",
    primaryAction: { label: "发现直播", href: "/live" },
  },
  video: {
    icon: Play,
    title: "暂无视频",
    description: "去发现更多精彩短视频",
    primaryAction: { label: "刷视频", href: "/discover" },
  },
  product: {
    icon: ShoppingBag,
    title: "暂无商品",
    description: "去商城逛逛，发现心仪好物",
    primaryAction: { label: "逛商城", href: "/mall" },
  },
  cart: {
    icon: ShoppingBag,
    title: "购物车是空的",
    description: "快去挑选心仪的商品吧",
    primaryAction: { label: "去逛逛", href: "/mall" },
  },
  coupon: {
    icon: Ticket,
    title: "暂无优惠券",
    description: "去领券中心领取更多优惠",
    primaryAction: { label: "去领券", href: "/coupons/center" },
  },
  message: {
    icon: MessageCircle,
    title: "暂无消息",
    description: "关注感兴趣的内容，接收最新动态",
    primaryAction: { label: "去发现", href: "/discover" },
  },
  search: {
    icon: Search,
    title: "没有找到相关结果",
    description: "换个关键词试试吧",
    primaryAction: { label: "热门推荐", href: "/discover" },
  },
  agent: {
    icon: Bot,
    title: "暂无对话",
    description: "和AI智能体聊聊，获取专业解答",
    primaryAction: { label: "发现智能体", href: "/agents" },
  },
  wallet: {
    icon: Wallet,
    title: "暂无交易记录",
    description: "充值或消费后会在这里显示",
    primaryAction: { label: "去充值", href: "/wallet/recharge" },
  },
  history: {
    icon: Clock,
    title: "暂无浏览记录",
    description: "浏览过的内容会在这里显示",
    primaryAction: { label: "去发现", href: "/discover" },
  },
  follow: {
    icon: Star,
    title: "还没有关注",
    description: "关注你感兴趣的创作者",
    primaryAction: { label: "去发现", href: "/discover" },
  },
}

interface EmptyStateProps {
  type: keyof typeof emptyStateConfig
  title?: string
  description?: string
  primaryAction?: { label: string; href: string }
  secondaryAction?: { label: string; href: string }
  className?: string
}

export function EmptyState({
  type,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
}: EmptyStateProps) {
  const config = emptyStateConfig[type] || emptyStateConfig.search
  const Icon = config.icon
  
  const finalTitle = title || config.title
  const finalDescription = description || config.description
  const finalPrimaryAction = primaryAction || config.primaryAction
  const finalSecondaryAction = secondaryAction || config.secondaryAction

  // 场景化插画配置
  const illustrationConfig: Record<string, { emoji: string; gradient: string; subtitle: string }> = {
    course: { emoji: "📚", gradient: "from-blue-500/20 to-indigo-500/20", subtitle: "知识改变命运" },
    order: { emoji: "📦", gradient: "from-amber-500/20 to-orange-500/20", subtitle: "好物等你发现" },
    favorite: { emoji: "💝", gradient: "from-rose-500/20 to-pink-500/20", subtitle: "收藏你的心动" },
    circle: { emoji: "🌟", gradient: "from-purple-500/20 to-violet-500/20", subtitle: "志同道合，共同进步" },
    article: { emoji: "✍️", gradient: "from-emerald-500/20 to-teal-500/20", subtitle: "好文章值得细品" },
    live: { emoji: "🎬", gradient: "from-red-500/20 to-rose-500/20", subtitle: "精彩直播不容错过" },
    video: { emoji: "🎥", gradient: "from-purple-500/20 to-fuchsia-500/20", subtitle: "短视频学国学" },
    product: { emoji: "🛍️", gradient: "from-amber-500/20 to-yellow-500/20", subtitle: "开运好物" },
    cart: { emoji: "🛒", gradient: "from-green-500/20 to-emerald-500/20", subtitle: "装满幸运" },
    coupon: { emoji: "🎫", gradient: "from-orange-500/20 to-red-500/20", subtitle: "省钱小能手" },
    message: { emoji: "💬", gradient: "from-sky-500/20 to-blue-500/20", subtitle: "等待你的消息" },
    search: { emoji: "🔍", gradient: "from-slate-500/20 to-zinc-500/20", subtitle: "换个关键词试试" },
    agent: { emoji: "🤖", gradient: "from-violet-500/20 to-purple-500/20", subtitle: "AI助你解惑" },
    wallet: { emoji: "💰", gradient: "from-yellow-500/20 to-amber-500/20", subtitle: "财源广进" },
    history: { emoji: "⏳", gradient: "from-slate-500/20 to-gray-500/20", subtitle: "留下足迹" },
    follow: { emoji: "👥", gradient: "from-cyan-500/20 to-teal-500/20", subtitle: "关注感兴趣的人" },
  }

  const illustration = illustrationConfig[type] || { emoji: "📭", gradient: "from-secondary to-muted", subtitle: "" }

  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-6", className)}>
      {/* 顶部小Logo */}
      <div className="mb-4 opacity-60">
        <img src="/images/logo.jpg" alt="热卜" className="w-8 h-8 rounded-lg object-cover" />
      </div>
      
      {/* 增强版插画区 - 带渐变背景和装饰 */}
      <div className="relative mb-6">
        {/* 装饰光晕 */}
        <div className={cn(
          "absolute inset-0 rounded-full blur-2xl opacity-50",
          `bg-gradient-to-br ${illustration.gradient}`
        )} />
        
        {/* 主图标容器 */}
        <div className={cn(
          "relative w-28 h-28 rounded-full flex items-center justify-center",
          `bg-gradient-to-br ${illustration.gradient}`,
          "border border-border/50"
        )}>
          <span className="text-5xl">{illustration.emoji}</span>
          
          {/* 小图标装饰 */}
          <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center shadow-sm">
            <Icon className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </div>
      
      {/* 文案区 - 更有温度 */}
      <h3 className="text-lg font-semibold text-foreground mb-1">{finalTitle}</h3>
      <p className="text-sm text-muted-foreground text-center max-w-[260px] mb-2 leading-relaxed">
        {finalDescription}
      </p>
      {illustration.subtitle && (
        <p className="text-xs text-primary/70 mb-6">{illustration.subtitle}</p>
      )}
      
      {/* 操作按钮 - 增强样式 */}
      <div className="flex items-center gap-3">
        {finalPrimaryAction && (
          <Link href={finalPrimaryAction.href}>
            <Button className="rounded-full px-6 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow">
              {finalPrimaryAction.label}
            </Button>
          </Link>
        )}
        {finalSecondaryAction && (
          <Link href={finalSecondaryAction.href}>
            <Button variant="outline" className="rounded-full px-6">
              {finalSecondaryAction.label}
            </Button>
          </Link>
        )}
      </div>
    </div>
  )
}

// 带推荐的空状态
interface EmptyStateWithRecommendProps extends EmptyStateProps {
  recommendations?: {
    type: "course" | "circle" | "article" | "product"
    items: Array<{ id: number; title: string; subtitle?: string; price?: number }>
  }
}

export function EmptyStateWithRecommend({
  recommendations,
  ...props
}: EmptyStateWithRecommendProps) {
  const getHref = (type: string, id: number) => {
    switch (type) {
      case "course": return `/course/${id}`
      case "circle": return `/circle/${id}`
      case "article": return `/article/${id}`
      case "product": return `/mall/product/${id}`
      default: return "#"
    }
  }

  return (
    <div>
      <EmptyState {...props} />
      
      {recommendations && recommendations.items.length > 0 && (
        <div className="px-4 mt-4">
          <h4 className="text-sm font-medium text-foreground mb-3">为你推荐</h4>
          <div className="space-y-2">
            {recommendations.items.slice(0, 3).map((item) => (
              <Link key={item.id} href={getHref(recommendations.type, item.id)}>
                <Card className="p-3 hover:bg-secondary/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium line-clamp-1">{item.title}</p>
                      {item.subtitle && (
                        <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                      )}
                    </div>
                    {item.price !== undefined && (
                      <span className="text-primary font-bold text-sm">¥{item.price}</span>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
