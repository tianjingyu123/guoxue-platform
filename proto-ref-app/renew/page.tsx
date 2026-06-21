'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Crown, Check, RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Plan {
  id: string
  label: string
  price: string
  originalPrice: string
  perMonth: string
  highlight?: boolean
  tag?: string
  months: number
}

const PLANS: Plan[] = [
  { id: '1', label: '1个月',  price: '28',  originalPrice: '38',  perMonth: '28',  months: 1 },
  { id: '2', label: '3个月',  price: '68',  originalPrice: '114', perMonth: '22.7', months: 3, tag: '热门' },
  { id: '3', label: '12个月', price: '198', originalPrice: '456', perMonth: '16.5', months: 12, highlight: true, tag: '最优惠' },
]

export default function RenewPage() {
  const router = useRouter()
  const [selected, setSelected] = useState('3')
  const [autoRenew, setAutoRenew] = useState(false)
  const [paying, setPaying] = useState(false)

  const plan = PLANS.find(p => p.id === selected)!

  const handlePay = async () => {
    setPaying(true)
    await new Promise(r => setTimeout(r, 1500))
    setPaying(false)
    router.push('/vip')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-base font-semibold text-foreground">续费会员</h1>
      </header>

      {/* Current status */}
      <div className="mx-4 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
        <Crown className="w-8 h-8 text-amber-500 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-foreground">专业会员</p>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-orange-500" />
            到期时间：2024-02-20（还剩 30 天）
          </p>
        </div>
      </div>

      <div className="px-4 mt-6">
        <h2 className="text-sm font-semibold text-foreground mb-3">选择续费时长</h2>
        <div className="grid grid-cols-3 gap-3 mb-6">
          {PLANS.map(p => (
            <button
              key={p.id}
              onClick={() => setSelected(p.id)}
              className={cn(
                'relative flex flex-col items-center py-4 px-2 rounded-xl border-2 transition-all',
                selected === p.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card'
              )}
            >
              {p.tag && (
                <span className={cn(
                  'absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap',
                  p.highlight ? 'bg-primary text-white' : 'bg-amber-400 text-white'
                )}>
                  {p.tag}
                </span>
              )}
              <span className="text-xs text-muted-foreground mb-1">{p.label}</span>
              <span className="text-xl font-black text-foreground">¥{p.price}</span>
              <span className="text-[10px] text-muted-foreground line-through mt-0.5">¥{p.originalPrice}</span>
              <span className="text-[10px] text-primary mt-1">约 ¥{p.perMonth}/月</span>
              {selected === p.id && (
                <div className="absolute bottom-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Auto renew */}
        <button
          onClick={() => setAutoRenew(v => !v)}
          className="flex items-center gap-3 w-full p-3 bg-card border border-border rounded-xl mb-6"
        >
          <div className={cn('w-10 h-5 rounded-full transition-all flex items-center px-0.5', autoRenew ? 'bg-primary' : 'bg-muted')}>
            <div className={cn('w-4 h-4 rounded-full bg-white shadow transition-transform', autoRenew ? 'translate-x-5' : 'translate-x-0')} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />自动续费
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">到期前 7 天自动扣款，随时可取消</p>
          </div>
        </button>

        {/* Benefits */}
        <div className="bg-muted/30 rounded-xl p-4 mb-6">
          <p className="text-xs font-semibold text-foreground mb-2">续费后享有权益</p>
          <div className="grid grid-cols-2 gap-y-2">
            {['不限次排盘解读','命理分析报告','专家一对一咨询','海量古籍资料','AI 智能助手','VIP 专属课程'].map(b => (
              <div key={b} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Check className="w-3 h-3 text-primary flex-shrink-0" />
                {b}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-4 flex items-center gap-4">
        <div>
          <p className="text-lg font-black text-primary">¥{plan.price}</p>
          <p className="text-xs text-muted-foreground">原价 ¥{plan.originalPrice}</p>
        </div>
        <Button
          onClick={handlePay}
          disabled={paying}
          className="flex-1 bg-primary hover:bg-primary/90 h-11 text-base font-semibold"
        >
          {paying ? '处理中…' : '立即续费'}
        </Button>
      </div>
    </div>
  )
}
