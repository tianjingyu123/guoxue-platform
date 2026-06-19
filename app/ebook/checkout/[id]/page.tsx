"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  ArrowLeft,
  Crown,
  Shield,
  ChevronRight,
  CreditCard,
  Smartphone,
  Wallet,
  Tag,
  ChevronDown,
  Lock,
  Landmark,
  Building2,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { usePaymentBindings, type PaymentChannel } from "@/hooks/use-payment-bindings"
import { BindPaymentDialog } from "@/components/wallet/bind-payment-dialog"

const bookInfo = {
  id: "1",
  title: "八字命理精解",
  author: "李明华",
  coverColor: "#1e3a5f",
  price: 68,
  originalPrice: 128,
  isMemberFree: true,
}

type PayMethod = "wechat" | "alipay" | "unionpay" | "huifu" | "apple"

export default function EbookCheckoutPage() {
  const router = useRouter()
  const [payMethod, setPayMethod] = useState<PayMethod>("wechat")
  const [couponCode, setCouponCode] = useState("")
  const [showCoupon, setShowCoupon] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const { isBound } = usePaymentBindings()
  const [showBindDialog, setShowBindDialog] = useState(false)

  // Detect if member mode from query param
  const isMemberMode = typeof window !== "undefined" && window.location.search.includes("type=member")

  const payMethods = [
    { id: "wechat" as PayMethod, label: "微信支付", icon: <Smartphone className="w-5 h-5 text-[#07c160]" /> },
    { id: "alipay" as PayMethod, label: "支付宝", icon: <Wallet className="w-5 h-5 text-[#1677ff]" /> },
    { id: "unionpay" as PayMethod, label: "云闪付", icon: <Landmark className="w-5 h-5 text-[#e60012]" /> },
    { id: "huifu" as PayMethod, label: "汇付天下", icon: <Building2 className="w-5 h-5 text-orange-500" /> },
    { id: "apple" as PayMethod, label: "Apple Pay", icon: <CreditCard className="w-5 h-5 text-gray-700" /> },
  ]

  const handlePay = async () => {
    // Apple Pay 由系统级支付完成，无需账户预绑定；其余第三方渠道未绑定时引导绑定
    if (payMethod !== "apple" && !isBound(payMethod as PaymentChannel)) {
      setShowBindDialog(true)
      return
    }
    setIsProcessing(true)
    // Simulate payment
    await new Promise((r) => setTimeout(r, 1200))
    router.push(`/ebook/checkout/success?id=${bookInfo.id}`)
  }

  return (
    <div className="min-h-screen bg-[var(--ebook-bg)] pb-28">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[var(--ebook-border)]">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href={`/ebook/${bookInfo.id}`} className="p-1.5 -ml-1.5 rounded-lg hover:bg-slate-100 active:scale-95 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-semibold text-base text-[var(--ebook-text)]">确认订单</h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">
        {/* Book info */}
        <Card className="p-4 border-[var(--ebook-border)]">
          <div className="flex gap-3">
            <div
              className="w-16 h-24 rounded-lg flex-shrink-0 relative overflow-hidden shadow-md"
              style={{ background: bookInfo.coverColor }}
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/10" />
              <div className="absolute inset-0 flex items-center justify-center p-1">
                <p className="text-white/80 text-[10px] font-medium text-center leading-snug line-clamp-4">{bookInfo.title}</p>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-[var(--ebook-text)] text-base line-clamp-2">{bookInfo.title}</h2>
              <p className="text-sm text-[var(--ebook-text-soft)] mt-1">{bookInfo.author}</p>
              <p className="text-xs text-[var(--ebook-text-soft)] mt-1">数字商品 · 购买后永久可读</p>
              {bookInfo.isMemberFree && (
                <div className="flex items-center gap-1 mt-2">
                  <Crown className="w-3.5 h-3.5 text-[var(--ebook-member)]" />
                  <span className="text-xs text-[var(--ebook-member)]">会员可免费领取</span>
                  <Link href="/vip" className="text-xs text-[var(--ebook-member)] underline">开通会员</Link>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Price details */}
        <Card className="border-[var(--ebook-border)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--ebook-border)]">
            <h3 className="font-medium text-sm text-[var(--ebook-text)]">价格明细</h3>
          </div>
          <div className="px-4 py-3 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--ebook-text-soft)]">商品原价</span>
              <span className="text-slate-400 line-through">¥{bookInfo.originalPrice}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--ebook-text-soft)]">限时优惠</span>
              <span className="text-[var(--ebook-free)]">-¥{bookInfo.originalPrice - bookInfo.price}</span>
            </div>
            {couponCode && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--ebook-text-soft)]">优惠券</span>
                <span className="text-[var(--ebook-free)]">-¥10</span>
              </div>
            )}
            <div className="border-t border-[var(--ebook-border)] pt-3 flex justify-between">
              <span className="font-semibold text-[var(--ebook-text)]">实付金额</span>
              <span className="text-xl font-bold text-[var(--ebook-price)]">
                ¥{couponCode ? bookInfo.price - 10 : bookInfo.price}
              </span>
            </div>
          </div>
        </Card>

        {/* Coupon */}
        <Card className="border-[var(--ebook-border)]">
          <button
            className="w-full flex items-center justify-between px-4 py-3.5"
            onClick={() => setShowCoupon(!showCoupon)}
          >
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-[var(--ebook-price)]" />
              <span className="text-sm text-[var(--ebook-text)]">优惠券</span>
            </div>
            <div className="flex items-center gap-1 text-[var(--ebook-text-soft)]">
              <span className="text-xs">{couponCode ? "已使用 1 张" : "可用 1 张"}</span>
              <ChevronDown className={cn("w-4 h-4 transition-transform", showCoupon && "rotate-180")} />
            </div>
          </button>
          {showCoupon && (
            <div className="px-4 pb-4 pt-0">
              <div className="flex gap-2">
                <input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="输入优惠码"
                  className="flex-1 h-9 px-3 rounded-lg text-sm border border-[var(--ebook-border)] focus:outline-none focus:ring-2 focus:ring-[var(--ebook-primary)] bg-slate-50"
                />
                <Button size="sm" variant="outline" className="h-9 border-[var(--ebook-primary)] text-[var(--ebook-primary)]">
                  使用
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Payment methods */}
        <Card className="border-[var(--ebook-border)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--ebook-border)]">
            <h3 className="font-medium text-sm text-[var(--ebook-text)]">支付方式</h3>
          </div>
          <div className="divide-y divide-[var(--ebook-border)]">
            {payMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setPayMethod(method.id)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3.5 transition-all",
                  payMethod === method.id ? "bg-[var(--ebook-primary-soft)]" : "hover:bg-slate-50"
                )}
              >
                <div className="flex items-center gap-3">
                  {method.icon}
                  <span className="text-sm font-medium text-[var(--ebook-text)]">{method.label}</span>
                  {method.extra && (
                    <span className="text-xs text-[var(--ebook-text-soft)]">余额 {method.extra}</span>
                  )}
                </div>
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                  payMethod === method.id ? "border-[var(--ebook-primary)] bg-[var(--ebook-primary)]" : "border-slate-300"
                )}>
                  {payMethod === method.id && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Security note */}
        <div className="flex items-center justify-center gap-2 text-xs text-[var(--ebook-text-soft)]">
          <Shield className="w-3.5 h-3.5 text-[var(--ebook-free)]" />
          <span>安全支付由平台保障 · 购买即同意<Link href="#" className="underline">服务协议</Link></span>
        </div>
      </main>

      {/* Pay button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--ebook-border)] px-4 py-3 z-50">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-xs text-[var(--ebook-text-soft)]">应付</p>
            <p className="text-2xl font-bold text-[var(--ebook-price)]">
              ¥{couponCode ? bookInfo.price - 10 : bookInfo.price}
            </p>
          </div>
          <Button
            className="flex-1 h-12 text-base font-semibold bg-[var(--ebook-primary)] hover:bg-[var(--ebook-primary)]/90 rounded-xl gap-2"
            onClick={handlePay}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                支付中...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                立即支付
              </span>
            )}
          </Button>
        </div>
      </div>

      {payMethod !== "apple" && (
        <BindPaymentDialog
          open={showBindDialog}
          onClose={() => setShowBindDialog(false)}
          channel={payMethod as PaymentChannel}
        />
      )}
    </div>
  )
}
