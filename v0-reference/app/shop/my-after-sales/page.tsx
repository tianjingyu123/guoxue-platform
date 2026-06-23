"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Package, RefreshCw, X, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { shopApi, type AfterSaleListItem } from "@/lib/api"

const mockData: AfterSaleListItem[] = [
  {
    id: "1",
    orderId: "o1",
    orderNo: "AS202401150001",
    type: "refund_only",
    status: "pending",
    amount: 168,
    reason: "商品质量问题",
    product: { id: "p1", name: "周易六十四卦详解（精装典藏版）", cover: "/placeholder.svg", skuName: "精装版" },
    createdAt: "2024-01-15T10:30:00Z",
    canCancel: true,
  },
  {
    id: "2",
    orderId: "o2",
    orderNo: "AS202401140002",
    type: "refund_with_return",
    status: "approved",
    amount: 88,
    reason: "尺寸不符",
    product: { id: "p2", name: "紫微斗数入门教程", cover: "/placeholder.svg", skuName: "平装版" },
    createdAt: "2024-01-14T14:20:00Z",
    canCancel: false,
  },
  {
    id: "3",
    orderId: "o3",
    orderNo: "AS202401130003",
    type: "refund_only",
    status: "completed",
    amount: 299,
    reason: "七天无理由",
    product: { id: "p3", name: "奇门遁甲实战手册", cover: "/placeholder.svg", skuName: "典藏版" },
    createdAt: "2024-01-13T09:15:00Z",
    canCancel: false,
  },
  {
    id: "4",
    orderId: "o4",
    orderNo: "AS202401120004",
    type: "refund_with_return",
    status: "rejected",
    amount: 128,
    reason: "不喜欢",
    product: { id: "p4", name: "梅花易数精解", cover: "/placeholder.svg", skuName: "标准版" },
    createdAt: "2024-01-12T16:45:00Z",
    canCancel: false,
  },
]

const tabs = [
  { key: "", label: "全部" },
  { key: "pending", label: "处理中" },
  { key: "completed", label: "已完成" },
  { key: "rejected", label: "已驳回" },
]

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  pending: { label: "审核中", color: "text-orange-600", bgColor: "bg-orange-50", icon: Clock },
  approved: { label: "已通过", color: "text-blue-600", bgColor: "bg-blue-50", icon: CheckCircle2 },
  refunding: { label: "退款中", color: "text-blue-600", bgColor: "bg-blue-50", icon: RefreshCw },
  completed: { label: "已完成", color: "text-green-600", bgColor: "bg-green-50", icon: CheckCircle2 },
  rejected: { label: "已驳回", color: "text-red-600", bgColor: "bg-red-50", icon: XCircle },
  cancelled: { label: "已取消", color: "text-gray-500", bgColor: "bg-gray-100", icon: X },
}

