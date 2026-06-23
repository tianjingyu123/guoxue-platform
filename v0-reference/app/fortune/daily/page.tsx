'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Share2, 
  Briefcase, 
  Heart, 
  Coins, 
  Activity,
  Compass,
  Sparkles,
  Check,
  X,
  Lightbulb
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { 
  getDailyFortune, 
  getFortuneDetail, 
  getLevelLabel, 
  getLevelColor, 
  formatFortuneDate 
} from '@/lib/api/fortune'
import type { FortuneDetail, CategoryFortune } from '@/lib/types/fortune'

// 分类图标映射
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  career: <Briefcase className="w-5 h-5" />,
  love: <Heart className="w-5 h-5" />,
  wealth: <Coins className="w-5 h-5" />,
  health: <Activity className="w-5 h-5" />,
}

// 分类颜色映射
const CATEGORY_COLORS: Record<string, string> = {
  career: 'bg-blue-500/10 text-blue-600',
  love: 'bg-pink-500/10 text-pink-600',
  wealth: 'bg-amber-500/10 text-amber-600',
  health: 'bg-green-500/10 text-green-600',
}

export default function FortuneDailyPage() {
  const [currentDate, setCurrentDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [fortune, setFortune] = useState<FortuneDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFortune = useCallback(async (date: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await getFortuneDetail(date)
      if (response.code === 200 && response.data) {
        setFortune(response.data)
      } else {
        setError(response.message || '获取运势失败')
      }
    } catch {
      setError('网络错误，请重试')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFortune(currentDate)
  }, [currentDate, fetchFortune])

  const handlePrevDay = () => {
    const date = new Date(currentDate)
    date.setDate(date.getDate() - 1)
    setCurrentDate(date.toISOString().split('T')[0])
  }

  const handleNextDay = () => {
    const date = new Date(currentDate)
    date.setDate(date.getDate() + 1)
    // 限制最多查看7天后的运势
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 7)
    if (date <= maxDate) {
      setCurrentDate(date.toISOString().split('T')[0])
    } else {
      toast.error('最多可查看7天后的运势')
    }
  }

  const handleShare = () => {
    toast.success('海报生成中...')
    // 实际项目中这里会调用Canvas生成海报
  }

  // 骨架屏
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
          <div className="flex items-center justify-between px-4 h-14">
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="w-32 h-6" />
            <Skeleton className="w-8 h-8 rounded-full" />
          </div>
        </header>
        <div className="p-4 space-y-4">
          <Skeleton className="h-48 rounded-xl" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    )
  }

  // 错误状态
  if (error || !fortune) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
          <div className="flex items-center px-4 h-14">
            <Link href="/fortune" className="p-2 -ml-2">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="flex-1 text-center font-medium">每日运势详情</h1>
            <div className="w-9" />
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">{error || '暂无数据'}</p>
            <Button onClick={() => fetchFortune(currentDate)}>重试</Button>
          </div>
        </div>
      </div>
    )
  }

  const levelColor = getLevelColor(fortune.overallLevel)

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/fortune" className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          
          {/* 日期切换器 */}
          <div className="flex items-center gap-2">
            <button onClick={handlePrevDay} className="p-1.5 hover:bg-secondary rounded-full">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center min-w-[100px]">
              <p className="font-medium">{formatFortuneDate(currentDate)}</p>
              <p className="text-xs text-muted-foreground">{fortune.lunarDate}</p>
            </div>
            <button onClick={handleNextDay} className="p-1.5 hover:bg-secondary rounded-full">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <button onClick={handleShare} className="p-2 -mr-2">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* 综合运势大卡片 */}
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="flex items-center gap-6">
            {/* 评分圆环 */}
            <div className="relative w-28 h-28 shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="56"
                  cy="56"
                  r="48"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-secondary"
                />
                <circle
                  cx="56"
                  cy="56"
                  r="48"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${fortune.overallScore * 3.01} 301`}
                  className={levelColor}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${levelColor}`}>{fortune.overallScore}</span>
                <span className="text-xs text-muted-foreground">综合评分</span>
              </div>
            </div>

            {/* 运势等级和摘要 */}
            <div className="flex-1">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${levelColor} bg-current/10 mb-2`}>
                <Sparkles className="w-4 h-4" />
                <span>{getLevelLabel(fortune.overallLevel)}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {fortune.overallSummary}
              </p>
            </div>
          </div>
        </Card>

        {/* 分类运势 4 格卡片 */}
        <div className="grid grid-cols-2 gap-3">
          {fortune.categories.map((cat: CategoryFortune) => (
            <Card key={cat.category} className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className={`p-2 rounded-lg ${CATEGORY_COLORS[cat.category]}`}>
                  {CATEGORY_ICONS[cat.category]}
                </div>
                <div>
                  <p className="font-medium">{cat.categoryName}</p>
                  <p className={`text-xs ${getLevelColor(cat.level)}`}>
                    {cat.score}分 - {getLevelLabel(cat.level)}
                  </p>
                </div>
              </div>
              
              {/* 进度条 */}
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-2">
                <div 
                  className={`h-full rounded-full ${getLevelColor(cat.level)} bg-current`}
                  style={{ width: `${cat.score}%` }}
                />
              </div>
              
              <p className="text-xs text-muted-foreground line-clamp-2">
                {cat.summary}
              </p>
            </Card>
          ))}
        </div>

        {/* 幸运信息 */}
        <Card className="p-4">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            幸运信息
          </h3>
          <div className="grid grid-cols-4 gap-3">
            {/* 幸运色 */}
            <div className="text-center">
              <div 
                className="w-10 h-10 rounded-full mx-auto mb-1.5 border-2 border-white shadow-md"
                style={{ backgroundColor: fortune.luckyColor }}
              />
              <p className="text-xs text-muted-foreground">幸运色</p>
            </div>
            
            {/* 幸运数字 */}
            <div className="text-center">
              <div className="w-10 h-10 rounded-full mx-auto mb-1.5 bg-primary/10 flex items-center justify-center">
                <span className="text-lg font-bold text-primary">{fortune.luckyNumber}</span>
              </div>
              <p className="text-xs text-muted-foreground">幸运数字</p>
            </div>
            
            {/* 幸运方位 */}
            <div className="text-center">
              <div className="w-10 h-10 rounded-full mx-auto mb-1.5 bg-blue-500/10 flex items-center justify-center">
                <Compass className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-xs text-muted-foreground">{fortune.luckyDirection}</p>
            </div>
            
            {/* 幸运时间 */}
            <div className="text-center">
              <div className="w-10 h-10 rounded-full mx-auto mb-1.5 bg-purple-500/10 flex items-center justify-center">
                <span className="text-xs font-medium text-purple-600">{fortune.luckyTime}</span>
              </div>
              <p className="text-xs text-muted-foreground">幸运时</p>
            </div>
          </div>
        </Card>

        {/* 宜忌列表 */}
        <Card className="p-4">
          <h3 className="font-medium mb-3">今日宜忌</h3>
          <div className="grid grid-cols-2 gap-4">
            {/* 宜 */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check className="w-3 h-3 text-green-600" />
                </div>
                <span className="text-sm font-medium text-green-600">宜</span>
              </div>
              <ul className="space-y-1.5">
                {fortune.yiji.yi.map((item, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            
            {/* 忌 */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center">
                  <X className="w-3 h-3 text-red-600" />
                </div>
                <span className="text-sm font-medium text-red-600">忌</span>
              </div>
              <ul className="space-y-1.5">
                {fortune.yiji.ji.map((item, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-red-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>

        {/* 开运建议 */}
        <Card className="p-4">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            开运建议
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {fortune.detailAnalysis || fortune.overallSummary}
          </p>
          
          {/* 分类建议 */}
          <div className="mt-4 space-y-3">
            {fortune.categories.map((cat: CategoryFortune) => (
              <div key={cat.category} className="flex gap-3">
                <div className={`p-1.5 rounded ${CATEGORY_COLORS[cat.category]} shrink-0`}>
                  {CATEGORY_ICONS[cat.category]}
                </div>
                <div>
                  <p className="text-sm font-medium">{cat.categoryName}</p>
                  <p className="text-xs text-muted-foreground">{cat.suggestion}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* 五行/星座/生肖分析（如有） */}
        {(fortune.wuxingAnalysis || fortune.zodiacFortune || fortune.chineseZodiacFortune) && (
          <Card className="p-4">
            <h3 className="font-medium mb-3">专属分析</h3>
            <div className="space-y-3">
              {fortune.wuxingAnalysis && (
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-sm font-medium mb-1">五行：{fortune.wuxingAnalysis.element}</p>
                  <p className="text-xs text-muted-foreground">{fortune.wuxingAnalysis.description}</p>
                </div>
              )}
              {fortune.zodiacFortune && (
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-sm font-medium mb-1">星座：{fortune.zodiacFortune.zodiac}</p>
                  <p className="text-xs text-muted-foreground">{fortune.zodiacFortune.summary}</p>
                </div>
              )}
              {fortune.chineseZodiacFortune && (
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-sm font-medium mb-1">生肖：{fortune.chineseZodiacFortune.animal}</p>
                  <p className="text-xs text-muted-foreground">{fortune.chineseZodiacFortune.summary}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* 今日提醒 */}
        {fortune.tips && fortune.tips.length > 0 && (
          <Card className="p-4 bg-amber-500/5 border-amber-500/20">
            <h3 className="font-medium mb-2 text-amber-700">今日提醒</h3>
            <ul className="space-y-1">
              {fortune.tips.map((tip, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  )
}
