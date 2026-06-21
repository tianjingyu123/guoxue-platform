"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  ArrowLeft, TrendingUp, TrendingDown, ChevronRight, Users, 
  BookOpen, ShoppingBag, Radio, MessageCircle, Filter, Calendar,
  Wallet, ArrowUpRight, Info
} from "lucide-react"
import { BackButton } from "@/components/common/back-button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

// 圈子收益数据
const earningsData = {
  circleName: "八字命理研习社",
  totalEarnings: 128680.50,
  monthlyEarnings: 12580.00,
  monthlyChange: 15.8, // 环比涨跌
  withdrawable: 45680.00,
  minWithdraw: 100,
  // 收入来源
  sources: [
    { type: "join", name: "入圈收入", amount: 45800, percent: 35.6, color: "bg-primary" },
    { type: "course", name: "课程收入", amount: 38600, percent: 30.0, color: "bg-accent" },
    { type: "product", name: "商品收入", amount: 22400, percent: 17.4, color: "bg-blue-500" },
    { type: "live", name: "直播打赏", amount: 12880, percent: 10.0, color: "bg-purple-500" },
    { type: "qa", name: "付费问答", amount: 9000, percent: 7.0, color: "bg-green-500" },
  ],
  // 近30天趋势
  trend: [
    { day: "05/01", amount: 380 },
    { day: "05/05", amount: 520 },
    { day: "05/10", amount: 680 },
    { day: "05/15", amount: 450 },
    { day: "05/20", amount: 890 },
    { day: "05/25", amount: 720 },
    { day: "05/30", amount: 580 },
  ],
  // 收益明细
  details: [
    { id: 1, type: "join", desc: "用户「易学新人」加入圈子", amount: 199, time: "今天 14:32" },
    { id: 2, type: "course", desc: "课程《八字入门》被购买", amount: 299, time: "今天 11:20" },
    { id: 3, type: "qa", desc: "回答付费问题获得收益", amount: 50, time: "今天 09:15" },
    { id: 4, type: "live", desc: "直播打赏收入", amount: 88, time: "昨天 21:30" },
    { id: 5, type: "product", desc: "商品「罗盘」被购买", amount: 168, time: "昨天 16:45" },
    { id: 6, type: "join", desc: "用户「命理爱好者」加入圈子", amount: 199, time: "昨天 10:20" },
    { id: 7, type: "course", desc: "课程《紫微斗数》被购买", amount: 399, time: "前天 15:30" },
    { id: 8, type: "live", desc: "直播打赏收入", amount: 128, time: "前天 22:10" },
  ],
}

// 获取类型图标
function getTypeIcon(type: string) {
  switch (type) {
    case "join": return <Users className="w-4 h-4" />
    case "course": return <BookOpen className="w-4 h-4" />
    case "product": return <ShoppingBag className="w-4 h-4" />
    case "live": return <Radio className="w-4 h-4" />
    case "qa": return <MessageCircle className="w-4 h-4" />
    default: return <Wallet className="w-4 h-4" />
  }
}

// 获取类型颜色
function getTypeColor(type: string) {
  switch (type) {
    case "join": return "bg-primary/20 text-primary"
    case "course": return "bg-accent/20 text-accent"
    case "product": return "bg-blue-500/20 text-blue-500"
    case "live": return "bg-purple-500/20 text-purple-500"
    case "qa": return "bg-green-500/20 text-green-500"
    default: return "bg-secondary text-muted-foreground"
  }
}

