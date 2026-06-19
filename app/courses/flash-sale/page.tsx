'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Clock, Star, Users, ShoppingCart, Flame, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SaleSession {
  id: string
  label: string
  startTime: string
  endTime: string
  status: 'past' | 'active' | 'upcoming'
}

interface Course {
  id: string
  title: string
  instructor: string
  cover: string
  originalPrice: number
  salePrice: number
  discount: number
  students: number
  rating: number
  sessionId: string
  sold: number
  total: number
  category: string
}

const sessions: SaleSession[] = [
  { id: '1', label: '10:00场', startTime: '10:00', endTime: '12:00', status: 'past' },
  { id: '2', label: '14:00场', startTime: '14:00', endTime: '16:00', status: 'active' },
  { id: '3', label: '20:00场', startTime: '20:00', endTime: '22:00', status: 'upcoming' },
]

const courses: Course[] = [
  { id: '1', title: '八字入门实战课', instructor: '周易大师', cover: '/marketing/course.png', originalPrice: 299, salePrice: 99, discount: 33, students: 2680, rating: 4.9, sessionId: '2', sold: 180, total: 200, category: '八字' },
  { id: '2', title: '紫微斗数精讲班', instructor: '张玄风', cover: '/marketing/course.png', originalPrice: 499, salePrice: 149, discount: 30, students: 1520, rating: 4.8, sessionId: '2', sold: 95, total: 100, category: '紫微' },
  { id: '3', title: '奇门遁甲高阶课', instructor: '林奇门', cover: '/marketing/luopan.png', originalPrice: 399, salePrice: 128, discount: 32, students: 980, rating: 4.7, sessionId: '2', sold: 48, total: 80, category: '奇门' },
  { id: '4', title: '风水堪舆实操班', instructor: '王德华', cover: '/marketing/luopan.png', originalPrice: 599, salePrice: 199, discount: 33, students: 860, rating: 4.8, sessionId: '3', sold: 0, total: 50, category: '风水' },
  { id: '5', title: '易经六十四卦速解', instructor: '李玄机', cover: '/marketing/course.png', originalPrice: 199, salePrice: 59, discount: 30, students: 3400, rating: 4.6, sessionId: '3', sold: 0, total: 100, category: '易经' },
]

function Countdown() {
  const [secs, setSecs] = useState(3600)
  useEffect(() => {
    const t = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [])
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    <div className="flex items-center gap-1">
      {[pad(h), pad(m), pad(s)].map((v, i) => (
        <span key={i} className="flex items-center gap-1">
          <span className="bg-foreground text-background rounded px-1.5 py-1 text-sm font-mono font-bold tabular-nums">
            {v}
          </span>
          {i < 2 && <span className="text-primary-foreground font-bold">:</span>}
        </span>
      ))}
    </div>
  )
}

export default function CoursesFlashSalePage() {
  const router = useRouter()
  const [activeSession, setActiveSession] = useState('2')

  const sessionCourses = courses.filter(c => c.sessionId === activeSession)
  const session = sessions.find(s => s.id === activeSession)

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      {/* 顶部品牌渐变 */}
      <header className="sticky top-0 z-20 bg-gradient-to-br from-[#a01830] via-primary to-primary text-primary-foreground">
        <div className="flex items-center px-4 h-12 gap-3">
          <button onClick={() => router.back()} aria-label="返回">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold flex-1 flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-gold" />
            限时特惠
          </h1>
        </div>

        {/* 倒计时条 */}
        <div className="flex items-center justify-between px-4 pb-4">
          <div>
            <p className="text-primary-foreground/70 text-xs mb-0.5">每日三场 · 错过再等一天</p>
            <p className="text-primary-foreground text-lg font-bold">限时抢购</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[11px] text-primary-foreground/80">
              {session?.status === 'active' ? '距本场结束' : session?.status === 'past' ? '本场已结束' : '本场即将开始'}
            </span>
            {session?.status === 'active' ? (
              <Countdown />
            ) : (
              <span className="bg-foreground/20 rounded px-2 py-1 text-sm font-medium">--:--:--</span>
            )}
          </div>
        </div>

        {/* 场次切换 */}
        <div className="flex">
          {sessions.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSession(s.id)}
              className={cn(
                'flex-1 py-2.5 text-center transition-colors',
                activeSession === s.id ? 'bg-background' : 'bg-transparent'
              )}
            >
              <p className={cn('text-sm font-semibold', activeSession === s.id ? 'text-primary' : 'text-primary-foreground')}>
                {s.startTime}
              </p>
              <p className={cn('text-[11px]', activeSession === s.id ? 'text-muted-foreground' : 'text-primary-foreground/80')}>
                {s.status === 'past' ? '已结束' : s.status === 'active' ? '抢购中' : '即将开始'}
              </p>
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 pt-4 pb-20 space-y-4">
        {sessionCourses.map(course => {
          const remaining = course.total - course.sold
          const pct = Math.round((course.sold / course.total) * 100)
          const isUpcoming = session?.status === 'upcoming'
          const isLow = remaining > 0 && remaining <= course.total * 0.2
          return (
            <div key={course.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="relative">
                <img src={course.cover || "/placeholder.svg"} alt={course.title} className="w-full h-40 object-cover" />
                <div className="absolute top-2 left-2 flex gap-1.5">
                  <span className="bg-gold text-gold-foreground text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow">
                    <Tag className="w-3 h-3" />{course.discount}折
                  </span>
                  <span className="bg-foreground/60 text-background text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
                    {course.category}
                  </span>
                </div>
              </div>
              <div className="p-3">
                <h3 className="text-sm font-semibold text-foreground mb-1 line-clamp-1">{course.title}</h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <span>{course.instructor}</span>
                  <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-gold fill-gold" />{course.rating}</span>
                  <span className="flex items-center gap-0.5"><Users className="w-3 h-3" />{(course.students / 1000).toFixed(1)}k</span>
                </div>
                <div className="flex items-end justify-between mb-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-bold text-primary">¥{course.salePrice}</span>
                    <span className="text-xs text-muted-foreground line-through">¥{course.originalPrice}</span>
                  </div>
                  <span className={cn('text-xs', isLow ? 'text-primary font-medium' : 'text-muted-foreground')}>
                    {isUpcoming ? `共 ${course.total} 名额` : `仅剩 ${remaining} 名额`}
                  </span>
                </div>
                {!isUpcoming && (
                  <div className="relative h-4 rounded-full bg-secondary overflow-hidden mb-3">
                    <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#a01830] to-primary transition-all" style={{ width: `${pct}%` }} />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-foreground">
                      已抢 {pct}%
                    </span>
                  </div>
                )}
                <Button
                  disabled={isUpcoming}
                  onClick={() => router.push(`/courses/${course.id}`)}
                  className={cn(
                    'w-full h-10 font-semibold',
                    isUpcoming
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                  )}
                >
                  {isUpcoming ? <><Clock className="w-4 h-4 mr-1.5" />即将开抢</> : <><ShoppingCart className="w-4 h-4 mr-1.5" />立即抢购</>}
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
