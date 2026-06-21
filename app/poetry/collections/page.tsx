'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Heart, BookOpen, Search, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface PoetryItem {
  id: string
  title: string
  author: string
  authorAvatar: string
  dynasty: string
  excerpt: string
  category: string
  likes: number
  liked: boolean
  collectedAt: string
}

const collections: PoetryItem[] = [
  { id: '1', title: '乾卦·象辞', author: '文王', authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40', dynasty: '西周', excerpt: '天行健，君子以自强不息。', category: '易经', likes: 8640, liked: true, collectedAt: '2024-01-20' },
  { id: '2', title: '测字诗', author: '邵雍', authorAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=40', dynasty: '宋', excerpt: '一阴一阳之谓道，继之者善也，成之者性也。', category: '易理', likes: 5280, liked: true, collectedAt: '2024-01-18' },
  { id: '3', title: '清平乐·命理感怀', author: '陈抟', authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40', dynasty: '五代', excerpt: '无极生太极，太极动而生阳，静而生阴…', category: '道学', likes: 3960, liked: false, collectedAt: '2024-01-15' },
  { id: '4', title: '堪舆赋', author: '郭璞', authorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40', dynasty: '晋', excerpt: '气乘风则散，界水则止。古人聚之使不散，行之使有止，故谓之风水。', category: '风水', likes: 2840, liked: true, collectedAt: '2024-01-12' },
  { id: '5', title: '八字论命赋', author: '徐子平', authorAvatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=40', dynasty: '宋', excerpt: '五行者，金木水火土是也，各有生克制化之理。', category: '八字', likes: 2160, liked: false, collectedAt: '2024-01-10' },
]

export default function PoetryCollectionsPage() {
  const router = useRouter()
  const [items, setItems] = useState(collections)
  const [search, setSearch] = useState('')

  const filtered = items.filter(p => p.title.includes(search) || p.author.includes(search) || p.category.includes(search))

  const toggleLike = (id: string) => setItems(prev =>
    prev.map(p => p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p))

  const CATEGORY_COLORS: Record<string, string> = {
    '易经': 'bg-amber-50 text-amber-700',
    '易理': 'bg-amber-50 text-amber-700',
    '道学': 'bg-blue-50 text-blue-700',
    '风水': 'bg-green-50 text-green-700',
    '八字': 'bg-red-50 text-red-700',
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h1 className="text-base font-semibold text-foreground flex-1">诗词集锦</h1>
        <span className="text-xs text-muted-foreground">{items.length} 首</span>
      </header>

      <div className="px-4 pt-4 pb-20">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="搜索诗词" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">暂无收藏</div>
        ) : (
          <div className="space-y-3">
            {filtered.map(poem => (
              <div key={poem.id} className="p-4 bg-card border border-border rounded-xl">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-foreground">{poem.title}</span>
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', CATEGORY_COLORS[poem.category] ?? 'bg-muted text-muted-foreground')}>
                        {poem.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Avatar className="w-4 h-4"><AvatarImage src={poem.authorAvatar} /><AvatarFallback>{poem.author[0]}</AvatarFallback></Avatar>
                      <span>{poem.author} · {poem.dynasty}</span>
                    </div>
                  </div>
                  <button onClick={() => toggleLike(poem.id)}
                    className={cn('flex items-center gap-0.5 text-xs transition-colors', poem.liked ? 'text-red-500' : 'text-muted-foreground')}>
                    <Heart className={cn('w-4 h-4', poem.liked && 'fill-red-500')} />
                    {poem.likes}
                  </button>
                </div>
                <p className="text-sm text-foreground italic leading-relaxed border-l-2 border-primary/40 pl-3">{poem.excerpt}</p>
                <p className="text-[10px] text-muted-foreground mt-2">收藏于 {poem.collectedAt}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
