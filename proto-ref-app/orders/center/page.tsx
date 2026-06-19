"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
  ChevronLeft, ShoppingBag, BookOpen, Users, Radio, Gift, 
  MessageCircle, Coins, Clock, CheckCircle2, X, ChevronRight,
  Package, Ticket, Trophy, Building2, GraduationCap
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"

// ============================================
// 订单类型定义
// ============================================
type OrderCategory = "all" | "product" | "course" | "circle" | "live" | "activity" | "qa" | "membership" | "station" | "institute"

const orderCategories: { key: OrderCategory; label: string; icon: typeof ShoppingBag }[] = [
  { key: "all", label: "全部", icon: Package },
  { key: "product", label: "商品", icon: ShoppingBag },
  { key: "course", label: "课程", icon: BookOpen },
  { key: "circle", label: "圈子", icon: Users },
  { key: "live", label: "直播", icon: Radio },
  { key: "activity", label: "活动", icon: Ticket },
  { key: "qa", label: "问答", icon: MessageCircle },
  { key: "membership", label: "会员", icon: Gift },
  { key: "station", label: "分站", icon: Building2 },
  { key: "institute", label: "研究院", icon: GraduationCap },
]

type OrderStatus = "pending" | "paid" | "completed" | "cancelled" | "refunding" | "expired"

const statusConfig: Record<OrderStatus, { label: string; color: string }> = {
  pending: { label: "待付款", color: "text-amber-500 bg-amber-50" },
  paid: { label: "已付款", color: "text-blue-500 bg-blue-50" },
  completed: { label: "已完成", color: "text-green-500 bg-green-50" },
  cancelled: { label: "已取消", color: "text-muted-foreground bg-muted" },
  refunding: { label: "退款中", color: "text-orange-500 bg-orange-50" },
  expired: { label: "已过期", color: "text-red-500 bg-red-50" },
}

// ============================================
// Mock 订单数据
// ============================================
interface UnifiedOrder {
  id: string
  orderNo: string
  category: OrderCategory
  title: string
  cover?: string
  price: number
  originalPrice?: number
  status: OrderStatus
  createdAt: string
  paidAt?: string
  expiredAt?: string // 有效期（会员、圈子等）
  extra?: {
    circleName?: string
    teacherName?: string
    duration?: string
    quantity?: number
  }
}

