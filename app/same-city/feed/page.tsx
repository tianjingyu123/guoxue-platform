"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  MapPin, 
  ChevronDown,
  Navigation,
  Search,
  RefreshCw,
  X,
  Calendar,
  Users,
  Eye,
  Heart,
  MessageCircle,
  Play,
  BookOpen,
  Building2,
  Compass,
  FileText,
  Video
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { 
  getSameCityFeed,
  getHotCities,
  getCityList,
  searchCity,
  getContentTypeLabel,
  getContentTypeColor,
  formatDistance,
  getNavigationUrl,
} from "@/lib/api/same-city"
import type { SameCityItem, SameCityContentType, City, HotCity } from "@/lib/types/same-city"

// 骨架屏
function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-muted rounded", className)} />
}

// 加载骨架屏
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="h-5 w-24" />
        </div>
      </header>
      <div className="p-4 space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="w-16 h-8 rounded-full flex-shrink-0" />
          ))}
        </div>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-48 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

// 内容类型图标
function ContentTypeIcon({ type, className }: { type: SameCityContentType; className?: string }) {
  const icons: Record<SameCityContentType, React.ReactNode> = {
    activity: <Calendar className={className} />,
    course: <BookOpen className={className} />,
    circle: <Users className={className} />,
    station: <Building2 className={className} />,
    article: <FileText className={className} />,
    video: <Video className={className} />,
  }
  return icons[type] || <Compass className={className} />
}

