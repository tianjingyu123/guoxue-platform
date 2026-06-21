"use client"

import { useState, Suspense } from "react"
import { ChevronRight, MapPin, Plus, Tag, Check, Loader2, FileText, MessageSquare } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import Link from "next/link"
import Image from "next/image"
import { BackButton } from "@/components/common/back-button"

function LoadingState() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  )
}

// 模拟地址数据
const defaultAddress = {
  id: 1,
  name: "张三",
  phone: "138****8888",
  province: "北京市",
  city: "朝阳区",
  detail: "建国路88号SOHO现代城A座1208室",
  isDefault: true,
}

// 模拟商品数据
const orderItems = [
  {
    id: 1,
    name: "《渊海子平》精装典藏版",
    spec: "精装版 / 全四册",
    price: 168,
    quantity: 1,
    image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&q=80",
  },
  {
    id: 2,
    name: "天然黑曜石本命佛吊坠",
    spec: "属猴 / 大日如来",
    price: 299,
    quantity: 2,
    image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=200&q=80",
  },
]

// 模拟优惠券数据
const availableCoupons = [
  { id: 1, name: "满300减50", discount: 50, minAmount: 300, selected: true },
  { id: 2, name: "满500减100", discount: 100, minAmount: 500, selected: false },
  { id: 3, name: "新人专享9折券", discount: 76.6, minAmount: 0, selected: false },
]

