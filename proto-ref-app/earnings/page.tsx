"use client"

import { useState } from "react"
import { BackButton } from "@/components/common/back-button"
import { ChevronRight, Filter, TrendingUp, Wallet, BookOpen, ShoppingBag, Users, Share2, Award, CircleDollarSign } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import Link from "next/link"

// 收入来源数据
const incomeSourcesData = [
  { name: "课程分成", amount: 3280.50, percentage: 42, color: "bg-primary", icon: BookOpen },
  { name: "商品分佣", amount: 1560.00, percentage: 20, color: "bg-accent", icon: ShoppingBag },
  { name: "入圈收入", amount: 980.00, percentage: 13, color: "bg-emerald-500", icon: Users },
  { name: "推广佣金", amount: 1200.00, percentage: 15, color: "bg-blue-500", icon: Share2 },
  { name: "管理奖励", amount: 780.00, percentage: 10, color: "bg-purple-500", icon: Award },
]

// 收入明细数据
const incomeRecords = [
  { id: 1, type: "course", title: "课程《八字入门》销售分佣", amount: 29.90, time: "今天 14:30", icon: BookOpen, color: "text-primary bg-primary/10" },
  { id: 2, type: "product", title: "商品「开运手串」销售分佣", amount: 15.00, time: "今天 11:20", icon: ShoppingBag, color: "text-accent bg-accent/10" },
  { id: 3, type: "circle", title: "用户加入「命理研习社」", amount: 9.90, time: "昨天 18:45", icon: Users, color: "text-emerald-500 bg-emerald-500/10" },
  { id: 4, type: "promote", title: "推广用户购买会员", amount: 50.00, time: "昨天 15:30", icon: Share2, color: "text-blue-500 bg-blue-500/10" },
  { id: 5, type: "course", title: "课程《紫微斗数精讲》销售分佣", amount: 99.00, time: "昨天 10:15", icon: BookOpen, color: "text-primary bg-primary/10" },
  { id: 6, type: "award", title: "本周管理奖励结算", amount: 200.00, time: "3天前", icon: Award, color: "text-purple-500 bg-purple-500/10" },
  { id: 7, type: "product", title: "商品「风水罗盘」销售分佣", amount: 45.00, time: "3天前", icon: ShoppingBag, color: "text-accent bg-accent/10" },
  { id: 8, type: "circle", title: "用户加入「风水实战班」", amount: 199.00, time: "4天前", icon: Users, color: "text-emerald-500 bg-emerald-500/10" },
]

// 近7天收益趋势数据
const trendData = [
  { day: "周一", amount: 320 },
  { day: "周二", amount: 580 },
  { day: "周三", amount: 420 },
  { day: "周四", amount: 890 },
  { day: "周五", amount: 650 },
  { day: "周六", amount: 1200 },
  { day: "周日", amount: 980 },
]

const maxTrendAmount = Math.max(...trendData.map(d => d.amount))

