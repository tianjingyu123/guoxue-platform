'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Search, X, Play, Eye, Clock, TrendingUp } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface VideoResult {
  id: string
  title: string
  author: string
  authorAvatar: string
  cover: string
  duration: string
  views: number
  publishedAt: string
  category: string
}

const HOT_KEYWORDS = ['八字入门', '紫微斗数', '奇门遁甲', '风水布局', '易经', '流年运势', '命理基础', '面相手相']

const searchResults: VideoResult[] = [
  { id: '1', title: '八字入门：四柱八字基础讲解', author: '周易大师', authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40', cover: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=300&h=160&fit=crop', duration: '28:35', views: 128500, publishedAt: '3天前', category: '八字' },
  { id: '2', title: '紫微斗数十四主星全解析', author: '张玄风', authorAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=40', cover: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300&h=160&fit=crop', duration: '45:12', views: 98200, publishedAt: '1周前', category: '紫微' },
  { id: '3', title: '奇门遁甲九宫布局实战课', author: '林奇门', authorAvatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=40', cover: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300&h=160&fit=crop', duration: '32:48', views: 76400, publishedAt: '2周前', category: '奇门' },
  { id: '4', title: '风水布局：阳宅财位实操讲解', author: '王德华', authorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40', cover: 'https://images.unsplash.com/photo-1502943693086-33b5b1cfdf2f?w=300&h=160&fit=crop', duration: '22:16', views: 62300, publishedAt: '3周前', category: '风水' },
]

export default function VideoSearchPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [searched, setSearched] = useState(false)
  const [history, setHistory] = useState(['八字命理', '紫微斗数入门', '流年运势2024'])
  const inputRef = useRef<HTMLInputElement>(null)

  const doSearch = (q: string) => {
    if (!q.trim()) return
    setQuery(q)
    setSearched(true)
    if (!history.includes(q)) setHistory(prev => [q, ...prev].slice(0, 10))
  }

  const clearHistory = () => setHistory([])

  const filtered = searchResults.filter(v =>
    !query || v.title.toLowerCase().includes(query.toLowerCase()) || v.category.includes(query)
  )

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-2">
        <button onClick={() => router.back()}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <div className="flex-1 flex items-center gap-2 bg-muted rounded-xl px-3 h-9">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            placeholder="搜索视频"
            value={query}
            autoFocus
            onChange={e => { setQuery(e.target.value); setSearched(false) }}
            onKeyDown={e => e.key === 'Enter' && doSearch(query)}
          />
          {query && <button onClick={() => { setQuery(''); setSearched(false) }}><X className="w-4 h-4 text-muted-foreground" /></button>}
        </div>
        <button onClick={() => doSearch(query)} className="text-primary text-sm font-medium">搜索</button>
      </header>

      <div className="px-4 pt-4 pb-20">
        {!searched ? (
          <>
            {history.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-foreground">搜索历史</span>
                  <button onClick={clearHistory} className="text-xs text-muted-foreground flex items-center gap-0.5">
                    <X className="w-3 h-3" />清空
                  </button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {history.map(h => (
                    <button key={h} onClick={() => doSearch(h)} className="text-sm px-3 py-1.5 rounded-full bg-muted text-foreground hover:bg-muted/80 transition-colors">{h}</button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">热门搜索</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {HOT_KEYWORDS.map((kw, i) => (
                  <button key={kw} onClick={() => doSearch(kw)}
                    className={cn('text-sm px-3 py-1.5 rounded-full transition-colors',
                      i < 3 ? 'bg-primary/10 text-primary font-medium' : 'bg-muted text-foreground')}>
                    {i < 3 && <span className="text-primary font-bold mr-1">{i + 1}</span>}{kw}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-4">找到 {filtered.length} 个相关视频</p>
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground text-sm">未找到相关视频</div>
            ) : (
              <div className="space-y-4">
                {filtered.map(video => (
                  <button key={video.id} onClick={() => router.push(`/videos/${video.id}`)} className="w-full text-left">
                    <div className="relative rounded-xl overflow-hidden mb-2">
                      <img src={video.cover} alt={video.title} className="w-full h-44 object-cover" />
                      <span className="absolute bottom-2 right-2 text-xs text-white bg-black/70 px-1.5 py-0.5 rounded">
                        {video.duration}
                      </span>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center">
                          <Play className="w-6 h-6 text-white fill-white" />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Avatar className="w-8 h-8 flex-shrink-0 mt-0.5">
                        <AvatarImage src={video.authorAvatar} />
                        <AvatarFallback>{video.author[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground line-clamp-2 mb-1">{video.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{video.author}</span>
                          <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{(video.views / 1000).toFixed(1)}k</span>
                          <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{video.publishedAt}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
