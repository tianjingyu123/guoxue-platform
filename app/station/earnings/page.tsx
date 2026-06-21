'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Wallet, 
  TrendingUp, 
  Clock, 
  Snowflake,
  ChevronRight,
  RefreshCw,
  BookOpen,
  ShoppingBag,
  Crown,
  Users,
  Gift,
  UserPlus,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataState } from '@/components/data-state'
import { 
  getEarningsOverview, 
  getEarningsList, 
  getWithdrawRecords,
  getEarningsTypeName,
  getEarningsStatusName,
  getWithdrawStatusName,
} from '@/lib/api/earnings'
import type { 
  EarningsOverview, 
  EarningsItem, 
  EarningsSourceType,
  WithdrawRecord,
} from '@/lib/types/earnings'

// 获取收益类型图标
function getEarningsTypeIcon(type: EarningsSourceType) {
  const icons: Record<EarningsSourceType, React.ReactNode> = {
    course_commission: <BookOpen className="w-4 h-4" />,
    product_commission: <ShoppingBag className="w-4 h-4" />,
    member_commission: <Crown className="w-4 h-4" />,
    team_bonus: <Users className="w-4 h-4" />,
    platform_reward: <Gift className="w-4 h-4" />,
    invite_reward: <UserPlus className="w-4 h-4" />,
  }
  return icons[type] || <Wallet className="w-4 h-4" />
}

// 获取状态颜色
function getStatusColor(status: 'settled' | 'pending' | 'frozen') {
  const colors = {
    settled: 'text-green-600 bg-green-50',
    pending: 'text-amber-600 bg-amber-50',
    frozen: 'text-blue-600 bg-blue-50',
  }
  return colors[status]
}

// 获取提现状态颜色
function getWithdrawStatusColor(status: 'pending' | 'processing' | 'success' | 'failed') {
  const colors = {
    pending: 'text-amber-600 bg-amber-50',
    processing: 'text-blue-600 bg-blue-50',
    success: 'text-green-600 bg-green-50',
    failed: 'text-red-600 bg-red-50',
  }
  return colors[status]
}

