"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Package, Truck, CheckCircle2, Clock, AlertCircle, Copy, X } from "lucide-react"
import { shopApi, type OrderListItem } from "@/lib/api"

const mockOrders: OrderListItem[] = [
  {
    id: "1",
    orderNo: "202401150001",
    status: "pending_pay",
    totalAmount: 256,
    payAmount: 256,
    createdAt: "2024-01-15 14:30",
    products: [
      { id: "p1", name: "周易六十四卦详解（精装典藏版）", cover: "/placeholder.svg", skuName: "精装版", price: 168, quantity: 1 },
      { id: "p2", name: "紫微斗数入门教程", cover: "/placeholder.svg", skuName: "平装版", price: 88, quantity: 1 },
    ],
    canCancel: true,
    canConfirm: false,
    canReview: false,
    hasAfterSale: false,
  },
  {
    id: "2",
    orderNo: "202401140002",
    status: "pending_ship",
    totalAmount: 168,
    payAmount: 158,
    createdAt: "2024-01-14 10:20",
    paidAt: "2024-01-14 10:25",
    products: [
      { id: "p3", name: "八字命理学基础", cover: "/placeholder.svg", skuName: "标准版", price: 168, quantity: 1 },
    ],
    canCancel: true,
    canConfirm: false,
    canReview: false,
    hasAfterSale: false,
  },
  {
    id: "3",
    orderNo: "202401130003",
    status: "pending_receive",
    totalAmount: 299,
    payAmount: 279,
    createdAt: "2024-01-13 09:15",
    paidAt: "2024-01-13 09:20",
    shippedAt: "2024-01-14 08:00",
    products: [
      { id: "p4", name: "风水布局实战指南", cover: "/placeholder.svg", skuName: "精装版", price: 299, quantity: 1 },
    ],
    canCancel: false,
    canConfirm: true,
    canReview: false,
    hasAfterSale: false,
  },
  {
    id: "4",
    orderNo: "202401100004",
    status: "completed",
    totalAmount: 128,
    payAmount: 128,
    createdAt: "2024-01-10 16:40",
    paidAt: "2024-01-10 16:45",
    shippedAt: "2024-01-11 09:00",
    completedAt: "2024-01-13 14:30",
    products: [
      { id: "p5", name: "梅花易数速成", cover: "/placeholder.svg", skuName: "电子版", price: 128, quantity: 1 },
    ],
    canCancel: false,
    canConfirm: false,
    canReview: true,
    hasAfterSale: false,
  },
]

const statusTabs = [
  { key: "", label: "全部" },
  { key: "pending_pay", label: "待付款" },
  { key: "pending_ship", label: "待发货" },
  { key: "pending_receive", label: "待收货" },
  { key: "completed", label: "已完成" },
  { key: "after_sale", label: "售后" },
]

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending_pay: { label: "待付款", color: "text-[#C41E3A]", icon: <Clock className="w-4 h-4" /> },
  pending_ship: { label: "待发货", color: "text-[#C9A96E]", icon: <Package className="w-4 h-4" /> },
  pending_receive: { label: "待收货", color: "text-blue-500", icon: <Truck className="w-4 h-4" /> },
  completed: { label: "已完成", color: "text-green-500", icon: <CheckCircle2 className="w-4 h-4" /> },
  cancelled: { label: "已取消", color: "text-[#999999]", icon: <X className="w-4 h-4" /> },
  after_sale: { label: "售后中", color: "text-orange-500", icon: <AlertCircle className="w-4 h-4" /> },
}

