'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ChevronLeft, 
  Users, 
  ShoppingBag, 
  DollarSign, 
  Activity,
  FileCheck,
  BarChart2,
  Award,
  AlertTriangle,
  Settings,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  Clock,
  Bell
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { DataState } from '@/components/data-state'
import { 
  getAdminPanelData, 
  getAdminInfo,
  getPendingTypeName, 
  getPriorityStyle 
} from '@/lib/api/admin'
import type { AdminPanelData, AdminInfo, AdminOverviewItem, AdminQuickAction, AdminPendingItem } from '@/lib/types/admin'

// 图标映射
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'users': Users,
  'shopping-bag': ShoppingBag,
  'dollar-sign': DollarSign,
  'activity': Activity,
  'file-check': FileCheck,
  'bar-chart-2': BarChart2,
  'award': Award,
  'alert-triangle': AlertTriangle,
  'settings': Settings
}

// 骨架屏组件
function AdminPanelSkeleton() {
  return (
    <div className="space-y-6 p-4">
      {/* 管理员信息骨架 */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      
      {/* 数据概览骨架 */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      
      {/* 快捷功能骨架 */}
      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      
      {/* 待处理事项骨架 */}
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

// 数据概览卡片
function OverviewCard({ item }: { item: AdminOverviewItem }) {
  const Icon = iconMap[item.icon] || Activity
  
  return (
    <Card className="p-3 bg-white border-none shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-gray-500 mb-1">{item.label}</p>
          <p className="text-xl font-bold text-gray-900">
            {item.value.toLocaleString()}
            {item.unit && <span className="text-sm font-normal text-gray-500 ml-1">{item.unit}</span>}
          </p>
          {item.trend && item.trend.type !== 'flat' && (
            <div className="flex items-center gap-1 mt-1">
              {item.trend.type === 'up' ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={`text-xs ${item.trend.type === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                {item.trend.value}%
              </span>
              <span className="text-xs text-gray-400">{item.trend.label}</span>
            </div>
          )}
        </div>
        <div className="w-10 h-10 rounded-full bg-[#FFF8F0] flex items-center justify-center">
          <Icon className="h-5 w-5 text-[#C9A96E]" />
        </div>
      </div>
    </Card>
  )
}

// 快捷功能按钮
function QuickActionButton({ action }: { action: AdminQuickAction }) {
  const router = useRouter()
  const Icon = iconMap[action.icon] || Activity
  
  return (
    <button
      onClick={() => router.push(action.href)}
      className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white hover:bg-gray-50 active:scale-95 transition-all relative"
    >
      <div 
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{ backgroundColor: `${action.color}15` }}
      >
        <Icon className="h-5 w-5" style={{ color: action.color }} />
      </div>
      <span className="text-xs text-gray-700">{action.label}</span>
      {action.badge && action.badge > 0 && (
        <Badge 
          className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 text-xs bg-[#C41E3A] text-white border-none"
        >
          {action.badge > 99 ? '99+' : action.badge}
        </Badge>
      )}
    </button>
  )
}

// 待处理事项项
function PendingItemCard({ item }: { item: AdminPendingItem }) {
  const router = useRouter()
  const priorityStyle = getPriorityStyle(item.priority)
  
  return (
    <Card 
      className="p-3 bg-white border-none shadow-sm cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
      onClick={() => router.push(item.href)}
    >
      <div className="flex items-start gap-3">
        <div className={`w-1 h-full min-h-[48px] rounded-full ${
          item.priority === 'high' ? 'bg-[#C41E3A]' : 
          item.priority === 'medium' ? 'bg-[#C9A96E]' : 'bg-gray-300'
        }`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-900 text-sm">{item.title}</span>
            <Badge className={`${priorityStyle.bg} ${priorityStyle.text} text-xs px-1.5 py-0 h-5`}>
              {priorityStyle.label}
            </Badge>
          </div>
          <p className="text-xs text-gray-500 truncate">{item.description}</p>
          <div className="flex items-center gap-1 mt-1.5">
            <Clock className="h-3 w-3 text-gray-400" />
            <span className="text-xs text-gray-400">{item.createdAt}</span>
            <span className="text-xs text-gray-300 mx-1">|</span>
            <span className="text-xs text-[#C9A96E]">{getPendingTypeName(item.type)}</span>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-300 flex-shrink-0" />
      </div>
    </Card>
  )
}

export default function AdminPanelPage() {
  const router = useRouter()
  const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null)
  const [panelData, setPanelData] = useState<AdminPanelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [infoRes, panelRes] = await Promise.all([
        getAdminInfo(),
        getAdminPanelData()
      ])
      
      if (infoRes.code === 200 && infoRes.data) {
        setAdminInfo(infoRes.data)
      }
      
      if (panelRes.code === 200 && panelRes.data) {
        setPanelData(panelRes.data)
      } else {
        setError(panelRes.message || '加载失败')
      }
    } catch (err) {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  // 计算总待处理数
  const totalPending = panelData ? Object.values(panelData.pendingCounts).reduce((a, b) => a + b, 0) : 0

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-[#C41E3A] to-[#A01830] text-white">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-1">
              <ChevronLeft className="h-6 w-6" />
            </button>
            <h1 className="text-lg font-semibold">管理中心</h1>
          </div>
          <button className="relative p-2">
            <Bell className="h-5 w-5" />
            {totalPending > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full" />
            )}
          </button>
        </div>
        
        {/* 管理员信息 */}
        {adminInfo && (
          <div className="px-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-medium">{adminInfo.name}</p>
                <p className="text-sm text-white/80">{adminInfo.roleName}</p>
              </div>
            </div>
          </div>
        )}
      </header>

      <DataState
        loading={loading}
        error={error}
        empty={!panelData}
        loadingComponent={<AdminPanelSkeleton />}
        emptyTitle="暂无数据"
        emptyDescription="无法加载管理面板数据"
        onRetry={loadData}
      >
        {panelData && (
          <div className="p-4 space-y-5 pb-20">
            {/* 数据概览 */}
            <section>
              <h2 className="text-sm font-medium text-gray-500 mb-3">数据概览</h2>
              <div className="grid grid-cols-2 gap-3">
                {panelData.overview.map(item => (
                  <OverviewCard key={item.key} item={item} />
                ))}
              </div>
            </section>

            {/* 快捷功能 */}
            <section>
              <h2 className="text-sm font-medium text-gray-500 mb-3">快捷功能</h2>
              <div className="grid grid-cols-4 gap-3">
                {panelData.quickActions.map(action => (
                  <QuickActionButton key={action.id} action={action} />
                ))}
              </div>
            </section>

            {/* 待处理事项 */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-gray-500">
                  待处理事项
                  {totalPending > 0 && (
                    <Badge className="ml-2 bg-[#C41E3A] text-white text-xs">
                      {totalPending}
                    </Badge>
                  )}
                </h2>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-[#C9A96E] text-xs h-7 px-2"
                  onClick={() => router.push('/admin/user-audit')}
                >
                  查看全部
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
              
              {panelData.pendingItems.length > 0 ? (
                <div className="space-y-3">
                  {panelData.pendingItems.slice(0, 5).map(item => (
                    <PendingItemCard key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <Card className="p-8 bg-white border-none shadow-sm">
                  <div className="text-center text-gray-400">
                    <Activity className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">暂无待处理事项</p>
                  </div>
                </Card>
              )}
            </section>

            {/* 待处理分类统计 */}
            <section>
              <h2 className="text-sm font-medium text-gray-500 mb-3">分类统计</h2>
              <Card className="p-4 bg-white border-none shadow-sm">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-xl font-bold text-[#C41E3A]">{panelData.pendingCounts.contentReview}</p>
                    <p className="text-xs text-gray-500 mt-1">内容审核</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-[#DC143C]">{panelData.pendingCounts.userReport}</p>
                    <p className="text-xs text-gray-500 mt-1">用户举报</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-[#C9A96E]">{panelData.pendingCounts.orderRefund}</p>
                    <p className="text-xs text-gray-500 mt-1">退款申请</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-[#8B4513]">{panelData.pendingCounts.withdraw}</p>
                    <p className="text-xs text-gray-500 mt-1">提现审核</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-[#9370DB]">{panelData.pendingCounts.certification}</p>
                    <p className="text-xs text-gray-500 mt-1">认证审核</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-[#708090]">{panelData.pendingCounts.feedback}</p>
                    <p className="text-xs text-gray-500 mt-1">用户反馈</p>
                  </div>
                </div>
              </Card>
            </section>
          </div>
        )}
      </DataState>
    </div>
  )
}
