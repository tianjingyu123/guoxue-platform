'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Smartphone, Mail, Check, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type BindStatus = 'bound' | 'unbound'

interface Account {
  type: 'phone' | 'email' | 'wechat' | 'apple'
  label: string
  icon: React.ReactNode
  status: BindStatus
  value?: string
}

export default function BindAccountPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([
    {
      type: 'phone',
      label: '手机号',
      icon: <Smartphone className="w-5 h-5" />,
      status: 'bound',
      value: '138****8888',
    },
    {
      type: 'email',
      label: '邮箱',
      icon: <Mail className="w-5 h-5" />,
      status: 'unbound',
    },
    {
      type: 'wechat',
      label: '微信',
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#07C160]">
          <path d="M8.73 11.42c-.52 0-.93-.41-.93-.93s.41-.93.93-.93.93.41.93.93-.41.93-.93.93zm4.64 0c-.52 0-.93-.41-.93-.93s.41-.93.93-.93.93.41.93.93-.41.93-.93.93zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
        </svg>
      ),
      status: 'bound',
      value: '已绑定',
    },
    {
      type: 'apple',
      label: 'Apple ID',
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-foreground">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
        </svg>
      ),
      status: 'unbound',
    },
  ])

  const handleBind = (type: Account['type']) => {
    setAccounts(prev =>
      prev.map(a =>
        a.type === type
          ? { ...a, status: 'bound', value: type === 'email' ? 'user@example.com' : '已绑定' }
          : a
      )
    )
  }

  const handleUnbind = (type: Account['type']) => {
    const bound = accounts.filter(a => a.status === 'bound')
    if (bound.length <= 1) return // must keep at least one
    setAccounts(prev =>
      prev.map(a => (a.type === type ? { ...a, status: 'unbound', value: undefined } : a))
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-base font-semibold text-foreground">绑定账号</h1>
      </header>

      <div className="px-4 pt-6 pb-20 space-y-3">
        <p className="text-xs text-muted-foreground px-1 mb-4">
          绑定多个账号后可用任意方式登录，至少保留一种绑定方式。
        </p>
        {accounts.map(acc => (
          <div key={acc.type} className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl">
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
              acc.status === 'bound' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            )}>
              {acc.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{acc.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {acc.status === 'bound' ? (acc.value ?? '已绑定') : '未绑定'}
              </p>
            </div>
            {acc.status === 'bound' ? (
              <button
                onClick={() => handleUnbind(acc.type)}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                解绑
              </button>
            ) : (
              <button
                onClick={() => handleBind(acc.type)}
                className="flex items-center gap-1 text-xs text-primary font-medium"
              >
                绑定 <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

