'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Gift, MessageSquare, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, Wallet } from 'lucide-react'
import { bountyApi, type Bounty } from '@/lib/api'

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  open: { label: '进行中', color: 'text-blue-600', bg: 'bg-blue-50', icon: Clock },
  answered: { label: '待采纳', color: 'text-orange-600', bg: 'bg-orange-50', icon: MessageSquare },
  resolved: { label: '已解决', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle },
  expired: { label: '已过期', color: 'text-gray-500', bg: 'bg-gray-100', icon: XCircle },
  cancelled: { label: '已取消', color: 'text-gray-400', bg: 'bg-gray-50', icon: XCircle },
}

export default function MyBountiesPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'posted' | 'answered'>('posted')
  const [bounties, setBounties] = useState<Bounty[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    loadBounties()
  }, [activeTab])

  const loadBounties = async (loadMore = false) => {
    if (!loadMore) {
      setLoading(true)
      setPage(1)
    }
    try {
      const currentPage = loadMore ? page + 1 : 1
      const res = await bountyApi.myBounties({ type: activeTab, page: currentPage })
      if (loadMore) {
        setBounties(prev => [...prev, ...res.data])
      } else {
        setBounties(res.data)
      }
      setPage(currentPage)
      setHasMore(res.data.length >= 20)
    } catch (error) {
      console.error('加载失败', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSettle = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await bountyApi.settle(id)
      loadBounties()
    } catch (error) {
      console.error('结算失败', error)
    }
  }

  const handleRepost = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(`/bounty/create?repost=${id}`)
  }

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days > 30) return `${Math.floor(days / 30)}个月前`
    if (days > 0) return `${days}天前`
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours > 0) return `${hours}小时前`
    return '刚刚'
  }

  const getRemainTime = (expireAt: string) => {
    const expire = new Date(expireAt)
    const now = new Date()
    const diff = expire.getTime() - now.getTime()
    if (diff <= 0) return '已过期'
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    if (days > 0) return `剩余${days}天${hours}小时`
    return `剩余${hours}小时`
  }

  // 统计数据
  const stats = {
    total: bounties.length,
    open: bounties.filter(b => b.status === 'open').length,
    resolved: bounties.filter(b => b.status === 'resolved').length,
    totalAmount: bounties.reduce((sum, b) => sum + b.amount, 0),
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold">我的悬赏</h1>
          <div className="w-9" />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {[
            { key: 'posted' as const, label: '我发布的' },
            { key: 'answered' as const, label: '我回答的' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-3 text-sm font-medium relative ${
                activeTab === tab.key ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Card */}
      {!loading && bounties.length > 0 && (
        <div className="p-4">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-4 text-white">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="w-5 h-5" />
              <span className="font-medium">{activeTab === 'posted' ? '发布统计' : '回答统计'}</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-white/80">总数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.open}</div>
                <div className="text-xs text-white/80">进行中</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.resolved}</div>
                <div className="text-xs text-white/80">已解决</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">¥{stats.totalAmount}</div>
                <div className="text-xs text-white/80">{activeTab === 'posted' ? '总投入' : '总收益'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="px-4 pb-20">
        {loading ? (
          <div className="space-y-4 mt-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="bg-card rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-16 bg-muted rounded-full" />
                    <div className="h-4 w-20 bg-muted rounded" />
                  </div>
                  <div className="h-5 w-3/4 bg-muted rounded" />
                  <div className="h-4 w-full bg-muted rounded" />
                  <div className="flex justify-between">
                    <div className="h-4 w-24 bg-muted rounded" />
                    <div className="h-8 w-20 bg-muted rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : bounties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
              <Gift className="w-10 h-10 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">
              {activeTab === 'posted' ? '还没有发布过悬赏' : '还没有回答过悬赏'}
            </p>
            {activeTab === 'posted' && (
              <button
                onClick={() => router.push('/bounty/create')}
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-medium"
              >
                发布悬赏
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            {bounties.map(bounty => {
              const config = statusConfig[bounty.status] || statusConfig.open
              const StatusIcon = config.icon
              
              return (
                <div
                  key={bounty.id}
                  onClick={() => router.push(`/bounty/${bounty.id}`)}
                  className="bg-card rounded-2xl p-4 shadow-sm border border-border/50 active:scale-[0.98] transition-transform"
                >
                  {/* Status & Amount */}
                  <div className="flex items-center justify-between mb-3">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {config.label}
                    </div>
                    <div className="flex items-center gap-1 text-amber-600">
                      <Gift className="w-4 h-4" />
                      <span className="font-bold">¥{bounty.amount}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-medium text-foreground mb-2 line-clamp-2">{bounty.title}</h3>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{bounty.description}</p>

                  {/* Meta */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    {activeTab === 'posted' ? (
                      <>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" />
                          {bounty.answerCount}个回答
                        </span>
                        {bounty.status === 'open' && (
                          <span className="flex items-center gap-1 text-orange-500">
                            <Clock className="w-3.5 h-3.5" />
                            {getRemainTime(bounty.expireAt)}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <span>{formatTimeAgo(bounty.createdAt)}回答</span>
                        {bounty.status === 'resolved' && (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-3.5 h-3.5" />
                            已被采纳
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  {activeTab === 'posted' && (
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/50">
                      {bounty.status === 'answered' && (
                        <button
                          onClick={(e) => handleSettle(bounty.id, e)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium"
                        >
                          <Wallet className="w-4 h-4" />
                          结算悬赏
                        </button>
                      )}
                      {(bounty.status === 'expired' || bounty.status === 'cancelled') && (
                        <button
                          onClick={(e) => handleRepost(bounty.id, e)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
                        >
                          <RefreshCw className="w-4 h-4" />
                          重新发布
                        </button>
                      )}
                      {bounty.status === 'open' && bounty.answerCount === 0 && (
                        <span className="text-xs text-muted-foreground">等待回答中...</span>
                      )}
                      {bounty.status === 'open' && bounty.answerCount > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push(`/bounty/${bounty.id}`) }}
                          className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium"
                        >
                          查看回答
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Load More */}
            {hasMore && (
              <button
                onClick={() => loadBounties(true)}
                className="w-full py-3 text-sm text-muted-foreground"
              >
                加载更多
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
