"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Check, Tag, CreditCard, Smartphone, ChevronRight, ShieldCheck, Clock, Landmark, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { courseApi, shopApi, pricingApi, type Course, type Coupon, type PriceCalcResult } from "@/lib/api"
import { usePaymentBindings, type PaymentChannel } from "@/hooks/use-payment-bindings"
import { BindPaymentDialog } from "@/components/wallet/bind-payment-dialog"

// Mock data
const mockCourse: Course = {
  id: "1",
  title: "八字命理入门到精通",
  cover: "https://picsum.photos/seed/course1/400/300",
  instructor: { id: "1", name: "张老师", avatar: "https://i.pravatar.cc/100?img=1", title: "资深命理师" },
  price: 299,
  originalPrice: 599,
  students: 2860,
  rating: 4.9,
  chapters: 32,
  category: "命理",
  isFree: false,
}

const mockCoupons: Coupon[] = [
  { id: "1", name: "新人专享券", type: "amount", value: 50, minAmount: 100, expireAt: "2024-12-31", scope: ["course"], isAvailable: true },
  { id: "2", name: "课程9折券", type: "percent", value: 10, minAmount: 200, maxDiscount: 100, expireAt: "2024-06-30", scope: ["course"], isAvailable: true },
  { id: "3", name: "满300减30", type: "amount", value: 30, minAmount: 300, expireAt: "2024-07-15", scope: ["course"], isAvailable: false },
]

const payMethods = [
  { id: "wechat", name: "微信支付", icon: Smartphone, color: "text-green-500" },
  { id: "alipay", name: "支付宝", icon: CreditCard, color: "text-blue-500" },
  { id: "unionpay", name: "云闪付", icon: Landmark, color: "text-red-500" },
  { id: "huifu", name: "汇付天下", icon: Building2, color: "text-orange-500" },
]

// 骨架屏
function PurchaseSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="h-12 bg-white" />
      <div className="p-4 space-y-4">
        <div className="bg-white rounded-xl p-4 animate-pulse">
          <div className="flex gap-3">
            <div className="w-24 h-18 bg-[#F2EFEA] rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-[#F2EFEA] rounded w-3/4" />
              <div className="h-4 bg-[#F2EFEA] rounded w-1/2" />
              <div className="h-6 bg-[#F2EFEA] rounded w-1/3" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 animate-pulse space-y-3">
          <div className="h-5 bg-[#F2EFEA] rounded w-1/4" />
          <div className="h-16 bg-[#F2EFEA] rounded" />
          <div className="h-16 bg-[#F2EFEA] rounded" />
        </div>
      </div>
    </div>
  )
}

function PurchaseConfirmContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const courseId = searchParams.get("id") || "1"
  
  const [course, setCourse] = useState<Course | null>(null)
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [selectedCoupon, setSelectedCoupon] = useState<string | null>(null)
  const [payMethod, setPayMethod] = useState("wechat")
  const [priceResult, setPriceResult] = useState<PriceCalcResult | null>(null)
  const [agreed, setAgreed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCouponList, setShowCouponList] = useState(false)
  const { isBound } = usePaymentBindings()
  const [showBindDialog, setShowBindDialog] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        // 实际项目中从API获取
        // const [courseData, couponsData] = await Promise.all([
        //   courseApi.detail(courseId),
        //   shopApi.myCoupons({ available: true })
        // ])
        setCourse(mockCourse)
        setCoupons(mockCoupons)
        setPriceResult({
          originalPrice: mockCourse.price,
          discountAmount: 0,
          finalPrice: mockCourse.price,
        })
      } catch (error) {
        console.error("Failed to load data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [courseId])

  // 选择优惠券后计算价格
  const handleSelectCoupon = async (couponId: string | null) => {
    setSelectedCoupon(couponId)
    setShowCouponList(false)
    
    if (!course) return
    
    if (couponId) {
      const coupon = coupons.find(c => c.id === couponId)
      if (coupon) {
        let discount = 0
        if (coupon.type === "amount") {
          discount = coupon.value
        } else if (coupon.type === "percent") {
          discount = Math.min(course.price * (coupon.value / 100), coupon.maxDiscount || Infinity)
        }
        setPriceResult({
          originalPrice: course.price,
          discountAmount: discount,
          finalPrice: course.price - discount,
          couponUsed: { id: coupon.id, name: coupon.name, discount },
        })
      }
    } else {
      setPriceResult({
        originalPrice: course.price,
        discountAmount: 0,
        finalPrice: course.price,
      })
    }
  }

  // 提交订单
  const handleSubmit = async () => {
    if (!agreed || !course || isSubmitting) return

    // 所选第三方支付渠道未绑定时，引导用户先绑定
    if (!isBound(payMethod as PaymentChannel)) {
      setShowBindDialog(true)
      return
    }

    setIsSubmitting(true)
    try {
      // const result = await pricingApi.createOrder({
      //   productId: course.id,
      //   productType: "course",
      //   couponId: selectedCoupon || undefined,
      //   payMethod,
      // })
      // 模拟跳转支付
      await new Promise(resolve => setTimeout(resolve, 1000))
      router.push(`/payment/result?status=success&orderId=mock123`)
    } catch (error) {
      console.error("Failed to create order:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return <PurchaseSkeleton />
  if (!course) return null

  const selectedCouponData = selectedCoupon ? coupons.find(c => c.id === selectedCoupon) : null
  const availableCoupons = coupons.filter(c => c.isAvailable && c.minAmount <= course.price)

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-32">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-50 bg-white border-b border-[#E8E3DB]">
        <div className="flex items-center h-12 px-4">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5 text-[#2C2C2C]" />
          </button>
          <h1 className="flex-1 text-center text-[16px] font-medium text-[#2C2C2C]">确认订单</h1>
          <div className="w-6" />
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* 课程信息 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex gap-3">
            <img
              src={course.cover}
              alt={course.title}
              className="w-24 h-[72px] rounded-lg object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-[14px] font-medium text-[#2C2C2C] line-clamp-2 mb-1">{course.title}</h3>
              <p className="text-[12px] text-[#999999] mb-2">{course.instructor.name} | {course.chapters}课时</p>
              <div className="flex items-baseline gap-2">
                <span className="text-[18px] font-bold text-[#C41E3A]">¥{course.price}</span>
                <span className="text-[12px] text-[#999999] line-through">¥{course.originalPrice}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 优惠券选择 */}
        <div className="bg-white rounded-xl shadow-sm">
          <button 
            onClick={() => setShowCouponList(!showCouponList)}
            className="w-full p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-[#C41E3A]" />
              <span className="text-[14px] font-medium text-[#2C2C2C]">优惠券</span>
              {availableCoupons.length > 0 && (
                <span className="text-[10px] text-[#C41E3A] bg-[#C41E3A]/10 px-1.5 py-0.5 rounded">
                  {availableCoupons.length}张可用
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {selectedCouponData ? (
                <span className="text-[14px] text-[#C41E3A]">-¥{priceResult?.couponUsed?.discount || 0}</span>
              ) : availableCoupons.length > 0 ? (
                <span className="text-[14px] text-[#999999]">选择优惠券</span>
              ) : (
                <span className="text-[14px] text-[#999999]">暂无可用</span>
              )}
              <ChevronRight className={cn("w-4 h-4 text-[#999999] transition-transform", showCouponList && "rotate-90")} />
            </div>
          </button>

          {/* 优惠券列表 */}
          {showCouponList && (
            <div className="border-t border-[#F2EFEA] p-4 space-y-2">
              {/* 不使用优惠券 */}
              <button
                onClick={() => handleSelectCoupon(null)}
                className={cn(
                  "w-full p-3 rounded-lg border-2 transition-all flex items-center justify-between",
                  !selectedCoupon ? "border-[#C41E3A] bg-[#C41E3A]/5" : "border-[#E8E3DB]"
                )}
              >
                <span className="text-[14px] text-[#666666]">不使用优惠券</span>
                {!selectedCoupon && <Check className="w-5 h-5 text-[#C41E3A]" />}
              </button>

              {coupons.map((coupon) => {
                const isAvailable = coupon.isAvailable && coupon.minAmount <= course.price
                return (
                  <button
                    key={coupon.id}
                    onClick={() => isAvailable && handleSelectCoupon(coupon.id)}
                    disabled={!isAvailable}
                    className={cn(
                      "w-full p-3 rounded-lg border-2 transition-all",
                      selectedCoupon === coupon.id ? "border-[#C41E3A] bg-[#C41E3A]/5" : "border-[#E8E3DB]",
                      !isAvailable && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 bg-gradient-to-br from-[#C41E3A] to-[#8B0000] rounded-lg flex flex-col items-center justify-center text-white">
                          {coupon.type === "percent" ? (
                            <>
                              <span className="text-[16px] font-bold">{coupon.value}%</span>
                              <span className="text-[10px]">折扣</span>
                            </>
                          ) : (
                            <>
                              <span className="text-[10px]">¥</span>
                              <span className="text-[18px] font-bold leading-none">{coupon.value}</span>
                            </>
                          )}
                        </div>
                        <div className="text-left">
                          <p className="text-[14px] font-medium text-[#2C2C2C]">{coupon.name}</p>
                          <p className="text-[12px] text-[#999999]">满{coupon.minAmount}可用</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-[#999999]" />
                            <span className="text-[10px] text-[#999999]">{coupon.expireAt}到期</span>
                          </div>
                        </div>
                      </div>
                      {selectedCoupon === coupon.id && <Check className="w-5 h-5 text-[#C41E3A]" />}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* 支付方式 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="text-[14px] font-medium text-[#2C2C2C] mb-3">支付方式</h3>
          <div className="space-y-2">
            {payMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setPayMethod(method.id)}
                className={cn(
                  "w-full p-3 rounded-lg border-2 transition-all flex items-center justify-between",
                  payMethod === method.id ? "border-[#C41E3A] bg-[#C41E3A]/5" : "border-[#E8E3DB]"
                )}
              >
                <div className="flex items-center gap-3">
                  <method.icon className={cn("w-6 h-6", method.color)} />
                  <span className="text-[14px] text-[#2C2C2C]">{method.name}</span>
                </div>
                {payMethod === method.id && <Check className="w-5 h-5 text-[#C41E3A]" />}
              </button>
            ))}
          </div>
        </div>

        {/* 价格明细 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="text-[14px] font-medium text-[#2C2C2C] mb-3">价格明细</h3>
          <div className="space-y-2 text-[14px]">
            <div className="flex justify-between">
              <span className="text-[#666666]">课程原价</span>
              <span className="text-[#2C2C2C]">¥{priceResult?.originalPrice || course.price}</span>
            </div>
            {priceResult?.discountAmount ? (
              <div className="flex justify-between text-[#C41E3A]">
                <span>优惠券抵扣</span>
                <span>-¥{priceResult.discountAmount}</span>
              </div>
            ) : null}
            <div className="pt-2 border-t border-[#F2EFEA] flex justify-between items-baseline">
              <span className="text-[#666666]">实付金额</span>
              <span className="text-[24px] font-bold text-[#C41E3A]">¥{priceResult?.finalPrice || course.price}</span>
            </div>
          </div>
        </div>

        {/* 用户协议 */}
        <div className="flex items-start gap-2 px-1">
          <button
            onClick={() => setAgreed(!agreed)}
            className={cn(
              "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors",
              agreed ? "bg-[#C41E3A] border-[#C41E3A]" : "border-[#CCCCCC]"
            )}
          >
            {agreed && <Check className="w-3 h-3 text-white" />}
          </button>
          <p className="text-[12px] text-[#999999] leading-relaxed">
            我已阅读并同意
            <Link href="/policy/user-agreement" className="text-[#C41E3A]">《用户协议》</Link>
            和
            <Link href="/policy/privacy-policy" className="text-[#C41E3A]">《隐私政策》</Link>
            ，购买后不支持退款
          </p>
        </div>
      </div>

      {/* 底部支付栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E3DB] p-4 safe-area-pb">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-baseline gap-1">
              <span className="text-[12px] text-[#666666]">实付</span>
              <span className="text-[10px] text-[#C41E3A]">¥</span>
              <span className="text-[24px] font-bold text-[#C41E3A]">{priceResult?.finalPrice || course.price}</span>
            </div>
            {priceResult?.discountAmount ? (
              <p className="text-[11px] text-[#999999]">已优惠 ¥{priceResult.discountAmount}</p>
            ) : null}
          </div>
          <button
            onClick={handleSubmit}
            disabled={!agreed || isSubmitting}
            className={cn(
              "px-8 py-3 rounded-full text-[16px] font-bold transition-all flex items-center gap-2",
              agreed && !isSubmitting
                ? "bg-gradient-to-r from-[#C41E3A] to-[#E74C3C] text-white shadow-lg"
                : "bg-[#CCCCCC] text-white cursor-not-allowed"
            )}
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                处理中...
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                确认支付
              </>
            )}
          </button>
        </div>
      </div>

      <BindPaymentDialog
        open={showBindDialog}
        onClose={() => setShowBindDialog(false)}
        channel={payMethod as PaymentChannel}
      />
    </div>
  )
}

export default function PurchaseConfirmPage() {
  return (
    <Suspense fallback={<PurchaseSkeleton />}>
      <PurchaseConfirmContent />
    </Suspense>
  )
}
