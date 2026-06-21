"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle2, Copy, Check, Share2, Gift, Package, ChevronRight } from "lucide-react"

interface GroupBuyResult {
  id: string
  productName: string
  productCover: string
  price: number
  originalPrice: number
  members: { id: string; name: string; avatar: string }[]
  completedAt: string
  orderId: string
  estimatedShipDate: string
}

const mockResult: GroupBuyResult = {
  id: "1",
  productName: "周易六十四卦详解（精装典藏版）",
  productCover: "/placeholder.svg",
  price: 128,
  originalPrice: 298,
  members: [
    { id: "1", name: "张三", avatar: "/placeholder.svg" },
    { id: "2", name: "李四", avatar: "/placeholder.svg" },
    { id: "3", name: "王五", avatar: "/placeholder.svg" },
  ],
  completedAt: "2024-01-15 14:30:00",
  orderId: "GB202401150001",
  estimatedShipDate: "2024-01-17",
}

function GroupBuySuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [copied, setCopied] = useState(false)
  const [result, setResult] = useState<GroupBuyResult | null>(null)
  const [showAnimation, setShowAnimation] = useState(false)

  const groupId = searchParams.get('id')

  useEffect(() => {
    setResult(mockResult)
    setTimeout(() => setShowAnimation(true), 100)
  }, [groupId])

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '拼团成功！',
          text: `我刚刚以${result?.price}元拼到了「${result?.productName}」，快来一起拼团吧！`,
          url: window.location.href,
        })
      } catch {
        // User cancelled
      }
    }
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#C41E3A] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Success Header */}
      <div className="bg-gradient-to-br from-green-500 to-green-600 pt-12 pb-24 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-32 h-32 border border-white/20 rounded-full"
              style={{
                left: `${20 + i * 15}%`,
                top: `${10 + (i % 3) * 30}%`,
                transform: `scale(${0.5 + i * 0.2})`,
              }}
            />
          ))}
        </div>
        
        <div className={`relative transition-all duration-700 ${showAnimation ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Success Icon */}
          <div className="w-20 h-20 bg-white rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg relative">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <div className={`absolute inset-0 rounded-full border-4 border-white/50 ${showAnimation ? 'animate-ping' : ''}`} style={{ animationDuration: '1.5s', animationIterationCount: '2' }} />
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-2">拼团成功</h1>
          <p className="text-white/80 text-sm">恭喜您，已成功拼团！</p>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 -mt-16 pb-32 space-y-4">
        {/* Product Card */}
        <div className={`bg-white rounded-2xl shadow-sm overflow-hidden transition-all duration-500 delay-200 ${showAnimation ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="p-4">
            <div className="flex gap-3">
              <img src={result.productCover} alt="" className="w-20 h-20 rounded-xl object-cover" />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-[#2C2C2C] line-clamp-2 mb-2">{result.productName}</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-[#C41E3A] font-bold text-lg">¥{result.price}</span>
                  <span className="text-[#999999] text-sm line-through">¥{result.originalPrice}</span>
                  <span className="bg-orange-100 text-orange-600 text-xs px-1.5 py-0.5 rounded">
                    省¥{result.originalPrice - result.price}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Members */}
          <div className="border-t border-[#E8E3DB] px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#666666]">成团成员</span>
              <div className="flex items-center gap-1">
                <div className="flex -space-x-2">
                  {result.members.map((member) => (
                    <img
                      key={member.id}
                      src={member.avatar}
                      alt={member.name}
                      className="w-7 h-7 rounded-full border-2 border-white"
                    />
                  ))}
                </div>
                <span className="text-sm text-[#666666] ml-2">共{result.members.length}人</span>
              </div>
            </div>
          </div>
          
          {/* Time Info */}
          <div className="border-t border-[#E8E3DB] px-4 py-3 bg-gray-50/50">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[#999999]">成团时间</span>
              <span className="text-[#666666]">{result.completedAt}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#999999]">订单编号</span>
              <div className="flex items-center gap-1">
                <span className="text-[#666666]">{result.orderId}</span>
                <button onClick={() => handleCopy(result.orderId)} className="text-[#C41E3A]">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Shipping Info */}
        <div className={`bg-white rounded-2xl p-4 transition-all duration-500 delay-300 ${showAnimation ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-[#2C2C2C]">预计发货时间</p>
              <p className="text-sm text-[#666666]">{result.estimatedShipDate}（工作日）</p>
            </div>
          </div>
        </div>

        {/* Share for Coupon */}
        <div className={`bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-4 transition-all duration-500 delay-400 ${showAnimation ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-white">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium">分享得优惠券</p>
                <p className="text-sm text-white/80">邀请好友拼团，获10元优惠券</p>
              </div>
            </div>
            <button
              onClick={handleShare}
              className="bg-white text-orange-500 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1"
            >
              <Share2 className="w-4 h-4" />
              分享
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className={`space-y-3 transition-all duration-500 delay-500 ${showAnimation ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <button
            onClick={() => router.push(`/orders/${result.orderId}`)}
            className="w-full bg-[#C41E3A] text-white py-3.5 rounded-xl font-medium flex items-center justify-center gap-2"
          >
            查看订单
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => router.push('/shop')}
            className="w-full bg-white border border-[#E8E3DB] text-[#666666] py-3.5 rounded-xl font-medium"
          >
            继续逛逛
          </button>
        </div>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="bg-gradient-to-br from-green-500 to-green-600 pt-12 pb-24 px-4" />
      <div className="px-4 -mt-16 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl h-32 animate-pulse" />
        ))}
      </div>
    </div>
  )
}

export default function GroupBuySuccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <GroupBuySuccessContent />
    </Suspense>
  )
}
