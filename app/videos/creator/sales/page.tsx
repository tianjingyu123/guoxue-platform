'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, TrendingUp, ShoppingBag, Users, DollarSign } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DataState } from '@/components/data-state'
import {
  ChartContainer,
  ChartTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer
} from '@/components/ui/chart'

// Mock data - 创作者销售数据
const mockSalesData = {
  totalSales: 48520,
  totalRevenue: 36390,
  totalOrders: 385,
  totalCustomers: 280,
  salesTrend: [
    { date: '01-15', sales: 1200, revenue: 900, orders: 8 },
    { date: '01-16', sales: 1850, revenue: 1388, orders: 12 },
    { date: '01-17', sales: 1520, revenue: 1140, orders: 10 },
    { date: '01-18', sales: 2100, revenue: 1575, orders: 14 },
    { date: '01-19', sales: 1850, revenue: 1388, orders: 12 },
    { date: '01-20', sales: 2450, revenue: 1838, orders: 16 },
  ],
  topProducts: [
    {
      id: '1',
      title: '《易经》进阶课程',
      sales: 185,
      revenue: 8250,
      conversion: 12.5,
    },
    {
      id: '2',
      title: '八字算命付费咨询',
      sales: 128,
      revenue: 5120,
      conversion: 8.2,
    },
    {
      id: '3',
      title: '紫微斗数秘籍合集',
      sales: 72,
      revenue: 3600,
      conversion: 4.8,
    },
  ],
}

export default function CreatorSalesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [period, setPeriod] = useState<'week' | 'month'>('month')

  const chartConfig = {
    sales: { label: '销售额', color: '#C41E3A' },
    revenue: { label: '收益', color: '#C9A96E' },
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} className="p-1">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">销售数据</h1>
          <div className="w-8" />
        </div>
      </div>

      {/* 时间周期 */}
      <div className="sticky top-14 z-9 bg-background border-b border-border px-4 py-3">
        <div className="flex gap-2">
          {(['week', 'month'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-primary text-white'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              {p === 'week' ? '本周' : '本月'}
            </button>
          ))}
        </div>
      </div>

      <DataState
        loading={loading}
        empty={false}
        skeleton={
          <div className="p-4 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        }
      >
        <div className="pb-20">
          {/* 关键指标 */}
          <div className="mx-4 mt-4 grid grid-cols-2 gap-3">
            <Card className="p-3">
              <div className="text-xs text-muted-foreground mb-1">销售额</div>
              <div className="text-2xl font-bold text-foreground">
                ¥{mockSalesData.totalSales.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </div>
              <div className="flex items-center gap-1 mt-1 text-xs text-green-600">
                <TrendingUp className="w-3 h-3" /> 15%
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-muted-foreground mb-1">预期收益</div>
              <div className="text-2xl font-bold text-foreground">
                ¥{mockSalesData.totalRevenue.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-muted-foreground mt-1">75% 提成</div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-muted-foreground mb-1">订单数</div>
              <div className="text-2xl font-bold text-foreground">{mockSalesData.totalOrders}</div>
              <div className="text-xs text-muted-foreground mt-1">平均 ¥126</div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-muted-foreground mb-1">客户数</div>
              <div className="text-2xl font-bold text-foreground">{mockSalesData.totalCustomers}</div>
              <div className="text-xs text-muted-foreground mt-1">重复购 28%</div>
            </Card>
          </div>

          {/* 销售趋势 */}
          <div className="mx-4 mt-6">
            <h2 className="text-sm font-semibold text-foreground mb-3">销售趋势</h2>
            <Card className="p-4">
              <ChartContainer config={chartConfig} className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockSalesData.salesTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                    <XAxis dataKey="date" stroke="#666" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#666" style={{ fontSize: '12px' }} />
                    <ChartTooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #E5E5E5',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="sales" fill="#C41E3A" name="销售额" />
                    <Bar dataKey="revenue" fill="#C9A96E" name="收益" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </Card>
          </div>

          {/* 热销产品 */}
          <div className="mx-4 mt-6">
            <h2 className="text-sm font-semibold text-foreground mb-3">热销产品</h2>
            <div className="space-y-2">
              {mockSalesData.topProducts.map((product, idx) => (
                <Card key={product.id} className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-foreground">{product.title}</h3>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      #{idx + 1}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <ShoppingBag className="w-3 h-3" />
                      <span>{product.sales} 单</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      <span>¥{product.revenue}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      <span>{product.conversion}%</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </DataState>
    </div>
  )
}
