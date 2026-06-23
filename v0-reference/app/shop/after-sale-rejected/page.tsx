"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, XCircle, MessageCircle, AlertTriangle, FileText, RefreshCw, Phone, Copy, CheckCircle2 } from "lucide-react"
import { shopApi, type AfterSaleDetail } from "@/lib/api"

const mockDetail: AfterSaleDetail = {
  id: "as001",
  orderId: "order001",
  orderNo: "202401150001",
  type: "refund_only",
  status: "rejected",
  reason: "商品质量问题",
  amount: 168,
  description: "收到商品后发现印刷模糊，影响阅读体验",
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
    { status: "submitted", title: "提交申请", time: "2024-01-15 10:30", isCurrent: false },
    { status: "reviewing", title: "商家审核", time: "2024-01-15 14:20", isCurrent: false },
    { status: "rejected", title: "申请驳回", description: "商家已驳回您的售后申请", time: "2024-01-16 09:15", isCurrent: true },
  ],
  rejectReason: "经核实，您购买的商品为正品且印刷清晰，不符合退款条件。商品在发货前已经过严格质检，如有疑问请联系客服进一步沟通。",
  createdAt: "2024-01-15 10:30",
  canCancel: false,
}

function AfterSaleRejectedContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [detail, setDetail] = useState<AfterSaleDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const id = searchParams.get('id') || 'as001'

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const data = await shopApi.afterSaleDetail(id)
        setDetail(data)
      } catch {
        setDetail(mockDetail)
      } finally {
        setLoading(false)
      }
    }
    fetchDetail()
  }, [id])

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB] px-4 py-3 h-14" />
        <div className="p-4 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl h-32 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!detail) return null

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-[#C41E3A] to-[#E53E3E] px-4 py-3 flex items-center gap-3 text-white">
        <button onClick={() => router.back()} className="p-1 -ml-1">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <span className="text-lg font-medium">售后结果</span>
      </div>

      {/* Result Card */}
      <div className="bg-gradient-to-br from-[#C41E3A] to-[#E53E3E] px-4 pt-6 pb-12">
        <div className="flex flex-col items-center text-white">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-4 animate-pulse">
            <XCircle className="w-12 h-12" />
          </div>
          <h1 className="text-2xl font-bold mb-2">售后申请已驳回</h1>
          <p className="text-white/80 text-sm">您的售后申请未通过审核</p>
        </div>
      </div>

      {/* Reject Reason Card */}
      <div className="px-4 -mt-6">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#E8E3DB]">
            <div className="flex items-center gap-2 text-[#C41E3A] mb-3">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">驳回原因</span>
            </div>
            <p className="text-[#666666] text-sm leading-relaxed">
              {detail.rejectReason}
            </p>
          </div>

          {/* Timeline preview */}
          <div className="p-4 bg-[#FAF8F5]">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#999999]">处理时间</span>
              <span className="text-[#2C2C2C]">
                {detail.timeline.find(t => t.status === 'rejected')?.time || detail.createdAt}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* After Sale Info */}
      <div className="px-4 mt-4">
        <div className="bg-white rounded-2xl p-4">
          <h3 className="font-medium text-[#2C2C2C] mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#C9A96E]" />
            售后信息
          </h3>

          {/* Product */}
          <div className="flex gap-3 pb-4 border-b border-[#E8E3DB]">
            <img
              src={detail.product.cover}
              alt={detail.product.name}
              className="w-16 h-16 rounded-lg object-cover bg-gray-100"
            />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm text-[#2C2C2C] line-clamp-1">{detail.product.name}</h4>
              <p className="text-xs text-[#999999] mt-1">{detail.product.skuName}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[#C41E3A] font-medium">¥{detail.product.price}</span>
                <span className="text-xs text-[#999999]">x{detail.product.quantity}</span>
              </div>
            </div>
          </div>

          {/* Info List */}
          <div className="pt-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[#999999]">售后类型</span>
              <span className="text-[#2C2C2C]">
                {detail.type === 'refund_only' ? '仅退款' : '退货退款'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#999999]">退款金额</span>
              <span className="text-[#C41E3A] font-medium">¥{detail.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#999999]">退款原因</span>
              <span className="text-[#2C2C2C]">{detail.reason}</span>
            </div>
            <div className="flex justify-between text-sm items-start">
              <span className="text-[#999999]">售后单号</span>
              <div className="flex items-center gap-2">
                <span className="text-[#2C2C2C]">{detail.id}</span>
                <button
                  onClick={() => handleCopy(detail.id)}
                  className="text-[#C9A96E]"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Problem Description */}
      {detail.description && (
        <div className="px-4 mt-4">
          <div className="bg-white rounded-2xl p-4">
            <h3 className="font-medium text-[#2C2C2C] mb-3">问题描述</h3>
            <p className="text-sm text-[#666666] leading-relaxed">{detail.description}</p>
          </div>
        </div>
      )}

      {/* Evidence Images */}
      {detail.images && detail.images.length > 0 && (
        <div className="px-4 mt-4">
          <div className="bg-white rounded-2xl p-4">
            <h3 className="font-medium text-[#2C2C2C] mb-3">凭证图片</h3>
            <div className="flex gap-2 flex-wrap">
              {detail.images.map((img, index) => (
                <img
                  key={index}
                  src={img}
                  alt={`凭证${index + 1}`}
                  className="w-20 h-20 rounded-lg object-cover bg-gray-100"
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Appeal Tips */}
      <div className="px-4 mt-4">
        <div className="bg-gradient-to-r from-[#FFF7ED] to-[#FFFBF5] rounded-2xl p-4 border border-[#FBBF24]/20">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-[#FBBF24]/10 rounded-full flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-5 h-5 text-[#FBBF24]" />
            </div>
            <div>
              <h4 className="font-medium text-[#2C2C2C] mb-1">对结果有异议？</h4>
              <p className="text-sm text-[#666666] leading-relaxed">
                如果您对驳回结果有疑问，可以发起申诉，我们会安排专人重新审核您的售后申请。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Customer Service */}
      <div className="px-4 mt-4">
        <button
          onClick={() => router.push('/customer-service')}
          className="w-full bg-white rounded-2xl p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#C9A96E]/10 rounded-full flex items-center justify-center">
              <Phone className="w-5 h-5 text-[#C9A96E]" />
            </div>
            <div className="text-left">
              <h4 className="font-medium text-[#2C2C2C]">联系客服</h4>
              <p className="text-xs text-[#999999]">在线客服为您解答</p>
            </div>
          </div>
          <ChevronLeft className="w-5 h-5 text-[#CCCCCC] rotate-180" />
        </button>
      </div>

      {/* Fixed Bottom Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E3DB] p-4 space-y-3">
        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/shop/after-sale?orderId=${detail.orderId}&prefill=true`)}
            className="flex-1 py-3 border border-[#C41E3A] text-[#C41E3A] rounded-xl font-medium flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            重新申请
          </button>
          <button
            onClick={() => router.push(`/shop/dispute?afterSaleId=${detail.id}`)}
            className="flex-1 py-3 bg-gradient-to-r from-[#C41E3A] to-[#E53E3E] text-white rounded-xl font-medium flex items-center justify-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            我要申诉
          </button>
        </div>
        <button
          onClick={() => router.push(`/orders/${detail.orderId}`)}
          className="w-full py-3 bg-[#FAF8F5] text-[#666666] rounded-xl text-sm"
        >
          查看订单详情
        </button>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="sticky top-0 z-10 bg-gradient-to-r from-[#C41E3A] to-[#E53E3E] px-4 py-3 h-14" />
      <div className="p-4 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl h-32 animate-pulse" />
        ))}
      </div>
    </div>
  )
}

export default function AfterSaleRejectedPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AfterSaleRejectedContent />
    </Suspense>
  )
}
