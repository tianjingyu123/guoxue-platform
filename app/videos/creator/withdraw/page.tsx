'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Wallet, ArrowUpRight, Clock, CheckCircle, AlertCircle, Landmark, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DataState } from '@/components/data-state'
import { getCreatorRevenueOverview } from '@/lib/api/creator-revenue'
import type { CreatorRevenueOverview } from '@/lib/types/creator-revenue'

// Mock 提现记录
const mockWithdrawHistory = [
  {
    id: 'W001',
    amount: 2500,
    fee: 15,
    actualAmount: 2485,
    method: '支付宝',
    account: '138****8888',
    status: 'success' as const,
    createdAt: '2026-05-28 10:00',
    completedAt: '2026-05-28 11:30',
  },
  {
    id: 'W002',
    amount: 1200,
    fee: 7.2,
    actualAmount: 1192.8,
    method: '银行卡',
    account: '工商银行 尾号1234',
    status: 'processing' as const,
    createdAt: '2026-06-02 15:00',
    completedAt: undefined,
  },
]

const STATUS_MAP = {
  success: { label: '已到账', color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-4 h-4 text-green-600" /> },
  processing: { label: '处理中', color: 'bg-blue-100 text-blue-800', icon: <Clock className="w-4 h-4 text-blue-600" /> },
  failed: { label: '提现失败', color: 'bg-red-100 text-red-800', icon: <AlertCircle className="w-4 h-4 text-red-600" /> },
}

export default function CreatorWithdrawPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [overview, setOverview] = useState<CreatorRevenueOverview | null>(null)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [selectedMethod, setSelectedMethod] = useState<'alipay' | 'bank'>('alipay')
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getCreatorRevenueOverview()
      if (res.code === 200) setOverview(res.data)
      else setError('加载数据失败')
    } catch {
      setError('加载失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleWithdrawAll = () => {
    if (overview) {
      setWithdrawAmount(overview.withdrawable.toFixed(2))
    }
  }

  const feeRate = 0.006
  const minFee = 1
  const amount = parseFloat(withdrawAmount) || 0
  const fee = amount > 0 ? Math.max(amount * feeRate, minFee) : 0
  const actualAmount = amount > 0 ? amount - fee : 0

  const handleSubmit = async () => {
    if (!overview || amount <= 0 || amount > overview.withdrawable) return
    setSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 1200))
    setSubmitting(false)
    setShowForm(false)
    setWithdrawAmount('')
    // 刷新数据
    loadData()
  }

  if (showForm) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => setShowForm(false)} className="p-1">
              <ArrowLeft className="w-6 h-6 text-foreground" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">申请提现</h1>
            <div className="w-8" />
          </div>
        </div>

        <div className="pb-24">
          {/* 可提现金额 */}
          <div className="mx-4 mt-4 p-4 bg-muted/50 rounded-xl">
            <div className="text-sm text-muted-foreground mb-1">可提现余额</div>
            <div className="text-2xl font-bold text-foreground">
              ¥{overview?.withdrawable.toFixed(2)}
            </div>
          </div>

          {/* 金额输入 */}
          <div className="mx-4 mt-4">
            <div className="text-sm font-semibold text-foreground mb-2">提现金额</div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-foreground">¥</span>
              <input
                type="number"
                value={withdrawAmount}
                onChange={e => setWithdrawAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-16 py-3 text-xl font-bold border border-border rounded-xl bg-background text-foreground focus:outline-none focus:border-primary"
              />
              <button
                onClick={handleWithdrawAll}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-primary font-medium"
              >
                全部提现
              </button>
            </div>
            {amount > 0 && (
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>手续费（0.6%，最低¥1）</span>
                  <span>-¥{fee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-medium text-foreground">
                  <span>实际到账</span>
                  <span>¥{actualAmount.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* 提现方式 */}
          <div className="mx-4 mt-5">
            <div className="text-sm font-semibold text-foreground mb-2">提现方式</div>
            <div className="space-y-2">
              <button
                onClick={() => setSelectedMethod('alipay')}
                className={`w-full p-4 rounded-xl border flex items-center gap-3 transition-all ${
                  selectedMethod === 'alipay' ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-foreground">支付宝</div>
                  <div className="text-xs text-muted-foreground">2小时内到账</div>
                </div>
                {selectedMethod === 'alipay' && (
                  <CheckCircle className="w-5 h-5 text-primary" />
                )}
              </button>
              <button
                onClick={() => setSelectedMethod('bank')}
                className={`w-full p-4 rounded-xl border flex items-center gap-3 transition-all ${
                  selectedMethod === 'bank' ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                  <Landmark className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-foreground">银行卡</div>
                  <div className="text-xs text-muted-foreground">1-3个工作日到账</div>
                </div>
                {selectedMethod === 'bank' && (
                  <CheckCircle className="w-5 h-5 text-primary" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4">
          <Button
            onClick={handleSubmit}
            disabled={
              submitting ||
              amount <= 0 ||
              !overview ||
              amount > overview.withdrawable
            }
            className="w-full bg-primary hover:bg-primary/90"
          >
            {submitting ? '提交中...' : `确认提现 ¥${actualAmount.toFixed(2)}`}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} className="p-1">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">创作者提现</h1>
          <div className="w-8" />
        </div>
      </div>

      <DataState
        loading={loading}
        error={error}
        empty={!overview}
        onRetry={loadData}
        skeleton={
          <div className="p-4 space-y-4">
            <div className="h-44 bg-gray-200 rounded-2xl animate-pulse" />
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        }
      >
        {overview && (
          <div className="pb-20">
            {/* 余额卡片 */}
            <div className="mx-4 mt-4 p-6 bg-gradient-to-br from-primary to-red-700 rounded-2xl text-white">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <div className="text-sm opacity-80 mb-1">可提现余额</div>
                  <div className="text-4xl font-bold">¥{overview.withdrawable.toFixed(2)}</div>
                  <div className="text-sm opacity-70 mt-1">
                    冻结 ¥{overview.frozen.toFixed(2)} · 待结算 ¥{overview.pending.toFixed(2)}
                  </div>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Wallet className="w-6 h-6" />
                </div>
              </div>
              <Button
                onClick={() => setShowForm(true)}
                variant="secondary"
                className="w-full bg-white/20 hover:bg-white/30 text-white border-0"
              >
                <ArrowUpRight className="w-4 h-4 mr-1" />
                申请提现
              </Button>
            </div>

            {/* 数据概览 */}
            <div className="mx-4 mt-4 grid grid-cols-2 gap-3">
              <Card className="p-4 text-center">
                <div className="text-xs text-muted-foreground mb-1">累计收益</div>
                <div className="text-xl font-bold text-foreground">
                  ¥{overview.totalRevenue.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
                </div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-xs text-muted-foreground mb-1">本月收益</div>
                <div className="text-xl font-bold text-foreground">
                  ¥{overview.monthRevenue.toFixed(2)}
                </div>
              </Card>
            </div>

            {/* 提现记录 */}
            <div className="mx-4 mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">提现记录</h3>
              </div>
              {mockWithdrawHistory.length > 0 ? (
                <div className="space-y-2">
                  {mockWithdrawHistory.map(record => (
                    <Card key={record.id} className="p-4">
                      <div className="flex items-start gap-3">
                        {STATUS_MAP[record.status].icon}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-sm font-semibold text-foreground">
                              {record.method} · {record.account}
                            </div>
                            <div className="text-sm font-bold text-foreground">
                              ¥{record.actualAmount.toFixed(2)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className={`text-[10px] px-1.5 py-0 ${STATUS_MAP[record.status].color}`}
                            >
                              {STATUS_MAP[record.status].label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{record.createdAt}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            申请 ¥{record.amount.toFixed(2)} · 手续费 ¥{record.fee.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-10 text-center">
                  <div className="text-muted-foreground text-sm">暂无提现记录</div>
                </Card>
              )}
            </div>

            {/* 提现说明 */}
            <div className="mx-4 mt-6 p-4 bg-muted/50 rounded-xl">
              <h4 className="text-sm font-semibold text-foreground mb-2">提现说明</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• 手续费为提现金额的 0.6%，最低 1 元</li>
                <li>• 支付宝通常 2 小时内到账</li>
                <li>• 银行卡通常 1-3 个工作日到账</li>
                <li>• 最低提现金额为 10 元</li>
              </ul>
            </div>
          </div>
        )}
      </DataState>
    </div>
  )
}
