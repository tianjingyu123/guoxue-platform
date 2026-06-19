'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Phone, PhoneIncoming, PhoneOutgoing, Clock } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

type CallType = 'all' | 'incoming' | 'outgoing' | 'missed'

interface CallRecord {
  id: string
  expert: string
  avatar: string
  specialty: string
  type: 'incoming' | 'outgoing' | 'missed'
  duration: string
  time: string
  cost: string
}

const mockCalls: CallRecord[] = [
  { id: '1', expert: '周易大师', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80', specialty: '八字命理', type: 'outgoing',  duration: '28分钟', time: '今天 14:35', cost: '¥84.00' },
  { id: '2', expert: '张玄风',   avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80', specialty: '紫微斗数', type: 'incoming',  duration: '15分钟', time: '昨天 20:12', cost: '¥45.00' },
  { id: '3', expert: '李玄机',   avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80', specialty: '易经',    type: 'missed',   duration: '--',      time: '昨天 09:30', cost: '¥0.00' },
  { id: '4', expert: '王德华',   avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80', specialty: '风水',    type: 'outgoing',  duration: '42分钟', time: '2024-01-10', cost: '¥126.00' },
  { id: '5', expert: '林奇门',   avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80', specialty: '奇门遁甲', type: 'outgoing', duration: '10分钟', time: '2024-01-08', cost: '¥30.00' },
]

const TYPE_CFG: Record<CallType, { label: string }> = {
  all:      { label: '全部' },
  outgoing: { label: '拨出' },
  incoming: { label: '接入' },
  missed:   { label: '未接' },
}

export default function MyCallsPage() {
  const router = useRouter()
  const [filter, setFilter] = useState<CallType>('all')

  const filtered = filter === 'all' ? mockCalls : mockCalls.filter(c => c.type === filter)

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h1 className="text-base font-semibold text-foreground">我的通话</h1>
      </header>

      <div className="flex gap-2 px-4 pt-4 pb-2 overflow-x-auto">
        {(['all', 'outgoing', 'incoming', 'missed'] as CallType[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              filter === f ? 'bg-primary text-white' : 'bg-muted text-foreground'
            )}
          >
            {TYPE_CFG[f].label}
          </button>
        ))}
      </div>

      <div className="px-4 pb-20 space-y-2 pt-2">
        {filtered.map(call => (
          <div key={call.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
            <Avatar className="w-11 h-11 flex-shrink-0">
              <AvatarImage src={call.avatar} />
              <AvatarFallback>{call.expert[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-foreground">{call.expert}</span>
                <span className="text-xs text-muted-foreground">{call.specialty}</span>
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                <span className={cn('flex items-center gap-0.5',
                  call.type === 'missed' ? 'text-red-500' :
                  call.type === 'outgoing' ? 'text-blue-500' : 'text-green-600'
                )}>
                  {call.type === 'incoming' ? <PhoneIncoming className="w-3 h-3" /> :
                   call.type === 'outgoing' ? <PhoneOutgoing className="w-3 h-3" /> :
                   <Phone className="w-3 h-3" />}
                  {call.type === 'incoming' ? '接入' : call.type === 'outgoing' ? '拨出' : '未接'}
                </span>
                <span className="flex items-center gap-0.5">
                  <Clock className="w-3 h-3" />{call.duration}
                </span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-semibold text-primary">{call.cost}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{call.time}</p>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-16">暂无通话记录</p>
        )}
      </div>
    </div>
  )
}
