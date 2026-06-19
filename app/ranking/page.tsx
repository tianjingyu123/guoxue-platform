'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Crown, Trophy, Star } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

type RankTab = 'experts' | 'circles' | 'content'

const experts = [
  { id: '1', rank: 1, name: '周易大师', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80', specialty: '八字命理', score: 98560, badge: '认证专家' },
  { id: '2', rank: 2, name: '张玄风',   avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80', specialty: '紫微斗数', score: 87340, badge: '金牌讲师' },
  { id: '3', rank: 3, name: '李玄机',   avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80', specialty: '易经',    score: 76820, badge: '认证专家' },
  { id: '4', rank: 4, name: '王德华',   avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80', specialty: '风水',    score: 65400, badge: '讲师' },
  { id: '5', rank: 5, name: '林奇门',   avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80', specialty: '奇门遁甲', score: 54290, badge: '讲师' },
  { id: '6', rank: 6, name: '陈梅花',   avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80', specialty: '梅花易数', score: 48760, badge: '' },
  { id: '7', rank: 7, name: '赵六爻',   avatar: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=80', specialty: '六爻',    score: 42150, badge: '' },
  { id: '8', rank: 8, name: '钱国学',   avatar: 'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=80', specialty: '国学文化', score: 38920, badge: '' },
]

const circles = [
  { id: '1', rank: 1, name: '八字命理研习社', cover: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=80', members: 15200, score: 98700 },
  { id: '2', rank: 2, name: '易经研究会',      cover: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=80', members: 12580, score: 87500 },
  { id: '3', rank: 3, name: '紫微斗数学院',    cover: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=80', members: 8960,  score: 76200 },
  { id: '4', rank: 4, name: '风水堪舆交流',    cover: 'https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?w=80', members: 6320,  score: 65100 },
  { id: '5', rank: 5, name: '国学文化圈',      cover: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=80', members: 5870,  score: 54300 },
]

const content = [
  { id: '1', rank: 1, title: '八字五行详解：从生克制化到格局分析', author: '周易大师', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60', likes: 8640, views: '12.6k' },
  { id: '2', rank: 2, title: '紫微斗数十四主星性格分析全集',          author: '张玄风',   avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=60', likes: 6200, views: '9.8k' },
  { id: '3', rank: 3, title: '2024年甲辰年各生肖运势完整版',          author: '李玄机',   avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60', likes: 5120, views: '8.7k' },
  { id: '4', rank: 4, title: '风水布局实战：客厅财位的正确摆放',      author: '王德华',   avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60', likes: 4300, views: '7.4k' },
  { id: '5', rank: 5, title: '奇门遁甲基础：九宫八卦布局详解',        author: '林奇门',   avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=60', likes: 3980, views: '6.2k' },
]

const TABS: { key: RankTab; label: string }[] = [
  { key: 'experts',  label: '专家榜' },
  { key: 'circles',  label: '圈子榜' },
  { key: 'content',  label: '内容榜' },
]

export default function RankingPage() {
  const router = useRouter()
  const [tab, setTab] = useState<RankTab>('experts')

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-br from-[#C41E3A] to-[#8B0000] px-4 pt-12 pb-14">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => router.back()}><ArrowLeft className="w-6 h-6 text-white" /></button>
          <h1 className="text-xl font-bold text-white flex-1">排行榜</h1>
          <Trophy className="w-5 h-5 text-amber-300" />
        </div>
        <div className="flex bg-white/10 rounded-xl p-1">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex-1 py-2 text-sm font-medium rounded-lg transition-all',
                tab === t.key ? 'bg-white text-[#C41E3A]' : 'text-white/80'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="-mt-6 px-4 pb-20 space-y-2">
        {tab === 'experts' && experts.map(e => (
          <div key={e.id} className={cn(
            'flex items-center gap-3 p-3 rounded-xl border',
            e.rank <= 3 ? 'bg-amber-50 border-amber-200' : 'bg-card border-border'
          )}>
            <span className={cn('w-7 text-center font-black text-lg flex-shrink-0',
              e.rank === 1 ? 'text-amber-500' : e.rank === 2 ? 'text-slate-400' : e.rank === 3 ? 'text-orange-400' : 'text-muted-foreground text-sm'
            )}>{e.rank <= 3 ? ['🥇','🥈','🥉'][e.rank-1] : e.rank}</span>
            <Avatar className="w-10 h-10 flex-shrink-0">
              <AvatarImage src={e.avatar} />
              <AvatarFallback>{e.name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-foreground">{e.name}</span>
                {e.badge && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{e.badge}</span>}
              </div>
              <p className="text-xs text-muted-foreground">{e.specialty}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-primary">{e.score.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">积分</p>
            </div>
          </div>
        ))}

        {tab === 'circles' && circles.map(c => (
          <div key={c.id} className={cn(
            'flex items-center gap-3 p-3 rounded-xl border',
            c.rank <= 3 ? 'bg-amber-50 border-amber-200' : 'bg-card border-border'
          )}>
            <span className={cn('w-7 text-center font-black text-lg flex-shrink-0',
              c.rank === 1 ? 'text-amber-500' : c.rank === 2 ? 'text-slate-400' : c.rank === 3 ? 'text-orange-400' : 'text-muted-foreground text-sm'
            )}>{c.rank <= 3 ? ['🥇','🥈','🥉'][c.rank-1] : c.rank}</span>
            <Avatar className="w-10 h-10 rounded-xl flex-shrink-0">
              <AvatarImage src={c.cover} className="object-cover" />
              <AvatarFallback className="rounded-xl">{c.name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{c.name}</p>
              <p className="text-xs text-muted-foreground">{c.members.toLocaleString()} 成员</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-primary">{c.score.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">热度值</p>
            </div>
          </div>
        ))}

        {tab === 'content' && content.map(c => (
          <div key={c.id} className={cn(
            'flex items-start gap-3 p-3 rounded-xl border',
            c.rank <= 3 ? 'bg-amber-50 border-amber-200' : 'bg-card border-border'
          )}>
            <span className={cn('w-7 text-center font-black text-lg flex-shrink-0 mt-1',
              c.rank === 1 ? 'text-amber-500' : c.rank === 2 ? 'text-slate-400' : c.rank === 3 ? 'text-orange-400' : 'text-muted-foreground text-sm'
            )}>{c.rank <= 3 ? ['🥇','🥈','🥉'][c.rank-1] : c.rank}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground line-clamp-2">{c.title}</p>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                <Avatar className="w-4 h-4"><AvatarImage src={c.avatar} /><AvatarFallback>{c.author[0]}</AvatarFallback></Avatar>
                <span>{c.author}</span>
                <span>· {c.views} 浏览</span>
                <span>· {c.likes} 赞</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
