"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Zap, Clock } from "lucide-react"
import { BackButton } from "@/components/common/back-button"
import { ProductCard, type ProductCardData } from "@/components/cards"

// 秒杀场次
const sessions = [
  { id: "s1", time: "10:00", label: "已开抢", status: "active" as const },
  { id: "s2", time: "14:00", label: "即将开始", status: "upcoming" as const },
  { id: "s3", time: "18:00", label: "即将开始", status: "upcoming" as const },
  { id: "s4", time: "20:00", label: "即将开始", status: "upcoming" as const },
]

// 秒杀商品
const flashProducts: (ProductCardData & { stock: number; sold: number })[] = [
  { id: "f1", title: "天然黑曜石貔貅手链 招财转运", cover: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400&q=80", coverRatio: "1:1", price: 68, originalPrice: 268, sales: 2600, tag: "秒杀", stock: 100, sold: 78 },
  { id: "f2", title: "专业风水罗盘 纯铜精工", cover: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=400&q=80", coverRatio: "1:1", price: 158, originalPrice: 598, sales: 890, tag: "秒杀", stock: 50, sold: 42 },
  { id: "f3", title: "开光五帝钱挂件 镇宅化煞", cover: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&q=80", coverRatio: "1:1", price: 28, originalPrice: 128, sales: 4500, tag: "秒杀", stock: 200, sold: 156 },
  { id: "f4", title: "天然水晶七星阵摆件", cover: "https://images.unsplash.com/photo-1600721391689-2564bb8055de?w=400&q=80", coverRatio: "1:1", price: 99, originalPrice: 358, sales: 1200, tag: "秒杀", stock: 80, sold: 61 },
]

function useCountdown(targetMinutes: number) {
  const [seconds, setSeconds] = useState(targetMinutes * 60)
  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [])
  const h = String(Math.floor(seconds / 3600)).padStart(2, "0")
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")
  const s = String(seconds % 60).padStart(2, "0")
  return { h, m, s }
}

export default function FlashSalePage() {
  const [activeSession, setActiveSession] = useState("s1")
  const { h, m, s } = useCountdown(125)

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* 顶部栏 */}
      <header className="sticky top-0 z-20 bg-primary text-primary-foreground">
        <div className="flex items-center gap-2 px-4 h-14">
          <BackButton fallbackPath="/discover" iconClassName="text-primary-foreground" />
          <h1 className="text-lg font-semibold flex items-center gap-1.5">
            <Zap className="w-5 h-5" />
            限时秒杀
          </h1>
          <div className="ml-auto flex items-center gap-1.5 text-sm">
            <Clock className="w-4 h-4" />
            <span>距本场结束</span>
            <span className="flex items-center gap-0.5 font-mono">
              <span className="bg-foreground/20 rounded px-1 py-0.5 text-xs">{h}</span>
              <span>:</span>
              <span className="bg-foreground/20 rounded px-1 py-0.5 text-xs">{m}</span>
              <span>:</span>
              <span className="bg-foreground/20 rounded px-1 py-0.5 text-xs">{s}</span>
            </span>
          </div>
        </div>

        {/* 场次选择 */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => setActiveSession(session.id)}
              className={`shrink-0 flex flex-col items-center px-5 py-1.5 rounded-lg transition-colors ${
                activeSession === session.id
                  ? "bg-primary-foreground text-primary"
                  : "bg-foreground/10 text-primary-foreground"
              }`}
            >
              <span className="text-base font-semibold">{session.time}</span>
              <span className="text-xs opacity-90">{session.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* 秒杀商品列表 */}
      <div className="px-4 pt-4 space-y-3">
        {flashProducts.map((product) => {
          const percent = Math.round((product.sold / product.stock) * 100)
          return (
            <Link
              key={product.id}
              href={`/product/${product.id}`}
              className="flex gap-3 bg-card rounded-xl p-3 border border-border"
            >
              <div className="relative w-28 h-28 shrink-0 rounded-lg overflow-hidden bg-secondary">
                <img
                  src={product.cover || "/placeholder.svg"}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0 flex flex-col">
                <h3 className="text-sm font-medium text-foreground line-clamp-2 leading-snug">
                  {product.title}
                </h3>
                <div className="mt-auto">
                  {/* 进度条 */}
                  <div className="relative h-4 bg-secondary rounded-full overflow-hidden mb-2">
                    <div
                      className="absolute inset-y-0 left-0 bg-primary/80 rounded-full"
                      style={{ width: `${percent}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] text-foreground font-medium">
                      已抢 {percent}%
                    </span>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-bold text-primary">¥{product.price}</span>
                      <span className="text-xs text-muted-foreground line-through">
                        ¥{product.originalPrice}
                      </span>
                    </div>
                    <span className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                      马上抢
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
