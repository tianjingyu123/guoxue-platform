'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Crown, CreditCard, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

type RecordType = 'all' | 'purchase' | 'renew' | 'gift'

interface VipRecord {
  id: string
  type: 'purchase' | 'renew' | 'gift'
  level: 'basic' | 'pro' | 'premium'
  plan: string
  amount: string
  channel: string
  startDate: string
  endDate: string
  createdAt: string
}

const mockRecords: VipRecord[] = [
  { id: '1', type: 'purchase', level: 'pro',     plan: '年度会员', amount: '¥198.00', channel: '微信支付', startDate: '2024-01-20', endDate: '2025-01-20', createdAt: '2024-01-20 10:32' },
  { id: '2', type: 'renew',    level: 'pro',     plan: '年度续费', amount: '¥168.00', channel: '支付宝',   startDate: '2023-01-18', endDate: '2024-01-18', createdAt: '2023-01-18 15:20' },
  { id: '3', type: 'gift',     level: 'basic',   plan: '月度礼品', amount: '¥0.00',   channel: '赠送',     startDate: '2022-11-05', endDate: '2022-12-05', createdAt: '2022-11-05 09:15' },
  { id: '4', type: 'purchase', level: 'basic',   plan: '月度会员', amount: '¥28.00',  channel: '余额支付', startDate: '2022-10-01', endDate: '2022-11-01', createdAt: '2022-10-01 20:05' },
]

const LEVEL_CFG = {
  basic:   { label: '基础会员', color: 'text-amber-600',  bg: 'bg-amber-50' },
  pro:     { label: '专业会员', color: 'text-purple-600', bg: 'bg-purple-50' },
  premium: { label: '至尊会员', color: 'text-orange-600', bg: 'bg-orange-50' },
}

const TYPE_CFG = {
  purchase: { label: '购买', icon: CreditCard, cls: 'text-primary' },
  renew:    { label: '续费', icon: RefreshCw,  cls: 'text-green-600' },
  gift:     { label: '赠送', icon: Crown,      cls: 'text-amber-500' },
}

const TABS: { key: RecordType; label: string }[] = [
  { key: 'all',      label: '全部' },
  { key: 'purchase', label: '购买' },
  { key: 'renew',    label: '续费' },
  { key: 'gift',     label: '赠送' },
]

export default function VipRecordsPage() {
  const router = useRouter()
  const [filter, setFilter] = useState<RecordType>('all')

  const filtered = filter === 'all' ? mockRecords : mockRecords.filter(r => r.type === filter)

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-base font-semibold text-foreground">VIP 开通记录</h1>
      </header>

      <div className="flex gap-2 px-4 pt-4 pb-2 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              filter === t.key ? 'bg-primary text-white' : 'bg-muted text-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 pb-20 space-y-3 pt-2">
        {filtered.map(rec => {
          const lvl = LEVEL_CFG[rec.level]
          const typ = TYPE_CFG[rec.type]
          const TypeIcon = typ.icon
          return (
            <div key={rec.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Crown className={cn('w-4 h-4', lvl.color)} />
                  <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', lvl.bg, lvl.color)}>
                    {lvl.label}
                  </span>
                  <span className="text-sm font-medium text-foreground">{rec.plan}</span>
                </div>
                <span className={cn('text-xs flex items-center gap-1', typ.cls)}>
                  <TypeIcon className="w-3 h-3" />{typ.label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-y-1.5 text-xs text-muted-foreground">
                <span>金额：<span className="text-primary font-semibold">{rec.amount}</span></span>
                <span>渠道：{rec.channel}</span>
                <span>开始：{rec.startDate}</span>
                <span>到期：{rec.endDate}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 text-right">{rec.createdAt}</p>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-16">暂无记录</p>
        )}
      </div>
    </div>
  )
}
