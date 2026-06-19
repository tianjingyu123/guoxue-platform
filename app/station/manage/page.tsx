'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Settings, Bell, Shield,
  Globe, FileText, ChevronRight, Loader2, ShoppingBag
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { FeatureGate } from '@/components/feature/feature-gate'
import { mockCircleFeatures } from '@/lib/feature-permissions'

export default function StationManagePage() {
  const router = useRouter()
  const [active, setActive] = useState<'basic' | 'domain' | 'notify' | 'security'>('basic')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [basic, setBasic] = useState({
    name: '儒布命理文化站',
    slogan: '传承国学智慧，点亮人生方向',
    intro: '专注于传统命理文化传播与学习，汇聚百位名师，覆盖八字、紫微、风水等多个领域。',
    contactEmail: 'admin@station.com',
    contactPhone: '138-0000-1234',
  })

  const [domain, setDomain] = useState({ custom: 'minglijia.com', ssl: true })
  const [features, setFeatures] = useState({
    comment: true, share: true, community: true, ai: false, offline: true
  })
  const [notify, setNotify] = useState({
    newUser: true, newOrder: true, newReview: false, lowStock: true
  })

  const handleSave = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 900))
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const tabs = [
    { key: 'basic',    label: '基本信息', icon: Settings },
    { key: 'domain',   label: '域名功能', icon: Globe },
    { key: 'notify',   label: '通知设置', icon: Bell },
    { key: 'security', label: '安全设置', icon: Shield },
  ] as const

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-base font-semibold text-foreground">站点管理</h1>
      </header>

      {/* Tab bar */}
      <div className="flex border-b border-border bg-background sticky top-12 z-10 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0',
              active === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            )}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-5 pb-28">
        {/* Basic */}
        {active === 'basic' && (
          <div className="space-y-4">
            {[
              { label: '站点名称', key: 'name' },
              { label: '站点标语', key: 'slogan' },
              { label: '联系邮箱', key: 'contactEmail' },
              { label: '联系电话', key: 'contactPhone' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium text-foreground mb-1.5 block">{f.label}</label>
                <Input
                  value={basic[f.key as keyof typeof basic]}
                  onChange={e => setBasic(p => ({ ...p, [f.key]: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">站点介绍</label>
              <textarea
                value={basic.intro}
                onChange={e => setBasic(p => ({ ...p, intro: e.target.value }))}
                className="w-full min-h-[90px] px-3 py-2 text-sm bg-background border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <p className="text-xs font-semibold text-foreground pt-2">功能开关</p>
            <div className="bg-card border border-border rounded-xl divide-y divide-border">
              {[
                { key: 'comment',   label: '评论功能' },
                { key: 'share',     label: '分享功能' },
                { key: 'community', label: '圈子社区' },
                { key: 'ai',        label: 'AI 助手（Beta）' },
                { key: 'offline',   label: '线下活动' },
              ].map(f => (
                <div key={f.key} className="flex items-center justify-between px-4 py-3">
                  <p className="text-sm text-foreground">{f.label}</p>
                  <button
                    onClick={() => setFeatures(p => ({ ...p, [f.key]: !p[f.key as keyof typeof features] }))}
                    className={cn('w-11 h-6 rounded-full transition-colors relative',
                      features[f.key as keyof typeof features] ? 'bg-primary' : 'bg-muted'
                    )}
                  >
                    <span className={cn('absolute top-0.5 w-5 h-5 bg-card rounded-full shadow transition-all',
                      features[f.key as keyof typeof features] ? 'right-0.5' : 'left-0.5'
                    )} />
                  </button>
                </div>
              ))}
            </div>

            {/* 高级功能 - 电商直播（需向平台申请） */}
            <p className="text-xs font-semibold text-foreground pt-2">高级功能</p>
            <FeatureGate
              feature={mockCircleFeatures.ecommerce_live}
              variant="card"
              icon={<ShoppingBag className="w-5 h-5 text-[#C41E3A]" />}
              onUse={() => router.push('/station/live')}
            />
          </div>
        )}

        {/* Domain */}
        {active === 'domain' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">自定义域名</label>
              <div className="flex gap-2">
                <Input value={domain.custom} onChange={e => setDomain(p => ({ ...p, custom: e.target.value }))} className="flex-1" placeholder="example.com" />
                <button className="px-3 py-2 text-xs text-primary-foreground bg-primary rounded-lg whitespace-nowrap">验证</button>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">请将 CNAME 记录指向 cname.rebu.com</p>
            </div>
            <div className="flex items-center justify-between p-3 bg-card border border-border rounded-xl">
              <div>
                <p className="text-sm text-foreground">SSL 证书</p>
                <p className="text-xs text-muted-foreground mt-0.5">自动签发 HTTPS 证书</p>
              </div>
              <button
                onClick={() => setDomain(p => ({ ...p, ssl: !p.ssl }))}
                className={cn('w-11 h-6 rounded-full transition-colors relative', domain.ssl ? 'bg-primary' : 'bg-muted')}
              >
                <span className={cn('absolute top-0.5 w-5 h-5 bg-card rounded-full shadow transition-all', domain.ssl ? 'right-0.5' : 'left-0.5')} />
              </button>
            </div>
            <div className="p-3 bg-muted/50 rounded-xl">
              <p className="text-xs font-medium text-foreground mb-1">当前访问地址</p>
              <p className="text-xs text-primary font-mono">https://rebu.com/s/station001</p>
            </div>
          </div>
        )}

        {/* Notify */}
        {active === 'notify' && (
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            {[
              { key: 'newUser',   label: '新用户注册',  desc: '有新用户加入站点时通知' },
              { key: 'newOrder',  label: '新订单提醒',  desc: '有用户下单时通知' },
              { key: 'newReview', label: '新评价通知',  desc: '有用户发表评价时通知' },
              { key: 'lowStock',  label: '库存预警',    desc: '商品剩余库存不足时通知' },
            ].map(n => (
              <div key={n.key} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1">
                  <p className="text-sm text-foreground">{n.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.desc}</p>
                </div>
                <button
                  onClick={() => setNotify(p => ({ ...p, [n.key]: !p[n.key as keyof typeof notify] }))}
                  className={cn('w-11 h-6 rounded-full transition-colors relative flex-shrink-0',
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

        {/* Security */}
        {active === 'security' && (
          <div className="space-y-3">
            {[
              { label: '修改登录密码', icon: Shield },
              { label: '绑定双重验证',  icon: Shield },
              { label: '操作日志',       icon: FileText },
              { label: '数据备份与导出', icon: FileText },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-xl">
                <item.icon className="w-4 h-4 text-primary" />
                <span className="text-sm text-foreground flex-1">{item.label}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            ))}
            <div className="p-3 mt-2 bg-destructive/5 border border-destructive/20 rounded-xl">
              <p className="text-sm font-semibold text-destructive mb-1">危险操作</p>
              <p className="text-xs text-muted-foreground mb-3">以下操作不可撤销，请谨慎操作</p>
              <button className="w-full py-2 text-xs text-destructive border border-destructive/40 rounded-lg font-medium">
                申请注销站点
              </button>
            </div>
          </div>
        )}
      </div>

      {active !== 'security' && (
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
