'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Event {
  id: string
  date: string   // YYYY-MM-DD
  title: string
  time: string
  circle: string
  type: 'activity' | 'live' | 'offline'
}

const EVENTS: Event[] = [
  { id: '1', date: '2026-06-12', title: '八字命理公开课', time: '19:00', circle: '八字命理研习社', type: 'live' },
  { id: '2', date: '2026-06-15', title: '风水勘察分享会', time: '14:00', circle: '风水堪舆交流',   type: 'offline' },
  { id: '3', date: '2026-06-15', title: '易经读书会', time: '20:00', circle: '易经研究会', type: 'activity' },
  { id: '4', date: '2026-06-18', title: '紫微斗数进阶班', time: '10:00', circle: '紫微斗数学院', type: 'live' },
  { id: '5', date: '2026-06-22', title: '奇门遁甲实战课', time: '15:30', circle: '奇门遁甲精研', type: 'live' },
  { id: '6', date: '2026-06-28', title: '国学文化交流茶会', time: '14:00', circle: '国学文化圈', type: 'offline' },
]

const TYPE_CFG = {
  live:     { label: '直播', cls: 'bg-red-100 text-red-700' },
  activity: { label: '活动', cls: 'bg-blue-100 text-blue-700' },
  offline:  { label: '线下', cls: 'bg-green-100 text-green-700' },
}

const WEEKDAYS = ['日','一','二','三','四','五','六']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstWeekday(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

export default function CirclesCalendarPage() {
  const router = useRouter()
  const today = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState(today.toISOString().slice(0, 10))

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const days = getDaysInMonth(year, month)
  const firstWd = getFirstWeekday(year, month)
  const cells: (number | null)[] = [...Array(firstWd).fill(null), ...Array.from({length: days}, (_, i) => i + 1)]

  const eventDates = new Set(EVENTS.map(e => e.date))
  const dayEvents = EVENTS.filter(e => e.date === selected)

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h1 className="text-base font-semibold text-foreground">活动日历</h1>
      </header>

      <div className="px-4 pt-4 pb-20">
        {/* Month navigator */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-muted">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <span className="text-base font-semibold text-foreground">
            {year}年{month + 1}月
          </span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-muted">
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map(d => (
            <div key={d} className={cn('text-center text-xs font-medium py-1', d === '日' || d === '六' ? 'text-muted-foreground' : 'text-foreground')}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} />
            const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
            const isToday = dateStr === today.toISOString().slice(0,10)
            const isSel   = dateStr === selected
            const hasEvt  = eventDates.has(dateStr)
            return (
              <button
                key={day}
                onClick={() => setSelected(dateStr)}
                className={cn(
                  'flex flex-col items-center py-1.5 rounded-lg transition-colors relative',
                  isSel   ? 'bg-primary text-white' :
                  isToday ? 'bg-primary/10 text-primary' :
                            'hover:bg-muted text-foreground'
                )}
              >
                <span className="text-sm font-medium">{day}</span>
                {hasEvt && (
                  <span className={cn('w-1.5 h-1.5 rounded-full mt-0.5', isSel ? 'bg-white' : 'bg-primary')} />
                )}
              </button>
            )
          })}
        </div>

        {/* Events for selected day */}
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            {selected.slice(5).replace('-','月')}日 的活动
          </h2>
          {dayEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">当日无活动</p>
          ) : (
            <div className="space-y-3">
              {dayEvents.map(evt => {
                const cfg = TYPE_CFG[evt.type]
                return (
                  <div key={evt.id} className="flex gap-3 p-3 bg-card border border-border rounded-xl">
                    <div className="flex flex-col items-center pt-0.5">
                      <span className="text-sm font-bold text-primary">{evt.time}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">{evt.title}</p>
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0', cfg.cls)}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{evt.circle}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
