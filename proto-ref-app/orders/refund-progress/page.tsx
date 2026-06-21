"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, Check, Clock, AlertCircle, MessageCircle, Shield, Copy, Phone, ArrowRight, Wallet } from "lucide-react"
import { shopApi, type AfterSaleDetail } from "@/lib/api"

const mockRefund: AfterSaleDetail = {
  id: "1",
  orderId: "order1",
  orderNo: "GX20240115001",
  type: "refund_only",
  status: "refunding",
  reason: "不想要了",
  amount: 168,
  description: "商品包装完好，未拆封",
  product: {
    id: "p1",
    name: "周易六十四卦详解（精装典藏版）",
    cover: "/placeholder.svg",
    skuName: "精装版",
    price: 168,
    quantity: 1,
  },
  timeline: [
    { status: "submitted", title: "申请提交", description: "您已提交退款申请", time: "2024-01-15 10:30", isCurrent: false },
    { status: "merchant_review", title: "商家审核", description: "商家已同意退款", time: "2024-01-15 14:20", isCurrent: false },
    { status: "platform_review", title: "平台审核", description: "平台审核通过", time: "2024-01-15 15:00", isCurrent: false },
    { status: "refunding", title: "退款处理", description: "正在处理退款...", time: "2024-01-15 15:30", isCurrent: true },
    { status: "completed", title: "退款到账", description: "预计1-3个工作日到账", time: "", isCurrent: false },
  ],
  createdAt: "2024-01-15 10:30",
  canCancel: false,
}

const statusConfig: Record<string, { color: string; bgColor: string; icon: typeof Check }> = {
  completed: { color: "text-green-600", bgColor: "bg-green-100", icon: Check },
  refunding: { color: "text-orange-600", bgColor: "bg-orange-100", icon: Clock },
  approved: { color: "text-blue-600", bgColor: "bg-blue-100", icon: Check },
  pending: { color: "text-gray-400", bgColor: "bg-gray-100", icon: Clock },
}

function RefundProgressContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [refund, setRefund] = useState<AfterSaleDetail | null>(null)
  const [copied, setCopied] = useState(false)
  const [expandedNode, setExpandedNode] = useState<number | null>(null)

  const id = searchParams.get('id')

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (id) {
          const data = await shopApi.afterSaleDetail(id)
          setRefund(data)
        }
      } catch {
        setRefund(mockRefund)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getNodeStatus = (index: number) => {
    if (!refund) return "pending"
    const currentIndex = refund.timeline.findIndex(t => t.isCurrent)
    if (currentIndex === -1) {
      return refund.status === "completed" ? "completed" : "pending"
    }
    if (index < currentIndex) return "completed"
    if (index === currentIndex) return "refunding"
    return "pending"
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

  if (!refund) return null

  const refundMethod = "微信支付"
  const estimatedDate = "2024年1月18日"

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-24">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB] px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1 -ml-1">
          <ChevronLeft className="w-6 h-6 text-[#2C2C2C]" />
        </button>
        <h1 className="text-lg font-semibold text-[#2C2C2C] font-serif">退款进度</h1>
      </div>

      {/* 退款金额卡片 */}
      <div className="m-4 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="w-5 h-5" />
          <span className="text-sm opacity-90">退款金额</span>
        </div>
        <div className="text-4xl font-bold mb-3">
          ¥{refund.amount.toFixed(2)}
        </div>
        <div className="flex items-center gap-2 text-sm opacity-90">
          <span>退款方式：原路退回至{refundMethod}</span>
        </div>
        {refund.status === "refunding" && (
          <div className="mt-3 bg-white/20 rounded-lg px-3 py-2 text-sm">
            <Clock className="w-4 h-4 inline mr-1" />
            预计 {estimatedDate} 前到账
          </div>
        )}
        {refund.status === "completed" && (
          <div className="mt-3 bg-white/20 rounded-lg px-3 py-2 text-sm">
            <Check className="w-4 h-4 inline mr-1" />
            退款已到账
          </div>
        )}
      </div>

      {/* 进度时间轴 */}
      <div className="mx-4 bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="font-semibold text-[#2C2C2C] mb-4 font-serif">退款进度</h3>
        <div className="relative">
          {refund.timeline.map((node, index) => {
            const nodeStatus = getNodeStatus(index)
            const isCompleted = nodeStatus === "completed"
            const isCurrent = nodeStatus === "refunding"
            const isPending = nodeStatus === "pending"
            const isExpanded = expandedNode === index
            const isLast = index === refund.timeline.length - 1

            return (
              <div key={index} className="relative pl-8 pb-6 last:pb-0">
                {/* 连接线 */}
                {!isLast && (
                  <div 
                    className={`absolute left-[11px] top-6 w-0.5 h-full ${
                      isCompleted ? "bg-green-500" : "bg-gray-200"
                    }`}
                  />
                )}

                {/* 节点图标 */}
                <div 
                  className={`absolute left-0 top-0 w-6 h-6 rounded-full flex items-center justify-center ${
                    isCompleted 
                      ? "bg-green-500 text-white" 
                      : isCurrent 
                        ? "bg-orange-500 text-white animate-pulse" 
                        : "bg-gray-200 text-gray-400"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : isCurrent ? (
                    <Clock className="w-4 h-4" />
                  ) : (
                    <div className="w-2 h-2 bg-gray-400 rounded-full" />
                  )}
                </div>

                {/* 内容 */}
                <button 
                  onClick={() => setExpandedNode(isExpanded ? null : index)}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${
                      isCompleted || isCurrent ? "text-[#2C2C2C]" : "text-gray-400"
                    }`}>
                      {node.title}
                    </span>
                    {node.time && (
                      <span className="text-xs text-[#999999]">{node.time}</span>
                    )}
                  </div>
                  <p className={`text-sm mt-1 ${
                    isCompleted || isCurrent ? "text-[#666666]" : "text-gray-400"
                  }`}>
                    {node.description}
                  </p>

                  {/* 展开详情 */}
                  {isExpanded && (isCompleted || isCurrent) && (
                    <div className="mt-2 p-3 bg-[#FAF8F5] rounded-lg text-sm text-[#666666]">
                      {index === 0 && "您的退款申请已成功提交，等待商家处理"}
                      {index === 1 && "商家已审核通过，退款申请已转至平台"}
                      {index === 2 && "平台已审核通过，退款正在处理中"}
                      {index === 3 && "退款正在处理中，请耐心等待"}
                      {index === 4 && (
                        <div>
                          <p>退款金额将在1-3个工作日内退回原支付账户</p>
                          <p className="mt-1 text-orange-600">如超过3个工作日未到账，请联系客服</p>
                        </div>
                      )}
                    </div>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* 退款信息 */}
      <div className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="font-semibold text-[#2C2C2C] mb-3 font-serif">退款信息</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-[#999999]">退款单号</span>
            <div className="flex items-center gap-2">
              <span className="text-[#2C2C2C]">{refund.id}</span>
              <button onClick={() => handleCopy(refund.id)} className="text-[#C41E3A]">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex justify-between">
            <span className="text-[#999999]">关联订单</span>
            <button 
              onClick={() => router.push(`/orders/${refund.orderId}`)}
              className="text-[#C41E3A] flex items-center gap-1"
            >
              {refund.orderNo}
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex justify-between">
            <span className="text-[#999999]">退款类型</span>
            <span className="text-[#2C2C2C]">
              {refund.type === "refund_only" ? "仅退款" : "退货退款"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#999999]">退款原因</span>
            <span className="text-[#2C2C2C]">{refund.reason}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#999999]">申请时间</span>
            <span className="text-[#2C2C2C]">{refund.createdAt}</span>
          </div>
        </div>
      </div>

      {/* 商品信息 */}
      <div className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="font-semibold text-[#2C2C2C] mb-3 font-serif">退款商品</h3>
        <div className="flex gap-3">
          <img 
            src={refund.product.cover} 
            alt={refund.product.name}
            className="w-16 h-16 rounded-lg object-cover bg-gray-100"
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm text-[#2C2C2C] line-clamp-2">{refund.product.name}</h4>
            <p className="text-xs text-[#999999] mt-1">{refund.product.skuName}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[#C41E3A] font-medium">¥{refund.product.price}</span>
              <span className="text-xs text-[#999999]">×{refund.product.quantity}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 温馨提示 */}
      <div className="mx-4 mt-4 bg-orange-50 border border-orange-200 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-orange-700">
            <p className="font-medium mb-1">温馨提示</p>
            <ul className="list-disc list-inside space-y-1 text-orange-600">
              <li>退款将在1-3个工作日内原路退回</li>
              <li>银行卡退款可能延迟，具体以银行到账时间为准</li>
              <li>如有疑问，请联系在线客服</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 底部操作 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E3DB] p-4 flex gap-3">
        <button
          onClick={() => router.push('/customer-service')}
          className="flex-1 flex items-center justify-center gap-2 py-3 border border-[#E8E3DB] rounded-xl text-[#2C2C2C]"
        >
          <MessageCircle className="w-5 h-5" />
          联系客服
        </button>
        <button
          onClick={() => router.push(`/orders/dispute?orderId=${refund.orderId}`)}
          className="flex-1 flex items-center justify-center gap-2 py-3 border border-[#E8E3DB] rounded-xl text-[#2C2C2C]"
        >
          <Shield className="w-5 h-5" />
          我要申诉
        </button>
      </div>
    </div>
  )
}

function LoadingFallback() {
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

export default function RefundProgressPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <RefundProgressContent />
    </Suspense>
  )
}
