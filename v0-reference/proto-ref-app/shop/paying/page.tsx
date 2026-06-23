"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Shield, X, RefreshCw, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { payApi, type PaymentStatus } from "@/lib/api"

function PayingPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get("orderId") || ""
  const payMethod = searchParams.get("method") || "wechat"
  const amount = searchParams.get("amount") || "0"
  
  const [status, setStatus] = useState<"loading" | "paying" | "success" | "failed" | "timeout" | "cancelled">("loading")
  const [countdown, setCountdown] = useState(30)
  const [pollCount, setPollCount] = useState(0)
  const [failReason, setFailReason] = useState("")

  const maxPolls = 10
  const pollInterval = 3000

  // 轮询支付状态
  const checkPaymentStatus = useCallback(async () => {
    if (!orderId) return
    
    try {
      const result = await payApi.queryPaymentStatus(orderId)
      
      if (result.status === "paid") {
        setStatus("success")
        setTimeout(() => {
          router.replace(`/shop/pay-success?orderId=${orderId}`)
        }, 1500)
      } else if (result.status === "failed") {
        setStatus("failed")
        setFailReason(result.failReason || "支付失败")
      } else if (result.status === "cancelled") {
        setStatus("cancelled")
      } else if (result.status === "expired") {
        setStatus("timeout")
      }
      
      return result.status
    } catch {
      // 继续轮询
      return "pending"
    }
  }, [orderId, router])

  // 初始化支付
  useEffect(() => {
    if (!orderId) {
      router.replace("/shop/cart")
      return
    }

    const initPayment = async () => {
      try {
        // 调用支付接口
        const payParams = await payApi.jsapiPay(orderId, payMethod)
        
        // 模拟拉起支付（实际项目中根据payMethod调用不同支付SDK）
        if (payMethod === "wechat" && payParams.payUrl) {
          // 微信H5支付跳转
          // window.location.href = payParams.payUrl
        }
        
        setStatus("paying")
      } catch {
        // 使用mock数据继续
        setStatus("paying")
      }
    }

    initPayment()
  }, [orderId, payMethod, router])

  // 轮询支付结果
  useEffect(() => {
    if (status !== "paying") return
    if (pollCount >= maxPolls) {
      setStatus("timeout")
      return
    }

    const timer = setTimeout(async () => {
      const result = await checkPaymentStatus()
      if (result === "pending") {
        setPollCount(prev => prev + 1)
      }
    }, pollInterval)

    return () => clearTimeout(timer)
  }, [status, pollCount, checkPaymentStatus])

  // 倒计时
  useEffect(() => {
    if (status !== "paying") return
    if (countdown <= 0) {
      setStatus("timeout")
      return
    }

    const timer = setInterval(() => {
      setCountdown(prev => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [status, countdown])

  // 取消支付
  const handleCancel = async () => {
    try {
      await payApi.cancelPayment(orderId)
    } catch {
      // ignore
    }
    router.replace(`/shop/orders/${orderId}`)
  }

  // 重新支付
  const handleRetry = () => {
    setStatus("paying")
    setCountdown(30)
    setPollCount(0)
    setFailReason("")
  }

  // 获取支付方式名称
  const getPayMethodName = () => {
    switch (payMethod) {
      case "wechat": return "微信支付"
      case "alipay": return "支付宝"
      case "coins": return "学习币支付"
      default: return "在线支付"
    }
  }

  // 获取支付方式图标颜色
  const getPayMethodColor = () => {
    switch (payMethod) {
      case "wechat": return "#07C160"
      case "alipay": return "#1677FF"
      case "coins": return "#C9A96E"
      default: return "#C41E3A"
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB] px-4 py-3 flex items-center justify-between">
        <button onClick={handleCancel} className="p-1">
          <X className="w-6 h-6 text-[#2C2C2C]" />
        </button>
        <span className="font-medium text-[#2C2C2C]">支付中</span>
        <div className="w-6" />
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* 支付中状态 */}
        {status === "paying" && (
          <>
            {/* Logo呼吸动画 */}
            <div className="relative mb-8">
              <div 
                className="w-24 h-24 rounded-full flex items-center justify-center animate-pulse"
                style={{ backgroundColor: `${getPayMethodColor()}15` }}
              >
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${getPayMethodColor()}25` }}
                >
                  <div 
                    className="w-10 h-10 rounded-full"
                    style={{ backgroundColor: getPayMethodColor() }}
                  />
                </div>
              </div>
              {/* 呼吸光圈 */}
              <div 
                className="absolute inset-0 rounded-full animate-ping opacity-30"
                style={{ backgroundColor: getPayMethodColor() }}
              />
            </div>

            <h2 className="text-xl font-bold text-[#2C2C2C] mb-2">正在支付中...</h2>
            <p className="text-[#666666] mb-2">{getPayMethodName()}</p>
            <p className="text-2xl font-bold text-[#C41E3A] mb-6">¥{amount}</p>

            {/* 倒计时 */}
            <div className="bg-white rounded-xl px-6 py-4 shadow-sm mb-6">
              <div className="flex items-center gap-2 text-[#666666]">
                <AlertCircle className="w-4 h-4" />
                <span>请在 <span className="text-[#C41E3A] font-bold">{countdown}</span> 秒内完成支付</span>
              </div>
            </div>

            {/* 取消支付按钮 */}
            <button
              onClick={handleCancel}
              className="text-[#666666] text-sm underline"
            >
              取消支付
            </button>
          </>
        )}

        {/* 加载中状态 */}
        {status === "loading" && (
          <>
            <div className="w-16 h-16 border-4 border-[#E8E3DB] border-t-[#C41E3A] rounded-full animate-spin mb-6" />
            <p className="text-[#666666]">正在准备支付...</p>
          </>
        )}

        {/* 支付成功状态 */}
        {status === "success" && (
          <>
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-[#2C2C2C] mb-2">支付成功</h2>
            <p className="text-[#666666]">正在跳转...</p>
          </>
        )}

        {/* 支付失败状态 */}
        {status === "failed" && (
          <>
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-6">
              <XCircle className="w-12 h-12 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-[#2C2C2C] mb-2">支付失败</h2>
            <p className="text-[#666666] mb-6">{failReason || "请重新尝试"}</p>
            <div className="flex gap-4">
              <button
                onClick={handleCancel}
                className="px-6 py-2 border border-[#E8E3DB] rounded-full text-[#666666]"
              >
                返回订单
              </button>
              <button
                onClick={handleRetry}
                className="px-6 py-2 bg-[#C41E3A] text-white rounded-full flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                重新支付
              </button>
            </div>
          </>
        )}

        {/* 支付超时状态 */}
        {status === "timeout" && (
          <>
            <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center mb-6">
              <AlertCircle className="w-12 h-12 text-orange-500" />
            </div>
            <h2 className="text-xl font-bold text-[#2C2C2C] mb-2">支付超时</h2>
            <p className="text-[#666666] mb-6">未收到支付结果，请确认支付状态</p>
            <div className="flex gap-4">
              <button
                onClick={() => router.push(`/shop/orders/${orderId}`)}
                className="px-6 py-2 border border-[#E8E3DB] rounded-full text-[#666666]"
              >
                查看订单
              </button>
              <button
                onClick={handleRetry}
                className="px-6 py-2 bg-[#C41E3A] text-white rounded-full flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                重新支付
              </button>
            </div>
          </>
        )}

        {/* 已取消状态 */}
        {status === "cancelled" && (
          <>
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-6">
              <X className="w-12 h-12 text-gray-500" />
            </div>
            <h2 className="text-xl font-bold text-[#2C2C2C] mb-2">支付已取消</h2>
            <p className="text-[#666666] mb-6">您已取消本次支付</p>
            <button
              onClick={() => router.push(`/shop/orders/${orderId}`)}
              className="px-6 py-2 bg-[#C41E3A] text-white rounded-full"
            >
              查看订单
            </button>
          </>
        )}
      </div>

      {/* 底部安全提示 */}
      <div className="pb-8 px-6">
        <div className="flex items-center justify-center gap-2 text-[#999999] text-sm">
          <Shield className="w-4 h-4" />
          <span>支付环境安全 · 资金加密保护</span>
        </div>
        <div className="mt-2 text-center text-xs text-[#999999]">
          热卜国学 提供安全支付保障
        </div>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center">
      <div className="w-16 h-16 border-4 border-[#E8E3DB] border-t-[#C41E3A] rounded-full animate-spin mb-6" />
      <p className="text-[#666666]">正在准备支付...</p>
    </div>
  )
}

export default function PayingPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PayingPageContent />
    </Suspense>
  )
}
