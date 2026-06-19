"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ChevronLeft, Copy, CheckCircle2, XCircle, Clock, Package, Truck, AlertCircle, MessageCircle, X } from "lucide-react"
import { shopApi, type AfterSaleDetail } from "@/lib/api"

// Mock数据
const mockDetail: AfterSaleDetail = {
  id: "as001",
  orderId: "order001",
  orderNo: "202401150001",
  type: "refund_with_return",
  status: "approved",
  reason: "商品与描述不符",
  amount: 168,
  description: "收到商品后发现颜色与图片差异较大，希望退货退款。",
  images: ["/placeholder.svg", "/placeholder.svg"],
  product: {
    id: "p1",
    name: "周易六十四卦详解（精装典藏版）",
    cover: "/placeholder.svg",
    skuName: "精装版",
    price: 168,
    quantity: 1,
  },
  timeline: [
    { status: "submitted", title: "提交申请", description: "您的售后申请已提交", time: "2024-01-15 10:30", isCurrent: false },
    { status: "approved", title: "审核通过", description: "商家已同意您的退货申请，请尽快寄回商品", time: "2024-01-15 14:20", isCurrent: true },
    { status: "shipping", title: "退货中", description: "等待您寄回商品", time: "", isCurrent: false },
    { status: "refunding", title: "退款中", description: "商家确认收货后将处理退款", time: "", isCurrent: false },
    { status: "completed", title: "退款完成", description: "退款已原路返回", time: "", isCurrent: false },
  ],
  logistics: {
    company: "顺丰速运",
    trackingNo: "",
    address: "北京市朝阳区建国路88号SOHO现代城A座1201",
  },
  createdAt: "2024-01-15 10:30",
  canCancel: true,
}

const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; bg: string; text: string }> = {
  pending: { icon: Clock, color: "text-orange-500", bg: "bg-orange-50", text: "审核中" },
  approved: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-50", text: "审核通过" },
  rejected: { icon: XCircle, color: "text-red-500", bg: "bg-red-50", text: "已拒绝" },
  refunding: { icon: Package, color: "text-blue-500", bg: "bg-blue-50", text: "退款中" },
  completed: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-50", text: "已完成" },
  cancelled: { icon: XCircle, color: "text-gray-500", bg: "bg-gray-50", text: "已取消" },
}

