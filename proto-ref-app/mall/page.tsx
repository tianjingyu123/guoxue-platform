"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import useEmblaCarousel from "embla-carousel-react"
import { Search, ShoppingCart, Ticket, Zap, Users, FileText, ChevronRight, Radio, Sparkles } from "lucide-react"
import Link from "next/link"
import { AISearchModal, useAISearch } from "@/components/ai-search"
import { ProductCard, LiveCard } from "@/components/cards"
import { MarketingZone } from "@/components/mall/marketing-zone"

const cartCount = 3

// 核心功能入口 - 含秒杀/拼团专区，全部可跳转
const quickEntries = [
  { id: "seckill", label: "限时秒杀", icon: Zap, href: "/shop/flash-sale", state: "进行中" },
  { id: "group", label: "超值拼团", icon: Users, href: "/shop/group-buy", state: "进行中" },
  { id: "orders", label: "我的订单", icon: FileText, href: "/orders" },
  { id: "coupons", label: "优惠券", icon: Ticket, href: "/shop/coupons", badge: 2 },
]

// Banner数据
const banners = [
  { id: 1, title: "新人专享", subtitle: "首单立减20元", color: "from-primary/80 to-primary", href: "/shop/coupons" },
  { id: 2, title: "国学典籍", subtitle: "周易全系列8折", color: "from-accent/80 to-accent", href: "/mall/category?cat=books" },
  { id: 3, title: "开运饰品", subtitle: "买二赠一", color: "from-blue-600/80 to-blue-600", href: "/mall/category?cat=jewelry" },
]

// 分类数据
const categories = [
  { id: "books", name: "书籍", icon: "📚" },
  { id: "culture", name: "文创", icon: "🎨" },
  { id: "jewelry", name: "饰品", icon: "📿" },
  { id: "peripheral", name: "周边", icon: "🎁" },
  { id: "tools", name: "工具", icon: "🧭" },
  { id: "incense", name: "香道", icon: "🕯️" },
  { id: "tea", name: "茶器", icon: "🍵" },
  { id: "all", name: "全部", icon: "⋯" },
]

// 电商直播数据 - orientation取决于主播发起方式（手机竖屏/OBS横屏）
const commerceLives = [
  { id: 1, title: "开光吉祥物专场", host: "福缘阁主", viewers: 8920, isLive: true, orientation: "vertical" as const },
  { id: 2, title: "周易古籍珍藏版专场", host: "古籍书阁", viewers: 4150, isLive: true, orientation: "horizontal" as const },
  { id: 3, title: "手工罗盘制作与售卖", host: "匠心堂", time: "明天14:00", reservations: 526, isLive: false, orientation: "vertical" as const },
]

// 商品数据
const products = [
  { id: 1, title: "周易正义·十三经注疏本", cover: "/images/products/book1.jpg", price: 68, originalPrice: 128, sales: 2341, tag: "热销" },
  { id: 2, title: "紫微斗数全书（精装版）", cover: "/images/products/book2.jpg", price: 98, originalPrice: 168, sales: 1856, tag: "新品" },
  { id: 3, title: "太极八卦铜摆件", cover: "/images/products/item1.jpg", price: 168, originalPrice: 298, sales: 892 },
  { id: 4, title: "天然黑曜石貔貅手链", cover: "/images/products/item2.jpg", price: 128, originalPrice: 258, sales: 1523, tag: "热销" },
  { id: 5, title: "檀香木罗盘摆件", cover: "/images/products/item3.jpg", price: 388, originalPrice: 588, sales: 456 },
  { id: 6, title: "梅花易数入门", cover: "/images/products/book3.jpg", price: 45, originalPrice: 78, sales: 3201, tag: "秒杀" },
  { id: 7, title: "六爻铜钱套装（古法铸造）", cover: "/images/products/item4.jpg", price: 88, originalPrice: 128, sales: 2156 },
  { id: 8, title: "沉香线香礼盒", cover: "/images/products/item5.jpg", price: 168, originalPrice: 268, sales: 678, tag: "新品" },
  { id: 9, title: "奇门遁甲精义", cover: "/images/products/book4.jpg", price: 88, originalPrice: 148, sales: 1234 },
  { id: 10, title: "紫水晶七星阵", cover: "/images/products/item6.jpg", price: 298, originalPrice: 498, sales: 345, tag: "热销" },
  { id: 11, title: "风水罗盘专业版", cover: "/images/products/item7.jpg", price: 688, originalPrice: 988, sales: 234 },
  { id: 12, title: "四库全书·术数类", cover: "/images/products/book5.jpg", price: 268, originalPrice: 398, sales: 567 },
]

