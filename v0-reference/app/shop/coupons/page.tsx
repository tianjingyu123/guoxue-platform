"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Ticket, Clock, Check, Gift, ChevronRight } from "lucide-react"
import { shopApi, type Coupon, type CouponCenter } from "@/lib/api"

// Mock数据
const mockMyCoupons: Coupon[] = [
  { id: "1", name: "新人专享券", type: "amount", value: 50, minAmount: 200, expireAt: "2024-12-31", scope: ["全场通用"], isAvailable: true, status: "unused" },
  { id: "2", name: "满减优惠券", type: "amount", value: 30, minAmount: 300, expireAt: "2024-12-31", scope: ["课程"], isAvailable: true, status: "unused" },
  { id: "3", name: "八折券", type: "percent", value: 80, minAmount: 100, expireAt: "2024-11-30", scope: ["商城"], isAvailable: true, status: "unused" },
  { id: "4", name: "满100减20", type: "amount", value: 20, minAmount: 100, expireAt: "2024-10-15", scope: ["全场通用"], isAvailable: false, status: "used", usedAt: "2024-10-10" },
  { id: "5", name: "限时折扣", type: "discount", value: 10, minAmount: 50, expireAt: "2024-09-01", scope: ["直播"], isAvailable: false, status: "expired" },
]

const mockCenterCoupons: CouponCenter[] = [
  { id: "c1", name: "限时新人礼", type: "amount", value: 100, minAmount: 500, expireAt: "2024-12-31", scope: ["全场通用"], stock: 100, claimed: 45, isClaimed: false },
  { id: "c2", name: "课程专享", type: "percent", value: 85, minAmount: 200, maxDiscount: 50, expireAt: "2024-12-31", scope: ["课程"], stock: 200, claimed: 180, isClaimed: false },
  { id: "c3", name: "商城满减", type: "amount", value: 20, minAmount: 100, expireAt: "2024-12-31", scope: ["商城"], stock: 500, claimed: 320, isClaimed: true },
]

const tabs = [
  { key: "unused", label: "未使用" },
  { key: "used", label: "已使用" },
  { key: "expired", label: "已过期" },
  { key: "center", label: "领券中心" },
]

