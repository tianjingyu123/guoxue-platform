"use client"

import Link from "next/link"
import { 
  Package, ShoppingCart, Star, TrendingUp, TrendingDown, AlertCircle, ChevronRight,
  Settings, Eye, MessageSquare, Wallet, Bell, BarChart3, Store, ArrowUpRight, ArrowDownRight
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// 迷你折线图组件
function SparkLine({ data, color = "primary", height = 32 }: { data: number[], color?: string, height?: number }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * 100
    const y = 100 - ((val - min) / range) * 100
    return `${x},${y}`
  }).join(' ')
  
  const colorClass = color === "primary" ? "stroke-primary" : color === "green" ? "stroke-green-500" : "stroke-amber-500"
  
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={cn("w-full", `h-[${height}px]`)} style={{ height }}>
      <polyline
        points={points}
        fill="none"
        className={colorClass}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// 模拟商家数据
const merchantData = {
  shopName: "墨香阁文化",
  avatar: "",
  level: "金牌商家",
  status: "正常营业",
  todayStats: {
    orders: { value: 12, change: 20, trend: "up" as const },
    sales: { value: 2680, change: 15.5, trend: "up" as const },
    visitors: { value: 156, change: -8, trend: "down" as const },
    conversion: { value: 7.7, change: 2.3, trend: "up" as const }
  },
  pending: {
    toShip: 8,
    refund: 2,
    review: 5,
    inquiry: 3
  },
  weeklyTrend: {
    orders: [8, 12, 15, 10, 18, 22, 12],
    sales: [1200, 1800, 2200, 1500, 2800, 3500, 2680],
    visitors: [120, 145, 168, 132, 178, 195, 156]
  },
  notices: [
    { id: "1", title: "双十一活动报名开始", type: "活动", time: "2小时前" },
    { id: "2", title: "新版商品发布规则已更新", type: "规则", time: "1天前" },
  ]
}

const quickActions = [
  { icon: Package, label: "发布商品", href: "/merchant/product-edit", color: "text-blue-600 bg-blue-50" },
  { icon: ShoppingCart, label: "订单管理", href: "/merchant/orders", color: "text-orange-600 bg-orange-50" },
  { icon: Star, label: "评价管理", href: "/merchant/reviews", color: "text-amber-600 bg-amber-50" },
  { icon: Wallet, label: "收入管理", href: "/merchant/revenue", color: "text-green-600 bg-green-50" },
  { icon: BarChart3, label: "数据分析", href: "/merchant/analytics", color: "text-purple-600 bg-purple-50" },
  { icon: Settings, label: "店铺设置", href: "/merchant/profile", color: "text-gray-600 bg-gray-50" },
]

