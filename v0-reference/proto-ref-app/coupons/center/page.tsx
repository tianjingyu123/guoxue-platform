"use client"

import { useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { BackButton } from "@/components/common/back-button"
import { Gift, Crown, Coins, Check, Clock } from "lucide-react"

type CouponType = "满减" | "折扣" | "无门槛"

// 券类型 → 品牌色体系（满减=故宫红 / 折扣=珠宝金 / 无门槛=吉利绿）
const typeStyles: Record<CouponType, { accent: string; text: string; badgeBg: string; badgeText: string }> = {
  满减: { accent: "bg-primary", text: "text-primary", badgeBg: "bg-primary/10", badgeText: "text-primary" },
  折扣: { accent: "bg-gold", text: "text-gold", badgeBg: "bg-gold/15", badgeText: "text-gold" },
  无门槛: { accent: "bg-success", text: "text-success", badgeBg: "bg-success/10", badgeText: "text-success" },
}

const tagStyles: Record<string, string> = {
  热门: "bg-primary text-primary-foreground",
  限时: "bg-gold text-gold-foreground",
  新人: "bg-success text-success-foreground",
}

// 模拟可领取优惠券数据
const availableCoupons = [
  { id: 1, amount: 50, type: "满减" as CouponType, minAmount: 299, scope: "全部课程", startDate: "2026.05.10", endDate: "2026.06.30", tag: "热门" },
  { id: 2, amount: 20, type: "满减" as CouponType, minAmount: 99, scope: "全部商品", startDate: "2026.05.10", endDate: "2026.05.31", tag: "限时" },
  { id: 3, amount: 8, type: "折扣" as CouponType, scope: "指定课程", startDate: "2026.05.10", endDate: "2026.06.15", tag: "" },
  { id: 4, amount: 10, type: "无门槛" as CouponType, scope: "全部商品", startDate: "2026.05.10", endDate: "2026.05.20", tag: "新人" },
  { id: 5, amount: 100, type: "满减" as CouponType, minAmount: 599, scope: "精品课程", startDate: "2026.05.10", endDate: "2026.07.31", tag: "" },
]

// 积分兑换券
const pointsCoupons = [
  { id: 101, amount: 5, type: "无门槛" as CouponType, scope: "全部商品", points: 500 },
  { id: 102, amount: 15, type: "满减" as CouponType, minAmount: 99, scope: "全部商品", points: 1000 },
  { id: 103, amount: 30, type: "满减" as CouponType, minAmount: 199, scope: "全部课程", points: 2000 },
]

// 会员专属券
const vipCoupons = [
  { id: 201, amount: 88, type: "满减" as CouponType, minAmount: 388, scope: "全场通用", vipLevel: 2 },
  { id: 202, amount: 9, type: "折扣" as CouponType, scope: "精品课程", vipLevel: 3 },
]

function CouponValue({ type, amount, size = "md" }: { type: CouponType; amount: number; size?: "md" | "sm" }) {
  const isDiscount = type === "折扣"
  const big = size === "md" ? "text-2xl" : "text-xl"
  return isDiscount ? (
    <div className="flex items-baseline">
      <span className={cn(big, "font-bold")}>{amount}</span>
      <span className="text-sm font-bold">折</span>
    </div>
  ) : (
    <div className="flex items-baseline">
      <span className="text-sm font-bold">¥</span>
      <span className={cn(big, "font-bold")}>{amount}</span>
    </div>
  )
}

export default function CouponCenterPage() {
  const [receivedIds, setReceivedIds] = useState<number[]>([])
  const [activeTab, setActiveTab] = useState<"all" | "course" | "product" | "points">("all")

  const userPoints = 1580
  const userVipLevel = 1

  const handleReceive = (id: number) => {
    if (!receivedIds.includes(id)) setReceivedIds([...receivedIds, id])
  }

  const filteredCoupons = availableCoupons.filter(coupon => {
    if (activeTab === "all") return true
    if (activeTab === "course") return coupon.scope.includes("课程")
    if (activeTab === "product") return coupon.scope.includes("商品")
    return true
  })

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      {/* 顶部品牌渐变 */}
      <header className="sticky top-0 z-50 bg-gradient-to-br from-[#a01830] via-primary to-primary text-primary-foreground">
        <div className="flex items-center justify-between px-4 h-12">
          <BackButton fallbackPath="/coupons" iconClassName="text-primary-foreground" />
          <h1 className="font-bold flex items-center gap-2">
            <Gift className="w-5 h-5 text-gold" />
            领券中心
          </h1>
          <Link href="/coupons" className="text-xs text-primary-foreground/90">我的券</Link>
        </div>

        {/* 积分入口 */}
        <div className="px-4 pb-4">
          <Card className="bg-primary-foreground/10 border-primary-foreground/20 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                  <Coins className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="text-primary-foreground/70 text-xs">我的积分</p>
                  <p className="text-xl font-bold text-primary-foreground">{userPoints}</p>
                </div>
              </div>
              <Button size="sm" className="bg-gold text-gold-foreground hover:bg-gold/90 border-0">
                兑换礼品
              </Button>
            </div>
          </Card>
        </div>
      </header>

      {/* Tab切换 */}
      <div className="sticky top-[124px] z-40 bg-background border-b border-border">
        <div className="flex">
          {[
            { key: "all", label: "全部" },
            { key: "course", label: "课程券" },
            { key: "product", label: "商品券" },
            { key: "points", label: "积分兑" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={cn(
                "flex-1 py-3 text-sm font-medium relative transition-colors",
                activeTab === tab.key ? "text-primary" : "text-muted-foreground"
              )}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区 */}
      <main className="p-4 pb-24 space-y-4">
        {activeTab === "points" ? (
          <>
            <div className="text-sm text-muted-foreground mb-2">可用积分：{userPoints}</div>
            <div className="space-y-3">
              {pointsCoupons.map((coupon) => {
                const canExchange = userPoints >= coupon.points
                const isReceived = receivedIds.includes(coupon.id)
                const style = typeStyles[coupon.type]
                return (
                  <Card key={coupon.id} className="p-3 flex items-center gap-3">
                    <div className={cn("w-16 h-16 rounded-lg flex flex-col items-center justify-center text-primary-foreground", style.accent)}>
                      <CouponValue type={coupon.type} amount={coupon.amount} size="sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{coupon.scope}</h4>
                      <p className="text-xs text-muted-foreground">
                        {coupon.minAmount ? `满${coupon.minAmount}可用` : "无门槛"}
                      </p>
                      <p className="text-xs text-gold mt-1 flex items-center gap-1">
                        <Coins className="w-3 h-3" />
                        {coupon.points} 积分
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={canExchange && !isReceived ? "default" : "outline"}
                      disabled={!canExchange || isReceived}
                      onClick={() => handleReceive(coupon.id)}
                      className="h-8 px-3 text-xs"
                    >
                      {isReceived ? <><Check className="w-3 h-3 mr-1" />已兑换</> : canExchange ? "兑换" : "积分不足"}
                    </Button>
                  </Card>
                )
              })}
            </div>

            {/* 会员专属券 */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="w-4 h-4 text-gold" />
                <span className="font-bold text-sm">会员专属券</span>
              </div>
              <div className="space-y-3">
                {vipCoupons.map((coupon) => {
                  const canGet = userVipLevel >= coupon.vipLevel
                  const isReceived = receivedIds.includes(coupon.id)
                  return (
                    <Card key={coupon.id} className={cn("p-3 relative overflow-hidden border-gold/40", !canGet && "opacity-60")}>
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-gold to-[#b8965a] flex flex-col items-center justify-center text-gold-foreground">
                          <CouponValue type={coupon.type} amount={coupon.amount} size="sm" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{coupon.scope}</h4>
                          <p className="text-xs text-muted-foreground">
                            {coupon.minAmount ? `满${coupon.minAmount}可用` : "无门槛"}
                          </p>
                          <Badge className="mt-1 text-[10px] px-1.5 py-0 bg-gold text-gold-foreground border-0 flex items-center gap-0.5 w-fit">
                            <Crown className="w-2.5 h-2.5" />VIP{coupon.vipLevel}专享
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant={canGet && !isReceived ? "default" : "outline"}
                          disabled={!canGet || isReceived}
                          onClick={() => handleReceive(coupon.id)}
                          className="h-8 px-3 text-xs"
                        >
                          {isReceived ? <><Check className="w-3 h-3 mr-1" />已领取</> : canGet ? "领取" : `需VIP${coupon.vipLevel}`}
                        </Button>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          </>
        ) : (
          // 普通优惠券列表
          <div className="space-y-3">
            {filteredCoupons.map((coupon) => {
              const isReceived = receivedIds.includes(coupon.id)
              const style = typeStyles[coupon.type]
              return (
                <div key={coupon.id} className="relative overflow-hidden rounded-xl h-24 shadow-sm">
                  {/* 左侧色块背景 */}
                  <div className={cn("absolute inset-y-0 left-0 w-[32%]", style.accent)} />

                  {/* 剪口 */}
                  <div className="absolute left-[32%] top-0 bottom-0 -translate-x-1/2 flex flex-col justify-around py-1 z-10">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="w-3 h-3 rounded-full bg-background" />
                    ))}
                  </div>

                  <div className="relative h-full flex">
                    {/* 左侧金额 */}
                    <div className="w-[32%] flex flex-col items-center justify-center text-primary-foreground">
                      <CouponValue type={coupon.type} amount={coupon.amount} />
                      <p className="text-[10px] text-primary-foreground/80 mt-0.5">
                        {coupon.minAmount ? `满${coupon.minAmount}可用` : "无门槛"}
                      </p>
                    </div>

                    {/* 右侧信息 */}
                    <div className="flex-1 flex items-center justify-between pl-6 pr-4 bg-card border border-l-0 border-border rounded-r-xl">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border-0", style.badgeBg, style.badgeText)}>
                            {coupon.type}券
                          </Badge>
                          {coupon.tag && (
                            <Badge className={cn("text-[10px] px-1.5 py-0 border-0", tagStyles[coupon.tag] || "bg-primary text-primary-foreground")}>
                              {coupon.tag}
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-medium text-sm mb-0.5">{coupon.scope}</h4>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {coupon.startDate} - {coupon.endDate}
                        </p>
                      </div>

                      {isReceived ? (
                        <Button size="sm" variant="outline" className={cn("h-8 px-4 text-xs border-current", style.text)}>
                          去使用
                        </Button>
                      ) : (
                        <Button size="sm" className={cn("h-8 px-4 text-xs text-primary-foreground border-0", style.accent)} onClick={() => handleReceive(coupon.id)}>
                          领取
                        </Button>
                      )}
                    </div>
                  </div>

                  {isReceived && (
                    <div className="absolute top-2 right-2 z-20">
                      <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center">
                        <Check className="w-4 h-4 text-success-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