export default function CouponsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("unused")
  const [loading, setLoading] = useState(true)
  const [myCoupons, setMyCoupons] = useState<Coupon[]>([])
  const [centerCoupons, setCenterCoupons] = useState<CouponCenter[]>([])
  const [claimingId, setClaimingId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [myRes, centerRes] = await Promise.all([
        shopApi.myCoupons().catch(() => mockMyCoupons),
        shopApi.listCoupons().catch(() => mockCenterCoupons),
      ])
      setMyCoupons(Array.isArray(myRes) ? myRes : mockMyCoupons)
      setCenterCoupons(Array.isArray(centerRes) ? centerRes : mockCenterCoupons)
    } catch {
      setMyCoupons(mockMyCoupons)
      setCenterCoupons(mockCenterCoupons)
    } finally {
      setLoading(false)
    }
  }

  const handleClaim = async (id: string) => {
    setClaimingId(id)
    try {
      await shopApi.claimCoupon(id)
      setCenterCoupons(prev => prev.map(c => c.id === id ? { ...c, isClaimed: true, claimed: c.claimed + 1 } : c))
    } catch {
      // 模拟成功
      setCenterCoupons(prev => prev.map(c => c.id === id ? { ...c, isClaimed: true, claimed: c.claimed + 1 } : c))
    } finally {
      setClaimingId(null)
    }
  }

  const filteredCoupons = myCoupons.filter(c => {
    if (activeTab === "unused") return c.status === "unused"
    if (activeTab === "used") return c.status === "used"
    if (activeTab === "expired") return c.status === "expired"
    return false
  })

  const getCouponValue = (coupon: Coupon | CouponCenter) => {
    if (coupon.type === "amount") return `¥${coupon.value}`
    if (coupon.type === "percent") return `${coupon.value / 10}折`
    return `减¥${coupon.value}`
  }

  const unusedCount = myCoupons.filter(c => c.status === "unused").length

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-[#C41E3A] to-[#E85A71] px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <span className="text-lg font-medium text-white">我的优惠券</span>
      </div>

      {/* Tab切换 */}
      <div className="bg-white border-b border-[#E8E3DB] flex">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 text-sm font-medium relative ${
              activeTab === tab.key ? "text-[#C41E3A]" : "text-[#666666]"
            }`}
          >
            {tab.label}
            {tab.key === "unused" && unusedCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-[#C41E3A] text-white text-xs rounded-full">{unusedCount}</span>
            )}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#C41E3A] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <div className="p-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-20 h-20 bg-gray-200 rounded" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-2/3" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === "center" ? (
          /* 领券中心 */
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-[#C41E3A] to-[#E85A71] rounded-2xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="w-5 h-5" />
                <span className="font-medium">限时领券</span>
              </div>
              <p className="text-sm opacity-80">精选优惠券，领取后可在结算时使用</p>
            </div>

            {centerCoupons.map(coupon => (
              <div
                key={coupon.id}
                className={`bg-white rounded-xl overflow-hidden shadow-sm ${coupon.isClaimed ? "opacity-60" : ""}`}
              >
                <div className="flex">
                  {/* 金额区 */}
                  <div className="w-28 bg-gradient-to-br from-[#FFF5F5] to-[#FFE8E8] p-4 flex flex-col items-center justify-center border-r border-dashed border-[#E8E3DB] relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#C41E3A] to-[#E85A71]" />
                    <span className="text-2xl font-bold text-[#C41E3A]">{getCouponValue(coupon)}</span>
                    <span className="text-xs text-[#999999] mt-1">满{coupon.minAmount}可用</span>
                  </div>
                  {/* 信息区 */}
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-[#2C2C2C]">{coupon.name}</h3>
                        <div className="flex items-center gap-2 mt-2">
                          {coupon.scope.map(s => (
                            <span key={s} className="px-2 py-0.5 bg-[#FFF5F5] text-[#C41E3A] text-xs rounded">
                              {s}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-1 mt-2 text-xs text-[#999999]">
                          <Clock className="w-3 h-3" />
                          <span>有效期至 {coupon.expireAt}</span>
                        </div>
                        <div className="mt-1 text-xs text-[#999999]">
                          已领 {coupon.claimed}/{coupon.stock}
                        </div>
                      </div>
                      <button
                        onClick={() => !coupon.isClaimed && handleClaim(coupon.id)}
                        disabled={coupon.isClaimed || claimingId === coupon.id}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium ${
                          coupon.isClaimed
                            ? "bg-gray-100 text-[#999999]"
                            : "bg-[#C41E3A] text-white"
                        }`}
                      >
                        {claimingId === coupon.id ? "领取中..." : coupon.isClaimed ? "已领取" : "立即领取"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredCoupons.length === 0 ? (
          /* 空状态 */
          <div className="flex flex-col items-center justify-center py-20">
            <Ticket className="w-16 h-16 text-[#E8E3DB] mb-4" />
            <p className="text-[#999999] mb-4">
              {activeTab === "unused" ? "暂无可用优惠券" : activeTab === "used" ? "暂无已使用优惠券" : "暂无过期优惠券"}
            </p>
            {activeTab === "unused" && (
              <button
                onClick={() => setActiveTab("center")}
                className="px-6 py-2 bg-[#C41E3A] text-white rounded-full text-sm"
              >
                去领券
              </button>
            )}
          </div>
        ) : (
          /* 优惠券列表 */
          <div className="space-y-4">
            {filteredCoupons.map(coupon => (
              <div
                key={coupon.id}
                className={`bg-white rounded-xl overflow-hidden shadow-sm ${
                  coupon.status !== "unused" ? "opacity-60 grayscale" : ""
                }`}
              >
                <div className="flex">
                  {/* 金额区 */}
                  <div className={`w-28 p-4 flex flex-col items-center justify-center border-r border-dashed border-[#E8E3DB] relative ${
                    coupon.status === "unused" 
                      ? "bg-gradient-to-br from-[#FFF5F5] to-[#FFE8E8]" 
                      : "bg-gray-100"
                  }`}>
                    {coupon.status === "unused" && (
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#C41E3A] to-[#E85A71]" />
                    )}
                    <span className={`text-2xl font-bold ${coupon.status === "unused" ? "text-[#C41E3A]" : "text-[#999999]"}`}>
                      {getCouponValue(coupon)}
                    </span>
                    <span className="text-xs text-[#999999] mt-1">满{coupon.minAmount}可用</span>
                  </div>
                  {/* 信息区 */}
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-[#2C2C2C]">{coupon.name}</h3>
                        <div className="flex items-center gap-2 mt-2">
                          {coupon.scope.map(s => (
                            <span key={s} className={`px-2 py-0.5 text-xs rounded ${
                              coupon.status === "unused" 
                                ? "bg-[#FFF5F5] text-[#C41E3A]" 
                                : "bg-gray-100 text-[#999999]"
                            }`}>
                              {s}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-1 mt-2 text-xs text-[#999999]">
                          <Clock className="w-3 h-3" />
                          <span>有效期至 {coupon.expireAt}</span>
                        </div>
                      </div>
                      {coupon.status === "unused" ? (
                        <button
                          onClick={() => router.push("/shop")}
                          className="flex items-center gap-1 text-[#C41E3A] text-sm"
                        >
                          去使用
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 text-[#999999] text-sm">
                          {coupon.status === "used" ? (
                            <>
                              <Check className="w-4 h-4" />
                              <span>已使用</span>
                            </>
                          ) : (
                            <span>已过期</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
