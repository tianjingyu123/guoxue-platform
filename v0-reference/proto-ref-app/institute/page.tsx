"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { 
  ChevronLeft,
  Search,
  Star,
  Users,
  BookOpen,
  Calendar,
  ChevronRight,
  BadgeCheck,
  MapPin,
  Clock,
  ArrowRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { 
  getInstituteInfo,
  getInstructors,
  getInstituteEvents,
  getInstructorLevelLabel,
  getInstructorLevelColor,
  getEventStatusLabel,
  getEventStatusColor,
  getEventTypeLabel,
} from "@/lib/api/institute"
import type { Instructor, InstituteEvent, InstituteInfo } from "@/lib/types/institute"

// 骨架屏
function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-muted rounded", className)} />
}

export default function InstitutePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [instituteInfo, setInstituteInfo] = useState<InstituteInfo | null>(null)
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [events, setEvents] = useState<InstituteEvent[]>([])
  const [searchKeyword, setSearchKeyword] = useState("")

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [infoRes, instructorsRes, eventsRes] = await Promise.all([
        getInstituteInfo(),
        getInstructors({ pageSize: 6 }),
        getInstituteEvents({ status: 'enrolling', pageSize: 3 }),
      ])
      
      if (infoRes.code === 200) setInstituteInfo(infoRes.data)
      if (instructorsRes.code === 200) setInstructors(instructorsRes.data.list)
      if (eventsRes.code === 200) setEvents(eventsRes.data.list)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    if (searchKeyword.trim()) {
      router.push(`/institute/instructors?keyword=${encodeURIComponent(searchKeyword)}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="h-5 w-24" />
          </div>
        </header>
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <div className="p-4 space-y-4">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-32 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold">研究院</h1>
        </div>
      </header>

      {/* Banner */}
      {instituteInfo && (
        <div className="relative h-48 bg-gradient-to-br from-primary/20 to-secondary/20">
          <Image
            src={instituteInfo.bannerUrl}
            alt={instituteInfo.name}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <h2 className="text-xl font-bold mb-1">{instituteInfo.name}</h2>
            <p className="text-sm opacity-90">{instituteInfo.slogan}</p>
          </div>
        </div>
      )}

      {/* 搜索栏 */}
      <div className="px-4 py-3 bg-background sticky top-[57px] z-10 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索讲师、课程..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9 pr-16"
          />
          <Button
            size="sm"
            onClick={handleSearch}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7"
          >
            搜索
          </Button>
        </div>
      </div>

      {/* 统计数据 */}
      {instituteInfo && (
        <div className="px-4 py-4">
          <div className="grid grid-cols-4 gap-2 p-4 bg-muted/30 rounded-xl">
            <div className="text-center">
              <div className="text-xl font-bold text-primary">{instituteInfo.stats.instructorCount}</div>
              <div className="text-xs text-muted-foreground">讲师</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-primary">{(instituteInfo.stats.studentCount / 10000).toFixed(1)}万</div>
              <div className="text-xs text-muted-foreground">学员</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-primary">{instituteInfo.stats.courseCount}</div>
              <div className="text-xs text-muted-foreground">课程</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-primary">{instituteInfo.stats.eventCount}</div>
              <div className="text-xs text-muted-foreground">活动</div>
            </div>
          </div>
        </div>
      )}

      {/* 研究院简介 */}
      {instituteInfo && (
        <div className="px-4 pb-4">
          <div className="p-4 bg-card rounded-xl border border-border">
            <h3 className="font-semibold mb-2">关于我们</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {instituteInfo.description}
            </p>
            <div className="mt-3 p-3 bg-primary/5 rounded-lg border-l-2 border-primary">
              <p className="text-sm text-primary font-medium">
                使命：{instituteInfo.mission}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 讲师列表 */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            金牌讲师
          </h3>
          <button 
            onClick={() => router.push('/institute/instructors')}
            className="text-sm text-primary flex items-center gap-1"
          >
            查看全部 <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {instructors.slice(0, 4).map(instructor => (
            <div
              key={instructor.id}
              onClick={() => router.push(`/institute/instructors/${instructor.id}`)}
              className="bg-card rounded-xl border border-border p-3 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="relative">
                  <Image
                    src={instructor.avatar}
                    alt={instructor.name}
                    width={44}
                    height={44}
                    className="rounded-full object-cover"
                  />
                  {instructor.verified && (
                    <BadgeCheck className="absolute -bottom-1 -right-1 w-4 h-4 text-primary bg-white rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{instructor.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{instructor.title}</div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-1 mb-2">
                {instructor.specialties.slice(0, 2).map(s => (
                  <span key={s} className="text-xs px-1.5 py-0.5 bg-muted rounded">
                    {s}
                  </span>
                ))}
              </div>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {instructor.studentCount}
                </span>
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-500" />
                  {instructor.rating}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 近期活动 */}
      {events.length > 0 && (
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              近期活动
            </h3>
            <button 
              onClick={() => router.push('/institute/events')}
              className="text-sm text-primary flex items-center gap-1"
            >
              更多活动 <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-3">
            {events.map(event => (
              <div
                key={event.id}
                onClick={() => router.push(`/institute/events/${event.id}`)}
                className="bg-card rounded-xl border border-border overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex">
                  <div className="relative w-28 h-24 flex-shrink-0">
                    <Image
                      src={event.cover}
                      alt={event.title}
                      fill
                      className="object-cover"
                    />
                    <div className={cn(
                      "absolute top-1 left-1 text-xs px-1.5 py-0.5 rounded",
                      getEventStatusColor(event.status)
                    )}>
                      {getEventStatusLabel(event.status)}
                    </div>
                  </div>
                  <div className="flex-1 p-3 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-sm line-clamp-1">{event.title}</h4>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {getEventTypeLabel(event.type)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {event.startTime.split(' ')[0]}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {event.isOnline ? '线上直播' : event.location}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-primary font-semibold text-sm">
                        {event.price === 0 ? '免费' : `¥${event.price}`}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {event.currentParticipants}人已报名
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 成为讲师入口 */}
      <div className="px-4 pb-6">
        <div 
          onClick={() => router.push('/institute/apply')}
          className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary to-primary/80 p-4 text-white cursor-pointer"
        >
          <div className="relative z-10">
            <h3 className="font-bold text-lg mb-1">成为讲师</h3>
            <p className="text-sm opacity-90 mb-3">
              加入热卜研究院，分享你的专业知识
            </p>
            <Button 
              size="sm" 
              variant="secondary"
              className="bg-white text-primary hover:bg-white/90"
            >
              立即申请 <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mb-10" />
          <div className="absolute right-8 top-0 w-20 h-20 bg-white/10 rounded-full -mt-10" />
        </div>
      </div>
    </div>
  )
}