function CheckoutPageContent() {
  const [hasAddress] = useState(true)
  const [selectedCoupon, setSelectedCoupon] = useState(availableCoupons[0])
  const [showCouponPanel, setShowCouponPanel] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<"wechat" | "alipay" | "unionpay" | "huifu">("wechat")
  const [orderNote, setOrderNote] = useState("")
  const [invoiceType, setInvoiceType] = useState<"none" | "personal" | "company">("none")
  const [showInvoicePanel, setShowInvoicePanel] = useState(false)
  
  // 计算价格
  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const shipping = 0 // 包邮
  const couponDiscount = selectedCoupon?.discount || 0
  const totalPrice = subtotal + shipping - couponDiscount

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-24">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between h-12 px-4 max-w-lg mx-auto">
          <BackButton fallbackPath="/cart" />
          <h1 className="font-semibold text-base text-foreground">确认订单</h1>
          <div className="w-9" />
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* 收货地址区 */}
        <Link href="/address">
          <Card className="p-4 bg-card hover:bg-secondary/30 transition-colors cursor-pointer">
            {hasAddress ? (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-foreground">{defaultAddress.name}</span>
                    <span className="text-muted-foreground text-sm">{defaultAddress.phone}</span>
                    {defaultAddress.isDefault && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-0">
                        默认
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {defaultAddress.province} {defaultAddress.city} {defaultAddress.detail}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">请添加收货地址</p>
                  <p className="text-xs text-muted-foreground mt-0.5">添加地址后才能下单</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
          </Card>
        </Link>

        {/* 商品清单区 */}
        <Card className="overflow-hidden bg-card">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-semibold text-sm text-foreground">商品清单</h2>
          </div>
          <div className="divide-y divide-border">
            {orderItems.map((item) => (
              <div key={item.id} className="p-4 flex gap-3">
                <div className="w-20 h-20 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <h3 className="font-medium text-sm text-foreground line-clamp-1">{item.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.spec}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-primary font-semibold">¥{item.price}</span>
                    <span className="text-sm text-muted-foreground">x{item.quantity}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* 优惠券选择 */}
        <Card 
          className="p-4 bg-card hover:bg-secondary/30 transition-colors cursor-pointer"
          onClick={() => setShowCouponPanel(true)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Tag className="w-5 h-5 text-primary" />
              <span className="font-medium text-sm text-foreground">优惠券</span>
            </div>
            <div className="flex items-center gap-2">
              {selectedCoupon ? (
                <span className="text-primary text-sm">-¥{selectedCoupon.discount}</span>
              ) : (
                <span className="text-muted-foreground text-sm">{availableCoupons.length}张可用</span>
              )}
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </Card>

        {/* 订单备注 */}
        <Card className="p-4 bg-card">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={orderNote}
              onChange={(e) => setOrderNote(e.target.value)}
              placeholder="添加订单备注..."
              maxLength={100}
              className="flex-1 text-sm bg-transparent border-none outline-none placeholder:text-muted-foreground text-foreground"
            />
            {orderNote && (
              <span className="text-xs text-muted-foreground">{orderNote.length}/100</span>
            )}
          </div>
        </Card>

        {/* 发票选择 */}
        <Card 
          className="p-4 bg-card hover:bg-secondary/30 transition-colors cursor-pointer"
          onClick={() => setShowInvoicePanel(true)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium text-sm text-foreground">发票</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {invoiceType === "none" ? "不开发票" : invoiceType === "personal" ? "个人发票" : "企业发票"}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </Card>

        {/* 价格明细区 */}
        <Card className="p-4 bg-card">
          <h2 className="font-semibold text-sm text-foreground mb-3">价格明细</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">商品总额</span>
              <span className="text-foreground">¥{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">运费</span>
              <span className="text-foreground">{shipping === 0 ? "包邮" : `¥${shipping.toFixed(2)}`}</span>
            </div>
            {couponDiscount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">优惠券抵扣</span>
                <span className="text-primary">-¥{couponDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="pt-2 mt-2 border-t border-border flex items-center justify-between">
              <span className="font-medium text-foreground">实付金额</span>
              <span className="text-xl font-bold text-primary">¥{totalPrice.toFixed(2)}</span>
            </div>
          </div>
        </Card>

        {/* 支付方式选择 */}
        <Card className="p-4 bg-card">
          <h2 className="font-semibold text-sm text-foreground mb-3">支付方式</h2>
          <div className="space-y-3">
            {[
              { id: "wechat" as const, name: "微信支付", badge: "微", badgeColor: "bg-[#07C160]" },
              { id: "alipay" as const, name: "支付宝", badge: "支", badgeColor: "bg-[#1677FF]" },
              { id: "unionpay" as const, name: "云闪付", badge: "云", badgeColor: "bg-red-500" },
              { id: "huifu" as const, name: "汇付天下", badge: "汇", badgeColor: "bg-orange-500" },
            ].map((method) => (
              <button
                key={method.id}
                onClick={() => setPaymentMethod(method.id)}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-lg border transition-colors",
                  paymentMethod === method.id 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:bg-secondary/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold", method.badgeColor)}>
                    {method.badge}
                  </div>
                  <span className="font-medium text-sm text-foreground">{method.name}</span>
                </div>
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                  paymentMethod === method.id 
                    ? "border-primary bg-primary" 
                    : "border-muted-foreground"
                )}>
                  {paymentMethod === method.id && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            实物商品仅支持第三方支付（微信、支付宝、云闪付、汇付天下），不支持国学币支付。
          </p>
        </Card>
      </div>

      {/* 底部固定操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border safe-area-pb">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <span className="text-sm text-muted-foreground">实付：</span>
            <span className="text-xl font-bold text-primary">¥{totalPrice.toFixed(2)}</span>
          </div>
          {hasAddress ? (
            <Link 
              href="/payment/result?status=success"
              className="px-8 py-2.5 rounded-full font-semibold text-sm transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
            >
              立即支付
            </Link>
          ) : (
            <button 
              className="px-8 py-2.5 rounded-full font-semibold text-sm transition-colors bg-muted text-muted-foreground cursor-not-allowed"
              disabled
            >
              立即支付
            </button>
          )}
        </div>
      </div>

      {/* 优惠券选择面板 */}
      {showCouponPanel && (
        <div className="fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowCouponPanel(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl max-h-[70vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">选择优惠券</h3>
              <button 
                onClick={() => setShowCouponPanel(false)}
                className="text-muted-foreground text-sm"
              >
                完成
              </button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto max-h-[50vh]">
              {/* 不使用优惠券选项 */}
              <button
                onClick={() => {
                  setSelectedCoupon(null as any)
                  setShowCouponPanel(false)
                }}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-xl border transition-colors",
                  !selectedCoupon 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:bg-secondary/50"
                )}
              >
                <span className="font-medium text-sm text-foreground">不使用优惠券</span>
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                  !selectedCoupon 
                    ? "border-primary bg-primary" 
                    : "border-muted-foreground"
                )}>
                  {!selectedCoupon && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
              </button>

              {availableCoupons.map((coupon) => {
                const canUse = subtotal >= coupon.minAmount
                return (
                  <button
                    key={coupon.id}
                    onClick={() => {
                      if (canUse) {
                        setSelectedCoupon(coupon)
                        setShowCouponPanel(false)
                      }
                    }}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-xl border transition-colors",
                      selectedCoupon?.id === coupon.id 
                        ? "border-primary bg-primary/5" 
                        : "border-border",
                      !canUse 
                        ? "opacity-50 cursor-not-allowed" 
                        : "hover:bg-secondary/50"
                    )}
                  >
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-primary font-bold text-lg">¥{coupon.discount}</span>
                        <span className="font-medium text-sm text-foreground">{coupon.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {coupon.minAmount > 0 ? `满¥${coupon.minAmount}可用` : "无门槛"}
                        {!canUse && " · 未满足���件"}
                      </span>
                    </div>
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                      selectedCoupon?.id === coupon.id 
                        ? "border-primary bg-primary" 
                        : "border-muted-foreground"
                    )}>
                      {selectedCoupon?.id === coupon.id && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* 发票选择面板 */}
      {showInvoicePanel && (
        <div className="fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowInvoicePanel(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl max-h-[50vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">选择发票类型</h3>
              <button 
                onClick={() => setShowInvoicePanel(false)}
                className="text-muted-foreground text-sm"
              >
                完成
              </button>
            </div>
            <div className="p-4 space-y-3">
              {[
                { value: "none", label: "不开发票", desc: "无需发票" },
                { value: "personal", label: "个人发票", desc: "电子发票，购买后发送至邮箱" },
                { value: "company", label: "企业发票", desc: "需要填写企业税号" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setInvoiceType(option.value as any)
                    setShowInvoicePanel(false)
                  }}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-xl border transition-colors",
                    invoiceType === option.value 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:bg-secondary/50"
                  )}
                >
                  <div className="text-left">
                    <span className="font-medium text-sm text-foreground block">{option.label}</span>
                    <span className="text-xs text-muted-foreground">{option.desc}</span>
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                    invoiceType === option.value 
                      ? "border-primary bg-primary" 
                      : "border-muted-foreground"
                  )}>
                    {invoiceType === option.value && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <CheckoutPageContent />
    </Suspense>
  )
}
