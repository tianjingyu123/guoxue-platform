'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, TrendingUp, TrendingDown, Eye, ThumbsUp, MessageSquare, Download } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DataState } from '@/components/data-state'
import {
  ChartContainer,
  ChartTooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer
} from '@/components/ui/chart'

// Mock data - 创作者数据分析
const mockAnalyticsData = {
  totalViews: 158420,
  totalLikes: 8320,
  totalComments: 1250,
  totalShares: 620,
  viewTrend: [
    { date: '周一', views: 2100, likes: 125, comments: 45 },
    { date: '周二', views: 2800, likes: 180, comments: 62 },
    { date: '周三', views: 2400, likes: 140, comments: 48 },
    { date: '周四', views: 3200, likes: 210, comments: 78 },
    { date: '周五', views: 3800, likes: 250, comments: 95 },
    { date: '周六', views: 4200, likes: 280, comments: 120 },
    { date: '周日', views: 3900, likes: 265, comments: 110 },
  ],
  videoMetrics: [
    {
      id: '1',
      title: '《易经》30分钟速成课',
      views: 15820,
      likes: 1250,
      comments: 280,
      shares: 85,
      duration: '30分',
      uploadDate: '2024-01-18',
    },
    {
      id: '2',
      title: '八字命理基础讲解',
      views: 12450,
      likes: 850,
      comments: 195,
      shares: 62,
      duration: '45分',
      uploadDate: '2024-01-17',
    },
    {
      id: '3',
      title: '紫微斗数应用技巧',
      views: 9850,
      likes: 620,
      comments: 150,
      shares: 48,
      duration: '52分',
      uploadDate: '2024-01-16',
    },
  ],
}

export default function CreatorAnalyticsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('week')

  const chartConfig = {
    views: { label: '观看', color: '#C41E3A' },
    likes: { label: '点赞', color: '#C9A96E' },
    comments: { label: '评论', color: '#8B7355' },
  }

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
          {(['week', 'month', 'year'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-primary text-white'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              {p === 'week' ? '本周' : p === 'month' ? '本月' : '本年'}
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
          <div className="mx-4 mt-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">关键指标</h2>
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3">
                <div className="text-xs text-muted-foreground mb-1">总观看</div>
                <div className="text-2xl font-bold text-foreground">
                  {(mockAnalyticsData.totalViews / 1000).toFixed(0)}K
                </div>
                <div className="flex items-center gap-1 mt-1 text-xs text-green-600">
                  <TrendingUp className="w-3 h-3" /> 12%
                </div>
              </Card>
              <Card className="p-3">
                <div className="text-xs text-muted-foreground mb-1">总点赞</div>
                <div className="text-2xl font-bold text-foreground">
                  {mockAnalyticsData.totalLikes}
                </div>
                <div className="flex items-center gap-1 mt-1 text-xs text-green-600">
                  <TrendingUp className="w-3 h-3" /> 8%
                </div>
              </Card>
              <Card className="p-3">
                <div className="text-xs text-muted-foreground mb-1">评论数</div>
                <div className="text-2xl font-bold text-foreground">
                  {mockAnalyticsData.totalComments}
                </div>
                <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                  <TrendingDown className="w-3 h-3" /> 2%
                </div>
              </Card>
              <Card className="p-3">
                <div className="text-xs text-muted-foreground mb-1">分享数</div>
                <div className="text-2xl font-bold text-foreground">
                  {mockAnalyticsData.totalShares}
                </div>
                <div className="flex items-center gap-1 mt-1 text-xs text-green-600">
                  <TrendingUp className="w-3 h-3" /> 5%
                </div>
              </Card>
            </div>
          </div>

          {/* 趋势图 */}
          <div className="mx-4 mt-6">
            <h2 className="text-sm font-semibold text-foreground mb-3">观看趋势</h2>
            <Card className="p-4">
              <ChartContainer config={chartConfig} className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mockAnalyticsData.viewTrend}>
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
                    <Line
                      type="monotone"
                      dataKey="views"
                      stroke="#C41E3A"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name="观看"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </Card>
          </div>

          {/* 视频统计 */}
          <div className="mx-4 mt-6">
            <h2 className="text-sm font-semibold text-foreground mb-3">视频统计</h2>
            <div className="space-y-2">
              {mockAnalyticsData.videoMetrics.map((video, idx) => (
                <Card key={video.id} className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-foreground line-clamp-1">
                        {video.title}
                      </h3>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {video.uploadDate} • {video.duration}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      #{idx + 1}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      <span>{video.views}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" />
                      <span>{video.likes}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      <span>{video.comments}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      <span>{video.shares}</span>
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
