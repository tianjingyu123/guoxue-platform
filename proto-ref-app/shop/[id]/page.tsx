"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ChevronLeft, Share2, Heart, Star, ShoppingCart, Minus, Plus, X, ChevronRight, Check } from "lucide-react"
import { shopApi, type ProductDetail, type ProductSku, type ProductReview } from "@/lib/api"
import { Disclaimer } from "@/components/compliance/disclaimer"

// Mock数据
const mockProduct: ProductDetail = {
  id: "1",
  name: "精装《周易全解》典藏版 - 王弼注释本",
  cover: "/placeholder.svg?height=400&width=400",
  price: 168,
  originalPrice: 298,
  sales: 2580,
  rating: 4.9,
  category: "国学书籍",
  tags: ["精装", "典藏"],
  isHot: true,
  images: [
    "/placeholder.svg?height=400&width=400&text=图1",
    "/placeholder.svg?height=400&width=400&text=图2",
    "/placeholder.svg?height=400&width=400&text=图3",
    "/placeholder.svg?height=400&width=400&text=图4",
  ],
  description: "本书为《周易》经典注释本，由三国时期著名学者王弼注释...",
  specs: [
    { name: "出版社", value: "中华书局" },
    { name: "页数", value: "568页" },
    { name: "装帧", value: "精装" },
    { name: "开本", value: "16开" },
  ],
  stock: 99,
  shipping: "包邮",
  reviews: 368,
  skus: [
    { id: "sku1", name: "精装版", attrs: [{ name: "版本", value: "精装" }], price: 168, originalPrice: 298, stock: 50, image: "/placeholder.svg?height=400&width=400&text=精装版" },
    { id: "sku2", name: "平装版", attrs: [{ name: "版本", value: "平装" }], price: 98, originalPrice: 168, stock: 80, image: "/placeholder.svg?height=400&width=400&text=平装版" },
    { id: "sku3", name: "典藏礼盒版", attrs: [{ name: "版本", value: "典藏礼盒" }], price: 368, originalPrice: 498, stock: 20, image: "/placeholder.svg?height=400&width=400&text=典藏版" },
  ],
}

const mockReviews: ProductReview[] = [
  { id: "1", user: { id: "u1", name: "国学爱好者", avatar: "/placeholder.svg" }, rating: 5, content: "印刷精美，注释详尽，非常满意！", skuName: "精装版", createdAt: "2024-01-15", likes: 28, images: ["/placeholder.svg?height=100&width=100"] },
  { id: "2", user: { id: "u2", name: "易学研究者", avatar: "/placeholder.svg" }, rating: 5, content: "王弼注释很有深度，适合深入研究。", skuName: "典藏礼盒版", createdAt: "2024-01-10", likes: 15 },
  { id: "3", user: { id: "u3", name: "读书人", avatar: "/placeholder.svg" }, rating: 4, content: "纸张质量很好，物流也很快。", skuName: "平装版", createdAt: "2024-01-08", likes: 8 },
]

