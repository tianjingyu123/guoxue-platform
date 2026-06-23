'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Camera, ChevronRight, Loader2, Gift, Coins, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

// 加入方式：免费 / 付费（年费）/ 审核
type JoinMethod = 'free' | 'paid' | 'approval'

const JOIN_OPTIONS: { value: JoinMethod; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: 'free',     label: '免费加入', desc: '任何人可自由加入圈子', icon: <Gift className="w-4 h-4" /> },
  { value: 'paid',     label: '付费加入', desc: '按年费制付费后加入',   icon: <Coins className="w-4 h-4" /> },
  { value: 'approval', label: '审核加入', desc: '申请后由圈主审核通过', icon: <Users className="w-4 h-4" /> },
]

const CATEGORIES = ['八字命理', '紫微斗数', '奇门遁甲', '风水堪舆', '易经', '梅花易数', '面相手相', '国学文化', '其他']

export default function CirclesCreatePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [category, setCategory] = useState('')
  const [joinMethod, setJoinMethod] = useState<JoinMethod>('free')
  const [yearlyPrice, setYearlyPrice] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !tags.includes(t) && tags.length < 5) { setTags(prev => [...prev, t]); setTagInput('') }
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = '请输入圈子名称'
    if (name.length > 20) e.name = '名称不超过 20 字'
    if (!desc.trim()) e.desc = '请输入圈子简介'
    if (!category) e.category = '请选择分类'
    if (joinMethod === 'paid' && (!yearlyPrice || Number(yearlyPrice) <= 0)) e.price = '请设置年费价格'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async () => {
    if (!validate()) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 1200))
    setLoading(false)
    router.push('/circles')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h1 className="text-base font-semibold text-foreground">创建圈子</h1>
      </header>

      <div className="px-4 pt-6 pb-28 space-y-6">
        {/* Cover */}
        <div className="flex flex-col items-center gap-2">
          <button className="w-24 h-24 rounded-2xl bg-muted border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:bg-muted/80 transition-colors">
            <Camera className="w-6 h-6 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">添加封面</span>
          </button>
          <p className="text-xs text-muted-foreground">建议尺寸 600×600px</p>
        </div>

        {/* Name */}
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">圈子名称 <span className="text-destructive">*</span></label>
          <Input value={name} onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })) }}
            placeholder="2-20 个字符" maxLength={20}
            className={errors.name ? 'border-destructive' : ''} />
          <div className="flex justify-between mt-1">
            {errors.name ? <p className="text-xs text-destructive">{errors.name}</p> : <span />}
            <span className="text-xs text-muted-foreground">{name.length}/20</span>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">圈子简介 <span className="text-destructive">*</span></label>
          <textarea
            value={desc}
            onChange={e => { setDesc(e.target.value); setErrors(p => ({ ...p, desc: '' })) }}
            placeholder="介绍圈子的主题、目标和特色，吸引更多志同道合的人加入"
            maxLength={200}
            rows={4}
            className={cn('w-full rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors resize-none', errors.desc ? 'border-destructive' : 'border-border')}
          />
          <div className="flex justify-between mt-1">
            {errors.desc ? <p className="text-xs text-destructive">{errors.desc}</p> : <span />}
            <span className="text-xs text-muted-foreground">{desc.length}/200</span>
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">分类 <span className="text-destructive">*</span></label>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => { setCategory(cat); setErrors(p => ({ ...p, category: '' })) }}
                className={cn('px-3 py-1.5 rounded-full text-sm transition-colors border',
                  category === cat ? 'bg-primary text-white border-primary' : 'bg-background text-foreground border-border hover:border-primary/50')}>
                {cat}
              </button>
            ))}
          </div>
          {errors.category && <p className="text-xs text-destructive mt-1">{errors.category}</p>}
        </div>

        {/* Tags */}
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">标签（最多 5 个）</label>
          <div className="flex gap-2 mb-2 flex-wrap">
            {tags.map(t => (
              <span key={t} className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                {t}
                <button onClick={() => setTags(prev => prev.filter(x => x !== t))} className="text-primary/60 hover:text-primary">×</button>
              </span>
            ))}
          </div>
          {tags.length < 5 && (
            <div className="flex gap-2">
              <Input value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTag()}
                placeholder="输入标签后按回车" className="flex-1" />
              <Button variant="outline" onClick={addTag} size="sm">添加</Button>
            </div>
          )}
        </div>

        {/* Join Method */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">加入方式</label>
          <div className="space-y-2">
            {JOIN_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => { setJoinMethod(opt.value); setErrors(p => ({ ...p, price: '' })) }}
                className={cn('w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left',
                  joinMethod === opt.value ? 'border-primary bg-primary/5' : 'border-border bg-card')}>
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                  joinMethod === opt.value ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
                  {opt.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
                <div className={cn('w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center',
                  joinMethod === opt.value ? 'border-primary' : 'border-border')}>
                  {joinMethod === opt.value && <div className="w-2 h-2 rounded-full bg-primary" />}
                </div>
              </button>
            ))}
          </div>

          {/* 付费加入 - 年费价格设置 */}
          {joinMethod === 'paid' && (
            <div className="mt-3 p-3 rounded-xl border border-primary/20 bg-primary/5">
              <label className="text-sm font-medium text-foreground mb-1.5 block">年费价格 <span className="text-destructive">*</span></label>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-primary">¥</span>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={yearlyPrice}
                  onChange={e => { setYearlyPrice(e.target.value); setErrors(p => ({ ...p, price: '' })) }}
                  placeholder="如 199"
                  className={cn('flex-1', errors.price ? 'border-destructive' : '')}
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">元 / 年</span>
              </div>
              {errors.price && <p className="text-xs text-destructive mt-1">{errors.price}</p>}
              <p className="text-xs text-muted-foreground mt-2">成员按年付费加入，到期需续费。价格可在圈子设置中修改，修改后不影响已加入成员。</p>
            </div>
          )}

          {/* 审核加入 - 说明 */}
          {joinMethod === 'approval' && (
            <div className="mt-3 p-3 rounded-xl border border-border bg-secondary/40">
              <p className="text-xs text-muted-foreground leading-relaxed">
                用户点击"申请加入"后提交申请，你可在圈子管理后台的"入圈申请审批"中同意或拒绝。
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Submit */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-background border-t border-border">
        <Button onClick={submit} disabled={loading} className="w-full bg-primary hover:bg-primary/90 h-12 text-base">
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />创建中…</> : '创建圈子'}
        </Button>
      </div>
    </div>
  )
}
