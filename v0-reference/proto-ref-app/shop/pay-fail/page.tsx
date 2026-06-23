"use client"

import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { X, RefreshCw, CreditCard, FileText, AlertCircle, Clock, Ban, Wallet } from "lucide-react"

// 失败原因映射
const failReasons: Record<string, { title: string; desc: string; icon: React.ReactNode }> = {
  insufficient_balance: {
    title: "余额不足",
    desc: "您的账户余额不足以完成本次支付",
    icon: <Wallet className="w-6 h-6" />,
  },
  timeout: {
    title: "支付超时",
    desc: "支付时间已超过限制，请重新发起支付",
    icon: <Clock className="w-6 h-6" />,
  },
  cancelled: {
    title: "支付已取消",
    desc: "您已取消本次支付",
    icon: <Ban className="w-6 h-6" />,
  },
  network_error: {
    title: "网络异常",
    desc: "网络连接出现问题，请检查网络后重试",
    icon: <AlertCircle className="w-6 h-6" />,
  },
  default: {
    title: "支付失败",
    desc: "支付过程中出现问题，请稍后重试",
    icon: <AlertCircle className="w-6 h-6" />,
  },
}

function PayFailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get("orderId") || ""
  const reason = searchParams.get("reason") || "default"
  const amount = searchParams.get("amount") || "0"

  const failInfo = failReasons[reason] || failReasons.default

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 红色顶部背景 */}
      <div className="bg-gradient-to-b from-[#C41E3A] to-[#E8534A] pt-16 pb-24 px-4 relative overflow-hidden">
        {/* 装饰圆环 */}
        <div className="absolute top-10 right-10 w-32 h-32 border border-white/10 rounded-full" />
        <div className="absolute top-20 right-20 w-20 h-20 border border-white/10 rounded-full" />
        
        {/* 失败图标 */}
        <div className="flex flex-col items-center">
          <div className="relative">
            {/* 外圈动画 */}
            <div className="absolute inset-0 w-24 h-24 rounded-full bg-white/20 animate-ping" style={{ animationDuration: "2s" }} />
            {/* 主图标 */}
            <div 
              className="relative w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg"
              style={{ animation: "shake 0.5s ease-in-out" }}
            >
              <X className="w-12 h-12 text-[#C41E3A]" strokeWidth={3} />
            </div>
          </div>
          
          {/* 失败标题 */}
          <h1 className="mt-6 text-2xl font-bold text-white">{failInfo.title}</h1>
          
          {/* 金额 */}
          <div className="mt-2 text-white/90">
            <span className="text-sm">¥</span>
            <span className="text-3xl font-bold ml-1">{parseFloat(amount).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* 失败原因卡片 */}
      <div className="px-4 -mt-12 relative z-10">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          {/* 原因图标 */}
          <div className="flex items-center gap-3 pb-4 border-b border-[#E8E3DB]">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-[#C41E3A]">
              {failInfo.icon}
            </div>
            <div>
              <div className="font-medium text-[#2C2C2C]">{failInfo.title}</div>
              <div className="text-sm text-[#999999] mt-0.5">{failInfo.desc}</div>
            </div>
          </div>

          {/* 订单信息 */}
          <div className="mt-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[#999999]">订单编号</span>
              <span className="text-[#2C2C2C] font-mono">{orderId || "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#999999]">失败时间</span>
              <span className="text-[#2C2C2C]">{new Date().toLocaleString("zh-CN")}</span>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="mt-6 space-y-3">
            <button
              onClick={() => router.push(`/shop/paying?orderId=${orderId}`)}
              className="w-full py-3.5 bg-gradient-to-r from-[#C41E3A] to-[#E8534A] text-white rounded-xl font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              <RefreshCw className="w-5 h-5" />
              重新支付
            </button>
            
            <button
              onClick={() => router.push(`/shop/checkout?orderId=${orderId}`)}
              className="w-full py-3.5 bg-[#FAF8F5] text-[#2C2C2C] rounded-xl font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              <CreditCard className="w-5 h-5" />
              换个方式支付
            </button>
            
            <button
              onClick={() => router.push(`/orders/${orderId}`)}
              className="w-full py-3.5 text-[#666666] rounded-xl font-medium flex items-center justify-center gap-2"
            >
              <FileText className="w-5 h-5" />
              查看订单详情
            </button>
          </div>
        </div>
      </div>

      {/* 温馨提示 */}
      <div className="px-4 mt-6">
        <div className="bg-orange-50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-orange-700">
              <div className="font-medium mb-1">温馨提示</div>
              <ul className="space-y-1 text-orange-600">
                <li>• 请检查支付账户余额是否充足</li>
                <li>• 确保网络连接稳定后重试</li>
                <li>• 如多次失败，请尝试其他支付方式</li>
                <li>• 订单将保留30分钟，请尽快完成支付</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 底部返回首页 */}
      <div className="px-4 py-8 text-center">
        <button
          onClick={() => router.push("/shop")}
          className="text-[#999999] text-sm"
        >
          返回商城首页
        </button>
      </div>

      {/* 抖动动画 */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#C41E3A] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function PayFailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PayFailContent />
    </Suspense>
  )
}
