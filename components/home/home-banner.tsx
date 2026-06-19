"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface BannerItem {
  id: string
  image: string
  title: string
  link: string
}

interface HomeBannerProps {
  banners: BannerItem[]
  autoPlay?: boolean
  interval?: number
}

export function HomeBanner({ banners, autoPlay = true, interval = 4000 }: HomeBannerProps) {
  const [current, setCurrent] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const touchStartX = useRef(0)

  const goTo = useCallback((index: number) => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setCurrent(index)
    setTimeout(() => setIsTransitioning(false), 300)
  }, [isTransitioning])

  const next = useCallback(() => {
    goTo((current + 1) % banners.length)
  }, [current, banners.length, goTo])

  const prev = useCallback(() => {
    goTo((current - 1 + banners.length) % banners.length)
  }, [current, banners.length, goTo])

  // 自动播放
  useEffect(() => {
    if (autoPlay && banners.length > 1) {
      timerRef.current = setInterval(next, interval)
      return () => {
        if (timerRef.current) clearInterval(timerRef.current)
      }
    }
  }, [autoPlay, interval, next, banners.length])

  // 触摸滑动
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    if (timerRef.current) clearInterval(timerRef.current)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      diff > 0 ? next() : prev()
    }
    // 恢复自动播放
    if (autoPlay && banners.length > 1) {
      timerRef.current = setInterval(next, interval)
    }
  }

  if (!banners.length) return null

  return (
    <div className="relative mx-4 mt-2 mb-3 rounded-xl overflow-hidden">
      {/* 轮播容器 */}
      <div
        className="relative h-36 overflow-hidden rounded-xl"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {banners.map((banner, index) => (
          <Link
            key={banner.id}
            href={banner.link}
            className={cn(
              "absolute inset-0 transition-all duration-300 ease-out",
              index === current ? "opacity-100 translate-x-0" : 
              index < current ? "opacity-0 -translate-x-full" : "opacity-0 translate-x-full"
            )}
          >
            <img
              src={banner.image}
              alt={banner.title}
              className="w-full h-full object-cover"
            />
            {/* 渐变遮罩 + 标题 */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            <div className="absolute bottom-3 left-4 right-12">
              <h3 className="text-white text-sm font-medium line-clamp-1 drop-shadow">
                {banner.title}
              </h3>
            </div>
          </Link>
        ))}
      </div>

      {/* 指示器 */}
      {banners.length > 1 && (
        <div className="absolute bottom-2 right-3 flex items-center gap-1" role="tablist" aria-label="轮播切换">
          {banners.map((banner, index) => (
            <button
              key={index}
              onClick={() => goTo(index)}
              role="tab"
              aria-selected={index === current}
              aria-label={`第 ${index + 1} 张：${banner.title}`}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                index === current ? "w-4 bg-white" : "w-1.5 bg-white/50"
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// 默认Banner数据（API未返回时使用）
export const defaultBanners: BannerItem[] = [
  {
    id: "1",
    image: "/images/banners/banner-1.png",
    title: "八字命理入门精讲 限时优惠",
    link: "/courses-list",
  },
  {
    id: "2",
    image: "/images/banners/banner-2.png",
    title: "大师直播：2024下半年运势解读",
    link: "/live",
  },
  {
    id: "3",
    image: "/images/banners/banner-3.png",
    title: "新人专享 首单立减50元",
    link: "/mall",
  },
]
