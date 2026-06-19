"use client"

import { useState, useCallback, useEffect } from "react"
import useEmblaCarousel from "embla-carousel-react"
import { ChevronLeft, ChevronRight, Share2, Heart, MessageCircle, ShoppingCart, Play, Star, ThumbsUp, Check, Shield, Truck, RefreshCw, Award } from "lucide-react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { GroupBuyInfoCard, CouponClaimCard, CountdownBanner } from "@/components/marketing/marketing-slot"

// 模拟商品数据
const productData = {
  id: 1,
  title: "周易正义·十三经注疏本（全四册）",
  subtitle: "唐·孔颖达 疏",
  images: [
    "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=80",
    "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80",
    "https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=800&q=80",
  ],
  hasVideo: true,
  price: 68,
  originalPrice: 128,
  coupon: { value: 10, threshold: 99 },
  sales: 2341,
  stock: 856,
  specs: [
    {
      name: "版本",
      options: [
        { id: "standard", label: "标准版", price: 68, stock: 500 },
        { id: "deluxe", label: "精装版", price: 128, stock: 200 },
        { id: "collector", label: "收藏版", price: 268, stock: 50 },
      ]
    },
    {
      name: "数量",
      options: [
        { id: "1", label: "1套", price: 0, stock: 999 },
        { id: "2", label: "2套", price: 0, stock: 999 },
        { id: "3", label: "3套", price: 0, stock: 999 },
      ]
    }
  ],
  rating: 4.9,
  reviewCount: 1256,
  tags: ["质量好", "包装精美", "内容详实", "印刷清晰"],
  reviews: [
    {
      id: 1,
      user: { name: "易学爱好者", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80" },
      rating: 5,
      content: "非常好的版本，注疏详尽，印刷质量很高，纸张也很好。作为入门和进阶学习周易的必备书籍。",
      images: [
        "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&q=80",
        "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=200&q=80"
      ],
      date: "2024-03-15",
      likes: 128,
      spec: "精装版"
    },
    {
      id: 2,
      user: { name: "国学传承", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80" },
      rating: 5,
      content: "孔颖达的正义注疏是研究周易的权威版本，这个出版质量很好，值得收藏。",
      images: [],
      date: "2024-03-10",
      likes: 86,
      spec: "收藏版"
    },
    {
      id: 3,
      user: { name: "命理研究", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80" },
      rating: 4,
      content: "书的内容没话说，就是物流有点慢，等了好几天。整体还是很满意的。",
      images: ["https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=200&q=80"],
      date: "2024-03-08",
      likes: 45,
      spec: "标准版"
    },
  ],
  description: `
    《周易正义》是唐代孔颖达等奉敕编撰的儒家经典注疏，是"十三经注疏"之一，也是现存最早、最权威的《周易》注疏本。

    本书特点：
    • 原文+注释+疏解三位一体
    • 采用宋刻底本，校勘精审
    • 繁体竖排，古籍原貌
    • 全四册精装，便于翻阅收藏

    适合人群：
    • 周易研究者、国学爱好者
    • 命理学、风水学从业者
    • 高校古典文献学专业师生
    • 传统文化收藏爱好者
  `
}

// 商品图片轮播
function ProductCarousel({ images, hasVideo }: { images: string[]; hasVideo: boolean }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true })
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on("select", onSelect)
    return () => {
      emblaApi.off("select", onSelect)
    }
  }, [emblaApi, onSelect])

  return (
    <div className="relative">
      {/* 返回按钮 */}
      <button 
        onClick={() => router.back()}
        className="absolute top-4 left-4 z-20 w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center"
      >
        <ChevronLeft className="w-5 h-5 text-foreground" />
      </button>

      {/* 分享按钮 */}
      <button className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center">
        <Share2 className="w-4 h-4 text-foreground" />
      </button>

      {/* 轮播图 */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {images.map((src, index) => (
            <div key={index} className="flex-[0_0_100%] min-w-0">
              <div className="aspect-square bg-secondary relative overflow-hidden">
                <img 
                  src={src} 
                  alt={`商品图 ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {/* 视频标识 */}
                {index === 0 && hasVideo && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-background/80 flex items-center justify-center">
                      <Play className="w-6 h-6 text-foreground ml-1" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 轮播指示器 */}
      <div className="absolute bottom-4 right-4 px-2 py-1 rounded-full bg-background/80 text-xs text-foreground">
        {selectedIndex + 1} / {images.length}
      </div>
    </div>
  )
}

// 规格选择面板
function SpecPanel({ 
  isOpen, 
  onClose, 
  specs, 
  selectedSpecs, 
  onSelectSpec,
  price,
  stock,
  onAddToCart,
  onBuyNow
}: { 
  isOpen: boolean
  onClose: () => void
  specs: typeof productData.specs
  selectedSpecs: Record<string, string>
  onSelectSpec: (specName: string, optionId: string) => void
  price: number
  stock: number
  onAddToCart: () => void
  onBuyNow: () => void
}) {
  if (!isOpen) return null

  return (
    <>
      {/* 遮罩 */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      
      {/* 面板 */}
      <div className="fixed bottom-0 left-0 right-0 bg-background rounded-t-2xl z-50 max-h-[80vh] overflow-y-auto">
        <div className="p-4">
          {/* 头部 */}
          <div className="flex gap-4 pb-4 border-b border-border">
            <div className="w-24 h-24 rounded-lg bg-secondary flex items-center justify-center">
              <ShoppingCart className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-1">
                <span className="text-primary font-bold text-2xl">¥{price}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">库存 {stock} 件</p>
              <p className="text-sm text-muted-foreground">
                已选：{Object.values(selectedSpecs).join("、") || "请选择规格"}
              </p>
            </div>
          </div>

          {/* 规格选项 */}
          <div className="py-4 space-y-4">
            {specs.map((spec) => (
              <div key={spec.name}>
                <h4 className="text-sm font-medium text-foreground mb-2">{spec.name}</h4>
                <div className="flex flex-wrap gap-2">
                  {spec.options.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => onSelectSpec(spec.name, option.id)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm transition-colors",
                        selectedSpecs[spec.name] === option.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground hover:bg-secondary/80"
                      )}
                    >
                      {option.label}
                      {option.price > 0 && spec.name === "版本" && ` ¥${option.price}`}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <button 
              onClick={onAddToCart}
              className="flex-1 h-12 rounded-full bg-accent text-accent-foreground font-medium"
            >
              加入购物车
            </button>
            <button 
              onClick={onBuyNow}
              className="flex-1 h-12 rounded-full bg-primary text-primary-foreground font-medium"
            >
              立即购买
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// 评价组件
function ReviewItem({ review }: { review: typeof productData.reviews[0] }) {
  return (
    <div className="py-3">
      <div className="flex items-center gap-2">
        <Avatar className="w-8 h-8">
          <AvatarImage src={review.user.avatar} />
          <AvatarFallback className="text-xs bg-secondary">{review.user.name[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="text-sm text-foreground">{review.user.name}</p>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star 
                key={i} 
                className={cn(
                  "w-3 h-3",
                  i < review.rating ? "fill-accent text-accent" : "text-muted-foreground/30"
                )} 
              />
            ))}
          </div>
        </div>
        <span className="text-xs text-muted-foreground">{review.date}</span>
      </div>
      
      <p className="text-sm text-foreground mt-2">{review.content}</p>
      
      {review.images.length > 0 && (
        <div className="flex gap-2 mt-2">
          {review.images.map((src, index) => (
            <img 
              key={index} 
              src={src}
              alt={`评价图 ${index + 1}`}
              className="w-16 h-16 rounded-lg object-cover"
            />
          ))}
        </div>
      )}
      
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-muted-foreground">{review.spec}</span>
        <button className="flex items-center gap-1 text-xs text-muted-foreground">
          <ThumbsUp className="w-3 h-3" />
          {review.likes}
        </button>
      </div>
    </div>
  )
}

export default function ProductDetailPage() {
  const [isFavorite, setIsFavorite] = useState(false)
  const [cartCount, setCartCount] = useState(2)
  const [showSpecPanel, setShowSpecPanel] = useState(false)
  const [specAction, setSpecAction] = useState<"cart" | "buy">("cart")
  const [selectedSpecs, setSelectedSpecs] = useState<Record<string, string>>({
    "版本": "standard",
    "数量": "1"
  })
  const [showCouponTip, setShowCouponTip] = useState(false)

  const handleSelectSpec = (specName: string, optionId: string) => {
    setSelectedSpecs(prev => ({ ...prev, [specName]: optionId }))
  }

  const getCurrentPrice = () => {
    const versionSpec = productData.specs.find(s => s.name === "版本")
    const selectedOption = versionSpec?.options.find(o => o.id === selectedSpecs["版本"])
    return selectedOption?.price || productData.price
  }

  const getCurrentStock = () => {
    const versionSpec = productData.specs.find(s => s.name === "版本")
    const selectedOption = versionSpec?.options.find(o => o.id === selectedSpecs["版本"])
    return selectedOption?.stock || productData.stock
  }

  const handleAddToCart = () => {
    setCartCount(prev => prev + 1)
    setShowSpecPanel(false)
  }

  const handleBuyNow = () => {
    setShowSpecPanel(false)
    // 跳转支付页面
  }

  const openSpecPanel = (action: "cart" | "buy") => {
    setSpecAction(action)
    setShowSpecPanel(true)
  }

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      {/* 响应式布局容器 */}
      <div className="lg:flex lg:max-w-6xl lg:mx-auto lg:gap-6 lg:p-6">
        {/* 左侧图片区 - PC端固定宽度 */}
        <div className="lg:w-[480px] lg:flex-shrink-0">
          {/* 商品图片轮播 */}
          <div className="lg:rounded-xl lg:overflow-hidden lg:sticky lg:top-6">
            <ProductCarousel images={productData.images} hasVideo={productData.hasVideo} />
          </div>
        </div>

        {/* 右侧信息区 */}
        <div className="lg:flex-1 lg:min-w-0">

      {/* 营销位：商品图片下方 - 拼团/秒杀/优惠券 */}
      <div className="px-4 pt-4 space-y-2">
        {/* 拼团信息卡片 */}
        <GroupBuyInfoCard 
          groupPrice={48}
          originalPrice={productData.price}
          peopleNeeded={3}
          currentPeople={1}
          endTime={new Date(Date.now() + 24 * 60 * 60 * 1000)}
        />
        {/* 优惠券领取 */}
        <CouponClaimCard amount={10} threshold={99} />
      </div>

      {/* 价格与促销区 */}
      <Card className="mx-4 mt-4 p-4 bg-card">
        <div className="flex items-baseline gap-2">
          <span className="text-primary font-bold text-2xl">¥{productData.price}</span>
          <span className="text-muted-foreground line-through text-sm">¥{productData.originalPrice}</span>
          <Badge className="bg-primary/10 text-primary border-0 text-xs">
            {Math.round((1 - productData.price / productData.originalPrice) * 100)}% OFF
          </Badge>
        </div>
        
        <h1 className="text-lg font-semibold text-foreground mt-3">{productData.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{productData.subtitle}</p>
        
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span>销量 {productData.sales}</span>
          <span>库存 {productData.stock}</span>
        </div>

        {/* 优惠券入口 */}
        <button 
          onClick={() => setShowCouponTip(!showCouponTip)}
          className="flex items-center justify-between w-full mt-3 py-2 px-3 rounded-lg bg-primary/5 border border-primary/20"
        >
          <div className="flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground border-0 text-xs">券</Badge>
            <span className="text-sm text-foreground">满{productData.coupon.threshold}减{productData.coupon.value}</span>
          </div>
          <span className="text-xs text-primary">领取 <ChevronRight className="w-3 h-3 inline" /></span>
        </button>
      </Card>

      {/* 规格选择入口 */}
      <Card 
        className="mx-4 mt-3 p-4 bg-card cursor-pointer"
        onClick={() => openSpecPanel("cart")}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">规格</span>
            <span className="text-sm text-foreground">
              {Object.entries(selectedSpecs).map(([key, value]) => {
                const spec = productData.specs.find(s => s.name === key)
                const option = spec?.options.find(o => o.id === value)
                return option?.label
              }).join("、")}
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </Card>

      {/* 服务保障卡片 */}
      <Card className="mx-4 mt-3 p-4 bg-card">
        <h3 className="text-sm font-medium text-foreground mb-3">服务保障</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">正品保障</p>
              <p className="text-[10px] text-muted-foreground">假一赔十</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Truck className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">急速发货</p>
              <p className="text-[10px] text-muted-foreground">48小时内</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">7天退换</p>
              <p className="text-[10px] text-muted-foreground">无理由退换</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Award className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">品质认证</p>
              <p className="text-[10px] text-muted-foreground">平台严选</p>
            </div>
          </div>
        </div>
      </Card>

      {/* 商品评价区 */}
      <Card className="mx-4 mt-3 p-4 bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-foreground">商品评价</h3>
            <span className="text-sm text-muted-foreground">({productData.reviewCount})</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm text-accent font-medium">{productData.rating}</span>
            <Star className="w-4 h-4 fill-accent text-accent" />
          </div>
        </div>

        {/* 评价标签 */}
        <div className="flex flex-wrap gap-2 mt-3">
          {productData.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs border-border text-muted-foreground">
              {tag}
            </Badge>
          ))}
        </div>

        {/* 评价列表 */}
        <div className="divide-y divide-border mt-2">
          {productData.reviews.slice(0, 2).map((review) => (
            <ReviewItem key={review.id} review={review} />
          ))}
        </div>

        <button className="w-full mt-2 py-2 text-sm text-muted-foreground">
          查看全部评价 <ChevronRight className="w-4 h-4 inline" />
        </button>
      </Card>

      {/* 详情介绍区 */}
      <Card className="mx-4 mt-3 p-4 bg-card">
        <h3 className="font-medium text-foreground mb-3">商品详情</h3>
        <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
          {productData.description}
        </div>
        
        {/* 详情图片占位 */}
        <div className="mt-4 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="aspect-[4/3] bg-secondary rounded-lg flex items-center justify-center">
              <span className="text-xs text-muted-foreground">商品详情图 {i}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* PC端：右侧固定购买卡片 */}
          <div className="hidden lg:block mt-6 p-4 bg-card rounded-xl border border-border">
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-primary font-bold text-3xl">¥{productData.price}</span>
              <span className="text-muted-foreground line-through">¥{productData.originalPrice}</span>
            </div>
            <div className="space-y-3">
              <button 
                onClick={() => openSpecPanel("buy")}
                className="w-full h-12 rounded-lg bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20"
              >
                立即购买
              </button>
              <button 
                onClick={() => openSpecPanel("cart")}
                className="w-full h-12 rounded-lg bg-accent/20 text-accent font-semibold"
              >
                加入购物车
              </button>
            </div>
            <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
              <span>正品保障</span>
              <span>•</span>
              <span>7天退换</span>
              <span>•</span>
              <span>急速发货</span>
            </div>
          </div>
        </div>
      </div>

      {/* 底部操作栏 - 仅移动端显示 */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-3 flex items-center gap-3 z-30 lg:hidden">
        {/* 左侧图标 */}
        <div className="flex items-center gap-4">
          <button className="flex flex-col items-center gap-0.5">
            <MessageCircle className="w-5 h-5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">客服</span>
          </button>
          
          <button className="flex flex-col items-center gap-0.5 relative">
            <ShoppingCart className="w-5 h-5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">购物车</span>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
          
          <button 
            className="flex flex-col items-center gap-0.5"
            onClick={() => setIsFavorite(!isFavorite)}
          >
            <Heart className={cn(
              "w-5 h-5",
              isFavorite ? "fill-primary text-primary" : "text-muted-foreground"
            )} />
            <span className="text-[10px] text-muted-foreground">收藏</span>
          </button>
        </div>

        {/* 右侧按钮 */}
        <div className="flex-1 flex gap-2">
          <button 
            onClick={() => openSpecPanel("cart")}
            className="flex-1 h-11 rounded-full bg-accent text-accent-foreground font-medium text-sm"
          >
            加入购物车
          </button>
          <button 
            onClick={() => openSpecPanel("buy")}
            className="flex-1 h-11 rounded-full bg-primary text-primary-foreground font-medium text-sm"
          >
            立即购买
          </button>
        </div>
      </div>

      {/* 规格选择面板 */}
      <SpecPanel
        isOpen={showSpecPanel}
        onClose={() => setShowSpecPanel(false)}
        specs={productData.specs}
        selectedSpecs={selectedSpecs}
        onSelectSpec={handleSelectSpec}
        price={getCurrentPrice()}
        stock={getCurrentStock()}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
      />
    </div>
  )
}
