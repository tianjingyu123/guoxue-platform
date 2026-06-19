"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Share2, ChevronDown, ChevronUp, Clock, Gift, Flame, Trophy, ChevronRight, ShoppingBag, BookOpen, Ticket } from "lucide-react"
import { BackButton } from "@/components/common/back-button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

// 活动配置数据（实际从后台获取）
const activityConfig = {
  id: "double11-2024",
  title: "双十一国学节",
  status: "ongoing", // upcoming, ongoing, ended
  startTime: "2024-11-01T00:00:00",
  endTime: "2024-11-11T23:59:59",
  // 模块配置（顺序可调整）
  modules: [
    { type: "banner", enabled: true, order: 1 },
    { type: "countdown", enabled: true, order: 2 },
    { type: "rules", enabled: true, order: 3 },
    { type: "coupons", enabled: true, order: 4 },
    { type: "seckill", enabled: true, order: 5 },
    { type: "products", enabled: true, order: 6 },
    { type: "ranking", enabled: true, order: 7 },
  ],
  banners: [
    { id: 1, image: "", title: "双十一国学节", subtitle: "全场课程5折起" },
    { id: 2, image: "", title: "新用户专享", subtitle: "注册即送100国学币" },
  ],
  rules: `
    <h3>活动规则</h3>
    <p>1. 活动时间：2024年11月1日00:00 - 11月11日23:59</p>
    <p>2. 活动期间，全场课程低至5折，部分商品参与满减活动</p>
    <p>3. 新用户注册即送100国学币，可抵扣任意订单</p>
    <p>4. 分享活动页面给好友，好友注册成功后双方各得50国学币</p>
    <p>5. 本活动最终解释权归平台所有</p>
  `,
  coupons: [
    { id: 1, amount: 10, condition: "满99可用", scope: "全部课程", claimed: false },
    { id: 2, amount: 30, condition: "满199可用", scope: "全部商品", claimed: false },
    { id: 3, amount: 50, condition: "满299可用", scope: "通用", claimed: true },
    { id: 4, amount: 111, condition: "满1111可用", scope: "双11专享", claimed: false },
  ],
  seckillProducts: [
    { id: 1, title: "八字入门精讲", originalPrice: 299, seckillPrice: 99, stock: 50, sold: 42, endTime: "2024-11-11T12:00:00" },
    { id: 2, title: "紫微斗数实战", originalPrice: 399, seckillPrice: 149, stock: 30, sold: 28, endTime: "2024-11-11T18:00:00" },
    { id: 3, title: "风水堪舆入门", originalPrice: 199, seckillPrice: 69, stock: 100, sold: 65, endTime: "2024-11-11T20:00:00" },
  ],
  products: [
    { id: 1, type: "course", title: "八字命理系统课", price: 199, originalPrice: 399, sales: 1280, image: "" },
    { id: 2, type: "goods", title: "开运手串礼盒", price: 68, originalPrice: 128, sales: 856, image: "" },
    { id: 3, type: "course", title: "紫微斗数进阶", price: 299, originalPrice: 599, sales: 628, image: "" },
    { id: 4, type: "goods", title: "国学经典书籍套装", price: 158, originalPrice: 298, sales: 456, image: "" },
    { id: 5, type: "course", title: "风水实战案例", price: 149, originalPrice: 299, sales: 324, image: "" },
    { id: 6, type: "goods", title: "古法香道套装", price: 88, originalPrice: 168, sales: 256, image: "" },
  ],
  ranking: [
    { id: 1, name: "周易大师", avatar: "", amount: 12800, type: "consume" },
    { id: 2, name: "张玄风", avatar: "", amount: 8560, type: "consume" },
    { id: 3, name: "陈风水", avatar: "", amount: 6280, type: "consume" },
    { id: 4, name: "李易安", avatar: "", amount: 5120, type: "consume" },
    { id: 5, name: "王道长", avatar: "", amount: 4280, type: "consume" },
  ],
}