export default function MyAfterSalesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("")
  const [items, setItems] = useState<AfterSaleListItem[]>([])
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [activeTab])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await shopApi.myAfterSales({ status: activeTab || undefined })
      setItems(res.data)
    } catch {
      const filtered = activeTab ? mockData.filter(i => i.status === activeTab || (activeTab === "pending" && ["pending", "approved", "refunding"].includes(i.status))) : mockData
      setItems(filtered)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (id: string) => {
    setCancellingId(id)
    try {
      await shopApi.cancelAfterSale(id)
      setItems(items.map(i => i.id === id ? { ...i, status: "cancelled" as const, canCancel: false } : i))
    } catch {
      // Optimistic update for demo
      setItems(items.map(i => i.id === id ? { ...i, status: "cancelled" as const, canCancel: false } : i))
    } finally {
      setCancellingId(null)
      setShowCancelConfirm(null)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB]">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ChevronLeft className="w-6 h-6 text-[#2C2C2C]" />
          </button>
          <h1 className="text-lg font-semibold text-[#2C2C2C] font-serif">我的售后</h1>
        </div>

        {/* Tabs */}
        <div className="flex px-4 gap-6 border-t border-[#E8E3DB]">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-3 relative text-sm font-medium transition-colors ${
                activeTab === tab.key ? "text-[#C41E3A]" : "text-[#666666]"
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C41E3A] rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {loading ? (
          // Skeleton
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-20 h-20 bg-gray-200 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))
        ) : items.length === 0 ? (
          // Empty state
          <div className="py-20 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-[#FAF8F5] rounded-full flex items-center justify-center">
              <Package className="w-10 h-10 text-[#999999]" />
            </div>
            <p className="text-[#666666] mb-4">暂无售后记录</p>
            <button
              onClick={() => router.push("/orders")}
              className="px-6 py-2 bg-[#C41E3A] text-white rounded-full text-sm"
            >
              查看订单
            </button>
          </div>
        ) : (
          items.map(item => {
            const status = statusConfig[item.status]
            const StatusIcon = status.icon
            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm"
              >
                {/* Header */}
                <div className="px-4 py-3 border-b border-[#E8E3DB] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${status.bgColor} ${status.color} flex items-center gap-1`}>
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </span>
                    <span className="text-xs text-[#999999]">
                      {item.type === "refund_only" ? "仅退款" : "退货退款"}
                    </span>
                  </div>
                  <span className="text-xs text-[#999999]">{formatDate(item.createdAt)}</span>
                </div>

                {/* Content */}
                <div
                  className="p-4 flex gap-3 cursor-pointer"
                  onClick={() => router.push(`/shop/after-sale/${item.id}`)}
                >
                  <img
                    src={item.product.cover}
                    alt={item.product.name}
                    className="w-20 h-20 rounded-xl object-cover bg-[#FAF8F5]"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-[#2C2C2C] line-clamp-2 mb-1">
                      {item.product.name}
                    </h3>
                    <p className="text-xs text-[#999999] mb-2">{item.product.skuName}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs text-[#666666]">退款金额：</span>
                        <span className="text-[#C41E3A] font-semibold">¥{item.amount}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#999999]" />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {item.canCancel && (
                  <div className="px-4 py-3 border-t border-[#E8E3DB] flex justify-end gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowCancelConfirm(item.id)
                      }}
                      disabled={cancellingId === item.id}
                      className="px-4 py-1.5 border border-[#E8E3DB] rounded-full text-sm text-[#666666] disabled:opacity-50"
                    >
                      {cancellingId === item.id ? "取消中..." : "取消售后"}
                    </button>
                    <button
                      onClick={() => router.push(`/shop/after-sale/${item.id}`)}
                      className="px-4 py-1.5 bg-[#C41E3A] text-white rounded-full text-sm"
                    >
                      查看进度
                    </button>
                  </div>
                )}

                {item.status === "rejected" && (
                  <div className="px-4 py-3 border-t border-[#E8E3DB] flex justify-end gap-2">
                    <button
                      onClick={() => router.push(`/shop/after-sale-rejected?id=${item.id}`)}
                      className="px-4 py-1.5 border border-[#C41E3A] text-[#C41E3A] rounded-full text-sm"
                    >
                      查看原因
                    </button>
                    <button
                      onClick={() => router.push(`/shop/after-sale?orderId=${item.orderId}`)}
                      className="px-4 py-1.5 bg-[#C41E3A] text-white rounded-full text-sm"
                    >
                      重新申请
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Cancel Confirm Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-[80%] max-w-sm p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-orange-50 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-orange-500" />
            </div>
            <h3 className="text-lg font-semibold text-[#2C2C2C] mb-2">确认取消售后？</h3>
            <p className="text-sm text-[#666666] mb-6">取消后如需继续申请，请重新提交</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(null)}
                className="flex-1 py-2.5 border border-[#E8E3DB] rounded-full text-[#666666]"
              >
                再想想
              </button>
              <button
                onClick={() => handleCancel(showCancelConfirm)}
                className="flex-1 py-2.5 bg-[#C41E3A] text-white rounded-full"
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
