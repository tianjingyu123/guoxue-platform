'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronRight, Shield, CreditCard, FileText, LogOut, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export default function OperatorSettingsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState({ revenue: true, station: true, system: false })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [profile, setProfile] = useState({
    name: '运营商张总',
    phone: '138****8888',
    email: 'zhang@example.com',
    company: '儒布文化传播有限公司',
  })

  const handleSave = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-base font-semibold text-foreground">运营商设置</h1>
      </header>

      <div className="px-4 pt-4 pb-24 space-y-6">
        {/* Profile */}
        <section>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-1">基本信息</p>
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            {[
              { label: '运营商名称', key: 'name' },
              { label: '联系手机', key: 'phone' },
              { label: '邮箱地址', key: 'email' },
              { label: '公司名称', key: 'company' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-muted-foreground block mb-1">{f.label}</label>
                <Input
                  value={profile[f.key as keyof typeof profile]}
                  onChange={e => setProfile(p => ({ ...p, [f.key]: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
            ))}
            <button
              onClick={handleSave}
              disabled={saving}
              className={cn(
                'w-full mt-2 h-10 rounded-lg text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2',
                saved ? 'bg-chart-4' : 'bg-primary hover:bg-primary/90'
              )}
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" />保存中…</> : saved ? '保存成功' : '保存修改'}
            </button>
          </div>
        </section>

        {/* Notifications */}
        <section>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-1">消息通知</p>
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            {[
              { key: 'revenue', label: '收益到账通知' },
              { key: 'station', label: '站长动态通知' },
              { key: 'system',  label: '系统公告通知' },
            ].map(n => (
              <div key={n.key} className="flex items-center justify-between px-4 py-3">
                <p className="text-sm text-foreground">{n.label}</p>
                <button
                  onClick={() => setNotifications(p => ({ ...p, [n.key]: !p[n.key as keyof typeof notifications] }))}
                  className={cn(
                    'w-11 h-6 rounded-full transition-colors relative',
                    notifications[n.key as keyof typeof notifications] ? 'bg-primary' : 'bg-muted'
                  )}
                >
                  <span className={cn(
                    'absolute top-0.5 w-5 h-5 bg-card rounded-full shadow transition-all',
                    notifications[n.key as keyof typeof notifications] ? 'right-0.5' : 'left-0.5'
                  )} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Account */}
        <section>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-1">账号安全</p>
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            {[
              { icon: <Shield className="w-4 h-4 text-primary" />, label: '修改密码' },
              { icon: <CreditCard className="w-4 h-4 text-primary" />, label: '绑定银行卡' },
              { icon: <FileText className="w-4 h-4 text-primary" />, label: '运营协议' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 px-4 py-3">
                {item.icon}
                <span className="text-sm text-foreground flex-1">{item.label}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </section>

        {/* Logout */}
        <section>
          <div className="bg-card border border-destructive/30 rounded-xl divide-y divide-border">
            <button className="flex items-center gap-3 px-4 py-3 w-full text-left">
              <LogOut className="w-4 h-4 text-destructive" />
              <span className="text-sm text-destructive font-medium">退出登录</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
