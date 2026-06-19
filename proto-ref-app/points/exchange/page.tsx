'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Ticket, Coins, Crown, Package, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DataState } from '@/components/data-state'
import { getPointsInfo, getPointsExchangeItems, exchangePoints } from '@/lib/api/points'
import type { PointsInfo, PointsExchangeItem } from '@/lib/types/points'

const ITEM_ICONS: Record<string, React.ReactNode> = {
  Ticket: <Ticket className="w-6 h-6" />,
  Coins: <Coins className="w-6 h-6" />,
  Crown: <Crown className="w-6 h-6" />,
  Package: <Package className="w-6 h-6" />,
}

const TYPE_LABELS: Record<PointsExchangeItem['type'], string> = {
  coupon: '优惠券',
  coin: '国学币',
  vip: '会员',
  gift: '实物',
}

const TYPE_COLORS: Record<PointsExchangeItem['type'], string> = {
  coupon: 'bg-red-50 border-red-100',
  coin: 'bg-amber-50 border-amber-100',
  vip: 'bg-yellow-50 border-yellow-100',
  gift: 'bg-green-50 border-green-100',
}

export default function PointsExchangePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pointsInfo, setPointsInfo] = useState<PointsInfo | null>(null)
  const [exchangeItems, setExchangeItems] = useState<PointsExchangeItem[]>([])
  const [exchanging, setExchanging] = useState<number | null>(null)
  const [successId, setSuccessId] = useState<number | null>(null)
  const [activeType, setActiveType] = useState<PointsExchangeItem['type'] | 'all'>('all')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [infoRes, itemsRes] = await Promise.all([
        getPointsInfo(),
        getPointsExchangeItems(),
      ])
      if (infoRes.code === 200) setPointsInfo(infoRes.data)
      else setError('加载积分信息失败')
      if (itemsRes.code === 200) setExchangeItems(itemsRes.data)
    } catch {
      setError('加载失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleExchange = async (item: PointsExchangeItem) => {
    if (!pointsInfo || pointsInfo.balance < item.points || exchanging !== null) return
    setExchanging(item.id)
    try {
      const res = await exchangePoints(item.id)
      if (res.code === 200) {
        setPointsInfo({ ...pointsInfo, balance: res.data.newBalance, totalSpent: pointsInfo.totalSpent + item.points })
        setSuccessId(item.id)
        setTimeout(() => setSuccessId(null), 2000)
      }
    } finally {
      setExchanging(null)
    }
  }

  const filteredItems = exchangeItems.filter(item =>
    activeType === 'all' ? true : item.type === activeType
  )

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} className="p-1">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">积分兑换</h1>
          <button
            onClick={() => router.push('/points/history')}
            className="text-xs text-primary"
          >
            记录
          </button>
        </div>
      </div>

      <DataState
        loading={loading}
        error={error}
        empty={exchangeItems.length === 0}
        onRetry={loadData}
        skeleton={
          <div className="p-4 space-y-4">
            <div className="h-20 bg-gray-200 rounded-2xl animate-pulse" />
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-36 bg-gray-200 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        }
      >
        {pointsInfo && (
          <div className="pb-20">
            {/* 积分余额 */}
            <div className="mx-4 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between">
              <div>
                <div className="text-xs text-amber-700 mb-0.5">当前积分</div>
                <div className="text-3xl font-bold text-amber-800">
                  {pointsInfo.balance.toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => router.push('/points/tasks')}
                className="text-xs text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-full transition-colors"
              >
                去做任务获取积分
              </button>
            </div>

            {/* 分类筛选 */}
            <div className="mt-4 px-4">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {([
                  { key: 'all', label: '全部' },
                  { key: 'coupon', label: '优惠券' },
                  { key: 'coin', label: '国学币' },
                  { key: 'vip', label: '会员' },
                  { key: 'gift', label: '实物' },
                ] as const).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveType(tab.key)}
                    className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap flex-shrink-0 transition-colors ${
                      activeType === tab.key
                        ? 'bg-amber-500 text-white'
                        : 'bg-muted text-foreground hover:bg-muted/80'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 兑换商品网格 */}
            <div className="mx-4 mt-4 grid grid-cols-2 gap-3">
              {filteredItems.map(item => {
                const canExchange = pointsInfo.balance >= item.points
                const isExchanging = exchanging === item.id
                const isSuccess = successId === item.id

                return (
                  <Card
                    key={item.id}
                    className={`p-4 flex flex-col items-center text-center border ${
                      TYPE_COLORS[item.type]
                    } ${!canExchange ? 'opacity-60' : ''}`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                      item.color.replace('text-', 'bg-').replace('text-', 'bg-')
                    } bg-white/80`}>
                      <span className={item.color}>
                        {ITEM_ICONS[item.icon] ?? <Package className="w-6 h-6" />}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-foreground mb-1">
                      {item.title}
                    </div>
                    <Badge variant="secondary" className="text-[10px] mb-3 bg-muted">
                      {TYPE_LABELS[item.type]}
                    </Badge>
                    <div className="text-lg font-bold text-amber-600 mb-1">
                      {item.points.toLocaleString()} 积分
                    </div>
                    <div className="text-xs text-muted-foreground mb-3">
                      库存 {item.stock > 100 ? '充足' : item.stock}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleExchange(item)}
                      disabled={!canExchange || isExchanging}
                      className={`w-full h-8 text-xs ${
                        isSuccess
                          ? 'bg-green-500 hover:bg-green-500'
                          : canExchange
                          ? 'bg-amber-500 hover:bg-amber-600'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {isSuccess ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> 兑换成功
                        </span>
                      ) : isExchanging ? (
                        '兑换中...'
                      ) : canExchange ? (
                        '立即兑换'
                      ) : (
                        '积分不足'
                      )}
                    </Button>
                  </Card>
                )
              })}
            </div>

            {/* 说明 */}
            <div className="mx-4 mt-6 p-4 bg-muted/50 rounded-xl">
              <h4 className="text-sm font-semibold text-foreground mb-2">兑换说明</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• 优惠券和国学币兑换后实时到账</li>
                <li>• 实物奖品将在 3-7 个工作日内寄出</li>
                <li>• 兑换不支持退换，请谨慎操作</li>
              </ul>
            </div>
          </div>
        )}
      </DataState>
    </div>
  )
}
