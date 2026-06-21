'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, TrendingUp, TrendingDown, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DataState } from '@/components/data-state'
import { 
  ChartContainer, 
  ChartTooltip,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer
} from '@/components/ui/chart'
import { getMerchantAnalytics } from '@/lib/api/merchant'
import type { MerchantAnalyticsData } from '@/lib/types/merchant'

const chartConfig = {
  sales: { label: '销售额', color: '#C41E3A' },
  orders: { label: '订单数', color: '#C9A96E' },
  visitors: { label: '访客数', color: '#8B7355' },
}

export default function MerchantAnalyticsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<MerchantAnalyticsData | null>(null)
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('month')

  useEffect(() => {
    loadData()
  }, [period])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getMerchantAnalytics(period)
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

  const colors = ['#C41E3A', '#E85D75', '#C9A96E', '#8B7355']

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} className="p-1">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">数据分析</h1>
          <button className="p-1">
            <Download className="w-6 h-6 text-foreground/60" />
          </button>
        </div>
      </div>

      {/* 时间周期选择 */}
      <div className="sticky top-14 z-9 bg-background border-b border-border px-4 py-3">
        <div className="flex gap-2">
          {(['day', 'week', 'month'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-primary text-white'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              {p === 'day' ? '今天' : p === 'week' ? '本周' : '本月'}
            </button>
          ))}
        </div>
      </div>

      <DataState
        loading={loading}
        error={error}
        empty={!data}
        onRetry={loadData}
        skeleton={
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        }
      >
        {data && (
          <div className="pb-20">
            {/* 关键指标 */}
            <div className="mx-4 mt-4 space-y-3">
              <h2 className="text-sm font-semibold text-foreground">关键指标</h2>
              <div className="grid grid-cols-2 gap-3">
                {data.metrics.map((metric, idx) => (
                  <Card key={idx} className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">{metric.title}</div>
                        <div className="text-xl font-bold text-foreground">
                          {metric.value.toLocaleString()}
                          <span className="text-xs ml-1 text-muted-foreground">{metric.unit}</span>
                        </div>
                      </div>
                      <div className={`flex items-center gap-0.5 text-xs font-medium ${
                        metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {metric.trend === 'up' ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {Math.abs(metric.change)}%
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">{metric.description}</div>
                  </Card>
                ))}
              </div>
            </div>

            {/* 销售趋势图 */}
            <div className="mx-4 mt-6">
              <h2 className="text-sm font-semibold text-foreground mb-3">销售趋势</h2>
              <Card className="p-4">
                <ChartContainer config={chartConfig} className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.salesTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#666"
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis 
                        stroke="#666"
                        style={{ fontSize: '12px' }}
                      />
                      <ChartTooltip 
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #E5E5E5',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="sales" 
                        stroke="#C41E3A" 
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                        name="销售额(元)"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="orders" 
                        stroke="#C9A96E" 
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                        name="订单数"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </Card>
            </div>

            {/* 分类销售分布 */}
            <div className="mx-4 mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* 饼图 */}
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">分类销售分布</h3>
                <ChartContainer config={chartConfig} className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.categorySales}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name} ${percentage}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="sales"
                      >
                        {data.categorySales.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip 
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #E5E5E5',
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </Card>

              {/* 分类详情表 */}
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">分类详情</h3>
                <div className="space-y-3">
                  {data.categorySales.map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2 flex-1">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: colors[idx % colors.length] }}
                        />
                        <div>
                          <div className="text-sm font-medium text-foreground">{cat.name}</div>
                          <div className="text-xs text-muted-foreground">{cat.orders} 单</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-foreground">¥{cat.sales.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">{cat.percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* 热销商品 */}
            <div className="mx-4 mt-6">
              <h3 className="text-sm font-semibold text-foreground mb-3">热销商品 TOP 3</h3>
              <div className="space-y-2">
                {data.topProducts.map((product, idx) => (
                  <Card key={product.id} className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          #{idx + 1}
                        </Badge>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-foreground line-clamp-1">
                            {product.name}
                          </div>
                        </div>
                      </div>
                      <div className={`text-xs font-semibold flex items-center gap-0.5 ${
                        product.change >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {product.change >= 0 ? '↑' : '↓'} {Math.abs(product.change)}%
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        销售 {product.sales} 件
                      </div>
                      <div className="text-sm font-bold text-foreground">
                        ¥{product.revenue.toLocaleString()}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* 用户留存 */}
            <div className="mx-4 mt-6">
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-foreground mb-4">用户留存统计</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-foreground">
                      {data.customerRetention.newCustomers}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">新客户</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-foreground">
                      {data.customerRetention.repeatCustomers}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">复购客户</div>
                  </div>
                  <div className="text-center p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <div className="text-2xl font-bold text-primary">
                      {data.customerRetention.retention}%
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">复购率</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </DataState>
    </div>
  )
}
