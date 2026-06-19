"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ChevronRight, Coins, CreditCard, Gift, Minus, Plus, RefreshCcw, ShoppingBag, Sparkles, Star, TrendingUp, ArrowUpRight, ArrowDownLeft, ArrowDownToLine } from "lucide-react"
import { BackButton } from "@/components/common/back-button"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { getWalletInfo, getTransactions } from "@/lib/api/wallet"
import type { WalletInfo, TransactionItem } from "@/lib/types/wallet"

// 图标映射
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Plus,
  Minus,
  ShoppingBag,
  Gift,
  RefreshCcw,
  ArrowUpRight,
  ArrowDownLeft,
}

export default function WalletPage() {
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null)
  const [transactions, setTransactions] = useState<TransactionItem[]>([])
  const [loading, setLoading] = useState(true)

  // 加载数据
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [walletRes, transRes] = await Promise.all([
          getWalletInfo(),
          getTransactions(1, 6),
        ])
        
        if (walletRes.code === 200) {
          setWalletInfo(walletRes.data)
        }
        if (transRes.code === 200) {
          setTransactions(transRes.data.list)
        }
      } catch (error) {
        console.error('加载钱包数据失败:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // 获取图标组件
  const getIcon = (iconName: string) => {
    return iconMap[iconName] || Plus
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <BackButton fallbackPath="/profile" />
          <h1 className="font-semibold text-base text-foreground">我的钱包</h1>
          <div className="w-9" />
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* 资产卡片 */}
        {loading ? (
          <Card className="p-6">
            <div className="text-center mb-6">
              <Skeleton className="h-4 w-20 mx-auto mb-2" />
              <Skeleton className="h-10 w-32 mx-auto mb-2" />
              <Skeleton className="h-4 w-16 mx-auto" />
            </div>
            <div className="flex justify-center gap-8 pt-4 border-t border-border/50">
              <Skeleton className="h-12 w-20" />
              <Skeleton className="h-12 w-20" />
            </div>
          </Card>
        ) : walletInfo ? (
          <Card className="relative overflow-hidden bg-gradient-to-br from-accent/20 via-accent/10 to-primary/5 border-accent/20">
            {/* 装饰背景 */}
            <div className="absolute -right-10 -top-10 w-40 h-40 opacity-5">
              <Coins className="w-full h-full" />
            </div>
            <div className="absolute -left-8 -bottom-8 w-32 h-32 opacity-5">
              <Sparkles className="w-full h-full" />
            </div>
            
            <div className="relative z-10 p-6">
              {/* 余额展示 */}
              <div className="text-center mb-6">
                <p className="text-sm text-muted-foreground mb-2">国学币余额</p>
                <div className="flex items-baseline justify-center gap-1">
                  <Coins className="w-8 h-8 text-accent" />
                  <span className="text-4xl font-bold text-accent">{walletInfo.balance.toLocaleString()}</span>
                  <span className="text-lg text-accent/80">币</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  ≈ ¥{walletInfo.rmb.toFixed(2)}
                </p>
              </div>

              {/* 积分和成长值 */}
              <div className="flex items-center justify-center gap-6 mb-4">
                <Link href="/points" className="flex items-center gap-1.5 text-sm">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="text-muted-foreground">积分</span>
                  <span className="font-medium text-foreground">{walletInfo.points.toLocaleString()}</span>
                </Link>
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center gap-1.5 text-sm">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-muted-foreground">成长值</span>
                  <span className="font-medium text-foreground">{walletInfo.growthValue.toLocaleString()}</span>
                </div>
              </div>

              {/* 会员等级进度 */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">LV.{walletInfo.level}</span>
                  <span className="text-muted-foreground">LV.{walletInfo.level + 1}</span>
                </div>
                <div className="h-1.5 bg-border/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-accent to-primary rounded-full transition-all"
                    style={{ width: `${(walletInfo.growthValue / walletInfo.nextLevelGrowth) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1 text-center">
                  还需 {(walletInfo.nextLevelGrowth - walletInfo.growthValue).toLocaleString()} 成长值升级
                </p>
              </div>

              {/* 累计数据 */}
              <div className="flex items-center justify-center gap-8 pt-4 border-t border-border/50">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">累计充值</p>
                  <p className="text-sm font-medium text-foreground mt-0.5">{walletInfo.totalRecharge}币</p>
                </div>
                <div className="w-px h-8 bg-border/50" />
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">累计消费</p>
                  <p className="text-sm font-medium text-foreground mt-0.5">{walletInfo.totalSpent}币</p>
                </div>
              </div>
            </div>
          </Card>
        ) : null}

        {/* 快捷操作 */}
        <div className="flex gap-3">
          <Link href="/wallet/recharge" className="flex-1">
            <Button className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium">
              <CreditCard className="w-5 h-5 mr-2" />
              充值
            </Button>
          </Link>
          <Link href="/wallet/withdraw" className="flex-1">
            <Button variant="outline" className="w-full h-12 border-border text-foreground hover:bg-secondary">
              <ArrowDownToLine className="w-5 h-5 mr-2" />
              提现
            </Button>
          </Link>
        </div>

        {/* 近期交易 */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">近期交易</h2>
            <Link href="/wallet/transactions" className="text-sm text-primary hover:underline flex items-center">
              全部记录
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((item) => {
                const Icon = getIcon(item.icon)
                const isPositive = item.amount > 0
                
                return (
                  <div key={item.id} className="flex items-center gap-3 py-2">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      item.type === "recharge" && "bg-green-500/10",
                      item.type === "spend" && "bg-primary/10",
                      item.type === "bonus" && "bg-accent/10",
                      item.type === "refund" && "bg-blue-500/10",
                      item.type === "income" && "bg-green-500/10",
                      item.type === "withdraw" && "bg-orange-500/10"
                    )}>
                      <Icon className={cn(
                        "w-5 h-5",
                        item.type === "recharge" && "text-green-500",
                        item.type === "spend" && "text-primary",
                        item.type === "bonus" && "text-accent",
                        item.type === "refund" && "text-blue-500",
                        item.type === "income" && "text-green-500",
                        item.type === "withdraw" && "text-orange-500"
                      )} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.time}</p>
                    </div>
                    
                    <span className={cn(
                      "text-sm font-semibold",
                      isPositive ? "text-green-500" : "text-primary"
                    )}>
                      {isPositive ? "+" : ""}{item.amount}币
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-8 text-center">
              <Coins className="w-12 h-12 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">暂无交易记录</p>
            </div>
          )}
        </Card>

        {/* 充值说明 */}
        <Card className="p-4">
          <h3 className="font-medium text-foreground mb-3">充值说明</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-accent">•</span>
              <span>1元人民币 = 10国学币</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent">•</span>
              <span>国学币可用于购买课程、商品、加入圈子等</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent">•</span>
              <span>充值后国学币不可提现，请按需充值</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent">•</span>
              <span>大额充值享受额外赠送，详见充值页面</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