// 骨架屏
function ProductSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] animate-pulse">
      <div className="aspect-square bg-gray-200" />
      <div className="p-4 space-y-4">
        <div className="h-6 bg-gray-200 rounded w-3/4" />
        <div className="h-8 bg-gray-200 rounded w-1/2" />
        <div className="h-20 bg-gray-200 rounded" />
      </div>
    </div>
  )
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [loading, setLoading] = useState(true)
  const [currentImage, setCurrentImage] = useState(0)
  const [isFavorite, setIsFavorite] = useState(false)
  const [showSkuPanel, setShowSkuPanel] = useState(false)
  const [selectedSku, setSelectedSku] = useState<ProductSku | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [buyMode, setBuyMode] = useState<'cart' | 'buy'>('cart')
  const [showImageViewer, setShowImageViewer] = useState(false)
  const [cartAnimation, setCartAnimation] = useState(false)
  const [addedToast, setAddedToast] = useState(false)
  const [flyAnimation, setFlyAnimation] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productRes, reviewsRes] = await Promise.all([
          shopApi.productDetail(params.id as string),
          shopApi.listReviews(params.id as string, { pageSize: 3 }),
        ])
        setProduct(productRes)
        setReviews(reviewsRes.data)
        if (productRes.skus?.length) {
          setSelectedSku(productRes.skus[0])
        }
      } catch {
        setProduct(mockProduct)
        setReviews(mockReviews)
        setSelectedSku(mockProduct.skus[0])
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [params.id])

  const handleAddToCart = async () => {
    if (!selectedSku) return
    setCartAnimation(true)
    setFlyAnimation(true)
    try {
      await shopApi.addToCart(product!.id, selectedSku.id, quantity)
    } catch {}
    setTimeout(() => {
      setFlyAnimation(false)
      setAddedToast(true)
      setTimeout(() => setAddedToast(false), 2000)
    }, 400)
    setTimeout(() => {
      setCartAnimation(false)
      setShowSkuPanel(false)
    }, 600)
  }
  
  // SKU切换时更新主图
  const handleSkuChange = (sku: ProductSku) => {
    setSelectedSku(sku)
    // 如果SKU有独立图片，切换到该图片
    if (sku.image) {
      const skuImageIndex = product?.images.findIndex(img => img === sku.image)
      if (skuImageIndex !== undefined && skuImageIndex >= 0) {
        setCurrentImage(skuImageIndex)
      }
    }
  }

  const handleBuyNow = () => {
    if (!selectedSku) return
    router.push(`/shop/checkout?productId=${product?.id}&skuId=${selectedSku.id}&quantity=${quantity}`)
  }

  if (loading) return <ProductSkeleton />
  if (!product) return null

  const currentPrice = selectedSku?.price || product.price
  const currentOriginalPrice = selectedSku?.originalPrice || product.originalPrice

  // 养生保健类商品：需展示专业医疗免责声明
  const healthKeywords = ["养生", "保健", "中医", "理疗", "艾灸", "推拿", "经络", "食疗", "针灸", "健康", "调理"]
  const productText = `${product.name ?? ""} ${product.category ?? ""} ${product.description ?? ""} ${(product.tags ?? []).join(" ")}`
  const isHealthProduct = healthKeywords.some((kw) => productText.includes(kw))

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-20">
      {/* 顶部导航 */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-sm">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex gap-2">
          <button onClick={() => setIsFavorite(!isFavorite)} className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center">
            <Heart className={`w-5 h-5 ${isFavorite ? 'fill-[#C41E3A] text-[#C41E3A]' : ''}`} />
          </button>
          <button className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 图片轮播 */}
      <div className="relative aspect-square bg-white" onClick={() => setShowImageViewer(true)}>
        <img
          src={product.images[currentImage]}
          alt={product.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
          {product.images.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setCurrentImage(i) }}
              className={`w-2 h-2 rounded-full transition-all ${i === currentImage ? 'w-4 bg-[#C41E3A]' : 'bg-black/20'}`}
            />
          ))}
        </div>
        {product.isHot && (
          <span className="absolute top-16 left-0 px-3 py-1 bg-gradient-to-r from-[#C41E3A] to-[#E85A71] text-white text-xs font-medium rounded-r-full">
            热销
          </span>
        )}
      </div>

      {/* 价格信息 */}
      <div className="bg-white p-4">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-2xl font-bold text-[#C41E3A]">¥{currentPrice}</span>
          <span className="text-sm text-[#999999] line-through">¥{currentOriginalPrice}</span>
          <span className="px-1.5 py-0.5 bg-[#FFF0F0] text-[#C41E3A] text-xs rounded">
            省¥{currentOriginalPrice - currentPrice}
          </span>
        </div>
        <h1 className="text-lg font-medium text-[#2C2C2C] leading-snug mb-3">{product.name}</h1>
        <div className="flex items-center gap-4 text-sm text-[#666666]">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-[#C9A96E] text-[#C9A96E]" />
            <span>{product.rating}</span>
          </div>
          <span>已售{product.sales}+</span>
          <span>{product.shipping}</span>
        </div>
      </div>

      {/* SKU选择入口 */}
      <button
        onClick={() => { setShowSkuPanel(true); setBuyMode('cart') }}
        className="w-full mt-2 bg-white p-4 flex items-center justify-between"
      >
        <span className="text-[#666666]">已选</span>
        <div className="flex items-center gap-2">
          <span className="text-[#2C2C2C]">{selectedSku?.name || '请选择规格'} x{quantity}</span>
          <ChevronRight className="w-4 h-4 text-[#999999]" />
        </div>
      </button>

      {/* 规格参数 */}
      <div className="mt-2 bg-white p-4">
        <h3 className="font-medium text-[#2C2C2C] mb-3">规格参数</h3>
        <div className="grid grid-cols-2 gap-2">
          {product.specs.map((spec, i) => (
            <div key={i} className="flex text-sm">
              <span className="text-[#999999] w-16">{spec.name}</span>
              <span className="text-[#666666]">{spec.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 评价预览 */}
      <div className="mt-2 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-[#2C2C2C]">用户评价 ({product.reviews})</h3>
          <button onClick={() => router.push(`/shop/${product.id}/reviews`)} className="text-sm text-[#C41E3A] flex items-center">
            查看全部 <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-4 mb-4 pb-3 border-b border-[#E8E3DB]">
          <div className="flex items-center gap-1">
            <span className="text-2xl font-bold text-[#C41E3A]">{product.rating}</span>
            <div className="flex">
              {[1,2,3,4,5].map(s => (
                <Star key={s} className={`w-4 h-4 ${s <= Math.round(product.rating) ? 'fill-[#C9A96E] text-[#C9A96E]' : 'text-gray-300'}`} />
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          {reviews.map(review => (
            <div key={review.id} className="pb-4 border-b border-[#E8E3DB] last:border-0 last:pb-0">
              <div className="flex items-center gap-2 mb-2">
                <img src={review.user.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                <div>
                  <p className="text-sm text-[#2C2C2C]">{review.user.name}</p>
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-3 h-3 ${s <= review.rating ? 'fill-[#C9A96E] text-[#C9A96E]' : 'text-gray-300'}`} />
                    ))}
                    {review.skuName && <span className="text-xs text-[#999999] ml-2">{review.skuName}</span>}
                  </div>
                </div>
              </div>
              <p className="text-sm text-[#666666] mb-2">{review.content}</p>
              {review.images && (
                <div className="flex gap-2">
                  {review.images.map((img, i) => (
                    <img key={i} src={img} alt="" className="w-16 h-16 rounded object-cover" />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 商品详情���文 */}
      <div className="mt-2 bg-white p-4">
        <h3 className="font-medium text-[#2C2C2C] mb-3">商品详情</h3>
        <div className="text-sm text-[#666666] leading-relaxed whitespace-pre-wrap">
          {product.description}
        </div>
      </div>

      {/* 养生保健类商品：专业医疗免责声明 */}
      {isHealthProduct && (
        <div className="mt-2 px-4">
          <Disclaimer variant="medical" tone="card" />
        </div>
      )}

      {/* 底部购买栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E3DB] p-4 flex items-center gap-3 z-40">
        <button onClick={() => router.push('/shop/cart')} className="flex flex-col items-center relative">
          <ShoppingCart className="w-6 h-6 text-[#666666]" />
          <span className="text-xs text-[#666666]">购物车</span>
          {cartAnimation && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#C41E3A] rounded-full flex items-center justify-center animate-bounce">
              <Check className="w-3 h-3 text-white" />
            </span>
          )}
        </button>
        <button
          onClick={() => { setShowSkuPanel(true); setBuyMode('cart') }}
          className="flex-1 py-3 bg-gradient-to-r from-[#C9A96E] to-[#D4B87A] text-white font-medium rounded-full"
        >
          加入购物车
        </button>
        <button
          onClick={() => { setShowSkuPanel(true); setBuyMode('buy') }}
          className="flex-1 py-3 bg-gradient-to-r from-[#C41E3A] to-[#E85A71] text-white font-medium rounded-full"
        >
          立即购买
        </button>
      </div>

      {/* SKU选择面板 */}
      {showSkuPanel && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowSkuPanel(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative w-full bg-white rounded-t-2xl max-h-[70vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white p-4 border-b border-[#E8E3DB] flex items-start gap-3">
              <img src={selectedSku?.image || product.images[0]} alt="" className="w-20 h-20 rounded-lg object-cover" />
              <div className="flex-1">
                <p className="text-xl font-bold text-[#C41E3A]">¥{selectedSku?.price || product.price}</p>
                <p className="text-sm text-[#999999]">库存 {selectedSku?.stock || product.stock}</p>
                <p className="text-sm text-[#666666]">已选：{selectedSku?.name}</p>
              </div>
              <button onClick={() => setShowSkuPanel(false)}>
                <X className="w-6 h-6 text-[#999999]" />
              </button>
            </div>
            
            <div className="p-4">
              <h4 className="text-sm font-medium text-[#2C2C2C] mb-3">规格</h4>
              <div className="flex flex-wrap gap-2 mb-6">
                {product.skus.map(sku => (
                  <button
                    key={sku.id}
                    onClick={() => handleSkuChange(sku)}
                    disabled={sku.stock === 0}
                    className={`px-4 py-2 rounded-full text-sm border transition-all ${
                      selectedSku?.id === sku.id
                        ? 'border-[#C41E3A] bg-[#FFF0F0] text-[#C41E3A]'
                        : sku.stock === 0
                        ? 'border-gray-200 text-gray-400 line-through'
                        : 'border-[#E8E3DB] text-[#666666]'
                    }`}
                  >
                    {sku.name}
                  </button>
                ))}
              </div>
              
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm font-medium text-[#2C2C2C]">数量</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded-full border border-[#E8E3DB] flex items-center justify-center"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 text-center font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(selectedSku?.stock || 99, quantity + 1))}
                    className="w-8 h-8 rounded-full border border-[#E8E3DB] flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-4 pt-0">
              <button
                onClick={buyMode === 'cart' ? handleAddToCart : handleBuyNow}
                className={`w-full py-3 font-medium rounded-full text-white ${
                  buyMode === 'cart'
                    ? 'bg-gradient-to-r from-[#C9A96E] to-[#D4B87A]'
                    : 'bg-gradient-to-r from-[#C41E3A] to-[#E85A71]'
                }`}
              >
                {buyMode === 'cart' ? '加入购物车' : '立即购买'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 加购成功Toast */}
      {addedToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 bg-black/80 text-white text-sm rounded-full flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-green-400" />
          已加入购物车
        </div>
      )}
      
      {/* 飞入购物车动画 */}
      {flyAnimation && (
        <div className="fixed z-[60] w-10 h-10 bg-[#C41E3A] rounded-full flex items-center justify-center animate-fly-to-cart"
          style={{
            left: 'calc(50% - 20px)',
            top: '50%',
          }}
        >
          <ShoppingCart className="w-5 h-5 text-white" />
        </div>
      )}

      {/* 图片浏览器 */}
      {showImageViewer && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" onClick={() => setShowImageViewer(false)}>
          <button onClick={() => setShowImageViewer(false)} className="absolute top-4 right-4 text-white">
            <X className="w-6 h-6" />
          </button>
          <img
            src={product.images[currentImage]}
            alt=""
            className="max-w-full max-h-full object-contain"
          />
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
            {product.images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setCurrentImage(i) }}
                className={`w-2 h-2 rounded-full ${i === currentImage ? 'bg-white' : 'bg-white/40'}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
