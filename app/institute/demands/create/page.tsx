'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const categories = ['课程合作', '内容创作', '讲师邀约', '联合运营', '品牌推广', '其他']
const budgets = ['面议', '1万以内', '1-5万', '5-10万', '10万以上']

export default function CreateDemandPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    title: '', category: '', budget: '', deadline: '',
    desc: '', contact: '', contactName: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const valid = form.title && form.category && form.desc && form.contact

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
        <h2 className="text-xl font-bold text-foreground mb-2">需求已发布</h2>
        <p className="text-sm text-muted-foreground mb-8">
          您的需求已成功发布，平台将为您匹配合适的合作资源，请留意消息通知。
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
        <h1 className="text-base font-semibold text-foreground">发布需求</h1>
      </header>

      <div className="px-4 pt-6 pb-24 space-y-5">
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">
            需求标题 <span className="text-destructive">*</span>
          </label>
          <Input
            placeholder="简明扼要描述您的需求，如：招募命理类课程合作讲师"
            value={form.title}
            onChange={e => update('title', e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            需求类型 <span className="text-destructive">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map(c => (
              <button
                key={c}
                onClick={() => update('category', c)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium border transition-all',
                  form.category === c ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border'
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">预算范围</label>
          <div className="flex flex-wrap gap-2">
            {budgets.map(b => (
              <button
                key={b}
                onClick={() => update('budget', b)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium border transition-all',
                  form.budget === b ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border'
                )}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">截止日期</label>
          <Input
            type="date"
            value={form.deadline}
            onChange={e => update('deadline', e.target.value)}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-foreground">
              需求详情 <span className="text-destructive">*</span>
            </label>
            <span className="text-xs text-muted-foreground">{form.desc.length}/500</span>
          </div>
          <textarea
            placeholder="详细描述您的需求内容、合作方式、期望效果等"
            value={form.desc}
            onChange={e => update('desc', e.target.value.slice(0, 500))}
            className="w-full min-h-[120px] px-3 py-2 text-sm bg-background border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">联系人</label>
          <Input
            placeholder="请输入联系人姓名"
            value={form.contactName}
            onChange={e => update('contactName', e.target.value)}
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
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />发布中…</> : '发布需求'}
        </Button>
      </div>
    </div>
  )
}
