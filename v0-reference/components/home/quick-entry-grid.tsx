"use client"

import Link from "next/link"
import { 
  GraduationCap, Users, BookOpen, ShoppingBag, Radio, 
  Compass, LayoutGrid, Bot, BookHeart, MoreHorizontal 
} from "lucide-react"
import { cn } from "@/lib/utils"

interface QuickEntryItem {
  id: string
  name: string
  icon: React.ReactNode
  link: string
  color: string
  bgColor: string
  badge?: string
}

// 10宫格功能入口配置
const quickEntries: QuickEntryItem[] = [
  {
    id: "courses",
    name: "课程",
    icon: <GraduationCap className="w-6 h-6" />,
    link: "/courses-list",
    color: "text-[#4A90D9]",
    bgColor: "bg-[#4A90D9]/10",
  },
  {
    id: "circles",
    name: "圈子",
    icon: <Users className="w-6 h-6" />,
    link: "/circles",
    color: "text-[#52C41A]",
    bgColor: "bg-[#52C41A]/10",
  },
  {
    id: "classics",
    name: "古籍馆",
    icon: <BookOpen className="w-6 h-6" />,
    link: "/classics/home",
    color: "text-[#C9A96E]",
    bgColor: "bg-[#C9A96E]/10",
  },
  {
    id: "mall",
    name: "商城",
    icon: <ShoppingBag className="w-6 h-6" />,
    link: "/mall",
    color: "text-[#C41E3A]",
    bgColor: "bg-[#C41E3A]/10",
    badge: "热",
  },
  {
    id: "live",
    name: "直播",
    icon: <Radio className="w-6 h-6" />,
    link: "/live",
    color: "text-[#E74C3C]",
    bgColor: "bg-[#E74C3C]/10",
  },
  {
    id: "fortune",
    name: "运势",
    icon: <Compass className="w-6 h-6" />,
    link: "/fortune",
    color: "text-[#9B59B6]",
    bgColor: "bg-[#9B59B6]/10",
  },
  {
    id: "paipan",
    name: "排盘",
    icon: <LayoutGrid className="w-6 h-6" />,
    link: "/paipan",
    color: "text-[#1890FF]",
    bgColor: "bg-[#1890FF]/10",
  },
  {
    id: "agents",
    name: "智能体",
    icon: <Bot className="w-6 h-6" />,
    link: "/agents",
    color: "text-[#722ED1]",
    bgColor: "bg-[#722ED1]/10",
    badge: "AI",
  },
  {
    id: "poetry",
    name: "诗词",
    icon: <BookHeart className="w-6 h-6" />,
    link: "/poetry",
    color: "text-[#EB2F96]",
    bgColor: "bg-[#EB2F96]/10",
  },
  {
    id: "more",
    name: "更多",
    icon: <MoreHorizontal className="w-6 h-6" />,
    link: "/discover",
    color: "text-[#666666]",
    bgColor: "bg-[#666666]/10",
  },
]

export function QuickEntryGrid() {
  return (
    <div className="mx-4 mb-4">
      <div className="grid grid-cols-5 gap-y-3">
        {quickEntries.map((entry) => (
          <Link
            key={entry.id}
            href={entry.link}
            className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
          >
            {/* 图标容器 */}
            <div className={cn(
              "relative w-12 h-12 rounded-xl flex items-center justify-center",
              entry.bgColor
            )}>
              <div className={entry.color}>{entry.icon}</div>
              {/* 角标 */}
              {entry.badge && (
                <span className={cn(
                  "absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold",
                  entry.badge === "AI" 
                    ? "bg-[#C41E3A] text-white" 
                    : "bg-[#C41E3A] text-white"
                )}>
                  {entry.badge}
                </span>
              )}
            </div>
            {/* 名称 */}
            <span className="text-[11px] text-[#333333] font-medium">{entry.name}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