export default function OrdersPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("")
  const [orders, setOrders] = useState<OrderListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState("")

  useEffect(() => {
    loadOrders()
  }, [activeTab])

  const loadOrders = async () => {
    setLoading(true)
    try {
      const res = await shopApi.myOrders({ status: activeTab })
      setOrders(res.data)
    } catch {
      setOrders(activeTab ? mockOrders.filter(o => o.status === activeTab) : mockOrders)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelOrder = async () => {
    if (!cancelOrderId) return
    try {
      await shopApi.cancelOrder(cancelOrderId, cancelReason)
      setOrders(orders.map(o => o.id === cancelOrderId ? { ...o, status: "cancelled" as const, canCancel: false } : o))
    } catch {
      setOrders(orders.map(o => o.id === cancelOrderId ? { ...o, status: "cancelled" as const, canCancel: false } : o))
    }
    setShowCancelModal(false)
    setCancelOrderId(null)
    setCancelReason("")
  }

  const handleConfirmReceive = async (orderId: string) => {
    try {
      await shopApi.confirmReceive(orderId)
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: "completed" as const, canConfirm: false, canReview: true } : o))
    } catch {
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: "completed" as const, canConfirm: false, canReview: true } : o))
    }
  }

  const handleBuyAgain = async (orderId: string) => {
    try {
      await shopApi.buyAgain(orderId)
      router.push("/shop/cart")
    } catch {
      router.push("/shop/cart")
    }
  }

  const copyOrderNo = (orderNo: string) => {
    navigator.clipboard.writeText(orderNo)
  }

  const filteredOrders = activeTab ? orders.filter(o => o.status === activeTab) : orders

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-20">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-[#E8E3DB]">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ChevronLeft className="w-6 h-6 text-[#2C2C2C]" />
          </button>
          <h1 className="text-lg font-semibold text-[#2C2C2C]">我的订单</h1>
        </div>
        
        {/* Status Tabs */}
        <div className="flex overflow-x-auto scrollbar-hide">
          {statusTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "text-[#C41E3A] border-[#C41E3A]"
                  : "text-[#666666] border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
              <div className="flex justify-between mb-3">
                <div className="h-4 w-32 bg-gray-200 rounded" />
                <div className="h-4 w-16 bg-gray-200 rounded" />
              </div>
              <div className="flex gap-3">
                <div className="w-20 h-20 bg-gray-200 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-full bg-gray-200 rounded" />
                  <div className="h-3 w-20 bg-gray-200 rounded" />
                  <div className="h-4 w-16 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          ))
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Package className="w-16 h-16 text-[#E8E3DB] mb-4" />
            <p className="text-[#999999] mb-4">暂无订单</p>
            <button
              onClick={() => router.push("/shop")}
              className="px-6 py-2 bg-[#C41E3A] text-white text-sm font-medium rounded-full"
            >
              去逛逛
            </button>
          </div>
        ) : (
          filteredOrders.map(order => {
            const config = statusConfig[order.status] || statusConfig.completed
            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl overflow-hidden"
                onClick={() => router.push(`/orders/${order.id}`)}
              >
                {/* Order Header */}
                <div className="px-4 py-3 border-b border-[#E8E3DB] flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-[#666666]">
                    <span>订单号: {order.orderNo}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); copyOrderNo(order.orderNo); }}
                      className="p-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className={`flex items-center gap-1 text-sm font-medium ${config.color}`}>
                    {config.icon}
                    <span>{config.label}</span>
                  </div>
                </div>

                {/* Products */}
                <div className="p-4">
                  {order.products.slice(0, 2).map((product, idx) => (
                    <div key={product.id} className={`flex gap-3 ${idx > 0 ? "mt-3 pt-3 border-t border-[#E8E3DB]" : ""}`}>
                      <img
                        src={product.cover}
                        alt={product.name}
                        className="w-20 h-20 object-cover rounded-lg bg-[#FAF8F5]"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-[#2C2C2C] line-clamp-2">{product.name}</h3>
                        <p className="text-xs text-[#999999] mt-1">{product.skuName}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm font-semibold text-[#C41E3A]">¥{product.price}</span>
                          <span className="text-xs text-[#999999]">x{product.quantity}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {order.products.length > 2 && (
                    <p className="text-xs text-[#999999] mt-3 text-center">
                      共 {order.products.length} 件商品
                    </p>
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-[#E8E3DB] flex items-center justify-between">
                  <div className="text-sm">
                    <span className="text-[#666666]">实付: </span>
                    <span className="text-[#C41E3A] font-semibold">¥{order.payAmount}</span>
                  </div>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    {order.status === "pending_pay" && (
                      <>
                        <button
                          onClick={() => { setCancelOrderId(order.id); setShowCancelModal(true); }}
                          className="px-4 py-1.5 text-sm text-[#666666] border border-[#E8E3DB] rounded-full"
                        >
                          取消订单
                        </button>
                        <button
                          onClick={() => router.push(`/shop/paying?orderId=${order.id}`)}
                          className="px-4 py-1.5 text-sm text-white bg-[#C41E3A] rounded-full"
                        >
                          去支付
                        </button>
                      </>
                    )}
                    {order.status === "pending_ship" && order.canCancel && (
                      <button
                        onClick={() => { setCancelOrderId(order.id); setShowCancelModal(true); }}
                        className="px-4 py-1.5 text-sm text-[#666666] border border-[#E8E3DB] rounded-full"
                      >
                        取消订单
                      </button>
                    )}
                    {order.status === "pending_receive" && (
                      <>
                        <button
                          onClick={() => router.push(`/orders/logistics?orderId=${order.id}`)}
                          className="px-4 py-1.5 text-sm text-[#666666] border border-[#E8E3DB] rounded-full"
                        >
                          查看物流
                        </button>
                        {order.canConfirm && (
                          <button
                            onClick={() => handleConfirmReceive(order.id)}
                            className="px-4 py-1.5 text-sm text-white bg-[#C41E3A] rounded-full"
                          >
                            确认收货
                          </button>
                        )}
                      </>
                    )}
                    {order.status === "completed" && (
                      <>
                        {order.canReview && (
                          <button
                            onClick={() => router.push(`/orders/${order.id}/review`)}
                            className="px-4 py-1.5 text-sm text-[#C41E3A] border border-[#C41E3A] rounded-full"
                          >
                            去评价
                          </button>
                        )}
                        <button
                          onClick={() => handleBuyAgain(order.id)}
                          className="px-4 py-1.5 text-sm text-white bg-[#C41E3A] rounded-full"
                        >
                          再次购买
                        </button>
                      </>
                    )}
                    {order.hasAfterSale && (
                      <button
                        onClick={() => router.push("/shop/my-after-sales")}
                        className="px-4 py-1.5 text-sm text-[#666666] border border-[#E8E3DB] rounded-full"
                      >
                        查看售后
                      </button>
                    )}
                    {!order.hasAfterSale && order.status === "completed" && (
                      <button
                        onClick={() => router.push(`/shop/after-sale?orderId=${order.id}`)}
                        className="px-4 py-1.5 text-sm text-[#666666] border border-[#E8E3DB] rounded-full"
                      >
                        申请售后
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-[85%] max-w-sm overflow-hidden">
            <div className="p-4 border-b border-[#E8E3DB]">
              <h3 className="text-lg font-semibold text-[#2C2C2C] text-center">取消订单</h3>
            </div>
            <div className="p-4">
              <p className="text-sm text-[#666666] mb-3">请选择取消原因：</p>
              {["不想要了", "信息填写错误", "重复下单", "其他原因"].map(reason => (
                <button
                  key={reason}
                  onClick={() => setCancelReason(reason)}
                  className={`w-full text-left px-4 py-3 rounded-lg mb-2 text-sm transition-colors ${
                    cancelReason === reason
                      ? "bg-[#C41E3A]/10 text-[#C41E3A] border border-[#C41E3A]"
                      : "bg-[#FAF8F5] text-[#2C2C2C]"
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-[#E8E3DB] flex gap-3">
              <button
                onClick={() => { setShowCancelModal(false); setCancelOrderId(null); setCancelReason(""); }}
                className="flex-1 py-2.5 text-sm text-[#666666] border border-[#E8E3DB] rounded-full"
              >
                暂不取消
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={!cancelReason}
                className="flex-1 py-2.5 text-sm text-white bg-[#C41E3A] rounded-full disabled:opacity-50"
              >
                确认取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
