"use client"

import { useState, useEffect, use } from "react"
import { BackButton } from "@/components/common/back-button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { 
  MapPin, 
  Phone, 
  Star, 
  Heart, 
  Navigation, 
  Clock,
  Share2,
  ChevronRight,
  Wifi,
  Car,
  Coffee,
  BookOpen,
  Users,
  MessageCircle,
  Calendar,
  User,
  Image as ImageIcon,
  ShoppingBag,
  GraduationCap,
  CheckCircle
} from "lucide-react"
import { 
  getStationDetail, 
  getStationTypeLabel, 
  formatDistance,
  getNavigationUrl,
  toggleStationFavorite,
  getFacilityInfo
} from "@/lib/api/offline"
import type { StationDetail, StationFacility } from "@/lib/types/offline"
import { toast } from "sonner"

// Tab 类型
type TabType = 'intro' | 'courses' | 'products' | 'instructors'

const tabs: { value: TabType; label: string; icon: React.ReactNode }[] = [
  { value: 'intro', label: '介绍', icon: <ImageIcon className="w-4 h-4" /> },
  { value: 'courses', label: '课程', icon: <GraduationCap className="w-4 h-4" /> },
  { value: 'products', label: '商品', icon: <ShoppingBag className="w-4 h-4" /> },
  { value: 'instructors', label: '讲师', icon: <User className="w-4 h-4" /> },
]

// 设施图标
const facilityIconMap: Record<StationFacility, React.ReactNode> = {
  wifi: <Wifi className="w-5 h-5" />,
  parking: <Car className="w-5 h-5" />,
  tea: <Coffee className="w-5 h-5" />,
  library: <BookOpen className="w-5 h-5" />,
  meditation: <Heart className="w-5 h-5" />,
  classroom: <Users className="w-5 h-5" />,
  consultation: <MessageCircle className="w-5 h-5" />,
}