export default function MerchantDashboardPage() {
  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      {/* 顶部店铺信息 */}
      <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-4 pb-16">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold">商家工作台</h1>
          <div className="flex items-center gap-2">
            <Link href="/merchant/shop-preview">
              <Button variant="ghost" size="icon" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10">
                <Eye className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/notifications">
              <Button variant="ghost" size="icon" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10 relative">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
              </Button>
            </Link>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
            <Store className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-lg">{merchantData.shopName}</span>
              <Badge className="bg-amber-500/90 text-white text-[10px]">{merchantData.level}</Badge>
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-primary-foreground/80">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                {merchantData.status}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* 数据概览卡片 - 优化版 */}
      <div className="px-4 -mt-12">
        <Card className="p-4 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">今日数据</span>
            <Link href="/merchant/analytics" className="text-xs text-primary flex items-center">
              查看详情 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          
          {/* 主要指标 - 带趋势 */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-3 bg-secondary/50 rounded-xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">订单数</span>
                <span className={cn(
                  "text-[10px] flex items-center",
                  merchantData.todayStats.orders.trend === "up" ? "text-green-600" : "text-red-500"
                )}>
                  {merchantData.todayStats.orders.trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(merchantData.todayStats.orders.change)}%
                </span>
              </div>
              <p className="text-2xl font-bold">{merchantData.todayStats.orders.value}</p>
              <div className="mt-2">
                <SparkLine data={merchantData.weeklyTrend.orders} color="primary" height={24} />
              </div>
            </div>
            
            <div className="p-3 bg-secondary/50 rounded-xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">销售额</span>
                <span className={cn(
                  "text-[10px] flex items-center",
                  merchantData.todayStats.sales.trend === "up" ? "text-green-600" : "text-red-500"
                )}>
                  {merchantData.todayStats.sales.trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(merchantData.todayStats.sales.change)}%
                </span>
              </div>
              <p className="text-2xl font-bold">¥{merchantData.todayStats.sales.value}</p>
              <div className="mt-2">
                <SparkLine data={merchantData.weeklyTrend.sales} color="green" height={24} />
              </div>
            </div>
          </div>
          
          {/* 次要指标 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">访客数</p>
                <p className="text-lg font-semibold">{merchantData.todayStats.visitors.value}</p>
              </div>
              <span className={cn(
                "text-xs flex items-center px-1.5 py-0.5 rounded",
                merchantData.todayStats.visitors.trend === "up" ? "text-green-600 bg-green-50" : "text-red-500 bg-red-50"
              )}>
                {merchantData.todayStats.visitors.trend === "up" ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                {Math.abs(merchantData.todayStats.visitors.change)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">转化率</p>
                <p className="text-lg font-semibold">{merchantData.todayStats.conversion.value}%</p>
              </div>
              <span className={cn(
                "text-xs flex items-center px-1.5 py-0.5 rounded",
                merchantData.todayStats.conversion.trend === "up" ? "text-green-600 bg-green-50" : "text-red-500 bg-red-50"
              )}>
                {merchantData.todayStats.conversion.trend === "up" ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                {Math.abs(merchantData.todayStats.conversion.change)}%
              </span>
            </div>
          </div>
        </Card>
      </div>
      
      {/* 待处理事项 */}
      <div className="px-4 mt-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">待处理事项</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <Link href="/merchant/orders?status=toship" className="text-center p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="relative inline-block">
                <ShoppingCart className="w-6 h-6 text-muted-foreground mx-auto" />
                {merchantData.pending.toShip > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center px-1">
                    {merchantData.pending.toShip}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">待发货</p>
            </Link>
            <Link href="/merchant/orders?status=refund" className="text-center p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="relative inline-block">
                <AlertCircle className="w-6 h-6 text-muted-foreground mx-auto" />
                {merchantData.pending.refund > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center px-1">
                    {merchantData.pending.refund}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">退款中</p>
            </Link>
            <Link href="/merchant/reviews?status=pending" className="text-center p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="relative inline-block">
                <Star className="w-6 h-6 text-muted-foreground mx-auto" />
                {merchantData.pending.review > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center px-1">
                    {merchantData.pending.review}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">待回复</p>
            </Link>
            <Link href="/merchant/inquiries" className="text-center p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="relative inline-block">
                <MessageSquare className="w-6 h-6 text-muted-foreground mx-auto" />
                {merchantData.pending.inquiry > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center px-1">
                    {merchantData.pending.inquiry}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">咨询</p>
            </Link>
          </div>
        </Card>
      </div>
      
      {/* 快捷功能 */}
      <div className="px-4 mt-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">常用功能</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map(action => (
              <Link 
                key={action.label} 
                href={action.href}
                className="flex flex-col items-center p-3 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", action.color)}>
                  <action.icon className="w-5 h-5" />
                </div>
                <span className="text-xs mt-2 text-foreground">{action.label}</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>
      
      {/* 经营提示 */}
      <div className="px-4 mt-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">平台公告</span>
            <Link href="/merchant/notices" className="text-xs text-primary">
              更多
            </Link>
          </div>
          <div className="space-y-3">
            {merchantData.notices.map(notice => (
              <Link key={notice.id} href={`/merchant/notices/${notice.id}`} className="flex items-start gap-3 group">
                <Badge variant="secondary" className="text-[10px] mt-0.5 flex-shrink-0">{notice.type}</Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground group-hover:text-primary transition-colors truncate">{notice.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{notice.time}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              </Link>
            ))}
          </div>
        </Card>
      </div>
      
      {/* 经营建议 */}
      <div className="px-4 mt-4">
        <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200/50 dark:border-amber-800/50">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">经营小贴士</p>
              <p className="text-xs text-muted-foreground mt-1">
                您的商品详情页转化率较低，建议优化商品主图和详情描述，可提升约20%的转化率。
              </p>
              <Button variant="link" className="h-auto p-0 text-xs text-amber-600 mt-2">
                查看优化建议
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
