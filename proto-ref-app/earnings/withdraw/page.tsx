'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Copy, Check, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// Mock data - 收益提现信息
const mockEarningsInfo = {
  totalEarnings: 18450.50,
  availableBalance: 12580.30,
  frozenBalance: 2500,
  pendingBalance: 3370.20,
  lastWithdraw: {
    date: '2024-01-15',
    amount: 5000,
  },
}

const mockAccounts = [
  {
    id: '1',
    type: '支付宝',
    account: 'zhangs@example.com',
    name: '张三',
    isDefault: true,
  },
  {
    id: '2',
    type: '银行卡',
    account: '中国工商银行',
    name: '张三',
    cardNumber: '6222****1234',
    isDefault: false,
  },
]

export default function EarningsWithdrawPage() {
  const router = useRouter()
  const [amount, setAmount] = useState('')
  const [selectedAccount, setSelectedAccount] = useState('1')
  const [step, setStep] = useState<'input' | 'confirm' | 'success'>('input')
  const [copied, setCopied] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const numAmount = parseFloat(amount) || 0
  const minWithdraw = 100
  const isValidAmount = numAmount >= minWithdraw && numAmount <= mockEarningsInfo.availableBalance
  const fee = numAmount > 0 ? Math.max(numAmount * 0.006, 1) : 0
  const actualAmount = numAmount > 0 ? numAmount - fee : 0

  const selectedAccountInfo = mockAccounts.find(a => a.id === selectedAccount)

  const handleWithdrawAll = () => {
    setAmount(mockEarningsInfo.availableBalance.toFixed(2))
  }

  const handleCopy = () => {
    if (selectedAccountInfo?.account) {
      navigator.clipboard.writeText(selectedAccountInfo.account)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSubmit = async () => {
    if (!isValidAmount) return
    setStep('confirm')
  }

  const handleConfirm = async () => {
    setIsSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsSubmitting(false)
    setStep('success')
  }

  // 成功界面
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
          <Check className="w-10 h-10 text-green-500" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">提现申请已提交</h1>
        <p className="text-sm text-muted-foreground text-center mb-2">
          提现金额：¥{actualAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p className="text-xs text-muted-foreground text-center mb-8">
          预计 1-3 个工作日到账，请注意查收
        </p>

        <div className="flex gap-3 w-full max-w-xs">
          <Button
            variant="outline"
            onClick={() => router.push('/earnings')}
            className="flex-1"
          >
            返回收益
          </Button>
          <Button
            onClick={() => router.push('/withdraw/records')}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            查看记录
          </Button>
        </div>
      </div>
    )
  }

  // 确认界面
  if (step === 'confirm') {
    return (
      <div className="min-h-screen bg-background">
        {/* 顶部导航 */}
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => setStep('input')} className="p-1">
              <ArrowLeft className="w-6 h-6 text-foreground" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">确认提现</h1>
            <div className="w-8" />
          </div>
        </div>

        <div className="pb-24">
          {/* 提现信息总结 */}
          <div className="mx-4 mt-6 space-y-3">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">提现金额</span>
                <span className="font-bold text-lg text-foreground">
                  ¥{numAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">手续费 (0.6%)</span>
                <span className="text-sm text-red-600">
                  -¥{fee.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="border-t border-border pt-2 flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">实际到账</span>
                <span className="font-bold text-lg text-green-600">
                  ¥{actualAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </Card>

            {/* 提现账户 */}
            <Card className="p-4">
              <div className="text-sm font-semibold text-foreground mb-3">提现账户</div>
              {selectedAccountInfo && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">
                      {selectedAccountInfo.type === '支付宝' ? '支' : '卡'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{selectedAccountInfo.type}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedAccountInfo.type === '支付宝'
                        ? selectedAccountInfo.account
                        : `${selectedAccountInfo.cardNumber}`}
                    </p>
                    <p className="text-xs text-muted-foreground">账户名：{selectedAccountInfo.name}</p>
                  </div>
                </div>
              )}
            </Card>

            {/* 提示 */}
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg flex gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-orange-800">
                提现到账需要 1-3 个工作日，节假日可能延迟。请确保账户信息准确无误。
              </p>
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep('input')}
                className="flex-1"
              >
                返回修改
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                {isSubmitting ? '提交中...' : '确认提现'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 输入界面
  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} className="p-1">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">申请提现</h1>
          <div className="w-8" />
        </div>
      </div>

      <div className="pb-24">
        {/* 收益概览 */}
        <div className="mx-4 mt-4 p-4 bg-gradient-to-br from-primary to-red-700 text-white rounded-xl">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-sm opacity-80 mb-1">可提现金额</div>
              <div className="text-3xl font-bold">
                ¥{mockEarningsInfo.availableBalance.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm opacity-80">总收益</div>
              <div className="text-xl font-bold">
                ¥{mockEarningsInfo.totalEarnings.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>冻结中：¥{mockEarningsInfo.frozenBalance.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="text-right">待结算：¥{mockEarningsInfo.pendingBalance.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
        </div>

        {/* 提现金额 */}
        <div className="mx-4 mt-6">
          <label className="text-sm font-semibold text-foreground block mb-2">提现金额</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/60">¥</span>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="输入提现金额"
              className="pl-8"
            />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              最低 ¥{minWithdraw}，最高 ¥{mockEarningsInfo.availableBalance.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <button
              onClick={handleWithdrawAll}
              className="text-xs text-primary hover:underline ml-auto"
            >
              全部提现
            </button>
          </div>
        </div>

        {/* 费用计算 */}
        {amount && (
          <div className="mx-4 mt-4 p-3 bg-muted/50 rounded-lg space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">手续费 (0.6%)</span>
              <span className="text-foreground">-¥{fee.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="border-t border-border pt-1 flex items-center justify-between font-semibold">
              <span className="text-foreground">预计到账</span>
              <span className="text-green-600">¥{actualAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}

        {/* 提现账户选择 */}
        <div className="mx-4 mt-6">
          <label className="text-sm font-semibold text-foreground block mb-3">选择提现账户</label>
          <div className="space-y-2">
            {mockAccounts.map(account => (
              <button
                key={account.id}
                onClick={() => setSelectedAccount(account.id)}
                className={`w-full p-3 rounded-lg border transition-all text-left flex items-center gap-3 ${
                  selectedAccount === account.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/30'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedAccount === account.id
                    ? 'border-primary bg-primary'
                    : 'border-border'
                }`}>
                  {selectedAccount === account.id && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">{account.type}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {account.type === '支付宝' ? account.account : account.cardNumber}
                  </p>
                </div>
                {account.isDefault && (
                  <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded">默认</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 提示 */}
        <div className="mx-4 mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg flex gap-2">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800">
            提现手续费为提现金额的 0.6%，最低 1 元。微信、支付宝通常 2 小时内到账，银行卡 1-3 个工作日到账。
          </p>
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4">
        <Button
          onClick={handleSubmit}
          disabled={!isValidAmount}
          className="w-full bg-primary hover:bg-primary/90"
        >
          {!amount ? '请输入金额' : !isValidAmount ? '金额无效' : '下一步'}
        </Button>
      </div>
    </div>
  )
}
