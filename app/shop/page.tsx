"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search, ChevronRight, Clock, Users, Flame, Star, Zap, Gift, Ticket, TrendingUp, ShoppingBag, Bell } from "lucide-react"

// 快捷活动入口
const quickActions = [
  { id: "flash", name: "限时秒杀", icon: Zap, color: "from-red-500 to-orange-500", link: "/shop/flash-sale" },
  { id: "group", name: "拼团特惠", icon: Users, color: "from-orange-500 to-amber-500", link: "/shop/group-buy" },
  { id: "coupon", name: "领券中心", icon: Ticket, color: "from-pink-500 to-rose-500", link: "/shop/coupons" },
  { id: "points", name: "积分兑换", icon: Gift, color: "from-purple-500 to-indigo-500", link: "/shop/exchange" },
]

// Mock数据
const mockBanners = [
  { id: "1", image: "/placeholder.svg?height=200&width=400", title: "国学典籍大促", link: "/shop/activity/1", linkType: "activity" as const },
  { id: "2", image: "/placeholder.svg?height=200&width=400", title: "新品上市", link: "/shop/products?tag=new", linkType: "url" as const },
  { id: "3", image: "/placeholder.svg?height=200&width=400", title: "会员专享", link: "/shop/vip", linkType: "url" as const },
]

const mockCategories = [
  { id: "1", name: "古籍善本", icon: "📚" },
  { id: "2", name: "文房四宝", icon: "🖌️" },
  { id: "3", name: "香道用品", icon: "🪷" },
  { id: "4", name: "茶道器具", icon: "🍵" },
  { id: "5", name: "命理工具", icon: "🧭" },
  { id: "6", name: "风水摆件", icon: "🏺" },
  { id: "7", name: "养生食品", icon: "🌿" },
  { id: "8", name: "更多分类", icon: "📋" },
]

const mockFlashSale = {
  id: "1",
  title: "限时秒杀",
  startTime: new Date().toISOString(),
  endTime: new Date(Date.now() + 3600000 * 2).toISOString(),
  status: "ongoing" as const,
  products: [
    { id: "1", name: "渊海子平精装版", cover: "/placeholder.svg?height=100&width=100", price: 68, originalPrice: 128, stock: 50, sold: 42 },
    { id: "2", name: "罗盘专业款", cover: "/placeholder.svg?height=100&width=100", price: 199, originalPrice: 399, stock: 30, sold: 18 },
    { id: "3", name: "紫檀木签筒", cover: "/placeholder.svg?height=100&width=100", price: 88, originalPrice: 168, stock: 100, sold: 67 },
  ],
}

const mockGroupBuy = {
  id: "1",
  title: "3人成团",
  cover: "/placeholder.svg?height=120&width=120",
  price: 299,
  originalPrice: 599,
  minMembers: 3,
  currentMembers: 2,
  endTime: new Date(Date.now() + 86400000).toISOString(),
  status: "ongoing" as const,
  productName: "周易全集精装套装",
}

const mockProducts = [
  { id: "1", name: "渊海子平（精装典藏版）", cover: "/placeholder.svg?height=200&width=200", price: 128, originalPrice: 168, sales: 2860, rating: 4.9, category: "古籍", isHot: true },
  { id: "2", name: "专业风水罗盘", cover: "/placeholder.svg?height=200&width=200", price: 399, originalPrice: 599, sales: 1250, rating: 4.8, category: "工具", isNew: true },
  { id: "3", name: "紫檀木文房套装", cover: "/placeholder.svg?height=200&width=200", price: 688, originalPrice: 888, sales: 560, rating: 4.9, category: "文房" },
  { id: "4", name: "沉香线香礼盒", cover: "/placeholder.svg?height=200&width=200", price: 168, originalPrice: 238, sales: 3200, rating: 4.7, category: "香道", isHot: true },
  { id: "5", name: "紫砂茶具套装", cover: "/placeholder.svg?height=200&width=200", price: 458, originalPrice: 658, sales: 890, rating: 4.8, category: "茶道" },
  { id: "6", name: "黄铜貔貅摆件", cover: "/placeholder.svg?height=200&width=200", price: 299, originalPrice: 399, sales: 1560, rating: 4.6, category: "摆件", isNew: true },
]

