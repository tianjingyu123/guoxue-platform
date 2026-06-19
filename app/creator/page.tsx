"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  ChevronLeft, FileText, BarChart3, Wallet, Users, 
  Eye, Heart, MessageCircle, TrendingUp, TrendingDown,
  MoreVertical, Edit, Trash2, RefreshCw, Plus
} from "lucide-react"

// Mock data
const mockOverview = {
  contents: 28,
  totalViews: 125600,
  totalRevenue: 3680.50,
  followers: 1256,
  contentsGrowth: 12,
  viewsGrowth: 8.5,
  revenueGrowth: 15.2,
  followersGrowth: 5.8,
}

const mockContents = [
  { id: "1", type: "article" as const, title: "八字命理入门：天干地支的基础知识", cover: "/placeholder.svg", status: "published" as const, publishedAt: "2024-01-15", views: 3280, likes: 156, comments: 42, revenue: 128.5 },
  { id: "2", type: "post" as const, title: "今日分享：如何看流年运势", status: "published" as const, publishedAt: "2024-01-14", views: 1560, likes: 89, comments: 23, revenue: 45.0 },
  { id: "3", type: "article" as const, title: "紫微斗数与八字的区别", cover: "/placeholder.svg", status: "reviewing" as const, views: 0, likes: 0, comments: 0, revenue: 0 },
  { id: "4", type: "article" as const, title: "风水布局的基本原则", cover: "/placeholder.svg", status: "draft" as const, views: 0, likes: 0, comments: 0, revenue: 0 },
]

const mockRevenueTrends = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
  revenue: Math.floor(Math.random() * 200) + 50,
  type: ['打赏', '付费内容', '课程分成'][Math.floor(Math.random() * 3)],
}))

const mockFollowers = [
  { id: "1", name: "命理爱好者", avatar: "/placeholder.svg", followedAt: "2024-01-15", hasInteracted: true },
  { id: "2", name: "易学新人", avatar: "/placeholder.svg", followedAt: "2024-01-14", hasInteracted: false },
  { id: "3", name: "周易研习", avatar: "/placeholder.svg", followedAt: "2024-01-13", hasInteracted: true },
]

type Tab = "content" | "analytics" | "revenue" | "interaction"

