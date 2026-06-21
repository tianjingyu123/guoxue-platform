'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronLeft, ChevronRight, Zap, Users, Tag, Radio, BookOpen, Calendar as CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { DataState } from '@/components/data-state'
import { cn } from '@/lib/utils'
import { 
  getCalendarMonthData, 
  getEventTypeColor, 
  getEventTypeLabel,
  getActivityStatusText 
} from '@/lib/api/marketing'
import type { CalendarMonthData, CalendarEvent, DateMarker, CalendarEventType } from '@/lib/types/marketing'

// 星期标签
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

// 活动类型图标
const EVENT_TYPE_ICONS: Record<CalendarEventType, typeof Zap> = {
  flash_sale: Zap,
  group_buy: Users,
  promotion: Tag,
  live: Radio,
  course: BookOpen,
}

export default function ActivityCalendarPage() {
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [calendarData, setCalendarData] = useState<CalendarMonthData | null>(null)
  const [selectedEvents, setSelectedEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1

  // 加载月历数据
  const loadCalendarData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await getCalendarMonthData(year, month)
      if (response.code === 200 && response.data) {
        setCalendarData(response.data)
      } else {
        setError(response.message || '加载失败')
      }
    } catch {
      setError('网络错误')
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    loadCalendarData()
  }, [loadCalendarData])

  // 切换月份
  const changeMonth = (delta: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(newDate.getMonth() + delta)
      return newDate
    })
    setSelectedDate(null)
    setSelectedEvents([])
  }

  // 选择日期
  const handleSelectDate = (dateStr: string, marker?: DateMarker) => {
    setSelectedDate(dateStr)
    setSelectedEvents(marker?.events || [])
  }

  // 生成日历格子
  const generateCalendarDays = () => {
    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)
    const daysInMonth = lastDay.getDate()
    const startWeekday = firstDay.getDay()
    
    const days: { date: string; day: number; isCurrentMonth: boolean; marker?: DateMarker }[] = []
    
    // 上月末尾
    const prevMonthLastDay = new Date(year, month - 1, 0).getDate()
    for (let i = startWeekday - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i
      const prevMonth = month === 1 ? 12 : month - 1
      const prevYear = month === 1 ? year - 1 : year
      days.push({
        date: `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        day,
        isCurrentMonth: false,
      })
    }
    
    // 当月
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const marker = calendarData?.markers.find(m => m.date === dateStr)
      days.push({
        date: dateStr,
        day,
        isCurrentMonth: true,
        marker,
      })
    }
    
    // 下月开头
    const remainingDays = 42 - days.length
    for (let day = 1; day <= remainingDays; day++) {
      const nextMonth = month === 12 ? 1 : month + 1
      const nextYear = month === 12 ? year + 1 : year
      days.push({
        date: `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        day,
        isCurrentMonth: false,
      })
    }
    
    return days
  }

  const calendarDays = generateCalendarDays()
  const today = new Date().toISOString().split('T')[0]

  // 获取活动跳转链接
  const getEventLink = (event: CalendarEvent): string => {
    switch (event.type) {
      case 'flash_sale':
      case 'group_buy':
      case 'promotion':
        return `/activity/landing?id=${event.id}&type=${event.type}`
      case 'live':
        return `/live/${event.id}`
      case 'course':
        return `/courses/${event.id}`
      default:
        return '#'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/discover" className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-semibold">活动日历</h1>
          <div className="w-9" />
        </div>
      </header>

      {/* 月份选择器 */}
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => changeMonth(-1)}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-primary" />
          <span className="font-semibold text-lg">{year}年{month}月</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => changeMonth(1)}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* 图例 */}
      <div className="flex items-center justify-center gap-3 px-4 py-2 bg-card border-b border-border">
        {(['flash_sale', 'group_buy', 'live', 'course'] as CalendarEventType[]).map(type => (
          <div key={type} className="flex items-center gap-1">
            <div 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: getEventTypeColor(type) }}
            />
            <span className="text-xs text-muted-foreground">{getEventTypeLabel(type)}</span>
          </div>
        ))}
      </div>

      <DataState
        isLoading={loading}
        error={error}
        isEmpty={false}
        onRetry={loadCalendarData}
      >
        {/* 星期标题 */}
        <div className="grid grid-cols-7 bg-card">
          {WEEKDAYS.map(day => (
            <div key={day} className="text-center py-2 text-sm text-muted-foreground font-medium">
              {day}
            </div>
          ))}
        </div>

        {/* 日历格子 */}
        <div className="grid grid-cols-7 bg-card border-b border-border">
          {calendarDays.map(({ date, day, isCurrentMonth, marker }) => (
            <button
              key={date}
              onClick={() => handleSelectDate(date, marker)}
              className={cn(
                "relative aspect-square p-1 border-b border-r border-border/50 transition-colors",
                isCurrentMonth ? "text-foreground" : "text-muted-foreground/50",
                selectedDate === date && "bg-primary/10",
                date === today && isCurrentMonth && "font-bold"
              )}
            >
              <span className={cn(
                "text-sm",
                date === today && isCurrentMonth && "text-primary"
              )}>
                {day}
              </span>
              
              {/* 活动标记点 */}
              {marker && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {marker.hasFlashSale && (
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getEventTypeColor('flash_sale') }} />
                  )}
                  {marker.hasGroupBuy && (
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getEventTypeColor('group_buy') }} />
                  )}
                  {marker.hasLive && (
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getEventTypeColor('live') }} />
                  )}
                  {marker.hasCourse && (
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getEventTypeColor('course') }} />
                  )}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* 选中日期的活动列表 */}
        <div className="p-4">
          {selectedDate ? (
            <>
              <h2 className="text-sm font-medium text-muted-foreground mb-3">
                {selectedDate.replace(/-/g, '/')} 的活动
              </h2>
              {selectedEvents.length > 0 ? (
                <div className="space-y-3">
                  {selectedEvents.map(event => {
                    const Icon = EVENT_TYPE_ICONS[event.type]
                    const color = getEventTypeColor(event.type)
                    return (
                      <Link
                        key={event.id}
                        href={getEventLink(event)}
                        className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border"
                      >
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${color}20` }}
                        >
                          <Icon className="w-5 h-5" style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{event.title}</span>
                            <Badge 
                              variant={event.status === 'ongoing' ? 'default' : 'secondary'}
                              className="shrink-0 text-xs"
                            >
                              {getActivityStatusText(event.status)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{event.startTime.split(' ')[1]} - {event.endTime.split(' ')[1]}</span>
                            {event.extra?.productCount && (
                              <span>| {event.extra.productCount}件商品</span>
                            )}
                            {event.extra?.hostName && (
                              <span>| {event.extra.hostName}</span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>该日期暂无活动</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>点击日期查看活动详情</p>
            </div>
          )}
        </div>
      </DataState>
    </div>
  )
}