// 骨架屏
function ShopSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] animate-pulse">
      <div className="h-12 bg-white" />
      <div className="mx-4 mt-4 h-36 rounded-xl bg-gray-200" />
      <div className="mx-4 mt-4 grid grid-cols-4 gap-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-gray-200" />
            <div className="w-10 h-3 rounded bg-gray-200" />
          </div>
        ))}
      </div>
      <div className="mx-4 mt-6 h-32 rounded-xl bg-gray-200" />
      <div className="mx-4 mt-6 grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-64 rounded-xl bg-gray-200" />
        ))}
      </div>
    </div>
  )
}

export default function ShopPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [banners] = useState(mockBanners)
  const [categories] = useState(mockCategories)
  const [flashSale] = useState(mockFlashSale)
  const [groupBuy] = useState(mockGroupBuy)
  const [products] = useState(mockProducts)
  const [currentBanner, setCurrentBanner] = useState(0)
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 })

  // 轮播自动切换
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner(prev => (prev + 1) % banners.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [banners.length])

  // 秒杀倒计时
  useEffect(() => {
    const updateCountdown = () => {
      const end = new Date(flashSale.endTime).getTime()
      const now = Date.now()
      const diff = Math.max(0, end - now)
      setCountdown({
        hours: Math.floor(diff / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      })
    }
    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [flashSale.endTime])

  // 模拟加载
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800)
    return () => clearTimeout(timer)
  }, [])

  const handleBannerClick = useCallback((banner: typeof mockBanners[0]) => {
    router.push(banner.link)
  }, [router])

  if (loading) return <ShopSkeleton />

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-20">
      {/* 顶部搜索栏 - 优化版 */}
      <div className="sticky top-0 z-20 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div 
            className="flex-1 flex items-center gap-2 px-4 py-2 bg-[#FAF8F5] rounded-full cursor-pointer"
            onClick={() => router.push("/search?from=shop")}
          >
            <Search className="w-4 h-4 text-[#999999]" />
            <span className="text-sm text-[#999999]">搜索商品</span>
          </div>
          <button 
            onClick={() => router.push("/shop/cart")}
            className="relative p-2"
          >
            <ShoppingBag className="w-5 h-5 text-[#666666]" />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#C41E3A] text-white text-[10px] rounded-full flex items-center justify-center">3</span>
          </button>
          <button className="relative p-2">
            <Bell className="w-5 h-5 text-[#666666]" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-[#C41E3A] rounded-full" />
          </button>
        </div>
      </div>

      {/* Banner轮播 - 缩小高度 */}
      <div className="relative mx-4 mt-4 h-28 sm:h-36 rounded-xl overflow-hidden">
        <div 
          className="flex transition-transform duration-500 h-full"
          style={{ transform: `translateX(-${currentBanner * 100}%)` }}
        >
          {banners.map((banner) => (
            <div
              key={banner.id}
              className="w-full h-full flex-shrink-0 cursor-pointer"
              onClick={() => handleBannerClick(banner)}
            >
              <div 
                className="w-full h-full bg-gradient-to-r from-[#C41E3A] to-[#E85A70] flex items-center justify-center"
              >
                <span className="text-white text-xl font-bold">{banner.title}</span>
              </div>
            </div>
          ))}
        </div>
        {/* 指示器 */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {banners.map((_, idx) => (
            <div
              key={idx}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                idx === currentBanner ? "w-4 bg-white" : "bg-white/50"
              }`}
            />
          ))}
        </div>
      </div>

      {/* 快捷活动入口 */}
      <div className="mx-4 mt-4 grid grid-cols-4 gap-2">
        {quickActions.map(action => (
          <button
            key={action.id}
            onClick={() => router.push(action.link)}
            className={`p-3 rounded-xl bg-gradient-to-br ${action.color} text-white flex flex-col items-center gap-1.5 shadow-sm active:scale-95 transition-transform`}
          >
            <action.icon className="w-5 h-5" />
            <span className="text-xs font-medium">{action.name}</span>
          </button>
        ))}
      </div>

      {/* 分类图标网格 */}
      <div className="mx-4 mt-5 grid grid-cols-4 gap-3">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="flex flex-col items-center gap-1.5 cursor-pointer"
            onClick={() => router.push(`/shop/category/${cat.id}`)}
          >
            <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-2xl">
              {cat.icon}
            </div>
            <span className="text-xs text-[#2C2C2C]">{cat.name}</span>
          </div>
        ))}
      </div>

      {/* 秒杀专区 */}
      <div className="mx-4 mt-6">
        <div 
          className="bg-gradient-to-r from-[#C41E3A] to-[#E85A70] rounded-xl p-4 cursor-pointer"
          onClick={() => router.push(`/shop/flash-sale/${flashSale.id}`)}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-[#FFD700]" />
              <span className="text-white font-bold">{flashSale.title}</span>
            </div>
            <div className="flex items-center gap-1 text-white text-sm">
              <Clock className="w-4 h-4" />
              <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs font-mono">
                {String(countdown.hours).padStart(2, "0")}
              </span>
              <span>:</span>
              <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs font-mono">
                {String(countdown.minutes).padStart(2, "0")}
              </span>
              <span>:</span>
              <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs font-mono">
                {String(countdown.seconds).padStart(2, "0")}
              </span>
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {flashSale.products.map((product) => (
              <div
                key={product.id}
                className="flex-shrink-0 w-20 bg-white rounded-lg p-2"
                onClick={(e) => {
                  e.stopPropagation()
                  router.push(`/shop/product/${product.id}`)
                }}
              >
                <div className="w-16 h-16 mx-auto bg-[#FAF8F5] rounded-lg mb-1.5" />
                <div className="text-[#C41E3A] font-bold text-sm text-center">
                  ¥{product.price}
                </div>
                <div className="text-[#999999] text-xs line-through text-center">
                  ¥{product.originalPrice}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 拼团专区 */}
      <div className="mx-4 mt-4">
        <div 
          className="bg-white rounded-xl p-4 shadow-sm cursor-pointer"
          onClick={() => router.push(`/shop/group-buy/${groupBuy.id}`)}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#C41E3A]" />
              <span className="font-bold text-[#2C2C2C]">拼团特惠</span>
              <span className="text-xs text-white bg-[#C41E3A] px-2 py-0.5 rounded-full">
                {groupBuy.title}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-[#999999]" />
          </div>
          <div className="flex gap-4">
            <div className="w-20 h-20 bg-[#FAF8F5] rounded-lg flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-[#2C2C2C] truncate">
                {groupBuy.productName}
              </h4>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-[#C41E3A] font-bold text-lg">¥{groupBuy.price}</span>
                <span className="text-[#999999] text-xs line-through">¥{groupBuy.originalPrice}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-1.5 bg-[#FAF8F5] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#C41E3A] to-[#E85A70] rounded-full"
                    style={{ width: `${(groupBuy.currentMembers / groupBuy.minMembers) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-[#C41E3A]">
                  还差{groupBuy.minMembers - groupBuy.currentMembers}人
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 商品推荐 */}
      <div className="mx-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-[#2C2C2C]">为你推荐</h3>
          <span 
            className="text-xs text-[#999999] flex items-center gap-1 cursor-pointer"
            onClick={() => router.push("/shop/products")}
          >
            更多 <ChevronRight className="w-3 h-3" />
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-xl overflow-hidden shadow-sm cursor-pointer"
              onClick={() => router.push(`/shop/product/${product.id}`)}
            >
              <div className="relative aspect-square bg-[#FAF8F5]">
                {product.isNew && (
                  <span className="absolute top-2 left-2 text-xs text-white bg-[#1890FF] px-2 py-0.5 rounded">
                    新品
                  </span>
                )}
                {product.isHot && (
                  <span className="absolute top-2 left-2 text-xs text-white bg-[#C41E3A] px-2 py-0.5 rounded">
                    热销
                  </span>
                )}
              </div>
              <div className="p-3">
                <h4 className="text-sm text-[#2C2C2C] line-clamp-2 min-h-[40px]">
                  {product.name}
                </h4>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-3 h-3 text-[#C9A96E] fill-[#C9A96E]" />
                  <span className="text-xs text-[#C9A96E]">{product.rating}</span>
                  <span className="text-xs text-[#999999] ml-1">{product.sales}人付款</span>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-[#C41E3A] font-bold">¥{product.price}</span>
                  <span className="text-xs text-[#999999] line-through">¥{product.originalPrice}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 底部安全距离 */}
      <div className="h-4" />
    </div>
  )
}
