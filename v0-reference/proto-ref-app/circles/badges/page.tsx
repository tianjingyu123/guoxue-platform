'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Badge {
  id: string
  name: string
  desc: string
  image: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  earned: boolean
  earnedAt?: string
  progress?: number
  total?: number
}

const RARITY_CFG = {
  common:    { label: '普通', bg: 'bg-slate-100',  border: 'border-slate-200',  text: 'text-slate-600' },
  rare:      { label: '稀有', bg: 'bg-blue-50',    border: 'border-blue-200',   text: 'text-blue-600' },
  epic:      { label: '史诗', bg: 'bg-purple-50',  border: 'border-purple-200', text: 'text-purple-600' },
  legendary: { label: '传说', bg: 'bg-amber-50',   border: 'border-amber-300',  text: 'text-amber-600' },
}

const mockBadges: Badge[] = [
  { id: '1', name: '初入门径', desc: '加入第一个圈子', image: '/badges/badge-1.png', rarity: 'common',    earned: true,  earnedAt: '2023-10-01' },
  { id: '2', name: '活跃探索', desc: '连续7天发帖',    image: '/badges/badge-2.png', rarity: 'common',    earned: true,  earnedAt: '2023-10-15' },
  { id: '3', name: '知识布道', desc: '发布10篇精华内容', image: '/badges/badge-3.png', rarity: 'rare',   earned: true,  earnedAt: '2023-11-05' },
  { id: '4', name: '百人追随', desc: '获得100个粉丝',   image: '/badges/badge-4.png', rarity: 'rare',   earned: true,  earnedAt: '2023-12-01' },
  { id: '5', name: '命理宗师', desc: '回答500个命理问题', image: '/badges/badge-5.png', rarity: 'epic',  earned: false, progress: 342, total: 500 },
  { id: '6', name: '圈主传奇', desc: '圈子成员突破10000', image: '/badges/badge-6.png', rarity: 'legendary', earned: false, progress: 1280, total: 10000 },
  { id: '7', name: '月度达人', desc: '单月获赞超500',   image: '/badges/badge-7.png', rarity: 'epic',   earned: false, progress: 210, total: 500 },
  { id: '8', name: '古籍守护', desc: '收藏50部古籍',    image: '/badges/badge-8.png', rarity: 'rare',   earned: false, progress: 28, total: 50 },
]

export default function CirclesBadgesPage() {
  const router = useRouter()
  const earned = mockBadges.filter(b => b.earned)
  const locked  = mockBadges.filter(b => !b.earned)

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
        <button onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-base font-semibold text-foreground flex-1">我的徽章</h1>
        <span className="text-xs text-muted-foreground">{earned.length}/{mockBadges.length}</span>
      </header>

      <div className="px-4 pb-20">
        {/* Earned */}
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-5 mb-3">
          已获得 {earned.length} 枚
        </p>
        <div className="grid grid-cols-3 gap-3">
          {earned.map(badge => {
            const cfg = RARITY_CFG[badge.rarity]
            return (
              <div key={badge.id} className={cn('flex flex-col items-center p-3 rounded-xl border', cfg.bg, cfg.border)}>
                <img src={badge.image || "/placeholder.svg"} alt={badge.name} className="w-12 h-12 mb-2 object-contain" />
                <span className="text-xs font-semibold text-foreground text-center">{badge.name}</span>
                <span className={cn('text-[10px] mt-1', cfg.text)}>{cfg.label}</span>
                <span className="text-[10px] text-muted-foreground mt-1">{badge.earnedAt}</span>
              </div>
            )
          })}
        </div>

        {/* Locked */}
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-8 mb-3">
          待解锁 {locked.length} 枚
        </p>
        <div className="space-y-2">
          {locked.map(badge => {
            const cfg = RARITY_CFG[badge.rarity]
            return (
              <div key={badge.id} className="flex items-center gap-3 p-3 bg-muted/40 border border-border rounded-xl">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden grayscale opacity-50">
                  <img src={badge.image || "/placeholder.svg"} alt={badge.name} className="w-10 h-10 object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">{badge.name}</span>
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border', cfg.bg, cfg.border, cfg.text)}>
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{badge.desc}</p>
                  {badge.progress !== undefined && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary/50 rounded-full"
                          style={{ width: `${(badge.progress / badge.total!) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {badge.progress}/{badge.total}
                      </span>
                    </div>
                  )}
                </div>
                <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
