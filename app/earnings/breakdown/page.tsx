'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, TrendingUp, TrendingDown, Filter } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DataState } from '@/components/data-state'
import {
  getEarningsOverview,
  getEarningsList,
  getEarningsTypeName,
  getEarningsStatusName,
} from '@/lib/api/earnings'
import type { EarningsOverview, EarningsItem, EarningsSourceType } from '@/lib/types/earnings'

const STATUS_COLORS = {
  settled: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  frozen: 'bg-gray-100 text-gray-800',
}

const TYPE_FILTERS: { label: string; value: EarningsSourceType | 'all' }[] = [
  { label: '全部', value: 'all' },
  { label: '课程佣金', value: 'course_commission' },
  { label: '商品佣金', value: 'product_commission' },
  { label: '会员佣金', value: 'member_commission' },
  { label: '邀请奖励', value: 'invite_reward' },
  { label: '平台奖励', value: 'platform_reward' },
]

export default function EarningsBreakdownPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [overview, setOverview] = useState<EarningsOverview | null>(null)
  const [items, setItems] = useState<EarningsItem[]>([])
  const [activeFilter, setActiveFilter] = useState<EarningsSourceType | 'all'>('all')

  useEffect(() => {
    loadData()
  }, [activeFilter])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [overviewRes, listRes] = await Promise.all([
        getEarningsOverview(),
        getEarningsList(1, 20, {
          type: activeFilter === 'all' ? undefined : activeFilter,
        }),
      ])
      if (overviewRes.code === 200) setOverview(overviewRes.data)
      else setError('加载收益信息失败')
      if (listRes.code === 200) setItems(listRes.data.list)
    } catch {
      setError('加载失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const monthGrowth =
    overview && overview.lastMonthEarnings > 0
      ? (((overview.monthEarnings - overview.lastMonthEarnings) / overview.lastMonthEarnings) * 100).toFixed(1)
      : null

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} className="p-1">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">收益明细</h1>
          <button className="p-1">
            <Filter className="w-5 h-5 text-foreground/60" />
          </button>
        </div>
      </div>

      <DataState
        loading={loading}
        error={error}
        empty={!overview}
        onRetry={loadData}
        skeleton={
          <div className="p-4 space-y-4">
            <div className="h-40 bg-gray-200 rounded-2xl animate-pulse" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        }
      >
        {overview && (
          <div className="pb-20">
            {/* 余额总览卡片 */}
            <div className="mx-4 mt-4 p-5 bg-gradient-to-br from-primary to-red-700 rounded-2xl text-white">
              <div className="text-sm opacity-80 mb-1">可提现余额</div>
              <div className="text-4xl font-bold mb-1">
                ¥{overview.availableBalance.toFixed(2)}
              </div>
              <div className="text-sm opacity-70 mb-4">
                冻结中 ¥{overview.frozenBalance.toFixed(2)}
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-lg font-bold">¥{overview.todayEarnings.toFixed(0)}</div>
                  <div className="text-xs opacity-70 mt-0.5">今日收益</div>
                </div>
                <div>
                  <div className="text-lg font-bold">¥{overview.monthEarnings.toFixed(0)}</div>
                  <div className="text-xs opacity-70 mt-0.5">本月收益</div>
                </div>
                <div>
                  <div className="text-lg font-bold">¥{overview.totalEarnings.toFixed(0)}</div>
                  <div className="text-xs opacity-70 mt-0.5">累计收益</div>
                </div>
              </div>
            </div>

            {/* 环比增长 */}
            {monthGrowth !== null && (
              <div className="mx-4 mt-3 p-3 bg-card rounded-xl border border-border flex items-center justify-between">
                <span className="text-sm text-muted-foreground">环比上月</span>
                <div className={`flex items-center gap-1 text-sm font-semibold ${
                  Number(monthGrowth) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {Number(monthGrowth) >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  {Math.abs(Number(monthGrowth))}%
                </div>
              </div>
            )}

            {/* 类型筛选 */}
            <div className="mt-5 px-4">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {TYPE_FILTERS.map(f => (
                  <button
                    key={f.value}
                    onClick={() => setActiveFilter(f.value)}
                    className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap flex-shrink-0 transition-colors ${
                      activeFilter === f.value
                        ? 'bg-primary text-white'
                        : 'bg-muted text-foreground hover:bg-muted/80'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 明细列表 */}
            <div className="mx-4 mt-4">
              {items.length > 0 ? (
                <div className="space-y-2">
                  {items.map(item => (
                    <Card key={item.id} className="p-4">
                      <div className="flex items-start gap-3">
                        {item.relatedUser ? (
                          <Avatar className="w-10 h-10 flex-shrink-0">
                            <AvatarImage src={item.relatedUser.avatar} />
                            <AvatarFallback className="text-xs">
                              {item.relatedUser.nickname.slice(0, 1)}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <TrendingUp className="w-5 h-5 text-primary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-foreground">
                                {item.title}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                {item.description}
                              </div>
                            </div>
                            <div className="text-sm font-bold text-green-600 flex-shrink-0">
                              +¥{item.amount.toFixed(2)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {getEarningsTypeName(item.type)}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[item.status]}`}
                            >
                              {getEarningsStatusName(item.status)}
                            </Badge>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {item.createdAt}
                            </span>
                          </div>
                          {item.relatedOrder && (
                            <div className="mt-1.5 text-xs text-muted-foreground">
                              订单金额 ¥{item.relatedOrder.orderAmount.toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-10 text-center">
                  <div className="text-muted-foreground text-sm">暂无收益明细</div>
                </Card>
              )}
            </div>

            {/* 提示 */}
            <div className="mx-4 mt-6 p-4 bg-muted/50 rounded-xl">
              <h4 className="text-sm font-semibold text-foreground mb-2">收益说明</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• 已结算收益可随时申请提现</li>
                <li>• 冻结收益将在交易确认后释放</li>
                <li>• 待结算收益通常 T+1 结算</li>
              </ul>
            </div>
          </div>
        )}
      </DataState>
    </div>
  )
}
