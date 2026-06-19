"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { BackButton } from "@/components/common/back-button"
import { 
  Clock, Truck, CheckCircle, XCircle, Package, 
  MapPin, Copy, ChevronRight, Phone, RefreshCw,
  CreditCard, MessageCircle, ShoppingBag, Star, Undo2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { shopApi, type OrderDetail as OrderDetailType } from "@/lib/api"

const mockOrder: OrderDetailType = {
  id: "1",
  orderNo: "GX202401150001",
  status: "pending_receive",
  totalAmount: 344,
  payAmount: 294,
  createdAt: "2024-01-15 14:30:00",
  paidAt: "2024-01-15 14:32:15",
  shippedAt: "2024-01-16 09:00:00",
  products: [
    { id: "1", name: "《渊海子平》精装典藏版", cover: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&q=80", skuName: "精装版", price: 168, quantity: 1 },
    { id: "2", name: "紫微斗数入门教程", cover: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=200&q=80", skuName: "平装版", price: 88, quantity: 2 },
  ],
  canCancel: false,
  canConfirm: true,
  canReview: false,
  hasAfterSale: false,
  address: {
    id: "1",
    name: "张三",
    phone: "138****8888",
    province: "北京市",
    city: "北京市",
    district: "朝阳区",
    address: "建国路88号SOHO现代城A座1201",
    isDefault: true,
  },
  payMethod: "微信支付",
  logistics: {
    company: "顺丰速运",
    trackingNo: "SF1234567890",
    status: "派送中",
    timeline: [
      { time: "01-17 08:30", content: "快递员正在派送中，预计12:00前送达" },
      { time: "01-17 06:15", content: "快件已到达【北京朝阳营业点】" },
      { time: "01-16 18:20", content: "快件在【北京转运中心】已装车，准备发往【北京朝阳营业点】" },
      { time: "01-16 09:00", content: "商家已发货，快递员已揽件" },
    ]
  },
  coupon: { name: "新人专享券", discount: 50 },
  remark: "请放门口快递柜",
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string; text: string; step: number }> = {
  pending_pay: { icon: Clock, color: "text-[#C41E3A]", bgColor: "bg-[#C41E3A]/10", text: "待付款", step: 1 },
  pending_ship: { icon: Package, color: "text-[#F59E0B]", bgColor: "bg-[#F59E0B]/10", text: "待发货", step: 2 },
  pending_receive: { icon: Truck, color: "text-[#3B82F6]", bgColor: "bg-[#3B82F6]/10", text: "待收货", step: 3 },
  completed: { icon: CheckCircle, color: "text-[#10B981]", bgColor: "bg-[#10B981]/10", text: "已完成", step: 4 },
  cancelled: { icon: XCircle, color: "text-[#6B7280]", bgColor: "bg-[#6B7280]/10", text: "已取消", step: 0 },
  after_sale: { icon: RefreshCw, color: "text-[#F59E0B]", bgColor: "bg-[#F59E0B]/10", text: "售后中", step: 3 },
}

const steps = [
  { key: "created", label: "提交订单" },
  { key: "paid", label: "付款成功" },
  { key: "shipped", label: "商家发货" },
  { key: "completed", label: "交易完成" },
]

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<OrderDetailType | null>(null)
  const [copied, setCopied] = useState(false)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const data = await shopApi.orderDetail(params.id as string)
        setOrder(data)
      } catch {
        setOrder(mockOrder)
      } finally {
        setLoading(false)
      }
    }
    fetchOrder()
  }, [params.id])

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleConfirmReceive = async () => {
    if (!order) return
    setConfirming(true)
    try {
      await shopApi.confirmReceive(order.id)
      setOrder({ ...order, status: "completed", canConfirm: false, canReview: true })
    } catch {
      // Error handling
    } finally {
      setConfirming(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <header className="sticky top-0 z-40 bg-white border-b border-[#E8E3DB]">
          <div className="flex items-center justify-between px-4 h-14">
            <BackButton fallbackPath="/orders" />
            <h1 className="font-medium text-[#2C2C2C]">订单详情</h1>
            <div className="w-9" />
          </div>
        </header>
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-2xl h-32 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!order) return null

  const status = statusConfig[order.status] || statusConfig.pending_pay
  const StatusIcon = status.icon
  const currentStep = status.step

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#E8E3DB]">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton fallbackPath="/orders" />
          <h1 className="font-medium text-[#2C2C2C]">订单详情</h1>
          <button onClick={() => router.push("/customer-service")} className="p-1">
            <MessageCircle className="w-5 h-5 text-[#666666]" />
          </button>
        </div>
      </header>

      {/* Status Card */}
      <div className={cn("px-4 py-6", status.bgColor)}>
        <div className="flex items-center gap-4">
          <div className={cn("w-14 h-14 rounded-full flex items-center justify-center", status.bgColor)}>
            <StatusIcon className={cn("w-8 h-8", status.color)} />
          </div>
          <div>
            <h2 className={cn("text-xl font-bold", status.color)}>{status.text}</h2>
            {order.status === "pending_pay" && (
              <p className="text-sm text-[#666666] mt-1">请在30分钟内完成支付</p>
            )}
            {order.status === "pending_receive" && order.logistics && (
              <p className="text-sm text-[#666666] mt-1">{order.logistics.status}</p>
            )}
          </div>
        </div>

        {/* Progress Steps */}
        {order.status !== "cancelled" && (
          <div className="flex items-center justify-between mt-6">
            {steps.map((step, index) => (
              <div key={step.key} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                    index < currentStep ? "bg-[#C41E3A] text-white" : "bg-[#E8E3DB] text-[#999999]"
                  )}>
                    {index < currentStep ? <CheckCircle className="w-4 h-4" /> : index + 1}
                  </div>
                  <span className={cn(
                    "text-xs mt-1",
                    index < currentStep ? "text-[#2C2C2C]" : "text-[#999999]"
                  )}>{step.label}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={cn(
                    "w-10 h-0.5 mx-1",
                    index < currentStep - 1 ? "bg-[#C41E3A]" : "bg-[#E8E3DB]"
                  )} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Logistics Info */}
      {order.logistics && order.status !== "pending_pay" && order.status !== "cancelled" && (
        <Card className="mx-4 mt-4 p-4 border-0 shadow-sm">
          <button
            onClick={() => router.push(`/orders/logistics?orderId=${order.id}`)}
            className="flex items-start gap-3 w-full"
          >
            <div className="w-10 h-10 rounded-full bg-[#3B82F6]/10 flex items-center justify-center flex-shrink-0">
              <Truck className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[#2C2C2C]">{order.logistics.company}</span>
                <span className="text-xs text-[#999999]">{order.logistics.trackingNo}</span>
              </div>
              {/* 最新物流信息 */}
              {(order.logistics as any).timeline?.[0] && (
                <div className="mt-2">
                  <p className="text-sm text-[#2C2C2C]">{(order.logistics as any).timeline[0].content}</p>
                  <p className="text-xs text-[#999999] mt-1">{(order.logistics as any).timeline[0].time}</p>
                </div>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-[#CCCCCC] mt-2" />
          </button>
        </Card>
      )}

      {/* Address */}
      <Card className="mx-4 mt-4 p-4 border-0 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[#C41E3A]/10 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5 text-[#C41E3A]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-[#2C2C2C]">{order.address.name}</span>
              <span className="text-[#666666]">{order.address.phone}</span>
            </div>
            <p className="text-sm text-[#666666] mt-1">
              {order.address.province}{order.address.city}{order.address.district}{order.address.address}
            </p>
          </div>
          <a href={`tel:${order.address.phone}`} className="p-2 rounded-full bg-[#FAF8F5]">
            <Phone className="w-4 h-4 text-[#666666]" />
          </a>
        </div>
      </Card>

      {/* Products */}
      <Card className="mx-4 mt-4 border-0 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E8E3DB]">
          <h3 className="font-medium text-sm text-[#2C2C2C]">商品清单</h3>
        </div>
        <div className="divide-y divide-[#E8E3DB]">
          {order.products.map(product => (
            <Link key={product.id} href={`/shop/${product.id}`} className="flex gap-3 p-4">
              <Image
                src={product.cover}
                alt={product.name}
                width={80}
                height={80}
                className="rounded-lg object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#2C2C2C] line-clamp-2">{product.name}</p>
                <p className="text-xs text-[#999999] mt-1">{product.skuName}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-[#C41E3A] font-medium">¥{product.price}</span>
                  <span className="text-sm text-[#999999]">x{product.quantity}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        
        {/* 快捷操作按钮 */}
        {(order.status === "completed" || order.status === "pending_receive") && (
          <div className="flex items-center gap-2 px-4 py-3 border-t border-[#E8E3DB]">
            {order.canReview && (
              <button
                onClick={() => router.push(`/orders/${order.id}/review`)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#C41E3A]/10 text-[#C41E3A] text-sm font-medium"
              >
                <Star className="w-4 h-4" />
                评价晒单
              </button>
            )}
            <button
              onClick={() => router.push(`/shop/after-sale?orderId=${order.id}`)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-secondary text-muted-foreground text-sm font-medium"
            >
              <Undo2 className="w-4 h-4" />
              申请售后
            </button>
          </div>
        )}
      </Card>

      {/* Price Detail */}
      <Card className="mx-4 mt-4 p-4 border-0 shadow-sm">
        <h3 className="font-medium text-sm text-[#2C2C2C] mb-3">价格明细</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#666666]">商品总额</span>
            <span className="text-sm text-[#2C2C2C]">¥{order.totalAmount.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#666666]">运费</span>
            <span className="text-sm text-[#2C2C2C]">包邮</span>
          </div>
          {order.coupon && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#666666]">{order.coupon.name}</span>
              <span className="text-sm text-[#C41E3A]">-¥{order.coupon.discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-2 border-t border-[#E8E3DB]">
            <span className="text-sm font-medium text-[#2C2C2C]">实付金额</span>
            <span className="text-lg font-bold text-[#C41E3A]">¥{order.payAmount.toFixed(2)}</span>
          </div>
        </div>
      </Card>

      {/* Order Info */}
      <Card className="mx-4 mt-4 p-4 border-0 shadow-sm mb-4">
        <h3 className="font-medium text-sm text-[#2C2C2C] mb-3">订单信息</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#666666]">订单编号</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#2C2C2C] font-mono">{order.orderNo}</span>
              <button onClick={() => handleCopy(order.orderNo)} className="text-[#C41E3A]">
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#666666]">下单时间</span>
            <span className="text-sm text-[#2C2C2C]">{order.createdAt}</span>
          </div>
          {order.paidAt && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#666666]">付款时间</span>
              <span className="text-sm text-[#2C2C2C]">{order.paidAt}</span>
            </div>
          )}
          {order.payMethod && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#666666]">支付方式</span>
              <span className="text-sm text-[#2C2C2C]">{order.payMethod}</span>
            </div>
          )}
          {order.remark && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#666666]">备注</span>
              <span className="text-sm text-[#2C2C2C]">{order.remark}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Copy Toast */}
      {copied && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-2 bg-black/70 text-white text-sm rounded-lg z-50">
          复制成功
        </div>
      )}

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E3DB]">
        <div className="flex items-center justify-between px-4 h-16">
          <button onClick={() => router.push("/customer-service")} className="flex items-center gap-1 text-[#666666]">
            <Phone className="w-4 h-4" />
            <span className="text-sm">联系客服</span>
          </button>
          <div className="flex items-center gap-2">
            {order.status === "pending_pay" && (
              <>
                <button className="px-4 py-2 text-sm text-[#666666] border border-[#E8E3DB] rounded-full">
                  取消订单
                </button>
                <button
                  onClick={() => router.push(`/shop/paying?orderId=${order.id}`)}
                  className="px-4 py-2 text-sm text-white bg-[#C41E3A] rounded-full"
                >
                  去支付
                </button>
              </>
            )}
            {order.status === "pending_receive" && (
              <>
                <button
                  onClick={() => router.push(`/orders/logistics?orderId=${order.id}`)}
                  className="px-4 py-2 text-sm text-[#666666] border border-[#E8E3DB] rounded-full"
                >
                  查看物流
                </button>
                <button
                  onClick={handleConfirmReceive}
                  disabled={confirming}
                  className="px-4 py-2 text-sm text-white bg-[#C41E3A] rounded-full disabled:opacity-50"
                >
                  {confirming ? "确认中..." : "确认收货"}
                </button>
              </>
            )}
            {order.status === "completed" && (
              <>
                {order.canReview && (
                  <button
                    onClick={() => router.push(`/orders/${order.id}/review`)}
                    className="px-4 py-2 text-sm text-[#C41E3A] border border-[#C41E3A] rounded-full"
                  >
                    去评价
                  </button>
                )}
                <button
                  onClick={() => router.push(`/shop/after-sale?orderId=${order.id}`)}
                  className="px-4 py-2 text-sm text-[#666666] border border-[#E8E3DB] rounded-full"
                >
                  申请售后
                </button>
                <button
                  onClick={() => router.push("/shop")}
                  className="px-4 py-2 text-sm text-white bg-[#C41E3A] rounded-full flex items-center gap-1"
                >
                  <ShoppingBag className="w-4 h-4" />
                  再次购买
                </button>
              </>
            )}
            {(order.status === "cancelled") && (
              <button
                onClick={() => router.push("/shop")}
                className="px-4 py-2 text-sm text-white bg-[#C41E3A] rounded-full"
              >
                重新下单
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
