"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import {
  StationProvider,
  StationBrandBar,
  defaultStationConfig,
  StationConfig,
} from "@/components/station/station-context"
import { StationFeaturedSection } from "@/components/station/station-featured"
import { BottomNav } from "@/components/bottom-nav"
import { FloatingAssistant } from "@/components/floating-assistant"
import { HomeFeed } from "@/components/home-feed"
import { QuickEntryGrid } from "@/components/home/quick-entry-grid"
import { Search, Bell, ChevronRight, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

// 根据分站 id 获取分站配置（实际应从接口拉取，这里返回演示配置并覆盖 id）
function useStationConfig(id: string): StationConfig | null {
  return { ...defaultStationConfig, id }
}

export default function StationHomePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const station = useStationConfig(id)

  return (
    <StationProvider station={station}>
      <div className="min-h-screen bg-background">
        <div className="max-w-lg mx-auto relative">
          {/* 分站品牌栏 + 搜索栏 */}
          <div className="fixed top-0 left-0 right-0 z-50 max-w-lg mx-auto">
            <StationBrandBar />
            <StationHeader />
          </div>

          {/* 主内容区 */}
          <main className="pt-[100px] pb-20">
            {station && <StationHeroBanner station={station} />}

            <QuickEntryGrid />

            <StationFeaturedSection />

            {/* AI推荐Feed流（平台内容） */}
            <div className="mt-4">
              <div className="px-4 mb-3">
                <h3 className="text-sm font-medium text-muted-foreground">为你推荐</h3>
              </div>
              <HomeFeed />
            </div>
          </main>

          <FloatingAssistant />
          <BottomNav />
        </div>
      </div>
    </StationProvider>
  )
}

// 分站版Header
function StationHeader() {
  return (
    <header className="h-11 flex items-center justify-between px-4 bg-background border-b border-border">
      <Link href="/search" className="flex-1">
        <div className="flex items-center gap-2 h-8 px-3 rounded-full bg-secondary">
          <Search className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">搜索课程、圈子、文章...</span>
        </div>
      </Link>

      <div className="flex items-center gap-2 ml-3">
        <Link href="/im/conversations" className="relative p-2">
          <Bell className="w-5 h-5 text-foreground" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive" />
        </Link>
      </div>
    </header>
  )
}

// 分站Hero Banner轮播
function StationHeroBanner({ station }: { station: StationConfig }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const images = station.heroImages.length > 0
    ? station.heroImages
    : ["/images/banners/default-banner.jpg"]

  useEffect(() => {
    if (images.length <= 1) return
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [images.length])

  return (
    <div className="relative mx-4 mt-3">
      <div className="relative aspect-[2/1] rounded-xl overflow-hidden">
        {images.map((img, index) => (
          <div
            key={index}
            className={cn(
              "absolute inset-0 transition-opacity duration-500",
              index === currentIndex ? "opacity-100" : "opacity-0"
            )}
          >
            {img ? (
              <img src={img || "/placeholder.svg"} alt="" className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full"
                style={{
                  background: `linear-gradient(135deg, ${station.themeColor} 0%, ${station.themeColor}80 100%)`,
                }}
              />
            )}
          </div>
        ))}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        <div className="absolute bottom-3 left-3 right-3">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-8 h-8 rounded-full border-2 border-white overflow-hidden"
              style={{ backgroundColor: station.themeColor }}
            >
              {station.masterAvatar ? (
                <img src={station.masterAvatar || "/placeholder.svg"} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                  {station.masterName.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <p className="text-white text-sm font-medium">{station.name}</p>
              <p className="text-white/70 text-[10px]">{station.memberCount} 成员 · {station.contentCount} 内容</p>
            </div>
          </div>
        </div>

        {images.length > 1 && (
          <div className="absolute bottom-3 right-3 flex gap-1">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all",
                  index === currentIndex ? "w-4 bg-white" : "bg-white/50"
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* 站长寄语（非自链接，避免跳转到当前页自身） */}
      <div
        className="mt-2 p-2.5 rounded-lg flex items-center justify-between"
        style={{ backgroundColor: `${station.themeColor}10` }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" style={{ color: station.themeColor }} />
          <span className="text-xs" style={{ color: station.themeColor }}>
            欢迎来到{station.masterName}的国学小站
          </span>
        </div>
        <Link href="/station/about" className="text-muted-foreground">
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
