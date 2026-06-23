'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Share2, Clock, ChevronDown, ChevronUp, Users, Zap, Tag, Gift } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { DataState, LoadingSkeleton } from '@/components/data-state'
import { 
  getActivityByRoute, 
  calculateCountdown, 
  getActivityStatusText,
  calculateSaleProgress,
  flashSaleBuy,
  createGroupBuy,
  joinGroupBuy
} from '@/lib/api/marketing'
import type { 
  ActivityDetail, 
  FlashSaleActivity, 
  GroupBuyActivity, 
  PromotionActivity,
  Countdown 
} from '@/lib/types/marketing'

export default function ActivityLandingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSkeleton /></div>}>
      <ActivityLandingContent />
    </Suspense>
  )
}

function ActivityLandingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const route = searchParams.get('route') || 'flash-sale'

  const [activity, setActivity] = useState<ActivityDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<Countdown | null>(null)
  const [showRules, setShowRules] = useState(false)
  const [buyingId, setBuyingId] = useState<number | null>(null)

  // 获取活动数据
  useEffect(() => {
    async function fetchActivity() {
      setLoading(true)
      setError(null)
      try {
        const response = await getActivityByRoute(route)
        if (response.code === 200 && response.data) {
          setActivity(response.data)
        } else {
          setError(response.message || '获取活动失败')
        }
      } catch {
        setError('网络错误，请重试')
      } finally {
        setLoading(false)
      }
    }
    fetchActivity()
  }, [route])

  // 倒计时
  useEffect(() => {
    if (!activity) return

    const targetTime = activity.status === 'upcoming' ? activity.startTime : activity.endTime

    const updateCountdown = () => {
      setCountdown(calculateCountdown(targetTime))
    }

    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)

    return () => clearInterval(timer)
  }, [activity])

  // 倒计时归零刷新
  useEffect(() => {
    if (countdown?.isEnded && activity) {
      // 刷新活动状态
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    }
  }, [countdown?.isEnded, activity])

  // 秒杀抢购
  const handleFlashSaleBuy = useCallback(async (itemId: number) => {
    setBuyingId(itemId)
    try {
      const response = await flashSaleBuy(itemId)
      if (response.code === 200) {
        toast.success('抢购成功！')
        router.push(`/orders/${response.data.orderId}`)
      } else {
        toast.error(response.message || '抢购失败')
      }
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setBuyingId(null)
    }
  }, [router])

  // 发起拼团
  const handleCreateGroup = useCallback(async (itemId: number) => {
    setBuyingId(itemId)
    try {
      const response = await createGroupBuy(itemId)
      if (response.code === 200) {
        toast.success('开团成功！')
        router.push(`/orders/${response.data.orderId}`)
      } else {
        toast.error(response.message || '开团失败')
      }
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setBuyingId(null)
    }
  }, [router])

  // 参与拼团
  const handleJoinGroup = useCallback(async (groupId: number) => {
    setBuyingId(groupId)
    try {
      const response = await joinGroupBuy(groupId)
      if (response.code === 200) {
        toast.success('参团成功！')
        router.push(`/orders/${response.data.orderId}`)
      } else {
        toast.error(response.message || '参团失败')
      }
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setBuyingId(null)
    }
  }, [router])

  // 分享
  const handleShare = () => {
    if (navigator.share && activity) {
      navigator.share({
        title: activity.shareTitle || activity.title,
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success('链接已复制')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-medium">活动详情</h1>
          <Button variant="ghost" size="icon" onClick={handleShare}>
            <Share2 className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <DataState
        isLoading={loading}
        error={error}
        isEmpty={!activity}
        emptyMessage="活动不存在"
        onRetry={() => window.location.reload()}
      >
        {activity && (
          <main className="pb-20">
            {/* Banner */}
            <div className="relative aspect-[2/1] bg-secondary">
              <img
                src={activity.bannerUrl}
                alt={activity.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <h2 className="text-xl font-bold">{activity.title}</h2>
                {activity.subtitle && (
                  <p className="text-sm opacity-90 mt-1">{activity.subtitle}</p>
                )}
              </div>
            </div>

            {/* 倒计时模块 */}
            {countdown && (
              <div className="bg-primary/10 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      {activity.status === 'upcoming' ? '距开始' : '距结束'}
                    </span>
                  </div>
                  {countdown.isEnded ? (
                    <Badge variant="secondary">活动{activity.status === 'upcoming' ? '即将开始' : '已结束'}</Badge>
                  ) : (
                    <div className="flex items-center gap-1">
                      {countdown.days > 0 && (
                        <>
                          <CountdownBox value={countdown.days} />
                          <span className="text-xs text-muted-foreground">天</span>
                        </>
                      )}
                      <CountdownBox value={countdown.hours} />
                      <span className="text-muted-foreground">:</span>
                      <CountdownBox value={countdown.minutes} />
                      <span className="text-muted-foreground">:</span>
                      <CountdownBox value={countdown.seconds} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 活动商品区 */}
            <div className="p-4 space-y-4">
              {activity.type === 'flash_sale' && (
                <FlashSaleSection 
                  activity={activity as FlashSaleActivity} 
                  onBuy={handleFlashSaleBuy}
                  buyingId={buyingId}
                />
              )}
              {activity.type === 'group_buy' && (
                <GroupBuySection 
                  activity={activity as GroupBuyActivity} 
                  onCreate={handleCreateGroup}
                  onJoin={handleJoinGroup}
                  buyingId={buyingId}
                />
              )}
              {activity.type === 'promotion' && (
                <PromotionSection activity={activity as PromotionActivity} />
              )}
            </div>

            {/* 活动规则 */}
            <div className="mx-4 border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setShowRules(!showRules)}
                className="w-full flex items-center justify-between p-4 bg-secondary/30"
              >
                <span className="font-medium">活动规则</span>
                {showRules ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              {showRules && (
                <div className="p-4 space-y-2">
                  {activity.rules.map((rule, index) => (
                    <p key={index} className="text-sm text-muted-foreground flex gap-2">
                      <span className="text-primary">{index + 1}.</span>
                      <span>{rule}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          </main>
        )}
      </DataState>
    </div>
  )
}

// 倒计时数字框
function CountdownBox({ value }: { value: number }) {
  return (
    <span className="bg-primary text-primary-foreground text-sm font-mono font-bold px-2 py-1 rounded min-w-[32px] text-center">
      {String(value).padStart(2, '0')}
    </span>
  )
}

// 秒杀商品区
function FlashSaleSection({ 
  activity, 
  onBuy, 
  buyingId 
}: { 
  activity: FlashSaleActivity
  onBuy: (itemId: number) => void
  buyingId: number | null
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-primary" />
        <span className="font-medium">限时秒杀</span>
      </div>
      {activity.items.map(item => {
        const progress = calculateSaleProgress(item.soldCount, item.totalStock)
        const isSoldOut = item.status === 'sold_out'
        const isEnded = item.status === 'ended'
        const canBuy = item.status === 'ongoing'

        return (
          <Link
            key={item.id}
            href={`/courses/${item.productId}`}
            className="block bg-card border border-border rounded-lg p-3"
          >
            <div className="flex gap-3">
              <img
                src={item.cover}
                alt={item.title}
                className="w-20 h-20 rounded-lg object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium line-clamp-2">{item.title}</h3>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-lg font-bold text-primary">
                    ¥{item.salePrice}
                  </span>
                  <span className="text-sm text-muted-foreground line-through">
                    ¥{item.originalPrice}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>已抢 {progress}%</span>
                    <span>限购 {item.limitPerUser} 件</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button
                size="sm"
                disabled={!canBuy || buyingId === item.id}
                onClick={(e) => {
                  e.preventDefault()
                  if (canBuy) onBuy(item.id)
                }}
                className={cn(
                  isSoldOut && 'bg-muted text-muted-foreground',
                  isEnded && 'bg-muted text-muted-foreground'
                )}
              >
                {buyingId === item.id ? '抢购中...' :
                  isSoldOut ? '已抢光' :
                  isEnded ? '已结束' : '立即抢购'}
              </Button>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

// 拼团商品区
function GroupBuySection({ 
  activity, 
  onCreate,
  onJoin,
  buyingId 
}: { 
  activity: GroupBuyActivity
  onCreate: (itemId: number) => void
  onJoin: (groupId: number) => void
  buyingId: number | null
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-primary" />
        <span className="font-medium">拼团购</span>
      </div>
      {activity.items.map(item => (
        <div key={item.id} className="bg-card border border-border rounded-lg p-3 space-y-3">
          <Link href={`/courses/${item.productId}`} className="flex gap-3">
            <img
              src={item.cover}
              alt={item.title}
              className="w-20 h-20 rounded-lg object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium line-clamp-2">{item.title}</h3>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-lg font-bold text-primary">
                  ¥{item.groupPrice}
                </span>
                <span className="text-sm text-muted-foreground line-through">
                  ¥{item.originalPrice}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {item.groupSize}人团 · 已拼{item.completedGroups}件
              </p>
            </div>
          </Link>

          {/* 正在拼团 */}
          {item.ongoingGroups.length > 0 && (
            <div className="border-t border-border pt-3 space-y-2">
              <p className="text-xs text-muted-foreground">正在拼团：</p>
              {item.ongoingGroups.slice(0, 2).map(group => (
                <div key={group.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src={group.leaderAvatar}
                      alt={group.leaderName}
                      className="w-6 h-6 rounded-full"
                    />
                    <span className="text-sm">{group.leaderName}</span>
                    <span className="text-xs text-muted-foreground">
                      还差{item.groupSize - group.currentSize}人
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={buyingId === group.id}
                    onClick={() => onJoin(group.id)}
                  >
                    {buyingId === group.id ? '参团中...' : '去拼团'}
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Button
            className="w-full"
            disabled={buyingId === item.id}
            onClick={() => onCreate(item.id)}
          >
            {buyingId === item.id ? '开团中...' : '我要开团'}
          </Button>
        </div>
      ))}
    </div>
  )
}

// 促销商品区
function PromotionSection({ activity }: { activity: PromotionActivity }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Gift className="w-5 h-5 text-primary" />
        <span className="font-medium">促销商品</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {activity.items.map(item => (
          <Link
            key={item.id}
            href={`/courses/${item.productId}`}
            className="bg-card border border-border rounded-lg overflow-hidden"
          >
            <div className="relative aspect-square">
              <img
                src={item.cover}
                alt={item.title}
                className="w-full h-full object-cover"
              />
              <Badge className="absolute top-2 left-2 bg-primary">
                {item.discountLabel}
              </Badge>
            </div>
            <div className="p-3">
              <h3 className="text-sm font-medium line-clamp-2">{item.title}</h3>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-primary font-bold">
                  ¥{item.promotionPrice}
                </span>
                <span className="text-xs text-muted-foreground line-through">
                  ¥{item.originalPrice}
                </span>
              </div>
              {item.tags && item.tags.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {item.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
