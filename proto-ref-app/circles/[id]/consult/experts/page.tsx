'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Search, Star, Phone, MessageSquare, Clock, Award } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Expert {
  id: string
  name: string
  avatar: string
  specialty: string
  tags: string[]
  rating: number
  reviewCount: number
  callPrice: number
  textPrice: number
  responseTime: string
  online: boolean
  verified: boolean
  answerCount: number
}

const experts: Expert[] = [
  { id: '1', name: '周易大师', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80', specialty: '八字命理', tags: ['四柱', '流年', '大运'], rating: 4.9, reviewCount: 1256, callPrice: 3, textPrice: 50, responseTime: '5分钟内', online: true, verified: true, answerCount: 3860 },
  { id: '2', name: '张玄风', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80', specialty: '紫微斗数', tags: ['命宫', '四化', '格局'], rating: 4.8, reviewCount: 980, callPrice: 3, textPrice: 30, responseTime: '10分钟内', online: true, verified: true, answerCount: 2540 },
  { id: '3', name: '李玄机', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80', specialty: '易经占卜', tags: ['六十四卦', '梅花', '起卦'], rating: 4.7, reviewCount: 742, callPrice: 2, textPrice: 30, responseTime: '15分钟内', online: false, verified: true, answerCount: 1980 },
  { id: '4', name: '王德华', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80', specialty: '风水堪舆', tags: ['阳宅', '阴宅', '布局'], rating: 4.8, reviewCount: 624, callPrice: 4, textPrice: 80, responseTime: '30分钟内', online: true, verified: true, answerCount: 1560 },
  { id: '5', name: '林奇门', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80', specialty: '奇门遁甲', tags: ['起局', '决策', '事业'], rating: 4.6, reviewCount: 468, callPrice: 2, textPrice: 30, responseTime: '20分钟内', online: false, verified: false, answerCount: 1240 },
]

export default function ConsultExpertsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'online'>('all')

  const filtered = experts.filter(e => {
    const matchOnline = filter === 'all' || e.online
    const matchSearch = !search || e.name.includes(search) || e.specialty.includes(search) || e.tags.some(t => t.includes(search))
    return matchOnline && matchSearch
  })

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h1 className="text-base font-semibold text-foreground">专家列表</h1>
      </header>

      <div className="px-4 pt-4 pb-20">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="搜索专家或专长" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="flex gap-2 mb-4">
          {(['all', 'online'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                filter === f ? 'bg-primary text-white' : 'bg-muted text-foreground')}>
              {f === 'all' ? '全部' : '在线'}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.map(expert => (
            <div key={expert.id} className="p-4 bg-card border border-border rounded-xl">
              <div className="flex gap-3 mb-3">
                <div className="relative flex-shrink-0">
                  <Avatar className="w-14 h-14">
                    <AvatarImage src={expert.avatar} />
                    <AvatarFallback>{expert.name[0]}</AvatarFallback>
                  </Avatar>
                  {expert.online && (
                    <span className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-sm font-semibold text-foreground">{expert.name}</span>
                    {expert.verified && <Award className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                    {expert.online
                      ? <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">在线</span>
                      : <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">离线</span>}
                  </div>
                  <p className="text-xs text-primary mb-1">{expert.specialty}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-amber-400" />{expert.rating}</span>
                    <span>{expert.reviewCount} 评价</span>
                    <span>{expert.answerCount} 次咨询</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-1.5 mb-3 flex-wrap">
                {expert.tags.map(tag => (
                  <span key={tag} className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{tag}</span>
                ))}
              </div>

              <div className="flex items-center justify-between mb-3">
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-0.5"><Phone className="w-3 h-3" />电话 ¥{expert.callPrice}/分钟</span>
                  <span className="flex items-center gap-0.5"><MessageSquare className="w-3 h-3" />图文 ¥{expert.textPrice}/次</span>
                </div>
                <span className="flex items-center gap-0.5 text-xs text-green-600">
                  <Clock className="w-3 h-3" />{expert.responseTime}响应
                </span>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 gap-1">
                  <Phone className="w-3.5 h-3.5" />电话咨询
                </Button>
                <Button size="sm" className="flex-1 gap-1 bg-primary hover:bg-primary/90">
                  <MessageSquare className="w-3.5 h-3.5" />图文咨询
                </Button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-16">暂无符合条件的专家</p>
          )}
        </div>
      </div>
    </div>
  )
}
