"use client"

import { useState } from "react"
import { BackButton } from "@/components/common/back-button"
import { Ticket, Gift } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

// 模拟优惠券数据
const couponsData = {
  available: [
    { id: 1, amount: 10, type: "满减券", condition: "满99元可用", scope: "全部商品", expireDate: "2026.12.31", isPercent: false },
    { id: 2, amount: 50, type: "满减券", condition: "满299元可用", scope: "全部课程", expireDate: "2026.06.30", isPercent: false },
    { id: 3, amount: 8, type: "折扣券", condition: "无门槛", scope: "指定商品", expireDate: "2026.03.15", isPercent: true },
    { id: 4, amount: 5, type: "无门槛券", condition: "无门槛", scope: "全部商品", expireDate: "2026.02.28", isPercent: false },
  ],
  used: [
    { id: 5, amount: 20, type: "满减券", condition: "满199元可用", scope: "全部商品", expireDate: "2026.01.15", isPercent: false, usedDate: "2026.01.10" },
    { id: 6, amount: 100, type: "满减券", condition: "满599元可用", scope: "全部课程", expireDate: "2025.12.31", isPercent: false, usedDate: "2025.12.25" },
  ],
  expired: [
    { id: 7, amount: 15, type: "满减券", condition: "满149元可用", scope: "全部商品", expireDate: "2025.11.30", isPercent: false },
    { id: 8, amount: 30, type: "满减券", condition: "满249元可用", scope: "指定圈子", expireDate: "2025.10.15", isPercent: false },
  ],
}

const tabs = [
  { id: "available", label: "可用", count: couponsData.available.length },
  { id: "used", label: "已使用", count: couponsData.used.length },
  { id: "expired", label: "已过期", count: couponsData.expired.length },
]

// 按券类型差异化主题
const couponThemes: Record<string, { block: string; value: string; cond: string; tag: string; btn: string }> = {
  满减券: {
    block: "bg-gradient-to-br from-brand to-brand-soft",
    value: "text-primary-foreground",
    cond: "text-primary-foreground/85",
    tag: "border-brand/30 text-brand bg-brand/5",
    btn: "bg-brand text-primary-foreground",
  },
  折扣券: {
    block: "bg-gradient-to-br from-gold to-[#b8985f]",
    value: "text-ink",
    cond: "text-ink/75",
    tag: "border-gold/40 text-gold bg-gold/10",
    btn: "bg-gold text-ink",
  },
  无门槛券: {
    block: "bg-gradient-to-br from-success to-[#3fa514]",
    value: "text-primary-foreground",
    cond: "text-primary-foreground/85",
    tag: "border-success/30 text-success bg-success/5",
    btn: "bg-success text-primary-foreground",
  },
}

interface CouponCardProps {
  coupon: {
    id: number
    amount: number
    type: string
    condition: string
    scope: string
    expireDate: string
    isPercent: boolean
    usedDate?: string
  }
  status: "available" | "used" | "expired"
}

