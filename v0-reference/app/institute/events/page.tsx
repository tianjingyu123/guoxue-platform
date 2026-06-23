"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  Search,
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  CalendarDays,
  List,
  ChevronRight,
  ChevronDown
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { 
  getInstituteEvents,
  enrollEvent,
  cancelEventEnrollment,
  getEventTypeLabel,
  getEventTypeColor,
  getEventStatusLabel,
  getEventStatusColor,
} from "@/lib/api/institute"
import type { InstituteEvent, InstituteEventType, InstituteEventStatus } from "@/lib/types/institute"

// 骨架屏
function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-muted rounded", className)} />
}

// 加载骨架屏
function LoadingSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-card rounded-lg overflow-hidden border border-border">
          <Skeleton className="h-40 w-full rounded-none" />
          <div className="p-4 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

// 活动类型筛选
const eventTypes: { value: InstituteEventType | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'lecture', label: '学术讲座' },
  { value: 'seminar', label: '研讨会' },
  { value: 'workshop', label: '工作坊' },
  { value: 'conference', label: '学术会议' },
  { value: 'online', label: '线上活动' },
]

export default function InstituteEventsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<InstituteEvent[]>([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedType, setSelectedType] = useState<InstituteEventType | 'all'>('all')
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [enrollingId, setEnrollingId] = useState<number | null>(null)

  // 加载活动
  useEffect(() => {
    loadEvents()
  }, [selectedType])

  const loadEvents = async () => {
    setLoading(true)
    try {
      const res = await getInstituteEvents({
        type: selectedType === 'all' ? undefined : selectedType,
      })
      if (res.code === 200 && res.data) {
        setEvents(res.data.list)
      }
    } finally {
      setLoading(false)
    }
  }

  // 搜索过滤
  const filteredEvents = useMemo(() => {
    if (!searchKeyword) return events
    const kw = searchKeyword.toLowerCase()
    return events.filter(e => 
      e.title.toLowerCase().includes(kw) || 
      e.speakers?.some(s => s.name.toLowerCase().includes(kw))
    )
  }, [events, searchKeyword])

  // 报名/取消报名
  const handleEnroll = async (event: InstituteEvent, e: React.MouseEvent) => {
    e.stopPropagation()
    setEnrollingId(event.id)
    try {
      if (event.isEnrolled) {
        const res = await cancelEventEnrollment(event.id)
        if (res.code === 200) {
          setEvents(prev => prev.map(ev => 
            ev.id === event.id ? { ...ev, isEnrolled: false, enrolledCount: ev.enrolledCount - 1 } : ev
          ))
        }
      } else {
        const res = await enrollEvent(event.id)
        if (res.code === 200) {
          setEvents(prev => prev.map(ev => 
            ev.id === event.id ? { ...ev, isEnrolled: true, enrolledCount: ev.enrolledCount + 1 } : ev
          ))
        }
      }
    } finally {
      setEnrollingId(null)
    }
  }

  // 添加到日历
  const addToCalendar = (event: InstituteEvent, e: React.MouseEvent) => {
    e.stopPropagation()
    const startDate = new Date(event.startTime)
    const endDate = new Date(event.endTime)
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTEND:${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `SUMMARY:${event.title}`,
      `LOCATION:${event.isOnline ? '线上活动' : event.location}`,
      `DESCRIPTION:${event.description || ''}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n')
    
    const blob = new Blob([icsContent], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${event.title}.ics`
    a.click()
    URL.revokeObjectURL(url)
  }

  // 日历视图数据
  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startWeekDay = firstDay.getDay()
    const daysInMonth = lastDay.getDate()
    
    const days: { date: number; events: InstituteEvent[] }[] = []
    
    // 空白填充
    for (let i = 0; i < startWeekDay; i++) {
      days.push({ date: 0, events: [] })
    }
    
    // 每天
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const dayEvents = filteredEvents.filter(e => e.startTime.startsWith(dateStr))
      days.push({ date: day, events: dayEvents })
    }
    
    return days
  }, [currentMonth, filteredEvents])

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 头部 */}
      <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => router.back()}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">研究院活动</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('calendar')}
            >
              <CalendarDays className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* 搜索和筛选 */}
      <div className="p-4 space-y-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索活动名称、主讲人..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {eventTypes.map(type => (
            <Button
              key={type.value}
              variant={selectedType === type.value ? 'default' : 'outline'}
              size="sm"
              className="flex-shrink-0"
              onClick={() => setSelectedType(type.value)}
            >
              {type.label}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : viewMode === 'list' ? (
        /* 列表视图 */
        <div className="p-4 space-y-4">
          {filteredEvents.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无相关活动</p>
            </div>
          ) : (
            filteredEvents.map(event => (
              <div
                key={event.id}
                className="bg-card rounded-lg overflow-hidden border border-border cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/institute/events/${event.id}`)}
              >
                {/* 封面 */}
                <div className="relative h-40">
                  <img
                    src={event.cover}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 flex gap-2">
                    <span className={cn(
                      "px-2 py-0.5 text-xs rounded",
                      getEventTypeColor(event.type)
                    )}>
                      {getEventTypeLabel(event.type)}
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 text-xs rounded",
                      getEventStatusColor(event.status)
                    )}>
                      {getEventStatusLabel(event.status)}
                    </span>
                  </div>
                  {event.isOnline && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 text-xs bg-cyan-500 text-white rounded flex items-center gap-1">
                      <Video className="h-3 w-3" />
                      线上
                    </span>
                  )}
                </div>

                {/* 内容 */}
                <div className="p-4">
                  <h3 className="font-semibold line-clamp-2 mb-2">{event.title}</h3>
                  
                  {/* 主讲人 */}
                  {event.speakers && event.speakers.length > 0 && (
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex -space-x-2">
                        {event.speakers.slice(0, 3).map((speaker, idx) => (
                          <img
                            key={idx}
                            src={speaker.avatar}
                            alt={speaker.name}
                            className="w-6 h-6 rounded-full border-2 border-background"
                          />
                        ))}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {event.speakers.map(s => s.name).join('、')}
                      </span>
                    </div>
                  )}

                  {/* 时间地点 */}
                  <div className="space-y-1.5 text-sm text-muted-foreground mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{formatDate(event.startTime)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{event.isOnline ? '线上直播' : event.location}</span>
                    </div>
                  </div>

                  {/* 底部 */}
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{event.enrolledCount}/{event.maxEnrollment || '不限'}人</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => addToCalendar(event, e)}
                      >
                        <Calendar className="h-4 w-4 mr-1" />
                        日历
                      </Button>
                      {event.status === 'enrolling' && (
                        <Button
                          variant={event.isEnrolled ? 'outline' : 'default'}
                          size="sm"
                          disabled={enrollingId === event.id}
                          onClick={(e) => handleEnroll(event, e)}
                        >
                          {enrollingId === event.id ? '处理中...' : event.isEnrolled ? '已报名' : '我要报名'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* 日历视图 */
        <div className="p-4">
          {/* 月份切换 */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="font-semibold">
              {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* 星期头 */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['日', '一', '二', '三', '四', '五', '六'].map(day => (
              <div key={day} className="text-center text-sm text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* 日期格子 */}
          <div className="grid grid-cols-7 gap-1">
            {calendarData.map((day, idx) => (
              <div
                key={idx}
                className={cn(
                  "min-h-[60px] p-1 rounded border",
                  day.date === 0 ? 'border-transparent' : 'border-border',
                  day.events.length > 0 && 'bg-primary/5'
                )}
              >
                {day.date > 0 && (
                  <>
                    <span className={cn(
                      "text-sm",
                      day.date === new Date().getDate() && 
                      currentMonth.getMonth() === new Date().getMonth() &&
                      currentMonth.getFullYear() === new Date().getFullYear() &&
                      'text-primary font-bold'
                    )}>
                      {day.date}
                    </span>
                    {day.events.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {day.events.slice(0, 2).map(e => (
                          <div
                            key={e.id}
                            className={cn(
                              "text-xs px-1 py-0.5 rounded truncate cursor-pointer",
                              getEventTypeColor(e.type)
                            )}
                            onClick={() => router.push(`/institute/events/${e.id}`)}
                          >
                            {e.title}
                          </div>
                        ))}
                        {day.events.length > 2 && (
                          <span className="text-xs text-muted-foreground">
                            +{day.events.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
