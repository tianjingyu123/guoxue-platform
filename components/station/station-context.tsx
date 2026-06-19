"use client"

import { createContext, useContext, ReactNode, useMemo } from "react"

// 分站配置类型
export type StationConfig = {
  id: string
  name: string                    // 分站名称，如"青云国学小站"
  logo?: string                   // 分站Logo，建议200x60px
  themeColor: string              // 主题色，如 "#C41E3A"
  heroImages: string[]            // 首页Hero图，1-3张
  masterName: string              // 站长名称
  masterAvatar?: string           // 站长头像
  masterIntro?: string            // 站长简介
  memberCount: number             // 成员数
  contentCount: number            // 内容数
  createdAt: string               // 创建时间
  expiresAt: string               // 到期时间
  // 站长精选（最多6个）
  featured: StationFeaturedItem[]
}

export type StationFeaturedItem = {
  id: string
  type: "article" | "course" | "circle"
  title: string
  cover?: string
  recommendation?: string         // 站长推荐语
  price?: number
  originalPrice?: number
}

// 默认分站配置（用于演示）
export const defaultStationConfig: StationConfig = {
  id: "station-demo",
  name: "青云国学小站",
  logo: "",
  themeColor: "#8B5CF6",          // 紫色主题
  heroImages: ["/images/station/hero-1.jpg"],
  masterName: "青云道长",
  masterAvatar: "/images/avatars/master-1.jpg",
  masterIntro: "从事国学研究20余年，专注八字命理与风水堪舆，愿以所学助有缘人趋吉避凶。",
  memberCount: 3680,
  contentCount: 156,
  createdAt: "2024-01-15",
  expiresAt: "2025-01-15",
  featured: [
    {
      id: "f1",
      type: "course",
      title: "八字入门实战课",
      cover: "/images/courses/course-1.jpg",
      recommendation: "这门课是我亲自筛选的，非常适合零基础的朋友入门学习",
      price: 199,
      originalPrice: 399,
    },
    {
      id: "f2",
      type: "circle",
      title: "八字命理研习社",
      cover: "/images/circles/circle-1.jpg",
      recommendation: "我自己也在这个圈子里，圈主讲解非常专业",
      price: 99,
    },
    {
      id: "f3",
      type: "article",
      title: "2024甲辰年运势全解析",
      cover: "/images/articles/article-1.jpg",
      recommendation: "今年必读的一篇文章，讲得很透彻",
    },
  ],
}

// Context
type StationContextType = {
  station: StationConfig | null
  isStationUser: boolean          // 是否为分站归属用户
  themeStyle: Record<string, string>  // CSS变量样式
}

const StationContext = createContext<StationContextType>({
  station: null,
  isStationUser: false,
  themeStyle: {},
})

export function useStation() {
  return useContext(StationContext)
}

// Provider
export function StationProvider({
  children,
  station,
}: {
  children: ReactNode
  station?: StationConfig | null
}) {
  const isStationUser = !!station
  
  // 根据分站主题色生成CSS变量
  const themeStyle = useMemo(() => {
    if (!station) return {}
    
    const color = station.themeColor
    return {
      "--station-primary": color,
      "--station-primary-foreground": "#ffffff",
      "--station-primary-light": `${color}20`,
    }
  }, [station])
  
  return (
    <StationContext.Provider value={{ station, isStationUser, themeStyle }}>
      {children}
    </StationContext.Provider>
  )
}

// 分站品牌栏组件
export function StationBrandBar() {
  const { station, isStationUser } = useStation()
  
  if (!isStationUser || !station) return null
  
  return (
    <div 
      className="h-11 flex items-center justify-between px-4"
      style={{ backgroundColor: station.themeColor }}
    >
      <div className="flex items-center gap-2">
        {station.logo ? (
          <img alt="图片" 
            src={station.logo} 
            alt={station.name} 
            className="h-6 object-contain"
          />
        ) : (
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {station.name.charAt(0)}
              </span>
            </div>
            <span className="text-white font-medium text-sm">{station.name}</span>
          </div>
        )}
        <span className="text-white/60 text-[10px] ml-1">热卜国学</span>
      </div>
      
      <a 
        href={`/station/${station.id}`}
        className="text-white/80 text-xs hover:text-white transition-colors"
      >
        我的分站 &gt;
      </a>
    </div>
  )
}