const mockOrders: UnifiedOrder[] = [
  {
    id: "1",
    orderNo: "C202401150001",
    category: "course",
    title: "八字入门实战精讲课",
    cover: "/placeholder.svg",
    price: 299,
    originalPrice: 599,
    status: "completed",
    createdAt: "2024-01-15 14:30",
    paidAt: "2024-01-15 14:32",
    extra: { teacherName: "张玄风", duration: "36课时" }
  },
  {
    id: "2",
    orderNo: "R202401140002",
    category: "circle",
    title: "八字命理研习社",
    cover: "/placeholder.svg",
    price: 199,
    status: "completed",
    createdAt: "2024-01-14 10:20",
    paidAt: "2024-01-14 10:25",
    expiredAt: "2025-01-14",
    extra: { circleName: "八字命理研习社" }
  },
  {
    id: "3",
    orderNo: "P202401130003",
    category: "product",
    title: "周易六十四卦详解（精装典藏版）",
    cover: "/placeholder.svg",
    price: 168,
    status: "paid",
    createdAt: "2024-01-13 09:15",
    paidAt: "2024-01-13 09:20",
    extra: { quantity: 1 }
  },
  {
    id: "4",
    orderNo: "L202401120004",
    category: "live",
    title: "紫微斗数实战直播课",
    cover: "/placeholder.svg",
    price: 49.9,
    status: "completed",
    createdAt: "2024-01-12 18:00",
    paidAt: "2024-01-12 18:02",
    extra: { teacherName: "李命理" }
  },
  {
    id: "5",
    orderNo: "Q202401100005",
    category: "qa",
    title: "八字婚姻分析咨询",
    cover: "/placeholder.svg",
    price: 88,
    status: "completed",
    createdAt: "2024-01-10 16:40",
    paidAt: "2024-01-10 16:45",
    extra: { teacherName: "王大师" }
  },
  {
    id: "6",
    orderNo: "M202401080006",
    category: "membership",
    title: "热卜国学VIP年卡",
    price: 365,
    originalPrice: 588,
    status: "completed",
    createdAt: "2024-01-08 12:00",
    paidAt: "2024-01-08 12:05",
    expiredAt: "2025-01-08",
  },
  {
    id: "7",
    orderNo: "A202401050007",
    category: "activity",
    title: "新春开运讲座",
    cover: "/placeholder.svg",
    price: 0,
    status: "completed",
    createdAt: "2024-01-05 20:00",
    extra: { duration: "2小时" }
  },
  {
    id: "8",
    orderNo: "S202312200008",
    category: "station",
    title: "分站站长资格",
    price: 999,
    status: "completed",
    createdAt: "2023-12-20 10:00",
    paidAt: "2023-12-20 10:05",
    expiredAt: "2024-12-20",
  },
  {
    id: "9",
    orderNo: "I202312150009",
    category: "institute",
    title: "研究院保证金",
    price: 10000,
    status: "completed",
    createdAt: "2023-12-15 14:00",
    paidAt: "2023-12-15 14:10",
    expiredAt: "2024-12-15",
    extra: { circleName: "热卜国学研究院" }
  },
  {
    id: "10",
    orderNo: "C202401160010",
    category: "course",
    title: "风水堪舆高级班",
    cover: "/placeholder.svg",
    price: 1299,
    status: "pending",
    createdAt: "2024-01-16 09:00",
    extra: { teacherName: "风水大师", duration: "60课时" }
  },
]

// ============================================
// 获取分类图标
// ============================================
function getCategoryIcon(category: OrderCategory) {
  const config = orderCategories.find(c => c.key === category)
  if (!config) return <Package className="w-4 h-4" />
  const Icon = config.icon
  return <Icon className="w-4 h-4" />
}

function getCategoryColor(category: OrderCategory) {
  const colors: Record<OrderCategory, string> = {
    all: "bg-muted text-muted-foreground",
    product: "bg-danger/10 text-danger",
    course: "bg-gold/10 text-gold",
    circle: "bg-primary/10 text-primary",
    live: "bg-info/10 text-info",
    activity: "bg-operator/10 text-operator",
    qa: "bg-success/10 text-success",
    membership: "bg-warning/10 text-warning",
    station: "bg-success/10 text-success",
    institute: "bg-operator/10 text-operator",
  }
  return colors[category]
}

