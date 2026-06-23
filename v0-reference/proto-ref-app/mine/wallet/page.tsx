'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Zap, TrendingUp, ShoppingBag, Plus, ArrowUpRight, Gift } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { DataState } from '@/components/data-state'
import { getWalletInfo, getRechargeOptions, getTransactions } from '@/lib/api/wallet'
import type { WalletInfo, RechargeOption, TransactionItem } from '@/lib/types/wallet'

export default function MineWalletPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null)
  const [rechargeOptions, setRechargeOptions] = useState<RechargeOption[]>([])
  const [transactions, setTransactions] = useState<TransactionItem[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [walletRes, rechargeRes, transRes] = await Promise.all([
        getWalletInfo(),
        getRechargeOptions(),
        getTransactions(1, 10),
      ])

      if (walletRes.code === 200) {
        setWalletInfo(walletRes.data)
      } else {
        setError('加载钱包信息失败')
      }

      if (rechargeRes.code === 200) {
        setRechargeOptions(rechargeRes.data)
      }

      if (transRes.code === 200) {
        setTransactions(transRes.data.list)
      }
    } catch {
      setError('加载失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'recharge':
        return <Plus className="w-4 h-4 text-green-600" />
      case 'spend':
        return <ShoppingBag className="w-4 h-4 text-red-600" />
      case 'bonus':
        return <Gift className="w-4 h-4 text-blue-600" />
      case 'refund':
        return <ArrowUpRight className="w-4 h-4 text-purple-600" />
      default:
        return <Zap className="w-4 h-4 text-gray-500" />
    }
  }

  const levelProgress = walletInfo ? Math.round((walletInfo.growthValue / walletInfo.nextLevelGrowth) * 100) : 0

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} className="p-1">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">我的钱包</h1>
          <div className="w-8" />
        </div>
      </div>

      <DataState
        loading={loading}
        error={error}
        empty={!walletInfo}
        onRetry={loadData}
        skeleton={
          <div className="p-4 space-y-4">
            <div className="h-48 bg-gray-200 rounded-2xl animate-pulse" />
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        }
      >
        {walletInfo && (
          <div className="pb-20">
            {/* 余额卡片 */}
            <div className="mx-4 mt-4 p-6 bg-gradient-to-br from-primary to-red-700 rounded-2xl text-white">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="text-sm opacity-80 mb-1">国学币余额</div>
                  <div className="text-4xl font-bold">{walletInfo.balance}</div>
                  <div className="text-sm opacity-70 mt-1">≈ ¥{walletInfo.rmb.toFixed(2)}</div>
                </div>
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                  <Zap className="w-8 h-8" />
                </div>
              </div>

              {/* 快速操作 */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => router.push('/wallet/recharge')}
                  variant="secondary"
                  className="bg-white/20 hover:bg-white/30 text-white"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  充值
                </Button>
                <Button
                  onClick={() => router.push('/wallet/withdraw')}
                  variant="secondary"
                  className="bg-white/20 hover:bg-white/30 text-white"
                >
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                  提现
                </Button>
              </div>
            </div>

            {/* 会员等级卡片 */}
            <div className="mx-4 mt-4 p-4 bg-card rounded-xl border border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-gold to-yellow-600 rounded-full flex items-center justify-center text-white font-bold">
                    {walletInfo.level}
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">会员 {walletInfo.level} 级</div>
                    <div className="text-sm text-muted-foreground">已累积 {walletInfo.growthValue} 成长值</div>
                  </div>
                </div>
                <TrendingUp className="w-5 h-5 text-gold" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">升级进度</span>
                  <span className="text-foreground font-medium">{walletInfo.growthValue}/{walletInfo.nextLevelGrowth}</span>
                </div>
                <Progress value={levelProgress} className="h-2" />
              </div>
            </div>

            {/* 数据统计 */}
            <div className="mx-4 mt-4 grid grid-cols-2 gap-3">
              <Card className="p-4 text-center">
                <div className="text-xs text-muted-foreground mb-1">累计充值</div>
                <div className="text-2xl font-bold text-foreground">¥{walletInfo.totalRecharge.toFixed(2)}</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-xs text-muted-foreground mb-1">累计消费</div>
                <div className="text-2xl font-bold text-foreground">¥{walletInfo.totalSpent.toFixed(2)}</div>
              </Card>
            </div>

            <div className="mx-4 mt-3 grid grid-cols-2 gap-3">
              <Card className="p-4 text-center">
                <div className="text-xs text-muted-foreground mb-1">积分</div>
                <div className="text-2xl font-bold text-foreground">{walletInfo.points}</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-xs text-muted-foreground mb-1">成长值</div>
                <div className="text-2xl font-bold text-foreground">{walletInfo.growthValue}</div>
              </Card>
            </div>

            {/* 充值方案 */}
            <div className="mx-4 mt-6">
              <h3 className="text-sm font-semibold text-foreground mb-3">快速充值</h3>
              <div className="grid grid-cols-2 gap-3">
                {rechargeOptions.slice(0, 6).map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => router.push('/wallet/recharge')}
                    className={`p-3 rounded-xl border transition-all ${
                      option.popular
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {option.popular && (
                      <div className="text-xs font-medium text-primary mb-1">推荐</div>
                    )}
                    <div className="font-semibold text-foreground">{option.coins}</div>
                    <div className="text-xs text-muted-foreground">¥{option.price}</div>
                    {option.bonus > 0 && (
                      <div className="text-xs text-gold mt-1">+送{option.bonus}币</div>
                    )}
                  </button>
                ))}
              </div>
              <Button
                onClick={() => router.push('/wallet/recharge')}
                className="w-full mt-4 bg-primary hover:bg-primary/90"
              >
                查看更多充值方案
              </Button>
            </div>

            {/* 最近交易 */}
            {transactions.length > 0 && (
              <div className="mx-4 mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground">最近交易</h3>
                  <button
                    onClick={() => router.push('/wallet/transactions')}
                    className="text-xs text-primary hover:underline"
                  >
                    查看全部
                  </button>
                </div>
                <div className="space-y-2">
                  {transactions.slice(0, 5).map(transaction => (
                    <button
                      key={transaction.id}
                      onClick={() => router.push('/wallet/transactions')}
                      className="w-full flex items-center gap-3 p-3 bg-card rounded-lg border border-border hover:border-primary/30 transition-all"
                    >
                      <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                        {getTransactionIcon(transaction.type)}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-foreground">{transaction.title}</div>
                        <div className="text-xs text-muted-foreground">{transaction.time}</div>
                      </div>
                      <div className={`text-sm font-semibold ${
                        transaction.amount > 0 ? 'text-green-600' : 'text-foreground'
                      }`}>
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DataState>
    </div>
  )
}