// 内容卡片
function FeedCard({ item, onNavigate }: { item: SameCityItem; onNavigate: (item: SameCityItem) => void }) {
  const router = useRouter()
  
  const handleClick = () => {
    // 根据类型跳转不同详情页
    const routes: Record<SameCityContentType, string> = {
      activity: `/activities/${item.id}`,
      course: `/offline/courses/${item.id}`,
      circle: `/circles/${item.id}`,
      station: `/offline/stations/${item.id}`,
      article: `/articles/${item.id}`,
      video: `/videos/${item.id}`,
    }
    router.push(routes[item.type] || `/same-city/detail/${item.id}`)
  }
  
  const handleNavigateClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onNavigate(item)
  }
  
  return (
    <div 
      className="bg-card rounded-lg overflow-hidden border border-border cursor-pointer active:scale-[0.98] transition-transform"
      onClick={handleClick}
    >
      {/* 封面 */}
      <div className="relative aspect-[16/9]">
        <img 
          src={item.cover} 
          alt={item.title}
          className="w-full h-full object-cover"
        />
        {/* 类型标签 */}
        <div className={cn(
          "absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-medium",
          getContentTypeColor(item.type)
        )}>
          {getContentTypeLabel(item.type)}
        </div>
        {/* 距离标签 */}
        {item.location.distance !== undefined && (
          <button
            onClick={handleNavigateClick}
            className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/60 text-white text-xs flex items-center gap-1"
          >
            <Navigation className="w-3 h-3" />
            {formatDistance(item.location.distance)}
          </button>
        )}
        {/* 视频播放按钮 */}
        {item.type === 'video' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
              <Play className="w-6 h-6 text-white fill-white" />
            </div>
          </div>
        )}
        {/* 价格/免费标签 */}
        {(item.price !== undefined || item.isFree) && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-primary text-primary-foreground text-xs font-medium">
            {item.isFree ? '免费' : `¥${item.price}`}
          </div>
        )}
      </div>
      
      {/* 内容 */}
      <div className="p-3">
        <h3 className="font-medium text-foreground line-clamp-2 mb-1">{item.title}</h3>
        
        {item.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{item.description}</p>
        )}
        
        {/* 时间信息 */}
        {item.startTime && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
            <Calendar className="w-3 h-3" />
            <span>{item.startTime.split(' ')[0]}</span>
            {item.status && (
              <span className="ml-1 text-primary">· {item.status}</span>
            )}
          </div>
        )}
        
        {/* 位置 */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{item.location.name}</span>
        </div>
        
        {/* 统计和作者 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {item.participantCount !== undefined && (
              <span className="flex items-center gap-0.5">
                <Users className="w-3 h-3" />
                {item.participantCount}人
              </span>
            )}
            {item.viewCount !== undefined && (
              <span className="flex items-center gap-0.5">
                <Eye className="w-3 h-3" />
                {item.viewCount}
              </span>
            )}
            {item.likeCount !== undefined && (
              <span className="flex items-center gap-0.5">
                <Heart className="w-3 h-3" />
                {item.likeCount}
              </span>
            )}
            {item.commentCount !== undefined && (
              <span className="flex items-center gap-0.5">
                <MessageCircle className="w-3 h-3" />
                {item.commentCount}
              </span>
            )}
          </div>
          
          {item.author && (
            <div className="flex items-center gap-1">
              <img 
                src={item.author.avatar} 
                alt={item.author.name}
                className="w-4 h-4 rounded-full"
              />
              <span className="text-xs text-muted-foreground">{item.author.name}</span>
            </div>
          )}
        </div>
        
        {/* 标签 */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {item.tags.slice(0, 3).map((tag, index) => (
              <span 
                key={index}
                className="px-1.5 py-0.5 text-xs bg-muted text-muted-foreground rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// 城市选择器
function CitySelector({ 
  currentCity, 
  onSelect, 
  onClose 
}: { 
  currentCity: string
  onSelect: (city: City) => void
  onClose: () => void 
}) {
  const [keyword, setKeyword] = useState('')
  const [hotCities, setHotCities] = useState<HotCity[]>([])
  const [allCities, setAllCities] = useState<City[]>([])
  const [searchResults, setSearchResults] = useState<City[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    Promise.all([getHotCities(), getCityList()]).then(([hotRes, allRes]) => {
      if (hotRes.code === 200) setHotCities(hotRes.data)
      if (allRes.code === 200) setAllCities(allRes.data)
      setLoading(false)
    })
  }, [])
  
  useEffect(() => {
    if (keyword) {
      searchCity(keyword).then(res => {
        if (res.code === 200) setSearchResults(res.data)
      })
    } else {
      setSearchResults([])
    }
  }, [keyword])
  
  const displayCities = keyword ? searchResults : allCities
  
  // 按首字母分组
  const groupedCities = displayCities.reduce((acc, city) => {
    const letter = city.firstLetter.toUpperCase()
    if (!acc[letter]) acc[letter] = []
    acc[letter].push(city)
    return acc
  }, {} as Record<string, City[]>)
  
  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* 头部 */}
      <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1">
            <X className="w-5 h-5" />
          </button>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索城市"
              className="pl-9"
            />
          </div>
        </div>
      </header>
      
      <div className="p-4 pb-20 overflow-y-auto h-[calc(100vh-60px)]">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-40 rounded-lg" />
          </div>
        ) : (
          <>
            {/* 当前定位 */}
            <div className="mb-4">
              <h3 className="text-sm text-muted-foreground mb-2">当前定位</h3>
              <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">{currentCity || '定位中...'}</span>
              </div>
            </div>
            
            {/* 热门城市 */}
            {!keyword && hotCities.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm text-muted-foreground mb-2">热门城市</h3>
                <div className="grid grid-cols-4 gap-2">
                  {hotCities.map(city => (
                    <button
                      key={city.code}
                      onClick={() => onSelect({ code: city.code, name: city.name, pinyin: '', firstLetter: '' })}
                      className={cn(
                        "p-2 text-sm rounded-lg border border-border text-center",
                        currentCity === city.name && "border-primary bg-primary/5 text-primary"
                      )}
                    >
                      {city.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* 城市列表 */}
            <div>
              <h3 className="text-sm text-muted-foreground mb-2">
                {keyword ? '搜索结果' : '全部城市'}
              </h3>
              {Object.keys(groupedCities).sort().map(letter => (
                <div key={letter} className="mb-3">
                  <div className="text-xs text-muted-foreground mb-1">{letter}</div>
                  <div className="grid grid-cols-4 gap-2">
                    {groupedCities[letter].map(city => (
                      <button
                        key={city.code}
                        onClick={() => onSelect(city)}
                        className={cn(
                          "p-2 text-sm rounded-lg border border-border text-center",
                          currentCity === city.name && "border-primary bg-primary/5 text-primary"
                        )}
                      >
                        {city.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {keyword && searchResults.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  未找到相关城市
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// 筛选Tab
const filterTabs: { key: SameCityContentType | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'activity', label: '活动' },
  { key: 'course', label: '课程' },
  { key: 'circle', label: '圈子' },
  { key: 'station', label: '驿站' },
]

function SameCityFeedContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // 状态
  const [currentCity, setCurrentCity] = useState('北京')
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState(false)
  const [showCitySelector, setShowCitySelector] = useState(false)
  
  const [activeTab, setActiveTab] = useState<SameCityContentType | 'all'>('all')
  const [items, setItems] = useState<SameCityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // 获取定位
  const requestLocation = () => {
    setLocating(true)
    setLocationError(false)
    
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
          setLocating(false)
          // 这里应该根据经纬度反查城市，Mock 直接用北京
          setCurrentCity('北京')
        },
        () => {
          setLocating(false)
          setLocationError(true)
        },
        { timeout: 10000 }
      )
    } else {
      setLocating(false)
      setLocationError(true)
    }
  }
  
  // 初始化
  useEffect(() => {
    requestLocation()
  }, [])
  
  // 加载数据
  const loadData = async (refresh = false) => {
    if (refresh) setRefreshing(true)
    else setLoading(true)
    
    try {
      const res = await getSameCityFeed({
        latitude: location?.latitude,
        longitude: location?.longitude,
        city: currentCity,
        type: activeTab,
      })
      if (res.code === 200) {
        setItems(res.data.list)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }
  
  useEffect(() => {
    loadData()
  }, [currentCity, activeTab, location])
  
  // 导航
  const handleNavigate = (item: SameCityItem) => {
    const url = getNavigationUrl(item.location)
    window.open(url, '_blank')
  }
  
  // 城市选择
  const handleCitySelect = (city: City) => {
    setCurrentCity(city.name)
    setShowCitySelector(false)
  }
  
  return (
    <div className="min-h-screen bg-background">
      {/* 头部 */}
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-1">
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          {/* 城市选择 */}
          <button 
            onClick={() => setShowCitySelector(true)}
            className="flex items-center gap-1 text-foreground"
          >
            <MapPin className="w-4 h-4 text-primary" />
            <span className="font-medium">{locating ? '定位中...' : currentCity}</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>
          
          <div className="flex-1" />
          
          {/* 刷新按钮 */}
          <button 
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="p-2"
          >
            <RefreshCw className={cn("w-5 h-5", refreshing && "animate-spin")} />
          </button>
        </div>
        
        {/* 定位失败提示 */}
        {locationError && (
          <div className="px-4 py-2 bg-amber-50 text-amber-800 text-sm flex items-center justify-between">
            <span>定位失败，请手动选择城市</span>
            <button 
              onClick={requestLocation}
              className="text-primary text-xs"
            >
              重试
            </button>
          </div>
        )}
        
        {/* 筛选Tab */}
        <div className="flex gap-2 px-4 py-2 overflow-x-auto">
          {filterTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors",
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>
      
      {/* 内容列表 */}
      <div className="p-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Compass className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">暂无附近内容</p>
            <p className="text-xs mt-1">换个城市或类型试试</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map(item => (
              <FeedCard 
                key={item.id} 
                item={item} 
                onNavigate={handleNavigate}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* 城市选择器 */}
      {showCitySelector && (
        <CitySelector
          currentCity={currentCity}
          onSelect={handleCitySelect}
          onClose={() => setShowCitySelector(false)}
        />
      )}
    </div>
  )
}

export default function SameCityFeedPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <SameCityFeedContent />
    </Suspense>
  )
}