export default function CreatorCenterPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>("content")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showMenu, setShowMenu] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800)
    return () => clearTimeout(timer)
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await new Promise(r => setTimeout(r, 1000))
    setRefreshing(false)
  }

  const handleDelete = (id: string) => {
    if (confirm("确定删除这篇内容吗？")) {
      // contentApi.deleteContent(id)
      setShowMenu(null)
    }
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "content", label: "内容", icon: <FileText className="w-4 h-4" /> },
    { key: "analytics", label: "数据", icon: <BarChart3 className="w-4 h-4" /> },
    { key: "revenue", label: "收益", icon: <Wallet className="w-4 h-4" /> },
    { key: "interaction", label: "互动", icon: <Users className="w-4 h-4" /> },
  ]

  const getStatusLabel = (status: string) => {
    const map: Record<string, { text: string; color: string }> = {
      published: { text: "已发布", color: "bg-green-100 text-green-700" },
      draft: { text: "草稿", color: "bg-gray-100 text-gray-600" },
      reviewing: { text: "审核中", color: "bg-orange-100 text-orange-700" },
      rejected: { text: "未通过", color: "bg-red-100 text-red-700" },
    }
    return map[status] || { text: status, color: "bg-gray-100 text-gray-600" }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <div className="h-14 bg-white animate-pulse" />
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="h-12 bg-white rounded-xl animate-pulse" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB]">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ChevronLeft className="w-5 h-5 text-[#2C2C2C]" />
          </button>
          <h1 className="font-semibold text-[#2C2C2C]">创作者中心</h1>
          <button 
            onClick={handleRefresh}
            className={`p-2 -mr-2 ${refreshing ? 'animate-spin' : ''}`}
          >
            <RefreshCw className="w-5 h-5 text-[#666666]" />
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="p-4 grid grid-cols-2 gap-3">
        {[
          { label: "内容数", value: mockOverview.contents, growth: mockOverview.contentsGrowth, icon: FileText, color: "from-[#C41E3A]/10 to-[#C41E3A]/5" },
          { label: "总阅读", value: mockOverview.totalViews.toLocaleString(), growth: mockOverview.viewsGrowth, icon: Eye, color: "from-blue-500/10 to-blue-500/5" },
          { label: "总收益", value: `¥${mockOverview.totalRevenue.toFixed(2)}`, growth: mockOverview.revenueGrowth, icon: Wallet, color: "from-[#C9A96E]/20 to-[#C9A96E]/5" },
          { label: "粉丝数", value: mockOverview.followers.toLocaleString(), growth: mockOverview.followersGrowth, icon: Users, color: "from-green-500/10 to-green-500/5" },
        ].map((item, idx) => (
          <div 
            key={idx}
            className={`bg-gradient-to-br ${item.color} rounded-xl p-4 border border-white/50`}
          >
            <div className="flex items-center justify-between mb-2">
              <item.icon className="w-5 h-5 text-[#666666]" />
              <div className={`flex items-center text-xs ${item.growth >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {item.growth >= 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                {Math.abs(item.growth)}%
              </div>
            </div>
            <p className="text-xl font-bold text-[#2C2C2C]">{item.value}</p>
            <p className="text-xs text-[#999999] mt-1">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="mx-4 bg-white rounded-xl p-1 flex">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-[#C41E3A] text-white'
                : 'text-[#666666]'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Tab */}
      {activeTab === "content" && (
        <div className="p-4 space-y-3">
          {mockContents.map(content => (
            <div key={content.id} className="bg-white rounded-xl p-4 relative">
              <div className="flex gap-3">
                {content.cover && (
                  <div className="w-20 h-20 rounded-lg bg-[#F5F5F5] flex-shrink-0 overflow-hidden">
                    <div className="w-full h-full bg-gradient-to-br from-[#C41E3A]/20 to-[#C9A96E]/20" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <h3 className="font-medium text-[#2C2C2C] line-clamp-2 pr-6">{content.title}</h3>
                    <button 
                      onClick={() => setShowMenu(showMenu === content.id ? null : content.id)}
                      className="p-1 -mr-1 -mt-1"
                    >
                      <MoreVertical className="w-4 h-4 text-[#999999]" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${getStatusLabel(content.status).color}`}>
                      {getStatusLabel(content.status).text}
                    </span>
                    <span className="text-xs text-[#999999]">
                      {content.type === 'article' ? '文章' : '帖子'}
                    </span>
                  </div>
                  {content.status === 'published' && (
                    <div className="flex items-center gap-4 mt-2 text-xs text-[#999999]">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />{content.views}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />{content.likes}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />{content.comments}
                      </span>
                      {content.revenue > 0 && (
                        <span className="text-[#C9A96E]">¥{content.revenue}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Menu Dropdown */}
              {showMenu === content.id && (
                <div className="absolute right-4 top-12 bg-white rounded-lg shadow-lg border border-[#E8E3DB] py-1 z-10">
                  <button 
                    onClick={() => { router.push(`/editor?id=${content.id}`); setShowMenu(null); }}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-[#2C2C2C] hover:bg-[#FAF8F5] w-full"
                  >
                    <Edit className="w-4 h-4" />编辑
                  </button>
                  <button 
                    onClick={() => handleDelete(content.id)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 w-full"
                  >
                    <Trash2 className="w-4 h-4" />删除
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && (
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-xl p-4">
            <h3 className="font-medium text-[#2C2C2C] mb-4">近30天阅读趋势</h3>
            <div className="h-40 flex items-end gap-1">
              {Array.from({ length: 30 }, (_, i) => {
                const value = Math.random() * 100
                const isToday = i === 29
                return (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div 
                      className={`w-full rounded-t ${isToday ? 'bg-[#C41E3A]' : 'bg-[#C41E3A]/30'}`}
                      style={{ height: `${value}%` }}
                    />
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between mt-2 text-xs text-[#999999]">
              <span>30天前</span>
              <span>今天</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4">
            <h3 className="font-medium text-[#2C2C2C] mb-4">内容表现 TOP5</h3>
            <div className="space-y-3">
              {mockContents.filter(c => c.status === 'published').slice(0, 5).map((content, idx) => (
                <div key={content.id} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    idx === 0 ? 'bg-[#C9A96E] text-white' :
                    idx === 1 ? 'bg-gray-400 text-white' :
                    idx === 2 ? 'bg-amber-600 text-white' :
                    'bg-gray-200 text-gray-600'
                  }`}>{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#2C2C2C] truncate">{content.title}</p>
                    <p className="text-xs text-[#999999]">{content.views.toLocaleString()} 阅读</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Revenue Tab */}
      {activeTab === "revenue" && (
        <div className="p-4 space-y-4">
          <div className="bg-gradient-to-br from-[#C9A96E] to-[#B8956A] rounded-xl p-4 text-white">
            <p className="text-sm opacity-80">累计收益</p>
            <p className="text-3xl font-bold mt-1">¥{mockOverview.totalRevenue.toFixed(2)}</p>
            <div className="flex items-center gap-4 mt-4 text-sm">
              <div>
                <p className="opacity-80">可提现</p>
                <p className="font-semibold">¥2,180.00</p>
              </div>
              <div>
                <p className="opacity-80">待结算</p>
                <p className="font-semibold">¥1,500.50</p>
              </div>
            </div>
            <button className="mt-4 w-full bg-white/20 backdrop-blur rounded-lg py-2.5 text-sm font-medium">
              提现
            </button>
          </div>

          <div className="bg-white rounded-xl p-4">
            <h3 className="font-medium text-[#2C2C2C] mb-4">收益趋势</h3>
            <div className="h-32 flex items-end gap-1">
              {mockRevenueTrends.slice(-14).map((item, i) => {
                const max = Math.max(...mockRevenueTrends.map(t => t.revenue))
                const height = (item.revenue / max) * 100
                return (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-[#C9A96E] rounded-t"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl p-4">
            <h3 className="font-medium text-[#2C2C2C] mb-4">收益构成</h3>
            <div className="space-y-3">
              {[
                { name: "打赏收入", value: 1580, percent: 43, color: "bg-[#C41E3A]" },
                { name: "付费内容", value: 1200, percent: 33, color: "bg-[#C9A96E]" },
                { name: "课程分成", value: 900, percent: 24, color: "bg-blue-500" },
              ].map(item => (
                <div key={item.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[#666666]">{item.name}</span>
                    <span className="text-[#2C2C2C] font-medium">¥{item.value}</span>
                  </div>
                  <div className="h-2 bg-[#F5F5F5] rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Interaction Tab */}
      {activeTab === "interaction" && (
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-[#2C2C2C]">新增粉丝</h3>
              <span className="text-sm text-[#C41E3A]">+12 本周</span>
            </div>
            <div className="space-y-3">
              {mockFollowers.map(follower => (
                <div key={follower.id} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C41E3A]/20 to-[#C9A96E]/20" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#2C2C2C]">{follower.name}</p>
                    <p className="text-xs text-[#999999]">{follower.followedAt} 关注</p>
                  </div>
                  {follower.hasInteracted && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                      已互动
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl p-4">
            <h3 className="font-medium text-[#2C2C2C] mb-4">互动统计</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-[#2C2C2C]">156</p>
                <p className="text-xs text-[#999999] mt-1">收到点赞</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#2C2C2C]">42</p>
                <p className="text-xs text-[#999999] mt-1">收到评论</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#2C2C2C]">18</p>
                <p className="text-xs text-[#999999] mt-1">被转发</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button 
        onClick={() => router.push('/editor')}
        className="fixed right-4 bottom-20 w-14 h-14 bg-[#C41E3A] text-white rounded-full shadow-lg flex items-center justify-center"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  )
}
