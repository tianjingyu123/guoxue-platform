"use client"

import { useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Search, Filter, Package, Truck, CheckCircle, XCircle, Clock, ChevronRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

const orders = [
  {
    id: "202401150001",
    productTitle: "滴天髓精解",
    productImage: "",
    price: 68,
    quantity: 2,
    totalAmount: 136,
    status: "pending",
    buyerName: "张***",
    buyerPhone: "138****8888",
    address: "北京市朝阳区***",
    createdAt: "2024-01-15 14:30:00",
    paidAt: "2024-01-15 14:32:00",
  },
  {
    id: "202401150002",
    productTitle: "子平真诠评注",
    productImage: "",
    price: 88,
    quantity: 1,
    totalAmount: 88,
    status: "shipped",
    buyerName: "李***",
    buyerPhone: "139****9999",
    address: "上海市浦东新区***",
    createdAt: "2024-01-14 10:20:00",
    paidAt: "2024-01-14 10:22:00",
    shippedAt: "2024-01-14 16:00:00",
    trackingNo: "SF1234567890",
  },
  {
    id: "202401150003",
    productTitle: "文房四宝套装",
    productImage: "",
    price: 268,
    quantity: 1,
    totalAmount: 268,
    status: "completed",
    buyerName: "王***",
    buyerPhone: "137****7777",
    address: "广州市天河区***",
    createdAt: "2024-01-10 09:00:00",
    completedAt: "2024-01-13 12:00:00",
  },
  {
    id: "202401150004",
    productTitle: "八字命理基础课",
    productImage: "",
    price: 199,
    quantity: 1,
    totalAmount: 199,
    status: "refunding",
    buyerName: "赵***",
    buyerPhone: "136****6666",
    address: "",
    createdAt: "2024-01-12 15:00:00",
    refundReason: "买错了",
  },
  {
    id: "202401150005",
    productTitle: "紫砂茶壶礼盒",
    productImage: "",
    price: 588,
    quantity: 1,
    totalAmount: 588,
    status: "cancelled",
    buyerName: "孙***",
    buyerPhone: "135****5555",
    address: "深圳市南山区***",
    createdAt: "2024-01-08 11:00:00",
    cancelledAt: "2024-01-08 11:30:00",
  },
]

const statusConfig = {
  pending: { label: "待发货", icon: Package, color: "text-orange-600 bg-orange-50" },
  shipped: { label: "已发货", icon: Truck, color: "text-blue-600 bg-blue-50" },
  completed: { label: "已完成", icon: CheckCircle, color: "text-green-600 bg-green-50" },
  refunding: { label: "退款中", icon: Clock, color: "text-red-600 bg-red-50" },
  cancelled: { label: "已取消", icon: XCircle, color: "text-gray-600 bg-gray-50" },
}

function OrdersContent() {
  const searchParams = useSearchParams()
  const initialStatus = searchParams.get("status") || "all"
  const [activeTab, setActiveTab] = useState(initialStatus)
  const [searchQuery, setSearchQuery] = useState("")
  
  const filteredOrders = orders.filter(o => {
    if (activeTab !== "all" && o.status !== activeTab) return false
    if (searchQuery && !o.id.includes(searchQuery) && !o.productTitle.includes(searchQuery)) return false
    return true
  })

  const stats = {
    all: orders.length,
    pending: orders.filter(o => o.status === "pending").length,
    shipped: orders.filter(o => o.status === "shipped").length,
    refunding: orders.filter(o => o.status === "refunding").length,
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center h-14 px-4">
          <Link href="/merchant/dashboard" className="mr-3">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold">订单管理</h1>
        </div>
      </header>
      
      {/* 搜索 */}
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="搜索订单号/商品名称" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
        </div>
        
        {/* 状态标签 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4 h-9">
            <TabsTrigger value="all" className="text-xs">全部({stats.all})</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs">待发货({stats.pending})</TabsTrigger>
            <TabsTrigger value="shipped" className="text-xs">已发货({stats.shipped})</TabsTrigger>
            <TabsTrigger value="refunding" className="text-xs">退款({stats.refunding})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {/* 订单列表 */}
      <div className="px-4 space-y-3">
        {filteredOrders.map(order => {
          const config = statusConfig[order.status as keyof typeof statusConfig]
          const StatusIcon = config.icon
          
          return (
            <Link key={order.id} href={`/merchant/order-detail?id=${order.id}`}>
              <Card className="p-4 hover:shadow-md transition-shadow">
                {/* 订单头部 */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground">订单号: {order.id}</span>
                  <Badge className={cn("text-xs", config.color)}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {config.label}
                  </Badge>
                </div>
                
                {/* 商品信息 */}
                <div className="flex gap-3">
                  <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">📦</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground line-clamp-2">{order.productTitle}</h3>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground">x{order.quantity}</span>
                      <span className="text-sm font-medium">¥{order.price}</span>
                    </div>
                  </div>
                </div>
                
                {/* 订单金额 */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    {order.createdAt.split(" ")[0]}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      共{order.quantity}件，实付: <span className="font-bold text-primary">¥{order.totalAmount}</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                
                {/* 操作按钮 */}
                {order.status === "pending" && (
                  <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-border">
                    <Button variant="outline" size="sm" onClick={e => e.preventDefault()}>
                      修改价格
                    </Button>
                    <Button size="sm" onClick={e => e.preventDefault()}>
                      立即发货
                    </Button>
                  </div>
                )}
                
                {order.status === "refunding" && (
                  <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-border">
                    <Button variant="outline" size="sm" onClick={e => e.preventDefault()}>
                      拒绝退款
                    </Button>
                    <Button variant="destructive" size="sm" onClick={e => e.preventDefault()}>
                      同意退款
                    </Button>
                  </div>
                )}
              </Card>
            </Link>
          )
        })}
        
        {filteredOrders.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-muted-foreground">暂无订单</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function OrdersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <OrdersContent />
    </Suspense>
  )
}