// Banner轮播组件
function BannerCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true })
  const [selectedIndex, setSelectedIndex] = useState(0)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on("select", onSelect)
    
    // 自动轮播
    const interval = setInterval(() => {
      emblaApi.scrollNext()
    }, 4000)
    
    return () => {
      emblaApi.off("select", onSelect)
      clearInterval(interval)
    }
  }, [emblaApi, onSelect])

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-xl" ref={emblaRef}>
        <div className="flex">
          {banners.map((banner) => (
            <div key={banner.id} className="flex-[0_0_100%] min-w-0 px-0.5">
              <Link href={banner.href} className={`aspect-[2.5/1] rounded-xl bg-gradient-to-r ${banner.color} p-4 flex flex-col justify-center`}>
                <h3 className="text-white text-xl font-bold">{banner.title}</h3>
                <p className="text-white/80 text-sm mt-1">{banner.subtitle}</p>
              </Link>
            </div>
          ))}
        </div>
      </div>
      
      {/* 轮播指示器 */}
      <div className="flex justify-center gap-1.5 mt-3">
        {banners.map((_, index) => (
          <div
            key={index}
            className={`h-1.5 rounded-full transition-all ${
              index === selectedIndex 
                ? "w-4 bg-primary" 
                : "w-1.5 bg-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    </div>
  )
}

export default function MallPage() {
  const router = useRouter()
  const aiSearch = useAISearch()

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* AI搜索弹��� */}
      <AISearchModal isOpen={aiSearch.isOpen} onClose={aiSearch.close} context="商品" />

      {/* 顶部搜索栏 - 宣纸色背景 */}
      <div className="sticky top-0 z-30 bg-[#FAF8F5] border-b border-[#E8E0D5]">
        <div className="px-4 py-3 flex items-center gap-2">
          <button
            onClick={() => router.push("/search?from=mall")}
            className="relative flex-1 flex items-center h-10 pl-3 pr-4 rounded-full bg-[#F5F1EB] text-left"
            aria-label="搜索商品、好物"
          >
            <Search className="w-4 h-4 text-[#999999] shrink-0" />
            {/* AI 徽章 - 故宫红，与全局规范统一 */}
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 mx-1.5 rounded-full bg-primary/15 shrink-0">
              <Sparkles className="w-2.5 h-2.5 text-primary" />
              <span className="text-[9px] text-primary font-semibold leading-none">AI</span>
            </span>
            <span className="text-sm text-[#999999] truncate">搜索商品...</span>
          </button>
          {/* 购物车入口 - 始终可见，带数量角标 */}
          <Link
            href="/shop/cart"
            className="relative w-10 h-10 rounded-full bg-[#F5F1EB] flex items-center justify-center shrink-0"
            aria-label="购物车"
          >
            <ShoppingCart className="w-5 h-5 text-[#666666]" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-[10px] text-primary-foreground font-semibold flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      <div className="px-4 space-y-5 pt-4">
        {/* 核心功能快捷入口 */}
        <div className="grid grid-cols-4 gap-3">
          {quickEntries.map((entry) => (
            <Link
              key={entry.id}
              href={entry.href}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-card hover:bg-secondary/50 transition-colors relative"
            >
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <entry.icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs text-foreground">{entry.label}</span>
              {entry.state && (
                <span className="absolute top-1.5 right-2 px-1 py-px rounded-full bg-primary text-[8px] text-primary-foreground font-medium leading-none">
                  {entry.state}
                </span>
              )}
              {entry.badge && (
                <span className="absolute top-2 right-1/4 w-4 h-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                  {entry.badge}
                </span>
              )}
            </Link>
          ))}
        </div>

        {/* 电商直播 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-red-500" />
              <span className="font-semibold text-foreground">直播带货</span>
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            </div>
            <Link href="/live?type=commerce" className="flex items-center text-xs text-muted-foreground">
              更多 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
            {commerceLives.map(live => (
              <LiveCard
                key={live.id}
                variant="rail"
                data={{
                  id: live.id,
                  title: live.title,
                  host: live.host,
                  viewers: live.viewers,
                  reservations: live.reservations,
                  status: live.isLive ? "live" : "upcoming",
                  scheduledTime: live.time,
                  liveType: "commerce",
                }}
              />
            ))}
          </div>
        </div>

        {/* Banner轮播 */}
        <BannerCarousel />

        {/* 营销活动区 - 秒杀倒计时 + 拼团 */}
        <MarketingZone />

        {/* 商品分类 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">商品分类</h2>
            <Link href="/mall/category" className="flex items-center text-xs text-muted-foreground">
              全部分类 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-4 gap-3">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={category.id === "all" ? "/mall/category" : `/mall/category?cat=${category.id}`}
                className="flex flex-col items-center gap-1.5 py-2.5 rounded-lg bg-card hover:bg-secondary/50 transition-colors"
              >
                <span className="text-2xl">{category.icon}</span>
                <span className="text-xs text-foreground">{category.name}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* 猜你喜欢 */}
        <div>
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="h-px w-8 bg-border" />
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <h2 className="font-semibold text-foreground text-[15px]">猜你喜欢</h2>
            <span className="h-px w-8 bg-border" />
          </div>
          
          {/* 双列瀑布流商品 - 统一卡片库 feed 变体 */}
          <div className="grid grid-cols-2 gap-2">
            {products.map((product) => (
              <ProductCard key={product.id} data={product} variant="feed" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
