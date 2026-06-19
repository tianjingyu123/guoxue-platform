'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Phone, MessageSquare, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

type OrderStatus = 'all' | 'completed' | 'pending' | 'refunded'

interface Order {
  id: string
  orderNo: string
  expert: string
  avatar: string
  type: 'call' | 'text'
  amount: string
  status: 'completed' | 'pending' | 'refunded'
  createdAt: string
  desc: string
}

const mockOrders: Order[] = [
  { id: '1', orderNo: 'CS202401200001', expert: '周易大师', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80', type: 'call',  amount: '¥84.00', status: 'completed', createdAt: '2024-01-20', desc: '电话咨询 28分钟' },
  { id: '2', orderNo: 'CS202401180002', expert: '张玄风',   avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80', type: 'text', amount: '¥30.00', status: 'completed', createdAt: '2024-01-18', desc: '图文咨询' },
  { id: '3', orderNo: 'CS202401220003', expert: '李玄机',   avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80', type: 'text', amount: '¥80.00', status: 'pending',   createdAt: '2024-01-22', desc: '图文咨询（待回复）' },
  { id: '4', orderNo: 'CS202401100004', expert: '王德华',   avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80', type: 'call',  amount: '¥126.00',status: 'completed', createdAt: '2024-01-10', desc: '电话咨询 42分钟' },
  { id: '5', orderNo: 'CS202401050005', expert: '林奇门',   avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80', type: 'call',  amount: '¥0.00',  status: 'refunded',  createdAt: '2024-01-05', desc: '已退款' },
]

const STATUS_CFG = {
  completed: { label: '已完成', icon: CheckCircle2, cls: 'text-green-600' },
  pending:   { label: '待处理', icon: Clock,        cls: 'text-orange-500' },
  refunded:  { label: '已退款', icon: XCircle,      cls: 'text-muted-foreground' },
}

export default function ConsultOrdersPage() {
  const router = useRouter()
  const [filter, setFilter] = useState<OrderStatus>('all')

  const filtered = filter === 'all' ? mockOrders : mockOrders.filter(o => o.status === filter)
  const totalSpent = mockOrders
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + parseFloat(o.amount.replace('¥', '')), 0)

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h1 className="text-base font-semibold text-foreground">咨询订单</h1>
      </header>

      {/* Summary */}
      <div className="mx-4 mt-4 p-4 bg-primary/5 border border-primary/20 rounded-xl flex gap-6">
        <div className="text-center flex-1">
          <p className="text-xl font-bold text-primary">¥{totalSpent.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">累计消费</p>
        </div>
        <div className="text-center flex-1">
          <p className="text-xl font-bold text-foreground">{mockOrders.filter(o => o.status === 'completed').length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">完成订单</p>
        </div>
        <div className="text-center flex-1">
          <p className="text-xl font-bold text-foreground">{mockOrders.filter(o => o.type === 'call').length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">通话次数</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 px-4 pt-4 pb-2 overflow-x-auto">
        {(['all','completed','pending','refunded'] as OrderStatus[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              filter === f ? 'bg-primary text-white' : 'bg-muted text-foreground'
            )}
          >
            {f === 'all' ? '全部' : STATUS_CFG[f as Exclude<OrderStatus,'all'>].label}
          </button>
        ))}
      </div>

      <div className="px-4 pb-20 space-y-3 pt-2">
        {filtered.map(order => {
          const cfg = STATUS_CFG[order.status]
          const StatusIcon = cfg.icon
          return (
            <div key={order.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground">订单号：{order.orderNo}</span>
                <span className={cn('text-xs flex items-center gap-1', cfg.cls)}>
                  <StatusIcon className="w-3 h-3" />{cfg.label}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarImage src={order.avatar} />
                  <AvatarFallback>{order.expert[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{order.expert}</span>
                    <span className={cn('text-xs flex items-center gap-0.5 text-muted-foreground')}>
                      {order.type === 'call'
                        ? <Phone className="w-3 h-3" />
                        : <MessageSquare className="w-3 h-3" />}
                      {order.type === 'call' ? '电话' : '图文'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{order.desc}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={cn('text-sm font-bold', order.status === 'refunded' ? 'line-through text-muted-foreground' : 'text-primary')}>
                    {order.amount}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{order.createdAt}</p>
                </div>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-16">暂无订单</p>
        )}
      </div>
    </div>
  )
}
