'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, TrendingUp, DollarSign, Users, Calendar } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DataState } from '@/components/data-state'

// Mock data - 圈子收益明细
const mockCircleEarnings = {
  totalEarnings: 285400,
  monthEarnings: 28540,
  memberCount: 12800,
  earningsList: [
    {
      id: '1',
      source: '圈费收入',
      amount: 12500,
      percentage: 43.8,
      description: '圈子成员加入费用',
      trend: 'up',
    },
    {
      id: '2',
      source: '课程销售',
      amount: 8200,
      percentage: 28.7,
      description: '付费课程收入',
      trend: 'up',
    },
    {
      id: '3',
      source: '咨询服务',
      amount: 5100,
      percentage: 17.9,
      description: '一对一咨询费用',
      trend: 'down',
    },
    {
      id: '4',
      source: '商品销售',
      amount: 2740,
      percentage: 9.6,
      description: '圈子商品销售',
      trend: 'up',
    },
  ],
  history: [
    { month: '2024年1月', earnings: 28540, members: 12800, rate: 123 },
    { month: '2023年12月', earnings: 26800, members: 12100, rate: 98 },
    { month: '2023年11月', earnings: 24900, members: 11450, rate: 82 },
    { month: '2023年10月', earnings: 23200, members: 10800, rate: 76 },
  ],
}

export default function CircleEarningsDetailPage() {
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
          <h1 className="text-lg font-semibold text-foreground">收益明细</h1>
          <div className="w-8" />
        </div>
      </div>

      <DataState
        loading={loading}
        empty={false}
        skeleton={
          <div className="p-4 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        }
      >
        <div className="pb-20">
          {/* 收益概览 */}
          <div className="mx-4 mt-4 p-4 bg-gradient-to-br from-primary to-red-700 text-white rounded-xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-sm opacity-80 mb-1">本月收益</div>
                <div className="text-3xl font-bold">
                  ¥{mockCircleEarnings.monthEarnings.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm opacity-80">累计收益</div>
                <div className="text-xl font-bold">
                  ¥{mockCircleEarnings.totalEarnings.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{mockCircleEarnings.memberCount} 名成员</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span>↑ 15% 同比增长</span>
              </div>
            </div>
          </div>

          {/* 收入构成 */}
          <div className="mx-4 mt-6">
            <h2 className="text-sm font-semibold text-foreground mb-3">收入构成</h2>
            <div className="space-y-2">
              {mockCircleEarnings.earningsList.map(item => (
                <Card key={item.id} className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-foreground">{item.source}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    </div>
                    <div className={`text-xs font-semibold ${
                      item.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {item.trend === 'up' ? '↑' : '↓'}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary rounded-full h-2 transition-all"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="ml-3 text-right">
                      <div className="text-sm font-bold text-foreground">
                        ¥{item.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-muted-foreground">{item.percentage}%</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* 历史数据 */}
          <div className="mx-4 mt-6">
            <h2 className="text-sm font-semibold text-foreground mb-3">历史收益</h2>
            <div className="space-y-2">
              {mockCircleEarnings.history.map((item, idx) => (
                <Card key={idx} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-foreground/60" />
                      <div>
                        <div className="text-sm font-medium text-foreground">{item.month}</div>
                        <div className="text-xs text-muted-foreground">{item.members} 名成员</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-foreground">
                        ¥{item.earnings.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                      </div>
                      <Badge variant="secondary" className="text-xs mt-1">
                        月均 ¥{Math.round(item.earnings / item.members)}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* 说明 */}
          <div className="mx-4 mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">收益说明</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• 圈费：新成员加入圈子的费用</li>
              <li>• 课程销售：圈内付费课程的销售额</li>
              <li>• 咨询服务：一对一付费咨询费用</li>
              <li>• 商品销售：圈子内销售的相关商品</li>
              <li>• 收益结算：每月月底统一结算，次月1日可提现</li>
            </ul>
          </div>
        </div>
      </DataState>
    </div>
  )
}
