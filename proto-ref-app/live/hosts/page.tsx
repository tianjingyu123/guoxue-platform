'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Search, Radio, Users, Heart, ChevronRight, Star } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Host {
  id: string
  name: string
  avatar: string
  cover: string
  specialty: string
  followers: number
  likes: number
  liveCount: number
  rating: number
  isLive: boolean
  viewerCount?: number
  tags: string[]
  verified: boolean
}

const hosts: Host[] = [
  { id: '1', name: '易道先生', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80', cover: 'https://images.unsplash.com/photo-1588666309990-d68f08e3d4a6?w=300', specialty: '八字命理知识直播', followers: 128000, likes: 960000, liveCount: 286, rating: 4.9, isLive: true, viewerCount: 12580, tags: ['八字', '流年', '命理'], verified: true },
  { id: '2', name: '福缘阁主', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80', cover: 'https://images.unsplash.com/photo-1515488764276-beab7607c1e6?w=300', specialty: '吉祥物电商直播', followers: 96400, likes: 780000, liveCount: 198, rating: 4.8, isLive: true, viewerCount: 8920, tags: ['吉祥物', '开光', '风水'], verified: true },
  { id: '3', name: '晶缘坊', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80', cover: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300', specialty: '天然水晶珠宝直播', followers: 74600, likes: 620000, liveCount: 156, rating: 4.7, isLive: true, viewerCount: 5630, tags: ['水晶', '珠宝', '开运'], verified: false },
  { id: '4', name: '玄学居士', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80', cover: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300', specialty: '紫微斗数授课直播', followers: 58200, likes: 486000, liveCount: 124, rating: 4.8, isLive: false, tags: ['紫微', '斗数', '命理'], verified: true },
  { id: '5', name: '王先生讲风水', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80', cover: 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=300', specialty: '风水堪舆讲解', followers: 42800, likes: 356000, liveCount: 98, rating: 4.6, isLive: false, tags: ['风水', '堪舆', '布局'], verified: false },
]

type Filter = 'all' | 'live' | 'followed'

export default function LiveHostsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = hosts.filter(h => {
    const matchFilter = filter === 'all' ? true : filter === 'live' ? h.isLive : false
    const matchSearch = !search || h.name.includes(search) || h.specialty.includes(search) || h.tags.some(t => t.includes(search))
    return matchFilter && matchSearch
  })

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h1 className="text-base font-semibold text-foreground">主播列表</h1>
      </header>

      <div className="px-4 pt-4 pb-20">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="搜索主播" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="flex gap-2 mb-4">
          {(['all', 'live', 'followed'] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                filter === f ? 'bg-primary text-white' : 'bg-muted text-foreground')}>
              {f === 'all' ? '全部' : f === 'live' ? '直播中' : '已关注'}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.map(host => (
            <button key={host.id} onClick={() => router.push(`/live/${host.id}`)}
              className="w-full rounded-xl overflow-hidden border border-border bg-card text-left hover:bg-muted/20 transition-colors">
              <div className="relative h-32">
                <img src={host.cover} alt={host.name} className="w-full h-full object-cover" />
                {host.isLive && (
                  <div className="absolute inset-0 bg-black/30 flex items-start justify-between p-2">
                    <span className="flex items-center gap-1 text-white bg-red-500 text-xs px-2 py-0.5 rounded-full">
                      <Radio className="w-2.5 h-2.5" />直播中
                    </span>
                    <span className="flex items-center gap-1 text-white bg-black/50 text-xs px-2 py-0.5 rounded-full">
                      <Users className="w-2.5 h-2.5" />{(host.viewerCount! / 1000).toFixed(1)}k 在看
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 p-3">
                <Avatar className="w-12 h-12 flex-shrink-0 border-2 border-background -mt-6">
                  <AvatarImage src={host.avatar} />
                  <AvatarFallback>{host.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 mt-0">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-sm font-semibold text-foreground">{host.name}</span>
                    {host.verified && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">认证</span>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mb-1">{host.specialty}</p>
                  <div className="flex gap-2 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-0.5"><Users className="w-3 h-3" />{(host.followers / 1000).toFixed(0)}k 粉丝</span>
                    <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" />{(host.likes / 10000).toFixed(0)}w 获赞</span>
                    <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-amber-400" />{host.rating}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
