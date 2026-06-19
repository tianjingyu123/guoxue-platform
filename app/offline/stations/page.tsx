"use client"

import { useState, useEffect } from "react"
import { BackButton } from "@/components/common/back-button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { 
  MapPin, 
  Phone, 
  Star, 
  Heart, 
  Navigation, 
  List, 
  Map as MapIcon,
  Search,
  Filter,
  Wifi,
  Car,
  Coffee,
  BookOpen,
  Users,
  MessageCircle,
  ChevronRight,
  Loader2
} from "lucide-react"
import { 
  getStationList, 
  getNearbyStations,
  getStationTypeLabel, 
  formatDistance,
  getNavigationUrl,
  toggleStationFavorite
} from "@/lib/api/offline"
import type { Station, StationType } from "@/lib/types/offline"
import { toast } from "sonner"

// 驿站类型筛选
const stationTypes: { value: StationType | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'center', label: '国学中心' },
  { value: 'academy', label: '书院' },
  { value: 'studio', label: '工作室' },
  { value: 'partner', label: '合作点' },
]

// 设施图标映射
const facilityIcons: Record<string, React.ReactNode> = {
  wifi: <Wifi className="w-4 h-4" />,
  parking: <Car className="w-4 h-4" />,
  tea: <Coffee className="w-4 h-4" />,
  library: <BookOpen className="w-4 h-4" />,
  classroom: <Users className="w-4 h-4" />,
  consultation: <MessageCircle className="w-4 h-4" />,
}

export default function StationsPage() {
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  const [selectedType, setSelectedType] = useState<StationType | 'all'>('all')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [stations, setStations] = useState<Station[]>([])
  const [nearbyStations, setNearbyStations] = useState<Station[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

  // 获取用户位置
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        () => {
          // 定位失败，使用默认位置（北京）
          setUserLocation({ lat: 39.9042, lng: 116.4074 })
        }
      )
    } else {
      setUserLocation({ lat: 39.9042, lng: 116.4074 })
    }
  }, [])

  // 加载驿站列表
  useEffect(() => {
    loadStations()
  }, [selectedType, searchKeyword])

  // 加载附近驿站
  useEffect(() => {
    if (userLocation) {
      loadNearbyStations()
    }
  }, [userLocation])

  const loadStations = async () => {
    setIsLoading(true)
    try {
      const response = await getStationList({
        type: selectedType === 'all' ? undefined : selectedType,
        keyword: searchKeyword || undefined,
      })
      if (response.code === 200) {
        setStations(response.data.list)
      }
    } catch {
      toast.error('加载失败')
    } finally {
      setIsLoading(false)
    }
  }

  const loadNearbyStations = async () => {
    if (!userLocation) return
    try {
      const response = await getNearbyStations(userLocation.lat, userLocation.lng, 3)
      if (response.code === 200) {
        setNearbyStations(response.data)
      }
    } catch {
      // 忽略错误
    }
  }

  const handleToggleFavorite = async (id: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      const response = await toggleStationFavorite(id)
      if (response.code === 200) {
        setStations(prev => prev.map(s => 
          s.id === id ? { ...s, isFavorited: response.data.isFavorited } : s
        ))
        toast.success(response.data.isFavorited ? '已收藏' : '已取消收藏')
      }
    } catch {
      toast.error('操作失败')
    }
  }

  const handleNavigate = (station: Station, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    window.open(getNavigationUrl(station), '_blank')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton fallbackPath="/discover" />
          <h1 className="text-lg font-semibold">线下驿站</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
              className="p-2 rounded-full hover:bg-muted"
            >
              {viewMode === 'list' ? <MapIcon className="w-5 h-5" /> : <List className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* 搜索栏 */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索驿站名称或地址"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-full bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* 类型筛选 */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {stationTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => setSelectedType(type.value)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors",
                selectedType === type.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {type.label}
            </button>
          ))}
        </div>
      </header>

      {/* 内容区 */}
      <main className="p-4 space-y-6">
        {/* 附近推荐 */}
        {nearbyStations.length > 0 && !searchKeyword && selectedType === 'all' && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                附近驿站
              </h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {nearbyStations.map((station) => (
                <Link
                  key={station.id}
                  href={`/offline/stations/${station.id}`}
                  className="flex-shrink-0 w-64"
                >
                  <Card className="overflow-hidden">
                    <div className="relative h-32">
                      <img
                        src={station.cover}
                        alt={station.name}
                        className="w-full h-full object-cover"
                      />
                      <Badge className="absolute top-2 left-2 bg-primary/90">
                        {formatDistance(station.distance)}
                      </Badge>
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium text-sm line-clamp-1">{station.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {station.address}
                      </p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 驿站列表 */}
        <section>
          <h2 className="font-semibold mb-3">
            {searchKeyword ? '搜索结果' : '全部驿站'}
            {!isLoading && <span className="text-muted-foreground font-normal text-sm ml-2">({stations.length})</span>}
          </h2>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-4">
                  <div className="flex gap-4">
                    <Skeleton className="w-24 h-24 rounded-lg flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : stations.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="w-12 h-12 mx-auto text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">暂无驿站</p>
            </div>
          ) : (
            <div className="space-y-4">
              {stations.map((station) => (
                <Link key={station.id} href={`/offline/stations/${station.id}`}>
                  <Card className="overflow-hidden hover:shadow-md transition-shadow">
                    <div className="flex">
                      {/* 封面图 */}
                      <div className="relative w-28 h-28 flex-shrink-0">
                        <img
                          src={station.cover}
                          alt={station.name}
                          className="w-full h-full object-cover"
                        />
                        {station.status !== 'open' && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white text-xs">
                              {station.status === 'closed' ? '暂停营业' : '装修中'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* 信息 */}
                      <div className="flex-1 p-3 flex flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-sm line-clamp-1">{station.name}</h3>
                              <Badge variant="outline" className="text-xs flex-shrink-0">
                                {getStationTypeLabel(station.type)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 mt-1 text-xs text-amber-500">
                              <Star className="w-3 h-3 fill-current" />
                              <span>{station.rating}</span>
                              <span className="text-muted-foreground">({station.reviewCount}评价)</span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => handleToggleFavorite(station.id, e)}
                            className="p-1"
                          >
                            <Heart
                              className={cn(
                                "w-5 h-5",
                                station.isFavorited ? "fill-red-500 text-red-500" : "text-muted-foreground"
                              )}
                            />
                          </button>
                        </div>

                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          {station.address}
                        </p>

                        {/* 设施标签 */}
                        <div className="flex items-center gap-2 mt-2">
                          {station.facilities.slice(0, 4).map((f) => (
                            <span key={f} className="text-muted-foreground" title={f}>
                              {facilityIcons[f]}
                            </span>
                          ))}
                          {station.facilities.length > 4 && (
                            <span className="text-xs text-muted-foreground">
                              +{station.facilities.length - 4}
                            </span>
                          )}
                        </div>

                        {/* 底部操作 */}
                        <div className="flex items-center justify-between mt-auto pt-2">
                          {station.distance && (
                            <span className="text-xs text-primary">
                              {formatDistance(station.distance)}
                            </span>
                          )}
                          <button
                            onClick={(e) => handleNavigate(station, e)}
                            className="flex items-center gap-1 text-xs text-primary"
                          >
                            <Navigation className="w-3 h-3" />
                            导航
                          </button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
