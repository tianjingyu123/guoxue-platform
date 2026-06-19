'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ChevronLeft, 
  Users, 
  TrendingUp, 
  TrendingDown,
  Minus,
  ShoppingCart,
  Wallet,
  Eye,
  Target,
  Image,
  Settings,
  List,
  BarChart3,
  CircleDollarSign,
  HelpCircle,
  ChevronRight,
  Bell,
  AlertTriangle,
  CheckCircle,
  Info,
  Crown,
  Share2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { DataState } from '@/components/data-state'
import { getStationMasterPanelData } from '@/lib/api/station'
import type { StationMasterPanelData, StationTrendData } from '@/lib/types/station'

// 图标映射
const iconMap: Record<string, React.ReactNode> = {
  users: <Users className="w-5 h-5" />,
  revenue: <Wallet className="w-5 h-5" />,
  orders: <ShoppingCart className="w-5 h-5" />,
  total: <CircleDollarSign className="w-5 h-5" />,
  visits: <Eye className="w-5 h-5" />,
  conversion: <Target className="w-5 h-5" />
}

// 快捷入口图标映射
const actionIconMap: Record<string, React.ReactNode> = {
  users: <Users className="w-6 h-6" />,
  image: <Image className="w-6 h-6" />,
  settings: <Settings className="w-6 h-6" />,
  wallet: <Wallet className="w-6 h-6" />,
  list: <List className="w-6 h-6" />,
  chart: <BarChart3 className="w-6 h-6" />,
  money: <CircleDollarSign className="w-6 h-6" />,
  share: <Share2 className="w-6 h-6" />,
  help: <HelpCircle className="w-6 h-6" />
}

// 骨架屏组件
function PanelSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {/* 分站信息骨架 */}
      <Skeleton className="h-24 w-full rounded-xl" />
      
      {/* 概览卡片骨架 */}
      <div className="grid grid-cols-3 gap-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      
      {/* 余额骨架 */}
      <Skeleton className="h-28 w-full rounded-xl" />
      
      {/* 趋势图骨架 */}
      <Skeleton className="h-48 w-full rounded-xl" />
      
      {/* 快捷入口骨架 */}
      <div className="grid grid-cols-4 gap-3">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

