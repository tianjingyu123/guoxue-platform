'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, ChevronRight, Users, TrendingUp, Award, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Step = 'intro' | 'apply' | 'success'

const benefits = [
  { icon: TrendingUp, title: '高额分成',    desc: '最高 70% 课程销售分成，收益实时到账' },
  { icon: Users,      title: '流量支持',    desc: '官方推荐位、首页曝光，快速积累用户' },
  { icon: Award,      title: '品牌背书',    desc: '获得平台认证标志，提升个人品牌影响力' },
  { icon: CheckCircle2, title: '运营支持',  desc: '专属运营团队协助策划课程和内容' },
]

export default function BecomePartnerPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('intro')
  const [form, setForm] = useState({ name: '', phone: '', specialty: '', intro: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!form.name || !form.phone || !form.specialty) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 1500))
    setLoading(false)
    setStep('success')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-base font-semibold text-foreground">成为合作伙伴</h1>
      </header>

      {step === 'intro' && (
        <div className="pb-24">
          {/* Hero */}
          <div className="bg-gradient-to-br from-primary to-primary/80 px-4 py-10 text-white">
            <h2 className="text-2xl font-black mb-2">携手儒布，共创未来</h2>
            <p className="text-sm opacity-90 leading-relaxed">
              加入国学文化传播平台，将您的专业知识变现，影响更多国学爱好者。
            </p>
          </div>

          {/* Benefits */}
          <div className="px-4 mt-6 mb-6 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">合作权益</h3>
            {benefits.map(b => {
              const Icon = b.icon
              return (
                <div key={b.title} className="flex items-start gap-3 p-4 bg-card border border-border rounded-xl">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{b.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{b.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Stats */}
          <div className="mx-4 grid grid-cols-3 gap-3 mb-6">
            {[
              { value: '2,000+', label: '合作讲师' },
              { value: '50万+',  label: '平台用户' },
              { value: '98%',   label: '讲师满意度' },
            ].map(s => (
              <div key={s.label} className="text-center p-3 bg-muted/30 rounded-xl">
                <p className="text-lg font-black text-primary">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-4">
            <Button
              onClick={() => setStep('apply')}
              className="w-full bg-primary hover:bg-primary/90 h-11 text-base font-semibold"
            >
              立即申请 <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {step === 'apply' && (
        <div className="px-4 pt-6 pb-24 space-y-4">
          <h3 className="text-base font-semibold text-foreground mb-1">填写申请信息</h3>
          <p className="text-xs text-muted-foreground mb-4">我们将在 3 个工作日内与您联系。</p>
          {[
            { key: 'name',      label: '姓名',     placeholder: '请输入真实姓名', type: 'text' },
            { key: 'phone',     label: '联系电话',  placeholder: '请输入手机号码', type: 'tel' },
            { key: 'specialty', label: '专业方向',  placeholder: '如：八字命理、风水堪舆', type: 'text' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{f.label}</label>
              <Input
                type={f.type}
                placeholder={f.placeholder}
                value={form[f.key as keyof typeof form]}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
              />
            </div>
          ))}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">个人简介（选填）</label>
            <textarea
              placeholder="请简单介绍您的专业背景和教学经验"
              value={form.intro}
              onChange={e => setForm(prev => ({ ...prev, intro: e.target.value }))}
              className="w-full min-h-[100px] px-3 py-2 text-sm bg-background border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-4">
            <Button
              onClick={handleSubmit}
              disabled={!form.name || !form.phone || !form.specialty || loading}
              className="w-full bg-primary hover:bg-primary/90 h-11 text-base font-semibold"
            >
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />提交中…</> : '提交申请'}
            </Button>
          </div>
        </div>
      )}

      {step === 'success' && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-8 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-5">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">申请已提交</h2>
          <p className="text-sm text-muted-foreground mb-8">
            感谢您的申请！我们的运营团队将在 3 个工作日内通过电话与您联系。
          </p>
          <Button onClick={() => router.push('/')} className="w-full bg-primary hover:bg-primary/90">
            返回首页
          </Button>
        </div>
      )}
    </div>
  )
}