export default function CircleEarningsPage() {
  const [filterType, setFilterType] = useState("all")
  const [showFilter, setShowFilter] = useState(false)
  
  const filterTypes = [
    { id: "all", name: "全部" },
    { id: "join", name: "入圈" },
    { id: "course", name: "课程" },
    { id: "product", name: "商品" },
    { id: "live", name: "直播" },
    { id: "qa", name: "问答" },
  ]
  
  const filteredDetails = filterType === "all" 
    ? earningsData.details 
    : earningsData.details.filter(d => d.type === filterType)
  
  // 计算趋势图最大值
  const maxAmount = Math.max(...earningsData.trend.map(t => t.amount))
  
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton fallbackPath="/circle/1/home" />
          <h1 className="font-semibold text-base text-foreground">圈子收益</h1>
          <Link href="/circles/1/earnings/detail" className="text-sm text-primary">
            全部明细
          </Link>
        </div>
      </header>

      {/* 收益总览卡片 */}
      <div className="p-4">
        <Card className="relative overflow-hidden bg-gradient-to-br from-accent via-accent/90 to-primary p-5">
          {/* 装饰背景 */}
          <div className="absolute -right-8 -top-8 w-32 h-32 opacity-10">
            <svg viewBox="0 0 100 100" className="w-full h-full fill-current text-white">
              <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="2"/>
              <path d="M50 2 A48 48 0 0 1 50 98 A24 24 0 0 1 50 50 A24 24 0 0 0 50 2" />
            </svg>
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white/80 text-sm">累计收入</span>
              <Info className="w-3.5 h-3.5 text-white/60" />
            </div>
            <p className="text-3xl font-bold text-white mb-4">
              ¥{earningsData.totalEarnings.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-white/70 text-xs mb-1">本月收入</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-white">
                    ¥{earningsData.monthlyEarnings.toLocaleString()}
                  </span>
                  <Badge className={cn(
                    "text-[10px] px-1.5 py-0 border-0",
                    earningsData.monthlyChange >= 0 
                      ? "bg-green-500/30 text-green-200" 
                      : "bg-red-500/30 text-red-200"
                  )}>
                    {earningsData.monthlyChange >= 0 ? (
                      <TrendingUp className="w-3 h-3 mr-0.5" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-0.5" />
                    )}
                    {Math.abs(earningsData.monthlyChange)}%
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-white/70 text-xs mb-1">可提现余额</p>
                <p className="text-lg font-semibold text-white">
                  ¥{earningsData.withdrawable.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 收入来源拆解 */}
      <div className="px-4 pb-4">
        <Card className="p-4">
          <h2 className="font-semibold text-sm text-foreground mb-4">收入来源</h2>
          
          <div className="flex gap-6">
            {/* 环形图 */}
            <div className="relative w-24 h-24 flex-shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {earningsData.sources.reduce((acc, source, index) => {
                  const prevPercent = earningsData.sources.slice(0, index).reduce((sum, s) => sum + s.percent, 0)
                  const dashArray = `${source.percent * 2.83} ${283 - source.percent * 2.83}`
                  const dashOffset = -prevPercent * 2.83
                  
                  acc.push(
                    <circle
                      key={source.type}
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      strokeWidth="10"
                      className={source.color.replace("bg-", "stroke-")}
                      strokeDasharray={dashArray}
                      strokeDashoffset={dashOffset}
                    />
                  )
                  return acc
                }, [] as React.ReactNode[])}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs text-muted-foreground">总计</span>
                <span className="text-sm font-semibold text-foreground">
                  ¥{(earningsData.totalEarnings / 10000).toFixed(1)}万
                </span>
              </div>
            </div>
            
            {/* 图例列表 */}
            <div className="flex-1 space-y-2">
              {earningsData.sources.map(source => (
                <div key={source.type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2.5 h-2.5 rounded-full", source.color)} />
                    <span className="text-xs text-muted-foreground">{source.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground">
                      ¥{source.amount.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-muted-foreground w-10 text-right">
                      {source.percent}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* 收入趋势图 */}
      <div className="px-4 pb-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm text-foreground">收入趋势</h2>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              近30天
            </div>
          </div>
          
          {/* 简易柱状图 */}
          <div className="flex items-end justify-between gap-2 h-24">
            {earningsData.trend.map((item, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-1">
                <div 
                  className="w-full bg-gradient-to-t from-accent to-accent/60 rounded-t transition-all hover:from-primary hover:to-primary/60"
                  style={{ height: `${(item.amount / maxAmount) * 100}%` }}
                />
                <span className="text-[10px] text-muted-foreground">{item.day.split("/")[1]}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 收益明细列表 */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm text-foreground">收益明细</h2>
          <button 
            onClick={() => setShowFilter(!showFilter)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Filter className="w-3.5 h-3.5" />
            筛选
          </button>
        </div>
        
        {/* 筛选条 */}
        {showFilter && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
            {filterTypes.map(type => (
              <button
                key={type.id}
                onClick={() => setFilterType(type.id)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors",
                  filterType === type.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {type.name}
              </button>
            ))}
          </div>
        )}
        
        <Card className="divide-y divide-border">
          {filteredDetails.length > 0 ? (
            filteredDetails.map(detail => (
              <div key={detail.id} className="flex items-center gap-3 p-3">
                <div className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center",
                  getTypeColor(detail.type)
                )}>
                  {getTypeIcon(detail.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground line-clamp-1">{detail.desc}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{detail.time}</p>
                </div>
                <span className="text-sm font-medium text-green-500">
                  +¥{detail.amount}
                </span>
              </div>
            ))
          ) : (
            <div className="py-12 text-center">
              <p className="text-muted-foreground text-sm">暂无相关记录</p>
            </div>
          )}
        </Card>
        
        {filteredDetails.length > 0 && (
          <Link 
            href="/circles/1/earnings/detail"
            className="flex items-center justify-center gap-1 mt-3 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            查看全部明细 <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* 底部固定操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border safe-area-pb">
        <div className="px-4 py-3">
          {/* 提现条件提示 */}
          {earningsData.withdrawable < earningsData.minWithdraw && (
            <p className="text-xs text-muted-foreground text-center mb-2">
              满¥{earningsData.minWithdraw}可提现，还差¥{(earningsData.minWithdraw - earningsData.withdrawable).toFixed(2)}
            </p>
          )}
          
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">可提现余额</p>
              <p className="text-lg font-bold text-foreground">
                ¥{earningsData.withdrawable.toLocaleString()}
              </p>
            </div>
            <Link
              href="/wallet/withdraw"
              className={cn(
                "flex items-center gap-2 px-8 py-3 rounded-xl font-medium transition-colors",
                earningsData.withdrawable >= earningsData.minWithdraw
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-secondary text-muted-foreground cursor-not-allowed"
              )}
            >
              <Wallet className="w-4 h-4" />
              申请提现
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
