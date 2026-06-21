'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Trophy, Medal, Award, Crown } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type RankTab = 'members' | 'active' | 'quality'

const rankData: Record<RankTab, {
  id: string; rank: number; name: string; cover: string
  value: string; subValue: string; category: string; owner: string
}[]> = {
  members: [
    { id: '4', rank: 1, name: '易经研究会', cover: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=200&h=200&fit=crop', value: '15,200', subValue: '成员', category: '易学', owner: '李玄机' },
    { id: '1', rank: 2, name: '八字命理研习社', cover: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop', value: '12,580', subValue: '成员', category: '命理', owner: '周易大师' },
    { id: '2', rank: 3, name: '紫微斗数学院', cover: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=200&h=200&fit=crop', value: '8,960', subValue: '成员', category: '命理', owner: '张玄风' },
    { id: '3', rank: 4, name: '风水堪舆交流', cover: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=200&h=200&fit=crop', value: '6,320', subValue: '成员', category: '风水', owner: '王德华' },
    { id: '6', rank: 5, name: '国学文化圈', cover: 'https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?w=200&h=200&fit=crop', value: '5,870', subValue: '成员', category: '国学', owner: '陈学文' },
    { id: '5', rank: 6, name: '奇门遁甲精研', cover: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=200&h=200&fit=crop', value: '4,580', subValue: '成员', category: '命理', owner: '林奇门' },
    { id: '7', rank: 7, name: '六爻神断', cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=200&h=200&fit=crop', value: '3,920', subValue: '成员', category: '命理', owner: '赵六爻' },
    { id: '8', rank: 8, name: '梅花易数', cover: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=200&h=200&fit=crop', value: '3,240', subValue: '成员', category: '易学', owner: '钱梅花' },
  ],
  active: [
    { id: '1', rank: 1, name: '八字命理研习社', cover: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop', value: '3,256', subValue: '今日帖子', category: '命理', owner: '周易大师' },
    { id: '2', rank: 2, name: '紫微斗数学院', cover: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=200&h=200&fit=crop', value: '2,890', subValue: '今日帖子', category: '命理', owner: '张玄风' },
    { id: '4', rank: 3, name: '易经研究会', cover: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=200&h=200&fit=crop', value: '2,560', subValue: '今日帖子', category: '易学', owner: '李玄机' },
    { id: '3', rank: 4, name: '风水堪舆交流', cover: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=200&h=200&fit=crop', value: '1,980', subValue: '今日帖子', category: '风水', owner: '王德华' },
    { id: '6', rank: 5, name: '国学文化圈', cover: 'https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?w=200&h=200&fit=crop', value: '1,750', subValue: '今日帖子', category: '国学', owner: '陈学文' },
    { id: '5', rank: 6, name: '奇门遁甲精研', cover: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=200&h=200&fit=crop', value: '1,320', subValue: '今日帖子', category: '命理', owner: '林奇门' },
    { id: '7', rank: 7, name: '六爻神断', cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=200&h=200&fit=crop', value: '980', subValue: '今日帖子', category: '命理', owner: '赵六爻' },
    { id: '8', rank: 8, name: '梅花易数', cover: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=200&h=200&fit=crop', value: '860', subValue: '今日帖子', category: '易学', owner: '钱梅花' },
  ],
  quality: [
    { id: '2', rank: 1, name: '紫微斗数学院', cover: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=200&h=200&fit=crop', value: '98.5%', subValue: '精华率', category: '命理', owner: '张玄风' },
    { id: '4', rank: 2, name: '易经研究会', cover: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=200&h=200&fit=crop', value: '96.2%', subValue: '精华率', category: '易学', owner: '李玄机' },
    { id: '1', rank: 3, name: '八字命理研习社', cover: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop', value: '95.8%', subValue: '精华率', category: '命理', owner: '周易大师' },
    { id: '5', rank: 4, name: '奇门遁甲精研', cover: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=200&h=200&fit=crop', value: '94.1%', subValue: '精华率', category: '命理', owner: '林奇门' },
    { id: '3', rank: 5, name: '风水堪舆交流', cover: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=200&h=200&fit=crop', value: '93.5%', subValue: '精华率', category: '风水', owner: '王德华' },
    { id: '6', rank: 6, name: '国学文化圈', cover: 'https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?w=200&h=200&fit=crop', value: '92.0%', subValue: '精华率', category: '国学', owner: '陈学文' },
    { id: '8', rank: 7, name: '梅花易数', cover: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=200&h=200&fit=crop', value: '91.3%', subValue: '精华率', category: '易学', owner: '钱梅花' },
    { id: '7', rank: 8, name: '六爻神断', cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=200&h=200&fit=crop', value: '89.7%', subValue: '精华率', category: '命理', owner: '赵六爻' },
  ],
}

export default function CirclesRankingPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<RankTab>('members')

  const tabs: { value: RankTab; label: string }[] = [
    { value: 'members', label: '成员数' },
    { value: 'active', label: '最活跃' },
    { value: 'quality', label: '高质量' },
  ]

  const list = rankData[activeTab]
  const top3 = list.slice(0, 3)
  const rest = list.slice(3)

  return (
    <div className="min-h-screen bg-background">
      {/* 渐变顶部 */}
      <div className="bg-gradient-to-br from-[#C41E3A] to-[#8B0000] px-4 pt-12 pb-16">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()}>
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white flex-1">圈子排行榜</h1>
          <Trophy className="w-6 h-6 text-amber-300" />
        </div>
        {/* Tab */}
        <div className="flex bg-white/10 rounded-xl p-1 gap-1">
          {tabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === tab.value ? 'bg-white text-[#C41E3A]' : 'text-white/80'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 前3名台阶式展示 */}
      <div className="-mt-10 px-4 mb-4">
        <div className="grid grid-cols-3 gap-2">
          {/* 第2名 */}
          <div className="flex flex-col items-center mt-6 pt-2 pb-3 bg-card rounded-xl border border-border shadow-sm">
            <div className="relative mb-2">
              <Avatar className="w-14 h-14 rounded-xl border-2 border-slate-300">
                <AvatarImage src={top3[1]?.cover} className="object-cover" />
                <AvatarFallback className="rounded-xl bg-muted text-xs font-bold">{top3[1]?.name.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-400 text-white text-[10px] font-bold flex items-center justify-center">2</span>
            </div>
            <p className="text-xs font-medium text-foreground text-center line-clamp-1 px-1">{top3[1]?.name}</p>
            <p className="text-sm font-bold text-primary mt-0.5">{top3[1]?.value}</p>
            <p className="text-[10px] text-muted-foreground">{top3[1]?.subValue}</p>
          </div>
          {/* 第1名 */}
          <div className="flex flex-col items-center pb-3 bg-card rounded-xl border border-amber-200 shadow-sm">
            <div className="w-full bg-amber-400/20 py-1 text-center mb-2 rounded-t-xl">
              <Crown className="w-4 h-4 text-amber-500 mx-auto" />
            </div>
            <div className="relative mb-2">
              <Avatar className="w-16 h-16 rounded-xl border-2 border-amber-400">
                <AvatarImage src={top3[0]?.cover} className="object-cover" />
                <AvatarFallback className="rounded-xl bg-amber-100 text-amber-800 font-bold">{top3[0]?.name.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-amber-900 text-[10px] font-bold flex items-center justify-center">1</span>
            </div>
            <p className="text-xs font-semibold text-foreground text-center line-clamp-1 px-1">{top3[0]?.name}</p>
            <p className="text-base font-bold text-amber-600 mt-0.5">{top3[0]?.value}</p>
            <p className="text-[10px] text-muted-foreground">{top3[0]?.subValue}</p>
          </div>
          {/* 第3名 */}
          <div className="flex flex-col items-center mt-6 pt-2 pb-3 bg-card rounded-xl border border-border shadow-sm">
            <div className="relative mb-2">
              <Avatar className="w-14 h-14 rounded-xl border-2 border-orange-300">
                <AvatarImage src={top3[2]?.cover} className="object-cover" />
                <AvatarFallback className="rounded-xl bg-muted text-xs font-bold">{top3[2]?.name.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-orange-400 text-white text-[10px] font-bold flex items-center justify-center">3</span>
            </div>
            <p className="text-xs font-medium text-foreground text-center line-clamp-1 px-1">{top3[2]?.name}</p>
            <p className="text-sm font-bold text-primary mt-0.5">{top3[2]?.value}</p>
            <p className="text-[10px] text-muted-foreground">{top3[2]?.subValue}</p>
          </div>
        </div>
      </div>

      {/* 4名以后列表 */}
      <div className="px-4 pb-20 space-y-2">
        {rest.map(circle => (
          <button
            key={circle.id}
            onClick={() => router.push(`/circles/${circle.id}`)}
            className="w-full flex items-center gap-3 p-3 bg-card rounded-xl border border-border hover:border-primary/30 transition-all text-left"
          >
            <span className="w-8 text-center text-sm font-bold text-muted-foreground flex-shrink-0">{circle.rank}</span>
            <Avatar className="w-12 h-12 rounded-xl flex-shrink-0">
              <AvatarImage src={circle.cover} className="object-cover" />
              <AvatarFallback className="rounded-xl bg-muted font-bold text-sm">{circle.name.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground truncate text-sm">{circle.name}</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 flex-shrink-0">{circle.category}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{circle.owner}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-bold text-primary text-sm">{circle.value}</p>
              <p className="text-[10px] text-muted-foreground">{circle.subValue}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
