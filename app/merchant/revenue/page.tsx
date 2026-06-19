"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Wallet, TrendingUp, TrendingDown, Calendar, Download, ChevronRight, CircleDollarSign, CreditCard, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

const revenueData = {
  balance: 12680.50,
  pendingSettle: 2350.00,
  frozen: 500.00,
  totalIncome: 56800.00,
  totalWithdraw: 41769.50,
  monthIncome: 8560.00,
  monthCompare: 12.5,
}

const transactions = [
  {
    id: "1",
    type: "income",
    title: "订单收入",
    orderNo: "202401150001",
    amount: 136.00,
    status: "settled",
    createdAt: "2024-01-15 14:35",
  },
  {
    id: "2",
    type: "income",
    title: "订单收入",
    orderNo: "202401140001",
    amount: 88.00,
    status: "pending",
    createdAt: "2024-01-14 10:25",
  },
  {
    id: "3",
    type: "withdraw",
    title: "提现到银行卡",
    bankCard: "招商银行 ****8888",
    amount: -2000.00,
    status: "success",
    createdAt: "2024-01-10 09:00",
  },
  {
    id: "4",
    type: "refund",
    title: "订单退款",
    orderNo: "202401080001",
    amount: -199.00,
    status: "completed",
    createdAt: "2024-01-08 15:00",
  },
  {
    id: "5",
    type: "fee",
    title: "平台服务费",
    orderNo: "202401050001",
    amount: -29.40,
    status: "completed",
    createdAt: "2024-01-05 00:00",
  },
]

const typeConfig = {
  income: { icon: TrendingUp, color: "text-green-600" },
  withdraw: { icon: CreditCard, color: "text-blue-600" },
  refund: { icon: TrendingDown, color: "text-red-600" },
  fee: { icon: CircleDollarSign, color: "text-orange-600" },
}

const statusConfig = {
  settled: { label: "已结算", color: "bg-green-100 text-green-700" },
  pending: { label: "待结算", color: "bg-amber-100 text-amber-700" },
  success: { label: "提现成功", color: "bg-green-100 text-green-700" },
  completed: { label: "已完成", color: "bg-gray-100 text-gray-700" },
  processing: { label: "处理中", color: "bg-blue-100 text-blue-700" },
}

export default function RevenuePage() {
  const [activeTab, setActiveTab] = useState("all")
  
  const filteredTransactions = transactions.filter(t => {
    if (activeTab === "income") return t.type === "income"
    if (activeTab === "withdraw") return t.type === "withdraw"
    if (activeTab === "refund") return t.type === "refund" || t.type === "fee"
    return true
  })

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Link href="/merchant/dashboard">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-semibold">收入管理</h1>
          </div>
          <Button variant="ghost" size="icon">
            <Calendar className="w-5 h-5" />
          </Button>
        </div>
      </header>
      
      {/* 余额卡片 */}
      <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-4 pb-20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-primary-foreground/80">可提现余额(元)</p>
            <p className="text-3xl font-bold mt-1">{revenueData.balance.toFixed(2)}</p>
          </div>
          <Button variant="secondary" className="bg-white text-primary hover:bg-white/90">
            <Wallet className="w-4 h-4 mr-2" />
            提现
          </Button>
        </div>
        
        <div className="flex items-center gap-6 mt-4 text-sm">
          <div>
            <p className="text-primary-foreground/70">待结算</p>
            <p className="font-medium">¥{revenueData.pendingSettle.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-primary-foreground/70">冻结中</p>
            <p className="font-medium">¥{revenueData.frozen.toFixed(2)}</p>
          </div>
        </div>
      </div>
      
      {/* 数据概览 */}
      <div className="px-4 -mt-12">
        <Card className="p-4 shadow-lg">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">¥{(revenueData.totalIncome/1000).toFixed(1)}k</p>
              <p className="text-xs text-muted-foreground mt-0.5">累计收入</p>
            </div>
            <div className="text-center border-x border-border">
              <p className="text-lg font-bold text-foreground">¥{revenueData.monthIncome.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">本月收入</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-lg font-bold text-green-600">+{revenueData.monthCompare}%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">环比上月</p>
            </div>
          </div>
        </Card>
      </div>
      
      {/* 收支明细 */}
      <div className="mt-4 px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">收支明细</h2>
          <Button variant="ghost" size="sm" className="text-xs">
            <Download className="w-4 h-4 mr-1" />
            导出
          </Button>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4 h-9 mb-3">
            <TabsTrigger value="all" className="text-xs">全部</TabsTrigger>
            <TabsTrigger value="income" className="text-xs">收入</TabsTrigger>
            <TabsTrigger value="withdraw" className="text-xs">提现</TabsTrigger>
            <TabsTrigger value="refund" className="text-xs">支出</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="space-y-2">
          {filteredTransactions.map(item => {
            const config = typeConfig[item.type as keyof typeof typeConfig]
            const status = statusConfig[item.status as keyof typeof statusConfig]
            const Icon = config.icon
            
            return (
              <Card key={item.id} className="p-3">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center bg-muted", config.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{item.title}</span>
                      <Badge className={cn("text-[10px]", status.color)}>{status.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.orderNo ? `订单: ${item.orderNo}` : item.bankCard}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "font-medium",
                      item.amount > 0 ? "text-green-600" : "text-foreground"
                    )}>
                      {item.amount > 0 ? "+" : ""}{item.amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.createdAt}</p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
      
      {/* 结算说明 */}
      <div className="mt-4 px-4">
        <Card className="p-4 bg-amber-50 dark:bg-amber-950/30 border-amber-200/50">
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">结算说明</p>
              <p className="text-xs text-muted-foreground mt-1">
                订单完成后7天自动结算到可提现余额，提现到银行卡1-3个工作日到账。
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
