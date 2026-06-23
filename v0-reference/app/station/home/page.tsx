'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { 
  ChevronLeft, 
  Share2, 
  BookOpen, 
  Users, 
  Video, 
  ShoppingBag, 
  Compass,
  Play,
  FileText,
  Radio,
  Eye,
  Heart,
  MessageCircle,
  ChevronRight,
  Loader2,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { DataState, LoadingSkeleton } from '@/components/data-state'
import { 
  getStationHomeData, 
  getStationFeed, 
  generateStationPoster,
  getFeedTypeLabel,
  formatNumber 
} from '@/lib/api/station-home'
import type { StationHomeData, StationFeedItem } from '@/lib/types/station-home'

// 图标映射
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  BookOpen,
  Users,
  Video,
  ShoppingBag,
  Compass,
}

// Feed类型图标
const feedIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  article: FileText,
  video: Play,
  course: BookOpen,
  live: Radio,
  product: ShoppingBag,
}

export default function StationHomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSkeleton /></div>}>
      <StationHomeContent />
    </Suspense>
  )
}

function StationHomeContent() {
  const searchParams = useSearchParams()
  const stationCode = searchParams.get('code') || 'guoxue001'
  
  const [data, setData] = useState<StationHomeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [feedList, setFeedList] = useState<StationFeedItem[]>([])
  const [feedPage, setFeedPage] = useState(1)
  const [hasMoreFeed, setHasMoreFeed] = useState(true)
  const [feedLoading, setFeedLoading] = useState(false)
  
  const [showPoster, setShowPoster] = useState(false)
  const [posterUrl, setPosterUrl] = useState('')
  const [posterLoading, setPosterLoading] = useState(false)
  
  const [currentBanner, setCurrentBanner] = useState(0)

  // 加载首页数据
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const res = await getStationHomeData(stationCode)
        if (res.code === 200 && res.data) {
          setData(res.data)
          setFeedList(res.data.feedList)
          setHasMoreFeed(res.data.hasMoreFeed)
        } else {
          setError(res.message || '加载失败')
        }
      } catch {
        setError('网络错误')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [stationCode])

  // Banner自动轮播
  useEffect(() => {
    if (!data?.banners.length) return
    const timer = setInterval(() => {
      setCurrentBanner(prev => (prev + 1) % data.banners.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [data?.banners.length])

  // 加载更多Feed
  const loadMoreFeed = useCallback(async () => {
    if (feedLoading || !hasMoreFeed) return
    setFeedLoading(true)
    try {
      const res = await getStationFeed(stationCode, feedPage + 1)
      if (res.code === 200 && res.data) {
        setFeedList(prev => [...prev, ...res.data.list])
        setHasMoreFeed(res.data.hasMore)
        setFeedPage(prev => prev + 1)
      }
    } finally {
      setFeedLoading(false)
    }
  }, [stationCode, feedPage, feedLoading, hasMoreFeed])

  // 生成海报
  const handleShare = async () => {
    setShowPoster(true)
    if (!posterUrl) {
      setPosterLoading(true)
      try {
        const res = await generateStationPoster(stationCode)
        if (res.code === 200 && res.data) {
          setPosterUrl(res.data.posterUrl)
        }
      } finally {
        setPosterLoading(false)
      }
    }
  }

  // 获取带分站参数的链接
  const getStationLink = (path: string) => {
    return `${path}?station=${stationCode}`
  }

  if (loading || error || !data) {
    return (
      <DataState
        loading={loading}
        error={error}
        empty={!data}
        skeleton={
          <div className="min-h-screen bg-background">
            {/* 骨架屏 */}
            <div className="h-12 bg-card animate-pulse" />
            <div className="h-44 bg-muted animate-pulse" />
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-5 gap-2">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
                    <div className="w-10 h-3 bg-muted animate-pulse rounded" />
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        }
      >
        {null}
      </DataState>
    )
  }

  const { brand, banners, features, recommends } = data

  return (
    <div 
      className="min-h-screen bg-background"
      style={{ '--station-primary': brand.theme.primaryColor } as React.CSSProperties}
    >
      {/* 自定义导航栏 */}
      <header 
        className="sticky top-0 z-50 flex items-center justify-between px-4 h-12"
        style={{ 
          backgroundColor: brand.theme.primaryColor,
          color: brand.theme.headerStyle === 'dark' ? 'white' : 'black'
        }}
      >
        <Link href="/" className="p-2 -ml-2">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <img src={brand.logo} alt={brand.name} className="w-6 h-6 rounded" />
          <span className="font-medium">{brand.name}</span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="p-2 -mr-2 text-inherit hover:bg-white/20"
          onClick={handleShare}
        >
          <Share2 className="w-5 h-5" />
        </Button>
      </header>

      {/* Banner轮播 */}
      <div className="relative h-44 overflow-hidden">
        <div 
          className="flex transition-transform duration-500"
          style={{ transform: `translateX(-${currentBanner * 100}%)` }}
        >
          {banners.map((banner) => (
            <Link 
              key={banner.id} 
              href={getStationLink(banner.link)}
              className="w-full flex-shrink-0"
            >
              <img 
                src={banner.image} 
                alt={banner.title || ''} 
                className="w-full h-44 object-cover"
              />
            </Link>
          ))}
        </div>
        {/* 指示器 */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {banners.map((_, idx) => (
            <span 
              key={idx}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                idx === currentBanner ? 'w-4 bg-white' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      </div>

      {/* 特色入口 */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-5 gap-2">
          {features.map((feature) => {
            const Icon = iconMap[feature.icon] || BookOpen
            return (
              <Link 
                key={feature.id}
                href={getStationLink(feature.link)}
                className="flex flex-col items-center gap-1.5"
              >
                <div 
                  className="relative w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${feature.color}15` }}
                >
                  <Icon className="w-6 h-6" style={{ color: feature.color }} />
                  {feature.badge && (
                    <span 
                      className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] text-white rounded-full"
                      style={{ backgroundColor: brand.theme.primaryColor }}
                    >
                      {feature.badge}
                    </span>
                  )}
                </div>
                <span className="text-xs text-foreground">{feature.name}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* 站长推荐 */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <img src={brand.master.avatar} alt="" className="w-6 h-6 rounded-full" />
            <span className="font-medium text-sm">站长推荐</span>
          </div>
          <Link 
            href={getStationLink('/courses')} 
            className="text-xs text-muted-foreground flex items-center"
          >
            更多 <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {recommends.map((item) => (
            <Link 
              key={item.id}
              href={getStationLink(`/${item.type}s/${item.id}`)}
              className="flex-shrink-0 w-36"
            >
              <div className="relative">
                <img 
                  src={item.cover} 
                  alt={item.title} 
                  className="w-full h-20 object-cover rounded-lg"
                />
                {item.tag && (
                  <span 
                    className="absolute top-1 left-1 px-1.5 py-0.5 text-[10px] text-white rounded"
                    style={{ backgroundColor: brand.theme.primaryColor }}
                  >
                    {item.tag}
                  </span>
                )}
              </div>
              <h4 className="mt-2 text-xs font-medium line-clamp-2">{item.title}</h4>
              <div className="mt-1 flex items-center gap-2">
                {item.price !== undefined && (
                  <span className="text-xs font-semibold" style={{ color: brand.theme.primaryColor }}>
                    {item.price > 0 ? `¥${item.price}` : '免费'}
                  </span>
                )}
                {item.originalPrice && item.originalPrice > (item.price || 0) && (
                  <span className="text-[10px] text-muted-foreground line-through">
                    ¥{item.originalPrice}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 内容Feed流 */}
      <div className="px-4 pb-20">
        <h3 className="font-medium mb-3">精选内容</h3>
        <div className="space-y-3">
          {feedList.map((item) => {
            const TypeIcon = feedIconMap[item.type] || FileText
            return (
              <Link 
                key={item.id}
                href={getStationLink(`/${item.type}s/${item.id}`)}
                className="flex gap-3 p-3 bg-card rounded-lg"
              >
                <div className="relative flex-shrink-0">
                  <img 
                    src={item.cover} 
                    alt={item.title}
                    className="w-28 h-20 object-cover rounded"
                  />
                  {item.isLive && (
                    <span className="absolute top-1 left-1 px-1.5 py-0.5 text-[10px] text-white bg-red-500 rounded flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      直播中
                    </span>
                  )}
                  {item.type === 'video' && !item.isLive && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Play className="w-8 h-8 text-white drop-shadow-lg" />
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-1">
                    <TypeIcon className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">{getFeedTypeLabel(item.type)}</span>
                  </div>
                  <h4 className="text-sm font-medium line-clamp-2">{item.title}</h4>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <img src={item.author.avatar} alt="" className="w-4 h-4 rounded-full" />
                      <span className="text-xs text-muted-foreground">{item.author.nickname}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <Eye className="w-3 h-3" />
                        {formatNumber(item.stats.views)}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Heart className="w-3 h-3" />
                        {formatNumber(item.stats.likes)}
                      </span>
                    </div>
                  </div>
                  {item.price !== undefined && item.price > 0 && (
                    <span 
                      className="mt-1 inline-block text-xs font-semibold"
                      style={{ color: brand.theme.primaryColor }}
                    >
                      ¥{item.price}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>

        {/* 加载更多 */}
        {hasMoreFeed && (
          <div className="mt-4 flex justify-center">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadMoreFeed}
              disabled={feedLoading}
            >
              {feedLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  加载中...
                </>
              ) : (
                '加载更多'
              )}
            </Button>
          </div>
        )}
        
        {!hasMoreFeed && feedList.length > 0 && (
          <p className="mt-4 text-center text-xs text-muted-foreground">已经到底啦</p>
        )}
      </div>

      {/* 分享海报弹层 */}
      <Sheet open={showPoster} onOpenChange={setShowPoster}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>分享推广</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col items-center justify-center h-full pb-8">
            {posterLoading ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">正在生成海报...</p>
              </div>
            ) : posterUrl ? (
              <>
                <img 
                  src={posterUrl} 
                  alt="推广海报" 
                  className="max-h-[50vh] rounded-lg shadow-lg"
                />
                <div className="mt-6 flex gap-4">
                  <Button variant="outline">保存图片</Button>
                  <Button style={{ backgroundColor: brand.theme.primaryColor }}>
                    分享给好友
                  </Button>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  长按图片保存或分享给好友
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">海报生成失败，请重试</p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