export default function StationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const stationId = parseInt(id)

  const [station, setStation] = useState<StationDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('intro')
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  useEffect(() => {
    loadStationDetail()
  }, [stationId])

  const loadStationDetail = async () => {
    setIsLoading(true)
    try {
      const response = await getStationDetail(stationId)
      if (response.code === 200) {
        setStation(response.data)
      }
    } catch {
      toast.error('加载失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleFavorite = async () => {
    if (!station) return
    try {
      const response = await toggleStationFavorite(station.id)
      if (response.code === 200) {
        setStation({ ...station, isFavorited: response.data.isFavorited })
        toast.success(response.data.isFavorited ? '已收藏' : '已取消收藏')
      }
    } catch {
      toast.error('操作失败')
    }
  }

  const handleCall = () => {
    if (station?.phone) {
      window.location.href = `tel:${station.phone}`
    }
  }

  const handleNavigate = () => {
    if (station) {
      window.open(getNavigationUrl(station), '_blank')
    }
  }

  const handleShare = async () => {
    if (navigator.share && station) {
      try {
        await navigator.share({
          title: station.name,
          text: station.description,
          url: window.location.href,
        })
      } catch {
        // 用户取消分享
      }
    } else {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('链接已复制')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b">
          <div className="flex items-center px-4 h-14">
            <BackButton fallbackPath="/offline/stations" />
          </div>
        </header>
        <div className="p-4 space-y-4">
          <Skeleton className="w-full h-48 rounded-lg" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    )
  }

  if (!station) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">驿站不存在</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton fallbackPath="/offline/stations" />
          <h1 className="text-lg font-semibold line-clamp-1 flex-1 text-center mx-4">
            {station.name}
          </h1>
          <div className="flex items-center gap-2">
            <button onClick={handleShare} className="p-2">
              <Share2 className="w-5 h-5" />
            </button>
            <button onClick={handleToggleFavorite} className="p-2">
              <Heart className={cn(
                "w-5 h-5",
                station.isFavorited ? "fill-red-500 text-red-500" : ""
              )} />
            </button>
          </div>
        </div>
      </header>

      {/* 封面图轮播 */}
      <div className="relative">
        <div className="aspect-[2/1] overflow-hidden">
          <img
            src={station.images[currentImageIndex] || station.cover}
            alt={station.name}
            className="w-full h-full object-cover"
          />
        </div>
        {station.images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {station.images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentImageIndex(idx)}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  idx === currentImageIndex ? "bg-white" : "bg-white/50"
                )}
              />
            ))}
          </div>
        )}
        <Badge className="absolute top-3 left-3 bg-primary">
          {getStationTypeLabel(station.type)}
        </Badge>
      </div>

      {/* 基本信息 */}
      <div className="p-4 bg-background">
        <h1 className="text-xl font-bold">{station.name}</h1>
        
        <div className="flex items-center gap-2 mt-2">
          <div className="flex items-center gap-1 text-amber-500">
            <Star className="w-4 h-4 fill-current" />
            <span className="font-medium">{station.rating}</span>
          </div>
          <span className="text-sm text-muted-foreground">
            ({station.reviewCount}条评价)
          </span>
          {station.distance && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-sm text-primary">{formatDistance(station.distance)}</span>
            </>
          )}
        </div>

        {/* 地址 */}
        <div className="flex items-start gap-2 mt-3 text-sm">
          <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <span className="text-muted-foreground">{station.address}</span>
        </div>

        {/* 电话 */}
        <button
          onClick={handleCall}
          className="flex items-center gap-2 mt-2 text-sm text-primary"
        >
          <Phone className="w-4 h-4" />
          <span>{station.phone}</span>
        </button>

        {/* 营业时间 */}
        <div className="flex items-start gap-2 mt-2 text-sm">
          <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div>
            {station.businessHours.map((bh, idx) => (
              <div key={idx} className={cn(!bh.isOpen && "text-muted-foreground")}>
                {bh.day}: {bh.isOpen ? `${bh.open}-${bh.close}` : '休息'}
              </div>
            ))}
          </div>
        </div>

        {/* 标签 */}
        <div className="flex flex-wrap gap-2 mt-3">
          {station.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="sticky top-14 z-40 bg-background border-b">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1 border-b-2 transition-colors",
                activeTab === tab.value
                  ? "text-primary border-primary"
                  : "text-muted-foreground border-transparent"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 内容 */}
      <div className="p-4">
        {activeTab === 'intro' && (
          <div className="space-y-6">
            {/* 驿站主理人 */}
            {station.manager && (
              <Card className="p-4">
                <h3 className="font-medium mb-3">驿站主理人</h3>
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={station.manager.avatar} />
                    <AvatarFallback>{station.manager.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{station.manager.name}</p>
                    <p className="text-sm text-muted-foreground">{station.manager.title}</p>
                  </div>
                </div>
              </Card>
            )}

            {/* 设施服务 */}
            <Card className="p-4">
              <h3 className="font-medium mb-3">设施服务</h3>
              <div className="grid grid-cols-4 gap-4">
                {station.facilities.map((f) => {
                  const info = getFacilityInfo(f)
                  return (
                    <div key={f} className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        {facilityIconMap[f]}
                      </div>
                      <span className="text-xs text-muted-foreground">{info.label}</span>
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* 驿站介绍 */}
            <Card className="p-4">
              <h3 className="font-medium mb-3">驿站介绍</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {station.description}
              </p>
            </Card>

            {/* 近期活动 */}
            {station.upcomingEvents.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">近期活动</h3>
                  <Link href="/offline/events" className="text-sm text-primary flex items-center">
                    更多 <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="space-y-3">
                  {station.upcomingEvents.map((event) => (
                    <div key={event.id} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{event.title}</p>
                        <p className="text-xs text-muted-foreground">{event.date}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {event.type === 'course' ? '课程' : '活动'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* 用户评价 */}
            {station.reviews.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">用户评价</h3>
                  <Link href={`/offline/stations/${station.id}/reviews`} className="text-sm text-primary flex items-center">
                    全部 <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="space-y-4">
                  {station.reviews.map((review) => (
                    <div key={review.id} className="pb-4 border-b last:border-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={review.user.avatar} />
                          <AvatarFallback>{review.user.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{review.user.name}</p>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Star
                                key={i}
                                className={cn(
                                  "w-3 h-3",
                                  i <= review.rating ? "text-amber-500 fill-amber-500" : "text-gray-300"
                                )}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">{review.time}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">{review.content}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'courses' && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4">
                <div className="flex gap-3">
                  <div className="w-20 h-20 rounded-lg bg-muted flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">八字命理实战研修班（第{i}期）</h4>
                    <p className="text-xs text-muted-foreground mt-1">张明德老师 · 2026年6月{10 + i}日</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-primary font-medium">¥1980</span>
                      <Badge variant="outline" className="text-xs">报名中</Badge>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'products' && (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="overflow-hidden">
                <div className="aspect-square bg-muted" />
                <div className="p-3">
                  <h4 className="text-sm font-medium line-clamp-2">驿站特色商品{i}</h4>
                  <p className="text-primary font-medium mt-1">¥{99 * i}</p>
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'instructors' && (
          <div className="space-y-4">
            {station.instructors.map((instructor) => (
              <Card key={instructor.id} className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="w-14 h-14">
                    <AvatarImage src={instructor.avatar} />
                    <AvatarFallback>{instructor.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h4 className="font-medium">{instructor.name}</h4>
                    <p className="text-sm text-muted-foreground">{instructor.specialty}</p>
                  </div>
                  <Link
                    href={`/instructor/${instructor.id}/appointment`}
                    className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm"
                  >
                    预约
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 底部固定操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex gap-3">
        <button
          onClick={handleCall}
          className="flex-1 py-3 rounded-lg bg-muted flex items-center justify-center gap-2 text-sm font-medium"
        >
          <Phone className="w-4 h-4" />
          联系客服
        </button>
        <button
          onClick={handleNavigate}
          className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground flex items-center justify-center gap-2 text-sm font-medium"
        >
          <Navigation className="w-4 h-4" />
          导航到驿站
        </button>
      </div>
    </div>
  )
}
