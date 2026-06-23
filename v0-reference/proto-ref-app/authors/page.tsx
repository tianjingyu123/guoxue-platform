'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Search, BookOpen, Users, ChevronRight, Star, Award } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Author {
  id: string
  name: string
  avatar: string
  specialty: string
  tags: string[]
  articles: number
  followers: number
  rating: number
  verified: boolean
  bio: string
}

const authors: Author[] = [
  { id: '1', name: '周易大师', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80', specialty: '八字命理', tags: ['八字', '流年', '大运'], articles: 286, followers: 15800, rating: 4.9, verified: true, bio: '从事命理研究二十余年，擅长四柱八字精析' },
  { id: '2', name: '张玄风', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80', specialty: '紫微斗数', tags: ['紫微', '四化', '斗数'], articles: 194, followers: 12300, rating: 4.8, verified: true, bio: '台湾正宗紫微斗数传承，出版多部斗数专著' },
  { id: '3', name: '李玄机', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80', specialty: '易经', tags: ['易经', '卦象', '占卜'], articles: 152, followers: 9600, rating: 4.7, verified: true, bio: '易学研究者，致力于将易经智慧应用于现代生活' },
  { id: '4', name: '王德华', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80', specialty: '风水堪舆', tags: ['风水', '阳宅', '阴宅'], articles: 128, followers: 7800, rating: 4.8, verified: true, bio: '职业风水师，足迹遍及两岸三地，实操经验丰富' },
  { id: '5', name: '林奇门', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80', specialty: '奇门遁甲', tags: ['奇门', '遁甲', '预测'], articles: 98, followers: 6200, rating: 4.6, verified: false, bio: '专注奇门遁甲研究，擅长事业与决策预测' },
  { id: '6', name: '陈梅花', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80', specialty: '梅花易数', tags: ['梅花', '易数', '起卦'], articles: 74, followers: 4500, rating: 4.5, verified: false, bio: '梅花易数爱好者，致力于普及传统起卦方法' },
]

type Filter = 'all' | 'verified'

export default function AuthorsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<'followers' | 'articles' | 'rating'>('followers')

  const filtered = authors
    .filter(a => {
      const matchVerified = filter === 'all' || a.verified
      const matchSearch = !search || a.name.includes(search) || a.specialty.includes(search) || a.bio.includes(search)
      return matchVerified && matchSearch
    })
    .sort((a, b) => b[sort] - a[sort])

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h1 className="text-base font-semibold text-foreground">作者列表</h1>
      </header>

      <div className="px-4 pt-4 pb-20">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="搜索作者或专长" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            {(['all', 'verified'] as Filter[]).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn('px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                  filter === f ? 'bg-primary text-white' : 'bg-muted text-foreground')}>
                {f === 'all' ? '全部' : '已认证'}
              </button>
            ))}
          </div>
          <select value={sort} onChange={e => setSort(e.target.value as typeof sort)}
            className="text-xs text-muted-foreground bg-transparent border-none outline-none cursor-pointer">
            <option value="followers">按粉丝数</option>
            <option value="articles">按文章数</option>
            <option value="rating">按评分</option>
          </select>
        </div>

        <div className="space-y-3">
          {filtered.map(author => (
            <button key={author.id} onClick={() => router.push(`/authors/${author.id}`)}
              className="w-full flex items-center gap-3 p-4 bg-card border border-border rounded-xl text-left hover:bg-muted/20 transition-colors">
              <Avatar className="w-14 h-14 flex-shrink-0">
                <AvatarImage src={author.avatar} />
                <AvatarFallback>{author.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-sm font-semibold text-foreground">{author.name}</span>
                  {author.verified && <Award className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                  <span className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">{author.specialty}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate mb-2">{author.bio}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-0.5"><BookOpen className="w-3 h-3" />{author.articles} 篇</span>
                  <span className="flex items-center gap-0.5"><Users className="w-3 h-3" />{(author.followers / 1000).toFixed(1)}k 粉丝</span>
                  <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-amber-400" />{author.rating}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
