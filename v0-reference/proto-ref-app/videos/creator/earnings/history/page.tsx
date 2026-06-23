'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, TrendingUp, Plus, Calendar } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DataState } from '@/components/data-state'

// Mock data - 创作者收益历史
const mockEarningsHistory = {
  totalEarnings: 125480,
  monthlyEarnings: 18520,
  records: [
    {
      id: '1',
      month: '2024年1月',
      earnings: 18520,
      orders: 385,
      trend: 'up',
      change: 12,
    },
    {
      id: '2',
      month: '2023年12月',
      earnings: 16520,
      orders: 342,
      trend: 'up',
      change: 8,
    },
    {
      id: '3',
      month: '2023年11月',
      earnings: 15280,
      orders: 315,
      trend: 'down',
      change: -3,
    },
    {
      id: '4',
      month: '2023年10月',
      earnings: 15750,
      orders: 325,
      trend: 'up',
      change: 5,
    },
    {
      id: '5',
      month: '2023年9月',
      earnings: 15010,
      orders: 310,
      trend: 'up',
      change: 2,
    },
    {
      id: '6',
      month: '2023年8月',
      earnings: 14720,
      orders: 305,
      trend: 'down',
      change: -1,
    },
  ],
}

export default function CreatorEarningsHistoryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} className="p-1">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">收益历史</h1>
          <div className="w-8" />
        </div>
      </div>

      <DataState
        loading={loading}
        empty={false}
        skeleton={
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        }
      >
        <div className="pb-20">
          {/* 总体统计 */}
          <div className="mx-4 mt-4 grid grid-cols-2 gap-3">
            <Card className="p-4 text-center">
              <div className="text-xs text-muted-foreground mb-1">累计收益</div>
              <div className="text-2xl font-bold text-foreground">
                ¥{mockEarningsHistory.totalEarnings.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-xs text-muted-foreground mb-1">本月收益</div>
              <div className="text-2xl font-bold text-green-600">
                ¥{mockEarningsHistory.monthlyEarnings.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-green-600 mt-1">↑ 12%</div>
            </Card>
          </div>

          {/* 历史记录 */}
          <div className="mx-4 mt-6">
            <h2 className="text-sm font-semibold text-foreground mb-3">收益明细</h2>
            <div className="space-y-2">
              {mockEarningsHistory.records.map(record => (
                <button
                  key={record.id}
                  onClick={() => {}}
                  className="w-full p-3 rounded-lg border border-border hover:border-primary/30 bg-card transition-all text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-foreground/60" />
                      <span className="font-medium text-foreground">{record.month}</span>
                    </div>
                    <div className={`flex items-center gap-1 font-semibold ${
                      record.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {record.trend === 'up' ? '↑' : '↓'} {Math.abs(record.change)}%
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{record.orders} 个订单</span>
                    <span className="text-lg font-bold text-foreground">
                      ¥{record.earnings.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 提示 */}
          <div className="mx-4 mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">收益说明</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• 收益结算周期为每个自然月</li>
              <li>• 提现可在次月1日起申请</li>
              <li>• 平台提成 25%，创作者获得 75%</li>
              <li>• 点击记录可查看订单详情</li>
            </ul>
          </div>
        </div>
      </DataState>
    </div>
  )
}
