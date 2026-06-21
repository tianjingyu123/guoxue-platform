"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, AlertCircle, Copy, Check, RefreshCw, ShoppingBag, Clock, Wallet } from "lucide-react"

interface FailInfo {
  groupId: string
  orderId: string
  productName: string
  productCover: string
  price: number
  reason: 'timeout' | 'stock' | 'other'
  members: { id: string; name: string; avatar: string }[]
  minMembers: number
  currentMembers: number
  failedAt: string
  refundStatus: 'pending' | 'processing' | 'completed'
  refundAmount: number
  estimatedRefundTime: string
}

const mockInfo: FailInfo = {
  groupId: "g123",
  orderId: "2024010100001",
  productName: "紫微斗数入门教程（精装版）",
  productCover: "/placeholder.svg",
  price: 128,
  reason: 'timeout',
  members: [
    { id: "1", name: "张三", avatar: "/placeholder.svg" },
  ],
  minMembers: 3,
  currentMembers: 1,
  failedAt: "2024-01-15 18:00:00",
  refundStatus: 'processing',
  refundAmount: 128,
  estimatedRefundTime: "2024-01-18"
}

function GroupBuyFailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [copied, setCopied] = useState(false)
  const [info, setInfo] = useState<FailInfo | null>(null)

  useEffect(() => {
    // API: marketingApi.groupBuyDetail(id)
    setInfo(mockInfo)
  }, [searchParams])

  const copyOrderId = () => {
    if (info) {
      navigator.clipboard.writeText(info.orderId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const getReasonText = (reason: string) => {
    switch (reason) {
      case 'timeout': return '拼团超时，未能在规定时间内凑齐人数'
      case 'stock': return '商品库存不足，无法完成拼团'
      default: return '拼团未能成功，我们正在处理退款'
    }
  }

  const getRefundProgress = () => {
    if (!info) return 0
    switch (info.refundStatus) {
      case 'pending': return 33
      case 'processing': return 66
      case 'completed': return 100
      default: return 0
    }
  }

  if (!info) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#C41E3A] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-32">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-500 to-gray-600 text-white">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <span className="text-lg font-medium">拼团结果</span>
        </div>

        <div className="px-4 pb-8 text-center">
          <div className="w-20 h-20 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-4 animate-pulse">
            <AlertCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2">拼团未成功</h1>
          <p className="text-white/80 text-sm">{getReasonText(info.reason)}</p>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* Product Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex gap-3">
            <img src={info.productCover} alt="" className="w-20 h-20 rounded-xl object-cover bg-gray-100" />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-[#2C2C2C] line-clamp-2 mb-2">{info.productName}</h3>
              <div className="flex items-center gap-2">
                <span className="text-[#C41E3A] font-bold">¥{info.price}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-[#E8E3DB]">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#999999]">参团人数</span>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {info.members.map((m) => (
                    <img key={m.id} src={m.avatar} alt="" className="w-6 h-6 rounded-full border-2 border-white" />
                  ))}
                  {Array.from({ length: info.minMembers - info.currentMembers }).map((_, i) => (
                    <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-400 text-xs">?</span>
                    </div>
                  ))}
                </div>
                <span className="text-[#666666]">{info.currentMembers}/{info.minMembers}人</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-[#999999]">失败时间</span>
              <span className="text-[#666666]">{info.failedAt}</span>
            </div>
          </div>
        </div>

        {/* Refund Info Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="w-5 h-5 text-[#C41E3A]" />
            <span className="font-medium text-[#2C2C2C]">退款信息</span>
          </div>

          <div className="bg-[#FAF8F5] rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[#666666]">退款金额</span>
              <span className="text-[#C41E3A] font-bold text-lg">¥{info.refundAmount.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#999999]">预计到账</span>
              <span className="text-[#666666]">{info.estimatedRefundTime}（1-3个工作日）</span>
            </div>
          </div>

          {/* Refund Progress */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-[#999999] mb-2">
              <span>申请退款</span>
              <span>处理中</span>
              <span>退款完成</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#C41E3A] to-[#E85A6B] rounded-full transition-all duration-500"
                style={{ width: `${getRefundProgress()}%` }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center ${info.refundStatus !== 'pending' ? 'bg-[#C41E3A]' : 'bg-gray-300'}`}>
                {info.refundStatus !== 'pending' && <Check className="w-3 h-3 text-white" />}
              </div>
              <div className={`w-4 h-4 rounded-full flex items-center justify-center ${info.refundStatus === 'completed' ? 'bg-[#C41E3A]' : info.refundStatus === 'processing' ? 'bg-[#C41E3A] animate-pulse' : 'bg-gray-300'}`}>
                {info.refundStatus === 'completed' && <Check className="w-3 h-3 text-white" />}
              </div>
              <div className={`w-4 h-4 rounded-full flex items-center justify-center ${info.refundStatus === 'completed' ? 'bg-[#C41E3A]' : 'bg-gray-300'}`}>
                {info.refundStatus === 'completed' && <Check className="w-3 h-3 text-white" />}
              </div>
            </div>
          </div>

          <div className="text-xs text-[#999999] flex items-start gap-2">
            <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>退款将原路返回至您的支付账户，请留意账户变动</span>
          </div>
        </div>

        {/* Order Info */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[#999999] text-sm">订单编号</span>
            <div className="flex items-center gap-2">
              <span className="text-[#2C2C2C] font-mono">{info.orderId}</span>
              <button onClick={copyOrderId} className="p-1">
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-[#999999]" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-blue-50 rounded-xl p-4">
          <p className="text-blue-600 text-sm">
            温馨提示：拼团失败不影响您再次参与，我们为您推荐了更多热门拼团商品，快去看看吧！
          </p>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E3DB] p-4 space-y-3">
        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/mine/refunds?orderId=${info.orderId}`)}
            className="flex-1 py-3 border border-[#E8E3DB] rounded-xl text-[#666666] font-medium"
          >
            查看退款
          </button>
          <button
            onClick={() => router.push(`/shop/group-buy/${info.groupId}?action=create`)}
            className="flex-1 py-3 bg-gradient-to-r from-[#C41E3A] to-[#E85A6B] rounded-xl text-white font-medium flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            重新开团
          </button>
        </div>
        <button
          onClick={() => router.push('/shop/group-buy')}
          className="w-full py-3 bg-[#FAF8F5] rounded-xl text-[#C41E3A] font-medium flex items-center justify-center gap-2"
        >
          <ShoppingBag className="w-4 h-4" />
          浏览其他拼团
        </button>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="bg-gray-400 h-48" />
      <div className="px-4 -mt-4 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl h-32 animate-pulse" />
        ))}
      </div>
    </div>
  )
}

export default function GroupBuyFailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <GroupBuyFailContent />
    </Suspense>
  )
}
