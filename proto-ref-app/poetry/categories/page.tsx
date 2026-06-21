'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronRight } from 'lucide-react'

interface Category {
  id: string
  name: string
  icon: string
  desc: string
  count: number
  subCategories: string[]
}

const categories: Category[] = [
  { id: '1', name: '古典诗词', icon: '📜', desc: '唐诗宋词元曲，品读千年文学之美', count: 12840, subCategories: ['唐诗', '宋词', '元曲', '明清诗词'] },
  { id: '2', name: '易经诗歌', icon: '☯️', desc: '以易经为题材的古今诗词创作', count: 3260, subCategories: ['六十四卦吟', '易理诗', '现代易诗'] },
  { id: '3', name: '命理赋文', icon: '✨', desc: '命理学经典赋文，文字优美意蕴深远', count: 1480, subCategories: ['命赋', '星赋', '格局赋'] },
  { id: '4', name: '风水诗歌', icon: '🏔️', desc: '以山川地理为题材的风水诗词', count: 980, subCategories: ['山水诗', '地理赋', '堪舆歌诀'] },
  { id: '5', name: '节气民俗', icon: '🌸', desc: '二十四节气及民俗文化相关诗词', count: 2160, subCategories: ['节气诗', '民俗词', '时令歌'] },
  { id: '6', name: '星象天文', icon: '🌟', desc: '古代天文星象相关诗词', count: 760, subCategories: ['星宿诗', '天象赋', '历法歌'] },
  { id: '7', name: '道家玄学', icon: '🌀', desc: '道家哲学与玄学思想诗词', count: 1840, subCategories: ['老庄诗', '玄学词', '丹道诗'] },
  { id: '8', name: '现代创作', icon: '✍️', desc: '当代作者以传统文化为题的现代诗词', count: 5680, subCategories: ['现代诗', '新古风', '仿古词'] },
]

export default function PoetryCategoriesPage() {
  const router = useRouter()
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h1 className="text-base font-semibold text-foreground">诗词分类</h1>
      </header>

      <div className="px-4 pt-4 pb-20 space-y-3">
        {categories.map(cat => (
          <button key={cat.id} onClick={() => router.push(`/poetry/categories/${cat.id}`)}
            className="w-full flex items-center gap-4 p-4 bg-card border border-border rounded-xl text-left hover:bg-muted/20 transition-colors">
            <span className="text-3xl flex-shrink-0">{cat.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="text-sm font-semibold text-foreground">{cat.name}</span>
                <span className="text-xs text-muted-foreground">{cat.count.toLocaleString()} 首</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{cat.desc}</p>
              <div className="flex gap-1.5 flex-wrap">
                {cat.subCategories.map(s => (
                  <span key={s} className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{s}</span>
                ))}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  )
}
