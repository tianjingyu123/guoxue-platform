'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Copy, Share2, CheckCircle2, Users, TrendingUp, Gift } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface InvitedStation {
  id: string
  name: string
  joinedAt: string
  status: 'active' | 'pending'
  revenue: string
  commission: string
}

const invited: InvitedStation[] = [
  { id: '1', name: '北京命理文化站', joinedAt: '2024-01-10', status: 'active',  revenue: '¥28,400', commission: '¥2,840' },
  { id: '2', name: '上海国学传播站', joinedAt: '2024-01-18', status: 'active',  revenue: '¥15,600', commission: '¥1,560' },
  { id: '3', name: '广州易学研究站', joinedAt: '2024-02-05', status: 'pending', revenue: '¥0',      commission: '¥0' },
]

const inviteLink = 'https://rebu.com/join?ref=OP20240001'
const inviteCode = 'OP20240001'

export default function OperatorInvitePage() {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const sendInvite = async () => {
    if (!email) return
    await new Promise(r => setTimeout(r, 600))
    setSent(true)
    setEmail('')
    setTimeout(() => setSent(false), 3000)
  }

  const totalCommission = invited
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + parseFloat(s.commission.replace(/[¥,]/g, '')), 0)

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-base font-semibold text-foreground">邀请站长</h1>
      </header>

      {/* Stats */}
      <div className="mx-4 mt-4 grid grid-cols-3 gap-3">
        {[
          { label: '已邀请', value: invited.length,                          icon: Users },
          { label: '已激活', value: invited.filter(s=>s.status==='active').length, icon: CheckCircle2 },
          { label: '累计佣金', value: `¥${totalCommission.toLocaleString()}`, icon: Gift },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="text-center p-3 bg-card border border-border rounded-xl">
            <Icon className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-base font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Commission info */}
      <div className="mx-4 mt-4 p-4 bg-primary/5 border border-primary/20 rounded-xl">
        <div className="flex items-center gap-2 mb-1.5">
          <TrendingUp className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">邀请奖励说明</p>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          每成功邀请一位站长，可获得其首月收益的 <span className="text-primary font-semibold">10%</span> 作为佣金奖励。站长持续运营期间，每月额外享受 <span className="text-primary font-semibold">2%</span> 的持续佣金。
        </p>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Invite link */}
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">邀请链接</p>
          <div className="flex gap-2">
            <Input value={inviteLink} readOnly className="flex-1 text-xs bg-muted" />
            <Button
              size="sm"
              onClick={() => copy(inviteLink)}
              className={cn('h-9 gap-1.5 flex-shrink-0', copied ? 'bg-chart-4 hover:bg-chart-4' : 'bg-primary hover:bg-primary/90')}
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? '已复制' : '复制'}
            </Button>
          </div>
        </div>

        {/* Invite code */}
        <div className="flex items-center justify-between p-3 bg-card border border-border rounded-xl">
          <div>
            <p className="text-xs text-muted-foreground">邀请码</p>
            <p className="text-lg font-mono font-black text-foreground tracking-widest">{inviteCode}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => copy(inviteCode)} className="p-2 rounded-lg bg-muted">
              <Copy className="w-4 h-4 text-muted-foreground" />
            </button>
            <button className="p-2 rounded-lg bg-muted">
              <Share2 className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Email invite */}
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">邮件邀请</p>
          <div className="flex gap-2">
            <Input
              placeholder="输入对方邮箱"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="flex-1"
            />
            <Button
              size="sm"
              onClick={sendInvite}
              disabled={!email || sent}
              className={cn('h-9 flex-shrink-0', sent ? 'bg-chart-4 hover:bg-chart-4' : 'bg-primary hover:bg-primary/90')}
            >
              {sent ? '已发送' : '发送'}
            </Button>
          </div>
        </div>

        {/* Invited list */}
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">已邀请站长</p>
          <div className="space-y-2">
            {invited.map(s => (
              <div key={s.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.joinedAt} 加入</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={cn(
                    'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                    s.status === 'active' ? 'bg-chart-4/15 text-chart-4' : 'bg-muted text-muted-foreground'
                  )}>
                    {s.status === 'active' ? '已激活' : '待激活'}
                  </span>
                  {s.status === 'active' && (
                    <p className="text-xs text-primary font-semibold mt-1">佣金 {s.commission}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pb-20" />
    </div>
  )
}
