"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  TrendingUp, 
  TrendingDown,
  Users,
  Wallet,
  Megaphone,
  UserCheck,
  ImageIcon,
  BarChart3,
  BookOpen,
  CreditCard,
  Trophy,
  AlertCircle,
  ChevronRight,
  Crown
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataState } from "@/components/data-state"
import { getOperatorPanelData } from "@/lib/api/operator"
import type { OperatorPanelData, TeamMemberRanking } from "@/lib/types/operator"

// 图标映射
const iconMap: Record<string, React.ReactNode> = {
  users: <Users className="w-5 h-5" />,
  wallet: <Wallet className="w-5 h-5" />,
  megaphone: <Megaphone className="w-5 h-5" />,
  'user-check': <UserCheck className="w-5 h-5" />,
  image: <ImageIcon className="w-5 h-5" />,
  'bar-chart': <BarChart3 className="w-5 h-5" />,
  'book-open': <BookOpen className="w-5 h-5" />,
  'credit-card': <CreditCard className="w-5 h-5" />
}

export default function OperatorPanelPage() {
  const router = useRouter()
  const [panelData, setPanelData] = useState<OperatorPanelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rankingPeriod, setRankingPeriod] = useState<'day' | 'week' | 'month'>('month')

  useEffect(() => {
    loadPanelData()
  }, [])

  const loadPanelData = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await getOperatorPanelData()
      if (res.code === 200) {
        setPanelData(res.data)
      } else {
        setError(res.message || '加载失败')
      }
    } catch (err) {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  // 格式化数值
  const formatValue = (value: number | string, unit?: string) => {
    if (typeof value === 'number') {
      if (value >= 10000) {
        return `${(value / 10000).toFixed(1)}万${unit || ''}`
      }
      return `${value.toLocaleString()}${unit || ''}`
    }
    return value
  }

  // 渲染趋势
  const renderTrend = (trend?: number, label?: string) => {
    if (trend === undefined) return null
    const isUp = trend > 0
    return (
      <div className={`flex items-center gap-0.5 text-xs ${isUp ? 'text-green-600' : 'text-red-500'}`}>
        {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        <span>{isUp ? '+' : ''}{trend}%</span>
        {label && <span className="text-muted-foreground ml-0.5">{label}</span>}
      </div>
    )
  }

  // 获取排名样式
  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'bg-amber-500 text-white'
    if (rank === 2) return 'bg-gray-400 text-white'
    if (rank === 3) return 'bg-amber-700 text-white'
    return 'bg-muted text-muted-foreground'
  }

  // 骨架屏
  const renderSkeleton = () => (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <div className="sticky top-0 z-10 bg-[#C41E3A] text-white px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-white/20 rounded animate-pulse" />
          <div className="flex-1">
            <div className="h-5 w-32 bg-white/20 rounded animate-pulse mb-1" />
            <div className="h-3 w-24 bg-white/20 rounded animate-pulse" />
          </div>
        </div>
      </div>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-card rounded-lg p-3 border">
              <div className="h-3 w-16 bg-muted rounded animate-pulse mb-2" />
              <div className="h-6 w-20 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-muted rounded-lg animate-pulse" />
              <div className="h-3 w-10 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <DataState
      loading={loading}
      error={error}
      empty={!panelData}
      loadingRender={renderSkeleton()}
      emptyMessage="暂无数据"
      onRetry={loadPanelData}
    >
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#C41E3A] text-white">
          <div className="px-4 py-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 -ml-2"
                onClick={() => router.back()}
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
              <div className="flex-1">
                <h1 className="text-lg font-semibold">{panelData?.operatorInfo.name}</h1>
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <Crown className="w-3.5 h-3.5 text-[#C9A96E]" />
                  <span>{panelData?.operatorInfo.level}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 数据概览 */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            {panelData?.overview.map((item) => (
              <div
                key={item.key}
                className="bg-card rounded-lg p-3 border hover:shadow-sm transition-shadow cursor-pointer"
                onClick={() => router.push('/operator/dashboard')}
              >
                <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                <div className="text-xl font-bold text-[#C41E3A]">
                  {formatValue(item.value, item.unit)}
                </div>
                {renderTrend(item.trend, item.trendLabel)}
              </div>
            ))}
          </div>
        </div>

        {/* 快捷入口 */}
        <div className="px-4 pb-4">
          <div className="bg-card rounded-lg border p-4">
            <h3 className="font-semibold mb-3">快捷功能</h3>
            <div className="grid grid-cols-4 gap-4">
              {panelData?.quickActions.map((action) => (
                <div
                  key={action.key}
                  className="flex flex-col items-center gap-1.5 cursor-pointer"
                  onClick={() => router.push(action.href)}
                >
                  <div className="relative w-12 h-12 rounded-lg bg-[#C41E3A]/10 flex items-center justify-center text-[#C41E3A]">
                    {iconMap[action.icon] || <Users className="w-5 h-5" />}
                    {action.badge && action.badge > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 bg-red-500 text-[10px]">
                        {action.badge > 99 ? '99+' : action.badge}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-center">{action.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 团队排行 */}
        <div className="px-4 pb-4">
          <div className="bg-card rounded-lg border overflow-hidden">
            <div className="p-4 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#C9A96E]" />
                <h3 className="font-semibold">团队排行</h3>
              </div>
              <Tabs value={rankingPeriod} onValueChange={(v) => setRankingPeriod(v as typeof rankingPeriod)}>
                <TabsList className="h-7">
                  <TabsTrigger value="day" className="text-xs px-2 h-6">日</TabsTrigger>
                  <TabsTrigger value="week" className="text-xs px-2 h-6">周</TabsTrigger>
                  <TabsTrigger value="month" className="text-xs px-2 h-6">月</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="divide-y">
              {panelData?.teamRanking.slice(0, 5).map((member) => (
                <div
                  key={member.userId}
                  className={`flex items-center gap-3 p-3 ${member.isSelf ? 'bg-[#C41E3A]/5' : ''}`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${getRankStyle(member.rank)}`}>
                    {member.rank}
                  </div>
                  <img
                    src={member.avatar}
                    alt={member.nickname}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-sm truncate">{member.nickname}</span>
                      {member.isSelf && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1 border-[#C41E3A] text-[#C41E3A]">
                          我
                        </Badge>
                      )}
                    </div>
                    {member.change !== undefined && (
                      <div className={`text-xs ${member.change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {member.change >= 0 ? '+' : ''}{member.change}%
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[#C41E3A]">
                      {member.performance.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">{member.performanceUnit}</div>
                  </div>
                </div>
              ))}
            </div>
            <div 
              className="p-3 text-center text-sm text-[#C41E3A] cursor-pointer hover:bg-muted/50 border-t"
              onClick={() => router.push('/operator/dashboard')}
            >
              查看完整排行 <ChevronRight className="w-4 h-4 inline" />
            </div>
          </div>
        </div>

        {/* 配额使用 */}
        <div className="px-4 pb-4">
          <div className="bg-card rounded-lg border p-4">
            <h3 className="font-semibold mb-3">配额使用</h3>
            <div className="space-y-4">
              {panelData?.quotaUsage.map((quota) => {
                const percentage = (quota.used / quota.total) * 100
                return (
                  <div key={quota.key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{quota.label}</span>
                        {quota.isLow && (
                          <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                        )}
                      </div>
                      <span className="text-sm">
                        <span className={quota.isLow ? 'text-amber-500 font-medium' : ''}>
                          {quota.used}
                        </span>
                        <span className="text-muted-foreground">/{quota.total}{quota.unit}</span>
                      </span>
                    </div>
                    <Progress 
                      value={percentage} 
                      className={`h-2 ${quota.isLow ? '[&>div]:bg-amber-500' : '[&>div]:bg-[#C41E3A]'}`}
                    />
                    {quota.expireAt && (
                      <div className="text-xs text-muted-foreground mt-1">
                        有效期至 {quota.expireAt}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <Button 
              variant="outline" 
              className="w-full mt-4 text-[#C41E3A] border-[#C41E3A]"
              onClick={() => router.push('/operator/quota')}
            >
              升级配额
            </Button>
          </div>
        </div>
      </div>
    </DataState>
  )
}
