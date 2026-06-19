"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  BookOpen,
  ShoppingBag,
  Calendar,
  Clock,
  MapPin,
  MoreHorizontal,
  Package,
  ChevronRight,
  RefreshCw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { 
  getOfflineOrders,
  payOfflineOrder,
  cancelOfflineOrder,
  confirmOfflineOrder,
  requestRefund,
  getOrderTypeLabel,
  getOrderStatusLabel,
  getOrderStatusColor,
  getOrderActions,
} from "@/lib/api/offline"
import type { OfflineOrder, OfflineOrderType } from "@/lib/types/offline"

// 骨架屏
function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-muted rounded", className)} />
}

// Tab 配置
const orderTabs: { key: OfflineOrderType | 'all'; label: string; icon: typeof BookOpen }[] = [
  { key: 'all', label: '全部', icon: Package },
  { key: 'course', label: '课程', icon: BookOpen },
  { key: 'product', label: '商品', icon: ShoppingBag },
  { key: 'booking', label: '预约', icon: Calendar },
]

// 加载骨架屏
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="h-5 w-24" />
        </div>
      </header>
      <div className="flex border-b border-border">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="flex-1 h-12" />
        ))}
      </div>
      <div className="p-4 space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-40 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

// 订单卡片
function OrderCard({ 
  order, 
  onAction 
}: { 
  order: OfflineOrder
  onAction: (orderId: number, action: string) => void
}) {
  const router = useRouter()
  const actions = getOrderActions(order)
  
  const TypeIcon = orderTabs.find(t => t.key === order.type)?.icon || Package
  
  return (
    <div 
      className="bg-card rounded-lg border border-border overflow-hidden"
      onClick={() => router.push(`/offline/orders/${order.id}`)}
    >
      {/* 订单头部 */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TypeIcon className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{order.stationName}</span>
        </div>
        <span className={cn(
          "text-xs px-2 py-0.5 rounded-full",
          getOrderStatusColor(order.status)
        )}>
          {getOrderStatusLabel(order.status)}
        </span>
      </div>
      
      {/* 订单内容 */}
      <div className="p-4">
        {order.items.map((item, index) => (
          <div key={item.id} className={cn("flex gap-3", index > 0 && "mt-3 pt-3 border-t border-border")}>
            <img 
              src={item.cover} 
              alt={item.title}
              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm line-clamp-2">{item.title}</h4>
              {item.spec && (
                <p className="text-xs text-muted-foreground mt-1">{item.spec}</p>
              )}
              <div className="flex items-center justify-between mt-1">
                <span className="text-primary font-medium">¥{item.price}</span>
                <span className="text-xs text-muted-foreground">x{item.quantity}</span>
              </div>
            </div>
          </div>
        ))}
        
        {/* 预约/课程时间 */}
        {order.scheduleTime && (
          <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>预约时间：{order.scheduleTime}</span>
          </div>
        )}
      </div>
      
      {/* 订单底部 */}
      <div className="px-4 py-3 border-t border-border bg-muted/30 flex items-center justify-between">
        <div className="text-sm">
          <span className="text-muted-foreground">共{order.items.reduce((sum, i) => sum + i.quantity, 0)}件</span>
          <span className="mx-2 text-muted-foreground">|</span>
          <span>实付</span>
          <span className="text-primary font-semibold ml-1">¥{order.payAmount}</span>
        </div>
        
        {actions.length > 0 && (
          <div className="flex gap-2" onClick={e => e.stopPropagation()}>
            {actions.slice(0, 2).map(action => (
              <Button
                key={action.key}
                size="sm"
                variant={action.variant}
                onClick={() => onAction(order.id, action.key)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// 空态
function EmptyState({ type }: { type: string }) {
  const router = useRouter()
  const labels: Record<string, string> = {
    all: '暂无订单',
    course: '暂无课程订单',
    product: '暂无商品订单',
    booking: '暂无预约订单',
  }
  
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Package className="w-16 h-16 text-muted-foreground/30 mb-4" />
      <p className="text-muted-foreground mb-4">{labels[type] || '暂无订单'}</p>
      <Button variant="outline" onClick={() => router.push('/offline/stations')}>
        去逛逛驿站
      </Button>
    </div>
  )
}

function OfflineOrdersContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get('type') as OfflineOrderType | 'all') || 'all'
  
  const [activeTab, setActiveTab] = useState<OfflineOrderType | 'all'>(initialTab)
  const [orders, setOrders] = useState<OfflineOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // 加载订单
  const loadOrders = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const res = await getOfflineOrders({ type: activeTab })
      if (res.code === 200 && res.data) {
        setOrders(res.data.list)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }
  
  useEffect(() => {
    loadOrders()
  }, [activeTab])
  
  // 刷新
  const handleRefresh = () => {
    setRefreshing(true)
    loadOrders(false)
  }
  
  // 订单操作
  const handleOrderAction = async (orderId: number, action: string) => {
    switch (action) {
      case 'pay':
        const payRes = await payOfflineOrder(orderId)
        if (payRes.code === 200) {
          loadOrders(false)
        }
        break
      case 'cancel':
        if (confirm('确定要取消这个订单吗？')) {
          const cancelRes = await cancelOfflineOrder(orderId)
          if (cancelRes.code === 200) {
            loadOrders(false)
          }
        }
        break
      case 'confirm':
        const confirmRes = await confirmOfflineOrder(orderId)
        if (confirmRes.code === 200) {
          loadOrders(false)
        }
        break
      case 'refund':
        const reason = prompt('请输入退款原因')
        if (reason) {
          const refundRes = await requestRefund(orderId, reason)
          if (refundRes.code === 200) {
            loadOrders(false)
          }
        }
        break
      case 'review':
        router.push(`/offline/orders/${orderId}/review`)
        break
      case 'rebuy':
        router.push(`/offline/orders/${orderId}?rebuy=1`)
        break
    }
  }
  
  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.back()}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="font-semibold">驿站订单</h1>
          </div>
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted"
          >
            <RefreshCw className={cn("w-5 h-5", refreshing && "animate-spin")} />
          </button>
        </div>
        
        {/* Tab 栏 */}
        <div className="flex border-t border-border">
          {orderTabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex-1 py-3 flex flex-col items-center gap-1 text-sm transition-colors",
                  activeTab === tab.key
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </header>
      
      {/* 订单列表 */}
      <div className="p-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-40 rounded-lg" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <EmptyState type={activeTab} />
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <OrderCard 
                key={order.id} 
                order={order} 
                onAction={handleOrderAction}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function OfflineOrdersPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <OfflineOrdersContent />
    </Suspense>
  )
}