// 简易趋势图组件
function SimpleTrendChart({ data }: { data: StationTrendData }) {
  const maxValue = Math.max(...data.data.map(d => d.value))
  
  return (
    <div className="h-32 flex items-end gap-1">
      {data.data.map((point, index) => {
        const height = (point.value / maxValue) * 100
        return (
          <div key={index} className="flex-1 flex flex-col items-center gap-1">
            <div 
              className="w-full bg-[#C41E3A]/20 rounded-t transition-all"
              style={{ height: `${height}%` }}
            >
              <div 
                className="w-full bg-[#C41E3A] rounded-t transition-all"
                style={{ height: '100%' }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">{point.date.slice(-2)}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function StationMasterPanelPage() {
  const router = useRouter()
  const [panelData, setPanelData] = useState<StationMasterPanelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trendPeriod, setTrendPeriod] = useState<'week' | 'month'>('week')
  const [activeTrend, setActiveTrend] = useState<'revenue' | 'orders'>('revenue')

  useEffect(() => {
    loadPanelData()
  }, [])

  const loadPanelData = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await getStationMasterPanelData()
      if (res.code === 200 && res.data) {
        setPanelData(res.data)
      } else {
        setError(res.message || '加载失败')
      }
    } catch (err) {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  // 获取趋势变化图标
  const getTrendIcon = (type?: 'up' | 'down' | 'flat') => {
    if (type === 'up') return <TrendingUp className="w-3 h-3 text-green-500" />
    if (type === 'down') return <TrendingDown className="w-3 h-3 text-red-500" />
    return <Minus className="w-3 h-3 text-muted-foreground" />
  }

  // 获取趋势颜色
  const getTrendColor = (type?: 'up' | 'down' | 'flat') => {
    if (type === 'up') return 'text-green-500'
    if (type === 'down') return 'text-red-500'
    return 'text-muted-foreground'
  }

  // 获取通知图标
  const getNoticeIcon = (type: 'info' | 'warning' | 'success') => {
    if (type === 'success') return <CheckCircle className="w-4 h-4 text-green-500" />
    if (type === 'warning') return <AlertTriangle className="w-4 h-4 text-amber-500" />
    return <Info className="w-4 h-4 text-blue-500" />
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-[#C41E3A] text-white">
        <div className="flex items-center justify-between p-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={() => router.back()}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">分站管理</h1>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={() => router.push('/announcements')}
          >
            <Bell className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <DataState
        loading={loading}
        error={error}
        empty={!panelData}
        loadingComponent={<PanelSkeleton />}
        emptyTitle="暂无数据"
        emptyDescription="分站数据加载中"
        onRetry={loadPanelData}
      >
        {panelData && (
          <div className="p-4 space-y-4 pb-20">
            {/* 分站信息卡片 */}
            <Card className="border-none shadow-sm bg-gradient-to-r from-[#C41E3A] to-[#E85A5A] text-white overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Crown className="w-5 h-5 text-[#C9A96E]" />
                      <Badge className="bg-[#C9A96E] text-white border-none">
                        {panelData.stationInfo.levelName}
                      </Badge>
                    </div>
                    <h2 className="text-xl font-bold">{panelData.stationInfo.name}</h2>
                    <p className="text-sm text-white/70">
                      创建于 {panelData.stationInfo.createTime}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge 
                      className={`${
                        panelData.stationInfo.status === 'active' 
                          ? 'bg-green-500' 
                          : panelData.stationInfo.status === 'expired'
                          ? 'bg-gray-500'
                          : 'bg-amber-500'
                      } text-white border-none`}
                    >
                      {panelData.stationInfo.status === 'active' ? '正常运营' : 
                       panelData.stationInfo.status === 'expired' ? '已过期' : '已暂停'}
                    </Badge>
                    {panelData.stationInfo.expireTime && (
                      <p className="text-xs text-white/70 mt-2">
                        有效期至 {panelData.stationInfo.expireTime}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 数据概览 */}
            <div className="grid grid-cols-3 gap-3">
              {panelData.overview.map((item, index) => (
                <Card 
                  key={index} 
                  className="border-none shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => router.push('/station/earnings')}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1 mb-1 text-muted-foreground">
                      {iconMap[item.icon || 'total']}
                      <span className="text-xs">{item.label}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-foreground">
                        {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                      </span>
                      {item.unit && (
                        <span className="text-xs text-muted-foreground">{item.unit}</span>
                      )}
                    </div>
                    {item.trend !== undefined && item.trend !== 0 && (
                      <div className={`flex items-center gap-0.5 text-xs ${getTrendColor(item.trendType)}`}>
                        {getTrendIcon(item.trendType)}
                        <span>{Math.abs(item.trend)}%</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* 余额信息 */}
            <Card className="border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">收益余额</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-7 text-xs border-[#C41E3A] text-[#C41E3A]"
                    onClick={() => router.push('/station/earnings')}
                  >
                    申请提现
                  </Button>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold text-[#C41E3A]">
                      {panelData.balance.available.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">可提现</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-[#C9A96E]">
                      {panelData.balance.pending.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">待结算</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">
                      {panelData.balance.withdrawn.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">已提现</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-muted-foreground">
                      {panelData.balance.frozen.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">冻结</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 趋势图 */}
            <Card className="border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <Tabs value={activeTrend} onValueChange={(v) => setActiveTrend(v as 'revenue' | 'orders')}>
                    <TabsList className="h-8">
                      <TabsTrigger value="revenue" className="text-xs px-3 h-6">收益</TabsTrigger>
                      <TabsTrigger value="orders" className="text-xs px-3 h-6">订单</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <Tabs value={trendPeriod} onValueChange={(v) => setTrendPeriod(v as 'week' | 'month')}>
                    <TabsList className="h-8">
                      <TabsTrigger value="week" className="text-xs px-3 h-6">本周</TabsTrigger>
                      <TabsTrigger value="month" className="text-xs px-3 h-6">本月</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                
                {panelData.trends.filter(t => t.type === activeTrend).map((trend, index) => (
                  <div key={index}>
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-2xl font-bold">{trend.total.toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground">
                        {activeTrend === 'revenue' ? '元' : '单'}
                      </span>
                      <span className={`text-sm ${trend.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {trend.change >= 0 ? '+' : ''}{trend.change}%
                      </span>
                    </div>
                    <SimpleTrendChart data={trend} />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* 快捷入口 */}
            <Card className="border-none shadow-sm">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">快捷功能</h3>
                <div className="grid grid-cols-4 gap-4">
                  {panelData.quickActions.map((action) => (
                    <div 
                      key={action.id}
                      className="flex flex-col items-center gap-2 cursor-pointer"
                      onClick={() => router.push(action.path)}
                    >
                      <div className="relative w-12 h-12 rounded-xl bg-[#FAF8F5] flex items-center justify-center text-[#C41E3A]">
                        {actionIconMap[action.icon]}
                        {action.badge && action.badge > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#C41E3A] text-white text-[10px] rounded-full flex items-center justify-center">
                            {action.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-center">{action.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 成员统计 */}
            <Card className="border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">团队成员</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-[#C41E3A] h-7"
                    onClick={() => router.push('/station/team')}
                  >
                    查看全部
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-2 bg-[#FAF8F5] rounded-lg">
                    <p className="text-xl font-bold text-[#C41E3A]">{panelData.memberStats.total}</p>
                    <p className="text-xs text-muted-foreground">总成员</p>
                  </div>
                  <div className="text-center p-2 bg-[#FAF8F5] rounded-lg">
                    <p className="text-xl font-bold text-[#C9A96E]">{panelData.memberStats.active}</p>
                    <p className="text-xs text-muted-foreground">本月活跃</p>
                  </div>
                  <div className="text-center p-2 bg-[#FAF8F5] rounded-lg">
                    <p className="text-xl font-bold text-green-500">+{panelData.memberStats.newThisMonth}</p>
                    <p className="text-xs text-muted-foreground">本月新增</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {panelData.memberStats.levelDistribution.map((level) => (
                    <div key={level.level} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-16">{level.label}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#C41E3A] rounded-full transition-all"
                          style={{ width: `${(level.count / panelData.memberStats.total) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium w-10 text-right">{level.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 最新通知 */}
            {panelData.notices.length > 0 && (
              <Card className="border-none shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">最新通知</h3>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-[#C41E3A] h-7"
                      onClick={() => router.push('/announcements')}
                    >
                      全部
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {panelData.notices.slice(0, 3).map((notice) => (
                      <div 
                        key={notice.id}
                        className="flex items-start gap-3 p-2 bg-[#FAF8F5] rounded-lg"
                      >
                        {getNoticeIcon(notice.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm line-clamp-1">{notice.title}</p>
                          <p className="text-xs text-muted-foreground">{notice.createdAt}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DataState>
    </div>
  )
}