export default function AfterSaleDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<AfterSaleDetail | null>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const data = await shopApi.afterSaleDetail(params.id as string)
        setDetail(data)
      } catch {
        setDetail(mockDetail)
      } finally {
        setLoading(false)
      }
    }
    fetchDetail()
  }, [params.id])

  const handleCancel = async () => {
    if (!detail) return
    try {
      await shopApi.cancelAfterSale(detail.id)
      setDetail({ ...detail, status: "cancelled", canCancel: false })
      setShowCancelConfirm(false)
    } catch {
      setShowCancelConfirm(false)
    }
  }

  const copyOrderNo = () => {
    if (detail) {
      navigator.clipboard.writeText(detail.orderNo)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB] px-4 py-3 flex items-center gap-3">
          <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
          <div className="w-24 h-5 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="p-4 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
              <div className="h-24 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!detail) return null

  const StatusIcon = statusConfig[detail.status]?.icon || Clock
  const statusInfo = statusConfig[detail.status] || statusConfig.pending

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-24">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ChevronLeft className="w-6 h-6 text-[#2C2C2C]" />
          </button>
          <span className="text-lg font-semibold text-[#2C2C2C]">售后详情</span>
        </div>
        <button 
          onClick={() => router.push('/customer-service')}
          className="flex items-center gap-1 text-sm text-[#C41E3A]"
        >
          <MessageCircle className="w-4 h-4" />
          联系客服
        </button>
      </div>

      {/* 状态卡片 */}
      <div className={`mx-4 mt-4 rounded-2xl p-4 ${statusInfo.bg}`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full bg-white flex items-center justify-center ${statusInfo.color}`}>
            <StatusIcon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className={`font-semibold text-lg ${statusInfo.color}`}>{statusInfo.text}</div>
            {detail.status === "approved" && detail.type === "refund_with_return" && (
              <div className="text-sm text-[#666666] mt-0.5">请在7天内寄回商品</div>
            )}
            {detail.status === "rejected" && detail.rejectReason && (
              <div className="text-sm text-red-600 mt-0.5">原因：{detail.rejectReason}</div>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm text-[#999999]">退款金额</div>
            <div className="text-xl font-bold text-[#C41E3A]">¥{detail.amount}</div>
          </div>
        </div>
      </div>

      {/* 商品信息 */}
      <div className="mx-4 mt-4 bg-white rounded-2xl p-4">
        <div className="flex gap-3">
          <img src={detail.product.cover} alt="" className="w-20 h-20 rounded-xl object-cover bg-gray-100" />
          <div className="flex-1 min-w-0">
            <div className="text-[#2C2C2C] font-medium line-clamp-2">{detail.product.name}</div>
            <div className="text-sm text-[#999999] mt-1">{detail.product.skuName}</div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[#C41E3A] font-semibold">¥{detail.product.price}</span>
              <span className="text-sm text-[#999999]">x{detail.product.quantity}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 售后信息 */}
      <div className="mx-4 mt-4 bg-white rounded-2xl p-4 space-y-3">
        <div className="font-semibold text-[#2C2C2C]">售后信息</div>
        <div className="flex justify-between text-sm">
          <span className="text-[#999999]">售后类型</span>
          <span className="text-[#2C2C2C]">{detail.type === "refund_only" ? "仅退款" : "退货退款"}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[#999999]">退款原因</span>
          <span className="text-[#2C2C2C]">{detail.reason}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[#999999]">售后单号</span>
          <div className="flex items-center gap-2">
            <span className="text-[#2C2C2C]">{detail.id}</span>
            <button onClick={copyOrderNo} className="text-[#C41E3A]">
              {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[#999999]">申请时间</span>
          <span className="text-[#2C2C2C]">{detail.createdAt}</span>
        </div>
        {detail.description && (
          <div className="pt-2 border-t border-[#E8E3DB]">
            <div className="text-sm text-[#999999] mb-2">问题描述</div>
            <div className="text-sm text-[#2C2C2C]">{detail.description}</div>
          </div>
        )}
        {detail.images && detail.images.length > 0 && (
          <div className="pt-2 border-t border-[#E8E3DB]">
            <div className="text-sm text-[#999999] mb-2">上传凭证</div>
            <div className="flex gap-2 flex-wrap">
              {detail.images.map((img, i) => (
                <img key={i} src={img} alt="" className="w-16 h-16 rounded-lg object-cover bg-gray-100" />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 进度时间线 */}
      <div className="mx-4 mt-4 bg-white rounded-2xl p-4">
        <div className="font-semibold text-[#2C2C2C] mb-4">处理进度</div>
        <div className="relative">
          {detail.timeline.map((item, index) => {
            const isCompleted = detail.timeline.findIndex(t => t.isCurrent) >= index
            const isCurrent = item.isCurrent
            return (
              <div key={index} className="flex gap-4 pb-6 last:pb-0">
                <div className="flex flex-col items-center">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                    isCurrent ? "bg-[#C41E3A]" : isCompleted ? "bg-green-500" : "bg-gray-300"
                  }`}>
                    {isCompleted && !isCurrent && <CheckCircle2 className="w-3 h-3 text-white" />}
                    {isCurrent && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  {index < detail.timeline.length - 1 && (
                    <div className={`w-0.5 flex-1 mt-1 ${isCompleted ? "bg-green-500" : "bg-gray-200"}`} />
                  )}
                </div>
                <div className="flex-1 -mt-0.5">
                  <div className={`font-medium ${isCurrent ? "text-[#C41E3A]" : isCompleted ? "text-[#2C2C2C]" : "text-[#999999]"}`}>
                    {item.title}
                  </div>
                  {item.description && (
                    <div className="text-sm text-[#999999] mt-0.5">{item.description}</div>
                  )}
                  {item.time && (
                    <div className="text-xs text-[#999999] mt-1">{item.time}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 退货地址（如果是退货退款且已通过） */}
      {detail.type === "refund_with_return" && detail.status === "approved" && detail.logistics && (
        <div className="mx-4 mt-4 bg-white rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Truck className="w-5 h-5 text-[#C41E3A]" />
            <span className="font-semibold text-[#2C2C2C]">退货地址</span>
          </div>
          <div className="bg-[#FAF8F5] rounded-xl p-3">
            <div className="text-sm text-[#2C2C2C]">{detail.logistics.address}</div>
            <div className="text-xs text-[#999999] mt-2">请在7天内将商品寄回以上地址</div>
          </div>
          <button 
            onClick={() => router.push(`/shop/after-sale/${detail.id}/logistics`)}
            className="w-full mt-3 py-2.5 bg-[#C41E3A] text-white rounded-xl font-medium"
          >
            填写物流单号
          </button>
        </div>
      )}

      {/* 底部操作 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E3DB] p-4 flex gap-3">
        <button 
          onClick={() => router.push(`/orders/${detail.orderId}`)}
          className="flex-1 py-3 border border-[#E8E3DB] rounded-xl text-[#2C2C2C] font-medium"
        >
          查看订单
        </button>
        {detail.canCancel && (
          <button 
            onClick={() => setShowCancelConfirm(true)}
            className="flex-1 py-3 border border-[#C41E3A] text-[#C41E3A] rounded-xl font-medium"
          >
            取消售后
          </button>
        )}
      </div>

      {/* 取消确认弹窗 */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-[85%] max-w-sm overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-orange-50 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-orange-500" />
              </div>
              <div className="text-lg font-semibold text-[#2C2C2C] mb-2">确认取消售后？</div>
              <div className="text-sm text-[#666666]">取消后将无法恢复，需重新申请</div>
            </div>
            <div className="flex border-t border-[#E8E3DB]">
              <button 
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-4 text-[#666666] font-medium border-r border-[#E8E3DB]"
              >
                再想想
              </button>
              <button 
                onClick={handleCancel}
                className="flex-1 py-4 text-[#C41E3A] font-medium"
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
