"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Zap, Clock, Flame, Volume2 } from "lucide-react"
import { marketingApi, type FlashSale } from "@/lib/api"

const timeSlots = [
  { id: "10", label: "10:00", time: "10:00:00" },
  { id: "14", label: "14:00", time: "14:00:00" },
  { id: "18", label: "18:00", time: "18:00:00" },
  { id: "20", label: "20:00", time: "20:00:00" },
  { id: "22", label: "22:00", time: "22:00:00" },
]

const mockFlashSales: FlashSale[] = [
  {
    id: "1",
    title: "限时秒杀",
    startTime: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    endTime: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
    status: "ongoing",
    products: [
      { id: "p1", name: "周易六十四卦详解", cover: "/placeholder.svg", price: 68, originalPrice: 168, stock: 100, sold: 78 },
      { id: "p2", name: "紫微斗数入门", cover: "/placeholder.svg", price: 38, originalPrice: 98, stock: 50, sold: 45 },
      { id: "p3", name: "风水入门指南", cover: "/placeholder.svg", price: 28, originalPrice: 88, stock: 200, sold: 156 },
      { id: "p4", name: "八字命理基础", cover: "/placeholder.svg", price: 48, originalPrice: 128, stock: 80, sold: 62 },
    ],
  },
]

export default function FlashSalePage() {
  const router = useRouter()
  const [activeSlot, setActiveSlot] = useState("14")
  const [flashSales, setFlashSales] = useState<FlashSale[]>([])
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 })
  const [rushingProductId, setRushingProductId] = useState<string | null>(null)
  const [showNotice, setShowNotice] = useState(true)

  useEffect(() => {
    loadFlashSales()
  }, [activeSlot])

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      const endTime = flashSales[0]?.endTime ? new Date(flashSales[0].endTime) : new Date(now.getTime() + 1000 * 60 * 60 * 2)
      const diff = endTime.getTime() - now.getTime()
      
      if (diff > 0) {
        setCountdown({
          hours: Math.floor(diff / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000),
        })
      } else {
        loadFlashSales()
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [flashSales])

  async function loadFlashSales() {
    setLoading(true)
    try {
      const data = await marketingApi.flashSales()
      setFlashSales(data)
    } catch {
      setFlashSales(mockFlashSales)
    } finally {
      setLoading(false)
    }
  }

  // 抢购动画处理
  const handleRush = useCallback(async (productId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setRushingProductId(productId)
    
    // 模拟抢购请求
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setRushingProductId(null)
    router.push(`/shop/checkout?productId=${productId}&flashSale=true`)
  }, [router])

  const currentSale = flashSales[0]
  const products = currentSale?.products || []

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#C41E3A] to-[#8B0000]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-gradient-to-r from-[#C41E3A] to-[#E85050] px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-300 fill-yellow-300" />
          <span className="text-lg font-bold text-white">限时秒杀</span>
        </div>
      </div>

      {/* Time Slots */}
      <div className="px-4 py-3 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {timeSlots.map((slot) => {
            const isActive = activeSlot === slot.id
            const now = new Date()
            const slotHour = parseInt(slot.id)
            const currentHour = now.getHours()
            const isPast = slotHour < currentHour
            const isOngoing = slotHour <= currentHour && slotHour + 2 > currentHour
            
            return (
              <button
                key={slot.id}
                onClick={() => setActiveSlot(slot.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? "bg-white text-[#C41E3A] shadow-lg"
                    : "bg-white/20 text-white/80"
                }`}
              >
                <div>{slot.label}</div>
                <div className="text-xs mt-0.5">
                  {isOngoing ? "抢购中" : isPast ? "已结束" : "即将开始"}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Countdown - 增强版 */}
      <div className="mx-4 mb-4 bg-black/30 backdrop-blur-sm rounded-2xl p-4">
        {/* 滚动通知 */}
        {showNotice && (
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/10">
            <Volume2 className="w-4 h-4 text-yellow-300 flex-shrink-0" />
            <div className="flex-1 overflow-hidden">
              <div className="animate-marquee whitespace-nowrap text-xs text-white/80">
                用户 138****8888 刚刚抢到了「周易六十四卦详解」 | 用户 156****6666 抢购成功 | 限时秒杀，手慢无！
              </div>
            </div>
            <button onClick={() => setShowNotice(false)} className="text-white/50 text-xs">关闭</button>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-400 animate-pulse" />
            <span className="text-white font-medium">距离结束还剩</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="bg-white text-[#C41E3A] px-2 py-1 rounded font-mono font-bold text-lg min-w-[32px] text-center">
              {String(countdown.hours).padStart(2, "0")}
            </div>
            <span className="text-white font-bold animate-pulse">:</span>
            <div className="bg-white text-[#C41E3A] px-2 py-1 rounded font-mono font-bold text-lg min-w-[32px] text-center">
              {String(countdown.minutes).padStart(2, "0")}
            </div>
            <span className="text-white font-bold animate-pulse">:</span>
            <div className="bg-white text-[#C41E3A] px-2 py-1 rounded font-mono font-bold text-lg min-w-[32px] text-center animate-pulse-fast">
              {String(countdown.seconds).padStart(2, "0")}
            </div>
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="bg-[#FAF8F5] rounded-t-3xl min-h-[60vh] p-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-3 animate-pulse">
                <div className="aspect-square bg-gray-200 rounded-xl mb-3" />
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Clock className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-[#999999]">该时段暂无秒杀商品</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((product) => {
              const progress = Math.round((product.sold / product.stock) * 100)
              const isAlmostGone = progress >= 80
              
              return (
                <div
                  key={product.id}
                  onClick={() => router.push(`/shop/${product.id}?flashSale=true`)}
                  className="bg-white rounded-2xl p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                >
                  {/* Image */}
                  <div className="relative aspect-square mb-3">
                    <img
                      src={product.cover}
                      alt={product.name}
                      className="w-full h-full object-cover rounded-xl"
                    />
                    {isAlmostGone && (
                      <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                        即将售罄
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-[#C41E3A] text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      秒杀
                    </div>
                  </div>

                  {/* Info */}
                  <h3 className="text-sm font-medium text-[#2C2C2C] line-clamp-2 mb-2 h-10">
                    {product.name}
                  </h3>

                  {/* Price */}
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-lg font-bold text-[#C41E3A]">¥{product.price}</span>
                    <span className="text-xs text-[#999999] line-through">¥{product.originalPrice}</span>
                  </div>

                  {/* Progress */}
                  <div className="mb-3">
                    <div className="h-4 bg-[#FFE4E4] rounded-full overflow-hidden relative">
                      <div
                        className="h-full bg-gradient-to-r from-[#C41E3A] to-[#FF6B6B] rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium">
                        已抢{progress}%
                      </span>
                    </div>
                  </div>

                  {/* Button - 增强抢购动效 */}
                  <button
                    onClick={(e) => handleRush(product.id, e)}
                    disabled={progress >= 100 || rushingProductId === product.id}
                    className={`w-full py-2.5 rounded-full text-sm font-medium transition-all relative overflow-hidden ${
                      progress >= 100
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : rushingProductId === product.id
                        ? "bg-[#C41E3A] text-white"
                        : "bg-gradient-to-r from-[#C41E3A] to-[#E85050] text-white active:scale-95"
                    }`}
                  >
                    {rushingProductId === product.id ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        抢购中...
                      </span>
                    ) : progress >= 100 ? (
                      "已抢光"
                    ) : (
                      <>
                        <span className="relative z-10">立即抢购</span>
                        {/* 闪光动效 */}
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shimmer" />
                      </>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
