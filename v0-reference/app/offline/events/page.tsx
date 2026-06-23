'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MapPin, Calendar, Users, Clock, Search, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type EventStatus = 'upcoming' | 'ongoing' | 'ended'

interface OfflineEvent {
  id: string
  title: string
  cover: string
  location: string
  city: string
  date: string
  time: string
  price: string
  capacity: number
  registered: number
  status: EventStatus
  organizer: string
  tags: string[]
}

const events: OfflineEvent[] = [
  {
    id: '1',
    title: '2024 甲辰年命理研讨大会',
    cover: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=400',
    location: '北京国际会议中心 A 厅',
    city: '北京',
    date: '2024-03-20',
    time: '09:00 - 17:00',
    price: '¥380',
    capacity: 200,
    registered: 176,
    status: 'upcoming',
    organizer: '儒布国学文化',
    tags: ['命理', '八字', '年度大会'],
  },
  {
    id: '2',
    title: '紫微斗数专题研修班',
    cover: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400',
    location: '上海静安区文化中心',
    city: '上海',
    date: '2024-03-25',
    time: '10:00 - 16:00',
    price: '¥680',
    capacity: 50,
    registered: 48,
    status: 'upcoming',
    organizer: '张玄风工作室',
    tags: ['紫微斗数', '小班授课'],
  },
  {
    id: '3',
    title: '风水堪舆实地考察活动',
    cover: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400',
    location: '广州白云山风景区',
    city: '广州',
    date: '2024-04-06',
    time: '08:00 - 18:00',
    price: '¥260',
    capacity: 30,
    registered: 18,
    status: 'upcoming',
    organizer: '王德华堪舆学堂',
    tags: ['风水', '实地考察', '户外'],
  },
  {
    id: '4',
    title: '易经六十四卦公益讲座',
    cover: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=400',
    location: '成都市图书馆报告厅',
    city: '成都',
    date: '2024-03-15',
    time: '14:00 - 16:30',
    price: '免费',
    capacity: 120,
    registered: 120,
    status: 'ongoing',
    organizer: '儒布国学公益',
    tags: ['易经', '公益', '免费'],
  },
  {
    id: '5',
    title: '国学文化新春交流会',
    cover: 'https://images.unsplash.com/photo-1560439513-74b037a25d84?w=400',
    location: '杭州西湖文化广场',
    city: '杭州',
    date: '2024-02-18',
    time: '13:00 - 17:00',
    price: '¥128',
    capacity: 80,
    registered: 80,
    status: 'ended',
    organizer: '儒布国学文化',
    tags: ['交流', '国学', '新春'],
  },
]

const STATUS_CFG = {
  upcoming: { label: '即将开始', cls: 'bg-chart-4/15 text-chart-4' },
  ongoing:  { label: '进行中',   cls: 'bg-primary/10 text-primary' },
  ended:    { label: '已结束',   cls: 'bg-muted text-muted-foreground' },
}

const cities = ['全部', '北京', '上海', '广州', '成都', '杭州']

export default function OfflineEventsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [city, setCity] = useState('全部')
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all')

  const filtered = events.filter(e => {
    const matchSearch = !search || e.title.includes(search) || e.tags.some(t => t.includes(search))
    const matchCity = city === '全部' || e.city === city
    const matchStatus = statusFilter === 'all' || e.status === statusFilter
    return matchSearch && matchCity && matchStatus
  })

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-base font-semibold text-foreground flex-1">线下活动</h1>
      </header>

      <div className="px-4 pt-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索活动名称或标签"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex gap-2 px-4 py-2 overflow-x-auto">
        {cities.map(c => (
          <button
            key={c}
            onClick={() => setCity(c)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0',
              city === c ? 'bg-primary text-white' : 'bg-muted text-foreground'
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
        {([
          { key: 'all',      label: '全部' },
          { key: 'upcoming', label: '即将开始' },
          { key: 'ongoing',  label: '进行中' },
          { key: 'ended',    label: '已结束' },
        ] as const).map(s => (
          <button
            key={s.key}
            onClick={() => setStatusFilter(s.key)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 border',
              statusFilter === s.key ? 'border-primary text-primary bg-primary/5' : 'border-border text-muted-foreground'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="px-4 pb-20 space-y-4">
        {filtered.map(event => {
          const status = STATUS_CFG[event.status]
          const soldOut = event.registered >= event.capacity
          const pct = Math.round((event.registered / event.capacity) * 100)

          return (
            <div key={event.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="relative">
                <img src={event.cover} alt={event.title} className="w-full h-36 object-cover" />
                <span className={cn('absolute top-2 left-2 text-[10px] font-semibold px-2 py-1 rounded-full', status.cls)}>
                  {status.label}
                </span>
                <span className="absolute top-2 right-2 text-xs font-bold bg-black/60 text-primary-foreground px-2 py-1 rounded-full">
                  {event.price}
                </span>
              </div>

              <div className="p-4">
                <h3 className="text-sm font-semibold text-foreground mb-2">{event.title}</h3>

                <div className="space-y-1.5 mb-3">
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-primary" />
                    <span>{event.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5 flex-shrink-0 text-primary" />
                    <span>{event.date}</span>
                    <Clock className="w-3.5 h-3.5 flex-shrink-0 text-primary ml-2" />
                    <span>{event.time}</span>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {event.registered}/{event.capacity} 人已报名
                    </span>
                    {soldOut && (
                      <span className="text-destructive font-semibold text-[10px]">已满员</span>
                    )}
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', soldOut ? 'bg-destructive' : 'bg-primary')}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {event.tags.map(tag => (
                    <span key={tag} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{tag}</span>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground flex-1">主办：{event.organizer}</span>
                  <Button
                    size="sm"
                    disabled={event.status === 'ended' || soldOut}
                    className={cn(
                      'h-8 text-xs gap-1',
                      event.status === 'ended' || soldOut
                        ? 'bg-muted text-muted-foreground cursor-not-allowed'
                        : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                    )}
                  >
                    {event.status === 'ended' ? '已结束' : soldOut ? '已满员' : '立即报名'}
                    {event.status !== 'ended' && !soldOut && <ChevronRight className="w-3 h-3" />}
                  </Button>
                </div>
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-16">暂无相关活动</p>
        )}
      </div>
    </div>
  )
}
