'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Trophy, Star, Flame, BookOpen, Clock, Award } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BadgeUnlock, type BadgeUnlockData, type UnlockIconName, type UnlockRarity } from '@/components/common/badge-unlock'

interface Achievement {
  id: string
  title: string
  desc: string
  icon: React.ReactNode
  points: number
  earned: boolean
  earnedAt?: string
  category: 'study' | 'social' | 'special'
  unlockIcon: UnlockIconName
  rarity: UnlockRarity
}

const achievements: Achievement[] = [
  { id: '1',  title: '学海无涯',    desc: '累计学习时长超过100小时',    icon: <Clock className="w-5 h-5" />,    points: 500, earned: true,  earnedAt: '2024-01-10', category: 'study', unlockIcon: 'zap',        rarity: 'epic' },
  { id: '2',  title: '博览群书',    desc: '完成 10 门课程学习',          icon: <BookOpen className="w-5 h-5" />, points: 300, earned: true,  earnedAt: '2023-12-20', category: 'study', unlockIcon: 'book',       rarity: 'rare' },
  { id: '3',  title: '坚持不懈',    desc: '连续 30 天登录学习',          icon: <Flame className="w-5 h-5" />,    points: 200, earned: true,  earnedAt: '2023-11-15', category: 'study', unlockIcon: 'flame',      rarity: 'rare' },
  { id: '4',  title: '命理入门',    desc: '完成八字基础课程',            icon: <Star className="w-5 h-5" />,     points: 100, earned: true,  earnedAt: '2023-10-05', category: 'study', unlockIcon: 'star',       rarity: 'common' },
  { id: '5',  title: '知识布道者',  desc: '发布内容被点赞超过500次',     icon: <Award className="w-5 h-5" />,    points: 400, earned: false, category: 'social', unlockIcon: 'award',      rarity: 'epic' },
  { id: '6',  title: '百星导师',    desc: '获得100个学员关注',           icon: <Star className="w-5 h-5" />,     points: 600, earned: false, category: 'social', unlockIcon: 'crown',      rarity: 'epic' },
  { id: '7',  title: '周易宗师',    desc: '完成全部易经系列课程',        icon: <Trophy className="w-5 h-5" />,   points: 1000,earned: false, category: 'special', unlockIcon: 'trophy',     rarity: 'legendary' },
  { id: '8',  title: '星光闪耀',    desc: '连续 100 天登录',            icon: <Flame className="w-5 h-5" />,    points: 800, earned: false, category: 'special', unlockIcon: 'sparkles',   rarity: 'legendary' },
]

const CATEGORY_LABELS = { study: '学习成就', social: '社交成就', special: '特殊成就' }
const CATEGORIES = ['study', 'social', 'special'] as const

export default function LearningAchievementsPage() {
  const router = useRouter()
  const totalPoints = achievements.filter(a => a.earned).reduce((sum, a) => sum + a.points, 0)
  const earnedCount = achievements.filter(a => a.earned).length
  const [unlock, setUnlock] = useState<BadgeUnlockData | null>(null)

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-base font-semibold text-foreground">学习成就</h1>
      </header>

      {/* Summary banner */}
      <div className="mx-4 mt-4 p-4 bg-gradient-to-r from-primary/10 to-amber-50 border border-primary/20 rounded-xl flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Trophy className="w-7 h-7 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-black text-primary">{totalPoints.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">成就积分 · 已获得 {earnedCount}/{achievements.length} 枚</p>
        </div>
      </div>

      <div className="px-4 pb-20">
        {CATEGORIES.map(cat => {
          const items = achievements.filter(a => a.category === cat)
          return (
            <div key={cat} className="mt-6">
              <h2 className="text-sm font-semibold text-foreground mb-3">{CATEGORY_LABELS[cat]}</h2>
              <div className="space-y-2">
                {items.map(ach => (
                  <div
                    key={ach.id}
                    onClick={() => {
                      if (!ach.earned) return
                      setUnlock({
                        title: '重温解锁时刻',
                        name: ach.title,
                        description: ach.desc,
                        icon: ach.unlockIcon,
                        rarity: ach.rarity,
                        rewardPoints: ach.points,
                      })
                    }}
                    role={ach.earned ? 'button' : undefined}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border transition-colors',
                      ach.earned ? 'bg-card border-border cursor-pointer hover:border-primary/40 active:bg-muted/30' : 'bg-muted/20 border-border opacity-60'
                    )}
                  >
                    <div className={cn(
                      'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
                      ach.earned ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    )}>
                      {ach.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{ach.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{ach.desc}</p>
                      {ach.earnedAt && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">获得于 {ach.earnedAt}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={cn(
                        'text-sm font-bold',
                        ach.earned ? 'text-amber-500' : 'text-muted-foreground'
                      )}>
                        +{ach.points}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <BadgeUnlock
        open={unlock !== null}
        data={unlock || { name: '', description: '', icon: 'award' }}
        onClose={() => setUnlock(null)}
        claimLabel="收下"
      />
    </div>
  )
}
