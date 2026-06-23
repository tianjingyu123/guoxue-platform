'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Sparkles, Briefcase, Heart, Coins, Activity, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { DataState } from '@/components/data-state'
import { getDailyFortune, getFortuneLevelInfo, formatFortuneDate } from '@/lib/api/fortune'
import type { DailyFortune } from '@/lib/types/fortune'
import { cn } from '@/lib/utils'

// 分类图标映射
const categoryIcons: Record<string, React.ReactNode> = {
  career: <Briefcase className="w-5 h-5" />,
  love: <Heart className="w-5 h-5" />,
  wealth: <Coins className="w-5 h-5" />,
  health: <Activity className="w-5 h-5" />,
}

// 分类颜色映射
const categoryColors: Record<string, { bg: string; text: string; ring: string }> = {
  career: { bg: 'bg-blue-50', text: 'text-blue-600', ring: 'ring-blue-200' },
  love: { bg: 'bg-pink-50', text: 'text-pink-600', ring: 'ring-pink-200' },
  wealth: { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-200' },
  health: { bg: 'bg-green-50', text: 'text-green-600', ring: 'ring-green-200' },
}

export default function FortunePage() {
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0])
  const [fortune, setFortune] = useState<DailyFortune | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 加载运势数据
  const loadFortune = async (date: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await getDailyFortune(date)
      if (response.code === 200 && response.data) {
        setFortune(response.data)
      } else {
        setError(response.message || '加载失败')
      }
    } catch {
      setError('网络错误')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFortune(currentDate)
  }, [currentDate])

  // 切换日期
  const changeDate = (days: number) => {
    const date = new Date(currentDate)
    date.setDate(date.getDate() + days)
    setCurrentDate(date.toISOString().split('T')[0])
  }

  // 骨架屏
  const renderSkeleton = () => (
    <div className="min-h-screen bg-background">
      <div className="p-4 space-y-6">
        <Skeleton className="h-8 w-32 mx-auto" />
        <Skeleton className="h-48 w-48 rounded-full mx-auto" />
        <div className="flex justify-center gap-4">
          <Skeleton className="h-20 w-24" />
          <Skeleton className="h-20 w-24" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )

  if (loading && !fortune) {
    return renderSkeleton()
  }

  return (
    <DataState
      isLoading={loading && !fortune}
      error={error}
      isEmpty={!fortune}
      emptyMessage="暂无运势数据"
      onRetry={() => loadFortune(currentDate)}
      loadingComponent={renderSkeleton()}
    >
      {fortune && (
        <div className="min-h-screen bg-gradient-to-b from-red-50 to-background">
          {/* 顶部导航 */}
          <div className="sticky top-0 z-10 bg-gradient-to-b from-red-50 to-transparent pt-safe">
            <div className="flex items-center justify-between p-4">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="font-medium">每日运势</span>
              </div>
              <div className="w-10" />
            </div>
          </div>

          <div className="p-4 space-y-6">
            {/* 日期选择器 */}
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => changeDate(-1)}
                className="rounded-full"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="text-center">
                <p className="text-lg font-semibold">{formatFortuneDate(currentDate)}</p>
                <p className="text-sm text-muted-foreground">
                  {fortune.lunarDate} {fortune.weekday}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => changeDate(1)}
                className="rounded-full"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            {/* 综合运势圆环 */}
            <div className="flex flex-col items-center">
              <div className="relative w-40 h-40">
                {/* 背景圆环 */}
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-secondary"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${fortune.overallScore * 2.83} 283`}
                    className="text-primary transition-all duration-1000"
                  />
                </svg>
                {/* 中心内容 */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold text-primary">{fortune.overallScore}</span>
                  <span className={cn(
                    "text-lg font-medium mt-1",
                    getFortuneLevelInfo(fortune.overallLevel).color
                  )}>
                    {getFortuneLevelInfo(fortune.overallLevel).label}
                  </span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3 text-center max-w-xs">
                {fortune.overallSummary}
              </p>
            </div>

            {/* 今日宜忌 */}
            <div className="flex gap-3">
              {/* 宜 */}
              <Card className="flex-1 border-green-200 bg-green-50/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-medium">
                      宜
                    </span>
                    <span className="text-sm font-medium text-green-700">今日宜</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {fortune.yiji.yi.map((item, i) => (
                      <span key={i} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                        {item}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
              {/* 忌 */}
              <Card className="flex-1 border-red-200 bg-red-50/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-sm font-medium">
                      忌
                    </span>
                    <span className="text-sm font-medium text-red-700">今日忌</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {fortune.yiji.ji.map((item, i) => (
                      <span key={i} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
                        {item}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 分类运势 */}
            <div>
              <h2 className="text-base font-semibold mb-3">分类运势</h2>
              <div className="grid grid-cols-2 gap-3">
                {fortune.categories.map((cat) => {
                  const colors = categoryColors[cat.category] || categoryColors.career
                  const levelInfo = getFortuneLevelInfo(cat.level)
                  return (
                    <Card 
                      key={cat.category} 
                      className={cn("border", colors.ring.replace('ring', 'border'))}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", colors.bg, colors.text)}>
                            {categoryIcons[cat.category]}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{cat.categoryName}</p>
                            <p className={cn("text-xs", levelInfo.color)}>{cat.score}分</p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">{cat.summary}</p>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>

            {/* 幸运信息 */}
            <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-amber-800 mb-3">今日幸运</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-600">幸运色:</span>
                    <span className="font-medium">{fortune.luckyColor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-600">幸运数:</span>
                    <span className="font-medium">{fortune.luckyNumber}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-600">吉方位:</span>
                    <span className="font-medium">{fortune.luckyDirection}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-600">吉时:</span>
                    <span className="font-medium">{fortune.luckyTime}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 查看详情入口 */}
            <Link href={`/fortune/detail?date=${currentDate}`}>
              <Button className="w-full" size="lg">
                查看详细解读
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>

            {/* 今日提醒 */}
            {fortune.tips && fortune.tips.length > 0 && (
              <Card className="border-dashed">
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold mb-2">今日提醒</h3>
                  <ul className="space-y-1">
                    {fortune.tips.map((tip, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </DataState>
  )
}
