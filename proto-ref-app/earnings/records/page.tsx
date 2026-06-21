'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DataState } from '@/components/data-state'
import { getEarningsOverview, getEarningsList, getEarningsTypeName, getEarningsStatusName } from '@/lib/api/earnings'
import type { EarningsOverview, EarningsItem } from '@/lib/types/earnings'

const STATUS_COLORS = {
  settled: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  frozen: 'bg-gray-100 text-gray-800',
}

export default function EarningsRecordsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [overview, setOverview] = useState<EarningsOverview | null>(null)
  const [items, setItems] = useState<EarningsItem[]>([])
  const [activeStatus, setActiveStatus] = useState<'all' | 'settled' | 'pending' | 'frozen'>('all')

  useEffect(() => {
    loadData()
  }, [activeStatus])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [overviewRes, listRes] = await Promise.all([
        getEarningsOverview(),
        getEarningsList(1, 20, {
          status: activeStatus === 'all' ? undefined : activeStatus,
        }),
      ])
      if (overviewRes.code === 200) setOverview(overviewRes.data)
      else setError('加载数据失败')
      if (listRes.code === 200) setItems(listRes.data.list)
    } catch {
      setError('加载失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} className="p-1">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">收益记录</h1>
          <div className="w-8" />
        </div>
      </div>

      <DataState
        loading={loading}
        error={error}
        empty={!overview}
        onRetry={loadData}
        skeleton={
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
              ))}
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        }
      >
        {overview && (
          <div className="pb-20">
            {/* 统计卡片 */}
            <div className="mx-4 mt-4 grid grid-cols-2 gap-3">
              <Card className="p-4 text-center col-span-2 bg-primary/5 border border-primary/20">
                <div className="text-xs text-muted-foreground mb-1">累计总收益</div>
                <div className="text-3xl font-bold text-primary">
                  ¥{overview.totalEarnings.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-xs text-muted-foreground mb-1">本月收益</div>
                <div className="text-xl font-bold text-foreground">
                  ¥{overview.monthEarnings.toFixed(2)}
                </div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-xs text-muted-foreground mb-1">上月收益</div>
                <div className="text-xl font-bold text-foreground">
                  ¥{overview.lastMonthEarnings.toFixed(2)}
                </div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-xs text-muted-foreground mb-1">可提现</div>
                <div className="text-xl font-bold text-green-600">
                  ¥{overview.availableBalance.toFixed(2)}
                </div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-xs text-muted-foreground mb-1">冻结中</div>
                <div className="text-xl font-bold text-muted-foreground">
                  ¥{overview.frozenBalance.toFixed(2)}
                </div>
              </Card>
            </div>

            {/* 快捷操作 */}
            <div className="mx-4 mt-4 flex gap-3">
              <button
                onClick={() => router.push('/earnings/withdraw')}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-medium"
              >
                申请提现
              </button>
              <button
                onClick={() => router.push('/earnings/breakdown')}
                className="flex-1 py-2.5 rounded-xl border border-border text-foreground text-sm font-medium"
              >
                收益明细
              </button>
            </div>

            {/* 状态筛选 */}
            <div className="mx-4 mt-5">
              <div className="flex gap-2">
                {(['all', 'settled', 'pending', 'frozen'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setActiveStatus(s)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      activeStatus === s
                        ? 'bg-primary text-white'
                        : 'bg-muted text-foreground hover:bg-muted/80'
                    }`}
                  >
                    {s === 'all' ? '全部' : s === 'settled' ? '已结算' : s === 'pending' ? '待结算' : '冻结中'}
                  </button>
                ))}
              </div>
            </div>

            {/* 收益记录列表 */}
            <div className="mx-4 mt-4">
              {items.length > 0 ? (
                <div className="space-y-2">
                  {items.map(item => (
                    <Card key={item.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <TrendingUp className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground line-clamp-1">
                              {item.title}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {item.description}
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
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {item.createdAt}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm font-bold text-green-600 flex-shrink-0">
                          +¥{item.amount.toFixed(2)}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-10 text-center">
                  <div className="text-muted-foreground text-sm">暂无收益记录</div>
                </Card>
              )}
            </div>
          </div>
        )}
      </DataState>
    </div>
  )
}
