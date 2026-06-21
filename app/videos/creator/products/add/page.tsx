'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Minus, Upload, Loader2, CheckCircle2, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ProductType = 'video' | 'course' | 'consult' | 'material'

const TYPES: { key: ProductType; label: string; desc: string }[] = [
  { key: 'video',    label: '付费视频',  desc: '单个或系列付费视频' },
  { key: 'course',   label: '课程套餐',  desc: '多视频组合成课程' },
  { key: 'consult',  label: '咨询服务',  desc: '一对一在线咨询' },
  { key: 'material', label: '资料包',    desc: '文档/图片等学习资料' },
]

export default function AddProductPage() {
  const router = useRouter()
  const [type, setType] = useState<ProductType>('video')
  const [form, setForm] = useState({
    title: '', desc: '', price: '', originalPrice: '',
    stock: '', cover: '',
  })
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const valid = form.title && form.price

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput('')
  }

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
        <h2 className="text-xl font-bold text-foreground mb-2">商品已添加</h2>
        <p className="text-sm text-muted-foreground mb-8">您的商品已成功发布，用户可以在您的主页中看到。</p>
        <Button onClick={() => router.back()} className="w-full bg-primary hover:bg-primary/90">返回商品列表</Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-base font-semibold text-foreground">添加商品</h1>
      </header>

      <div className="px-4 pt-5 pb-24 space-y-5">
        {/* Product type */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">商品类型</label>
          <div className="grid grid-cols-2 gap-2">
            {TYPES.map(t => (
              <button
                key={t.key}
                onClick={() => setType(t.key)}
                className={cn(
                  'p-3 text-left rounded-xl border transition-all',
                  type === t.key ? 'border-primary bg-primary/5' : 'border-border bg-card'
                )}
              >
                <p className={cn('text-sm font-semibold', type === t.key ? 'text-primary' : 'text-foreground')}>{t.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Cover */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">封面图片</label>
          <div className="h-32 bg-muted/50 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Upload className="w-6 h-6" />
            <span className="text-xs">点击上传封面图</span>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">
            商品标题 <span className="text-destructive">*</span>
          </label>
          <Input placeholder="请输入商品名称" value={form.title} onChange={e => update('title', e.target.value)} />
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">商品描述</label>
          <textarea
            placeholder="详细描述商品内容、适合人群、学习收获等"
            value={form.desc}
            onChange={e => update('desc', e.target.value)}
            className="w-full min-h-[90px] px-3 py-2 text-sm bg-background border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Price */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              售价（元）<span className="text-destructive">*</span>
            </label>
            <Input type="number" placeholder="0.00" value={form.price} onChange={e => update('price', e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">原价（元）</label>
            <Input type="number" placeholder="0.00（可选）" value={form.originalPrice} onChange={e => update('originalPrice', e.target.value)} />
          </div>
        </div>

        {/* Stock */}
        {type === 'consult' && (
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">库存数量</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => update('stock', String(Math.max(0, Number(form.stock) - 1)))}
                className="w-9 h-9 border border-border rounded-lg flex items-center justify-center"
              >
                <Minus className="w-4 h-4 text-foreground" />
              </button>
              <Input
                type="number"
                className="flex-1 text-center"
                value={form.stock}
                onChange={e => update('stock', e.target.value)}
                placeholder="不限"
              />
              <button
                onClick={() => update('stock', String(Number(form.stock || 0) + 1))}
                className="w-9 h-9 border border-border rounded-lg flex items-center justify-center"
              >
                <Plus className="w-4 h-4 text-foreground" />
              </button>
            </div>
          </div>
        )}

        {/* Tags */}
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">商品标签</label>
          <div className="flex gap-2 mb-2">
            <Input
              placeholder="输入标签后回车添加"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTag()}
            />
            <button onClick={addTag} className="px-3 py-2 text-sm text-primary-foreground bg-primary rounded-lg flex-shrink-0">添加</button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                  {tag}
                  <button onClick={() => setTags(prev => prev.filter(t => t !== tag))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-4">
        <Button
          onClick={handleSubmit}
          disabled={!valid || loading}
          className="w-full bg-primary hover:bg-primary/90 h-11 font-semibold"
        >
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />发布中…</> : '发布商品'}
        </Button>
      </div>
    </div>
  )
}
