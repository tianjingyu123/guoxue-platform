"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  ArrowLeft, RefreshCw, Users, Activity, FileText, DollarSign,
  TrendingUp, TrendingDown, AlertTriangle, Crown, Heart, MessageCircle, Eye
} from "lucide-react"
import { circleDashboardApi } from "@/lib/api"
import type { 
  CircleDashboardOverview, CircleTrend, Contributor, HotPost, ChurnWarning, RevenueBreakdown 
} from "@/lib/api"

// Mock数据
const mockOverview: CircleDashboardOverview = {
  totalMembers: 12580,
  membersGrowth: 8.5,
  activeMembers: 3240,
  activeGrowth: 12.3,
  totalPosts: 8960,
  postsGrowth: -2.1,
  totalRevenue: 156800,
  revenueGrowth: 15.8,
}

const mockTrends: CircleTrend[] = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
  members: 12000 + Math.floor(Math.random() * 600),
  posts: 200 + Math.floor(Math.random() * 100),
  active: 2800 + Math.floor(Math.random() * 500),
  revenue: 4000 + Math.floor(Math.random() * 2000),
}))

const mockContributors: Contributor[] = [
  { id: "1", name: "易学大师", avatar: "/placeholder.svg", posts: 128, likes: 3560, rank: 1 },
  { id: "2", name: "命理研究者", avatar: "/placeholder.svg", posts: 96, likes: 2840, rank: 2 },
  { id: "3", name: "周易爱好者", avatar: "/placeholder.svg", posts: 85, likes: 2120, rank: 3 },
  { id: "4", name: "风水学徒", avatar: "/placeholder.svg", posts: 72, likes: 1890, rank: 4 },
  { id: "5", name: "国学传承", avatar: "/placeholder.svg", posts: 68, likes: 1650, rank: 5 },
]

const mockHotPosts: HotPost[] = [
  { id: "1", title: "八字入门：如何看懂自己的命盘", author: "易学大师", views: 12580, likes: 896, comments: 234 },
  { id: "2", title: "紫微斗数与八字的区别详解", author: "命理研究者", views: 9860, likes: 756, comments: 189 },
  { id: "3", title: "2024年流年运势预测方法", author: "周易爱好者", views: 8420, likes: 623, comments: 156 },
  { id: "4", title: "风水布局的基本原则", author: "风水学徒", views: 7650, likes: 542, comments: 128 },
  { id: "5", title: "易经六十四卦快速记忆法", author: "国学传承", views: 6890, likes: 489, comments: 98 },
]

const mockChurnWarning: ChurnWarning[] = [
  { id: "1", name: "沉默用户A", avatar: "/placeholder.svg", lastActive: "2024-01-15", daysSilent: 28, totalPosts: 15 },
  { id: "2", name: "流失风险B", avatar: "/placeholder.svg", lastActive: "2024-01-18", daysSilent: 25, totalPosts: 8 },
  { id: "3", name: "待唤醒C", avatar: "/placeholder.svg", lastActive: "2024-01-20", daysSilent: 23, totalPosts: 22 },
]

const mockRevenue: RevenueBreakdown = {
  total: 156800,
  items: [
    { name: "入圈费", value: 89600, percent: 57.1, color: "#C41E3A" },
    { name: "打赏收入", value: 34200, percent: 21.8, color: "#C9A96E" },
    { name: "连麦咨询", value: 23400, percent: 14.9, color: "#4A90D9" },
    { name: "知识付费", value: 9600, percent: 6.2, color: "#52C41A" },
  ],
}

