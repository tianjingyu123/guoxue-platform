"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { BackButton } from "@/components/common/back-button"
import { Zap, Flame, ChevronRight, ShieldCheck } from "lucide-react"

// 模拟秒杀场次数据
const seckillSessions = [
  { id: 1, time: "10:00", status: "ended" as const, label: "已结束" },
  { id: 2, time: "14:00", status: "ongoing" as const, label: "抢购中" },
  { id: 3, time: "20:00", status: "upcoming" as const, label: "即将开始" },
  { id: 4, time: "22:00", status: "upcoming" as const, label: "即将开始" },
]

// 模拟秒杀商品数据
const seckillProducts = [
  { id: 1, name: "开光貔貅摆件·招财进宝", seckillPrice: 99, originalPrice: 299, soldPercent: 85, stock: 15, image: "/marketing/pixiu.png" },
  { id: 2, name: "八字命理精讲课程·名师亲授", seckillPrice: 49, originalPrice: 199, soldPercent: 72, stock: 28, image: "/marketing/course.png" },
  { id: 3, name: "天然紫水晶七星阵", seckillPrice: 168, originalPrice: 399, soldPercent: 45, stock: 55, image: "/marketing/crystal.png" },
  { id: 4, name: "风水罗盘专业版·铜制", seckillPrice: 188, originalPrice: 468, soldPercent: 38, stock: 62, image: "/marketing/luopan.png" },
  { id: 5, name: "六爻预测入门课·零基础", seckillPrice: 29, originalPrice: 99, soldPercent: 92, stock: 8, image: "/marketing/course.png" },
  { id: 6, name: "转运葫芦挂件套装", seckillPrice: 58, originalPrice: 128, soldPercent: 65, stock: 35, image: "/marketing/hulu.png" },
]

// 倒计时Hook
function useCountdown(endTime: Date) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const calculate = () => {
      const diff = endTime.getTime() - Date.now()
      if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0 }
      return {
        hours: Math.floor(diff / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      }
    }
    setTimeLeft(calculate())
    const timer = setInterval(() => setTimeLeft(calculate()), 1000)
    return () => clearInterval(timer)
  }, [endTime])

  return timeLeft
}

const padZero = (n: number) => n.toString().padStart(2, "0")
const discountOf = (s: number, o: number) => ((s / o) * 10).toFixed(1)

// 印章式倒计时数字盒
function TimeBox({ value }: { value: number }) {
  return (
    <span className="min-w-[2rem] px-1.5 py-1 bg-ink text-gold text-lg font-mono font-bold rounded-md text-center tabular-nums shadow-inner">
      {padZero(value)}
    </span>
  )
}

