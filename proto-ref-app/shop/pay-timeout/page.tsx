"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { Clock, Wifi, CreditCard, Smartphone, RefreshCw, ArrowLeftRight, FileText, ChevronLeft, AlertCircle } from "lucide-react"

const timeoutReasons = [
  { icon: Wifi, text: "网络连接不稳定，请检查网络后重试" },
  { icon: CreditCard, text: "银行卡单笔/单日限额，请尝试换卡支付" },
  { icon: Smartphone, text: "支付App未响应，请确保支付App正常运行" },
]

function PayTimeoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get("orderId") || "ORD20241201123456"
  const amount = searchParams.get("amount") || "344.00"

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-[#E8E3DB] px-4 py-3 flex items-center">
        <button onClick={() => router.back()} className="p-1 -ml-1">
          <ChevronLeft className="w-6 h-6 text-[#2C2C2C]" />
        </button>
        <span className="ml-2 text-lg font-medium text-[#2C2C2C]">支付结果</span>
      </div>

      {/* 橙色渐变背景 */}
      <div className="bg-gradient-to-b from-orange-400 to-orange-500 pt-12 pb-20 px-4">
        <div className="flex flex-col items-center">
          {/* 时钟图标动画 */}
          <div className="relative mb-6">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
              <Clock className="w-10 h-10 text-orange-500 animate-pulse" />
            </div>
            {/* 旋转光圈 */}
            <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-white/50 rounded-full animate-spin" style={{ animationDuration: '2s' }} />
          </div>
          
          {/* 超时文字 */}
          <h1 className="text-2xl font-bold text-white mb-2">支付超时</h1>
          <p className="text-white/90 text-sm mb-4">订单已超时，请重新发起支付</p>
          
          {/* 金额 */}
          <div className="text-white/80 text-sm">
            订单金额
            <span className="text-3xl font-bold text-white ml-2">¥{amount}</span>
          </div>
        </div>
      </div>

      {/* 内容区域 - 上移覆盖部分背景 */}
      <div className="px-4 -mt-12 pb-32 space-y-4">
        {/* 可能原因卡片 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            <span className="font-medium text-[#2C2C2C]">可能的原因</span>
          </div>
          
          <div className="space-y-3">
            {timeoutReasons.map((reason, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-orange-50 rounded-xl">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <reason.icon className="w-4 h-4 text-orange-600" />
                </div>
                <p className="text-sm text-[#666666] leading-relaxed pt-1">{reason.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 订单信息卡片 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-medium text-[#2C2C2C] mb-3">订单信息</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-[#999999]">订单编号</span>
              <span className="text-sm text-[#2C2C2C] font-mono">{orderId}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-[#E8E3DB]">
              <span className="text-sm text-[#999999]">超时时间</span>
              <span className="text-sm text-[#666666]">{new Date().toLocaleString('zh-CN')}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-[#E8E3DB]">
              <span className="text-sm text-[#999999]">订单状态</span>
              <span className="text-sm text-orange-500 font-medium">待支付</span>
            </div>
          </div>
        </div>

        {/* 温馨提示 */}
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <div className="text-sm text-blue-700 leading-relaxed">
              <p className="font-medium mb-1">温馨提示</p>
              <p>如您已完成支付但显示超时，资金会在1-3个工作日内原路退回。如有疑问请联系客服。</p>
            </div>
          </div>
        </div>
      </div>

      {/* 底部固定按钮 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E3DB] p-4 space-y-3">
        <button
          onClick={() => router.push(`/shop/paying?orderId=${orderId}`)}
          className="w-full py-3 bg-gradient-to-r from-[#C41E3A] to-[#E53935] text-white font-medium rounded-xl flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-5 h-5" />
          重新支付
        </button>
        
        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/shop/checkout?orderId=${orderId}`)}
            className="flex-1 py-3 border border-[#E8E3DB] text-[#666666] font-medium rounded-xl flex items-center justify-center gap-2"
          >
            <ArrowLeftRight className="w-4 h-4" />
            换个支付方式
          </button>
          <button
            onClick={() => router.push(`/shop/orders/${orderId}`)}
            className="flex-1 py-3 border border-[#E8E3DB] text-[#666666] font-medium rounded-xl flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4" />
            查看订单
          </button>
        </div>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function PayTimeoutPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PayTimeoutContent />
    </Suspense>
  )
}
