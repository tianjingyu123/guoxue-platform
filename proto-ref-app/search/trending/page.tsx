'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, TrendingUp, Search, Hash, Flame } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TrendingItem {
  rank: number
  keyword: string
  heat: string
  isHot?: boolean
  isNew?: boolean
}

const trending: TrendingItem[] = [
  { rank: 1,  keyword: '八字命盘解读',       heat: '98.6万', isHot: true },
  { rank: 2,  keyword: '2024甲辰年运势',      heat: '87.3万', isHot: true },
  { rank: 3,  keyword: '紫微斗数命主星',      heat: '76.1万', isHot: true },
  { rank: 4,  keyword: '风水招财布局',        heat: '65.4万' },
  { rank: 5,  keyword: '奇门遁甲入门',        heat: '54.8万', isNew: true },
  { rank: 6,  keyword: '周易六十四卦',        heat: '48.2万' },
  { rank: 7,  keyword: '梅花易数占卜',        heat: '43.6万', isNew: true },
  { rank: 8,  keyword: '生辰八字合婚',        heat: '38.9万' },
  { rank: 9,  keyword: '名字五行起名',        heat: '34.2万' },
  { rank: 10, keyword: '大运流年分析',        heat: '29.8万' },
  { rank: 11, keyword: '十二生肖2024运程',    heat: '26.5万' },
  { rank: 12, keyword: '阴阳宅风水知识',      heat: '22.1万' },
  { rank: 13, keyword: '四柱八字格局',        heat: '18.7万' },
  { rank: 14, keyword: '子平八字用神',        heat: '15.4万' },
  { rank: 15, keyword: '太乙神数推算',        heat: '12.8万', isNew: true },
]

const hotKeywords = ['命理','风水','八字','紫微','易经','生肖','奇门','起名','合婚','择日']

export default function SearchTrendingPage() {
  const router = useRouter()

  const handleSearch = (kw: string) => {
    router.push(`/search?q=${encodeURIComponent(kw)}`)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-base font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />热门搜索
        </h1>
      </header>

      <div className="px-4 pb-20">
        {/* Hot tags */}
        <div className="mt-4 mb-6">
          <div className="flex items-center gap-1.5 mb-3">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-semibold text-foreground">热门话题</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {hotKeywords.map(kw => (
              <button
                key={kw}
                onClick={() => handleSearch(kw)}
                className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary text-sm rounded-full font-medium hover:bg-primary/20 transition-colors"
              >
                <Hash className="w-3 h-3" />{kw}
              </button>
            ))}
          </div>
        </div>

        {/* Trending list */}
        <div className="flex items-center gap-1.5 mb-3">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">实时热搜</span>
        </div>
        <div className="space-y-0 divide-y divide-border bg-card border border-border rounded-xl overflow-hidden">
          {trending.map(item => (
            <button
              key={item.rank}
              onClick={() => handleSearch(item.keyword)}
              className="flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-muted/40 transition-colors"
            >
              <span className={cn(
                'w-6 text-center font-bold text-sm flex-shrink-0',
                item.rank <= 3 ? 'text-primary' : 'text-muted-foreground'
              )}>
                {item.rank}
              </span>
              <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span className="flex-1 text-sm font-medium text-foreground">{item.keyword}</span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {item.isHot && (
                  <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">热</span>
                )}
                {item.isNew && (
                  <span className="text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full font-medium">新</span>
                )}
                <span className="text-xs text-muted-foreground">{item.heat}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
