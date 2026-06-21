'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const specialties = ['八字命理', '紫微斗数', '风水堪舆', '奇门遁甲', '易经', '梅花易数', '六爻', '其他']
const teachTypes = ['线上直播', '线下授课', '录播课程', '一对一咨询', '不限']
const salaries  = ['面议', '500-1000元/次', '1000-3000元/次', '3000元以上/次', '月薪制']

export default function CreateTeacherDemandPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    title: '', specialty: '', teachType: '', salary: '',
    count: '', startDate: '', desc: '', contact: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const valid = form.title && form.specialty && form.teachType && form.desc && form.contact

  const handleSubmit = async () => {
    if (!valid) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 1200))
    setLoading(false)
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-8 text-center">
        <CheckCircle2 className="w-16 h-16 text-chart-4 mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">师资需求已发布</h2>
        <p className="text-sm text-muted-foreground mb-8">
          您的师资需求已发布，平台将向符合条件的讲师推送通知，请留意消息。
        </p>
        <Button onClick={() => router.back()} className="w-full bg-primary hover:bg-primary/90">返回</Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-base font-semibold text-foreground">发布师资需求</h1>
      </header>

      <div className="px-4 pt-6 pb-24 space-y-5">
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">
            职位标题 <span className="text-destructive">*</span>
          </label>
          <Input
            placeholder="如：招募八字命理线上讲师"
            value={form.title}
            onChange={e => update('title', e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            专业方向 <span className="text-destructive">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {specialties.map(s => (
              <button key={s} onClick={() => update('specialty', s)}
                className={cn('px-3 py-1.5 rounded-full text-sm font-medium border transition-all',
                  form.specialty === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border'
                )}>{s}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            授课方式 <span className="text-destructive">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {teachTypes.map(t => (
              <button key={t} onClick={() => update('teachType', t)}
                className={cn('px-3 py-1.5 rounded-full text-sm font-medium border transition-all',
                  form.teachType === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border'
                )}>{t}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">薪酬范围</label>
          <div className="flex flex-wrap gap-2">
            {salaries.map(s => (
              <button key={s} onClick={() => update('salary', s)}
                className={cn('px-3 py-1.5 rounded-full text-sm font-medium border transition-all',
                  form.salary === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border'
                )}>{s}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">招募人数</label>
            <Input placeholder="如：3 人" value={form.count} onChange={e => update('count', e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">开始日期</label>
            <Input type="date" value={form.startDate} onChange={e => update('startDate', e.target.value)} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-foreground">
              岗位要求 <span className="text-destructive">*</span>
            </label>
            <span className="text-xs text-muted-foreground">{form.desc.length}/500</span>
          </div>
          <textarea
            placeholder="请描述对讲师的资质要求、经验要求、工作内容等"
            value={form.desc}
            onChange={e => update('desc', e.target.value.slice(0, 500))}
            className="w-full min-h-[110px] px-3 py-2 text-sm bg-background border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">
            联系方式 <span className="text-destructive">*</span>
          </label>
          <Input
            placeholder="手机号或微信号"
            value={form.contact}
            onChange={e => update('contact', e.target.value)}
          />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-4">
        <Button
          onClick={handleSubmit}
          disabled={!valid || loading}
          className="w-full bg-primary hover:bg-primary/90 h-11 font-semibold"
        >
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />发布中…</> : '发布师资需求'}
        </Button>
      </div>
    </div>
  )
}
