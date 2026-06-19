"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight, MapPin, Plus, Tag, CreditCard, Smartphone, Check, Clock, AlertTriangle, Landmark, Building2 } from "lucide-react"
import { shopApi, type CartItem, type ShippingAddress, type Coupon, type OrderPriceResult } from "@/lib/api"
import { usePaymentBindings, type PaymentChannel } from "@/hooks/use-payment-bindings"
import { BindPaymentDialog } from "@/components/wallet/bind-payment-dialog"

// Mock数据
const mockAddresses: ShippingAddress[] = [
  { id: "1", name: "张三", phone: "138****8888", province: "北京市", city: "北京市", district: "朝阳区", address: "建国路88号SOHO现代城A座1201", isDefault: true },
  { id: "2", name: "李四", phone: "139****9999", province: "上海市", city: "上海市", district: "浦东新区", address: "张江高科技园区博云路2号", isDefault: false },
]

const mockCoupons: Coupon[] = [
  { id: "1", name: "新人专享", type: "amount", value: 50, minAmount: 200, expireAt: "2024-12-31", scope: [], isAvailable: true },
  { id: "2", name: "满300减30", type: "amount", value: 30, minAmount: 300, expireAt: "2024-12-31", scope: [], isAvailable: true },
]

const mockItems: CartItem[] = [
  { id: "1", productId: "p1", productName: "周易六十四卦详解（精装典藏版）", productCover: "/placeholder.svg", skuId: "s1", skuName: "精装版", price: 168, originalPrice: 298, quantity: 1, stock: 99, selected: true },
  { id: "2", productId: "p2", productName: "紫微斗数入门教程", productCover: "/placeholder.svg", skuId: "s2", skuName: "平装版", price: 88, originalPrice: 128, quantity: 2, stock: 50, selected: true },
]

function CheckoutPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<CartItem[]>([])
  const [addresses, setAddresses] = useState<ShippingAddress[]>([])
  const [selectedAddress, setSelectedAddress] = useState<ShippingAddress | null>(null)
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null)
  const [priceResult, setPriceResult] = useState<OrderPriceResult | null>(null)
  const [payMethod, setPayMethod] = useState("wechat")
  const [remark, setRemark] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const { isBound } = usePaymentBindings()
  const [showBindDialog, setShowBindDialog] = useState(false)
  
  const [showAddressPanel, setShowAddressPanel] = useState(false)
  const [showCouponPanel, setShowCouponPanel] = useState(false)
  
  // 订单超时倒计时（15分钟）
  const [orderTimeout, setOrderTimeout] = useState(15 * 60) // 秒
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [cartRes, addrRes, couponRes] = await Promise.all([
          shopApi.getCart(),
          shopApi.listAddresses(),
          shopApi.myCoupons({ available: true }),
        ])
        
        const selectedItems = cartRes.items.filter(i => i.selected)
        setItems(selectedItems.length > 0 ? selectedItems : mockItems)
        setAddresses(addrRes.length > 0 ? addrRes : mockAddresses)
        setCoupons(couponRes.length > 0 ? couponRes : mockCoupons)
        
        const defaultAddr = (addrRes.length > 0 ? addrRes : mockAddresses).find(a => a.isDefault)
        setSelectedAddress(defaultAddr || null)
      } catch {
        setItems(mockItems)
        setAddresses(mockAddresses)
        setCoupons(mockCoupons)
        setSelectedAddress(mockAddresses.find(a => a.isDefault) || null)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [searchParams])

  // 订单超时倒计时
  useEffect(() => {
    if (loading) return
    
    const timer = setInterval(() => {
      setOrderTimeout(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push('/shop/pay-timeout')
          return 0
        }
        // 最后3分钟显示警告
        if (prev === 180) {
          setShowTimeoutWarning(true)
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(timer)
  }, [loading, router])

  useEffect(() => {
    const calcPrice = async () => {
      if (items.length === 0) return
      
      try {
        const result = await shopApi.calcOrderPrice({
          itemIds: items.map(i => i.id),
          couponId: selectedCoupon?.id,
          addressId: selectedAddress?.id,
        })
        setPriceResult(result)
      } catch {
        const itemsAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
        const couponDiscount = selectedCoupon ? selectedCoupon.value : 0
        setPriceResult({
          itemsAmount,
          shippingFee: itemsAmount >= 99 ? 0 : 10,
          couponDiscount,
          totalAmount: Math.max(0, itemsAmount + (itemsAmount >= 99 ? 0 : 10) - couponDiscount),
        })
      }
    }
    calcPrice()
  }, [items, selectedCoupon, selectedAddress])

  const handleSubmit = async () => {
    if (!selectedAddress) {
      alert("请选择收货地址")
      return
    }

    // 所选第三方支付渠道未绑定时，引导用户先绑定
    if (!isBound(payMethod as PaymentChannel)) {
      setShowBindDialog(true)
      return
    }

    setSubmitting(true)
    try {
      const result = await shopApi.createOrder({
        itemIds: items.map(i => i.id),
        addressId: selectedAddress.id,
        couponId: selectedCoupon?.id,
        payMethod,
        remark,
      })
      
      if (result.payUrl) {
        window.location.href = result.payUrl
      } else {
        router.push(`/shop/orders/${result.orderId}?status=pending`)
      }
    } catch {
      router.push("/payment/result?status=pending")
    } finally {
      setSubmitting(false)
    }
  }

  const payMethods = [
    { id: "wechat", name: "微信支付", icon: Smartphone, color: "text-green-500" },
    { id: "alipay", name: "支付宝", icon: CreditCard, color: "text-blue-500" },
    { id: "unionpay", name: "云闪付", icon: Landmark, color: "text-red-500" },
    { id: "huifu", name: "汇付天下", icon: Building2, color: "text-orange-500" },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB] px-4 py-3 flex items-center gap-3">
          <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
          <div className="w-24 h-5 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="p-4 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
              <div className="h-20 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-24">
      {/* 顶部导航 - 含倒计时 */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB]">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1">
            <ChevronLeft className="w-6 h-6 text-[#2C2C2C]" />
          </button>
          <h1 className="text-lg font-semibold text-[#2C2C2C]">确认订单</h1>
        </div>
        
        {/* 订单超时倒计时条 */}
        <div className={`px-4 py-2 flex items-center justify-between text-sm ${
          orderTimeout <= 180 ? 'bg-red-50' : 'bg-[#FFF5E6]'
        }`}>
          <div className="flex items-center gap-2">
            <Clock className={`w-4 h-4 ${orderTimeout <= 180 ? 'text-red-500' : 'text-[#FF6B35]'}`} />
            <span className={orderTimeout <= 180 ? 'text-red-500' : 'text-[#FF6B35]'}>
              请在 {Math.floor(orderTimeout / 60)}:{String(orderTimeout % 60).padStart(2, '0')} 内完成支付
            </span>
          </div>
          {orderTimeout <= 180 && (
            <span className="text-red-500 text-xs animate-pulse">即将超时</span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 收货地址 */}
        <div 
          className="bg-white rounded-2xl p-4 cursor-pointer"
          onClick={() => setShowAddressPanel(true)}
        >
          {selectedAddress ? (
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-[#C41E3A] mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-[#2C2C2C]">{selectedAddress.name}</span>
                  <span className="text-[#666666]">{selectedAddress.phone}</span>
                  {selectedAddress.isDefault && (
                    <span className="text-xs px-1.5 py-0.5 bg-red-50 text-[#C41E3A] rounded">默认</span>
                  )}
                </div>
                <p className="text-sm text-[#666666] line-clamp-2">
                  {selectedAddress.province}{selectedAddress.city}{selectedAddress.district}{selectedAddress.address}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-[#999999] flex-shrink-0" />
            </div>
          ) : (
            <div className="flex items-center gap-3 text-[#C41E3A]">
              <Plus className="w-5 h-5" />
              <span>添加收货地址</span>
            </div>
          )}
        </div>

        {/* 商品清单 */}
        <div className="bg-white rounded-2xl p-4">
          <h3 className="font-medium text-[#2C2C2C] mb-3">商品清单</h3>
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className="flex gap-3">
                <img 
                  src={item.productCover} 
                  alt={item.productName}
                  className="w-16 h-16 rounded-lg object-cover bg-gray-100"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#2C2C2C] line-clamp-1">{item.productName}</p>
                  <p className="text-xs text-[#999999] mt-0.5">{item.skuName}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[#C41E3A] font-medium">¥{item.price}</span>
                    <span className="text-xs text-[#999999]">x{item.quantity}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 优惠券 */}
        <div 
          className="bg-white rounded-2xl p-4 flex items-center justify-between cursor-pointer"
          onClick={() => setShowCouponPanel(true)}
        >
          <div className="flex items-center gap-3">
            <Tag className="w-5 h-5 text-[#C41E3A]" />
            <span className="text-[#2C2C2C]">优惠券</span>
          </div>
          <div className="flex items-center gap-2">
            {selectedCoupon ? (
              <span className="text-[#C41E3A]">-¥{selectedCoupon.value}</span>
            ) : coupons.length > 0 ? (
              <span className="text-[#C41E3A]">{coupons.length}张可用</span>
            ) : (
              <span className="text-[#999999]">暂无可用</span>
            )}
            <ChevronRight className="w-5 h-5 text-[#999999]" />
          </div>
        </div>

        {/* 支付方式 */}
        <div className="bg-white rounded-2xl p-4">
          <h3 className="font-medium text-[#2C2C2C] mb-3">支付方式</h3>
          <div className="space-y-3">
            {payMethods.map(method => (
              <div 
                key={method.id}
                className="flex items-center justify-between py-2 cursor-pointer"
                onClick={() => setPayMethod(method.id)}
              >
                <div className="flex items-center gap-3">
                  <method.icon className={`w-5 h-5 ${method.color}`} />
                  <span className="text-[#2C2C2C]">{method.name}</span>
                  {method.balance !== undefined && (
                    <span className="text-xs text-[#999999]">余额: {method.balance}</span>
                  )}
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  payMethod === method.id ? "border-[#C41E3A] bg-[#C41E3A]" : "border-[#E8E3DB]"
                }`}>
                  {payMethod === method.id && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 订单备注 */}
        <div className="bg-white rounded-2xl p-4">
          <h3 className="font-medium text-[#2C2C2C] mb-3">订单备注</h3>
          <textarea
            value={remark}
            onChange={e => setRemark(e.target.value)}
            placeholder="选填，可备注特殊要���"
            className="w-full h-20 p-3 bg-[#FAF8F5] rounded-lg text-sm text-[#2C2C2C] placeholder-[#999999] resize-none border-none focus:ring-1 focus:ring-[#C41E3A]/30"
          />
        </div>

        {/* 价格明细 */}
        {priceResult && (
          <div className="bg-white rounded-2xl p-4">
            <h3 className="font-medium text-[#2C2C2C] mb-3">价格明细</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#666666]">商品金额</span>
                <span className="text-[#2C2C2C]">¥{priceResult.itemsAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#666666]">运费</span>
                <span className="text-[#2C2C2C]">
                  {priceResult.shippingFee > 0 ? `¥${priceResult.shippingFee.toFixed(2)}` : "免运费"}
                </span>
              </div>
              {priceResult.couponDiscount > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#666666]">优惠券抵扣</span>
                  <span className="text-[#C41E3A]">-¥{priceResult.couponDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-[#E8E3DB] pt-2 mt-2 flex justify-between items-center">
                <span className="text-[#2C2C2C]">实付金额</span>
                <span className="text-xl font-bold text-[#C41E3A]">¥{priceResult.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 底部结算栏 - 增强版 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E3DB] px-4 py-3 flex items-center justify-between z-20">
        <div>
          <span className="text-sm text-[#666666]">合计:</span>
          <span className="text-xl font-bold text-[#C41E3A] ml-1">
            ¥{priceResult?.totalAmount.toFixed(2) || "0.00"}
          </span>
          {priceResult && priceResult.couponDiscount > 0 && (
            <p className="text-xs text-green-600">已优惠 ¥{priceResult.couponDiscount}</p>
          )}
        </div>
        <button
          onClick={handleSubmit}
          disabled={submitting || !selectedAddress || orderTimeout === 0}
          className="px-8 py-2.5 bg-gradient-to-r from-[#C41E3A] to-[#E85050] text-white rounded-full font-medium disabled:opacity-50 relative overflow-hidden"
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              提交中...
            </span>
          ) : orderTimeout === 0 ? (
            "订单已超时"
          ) : (
            "提交订单"
          )}
        </button>
      </div>
      
      {/* 超时警告��窗 */}
      {showTimeoutWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white rounded-2xl p-6 mx-4 max-w-sm w-full text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-[#2C2C2C] mb-2">订单即将超时</h3>
            <p className="text-sm text-[#666666] mb-4">
              请在 {Math.floor(orderTimeout / 60)}:{String(orderTimeout % 60).padStart(2, '0')} 内完成支付，超时后订单将自动取消
            </p>
            <button 
              onClick={() => setShowTimeoutWarning(false)}
              className="w-full py-3 bg-[#C41E3A] text-white rounded-full font-medium"
            >
              我知道了，立即支付
            </button>
          </div>
        </div>
      )}

      {/* 地址选择面板 */}
      {showAddressPanel && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddressPanel(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[70vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-[#E8E3DB] px-4 py-3 flex items-center justify-between">
              <h3 className="font-medium text-[#2C2C2C]">选择收货地址</h3>
              <button 
                onClick={() => setShowAddressPanel(false)}
                className="text-[#999999]"
              >
                关闭
              </button>
            </div>
            <div className="p-4 space-y-3">
              {addresses.map(addr => (
                <div
                  key={addr.id}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                    selectedAddress?.id === addr.id ? "border-[#C41E3A] bg-red-50/30" : "border-[#E8E3DB]"
                  }`}
                  onClick={() => {
                    setSelectedAddress(addr)
                    setShowAddressPanel(false)
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-[#2C2C2C]">{addr.name}</span>
                    <span className="text-[#666666]">{addr.phone}</span>
                    {addr.isDefault && (
                      <span className="text-xs px-1.5 py-0.5 bg-red-50 text-[#C41E3A] rounded">默认</span>
                    )}
                  </div>
                  <p className="text-sm text-[#666666]">
                    {addr.province}{addr.city}{addr.district}{addr.address}
                  </p>
                </div>
              ))}
              <button className="w-full py-3 border-2 border-dashed border-[#E8E3DB] rounded-xl text-[#C41E3A] flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" />
                <span>添加新地址</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 优惠券选择面板 */}
      {showCouponPanel && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCouponPanel(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[70vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-[#E8E3DB] px-4 py-3 flex items-center justify-between">
              <h3 className="font-medium text-[#2C2C2C]">选择优惠券</h3>
              <button 
                onClick={() => setShowCouponPanel(false)}
                className="text-[#999999]"
              >
                关闭
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div
                className={`p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                  !selectedCoupon ? "border-[#C41E3A] bg-red-50/30" : "border-[#E8E3DB]"
                }`}
                onClick={() => {
                  setSelectedCoupon(null)
                  setShowCouponPanel(false)
                }}
              >
                <span className="text-[#666666]">不使用优惠券</span>
              </div>
              {coupons.map(coupon => (
                <div
                  key={coupon.id}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                    selectedCoupon?.id === coupon.id ? "border-[#C41E3A] bg-red-50/30" : "border-[#E8E3DB]"
                  }`}
                  onClick={() => {
                    setSelectedCoupon(coupon)
                    setShowCouponPanel(false)
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#C41E3A] to-[#E85050] rounded-lg flex flex-col items-center justify-center text-white">
                      <span className="text-xs">¥</span>
                      <span className="text-xl font-bold">{coupon.value}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-[#2C2C2C]">{coupon.name}</p>
                      <p className="text-xs text-[#999999] mt-0.5">满{coupon.minAmount}元可用</p>
                      <p className="text-xs text-[#999999]">有效期至 {coupon.expireAt}</p>
                    </div>
                  </div>
                </div>
              ))}
              {coupons.length === 0 && (
                <div className="py-8 text-center text-[#999999]">暂无可用优惠券</div>
              )}
            </div>
          </div>
        </div>
      )}

      <BindPaymentDialog
        open={showBindDialog}
        onClose={() => setShowBindDialog(false)}
        channel={payMethod as PaymentChannel}
      />
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB] px-4 py-3 flex items-center gap-3">
        <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
        <div className="w-24 h-5 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="p-4 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
            <div className="h-20 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CheckoutPageContent />
    </Suspense>
  )
}
