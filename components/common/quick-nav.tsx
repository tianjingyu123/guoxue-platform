"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

// 内容类型到路径的映射
export const contentTypeRoutes = {
  course: (id: number | string) => `/course/${id}`,
  circle: (id: number | string) => `/circle/${id}`,
  article: (id: number | string) => `/article/${id}`,
  product: (id: number | string) => `/mall/product/${id}`,
  live: (id: number | string) => `/live/${id}`,
  liveReplay: (id: number | string) => `/live/replay/${id}`,
  agent: (id: number | string) => `/agent/${id}`,
  ebook: (id: number | string) => `/reader/${id}`,
  video: (id: number | string) => `/video/${id}`,
  post: (id: number | string) => `/post/${id}`,
  user: (id: number | string) => `/user/${id}`,
  expert: (id: number | string) => `/expert/${id}`,
  order: (id: string) => `/orders/${id}`,
  classic: (id: number | string) => `/reader/${id}`,
}

// 页面分类导航
export const pageCategories = {
  discover: [
    { label: "首页", href: "/" },
    { label: "发现", href: "/discover" },
    { label: "搜索", href: "/search" },
    { label: "课程列表", href: "/courses-list" },
    { label: "圈子广场", href: "/circle" },
    { label: "直播大厅", href: "/live" },
    { label: "商城", href: "/mall" },
    { label: "智能体", href: "/agents" },
    { label: "文章", href: "/articles" },
    { label: "古籍馆", href: "/classics/home" },
  ],
  user: [
    { label: "个人中心", href: "/profile" },
    { label: "我的课程", href: "/learning" },
    { label: "我的圈子", href: "/my-circles" },
    { label: "我的收藏", href: "/favorites" },
    { label: "浏览历史", href: "/history" },
    { label: "我的订单", href: "/orders" },
    { label: "钱包", href: "/wallet" },
    { label: "优惠券", href: "/coupons" },
    { label: "我的关注", href: "/follows" },
    { label: "消息中心", href: "/im/conversations" },
  ],
  tools: [
    { label: "排盘工具", href: "/result" },
    { label: "专家咨询", href: "/experts" },
  ],
  settings: [
    { label: "设置", href: "/settings" },
    { label: "编辑资料", href: "/profile/edit" },
    { label: "帮助中心", href: "/help" },
  ],
}

// 快捷导航条（水平滚动）
interface QuickNavBarProps {
  items: Array<{ label: string; href: string; badge?: string }>
  className?: string
}

export function QuickNavBar({ items, className }: QuickNavBarProps) {
  return (
    <div className={cn("flex gap-2 overflow-x-auto scrollbar-hide px-4 py-2", className)}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex-shrink-0 px-3 py-1.5 bg-secondary rounded-full text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
        >
          {item.label}
          {item.badge && (
            <span className="ml-1 text-primary text-xs">{item.badge}</span>
          )}
        </Link>
      ))}
    </div>
  )
}

// 导航链接列表（垂直）
interface NavListProps {
  title?: string
  items: Array<{ label: string; href: string; desc?: string; badge?: string }>
  className?: string
}

export function NavList({ title, items, className }: NavListProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {title && (
        <h3 className="text-sm font-medium text-muted-foreground px-4 mb-2">{title}</h3>
      )}
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors"
        >
          <div>
            <span className="text-sm font-medium text-foreground">{item.label}</span>
            {item.desc && (
              <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {item.badge && (
              <span className="text-xs text-primary">{item.badge}</span>
            )}
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </Link>
      ))}
    </div>
  )
}

// 工具函数：根据内容类型获取详情页链接
export function getDetailHref(type: keyof typeof contentTypeRoutes, id: number | string): string {
  const routeFunc = contentTypeRoutes[type]
  return routeFunc ? routeFunc(id) : "#"
}

// 工具函数：根据内容类型和场景返回推荐的跳转页
export function getRelatedPages(type: string): Array<{ label: string; href: string }> {
  switch (type) {
    case "course":
      return [
        { label: "更多课程", href: "/courses-list" },
        { label: "我的学习", href: "/learning" },
      ]
    case "circle":
      return [
        { label: "发现圈子", href: "/circle" },
        { label: "我的圈子", href: "/my-circles" },
      ]
    case "article":
      return [
        { label: "更多文章", href: "/articles" },
        { label: "我的收藏", href: "/favorites" },
      ]
    case "product":
      return [
        { label: "逛商城", href: "/mall" },
        { label: "购物车", href: "/cart" },
      ]
    case "live":
      return [
        { label: "直播大厅", href: "/live" },
        { label: "我的关注", href: "/follows" },
      ]
    default:
      return [
        { label: "去发现", href: "/discover" },
        { label: "返回首页", href: "/" },
      ]
  }
}
