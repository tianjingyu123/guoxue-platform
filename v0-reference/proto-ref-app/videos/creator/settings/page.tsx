'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, ChevronRight, Bell, Shield, DollarSign, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

type Tab = 'profile' | 'notify' | 'privacy' | 'payment'

export default function CreatorSettingsPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('profile')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [profile, setProfile] = useState({
    nickname: '玄易老师',
    bio: '专注八字命理二十年，著有《现代八字新解》。擅长婚姻、事业、财运分析。',
    specialty: '八字命理、紫微斗数',
    website: '',
  })

  const [notify, setNotify] = useState({
    newFollower: true,
    newComment: true,
    newOrder: true,
    newLike: false,
    system: true,
  })

  const [privacy, setPrivacy] = useState({
    showFollowers: true,
    showFollowing: false,
    allowComment: true,
    allowDm: true,
  })

  const handleSave = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const tabs = [
    { key: 'profile', label: '个人资料', icon: null },
    { key: 'notify',  label: '通知',     icon: null },
    { key: 'privacy', label: '隐私',     icon: null },
    { key: 'payment', label: '收款',     icon: null },
  ] as const

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-base font-semibold text-foreground">创作者设置</h1>
      </header>

      {/* Tab bar */}
      <div className="flex border-b border-border sticky top-12 z-10 bg-background">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex-1 py-3 text-xs font-medium border-b-2 transition-colors',
              tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-5 pb-28">
        {/* Profile */}
        {tab === 'profile' && (
          <div className="space-y-5">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <Avatar className="w-20 h-20">
                  <AvatarImage src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80" />
                  <AvatarFallback>创</AvatarFallback>
                </Avatar>
                <button className="absolute bottom-0 right-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <Upload className="w-3 h-3 text-primary-foreground" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">点击头像更换</p>
            </div>

            {[
              { label: '昵称',    key: 'nickname' },
              { label: '专业领域', key: 'specialty' },
              { label: '个人网站', key: 'website', placeholder: 'https://' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium text-foreground mb-1.5 block">{f.label}</label>
                <Input
                  placeholder={f.placeholder}
                  value={profile[f.key as keyof typeof profile]}
                  onChange={e => setProfile(p => ({ ...p, [f.key]: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
            ))}

            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">个人简介</label>
              <textarea
                value={profile.bio}
                onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                className="w-full min-h-[90px] px-3 py-2 text-sm bg-background border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        )}

        {/* Notify */}
        {tab === 'notify' && (
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            {[
              { key: 'newFollower', label: '新增关注' },
              { key: 'newComment',  label: '评论提醒' },
              { key: 'newOrder',    label: '新订单通知' },
              { key: 'newLike',     label: '点赞提醒' },
              { key: 'system',      label: '系统通知' },
            ].map(n => (
              <div key={n.key} className="flex items-center justify-between px-4 py-3">
                <p className="text-sm text-foreground">{n.label}</p>
                <button
                  onClick={() => setNotify(p => ({ ...p, [n.key]: !p[n.key as keyof typeof notify] }))}
                  className={cn('w-11 h-6 rounded-full transition-colors relative',
                  notify[n.key as keyof typeof notify] ? 'bg-primary' : 'bg-muted'
                )}
                >
                  <span className={cn('absolute top-0.5 w-5 h-5 bg-card rounded-full shadow transition-all',
                    notify[n.key as keyof typeof notify] ? 'right-0.5' : 'left-0.5'
                  )} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Privacy */}
        {tab === 'privacy' && (
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            {[
              { key: 'showFollowers', label: '展示粉丝数' },
              { key: 'showFollowing', label: '展示关注数' },
              { key: 'allowComment',  label: '允许评论' },
              { key: 'allowDm',       label: '允许私信' },
            ].map(p => (
              <div key={p.key} className="flex items-center justify-between px-4 py-3">
                <p className="text-sm text-foreground">{p.label}</p>
                <button
                  onClick={() => setPrivacy(prev => ({ ...prev, [p.key]: !prev[p.key as keyof typeof privacy] }))}
                  className={cn('w-11 h-6 rounded-full transition-colors relative',
                  privacy[p.key as keyof typeof privacy] ? 'bg-primary' : 'bg-muted'
                )}
                >
                  <span className={cn('absolute top-0.5 w-5 h-5 bg-card rounded-full shadow transition-all',
                    privacy[p.key as keyof typeof privacy] ? 'right-0.5' : 'left-0.5'
                  )} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Payment */}
        {tab === 'payment' && (
          <div className="space-y-3">
            {[
              { label: '绑定支付宝收款', icon: DollarSign, value: '已绑定 z***@qq.com' },
              { label: '绑定微信收款',   icon: DollarSign, value: '未绑定' },
              { label: '银行卡提现',     icon: DollarSign, value: '添加银行卡' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-xl">
                <item.icon className="w-4 h-4 text-primary" />
                <div className="flex-1">
                  <p className="text-sm text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.value}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            ))}
            <div className="p-3 bg-muted/40 rounded-xl">
              <p className="text-xs text-muted-foreground leading-relaxed">
                每月 <span className="text-foreground font-medium">1 日</span> 自动结算上月收益，满 <span className="text-foreground font-medium">¥50</span> 即可提现。
              </p>
            </div>
          </div>
        )}
      </div>

      {tab !== 'payment' && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              'w-full h-11 rounded-xl text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2',
              saved ? 'bg-chart-4' : 'bg-primary hover:bg-primary/90'
            )}
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />保存中…</> : saved ? '保存成功' : '保存设置'}
          </button>
        </div>
      )}
    </div>
  )
}
