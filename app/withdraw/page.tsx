"use client"

import { useState } from "react"
import { BackButton } from "@/components/common/back-button"
import { CheckCircle2, CreditCard, AlertCircle, Clock, ChevronRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { cn } from "@/lib/utils"

// 提现方式数据
const withdrawMethods = [
  {
    id: "wechat",
    name: "微信零钱",
    icon: "💚",
    account: "微信用户_张三",
    bound: true,
  },
  {
    id: "alipay",
    name: "支付宝",
    icon: "💙",
    account: "138****8888",
    bound: true,
  },
  {
    id: "bank",
    name: "银行卡",
    icon: "💳",
    account: "工商银行 尾号8888",
    bound: true,
  },
]

export default function WithdrawPage() {
  const [amount, setAmount] = useState("")
  const [selectedMethod, setSelectedMethod] = useState("wechat")
  const [showSuccess, setShowSuccess] = useState(false)
  
  const availableBalance = 3680.50
  const minAmount = 100
  
  const numAmount = parseFloat(amount) || 0
  const isValidAmount = numAmount >= minAmount && numAmount <= availableBalance
  const serviceFee = numAmount > 0 ? Math.max(numAmount * 0.006, 0.1).toFixed(2) : "0.00"
  const actualAmount = numAmount > 0 ? (numAmount - parseFloat(serviceFee)).toFixed(2) : "0.00"
  
  const handleWithdrawAll = () => {
    setAmount(availableBalance.toFixed(2))
  }
  
  const handleSubmit = () => {
    if (isValidAmount) {
      setShowSuccess(true)
    }
  }
  
  // 提现成功弹窗
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">提现申请已提交</h1>
        <p className="text-sm text-muted-foreground text-center mb-2">
          提现金额：¥{numAmount.toFixed(2)}
        </p>
        <p className="text-xs text-muted-foreground text-center mb-8">
          预计1-3个工作日内到账，请注意查收
        </p>
        
        <div className="flex gap-3 w-full max-w-xs">
          <Link 
            href="/earnings"
            className="flex-1 py-3 text-center text-sm font-medium text-foreground bg-secondary rounded-xl"
          >
            返回收益
          </Link>
          <Link 
            href="/"
            className="flex-1 py-3 text-center text-sm font-medium text-primary-foreground bg-primary rounded-xl"
          >
            返回首页
          </Link>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* 顶部导航 */}
  <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
  <div className="flex items-center justify-between h-14 px-4">
  <BackButton fallbackPath="/earnings" />
  <h1 className="font-semibold text-foreground">申请提现</h1>
          <Link href="/withdraw/records" className="text-sm text-primary">
            提现记录
          </Link>
        </div>
      </header>
      
      <div className="p-4 space-y-4">
        {/* 可提现余额 */}
        <Card className="p-5 bg-gradient-to-br from-accent/20 via-accent/10 to-transparent border-accent/20">
          <p className="text-sm text-muted-foreground mb-1">可提现余额</p>
          <div className="flex items-baseline gap-1">
            <span className="text-sm text-accent">¥</span>
            <span className="text-4xl font-bold text-accent">{availableBalance.toLocaleString()}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            累计已提现 ¥12,580.00
          </p>
        </Card>
        
        {/* 提现金额输入 */}
        <Card className="p-4 bg-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-foreground font-medium">提现金额</span>
            <button 
              onClick={handleWithdrawAll}
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              全部提现
            </button>
          </div>
          
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <span className="text-2xl font-semibold text-foreground">¥</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="请输入提现金额"
              className="flex-1 text-2xl font-semibold bg-transparent outline-none placeholder:text-muted-foreground/50"
            />
          </div>
          
          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>最低提现金额 ¥{minAmount.toFixed(2)}</span>
          </div>
          
          {numAmount > 0 && numAmount < minAmount && (
            <p className="text-xs text-destructive mt-2">
              提现金额不能低于 ¥{minAmount.toFixed(2)}
            </p>
          )}
          
          {numAmount > availableBalance && (
            <p className="text-xs text-destructive mt-2">
              提现金额不能超过可提现余额
            </p>
          )}
        </Card>
        
        {/* 提现方式选择 */}
        <Card className="p-4 bg-card">
          <h3 className="text-sm font-medium text-foreground mb-3">提现方式</h3>
          
          <div className="space-y-2">
            {withdrawMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl border transition-all",
                  selectedMethod === method.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <span className="text-2xl">{method.icon}</span>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-foreground">{method.name}</p>
                  {method.bound ? (
                    <p className="text-xs text-muted-foreground">{method.account}</p>
                  ) : (
                    <p className="text-xs text-primary">点击绑定</p>
                  )}
                </div>
                {selectedMethod === method.id && (
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                )}
              </button>
            ))}
          </div>
          
          <Link 
            href="/settings/bindaccount"
            className="flex items-center justify-center gap-1 mt-3 py-2 text-sm text-primary"
          >
            <CreditCard className="w-4 h-4" />
            管理收款账户
            <ChevronRight className="w-4 h-4" />
          </Link>
        </Card>
        
        {/* 费用明细 */}
        {numAmount > 0 && (
          <Card className="p-4 bg-card">
            <h3 className="text-sm font-medium text-foreground mb-3">费用明细</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">提现金额</span>
                <span className="text-foreground">¥{numAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  手续费（0.6%）
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1">平台补贴</Badge>
                </span>
                <span className="text-muted-foreground line-through">-¥{serviceFee}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="font-medium text-foreground">实际到账</span>
                <span className="font-bold text-lg text-accent">¥{numAmount.toFixed(2)}</span>
              </div>
            </div>
          </Card>
        )}
        
        {/* 到账时间说明 */}
        <div className="flex items-start gap-2 p-3 bg-secondary/50 rounded-xl">
          <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
          <div className="text-xs text-muted-foreground">
            <p className="mb-1">到账时间说明：</p>
            <ul className="space-y-0.5 list-disc list-inside">
              <li>微信零钱：预计T+1个工作日到账</li>
              <li>支付宝：预计T+1个工作日到账</li>
              <li>银行卡：预计T+1至T+3个工作日到账</li>
            </ul>
          </div>
        </div>
        
        {/* 提现须知 */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>提现须知：</p>
          <p>1. 单笔提现限额：¥100 - ¥50,000</p>
          <p>2. 每日最多可提现3次</p>
          <p>3. 提现申请提交后，预计1-3个工作日内审核完成</p>
          <p>4. 如有疑问，请联系客服</p>
        </div>
      </div>
      
      {/* 底部固定操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border p-4 safe-area-pb">
        <button
          onClick={handleSubmit}
          disabled={!isValidAmount}
          className={cn(
            "w-full py-3.5 rounded-xl font-medium text-center transition-all",
            isValidAmount
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
        >
          {numAmount > 0 
            ? `确认提现 ¥${numAmount.toFixed(2)}`
            : "请输入提现金额"
          }
        </button>
      </div>
    </div>
  )
}
