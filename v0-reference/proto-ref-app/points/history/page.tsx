'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { DataState } from '@/components/data-state'
import { getPointsInfo, getPointsHistory } from '@/lib/api/points'
import type { PointsInfo, PointsHistoryItem } from '@/lib/types/points'

export default function PointsHistoryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pointsInfo, setPointsInfo] = useState<PointsInfo | null>(null)
  const [historyItems, setHistoryItems] = useState<PointsHistoryItem[]>([])
  const [activeTab, setActiveTab] = useState<'all' | 'earn' | 'spend'>('all')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [infoRes, historyRes] = await Promise.all([
        getPointsInfo(),
        getPointsHistory(1, 50),
      ])
      if (infoRes.code === 200) setPointsInfo(infoRes.data)
      else setError('加载积分信息失败')
      if (historyRes.code === 200) setHistoryItems(historyRes.data)
    } catch {
      setError('加载失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const filteredItems = historyItems.filter(item => {
    if (activeTab === 'all') return true
    return item.type === activeTab
  })

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} className="p-1">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">积分记录</h1>
          <div className="w-8" />
        </div>
      </div>

      <DataState
        loading={loading}
        error={error}
        empty={!pointsInfo}
        onRetry={loadData}
        skeleton={
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse" />
              ))}
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-16 bg-gray-200 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        }
      >
        {pointsInfo && (
          <div className="pb-20">
            {/* 积分统计 */}
            <div className="mx-4 mt-4 grid grid-cols-2 gap-3">
              <Card className="p-4 text-center col-span-2 bg-amber-50 border border-amber-200">
                <div className="text-xs text-amber-700 mb-1">当前积分余额</div>
                <div className="text-3xl font-bold text-amber-800">
                  {pointsInfo.balance.toLocaleString()}
                </div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-xs text-muted-foreground mb-1">累计获取</div>
                <div className="text-xl font-bold text-green-600">
                  +{pointsInfo.totalEarned.toLocaleString()}
                </div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-xs text-muted-foreground mb-1">累计使用</div>
                <div className="text-xl font-bold text-foreground">
                  -{pointsInfo.totalSpent.toLocaleString()}
                </div>
              </Card>
            </div>

            {/* 快捷操作 */}
            <div className="mx-4 mt-3 flex gap-3">
              <button
                onClick={() => router.push('/points/tasks')}
                className="flex-1 py-2.5 rounded-xl border border-border text-foreground text-sm font-medium hover:border-primary/50 transition-colors"
              >
                去做任务
              </button>
              <button
                onClick={() => router.push('/points/exchange')}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-medium"
              >
                积分兑换
              </button>
            </div>

            {/* Tab 筛选 */}
            <div className="mx-4 mt-5 flex gap-2">
              {([
                { key: 'all', label: '全部' },
                { key: 'earn', label: '获取记录' },
                { key: 'spend', label: '使用记录' },
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'bg-primary text-white'
                      : 'bg-muted text-foreground hover:bg-muted/80'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 记录列表 */}
            <div className="mx-4 mt-4">
              {filteredItems.length > 0 ? (
                <div className="space-y-2">
                  {filteredItems.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border"
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                        item.type === 'earn' ? 'bg-green-50' : 'bg-gray-50'
                      }`}>
                        {item.type === 'earn' ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground">{item.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{item.time}</div>
                      </div>
                      <div className={`text-sm font-bold flex-shrink-0 ${
                        item.type === 'earn' ? 'text-green-600' : 'text-foreground'
                      }`}>
                        {item.points > 0 ? '+' : ''}{item.points}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Card className="p-10 text-center">
                  <div className="text-muted-foreground text-sm">暂无记录</div>
                </Card>
              )}
            </div>
          </div>
        )}
      </DataState>
    </div>
  )
}
