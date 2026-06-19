"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle, Copy, ShoppingBag, Home, Gift, ChevronRight } from "lucide-react"

function PaySuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get("orderId") || ""
  
  const [orderInfo, setOrderInfo] = useState<{
    orderId: string
    amount: number
    payMethod: string
    paidAt: string
    itemCount: number
  } | null>(null)
  const [copied, setCopied] = useState(false)
  const [showAnimation, setShowAnimation] = useState(false)
  
  useEffect(() => {
    // 触发成功动画
    setTimeout(() => setShowAnimation(true), 100)
    
    // Mock订单信息
    setOrderInfo({
      orderId: orderId || "202401150001",
      amount: 344,
      payMethod: "微信支付",
      paidAt: new Date().toLocaleString("zh-CN"),
      itemCount: 2,
    })
  }, [orderId])
  
  const handleCopy = async () => {
    if (orderInfo) {
      try {
        await navigator.clipboard.writeText(orderInfo.orderId)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        // fallback
      }
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#4CAF50] to-[#45a049]">
      {/* 成功动画区域 */}
      <div className="pt-16 pb-8 flex flex-col items-center">
        {/* 对勾动画 */}
        <div className={`relative w-24 h-24 mb-6 transition-all duration-500 ${showAnimation ? "scale-100 opacity-100" : "scale-50 opacity-0"}`}>
          <div className="absolute inset-0 bg-white rounded-full shadow-lg" />
          <div className={`absolute inset-0 flex items-center justify-center transition-all duration-700 delay-300 ${showAnimation ? "scale-100" : "scale-0"}`}>
            <CheckCircle className="w-16 h-16 text-[#4CAF50]" strokeWidth={2.5} />
          </div>
          {/* 光圈动画 */}
          <div className={`absolute inset-0 rounded-full border-4 border-white/30 transition-all duration-1000 ${showAnimation ? "scale-150 opacity-0" : "scale-100 opacity-100"}`} />
        </div>
        
        <h1 className={`text-2xl font-bold text-white mb-2 transition-all duration-500 delay-200 ${showAnimation ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
          支付成功
        </h1>
        
        {orderInfo && (
          <div className={`text-center transition-all duration-500 delay-300 ${showAnimation ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
            <div className="text-4xl font-bold text-white mb-1">
              ¥{orderInfo.amount.toFixed(2)}
            </div>
            <div className="text-white/80 text-sm">
              {orderInfo.payMethod} · {orderInfo.itemCount}件商品
            </div>
          </div>
        )}
      </div>
      
      {/* 白色卡片区域 */}
      <div className="bg-[#FAF8F5] rounded-t-3xl min-h-[60vh] p-4">
        {/* 订单信息卡片 */}
        <div className={`bg-white rounded-2xl p-4 shadow-sm mb-4 transition-all duration-500 delay-400 ${showAnimation ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
          <div className="flex items-center justify-between py-3 border-b border-[#E8E3DB]">
            <span className="text-[#666666]">订单编号</span>
            <div className="flex items-center gap-2">
              <span className="text-[#2C2C2C] font-medium">{orderInfo?.orderId}</span>
              <button 
                onClick={handleCopy}
                className="text-[#C41E3A] text-sm flex items-center gap-1"
              >
                <Copy className="w-4 h-4" />
                {copied ? "已复制" : "复制"}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-[#E8E3DB]">
            <span className="text-[#666666]">支付方式</span>
            <span className="text-[#2C2C2C]">{orderInfo?.payMethod}</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-[#666666]">支付时间</span>
            <span className="text-[#2C2C2C]">{orderInfo?.paidAt}</span>
          </div>
        </div>
        
        {/* 操作按钮 */}
        <div className={`space-y-3 mb-6 transition-all duration-500 delay-500 ${showAnimation ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
          <button
            onClick={() => router.push(`/shop/orders/${orderInfo?.orderId}`)}
            className="w-full py-4 bg-[#C41E3A] text-white rounded-xl font-medium flex items-center justify-center gap-2 active:bg-[#a01830]"
          >
            <ShoppingBag className="w-5 h-5" />
            查看订单
          </button>
          <button
            onClick={() => router.push("/")}
            className="w-full py-4 bg-white border border-[#E8E3DB] text-[#2C2C2C] rounded-xl font-medium flex items-center justify-center gap-2 active:bg-gray-50"
          >
            <Home className="w-5 h-5" />
            返回首页
          </button>
        </div>
        
        {/* 推荐入口 */}
        <div className={`transition-all duration-500 delay-600 ${showAnimation ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
          <h3 className="text-[#666666] text-sm mb-3">猜你喜欢</h3>
          <div className="bg-white rounded-2xl overflow-hidden">
            <button 
              onClick={() => router.push("/shop")}
              className="w-full p-4 flex items-center gap-3 active:bg-gray-50"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-[#C41E3A] to-[#e85a6b] rounded-xl flex items-center justify-center">
                <Gift className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-[#2C2C2C] font-medium">更多好物</div>
                <div className="text-[#999999] text-sm">发现更多国学精品</div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#999999]" />
            </button>
          </div>
        </div>
        
        {/* 底部提示 */}
        <div className="mt-8 text-center text-[#999999] text-xs">
          <p>如有问题请联系客服</p>
          <p className="mt-1">感谢您的支持，祝您学习愉快！</p>
        </div>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#4CAF50] to-[#45a049] flex items-center justify-center">
      <div className="w-16 h-16 bg-white rounded-full animate-pulse" />
    </div>
  )
}

export default function PaySuccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PaySuccessContent />
    </Suspense>
  )
}
