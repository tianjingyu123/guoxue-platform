"use client"

import { cn } from "@/lib/utils"
import { TaijiSymbol } from "./brand-decorations"
import { 
  BookOpen, 
  MessageCircle, 
  ShoppingBag, 
  Heart, 
  Users, 
  Video, 
  FileText,
  Bell,
  Search,
  Bookmark,
  Clock,
  Wallet,
  Package
} from "lucide-react"
import { Button } from "./button"

// ============================================
// 热卜国学 - 统一空状态组件
// 国学风格插画 + 情感化文案 + CTA按钮
// ============================================

type EmptyStateType = 
  | "default"
  | "course"
  | "circle"
  | "live"
  | "article"
  | "cart"
  | "favorites"
  | "message"
  | "notification"
  | "search"
  | "order"
  | "history"
  | "wallet"

interface EmptyStateProps {
  type?: EmptyStateType
  title?: string
  description?: string
  actionText?: string
  onAction?: () => void
  className?: string
}

// 空状态配置
const emptyStateConfig: Record<EmptyStateType, {
  icon: React.ReactNode
  title: string
  description: string
  actionText?: string
}> = {
  default: {
    icon: <TaijiSymbol className="w-16 h-16" animate />,
    title: "暂无内容",
    description: "这里空空如也，去发现更多精彩吧"
  },
  course: {
    icon: <BookOpen className="w-12 h-12" />,
    title: "还没有课程",
    description: "开启你的国学之旅，探索千年智慧",
    actionText: "探索课程"
  },
  circle: {
    icon: <Users className="w-12 h-12" />,
    title: "还没有加入圈子",
    description: "加入志同道合的学习社群，与师友共同成长",
    actionText: "发现圈子"
  },
  live: {
    icon: <Video className="w-12 h-12" />,
    title: "暂无直播",
    description: "名师大咖即将开讲，敬请期待",
    actionText: "查看预告"
  },
  article: {
    icon: <FileText className="w-12 h-12" />,
    title: "暂无文章",
    description: "精选好文即将呈现，稍后再来",
    actionText: "浏览推荐"
  },
  cart: {
    icon: <ShoppingBag className="w-12 h-12" />,
    title: "购物车是空的",
    description: "精选国学好物等你发现",
    actionText: "去逛逛"
  },
  favorites: {
    icon: <Heart className="w-12 h-12" />,
    title: "还没有收藏",
    description: "收藏喜欢的内容，随时回顾",
    actionText: "去发现"
  },
  message: {
    icon: <MessageCircle className="w-12 h-12" />,
    title: "暂无消息",
    description: "和讲师互动，获取更多学习指导"
  },
  notification: {
    icon: <Bell className="w-12 h-12" />,
    title: "暂无通知",
    description: "重要消息会在这里提醒你"
  },
  search: {
    icon: <Search className="w-12 h-12" />,
    title: "未找到相关内容",
    description: "换个关键词试试吧",
    actionText: "清空搜索"
  },
  order: {
    icon: <Package className="w-12 h-12" />,
    title: "暂无订单",
    description: "快去选购心仪的课程和商品吧",
    actionText: "去购物"
  },
  history: {
    icon: <Clock className="w-12 h-12" />,
    title: "暂无浏览记录",
    description: "你浏览过的内容会出现在这里"
  },
  wallet: {
    icon: <Wallet className="w-12 h-12" />,
    title: "暂无交易记录",
    description: "充值或消费后会显示在这里"
  }
}

export function EmptyState({ 
  type = "default", 
  title, 
  description, 
  actionText,
  onAction,
  className 
}: EmptyStateProps) {
  const config = emptyStateConfig[type]
  
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-16 px-6",
      className
    )}>
      {/* 插画区域 */}
      <div className="relative mb-6">
        {/* 背景装饰圆 */}
        <div className="absolute inset-0 -m-4 rounded-full bg-gradient-to-br from-[#FAF8F5] to-[#F2EFEA] empty-pulse" />
        
        {/* 图标容器 */}
        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#FFFFFF] to-[#F5F1EB] shadow-[0_4px_20px_rgba(0,0,0,0.06)] flex items-center justify-center empty-illustration">
          <div className="text-[#C9A96E]">
            {config.icon}
          </div>
        </div>
        
        {/* 太极装饰 - 右下角 */}
        <div className="absolute -bottom-1 -right-1 w-8 h-8 opacity-30">
          <TaijiSymbol className="w-full h-full" primaryColor="#C9A96E" />
        </div>
      </div>
      
      {/* 文案区域 */}
      <h3 className="text-[17px] font-bold text-[#2C2C2C] mb-2 font-serif">
        {title || config.title}
      </h3>
      <p className="text-[13px] text-[#999999] text-center max-w-[240px] leading-relaxed">
        {description || config.description}
      </p>
      
      {/* CTA按钮 */}
      {(actionText || config.actionText) && onAction && (
        <Button
          onClick={onAction}
          className="mt-6 px-6 py-2 bg-[#C41E3A] hover:bg-[#A01830] text-white rounded-full text-[14px] font-medium shadow-[0_4px_12px_rgba(196,30,58,0.25)] transition-all"
        >
          {actionText || config.actionText}
        </Button>
      )}
    </div>
  )
}

// 小型空状态 - 用于列表内嵌
export function EmptyStateInline({ 
  message = "暂无内容",
  className 
}: { 
  message?: string
  className?: string 
}) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-8 text-center",
      className
    )}>
      <div className="w-12 h-12 rounded-full bg-[#F5F1EB] flex items-center justify-center mb-3">
        <TaijiSymbol className="w-6 h-6 opacity-40" />
      </div>
      <p className="text-[13px] text-[#999999]">{message}</p>
    </div>
  )
}
