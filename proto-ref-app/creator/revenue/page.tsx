'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, TrendingUp, TrendingDown, Wallet, ChevronRight, BookOpen, HelpCircle, Gift, Heart, FileText, Radio } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { DataState } from '@/components/data-state'
import { getCreatorRevenueData, getRevenueDetails } from '@/lib/api/creator-revenue'
import { REVENUE_SOURCE_NAMES } from '@/lib/types/creator-revenue'
import type { CreatorRevenueData, RevenueDetailItem, RevenueSourceType } from '@/lib/types/creator-revenue'

// 收益来源图标映射
const SOURCE_ICONS: Record<RevenueSourceType, React.ReactNode> = {
  course: <BookOpen className="w-4 h-4" />,
  question: <HelpCircle className="w-4 h-4" />,
  reward: <Gift className="w-4 h-4" />,
  tip: <Heart className="w-4 h-4" />,
  article: <FileText className="w-4 h-4" />,
  live: <Radio className="w-4 h-4" />,
}

// 收益来源颜色映射
const SOURCE_COLORS: Record<RevenueSourceType, string> = {
  course: 'bg-blue-500',
  question: 'bg-green-500',
  reward: 'bg-orange-500',
  tip: 'bg-pink-500',
  article: 'bg-purple-500',
  live: 'bg-red-500',
}