export default function OwnerDashboardPage() {
  const params = useParams()
  const router = useRouter()
  const circleId = params.id as string

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [overview, setOverview] = useState<CircleDashboardOverview | null>(null)
  const [trends, setTrends] = useState<CircleTrend[]>([])
  const [contributors, setContributors] = useState<Contributor[]>([])
  const [hotPosts, setHotPosts] = useState<HotPost[]>([])
  const [churnWarning, setChurnWarning] = useState<ChurnWarning[]>([])
  const [revenue, setRevenue] = useState<RevenueBreakdown | null>(null)
  const [trendType, setTrendType] = useState<'members' | 'posts' | 'active' | 'revenue'>('members')

  useEffect(() => {
    loadData()
  }, [circleId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [overviewRes, trendsRes, contributorsRes, hotRes, churnRes, revenueRes] = await Promise.all([
        circleDashboardApi.overview(circleId),
        circleDashboardApi.trends(circleId, 30),
        circleDashboardApi.topContributors(circleId, 5),
        circleDashboardApi.hotContent(circleId, 5),
        circleDashboardApi.churnWarning(circleId),
        circleDashboardApi.revenueBreakdown(circleId),
      ])
      setOverview(overviewRes)
      setTrends(trendsRes)
      setContributors(contributorsRes)
      setHotPosts(hotRes)
      setChurnWarning(churnRes)
      setRevenue(revenueRes)
    } catch {
      // 使用mock数据
      setOverview(mockOverview)
      setTrends(mockTrends)
      setContributors(mockContributors)
      setHotPosts(mockHotPosts)
      setChurnWarning(mockChurnWarning)
      setRevenue(mockRevenue)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const formatNumber = (num: number) => {
    if (num >= 10000) return (num / 10000).toFixed(1) + '万'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
    return num.toString()
  }

  // 计算趋势图最大值
  const trendMax = Math.max(...trends.map(t => t[trendType]))
  const trendMin = Math.min(...trends.map(t => t[trendType]))

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB] px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#F5F5F5] animate-pulse" />
          <div className="h-5 w-24 bg-[#F5F5F5] rounded animate-pulse" />
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 h-24 animate-pulse" />
            ))}
          </div>
          <div className="bg-white rounded-2xl p-4 h-48 animate-pulse" />
          <div className="bg-white rounded-2xl p-4 h-64 animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-6">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1">
            <ArrowLeft className="w-5 h-5 text-[#2C2C2C]" />
          </button>
          <h1 className="text-lg font-semibold text-[#2C2C2C]">数据看板</h1>
        </div>
        <button 
          onClick={handleRefresh}
          className="p-2 rounded-full hover:bg-[#FAF8F5]"
          disabled={refreshing}
        >
          <RefreshCw className={`w-5 h-5 text-[#666666] ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* 概览卡片 */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Users, label: "总成员", value: overview?.totalMembers || 0, growth: overview?.membersGrowth || 0, color: "#C41E3A" },
            { icon: Activity, label: "活跃成员", value: overview?.activeMembers || 0, growth: overview?.activeGrowth || 0, color: "#4A90D9" },
            { icon: FileText, label: "总帖子", value: overview?.totalPosts || 0, growth: overview?.postsGrowth || 0, color: "#C9A96E" },
            { icon: DollarSign, label: "总收益", value: overview?.totalRevenue || 0, growth: overview?.revenueGrowth || 0, color: "#52C41A", isPrice: true },
          ].map((item, idx) => (
            <button
              key={idx}
              className="bg-white rounded-2xl p-4 text-left shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2 mb-2">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${item.color}15` }}
                >
                  <item.icon className="w-4 h-4" style={{ color: item.color }} />
                </div>
                <span className="text-xs text-[#999999]">{item.label}</span>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-xl font-bold text-[#2C2C2C]">
                  {item.isPrice ? '¥' : ''}{formatNumber(item.value)}
                </span>
                <div className={`flex items-center text-xs ${item.growth >= 0 ? 'text-[#52C41A]' : 'text-[#FF4D4F]'}`}>
                  {item.growth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  <span className="ml-0.5">{Math.abs(item.growth)}%</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* 趋势图 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#2C2C2C]">近30天趋势</h3>
            <div className="flex gap-1">
              {(['members', 'posts', 'active', 'revenue'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setTrendType(type)}
                  className={`px-2 py-1 text-xs rounded-full transition-colors ${
                    trendType === type 
                      ? 'bg-[#C41E3A] text-white' 
                      : 'bg-[#FAF8F5] text-[#666666]'
                  }`}
                >
                  {{ members: '成员', posts: '帖子', active: '活跃', revenue: '收益' }[type]}
                </button>
              ))}
            </div>
          </div>
          
          {/* 简易折线图 */}
          <div className="h-32 flex items-end gap-0.5">
            {trends.slice(-30).map((t, i) => {
              const value = t[trendType]
              const height = trendMax === trendMin ? 50 : ((value - trendMin) / (trendMax - trendMin)) * 100
              return (
                <div
                  key={i}
                  className="flex-1 rounded-t transition-all hover:opacity-80"
                  style={{
                    height: `${Math.max(height, 5)}%`,
                    background: i === trends.length - 1 
                      ? 'linear-gradient(180deg, #C41E3A 0%, #E85A71 100%)'
                      : 'linear-gradient(180deg, #E8E3DB 0%, #F5F0E8 100%)',
                  }}
                  title={`${t.date}: ${formatNumber(value)}`}
                />
              )
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-[#999999]">
            <span>30天前</span>
            <span>今日</span>
          </div>
        </div>

        {/* 活跃贡献者排行 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-[#2C2C2C] mb-3">活跃贡献者 TOP5</h3>
          <div className="space-y-3">
            {contributors.map((c, idx) => (
              <div key={c.id} className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-[#FAF8F5] overflow-hidden">
                    <div className="w-full h-full bg-gradient-to-br from-[#C9A96E] to-[#E8D5B7] flex items-center justify-center text-white text-sm font-medium">
                      {c.name[0]}
                    </div>
                  </div>
                  {idx < 3 && (
                    <div 
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ 
                        background: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : '#CD7F32'
                      }}
                    >
                      {idx + 1}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#2C2C2C] truncate">{c.name}</p>
                  <p className="text-xs text-[#999999]">{c.posts}篇帖子</p>
                </div>
                <div className="flex items-center gap-1 text-[#C41E3A]">
                  <Heart className="w-3 h-3 fill-current" />
                  <span className="text-xs">{formatNumber(c.likes)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 热门内容 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-[#2C2C2C] mb-3">热门内容 TOP5</h3>
          <div className="space-y-3">
            {hotPosts.map((post, idx) => (
              <button
                key={post.id}
                onClick={() => router.push(`/circles/${circleId}/posts/${post.id}`)}
                className="w-full text-left flex items-start gap-3 p-2 rounded-xl hover:bg-[#FAF8F5] transition-colors"
              >
                <span 
                  className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold shrink-0"
                  style={{
                    background: idx < 3 ? ['#FFD70020', '#C0C0C020', '#CD7F3220'][idx] : '#F5F5F5',
                    color: idx < 3 ? ['#B8860B', '#808080', '#8B4513'][idx] : '#999999',
                  }}
                >
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#2C2C2C] line-clamp-1">{post.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-[#999999]">
                    <span className="flex items-center gap-0.5">
                      <Eye className="w-3 h-3" />{formatNumber(post.views)}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Heart className="w-3 h-3" />{formatNumber(post.likes)}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <MessageCircle className="w-3 h-3" />{post.comments}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 流失预警 */}
        {churnWarning.length > 0 && (
          <div className="bg-gradient-to-r from-[#FFF7E6] to-[#FFF1D6] rounded-2xl p-4 border border-[#FFD591]">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-[#FA8C16]" />
              <h3 className="font-semibold text-[#2C2C2C]">流失预警</h3>
              <span className="ml-auto px-2 py-0.5 bg-[#FA8C16] text-white text-xs rounded-full">
                {churnWarning.length}人
              </span>
            </div>
            <div className="space-y-2">
              {churnWarning.map(user => (
                <button
                  key={user.id}
                  onClick={() => router.push(`/user/${user.id}`)}
                  className="w-full flex items-center gap-3 p-2 bg-white/60 rounded-xl"
                >
                  <div className="w-8 h-8 rounded-full bg-[#FAF8F5] flex items-center justify-center text-sm text-[#999999]">
                    {user.name[0]}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm text-[#2C2C2C]">{user.name}</p>
                    <p className="text-xs text-[#999999]">已沉默{user.daysSilent}天</p>
                  </div>
                  <span className="text-xs text-[#FA8C16]">唤醒</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 收益构成 */}
        {revenue && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[#2C2C2C]">收益构成</h3>
              <span className="text-lg font-bold text-[#C41E3A]">¥{formatNumber(revenue.total)}</span>
            </div>
            
            {/* 饼图简化版 - 水平条形 */}
            <div className="space-y-3">
              {revenue.items.map((item, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-[#666666]">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium text-[#2C2C2C]">¥{formatNumber(item.value)}</span>
                  </div>
                  <div className="h-2 bg-[#F5F5F5] rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ 
                        width: `${item.percent}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
