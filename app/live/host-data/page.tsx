"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, TrendingUp, TrendingDown, Eye, Coins, Clock, Users, Play, Gift, RefreshCw } from "lucide-react"
import { liveApi, type HostLiveStats, type HostLiveRoom, type HostLiveTrend } from "@/lib/api"

// Mock数据
const mockStats: HostLiveStats = {
  totalViews: 125680,
  totalRevenue: 8960,
  avgDuration: 125,
  fansGrowth: 1280,
  totalRooms: 48,
  totalGifts: 3250,
  viewsGrowthRate: 15.2,
  revenueGrowthRate: 8.5,
}

const mockRooms: HostLiveRoom[] = [
  { id: "1", title: "八字命理入门精讲（第12期）", cover: "/placeholder.svg", status: "ended", startTime: "2024-01-15T19:00:00", endTime: "2024-01-15T21:30:00", duration: 150, views: 3280, peakViewers: 856, likes: 12500, gifts: 280, revenue: 560 },
  { id: "2", title: "紫微斗数实战案例分析", cover: "/placeholder.svg", status: "ended", startTime: "2024-01-12T20:00:00", endTime: "2024-01-12T22:00:00", duration: 120, views: 2560, peakViewers: 680, likes: 8900, gifts: 180, revenue: 380 },
  { id: "3", title: "六爻占卜基础教学", cover: "/placeholder.svg", status: "ended", startTime: "2024-01-10T19:30:00", endTime: "2024-01-10T21:00:00", duration: 90, views: 1980, peakViewers: 520, likes: 6500, gifts: 120, revenue: 240 },
  { id: "4", title: "梅花易数快速入门", cover: "/placeholder.svg", status: "preview", startTime: "2024-01-20T19:00:00", duration: 0, views: 0, peakViewers: 0, likes: 0, gifts: 0, revenue: 0 },
]

const mockTrend: HostLiveTrend[] = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  views: Math.floor(Math.random() * 3000) + 1000,
  revenue: Math.floor(Math.random() * 500) + 100,
  duration: Math.floor(Math.random() * 120) + 60,
}))

function formatNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return num.toString()
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}小时${m}分钟` : `${m}分钟`
}

export default function HostDataPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState<HostLiveStats | null>(null)
  const [rooms, setRooms] = useState<HostLiveRoom[]>([])
  const [trend, setTrend] = useState<HostLiveTrend[]>([])
  const [trendType, setTrendType] = useState<'views' | 'revenue'>('views')

  const loadData = useCallback(async () => {
    try {
      // 模拟API调用
      await new Promise(r => setTimeout(r, 800))
      setStats(mockStats)
      setRooms(mockRooms)
      setTrend(mockTrend)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleRefresh = () => {
    setRefreshing(true)
    loadData()
  }

  // 计算趋势图最大值
  const maxTrendValue = Math.max(...trend.map(t => trendType === 'views' ? t.views : t.revenue))

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <div className="sticky top-0 z-10 bg-gradient-to-r from-[#C41E3A] to-[#E85A70] px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-full animate-pulse" />
          <div className="w-24 h-5 bg-white/20 rounded animate-pulse" />
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 h-24 animate-pulse" />
            ))}
          </div>
          <div className="bg-white rounded-2xl p-4 h-48 animate-pulse" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 h-24 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-20">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-[#C41E3A] to-[#E85A70] text-white">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-1 -ml-1 rounded-full hover:bg-white/10">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <span className="text-lg font-medium">数据中心</span>
          </div>
          <button 
            onClick={handleRefresh} 
            className={`p-2 rounded-full hover:bg-white/10 ${refreshing ? 'animate-spin' : ''}`}
            disabled={refreshing}
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 概览卡片 */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-[#666666] text-sm mb-2">
              <Eye className="w-4 h-4" />
              <span>总观看</span>
            </div>
            <div className="text-2xl font-bold text-[#2C2C2C]">{formatNumber(stats?.totalViews || 0)}</div>
            <div className="flex items-center gap-1 mt-1">
              {(stats?.viewsGrowthRate || 0) >= 0 ? (
                <TrendingUp className="w-3 h-3 text-green-500" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-500" />
              )}
              <span className={`text-xs ${(stats?.viewsGrowthRate || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {Math.abs(stats?.viewsGrowthRate || 0)}%
              </span>
              <span className="text-xs text-[#999999]">较上月</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-[#666666] text-sm mb-2">
              <Coins className="w-4 h-4 text-[#C9A96E]" />
              <span>总收益</span>
            </div>
            <div className="text-2xl font-bold text-[#C9A96E]">¥{formatNumber(stats?.totalRevenue || 0)}</div>
            <div className="flex items-center gap-1 mt-1">
              {(stats?.revenueGrowthRate || 0) >= 0 ? (
                <TrendingUp className="w-3 h-3 text-green-500" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-500" />
              )}
              <span className={`text-xs ${(stats?.revenueGrowthRate || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {Math.abs(stats?.revenueGrowthRate || 0)}%
              </span>
              <span className="text-xs text-[#999999]">较上月</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-[#666666] text-sm mb-2">
              <Clock className="w-4 h-4" />
              <span>场均时长</span>
            </div>
            <div className="text-2xl font-bold text-[#2C2C2C]">{stats?.avgDuration || 0}<span className="text-sm font-normal ml-1">分钟</span></div>
            <div className="text-xs text-[#999999] mt-1">共{stats?.totalRooms || 0}场直播</div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-[#666666] text-sm mb-2">
              <Users className="w-4 h-4" />
              <span>粉丝增长</span>
            </div>
            <div className="text-2xl font-bold text-[#C41E3A]">+{formatNumber(stats?.fansGrowth || 0)}</div>
            <div className="text-xs text-[#999999] mt-1">本月新增</div>
          </div>
        </div>
      </div>

      {/* 趋势图 */}
      <div className="px-4 mb-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="font-medium text-[#2C2C2C]">近30天趋势</span>
            <div className="flex bg-[#FAF8F5] rounded-lg p-1">
              <button
                onClick={() => setTrendType('views')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  trendType === 'views' ? 'bg-white text-[#C41E3A] shadow-sm' : 'text-[#666666]'
                }`}
              >
                观看
              </button>
              <button
                onClick={() => setTrendType('revenue')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  trendType === 'revenue' ? 'bg-white text-[#C41E3A] shadow-sm' : 'text-[#666666]'
                }`}
              >
                收益
              </button>
            </div>
          </div>

          {/* 简易折线图 */}
          <div className="h-32 flex items-end gap-0.5">
            {trend.map((t, i) => {
              const value = trendType === 'views' ? t.views : t.revenue
              const height = maxTrendValue > 0 ? (value / maxTrendValue) * 100 : 0
              return (
                <div
                  key={i}
                  className="flex-1 bg-gradient-to-t from-[#C41E3A]/20 to-[#C41E3A]/60 rounded-t transition-all hover:from-[#C41E3A]/30 hover:to-[#C41E3A]/80"
                  style={{ height: `${Math.max(height, 4)}%` }}
                  title={`${t.date}: ${trendType === 'views' ? value + '次观看' : '¥' + value}`}
                />
              )
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-[#999999]">
            <span>{trend[0]?.date?.slice(5)}</span>
            <span>{trend[14]?.date?.slice(5)}</span>
            <span>{trend[29]?.date?.slice(5)}</span>
          </div>
        </div>
      </div>

      {/* 直播场次列表 */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-medium text-[#2C2C2C]">直播记录</span>
          <span className="text-sm text-[#999999]">共{rooms.length}场</span>
        </div>

        <div className="space-y-3">
          {rooms.map(room => (
            <div
              key={room.id}
              onClick={() => router.push(`/live/${room.id}`)}
              className="bg-white rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
            >
              <div className="flex gap-3">
                <div className="relative w-24 h-16 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={room.cover} alt={room.title} className="w-full h-full object-cover" />
                  {room.status === 'preview' ? (
                    <div className="absolute top-1 left-1 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded">
                      预告
                    </div>
                  ) : (
                    <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                      {formatDuration(room.duration)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-[#2C2C2C] text-sm line-clamp-1">{room.title}</h3>
                  <p className="text-xs text-[#999999] mt-1">
                    {new Date(room.startTime).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {room.status === 'ended' && (
                    <div className="flex items-center gap-3 mt-2 text-xs text-[#666666]">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {formatNumber(room.views)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Gift className="w-3 h-3 text-[#C9A96E]" />
                        {room.gifts}
                      </span>
                      <span className="text-[#C9A96E] font-medium">¥{room.revenue}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {rooms.length === 0 && (
          <div className="text-center py-12">
            <Play className="w-12 h-12 text-[#E8E3DB] mx-auto mb-3" />
            <p className="text-[#999999]">暂无直播记录</p>
            <button
              onClick={() => router.push('/live/create')}
              className="mt-4 px-6 py-2 bg-[#C41E3A] text-white rounded-full text-sm"
            >
              创建直播
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
