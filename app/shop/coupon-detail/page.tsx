"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, Copy, CheckCircle2, ShoppingBag, BookOpen } from "lucide-react"

interface ApplicableItem {
  id: string
  type: 'product' | 'course'
  name: string
  image: string
  price: number
}

function CouponDetailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [copied, setCopied] = useState(false)

  const couponId = searchParams.get('id')

  // Mock数据
  const coupon = {
    id: couponId || '1',
    name: '新人立减50元',
    type: 'amount',
    value: 50,
    minAmount: 200,
    expireAt: '2024-12-31',
    description: '新用户首次下单享受优惠，满200元减50元',
    rules: [
      '新用户首次购物订单享受',
      '单笔订单满200元可使用',
      '不与其他优惠叠加使用',
      '仅限商品购买，不适用课程',
    ],
  }

  const applicableItems: ApplicableItem[] = [
    { id: '1', type: 'product', name: '周易六十四卦详解（精装典藏版）', image: '/placeholder.svg', price: 298 },
    { id: '2', type: 'product', name: '紫微斗数入门教程', image: '/placeholder.svg', price: 128 },
    { id: '3', type: 'course', name: '八字基础入门课', image: '/placeholder.svg', price: 299 },
    { id: '4', type: 'product', name: '易经风水运势解读', image: '/placeholder.svg', price: 188 },
  ]

  const handleCopy = () => {
    navigator.clipboard.writeText(coupon.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleUse = () => {
    router.push('/shop')
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 导航栏 */}
      <div className="sticky top-0 z-20 bg-white border-b border-[#E8E3DB] px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 -ml-2">
          <ChevronLeft size={24} className="text-[#2C2C2C]" />
        </button>
        <span className="text-lg font-semibold text-[#2C2C2C]">优惠券详情</span>
      </div>

      <div className="p-4">
        {/* 优惠券大卡片 */}
        <div className="bg-gradient-to-r from-[#C41E3A] to-[#E74C57] rounded-2xl p-6 text-white mb-6 shadow-lg">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-4xl font-bold">{coupon.value}</div>
              <div className="text-sm mt-1 opacity-90">元</div>
            </div>
            <div className="text-right text-sm">
              <div>满{coupon.minAmount}元可用</div>
              <div className="opacity-90 text-xs mt-1">至 {coupon.expireAt}</div>
            </div>
          </div>
          <div className="border-t border-white border-opacity-30 pt-3 text-sm">{coupon.description}</div>
        </div>

        {/* 优惠券代码 */}
        <div className="bg-white rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-[#999999] mb-2">优惠券代码</div>
              <div className="font-mono text-lg text-[#2C2C2C] font-semibold">{coupon.id}</div>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 bg-[#C41E3A] text-white rounded-lg active:opacity-80"
            >
              {copied ? (
                <>
                  <CheckCircle2 size={16} />
                  <span className="text-sm">已复制</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span className="text-sm">复制</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 使用说明 */}
        <div className="bg-white rounded-2xl p-4 mb-6">
          <div className="font-semibold text-[#2C2C2C] mb-4">使用说明</div>
          <div className="space-y-3">
            {coupon.rules.map((rule, idx) => (
              <div key={idx} className="flex gap-3 text-sm">
                <div className="text-[#C41E3A] font-semibold flex-shrink-0">•</div>
                <div className="text-[#666666]">{rule}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 适用商品 */}
        <div className="mb-6">
          <div className="bg-white rounded-t-2xl p-4 border-b border-[#E8E3DB]">
            <div className="font-semibold text-[#2C2C2C]">适用商品/课程</div>
          </div>
          <div className="bg-white rounded-b-2xl divide-y divide-[#E8E3DB]">
            {applicableItems.map((item) => (
              <button
                key={item.id}
                onClick={() => router.push(item.type === 'product' ? `/shop/${item.id}` : `/courses/${item.id}`)}
                className="w-full p-4 flex gap-3 hover:bg-[#F5F5F5] transition-colors text-left active:opacity-70"
              >
                <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {item.type === 'product' ? (
                      <ShoppingBag size={14} className="text-[#999999] flex-shrink-0" />
                    ) : (
                      <BookOpen size={14} className="text-[#C9A96E] flex-shrink-0" />
                    )}
                    <span className="text-xs text-[#999999]">
                      {item.type === 'product' ? '商品' : '课程'}
                    </span>
                  </div>
                  <div className="font-medium text-[#2C2C2C] line-clamp-2 text-sm mb-1">{item.name}</div>
                  <div className="text-[#C41E3A] font-semibold">￥{item.price}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 底部按钮 */}
        <button
          onClick={handleUse}
          className="w-full bg-gradient-to-r from-[#C41E3A] to-[#E74C57] text-white font-semibold py-4 rounded-2xl active:opacity-90 mb-8"
        >
          立即使用
        </button>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="sticky top-0 z-20 bg-white border-b border-[#E8E3DB] px-4 py-3 h-14" />
      <div className="p-4 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl h-32 animate-pulse" />
        ))}
      </div>
    </div>
  )
}

export default function CouponDetailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CouponDetailContent />
    </Suspense>
  )
}