export default function CreatorRevenuePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<CreatorRevenueData | null>(null)
  const [details, setDetails] = useState<RevenueDetailItem[]>([])
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [selectedType, setSelectedType] = useState<RevenueSourceType | 'all'>('all')

  // 加载收益数据
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const res = await getCreatorRevenueData()
        if (res.code === 200) {
          setData(res.data)
        } else {
          setError(res.message)
        }
      } catch {
        setError('加载失败，请重试')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // 加载收益明细
  useEffect(() => {
    async function fetchDetails() {
      setDetailsLoading(true)
      try {
        const res = await getRevenueDetails(1, 20, selectedType === 'all' ? undefined : selectedType)
        if (res.code === 200) {
          setDetails(res.data.list)
        }
      } catch {
        // ignore
      } finally {
        setDetailsLoading(false)
      }
    }
    fetchDetails()
  }, [selectedType])

  // 计算趋势图数据
  const renderTrendChart = () => {
    if (!data?.trend.length) return null
    const maxAmount = Math.max(...data.trend.map(p => p.amount))
    const minAmount = Math.min(...data.trend.map(p => p.amount))
    const range = maxAmount - minAmount || 1

    return (
      <div className="relative h-32 mt-4">
        <svg className="w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="trendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#C41E3A" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#C41E3A" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* 填充区域 */}
          <path
            d={`M0,${100 - ((data.trend[0].amount - minAmount) / range) * 80} ${data.trend.map((p, i) => {
              const x = (i / (data.trend.length - 1)) * 300
              const y = 100 - ((p.amount - minAmount) / range) * 80
              return `L${x},${y}`
            }).join(' ')} L300,100 L0,100 Z`}
            fill="url(#trendGradient)"
          />
          {/* 线条 */}
          <path
            d={`M0,${100 - ((data.trend[0].amount - minAmount) / range) * 80} ${data.trend.map((p, i) => {
              const x = (i / (data.trend.length - 1)) * 300
              const y = 100 - ((p.amount - minAmount) / range) * 80
              return `L${x},${y}`
            }).join(' ')}`}
            fill="none"
            stroke="#C41E3A"
            strokeWidth="2"
          />
        </svg>
        {/* X轴标签 */}
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>{data.trend[0]?.date.slice(5)}</span>
          <span>{data.trend[Math.floor(data.trend.length / 2)]?.date.slice(5)}</span>
          <span>{data.trend[data.trend.length - 1]?.date.slice(5)}</span>
        </div>
      </div>
    )
  }

  // 状态标签样式
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'settled':
        return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">已结算</Badge>
      case 'pending':
        return <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">待结算</Badge>
      case 'frozen':
        return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">冻结中</Badge>
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">创作者收益</h1>
          <Button 
            variant="ghost" 
            size="sm"
            className="text-primary"
            onClick={() => router.push('/wallet/withdraw')}
          >
            <Wallet className="w-4 h-4 mr-1" />
            提现
          </Button>
        </div>
      </header>

      <DataState
        loading={loading}
        error={error}
        empty={!data}
        emptyMessage="暂无收益数据"
        onRetry={() => window.location.reload()}
        skeleton={
          <div className="p-4 space-y-4">
            <div className="h-40 bg-muted rounded-xl animate-pulse" />
            <div className="h-48 bg-muted rounded-xl animate-pulse" />
            <div className="h-32 bg-muted rounded-xl animate-pulse" />
          </div>
        }
      >
        <div className="p-4 space-y-4 pb-20">
          {/* 收益总览卡片 */}
          <Card className="p-5 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground mb-1">累计收益（元）</p>
              <p className="text-3xl font-bold text-primary">
                {data?.overview.totalRevenue.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-primary/10">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">本月收益</p>
                <p className="font-semibold">{data?.overview.monthRevenue.toLocaleString()}</p>
                <div className={`flex items-center justify-center text-xs mt-1 ${(data?.overview.monthGrowthRate ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(data?.overview.monthGrowthRate ?? 0) >= 0 ? (
                    <TrendingUp className="w-3 h-3 mr-0.5" />
                  ) : (
                    <TrendingDown className="w-3 h-3 mr-0.5" />
                  )}
                  {Math.abs(data?.overview.monthGrowthRate ?? 0)}%
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">可提现</p>
                <p className="font-semibold text-primary">{data?.overview.withdrawable.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">待结算</p>
                <p className="font-semibold text-orange-600">{data?.overview.pending.toLocaleString()}</p>
              </div>
            </div>
          </Card>

          {/* 收益趋势 */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">收益趋势</h3>
              <span className="text-xs text-muted-foreground">近30天</span>
            </div>
            {renderTrendChart()}
          </Card>

          {/* 收益来源构成 */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">收益来源</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs text-muted-foreground"
                onClick={() => router.push('/creator/revenue/sources')}
              >
                查看详情
                <ChevronRight className="w-4 h-4 ml-0.5" />
              </Button>
            </div>
            
            <div className="space-y-3">
              {data?.sources.map((source) => (
                <div 
                  key={source.type}
                  className="flex items-center cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-1 rounded-lg transition-colors"
                  onClick={() => setSelectedType(source.type)}
                >
                  <div className={`w-8 h-8 rounded-lg ${SOURCE_COLORS[source.type]} flex items-center justify-center text-white mr-3`}>
                    {SOURCE_ICONS[source.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">{REVENUE_SOURCE_NAMES[source.type]}</span>
                      <span className="font-medium">{source.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden mr-2">
                        <div 
                          className={`h-full ${SOURCE_COLORS[source.type]} rounded-full`}
                          style={{ width: `${source.percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-10">{source.percentage}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* 收益明细 */}
          <Card className="p-4">
            <h3 className="font-medium mb-4">收益明细</h3>
            
            {/* 类型筛选 */}
            <Tabs value={selectedType} onValueChange={(v) => setSelectedType(v as RevenueSourceType | 'all')} className="mb-4">
              <TabsList className="w-full h-auto flex-wrap gap-1 bg-transparent p-0">
                <TabsTrigger 
                  value="all" 
                  className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  全部
                </TabsTrigger>
                {Object.entries(REVENUE_SOURCE_NAMES).map(([type, name]) => (
                  <TabsTrigger 
                    key={type}
                    value={type}
                    className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    {name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* 明细列表 */}
            {detailsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-muted animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                      <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : details.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                暂无收益记录
              </div>
            ) : (
              <div className="space-y-3">
                {details.map((item) => (
                  <div 
                    key={item.id}
                    className="flex items-start p-3 bg-muted/30 rounded-xl"
                  >
                    <div className={`w-10 h-10 rounded-lg ${SOURCE_COLORS[item.type]} flex items-center justify-center text-white mr-3 flex-shrink-0`}>
                      {SOURCE_ICONS[item.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-sm font-medium truncate pr-2">{item.title}</p>
                        <span className="text-primary font-semibold whitespace-nowrap">+{item.amount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-xs text-muted-foreground">
                          {item.buyer && (
                            <>
                              <Avatar className="w-4 h-4 mr-1">
                                <AvatarImage src={item.buyer.avatar} />
                                <AvatarFallback>{item.buyer.nickname[0]}</AvatarFallback>
                              </Avatar>
                              <span className="mr-2">{item.buyer.nickname}</span>
                            </>
                          )}
                          <span>{item.createdAt}</span>
                        </div>
                        {getStatusBadge(item.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </DataState>
    </div>
  )
}