export default function SeckillPage() {
  const [activeSession, setActiveSession] = useState(2)

  const endTime = useMemo(() => new Date(Date.now() + 2 * 60 * 60 * 1000), [])
  const { hours, minutes, seconds } = useCountdown(endTime)

  const currentSession = seckillSessions.find((s) => s.id === activeSession)
  const isOngoing = currentSession?.status === "ongoing"

  const [hero, ...rest] = seckillProducts

  return (
    <div className="min-h-screen bg-surface-base max-w-lg mx-auto">
      {/* 顶部导航 + 倒计时 */}
      <header className="sticky top-0 z-50 bg-gradient-to-br from-[#a01830] via-brand to-brand-soft">
        <div className="flex items-center justify-between px-4 h-12">
          <BackButton overlay fallbackPath="/discover" />
          <h1 className="font-serif font-bold text-primary-foreground flex items-center gap-1.5 text-base">
            <Zap className="w-5 h-5 text-gold fill-gold" />
            限时秒杀
          </h1>
          <div className="w-9" />
        </div>

        {/* 大倒计时 */}
        <div className="px-4 pb-4 flex items-center justify-center gap-2.5">
          <span className="text-primary-foreground/85 text-sm font-medium">
            {isOngoing ? "距本场结束" : "距下场开始"}
          </span>
          <div className="flex items-center gap-1">
            <TimeBox value={hours} />
            <span className="text-gold font-bold">:</span>
            <TimeBox value={minutes} />
            <span className="text-gold font-bold">:</span>
            <TimeBox value={seconds} />
          </div>
        </div>
      </header>

      {/* 场次选择 */}
      <div className="sticky top-[100px] z-40 bg-surface border-b border-line">
        <div className="flex overflow-x-auto scrollbar-hide">
          {seckillSessions.map((session) => (
            <button
              key={session.id}
              onClick={() => setActiveSession(session.id)}
              className={cn(
                "flex-shrink-0 flex flex-col items-center py-2.5 px-6 transition-colors relative",
                activeSession === session.id ? "text-brand" : "text-ink-faint",
              )}
            >
              <span className="text-lg font-bold tabular-nums">{session.time}</span>
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0 mt-0.5 rounded-full font-medium",
                  session.status === "ongoing"
                    ? "bg-brand text-primary-foreground"
                    : session.status === "upcoming"
                      ? "bg-brand/10 text-brand"
                      : "bg-muted text-ink-faint",
                )}
              >
                {session.label}
              </span>
              {activeSession === session.id && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-brand rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      <main className="p-4 pb-24 space-y-3">
        {/* 头部主推大卡 */}
        <Link href={`/mall/product/${hero.id}`} className="block">
          <div className="relative rounded-2xl overflow-hidden bg-surface card-shadow border border-gold/30">
            <div className="absolute top-0 left-0 z-10 flex items-center gap-1 bg-gradient-to-r from-[#a01830] to-brand text-primary-foreground text-xs font-bold pl-2.5 pr-4 py-1 rounded-br-2xl">
              <Flame className="w-3.5 h-3.5 text-gold fill-gold" />
              今日主推
            </div>
            <div className="aspect-[16/9] bg-secondary overflow-hidden">
              <img src={hero.image || "/placeholder.svg"} alt={hero.name} className="w-full h-full object-cover" />
            </div>
            <div className="p-4">
              <h2 className="font-serif font-bold text-lg text-ink line-clamp-1">{hero.name}</h2>
              <div className="mt-2 flex items-end justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm text-brand font-medium">秒杀价</span>
                  <span className="text-3xl text-brand font-bold leading-none">
                    <span className="text-lg align-top">¥</span>
                    {hero.seckillPrice}
                  </span>
                  <span className="text-sm text-ink-faint line-through">¥{hero.originalPrice}</span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-gold/15 text-[11px] font-bold text-gold border border-gold/30">
                  {discountOf(hero.seckillPrice, hero.originalPrice)}折
                </span>
              </div>
              {/* 进度条 */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="flex items-center gap-1 text-brand font-medium">
                    <Flame className="w-3 h-3" />
                    已抢 {hero.soldPercent}%
                  </span>
                  <span className="text-ink-faint">仅剩 {hero.stock} 件</span>
                </div>
                <div className="h-2 bg-brand/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand to-brand-soft rounded-full transition-all"
                    style={{ width: `${hero.soldPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* 商品列表 */}
        {rest.map((product) => {
          const isSoldOut = product.soldPercent >= 100
          const lowStock = product.stock <= 10

          return (
            <div key={product.id} className="bg-surface rounded-2xl card-shadow overflow-hidden">
              <div className="flex p-3 gap-3">
                <Link
                  href={`/mall/product/${product.id}`}
                  className="w-28 h-28 rounded-xl bg-secondary flex-shrink-0 relative overflow-hidden"
                >
                  <img src={product.image || "/placeholder.svg"} alt={product.name} className="w-full h-full object-cover" />
                  {/* 折扣金印 */}
                  <div className="absolute top-1.5 left-1.5 flex flex-col items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-gold to-[#b8985f] text-[9px] font-bold leading-tight text-ink shadow">
                    <span className="text-[11px]">{discountOf(product.seckillPrice, product.originalPrice)}</span>
                    <span>折</span>
                  </div>
                </Link>

                <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
                  <div>
                    <Link href={`/mall/product/${product.id}`}>
                      <h3 className="font-medium text-sm text-ink line-clamp-2 mb-1.5 hover:text-brand transition-colors">
                        {product.name}
                      </h3>
                    </Link>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl text-brand font-bold leading-none">
                        <span className="text-sm align-top">¥</span>
                        {product.seckillPrice}
                      </span>
                      <span className="text-xs text-ink-faint line-through">¥{product.originalPrice}</span>
                    </div>
                  </div>

                  <div className="flex items-end justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-brand font-medium">已抢{product.soldPercent}%</span>
                        <span className={cn(lowStock ? "text-danger font-medium" : "text-ink-faint")}>
                          {lowStock ? `仅剩${product.stock}件` : `剩${product.stock}件`}
                        </span>
                      </div>
                      <div className="h-1.5 bg-brand/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-brand to-brand-soft rounded-full transition-all"
                          style={{ width: `${product.soldPercent}%` }}
                        />
                      </div>
                    </div>

                    {isOngoing ? (
                      <button
                        disabled={isSoldOut}
                        className={cn(
                          "btn-shimmer relative h-9 px-5 rounded-full text-sm font-bold transition-colors whitespace-nowrap",
                          isSoldOut
                            ? "bg-muted text-ink-faint"
                            : "bg-gradient-to-r from-brand to-brand-soft text-primary-foreground",
                        )}
                      >
                        {isSoldOut ? "已抢光" : "立即抢"}
                      </button>
                    ) : (
                      <span className="h-9 px-4 rounded-full text-sm font-medium bg-gold/15 text-gold border border-gold/30 flex items-center whitespace-nowrap">
                        即将开抢
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </main>

      {/* 底部规则说明 */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-line safe-area-pb">
        <div className="max-w-lg mx-auto px-4 py-2.5 flex items-center justify-between text-xs text-ink-faint">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-gold" />
            正品保障 · 每人每件限购1件
          </span>
          <Link href="/seckill/rules" className="flex items-center text-brand font-medium">
            活动规则
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  )
}
