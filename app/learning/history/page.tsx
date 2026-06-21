'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Play, Clock, BookOpen, ChevronRight, Trash2, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface HistoryItem {
  id: string
  title: string
  instructor: string
  cover: string
  progress: number
  lastChapter: string
  lastTime: string
  totalDuration: string
  category: string
}

const historyItems: HistoryItem[] = [
  { id: '1', title: '八字入门实战课', instructor: '周易大师', cover: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=120', progress: 65, lastChapter: '第5章 十神详解', lastTime: '昨天 14:30', totalDuration: '28小时', category: '八字' },
  { id: '2', title: '紫微斗数精讲', instructor: '张玄风', cover: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=120', progress: 40, lastChapter: '第12章 四化详解', lastTime: '3天前', totalDuration: '36小时', category: '紫微' },
  { id: '3', title: '风水布局入门', instructor: '陈风水', cover: 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=120', progress: 15, lastChapter: '第2章 八宅风水', lastTime: '1周前', totalDuration: '12小时', category: '风水' },
  { id: '4', title: '易经六十四卦解读', instructor: '李玄机', cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=120', progress: 100, lastChapter: '第64章 火水未济', lastTime: '2周前', totalDuration: '48小时', category: '易经' },
  { id: '5', title: '奇门遁甲实战', instructor: '林奇门', cover: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=120', progress: 80, lastChapter: '第18章 奇门选日', lastTime: '3周前', totalDuration: '24小时', category: '奇门' },
]

type TabType = 'all' | 'watching' | 'done'

export default function LearningHistoryPage() {
  const router = useRouter()
  const [items, setItems] = useState(historyItems)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<TabType>('all')

  const filtered = items.filter(h => {
    const matchTab = tab === 'all' ? true : tab === 'done' ? h.progress === 100 : h.progress < 100
    const matchSearch = !search || h.title.includes(search) || h.instructor.includes(search)
    return matchTab && matchSearch
  })

  const remove = (id: string) => setItems(prev => prev.filter(h => h.id !== id))

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h1 className="text-base font-semibold text-foreground flex-1">学习历史</h1>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {([['all','全部'],['watching','学习中'],['done','已完成']] as [TabType, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn('flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors',
              tab === key ? 'text-primary border-primary' : 'text-muted-foreground border-transparent')}>
            {label}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4 pb-20">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="搜索课程" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-muted-foreground">
            <BookOpen className="w-10 h-10 opacity-30 mb-3" />
            <p className="text-sm">暂无学习记录</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(item => (
              <div key={item.id} className="flex gap-3 p-3 bg-card border border-border rounded-xl">
                <div className="relative flex-shrink-0">
                  <img src={item.cover} alt={item.title} className="w-24 h-16 rounded-lg object-cover" />
                  {item.progress === 100
                    ? <span className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center text-white text-xs font-medium">已完成</span>
                    : <span className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center"><Play className="w-3 h-3 text-white fill-white" /></span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground line-clamp-1">{item.title}</span>
                    <button onClick={() => remove(item.id)} className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{item.instructor}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-0.5 mb-2">
                    <Clock className="w-3 h-3" />{item.lastChapter} · {item.lastTime}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                      <div className={cn('h-full rounded-full', item.progress === 100 ? 'bg-green-500' : 'bg-primary')} style={{ width: `${item.progress}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">{item.progress}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