// ============================================
// 主组件
// ============================================
export default function OrderCenterPage() {
  const router = useRouter()
  const [activeCategory, setActiveCategory] = useState<OrderCategory>("all")
  const [activeStatus, setActiveStatus] = useState<OrderStatus | "">("")
  
  // 筛选订单
  const filteredOrders = mockOrders.filter(order => {
    if (activeCategory !== "all" && order.category !== activeCategory) return false
    if (activeStatus && order.status !== activeStatus) return false
    return true
  })

  // 计算各分类数量
  const categoryCounts = orderCategories.reduce((acc, cat) => {
    acc[cat.key] = cat.key === "all" 
      ? mockOrders.length 
      : mockOrders.filter(o => o.category === cat.key).length
    return acc
  }, {} as Record<OrderCategory, number>)

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between h-12 px-4">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-base">我的订单</h1>
          <div className="w-6" />
        </div>

        {/* 分类Tab - 横向滚动 */}
        <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto scrollbar-hide">
          {orderCategories.map((cat) => {
            const Icon = cat.icon
            const count = categoryCounts[cat.key]
            const isActive = activeCategory === cat.key
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
                {count > 0 && (
                  <span className={cn(
                    "min-w-[16px] h-[16px] rounded-full text-[10px] flex items-center justify-center",
                    isActive ? "bg-white/20" : "bg-muted"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* 状态筛选 */}
        <div className="flex items-center gap-2 px-4 pb-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveStatus("")}
            className={cn(
              "px-2.5 py-1 rounded text-xs transition-all",
              activeStatus === "" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"
            )}
          >
            全部状态
          </button>
          {Object.entries(statusConfig).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setActiveStatus(key as OrderStatus)}
              className={cn(
                "px-2.5 py-1 rounded text-xs whitespace-nowrap transition-all",
                activeStatus === key ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"
              )}
            >
              {config.label}
            </button>
          ))}
        </div>
      </header>

      {/* 订单列表 */}
      <main className="p-4 pb-24">
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Package className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">暂无订单</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => {
              const status = statusConfig[order.status]
              const categoryLabel = orderCategories.find(c => c.key === order.category)?.label
              
              return (
                <Card key={order.id} className="overflow-hidden">
                  {/* 订单头部 */}
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-secondary/30">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium",
                        getCategoryColor(order.category)
                      )}>
                        {getCategoryIcon(order.category)}
                        {categoryLabel}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{order.orderNo}</span>
                    </div>
                    <span className={cn("text-xs font-medium", status.color.split(" ")[0])}>
                      {status.label}
                    </span>
                  </div>

                  {/* 订单内容 */}
                  <div className="p-3">
                    <div className="flex gap-3">
                      {/* 封面 */}
                      {order.cover ? (
                        <div className="w-16 h-16 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                          <img src={order.cover} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className={cn(
                          "w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0",
                          getCategoryColor(order.category)
                        )}>
                          {getCategoryIcon(order.category)}
                        </div>
                      )}

                      {/* 信息 */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm line-clamp-2">{order.title}</h3>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                          {order.extra?.teacherName && (
                            <span>讲师: {order.extra.teacherName}</span>
                          )}
                          {order.extra?.duration && (
                            <span>{order.extra.duration}</span>
                          )}
                          {order.extra?.quantity && (
                            <span>x{order.extra.quantity}</span>
                          )}
                        </div>
                        {order.expiredAt && (
                          <div className="flex items-center gap-1 mt-1 text-[10px]">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className={cn(
                              new Date(order.expiredAt) < new Date() ? "text-red-500" : "text-muted-foreground"
                            )}>
                              有效期至 {order.expiredAt}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* 价格 */}
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-base text-primary">
                          {order.price > 0 ? `¥${order.price}` : "免费"}
                        </p>
                        {order.originalPrice && order.originalPrice > order.price && (
                          <p className="text-[10px] text-muted-foreground line-through">
                            ¥{order.originalPrice}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 订单底部 */}
                  <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-secondary/20">
                    <span className="text-[10px] text-muted-foreground">{order.createdAt}</span>
                    <div className="flex items-center gap-2">
                      {order.status === "pending" && (
                        <>
                          <Button variant="outline" size="sm" className="h-7 text-xs">
                            取消订单
                          </Button>
                          <Button size="sm" className="h-7 text-xs bg-primary">
                            去付款
                          </Button>
                        </>
                      )}
                      {order.status === "completed" && order.expiredAt && new Date(order.expiredAt) > new Date() && (
                        <Link href={`/renew?type=${order.category}&id=${order.id}`}>
                          <Button variant="outline" size="sm" className="h-7 text-xs">
                            续费
                          </Button>
                        </Link>
                      )}
                      {order.status === "completed" && !order.expiredAt && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                          查看详情
                          <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                      {order.status === "expired" && (
                        <Link href={`/renew?type=${order.category}&id=${order.id}`}>
                          <Button size="sm" className="h-7 text-xs bg-amber-500 hover:bg-amber-600">
                            立即续费
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