function CouponCard({ coupon, status }: CouponCardProps) {
  const isDisabled = status !== "available"
  const theme = couponThemes[coupon.type] ?? couponThemes["满减券"]

  return (
    <div className={cn("relative flex rounded-2xl overflow-hidden card-shadow bg-surface", isDisabled && "opacity-70")}>
      {/* 左侧金额区 */}
      <div
        className={cn(
          "w-28 flex-shrink-0 flex flex-col items-center justify-center py-6 px-2 relative",
          isDisabled ? "bg-muted" : theme.block,
        )}
      >
        <div className={cn("font-bold leading-none", isDisabled ? "text-ink-faint" : theme.value)}>
          {coupon.isPercent ? (
            <span className="text-4xl">
              {coupon.amount}
              <span className="text-lg">折</span>
            </span>
          ) : (
            <span className="text-4xl">
              <span className="text-xl align-top">¥</span>
              {coupon.amount}
            </span>
          )}
        </div>
        <p className={cn("text-xs mt-1.5 text-center", isDisabled ? "text-ink-faint" : theme.cond)}>{coupon.condition}</p>
      </div>

      {/* 票券剪口 + 虚线分隔 */}
      <div className="relative w-0">
        <span className="absolute -top-2 -left-2 w-4 h-4 rounded-full bg-surface-base" />
        <span className="absolute -bottom-2 -left-2 w-4 h-4 rounded-full bg-surface-base" />
        <span className="absolute top-3 bottom-3 left-0 border-l border-dashed border-line" />
      </div>

      {/* 右侧信息区 */}
      <div className="flex-1 p-4 pl-5 relative min-w-0">
        <span
          className={cn(
            "absolute top-3 right-3 text-[10px] px-1.5 py-0.5 rounded border font-medium",
            isDisabled ? "border-line text-ink-faint" : theme.tag,
          )}
        >
          {coupon.type}
        </span>

        <h3 className={cn("font-medium text-sm pr-14", isDisabled ? "text-ink-faint" : "text-ink")}>{coupon.scope}</h3>

        <p className="text-xs mt-2 text-ink-faint">有效期至 {coupon.expireDate}</p>

        {status === "available" && (
          <Link
            href="/mall"
            className={cn(
              "mt-3 inline-block px-4 py-1.5 text-xs font-medium rounded-full transition-opacity hover:opacity-90",
              theme.btn,
            )}
          >
            立即使用
          </Link>
        )}

        {status === "used" && coupon.usedDate && (
          <p className="text-xs text-ink-faint mt-2">使用时间：{coupon.usedDate}</p>
        )}
      </div>

      {/* 已使用/已过期水印 */}
      {isDisabled && (
        <div className="absolute top-1/2 right-6 -translate-y-1/2 rotate-[-15deg] pointer-events-none">
          <span className={cn("text-2xl font-bold opacity-20", status === "used" ? "text-ink-faint" : "text-danger")}>
            {status === "used" ? "已使用" : "已过期"}
          </span>
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
        <Ticket className="w-10 h-10 text-ink-faint" />
      </div>
      <p className="text-ink-faint mb-4">暂无优惠券</p>
      <Link
        href="/coupons/center"
        className="px-6 py-2 bg-brand text-primary-foreground text-sm font-medium rounded-full hover:opacity-90 transition-opacity"
      >
        去领券中心看看
      </Link>
    </div>
  )
}

export default function CouponsPage() {
  const [activeTab, setActiveTab] = useState("available")

  const getCurrentCoupons = () => {
    switch (activeTab) {
      case "available":
        return couponsData.available
      case "used":
        return couponsData.used
      case "expired":
        return couponsData.expired
      default:
        return []
    }
  }

  const currentCoupons = getCurrentCoupons()

  return (
    <div className="min-h-screen bg-surface-base max-w-lg mx-auto">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-surface/95 backdrop-blur-lg border-b border-line">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton fallbackPath="/profile" />
          <h1 className="font-semibold text-base text-ink">优惠券</h1>
          <div className="w-9" />
        </div>

        {/* Tab栏 */}
        <div className="flex items-center border-b border-line">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 py-3 text-sm font-medium relative transition-colors",
                activeTab === tab.id ? "text-brand" : "text-ink-faint hover:text-ink",
              )}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={cn("ml-1", activeTab === tab.id ? "text-brand" : "text-ink-faint")}>({tab.count})</span>
              )}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-brand rounded-full" />
              )}
            </button>
          ))}
        </div>
      </header>

      {/* 优惠券列表 */}
      <main className="p-4 pb-24 space-y-3">
        {currentCoupons.length > 0 ? (
          currentCoupons.map((coupon) => (
            <CouponCard key={coupon.id} coupon={coupon} status={activeTab as "available" | "used" | "expired"} />
          ))
        ) : (
          <EmptyState />
        )}
      </main>

      {/* 底部领券中心入口 */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-lg border-t border-line safe-area-pb">
        <div className="max-w-lg mx-auto px-4 py-3">
          <Link
            href="/coupons/center"
            className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-brand to-brand-soft text-primary-foreground font-medium rounded-xl hover:opacity-90 transition-opacity"
          >
            <Gift className="w-5 h-5 text-gold" />
            领券中心
          </Link>
        </div>
      </div>
    </div>
  )
}
