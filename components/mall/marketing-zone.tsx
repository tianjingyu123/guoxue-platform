"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Zap, Users, ChevronRight } from "lucide-react"

// 秒杀商品（截止时间用于倒计时）
const seckillItems = [
  { id: 6, title: "梅花易数入门", cover: "/images/products/book3.jpg", price: 45, originalPrice: 78 },
  { id: 1, title: "周易正义注疏本", cover: "/images/products/book1.jpg", price: 68, originalPrice: 128 },
  { id: 4, title: "黑曜石貔貅手链", cover: "/images/products/item2.jpg", price: 128, originalPrice: 258 },
]

// 拼团商品
const groupItems = [
  { id: 2, title: "紫微斗数全书（精装版）", cover: "/images/products/book2.jpg", groupPrice: 78, originalPrice: 168, joined: 2, need: 3 },
]

// 秒杀倒计时：到今晚 22:00 结束
function useCountdown(targetHour: number) {
  const [remain, setRemain] = useState(0)
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const target = new Date()
      target.setHours(targetHour, 0, 0, 0)
      if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1)
      setRemain(Math.floor((target.getTime() - now.getTime()) / 1000))
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [targetHour])
  const h = String(Math.floor(remain / 3600)).padStart(2, "0")
  const m = String(Math.floor((remain % 3600) / 60)).padStart(2, "0")
  const s = String(remain % 60).padStart(2, "0")
  return { h, m, s }
}

function TimeBlock({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded bg-foreground text-background text-[12px] font-bold tabular-nums">
      {value}
    </span>
  )
}

export function MarketingZone() {
  const { h, m, s } = useCountdown(22)

  return (
    <div className="space-y-3">
      {/* 限时秒杀 */}
      <Link
        href="/shop/flash-sale"
        className="block rounded-2xl overflow-hidden bg-card shadow-sm ring-1 ring-black/[0.04] dark:ring-white/5"
      >
        <div className="flex items-center justify-between px-3.5 py-2.5" style={{ background: "linear-gradient(90deg,#c41e3a,#e0524d)" }}>
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-white fill-white" />
            <span className="text-white font-bold text-[15px]">限时秒杀</span>
            <span className="text-white/85 text-[11px] ml-1">距结束</span>
            <span className="flex items-center gap-0.5">
              <TimeBlock value={h} />
              <span className="text-white text-[12px] font-bold">:</span>
              <TimeBlock value={m} />
              <span className="text-white text-[12px] font-bold">:</span>
              <TimeBlock value={s} />
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-white/90" />
        </div>
        <div className="flex gap-3 px-3.5 py-3 overflow-x-auto scrollbar-hide">
          {seckillItems.map((item) => {
            const off = Math.round((1 - item.price / item.originalPrice) * 100)
            return (
              <div key={item.id} className="flex-shrink-0 w-[88px]">
                <div className="relative aspect-square rounded-xl overflow-hidden bg-secondary">
                  <img src={item.cover || "/placeholder.svg"} alt={item.title} className="w-full h-full object-cover" />
                  <span className="absolute top-1 left-1 px-1 py-0.5 rounded bg-[#c41e3a] text-white text-[9px] font-bold">-{off}%</span>
                </div>
                <p className="mt-1 text-[11px] text-foreground line-clamp-1">{item.title}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-[14px] font-bold text-[#c41e3a]">¥{item.price}</span>
                  <span className="text-[10px] text-muted-foreground line-through">¥{item.originalPrice}</span>
                </div>
              </div>
            )
          })}
        </div>
      </Link>

      {/* 拼团专区 */}
      <Link
        href="/shop/group-buy"
        className="block rounded-2xl overflow-hidden bg-card shadow-sm ring-1 ring-black/[0.04] dark:ring-white/5"
      >
        <div className="flex items-center justify-between px-3.5 py-2.5" style={{ background: "linear-gradient(90deg,#d97706,#f59e0b)" }}>
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-white" />
            <span className="text-white font-bold text-[15px]">超值拼团</span>
            <span className="text-white/85 text-[11px] ml-1">人多更便宜</span>
          </div>
          <ChevronRight className="w-4 h-4 text-white/90" />
        </div>
        {groupItems.map((item) => (
          <div key={item.id} className="flex items-center gap-3 px-3.5 py-3">
            <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-secondary flex-shrink-0">
              <img src={item.cover || "/placeholder.svg"} alt={item.title} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-foreground line-clamp-1">{item.title}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-semibold dark:bg-amber-500/20 dark:text-amber-400">{item.need}人团</span>
                <span className="text-[11px] text-muted-foreground">已有 {item.joined} 人参团</span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-[16px] font-bold text-amber-600 dark:text-amber-400">¥{item.groupPrice}</span>
                <span className="text-[11px] text-muted-foreground line-through">¥{item.originalPrice}</span>
              </div>
            </div>
            <span className="px-4 py-2 rounded-full text-white text-[13px] font-semibold flex-shrink-0" style={{ background: "linear-gradient(90deg,#d97706,#f59e0b)" }}>
              去拼团
            </span>
          </div>
        ))}
      </Link>
    </div>
  )
}