export default function ActivityPage() {
  const [rulesExpanded, setRulesExpanded] = useState(false)
  const [coupons, setCoupons] = useState(activityConfig.coupons)
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [currentBanner, setCurrentBanner] = useState(0)
  const [rankingType, setRankingType] = useState<"consume" | "invite">("consume")
  const [showShareModal, setShowShareModal] = useState(false)

  // 倒计时计算
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime()
      const end = new Date(activityConfig.endTime).getTime()
      const diff = end - now

      if (diff > 0) {
        setCountdown({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000),
        })
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Banner轮播
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner(prev => (prev + 1) % activityConfig.banners.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  const handleClaimCoupon = (couponId: number) => {
    setCoupons(prev => prev.map(c => c.id === couponId ? { ...c, claimed: true } : c))
  }

  // 排序模块
  const sortedModules = [...activityConfig.modules]
    .filter(m => m.enabled)
    .sort((a, b) => a.order - b.order)

  const renderModule = (moduleType: string) => {
    switch (moduleType) {
      case "banner":
        return (
          <div key="banner" className="relative">
            <div className="aspect-[2/1] bg-gradient-to-br from-primary/30 via-accent/20 to-primary/10 relative overflow-hidden">
              {activityConfig.banners.map((banner, index) => (
                <div
                  key={banner.id}
                  className={cn(
                    "absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-500",
                    currentBanner === index ? "opacity-100" : "opacity-0"
                  )}
                >
                  <h1 className="text-2xl font-bold text-foreground">{banner.title}</h1>
                  <p className="text-sm text-muted-foreground mt-2">{banner.subtitle}</p>
                </div>
              ))}
              {/* 轮播指示器 */}
              <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5">
                {activityConfig.banners.map((_, index) => (
                  <div
                    key={index}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full transition-all",
                      currentBanner === index ? "w-4 bg-primary" : "bg-white/50"
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        )

      case "countdown":
        return (
          <div key="countdown" className="px-4 py-3">
            <Card className="p-4 bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium text-foreground">距离活动结束</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-8 h-8 rounded bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                    {countdown.days}
                  </span>
                  <span className="text-foreground">天</span>
                  <span className="w-8 h-8 rounded bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                    {countdown.hours.toString().padStart(2, "0")}
                  </span>
                  <span className="text-foreground">:</span>
                  <span className="w-8 h-8 rounded bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                    {countdown.minutes.toString().padStart(2, "0")}
                  </span>
                  <span className="text-foreground">:</span>
                  <span className="w-8 h-8 rounded bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                    {countdown.seconds.toString().padStart(2, "0")}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        )

      case "rules":
        return (
          <div key="rules" className="px-4">
            <Card className="overflow-hidden">
              <button
                onClick={() => setRulesExpanded(!rulesExpanded)}
                className="flex items-center justify-between w-full p-3"
              >
                <span className="font-medium text-sm text-foreground">活动规则</span>
                {rulesExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              {rulesExpanded && (
                <div className="px-3 pb-3 text-sm text-muted-foreground space-y-1 border-t border-border pt-3">
                  <p>1. 活动时间：2024年11月1日00:00 - 11月11日23:59</p>
                  <p>2. 活动期间，全场课程低至5折，部分商品参与满减活动</p>
                  <p>3. 新用户注册即送100国学币，可抵扣任意订单</p>
                  <p>4. 分享活动页面给好友，好友注册成功后双方各得50国学币</p>
                  <p>5. 本活动最终解释权归平台所有</p>
                </div>
              )}
            </Card>
          </div>
        )

      case "coupons":
        return (
          <div key="coupons" className="py-4">
            <div className="flex items-center justify-between px-4 mb-3">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-accent" />
                <span className="font-semibold text-base text-foreground">优惠券专区</span>
              </div>
              <Link href="/coupons" className="text-xs text-muted-foreground flex items-center gap-1">
                我的券 <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
              {coupons.map(coupon => (
                <div
                  key={coupon.id}
                  className={cn(
                    "flex-shrink-0 w-36 rounded-lg overflow-hidden border",
                    coupon.claimed ? "border-border bg-secondary/50" : "border-primary/30 bg-gradient-to-br from-primary/10 to-accent/5"
                  )}
                >
                  <div className="p-3 text-center">
                    <div className={cn(
                      "text-2xl font-bold",
                      coupon.claimed ? "text-muted-foreground" : "text-primary"
                    )}>
                      <span className="text-sm">¥</span>{coupon.amount}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{coupon.condition}</p>
                    <p className="text-[10px] text-muted-foreground">{coupon.scope}</p>
                  </div>
                  <button
                    onClick={() => !coupon.claimed && handleClaimCoupon(coupon.id)}
                    disabled={coupon.claimed}
                    className={cn(
                      "w-full py-2 text-xs font-medium",
                      coupon.claimed
                        ? "bg-secondary text-muted-foreground"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                  >
                    {coupon.claimed ? "已领取" : "立即领取"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )

      case "seckill":
        return (
          <div key="seckill" className="py-4">
            <div className="flex items-center justify-between px-4 mb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-primary" />
                <span className="font-semibold text-base text-foreground">限时秒杀</span>
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                  抢购中
                </Badge>
              </div>
              <Link href="/seckill" className="text-xs text-muted-foreground flex items-center gap-1">
                更多 <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
              {activityConfig.seckillProducts.map(product => (
                <Link
                  key={product.id}
                  href={`/course/${product.id}`}
                  className="flex-shrink-0 w-32"
                >
                  <Card className="overflow-hidden">
                    <div className="aspect-[4/3] bg-secondary flex items-center justify-center relative">
                      <BookOpen className="w-8 h-8 text-accent/60" />
                      <Badge className="absolute top-1 right-1 bg-primary text-[10px] px-1 py-0">
                        {Math.round((1 - product.seckillPrice / product.originalPrice) * 100)}%OFF
                      </Badge>
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium text-foreground line-clamp-1">{product.title}</p>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-sm text-primary font-bold">¥{product.seckillPrice}</span>
                        <span className="text-[10px] text-muted-foreground line-through">¥{product.originalPrice}</span>
                      </div>
                      {/* 库存进度条 */}
                      <div className="mt-1.5">
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                            style={{ width: `${(product.sold / product.stock) * 100}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          已抢{Math.round((product.sold / product.stock) * 100)}%
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )

      case "products":
        return (
          <div key="products" className="py-4">
            <div className="flex items-center gap-2 px-4 mb-3">
              <Gift className="w-5 h-5 text-accent" />
              <span className="font-semibold text-base text-foreground">活动精选</span>
            </div>
            <div className="grid grid-cols-2 gap-3 px-4">
              {activityConfig.products.map(product => (
                <Link
                  key={product.id}
                  href={product.type === "course" ? `/course/${product.id}` : `/mall/product/${product.id}`}
                >
                  <Card className="overflow-hidden hover:bg-secondary/50 transition-colors">
                    <div className="aspect-[4/3] bg-secondary flex items-center justify-center relative">
                      {product.type === "course" ? (
                        <BookOpen className="w-10 h-10 text-accent/60" />
                      ) : (
                        <ShoppingBag className="w-10 h-10 text-primary/60" />
                      )}
                      <Badge
                        variant="secondary"
                        className={cn(
                          "absolute top-1 left-1 text-[10px] px-1.5 py-0 border-0",
                          product.type === "course" ? "bg-accent/20 text-accent" : "bg-primary/20 text-primary"
                        )}
                      >
                        {product.type === "course" ? "课程" : "商品"}
                      </Badge>
                    </div>
                    <div className="p-2.5">
                      <p className="text-sm font-medium text-foreground line-clamp-2">{product.title}</p>
                      <div className="flex items-baseline gap-1.5 mt-1.5">
                        <span className="text-base text-primary font-bold">¥{product.price}</span>
                        <span className="text-xs text-muted-foreground line-through">¥{product.originalPrice}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{product.sales}人已购</p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )

      case "ranking":
        return (
          <div key="ranking" className="py-4 px-4">
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between p-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-accent" />
                  <span className="font-semibold text-sm text-foreground">活动排行榜</span>
                </div>
                <div className="flex gap-1">
                  {(["consume", "invite"] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setRankingType(type)}
                      className={cn(
                        "px-3 py-1 text-xs rounded-full transition-colors",
                        rankingType === type
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-secondary"
                      )}
                    >
                      {type === "consume" ? "消费榜" : "邀请榜"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="divide-y divide-border">
                {activityConfig.ranking.slice(0, 5).map((user, index) => (
                  <Link key={user.id} href={`/user/${user.id}`} className="flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                      index === 0 ? "bg-accent text-white" :
                      index === 1 ? "bg-gray-400 text-white" :
                      index === 2 ? "bg-amber-600 text-white" :
                      "bg-secondary text-muted-foreground"
                    )}>
                      {index + 1}
                    </div>
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback className="bg-secondary text-foreground text-sm">
                        {user.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{user.name}</p>
                    </div>
                    <p className="text-sm text-primary font-medium">
                      {rankingType === "consume" ? `¥${user.amount.toLocaleString()}` : `${user.amount}人`}
                    </p>
                  </Link>
                ))}
              </div>
              <Link
                href="/ranking"
                className="flex items-center justify-center gap-1 p-3 text-xs text-muted-foreground border-t border-border hover:bg-secondary transition-colors"
              >
                查看完整榜单 <ChevronRight className="w-3 h-3" />
              </Link>
            </Card>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 顶部导航 */}
  <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-12 bg-background/80 backdrop-blur-lg safe-area-pt">
  <BackButton />
  <h1 className="font-semibold text-base text-foreground">{activityConfig.title}</h1>
        <button
          onClick={() => setShowShareModal(true)}
          className="p-2 -mr-2 rounded-full hover:bg-secondary transition-colors"
        >
          <Share2 className="w-5 h-5 text-foreground" />
        </button>
      </header>

      {/* 主体内容 */}
      <main className="pt-12">
        {sortedModules.map(module => renderModule(module.type))}

        {/* 更多精彩 */}
        <div className="px-4 py-6">
          <Link
            href="/discover"
            className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            更多精彩内容 <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      {/* 底部固定分享栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border safe-area-pb">
        <div className="flex items-center justify-between px-4 h-14">
          <div>
            <p className="text-xs text-muted-foreground">分享赚国学币</p>
            <p className="text-sm font-medium text-foreground">好友下单返<span className="text-primary">10%</span>佣金</p>
          </div>
          <button
            onClick={() => setShowShareModal(true)}
            className="px-6 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 transition-colors"
          >
            立即分享
          </button>
        </div>
      </div>

      {/* 分享弹窗 */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
          <div className="w-full max-w-lg bg-card rounded-t-2xl animate-in slide-in-from-bottom duration-300">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-center text-foreground">分享活动</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-4 gap-4">
                {[
                  { icon: "wechat", label: "微信好友", color: "bg-green-500" },
                  { icon: "moments", label: "朋友圈", color: "bg-green-600" },
                  { icon: "poster", label: "生成海报", color: "bg-primary" },
                  { icon: "copy", label: "复制链接", color: "bg-secondary" },
                ].map(item => (
                  <button key={item.icon} className="flex flex-col items-center gap-2">
                    <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", item.color)}>
                      <Share2 className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => setShowShareModal(false)}
              className="w-full py-4 text-sm text-muted-foreground border-t border-border hover:bg-secondary transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