export default function EarningsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'earnings' | 'withdraw'>('earnings')
  const [filterType, setFilterType] = useState<EarningsSourceType | 'all'>('all')
  
  // 数据状态
  const [overview, setOverview] = useState<EarningsOverview | null>(null)
  const [earningsList, setEarningsList] = useState<EarningsItem[]>([])
  const [withdrawRecords, setWithdrawRecords] = useState<WithdrawRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // 加载数据
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const [overviewRes, earningsRes, withdrawRes] = await Promise.all([
        getEarningsOverview(),
        getEarningsList(1, 50),
        getWithdrawRecords(1, 20),
      ])

      if (overviewRes.code === 200) {
        setOverview(overviewRes.data)
      }
      if (earningsRes.code === 200) {
        setEarningsList(earningsRes.data.list)
      }
      if (withdrawRes.code === 200) {
        setWithdrawRecords(withdrawRes.data.list)
      }
    } catch (err) {
      setError('加载失败，请稀后重试')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 筛选后的收益列表
  const filteredEarnings = filterType === 'all' 
    ? earningsList 
    : earningsList.filter(item => item.type === filterType)

  // 骨架屏
  const renderSkeleton = () => (
    <div className="space-y-4 animate-pulse">
      {/* 总览卡片骨架 */}
      <div className="bg-gradient-to-br from-[#C41E3A] to-[#A01830] rounded-2xl p-5 text-white">
        <div className="h-4 w-24 bg-white/20 rounded mb-2" />
        <div className="h-8 w-32 bg-white/20 rounded mb-4" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i}>
              <div className="h-3 w-12 bg-white/20 rounded mb-1" />
              <div className="h-5 w-16 bg-white/20 rounded" />
            </div>
          ))}
        </div>
      </div>
      {/* 列表骨架 */}
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-white rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full" />
            <div className="flex-1">
              <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-40 bg-gray-200 rounded" />
            </div>
            <div className="h-5 w-16 bg-gray-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-[#FAF8F5] border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} className="p-1">
            <ArrowLeft className="w-6 h-6 text-gray-800" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">推广收益</h1>
          <button 
            onClick={() => loadData(true)} 
            className={`p-1 ${refreshing ? 'animate-spin' : ''}`}
            disabled={refreshing}
          >
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="p-4">
        <DataState
          loading={loading}
          error={error}
          empty={!overview}
          skeleton={renderSkeleton()}
          onRetry={() => loadData()}
        >
          {/* 收益总览卡片 */}
          <div className="bg-gradient-to-br from-[#C41E3A] to-[#A01830] rounded-2xl p-5 text-white mb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-white/80 text-sm mb-1">可提现余额</p>
                <p className="text-3xl font-bold">
                  ¥{overview?.availableBalance.toFixed(2)}
                </p>
              </div>
              <Button
                onClick={() => router.push('/wallet/withdraw')}
                className="bg-white text-[#C41E3A] hover:bg-white/90"
              >
                <Wallet className="w-4 h-4 mr-1" />
                提现
              </Button>
            </div>
            
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/20">
              <div>
                <div className="flex items-center gap-1 text-white/70 text-xs mb-1">
                  <Snowflake className="w-3 h-3" />
                  <span>冻结中</span>
                </div>
                <p className="font-semibold">¥{overview?.frozenBalance.toFixed(2)}</p>
              </div>
              <div>
                <div className="flex items-center gap-1 text-white/70 text-xs mb-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>累计收益</span>
                </div>
                <p className="font-semibold">¥{overview?.totalEarnings.toFixed(2)}</p>
              </div>
              <div>
                <div className="flex items-center gap-1 text-white/70 text-xs mb-1">
                  <Clock className="w-3 h-3" />
                  <span>本月收益</span>
                </div>
                <p className="font-semibold">¥{overview?.monthEarnings.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* 今日/上月对比 */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white rounded-xl p-4">
              <p className="text-gray-500 text-sm mb-1">今日收益</p>
              <p className="text-xl font-bold text-[#C41E3A]">
                +¥{overview?.todayEarnings.toFixed(2)}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4">
              <p className="text-gray-500 text-sm mb-1">上月收益</p>
              <p className="text-xl font-bold text-gray-900">
                ¥{overview?.lastMonthEarnings.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Tab 切换 */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'earnings' | 'withdraw')}>
            <TabsList className="w-full bg-white mb-4">
              <TabsTrigger value="earnings" className="flex-1">收益明细</TabsTrigger>
              <TabsTrigger value="withdraw" className="flex-1">提现记录</TabsTrigger>
            </TabsList>
          </Tabs>

          {activeTab === 'earnings' ? (
            <>
              {/* 筛选标签 */}
              <div className="flex gap-2 overflow-x-auto pb-3 mb-2 scrollbar-hide">
                {(['all', 'course_commission', 'product_commission', 'member_commission', 'team_bonus', 'invite_reward'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                      filterType === type
                        ? 'bg-[#C41E3A] text-white'
                        : 'bg-white text-gray-600'
                    }`}
                  >
                    {type === 'all' ? '全部' : getEarningsTypeName(type)}
                  </button>
                ))}
              </div>

              {/* 收益明细列表 */}
              <div className="space-y-3">
                {filteredEarnings.length === 0 ? (
                  <div className="bg-white rounded-xl p-8 text-center">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">暂无收益记录</p>
                  </div>
                ) : (
                  filteredEarnings.map((item) => (
                    <div key={item.id} className="bg-white rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          item.status === 'settled' ? 'bg-green-50 text-green-600' :
                          item.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                          'bg-blue-50 text-blue-600'
                        }`}>
                          {getEarningsTypeIcon(item.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium text-gray-900">{item.title}</h4>
                            <span className="text-[#C41E3A] font-semibold">
                              +¥{item.amount.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 truncate mb-2">
                            {item.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">{item.createdAt}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(item.status)}`}>
                              {getEarningsStatusName(item.status)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* 关联用户信息 */}
                      {item.relatedUser && (
                        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                          <img 
                            src={item.relatedUser.avatar} 
                            alt="" 
                            className="w-6 h-6 rounded-full"
                          />
                          <span className="text-sm text-gray-600">
                            来自 {item.relatedUser.nickname}
                          </span>
                          {item.relatedOrder && (
                            <span className="text-xs text-gray-400 ml-auto">
                              订单金额 ¥{item.relatedOrder.orderAmount}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            /* 提现记录列表 */
            <div className="space-y-3">
              {withdrawRecords.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center">
                  <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">暂无提现记录</p>
                </div>
              ) : (
                withdrawRecords.map((record) => (
                  <div key={record.id} className="bg-white rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-medium text-gray-900">
                          提现到{record.method === 'alipay' ? '支付宝' : '银行卡'}
                        </span>
                        <span className="text-sm text-gray-500 ml-2">{record.account}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getWithdrawStatusColor(record.status)}`}>
                        {getWithdrawStatusName(record.status)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xl font-bold text-gray-900">
                          ¥{record.actualAmount.toFixed(2)}
                        </span>
                        <span className="text-xs text-gray-400 ml-2">
                          (手续费 ¥{record.fee.toFixed(2)})
                        </span>
                      </div>
                      <span className="text-sm text-gray-400">{record.createdAt}</span>
                    </div>
                    {record.status === 'failed' && record.failReason && (
                      <p className="mt-2 text-sm text-red-500">
                        失败原因：{record.failReason}
                      </p>
                    )}
                    {record.completedAt && (
                      <p className="mt-1 text-xs text-gray-400">
                        到账时间：{record.completedAt}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* 底部提示 */}
          <div className="mt-6 p-4 bg-amber-50 rounded-xl">
            <p className="text-sm text-amber-800">
              <span className="font-medium">收益说明：</span>
              推广收益将在订单完成后7天内结算，结算后可申请提现。如有疑问请联系客服。
            </p>
          </div>
        </DataState>
      </div>
    </div>
  )
}
