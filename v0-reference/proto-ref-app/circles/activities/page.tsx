'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, Users, MapPin, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ActivityStatus = 'upcoming' | 'ongoing' | 'ended'

interface Activity {
  id: string
  title: string
  cover: string
  circleName: string
  startTime: string
  endTime: string
  location: string
  participants: number
  maxParticipants: number
  status: ActivityStatus
  joined: boolean
}

const mockActivities: Activity[] = [
  {
    id: '1',
    title: '八字命理研讨会·春季场',
    cover: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=300&fit=crop',
    circleName: '八字命理研习社',
    startTime: '2024-02-15 14:00',
    endTime: '2024-02-15 17:00',
    location: '线上直播',
    participants: 128,
    maxParticipants: 200,
    status: 'upcoming',
    joined: false,
  },
  {
    id: '2',
    title: '易经与现代决策应用讲座',
    cover: 'https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=600&h=300&fit=crop',
    circleName: '易经研究会',
    startTime: '2024-01-20 19:00',
    endTime: '2024-01-20 21:00',
    location: '腾讯会议',
    participants: 89,
    maxParticipants: 100,
    status: 'ongoing',
    joined: true,
  },
  {
    id: '3',
    title: '紫微斗数入门公开课',
    cover: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=300&fit=crop',
    circleName: '紫微斗数学院',
    startTime: '2024-01-15 10:00',
    endTime: '2024-01-15 12:00',
    location: '线上直播',
    participants: 256,
    maxParticipants: 256,
    status: 'ended',
    joined: true,
  },
  {
    id: '4',
    title: '风水堪舆实地考察活动',
    cover: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&h=300&fit=crop',
    circleName: '风水堪舆交流',
    startTime: '2024-02-20 09:00',
    endTime: '2024-02-20 18:00',
    location: '上海 · 古镇',
    participants: 24,
    maxParticipants: 30,
    status: 'upcoming',
    joined: false,
  },
]

const STATUS_CFG: Record<ActivityStatus, { label: string; className: string }> = {
  upcoming: { label: '即将开始', className: 'bg-blue-100 text-blue-700' },
  ongoing:  { label: '进行中',   className: 'bg-green-100 text-green-700' },
  ended:    { label: '已结束',   className: 'bg-muted text-muted-foreground' },
}

export default function CirclesActivitiesPage() {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | ActivityStatus>('all')
  const [activities, setActivities] = useState(mockActivities)

  const filtered = filter === 'all' ? activities : activities.filter(a => a.status === filter)

  const join = (id: string) =>
    setActivities(prev =>
      prev.map(a => a.id === id ? { ...a, joined: true, participants: a.participants + 1 } : a)
    )

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-base font-semibold text-foreground flex-1">圈子活动</h1>
        <Calendar className="w-5 h-5 text-muted-foreground" />
      </header>

      <div className="flex gap-2 px-4 pt-4 pb-2 overflow-x-auto">
        {(['all', 'upcoming', 'ongoing', 'ended'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              filter === f ? 'bg-primary text-white' : 'bg-muted text-foreground'
            )}
          >
            {f === 'all' ? '全部' : STATUS_CFG[f as ActivityStatus].label}
          </button>
        ))}
      </div>

      <div className="px-4 pb-20 space-y-4 pt-2">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground text-sm">暂无活动</div>
        )}
        {filtered.map(act => (
          <div key={act.id} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="relative">
              <img src={act.cover} alt={act.title} className="w-full h-40 object-cover" />
              <span className={cn('absolute top-3 left-3 text-xs font-medium px-2 py-1 rounded-full', STATUS_CFG[act.status].className)}>
                {STATUS_CFG[act.status].label}
              </span>
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-foreground mb-1">{act.title}</h3>
              <p className="text-xs text-primary mb-3">{act.circleName}</p>
              <div className="space-y-1.5 text-xs text-muted-foreground mb-4">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{act.startTime} – {act.endTime.split(' ')[1]}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{act.location}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{act.participants} / {act.maxParticipants} 人参与</span>
                  <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden ml-1">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${(act.participants / act.maxParticipants) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              {act.status !== 'ended' && (
                act.joined
                  ? <div className="text-center text-sm text-green-600 font-medium py-2">已报名</div>
                  : <Button
                      onClick={() => join(act.id)}
                      disabled={act.participants >= act.maxParticipants}
                      className="w-full bg-primary hover:bg-primary/90"
                      size="sm"
                    >
                      {act.participants >= act.maxParticipants ? '名额已满' : '立即报名'}
                    </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