export default function EarningsPage() {
  const [activeFilter, setActiveFilter] = useState("all")
  const [showFilterSheet, setShowFilterSheet] = useState(false)
  
  const totalEarnings = 7800.50
  const withdrawableBalance = 5280.00
  
  const filters = [
    { id: "all", label: "全部" },
    { id: "course", label: "课程" },
    { id: "product", label: "商品" },
    { id: "circle", label: "圈子" },
    { id: "promote", label: "推广" },
  ]
  
  const filteredRecords = activeFilter === "all" 
    ? incomeRecords 
    : incomeRecords.filter(r => r.type === activeFilter)

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton fallbackPath="/profile" />
          <h1 className="font-semibold text-base text-foreground">推广收益</h1>
          <div className="w-9" />
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* 收益总览卡片 */}
        <Card className="p-5 bg-gradient-to-br from-accent via-accent/90 to-primary/80 border-0 text-white relative overflow-hidden">
          {/* 背景装饰 */}
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/5" />
          
          <div className="relative z-10">
            <p className="text-sm text-white/80">累计收益</p>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-sm">¥</span>
              <span className="text-4xl font-bold tracking-tight">{totalEarnings.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}</span>
            </div>
            
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/20">
              <div>
                <p className="text-xs text-white/70">可提现余额</p>
                <p className="text-lg font-semibold mt-0.5">¥{withdrawableBalance.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}</p>
              </div>
              <Link 
                href="/earnings/withdraw"
                className="px-5 py-2 bg-white text-accent font-medium text-sm rounded-full hover:bg-white/90 transition-colors"
              >
                提现
              </Link>
            </div>
          </div>
        </Card>

        {/* 收入来源拆分 */}
        <Card className="p-4 bg-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">收入来源</h2>
            <Link href="/earnings/breakdown" className="text-xs text-muted-foreground flex items-center gap-0.5">
              详情 <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          
          {/* 环形图占位 + 数据 */}
          <div className="flex items-center gap-6">
            {/* 简化环形图 */}
            <div className="relative w-28 h-28 flex-shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {incomeSourcesData.reduce((acc, source, index) => {
                  const prevOffset = acc.offset
                  const circumference = 2 * Math.PI * 40
                  const strokeDasharray = (source.percentage / 100) * circumference
                  const strokeDashoffset = -prevOffset
                  
                  acc.elements.push(
                    <circle
                      key={source.name}
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke={`hsl(var(--${index === 0 ? "primary" : index === 1 ? "accent" : "muted-foreground"}))`}
                      strokeWidth="12"
                      strokeDasharray={`${strokeDasharray} ${circumference}`}
                      strokeDashoffset={strokeDashoffset}
                      className={cn(
                        index === 0 && "stroke-primary",
                        index === 1 && "stroke-accent",
                        index === 2 && "stroke-emerald-500",
                        index === 3 && "stroke-blue-500",
                        index === 4 && "stroke-purple-500"
                      )}
                    />
                  )
                  acc.offset += strokeDasharray
                  return acc
                }, { elements: [] as React.ReactNode[], offset: 0 }).elements}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <CircleDollarSign className="w-6 h-6 text-accent" />
              </div>
            </div>
            
            {/* 图例 */}
            <div className="flex-1 space-y-2">
              {incomeSourcesData.slice(0, 4).map((source) => (
                <div key={source.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2.5 h-2.5 rounded-full", source.color)} />
                    <span className="text-muted-foreground">{source.name}</span>
                  </div>
                  <span className="font-medium text-foreground">{source.percentage}%</span>
                </div>
              ))}
              {incomeSourcesData.length > 4 && (
                <p className="text-xs text-muted-foreground">+{incomeSourcesData.length - 4}项其他收入</p>
              )}
            </div>
          </div>
        </Card>

        {/* 收益趋势图 */}
        <Card className="p-4 bg-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">近7天收益趋势</h2>
            <div className="flex items-center gap-1 text-emerald-500 text-xs">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+12.5%</span>
            </div>
          </div>
          
          {/* 简化柱状图 */}
          <div className="flex items-end justify-between gap-2 h-32">
            {trendData.map((item, index) => (
              <div key={item.day} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col items-center">
                  <span className="text-[10px] text-muted-foreground mb-1">
                    {item.amount >= 1000 ? `${(item.amount / 1000).toFixed(1)}k` : item.amount}
                  </span>
                  <div 
                    className={cn(
                      "w-full rounded-t-sm transition-all",
                      index === trendData.length - 2 ? "bg-accent" : "bg-primary/60"
                    )}
                    style={{ height: `${(item.amount / maxTrendAmount) * 80}px` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{item.day}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* 收入明细 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">收入明细</h2>
            <button 
              onClick={() => setShowFilterSheet(true)}
              className="flex items-center gap-1 text-xs text-muted-foreground"
            >
              <Filter className="w-3.5 h-3.5" />
              筛选
            </button>
          </div>
          
          {/* 筛选标签 */}
          <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={cn(
                  "px-3 py-1.5 text-xs rounded-full whitespace-nowrap transition-colors",
                  activeFilter === filter.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
          
          {/* 明细列表 */}
          <div className="space-y-2">
            {filteredRecords.map((record) => {
              const Icon = record.icon
              return (
                <Card key={record.id} className="p-3 bg-card hover:bg-secondary/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", record.color)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground line-clamp-1">{record.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{record.time}</p>
                    </div>
                    <span className="text-base font-semibold text-emerald-500">
                      +¥{record.amount.toFixed(2)}
                    </span>
                  </div>
                </Card>
              )
            })}
          </div>
          
          {/* 查看更多 */}
          <button className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors mt-2">
            查看全部记录
          </button>
        </div>
      </div>

      {/* 底部固定操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border p-4 safe-area-pb">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link 
            href="/earnings/records"
            className="flex-1 py-3 text-center text-sm font-medium text-foreground bg-secondary rounded-xl hover:bg-secondary/80 transition-colors"
          >
            全部明细
          </Link>
          <Link 
            href="/earnings/withdraw"
            className="flex-1 py-3 text-center text-sm font-medium text-primary-foreground bg-primary rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            <Wallet className="w-4 h-4" />
            申请提现
          </Link>
        </div>
      </div>
    </div>
  )
}
