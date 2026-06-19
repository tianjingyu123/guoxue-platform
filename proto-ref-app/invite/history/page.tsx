'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, UserCheck, Clock, Gift } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface InviteRecord {
  id: string
  name: string
  avatar: string
  registeredAt: string
  status: 'registered' | 'subscribed' | 'pending'
  reward: string
}

const mockRecords: InviteRecord[] = [
  { id: '1', name: '张三', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80', registeredAt: '2024-03-15 14:30', status: 'subscribed', reward: '¥20.00' },
  { id: '2', name: '李四', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80', registeredAt: '2024-03-14 09:20', status: 'registered', reward: '¥5.00' },
  { id: '3', name: '王五', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80', registeredAt: '2024-03-13 16:45', status: 'pending',    reward: '--' },
  { id: '4', name: '赵六', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80', registeredAt: '2024-03-12 11:00', status: 'subscribed', reward: '¥20.00' },
  { id: '5', name: '钱七', avatar: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=80', registeredAt: '2024-03-10 08:30', status: 'registered', reward: '¥5.00' },
]

const STATUS_CFG = {
  registered: { label: '已注册',   icon: UserCheck, cls: 'text-blue-600', bg: 'bg-blue-50' },
  subscribed:  { label: '已订阅',   icon: Gift,      cls: 'text-green-600', bg: 'bg-green-50' },
  pending:     { label: '待确认',   icon: Clock,     cls: 'text-muted-foreground', bg: 'bg-muted' },
}

export default function InviteHistoryPage() {
  const router = useRouter()
  const totalReward = mockRecords
    .filter(r => r.reward !== '--')
    .reduce((sum, r) => sum + parseFloat(r.reward.replace('¥', '')), 0)

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-base font-semibold text-foreground">邀请记录</h1>
      </header>

      {/* Summary */}
      <div className="mx-4 mt-4 grid grid-cols-3 gap-3">
        {[
          { label: '已邀请', value: mockRecords.length },
          { label: '已订阅', value: mockRecords.filter(r => r.status === 'subscribed').length },
          { label: '累计奖励', value: `¥${totalReward.toFixed(2)}` },
        ].map(s => (
          <div key={s.label} className="text-center p-3 bg-card border border-border rounded-xl">
            <p className="text-lg font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="px-4 mt-4 pb-20 space-y-2">
        {mockRecords.map(rec => {
          const cfg = STATUS_CFG[rec.status]
          const StatusIcon = cfg.icon
          return (
            <div key={rec.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
              <Avatar className="w-10 h-10 flex-shrink-0">
                <AvatarImage src={rec.avatar} />
                <AvatarFallback>{rec.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{rec.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{rec.registeredAt}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <span className={cn('text-xs flex items-center gap-1 px-2 py-0.5 rounded-full', cfg.bg, cfg.cls)}>
                  <StatusIcon className="w-3 h-3" />{cfg.label}
                </span>
                <span className={cn('text-xs font-semibold', rec.reward !== '--' ? 'text-primary' : 'text-muted-foreground')}>
                  {rec.reward !== '--' ? `+${rec.reward}` : rec.reward}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
