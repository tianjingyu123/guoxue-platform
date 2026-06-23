"use client"

import { useState, useEffect, useRef, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { 
  X, Heart, MessageCircle, Share2, ShoppingCart, Gift, 
  ChevronRight, ChevronUp, Volume2, VolumeX, Users, Star,
  Plus, Minus, Check, Sparkles, Crown, MoreHorizontal
} from "lucide-react"
import { cn } from "@/lib/utils"
import { QuickBuySheet, type QuickBuyProduct } from "@/components/live/quick-buy-sheet"

interface Comment {
  id: string
  userName: string
  content: string
  type: 'text' | 'gift' | 'system' | 'enter'
  isHost?: boolean
  giftInfo?: { name: string; icon: string; count: number }
}

interface LiveProduct {
  id: string
  name: string
  cover: string
  price: number
  originalPrice: number
  stock: number
  sold: number
  isExplaining?: boolean
}

interface LiveGift {
  id: string
  name: string
  icon: string
  price: number
}

// 模拟直播间数据
const mockRoom = {
  id: "1",
  title: "开光吉祥物专场：招财貔貅限时特惠",
  hostName: "福缘阁主",
  hostAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
  hostLevel: 5,
  followers: 12800,
  isFollowed: false,
  viewerCount: 8920,
  likeCount: 32100,
  onlineAvatars: [
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop",
  ]
}

// 初始弹幕
const initialComments: Comment[] = [
  { id: "1", userName: "系统", content: "欢迎来到直播间，请文明观看", type: "system" },
  { id: "2", userName: "易学爱好者", content: "主播讲得太好了！", type: "text" },
]

// 模拟新弹幕池
const commentPool = [
  { userName: "国学新人", content: "这个怎么买？", type: "text" as const },
  { userName: "风水迷", content: "价格很实惠", type: "text" as const },
  { userName: "命理小白", content: "主播介绍一下", type: "text" as const },
  { userName: "易道弟子", content: "666", type: "text" as const },
  { userName: "玄学爱好者", content: "抢到了！", type: "text" as const },
  { userName: "福气满满", content: "什么时候发货？", type: "text" as const },
]

const enterPool = ["紫微门人", "风水小白", "命理初学", "国学传承", "易学新手"]

// 商品数据
const mockProducts: LiveProduct[] = [
  { 
    id: "1", 
    name: "开光招财貔貅摆件 天然黑曜石", 
    cover: "https://images.unsplash.com/photo-1555421689-491a97ff2040?w=200&h=200&fit=crop", 
    price: 299, 
    originalPrice: 599, 
    stock: 56, 
    sold: 1280,
    isExplaining: true
  },
  { 
    id: "2", 
    name: "五帝钱挂件 真品铜钱招财镇宅", 
    cover: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=200&h=200&fit=crop", 
    price: 128, 
    originalPrice: 268, 
    stock: 128, 
    sold: 2350
  },
  { 
    id: "3", 
    name: "天然黄水晶转运葫芦", 
    cover: "https://images.unsplash.com/photo-1509909756405-be0199881695?w=200&h=200&fit=crop", 
    price: 168, 
    originalPrice: 328, 
    stock: 89, 
    sold: 890
  },
]

// 礼物数据
const mockGifts: LiveGift[] = [
  { id: "1", name: "小红花", icon: "🌸", price: 1 },
  { id: "2", name: "鼓掌", icon: "👏", price: 5 },
  { id: "3", name: "比心", icon: "💕", price: 10 },
  { id: "4", name: "皇冠", icon: "👑", price: 50 },
  { id: "5", name: "火箭", icon: "🚀", price: 100 },
  { id: "6", name: "城堡", icon: "🏰", price: 520 },
]

function VerticalLiveContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [isFollowing, setIsFollowing] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [likeCount, setLikeCount] = useState(mockRoom.likeCount)
  const [viewerCount, setViewerCount] = useState(mockRoom.viewerCount)
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; x: number; scale: number }[]>([])
  const [commentInput, setCommentInput] = useState("")
  const [showCommentInput, setShowCommentInput] = useState(false)
  const [showGiftPanel, setShowGiftPanel] = useState(false)
  const [showProductList, setShowProductList] = useState(false)
  const [showProductDetail, setShowProductDetail] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<LiveProduct | null>(null)
  const [giftAnimations, setGiftAnimations] = useState<{ id: number; gift: LiveGift; user: string }[]>([])
  
  const commentsRef = useRef<HTMLDivElement>(null)
  const heartIdRef = useRef(0)
  const giftIdRef = useRef(0)

  // 自动滚动弹幕
  useEffect(() => {
    if (commentsRef.current) {
      commentsRef.current.scrollTop = commentsRef.current.scrollHeight
    }
  }, [comments])

  // 模拟新弹幕
  useEffect(() => {
    const timer = setInterval(() => {
      const rand = Math.random()
      if (rand < 0.7) {
        const comment = commentPool[Math.floor(Math.random() * commentPool.length)]
        const newComment: Comment = {
          id: Date.now().toString(),
          userName: comment.userName,
          content: comment.content,
          type: comment.type
        }
        setComments(prev => [...prev.slice(-20), newComment])
      } else {
        const userName = enterPool[Math.floor(Math.random() * enterPool.length)]
        const enterComment: Comment = {
          id: Date.now().toString(),
          userName: userName,
          content: "进入了直播间",
          type: "enter"
        }
        setComments(prev => [...prev.slice(-20), enterComment])
        setViewerCount(prev => prev + 1)
      }
    }, 2500)
    return () => clearInterval(timer)
  }, [])

  // 双击点赞
  const handleDoubleTap = useCallback(() => {
    setLikeCount(prev => prev + 1)
    const id = heartIdRef.current++
    const x = Math.random() * 60 - 30
    const scale = 0.8 + Math.random() * 0.4
    setFloatingHearts(prev => [...prev, { id, x, scale }])
    setTimeout(() => {
      setFloatingHearts(prev => prev.filter(h => h.id !== id))
    }, 1500)
  }, [])

  // 发送弹幕
  const handleSendComment = () => {
    if (!commentInput.trim()) return
    const newComment: Comment = {
      id: Date.now().toString(),
      userName: "我",
      content: commentInput,
      type: "text"
    }
    setComments(prev => [...prev.slice(-20), newComment])
    setCommentInput("")
    setShowCommentInput(false)
  }

  // 送礼物
  const handleSendGift = (gift: LiveGift) => {
    const id = giftIdRef.current++
    setGiftAnimations(prev => [...prev, { id, gift, user: "我" }])
    
    const giftComment: Comment = {
      id: Date.now().toString(),
      userName: "我",
      content: "",
      type: "gift",
      giftInfo: { name: gift.name, icon: gift.icon, count: 1 }
    }
    setComments(prev => [...prev.slice(-20), giftComment])
    
    setTimeout(() => {
      setGiftAnimations(prev => prev.filter(g => g.id !== id))
    }, 3000)
    setShowGiftPanel(false)
  }

  const formatCount = (count: number) => {
    if (count >= 10000) return `${(count / 10000).toFixed(1)}万`
    return count.toString()
  }

  const currentProduct = mockProducts.find(p => p.isExplaining) || mockProducts[0]

  return (
    <div 
      className="fixed inset-0 bg-black"
      onDoubleClick={handleDoubleTap}
    >
      {/* 视频背景 */}
      <div className="absolute inset-0">
        <Image 
          src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=1200&fit=crop" 
          alt="Live" 
          fill 
          className="object-cover" 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80" />
      </div>

      {/* 顶部信息栏 */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 pt-12">
        <div className="flex items-center justify-between">
          {/* 主播信息 */}
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-full p-1 pr-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#C41E3A]">
                <Image src={mockRoom.hostAvatar} alt={mockRoom.hostName} fill className="object-cover" />
              </div>
              <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 bg-[#C41E3A] text-white text-[8px] px-1.5 rounded-sm font-medium">
                LIVE
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-white text-sm font-medium">{mockRoom.hostName}</span>
                <div className="flex items-center gap-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full px-1.5 py-0.5">
                  <Crown className="w-2.5 h-2.5 text-white" />
                  <span className="text-[10px] text-white font-medium">Lv.{mockRoom.hostLevel}</span>
                </div>
              </div>
              <div className="text-white/70 text-xs">{formatCount(mockRoom.followers)} 粉丝</div>
            </div>
            <button 
              onClick={() => setIsFollowing(!isFollowing)}
              className={cn(
                "ml-1 px-3 py-1 rounded-full text-xs font-medium transition-all",
                isFollowing ? "bg-white/20 text-white/80" : "bg-[#C41E3A] text-white"
              )}
            >
              {isFollowing ? "已关注" : "关注"}
            </button>
          </div>

          {/* 右侧：观看人数 + 关闭 */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md rounded-full px-3 py-1.5">
              <Users className="w-3.5 h-3.5 text-white/70" />
              <span className="text-white text-xs">{formatCount(viewerCount)}</span>
            </div>
            <button 
              onClick={() => router.back()}
              className="w-8 h-8 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* 在线观众头像 */}
        <div className="flex items-center mt-3 gap-1">
          {mockRoom.onlineAvatars.map((avatar, i) => (
            <div key={i} className="w-6 h-6 rounded-full overflow-hidden border border-white/40 -ml-1 first:ml-0">
              <Image src={avatar} alt="" width={24} height={24} className="object-cover" />
            </div>
          ))}
          <span className="text-white/60 text-xs ml-1">+{formatCount(viewerCount - 3)}</span>
        </div>
      </div>

      {/* 礼物动画 */}
      {giftAnimations.map(anim => (
        <div 
          key={anim.id}
          className="absolute left-4 top-1/3 z-30 animate-in slide-in-from-left duration-500"
        >
          <div className="bg-gradient-to-r from-[#C41E3A]/90 to-[#C9A96E]/90 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-2xl">
              {anim.gift.icon}
            </div>
            <div>
              <div className="text-white text-sm font-medium">{anim.user}</div>
              <div className="text-white/80 text-xs">送出 {anim.gift.name}</div>
            </div>
          </div>
        </div>
      ))}

      {/* 飘心动画 - 放在右侧底部上方 */}
      <div className="absolute right-4 bottom-44 w-16 h-32 pointer-events-none z-20">
        {floatingHearts.map(heart => (
          <div
            key={heart.id}
            className="absolute bottom-0 left-1/2"
            style={{ 
              transform: `translateX(${heart.x}px) scale(${heart.scale})`,
              animation: "floatUp 1.5s ease-out forwards"
            }}
          >
            <Heart className="w-7 h-7 text-[#C41E3A] fill-[#C41E3A]" />
          </div>
        ))}
      </div>

      {/* 弹幕区域 - 左侧中下部 */}
      <div className="absolute left-4 bottom-44 w-72 z-10">
        <div 
          ref={commentsRef}
          className="max-h-52 overflow-y-auto scrollbar-hide space-y-1.5"
        >
          {comments.map(comment => (
            <div key={comment.id} className="animate-in slide-in-from-left duration-300">
              {comment.type === 'system' ? (
                <div className="inline-block bg-[#C9A96E]/80 backdrop-blur-sm rounded-lg px-2.5 py-1">
                  <span className="text-white text-xs">{comment.content}</span>
                </div>
              ) : comment.type === 'enter' ? (
                <div className="inline-block bg-white/15 backdrop-blur-sm rounded-lg px-2.5 py-1">
                  <span className="text-[#C9A96E] text-xs">{comment.userName} </span>
                  <span className="text-white/60 text-xs">{comment.content}</span>
                </div>
              ) : comment.type === 'gift' ? (
                <div className="inline-block bg-gradient-to-r from-[#C41E3A]/50 to-[#C9A96E]/50 backdrop-blur-sm rounded-lg px-2.5 py-1">
                  <span className="text-[#FFD700] text-xs">{comment.userName} </span>
                  <span className="text-white text-xs">送出 {comment.giftInfo?.icon} × {comment.giftInfo?.count}</span>
                </div>
              ) : (
                <div className="inline-block bg-black/30 backdrop-blur-sm rounded-lg px-2.5 py-1">
                  <span className={cn("text-xs", comment.isHost ? "text-[#C41E3A]" : "text-[#C9A96E]")}>
                    {comment.userName}:
                  </span>
                  <span className="text-white text-xs ml-1">{comment.content}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 商品浮窗 - 低干扰设计，放在弹幕下方 */}
      {currentProduct && (
        <button
          onClick={() => { setSelectedProduct(currentProduct); setShowProductDetail(true) }}
          className="absolute left-4 right-4 bottom-[120px] z-10"
        >
          <div className="bg-black/50 backdrop-blur-md rounded-xl p-2.5 flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
              <Image src={currentProduct.cover} alt="" fill className="object-cover" />
              <div className="absolute top-0 left-0 bg-[#C41E3A] text-white text-[8px] px-1 py-0.5 rounded-br">
                讲解中
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm line-clamp-1">{currentProduct.name}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[#C41E3A] font-bold text-sm">¥{currentProduct.price}</span>
                <span className="text-white/40 text-xs line-through">¥{currentProduct.originalPrice}</span>
              </div>
            </div>
            <div className="bg-[#C41E3A] text-white text-xs px-3 py-1.5 rounded-full font-medium">
              立即购买
            </div>
          </div>
        </button>
      )}

      {/* ========== 底部操作栏 - 直播核心交互区 ========== */}
      <div className="absolute bottom-0 left-0 right-0 z-20 safe-area-pb">
        <div className="px-4 pb-4 pt-2">
          <div className="flex items-center gap-2">
            {/* 弹幕输入框 */}
            <button
              onClick={() => setShowCommentInput(true)}
              className="flex-1 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2.5 text-white/50 text-sm text-left"
            >
              说点什么...
            </button>

            {/* 商品列表按钮 */}
            <button
              onClick={() => setShowProductList(true)}
              className="relative w-11 h-11 bg-[#C41E3A] rounded-full flex items-center justify-center"
            >
              <ShoppingCart className="w-5 h-5 text-white" />
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 bg-[#C9A96E] rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                {mockProducts.length}
              </span>
            </button>

            {/* 礼物按钮 */}
            <button
              onClick={() => setShowGiftPanel(true)}
              className="w-11 h-11 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center"
            >
              <Gift className="w-5 h-5 text-white" />
            </button>

            {/* 点赞按钮 */}
            <button
              onClick={handleDoubleTap}
              className="w-11 h-11 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center"
            >
              <Heart className="w-5 h-5 text-[#C41E3A] fill-[#C41E3A]" />
            </button>

            {/* 分享按钮 */}
            <button
              className="w-11 h-11 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center"
            >
              <Share2 className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* ========== 弹幕输入框弹窗 ========== */}
      {showCommentInput && (
        <div className="fixed inset-0 z-50" onClick={() => setShowCommentInput(false)}>
          <div className="absolute bottom-0 left-0 right-0 bg-[#1a1a1a] p-4 pb-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={commentInput}
                onChange={e => setCommentInput(e.target.value)}
                placeholder="发送弹幕..."
                className="flex-1 bg-white/10 rounded-full px-4 py-3 text-white placeholder-white/40 outline-none text-sm"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSendComment()}
              />
              <button
                onClick={handleSendComment}
                disabled={!commentInput.trim()}
                className="w-12 h-12 bg-[#C41E3A] disabled:bg-gray-600 rounded-full flex items-center justify-center"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== 礼物面板 ========== */}
      {showGiftPanel && (
        <div className="fixed inset-0 z-50 bg-black/60" onClick={() => setShowGiftPanel(false)}>
          <div 
            className="absolute bottom-0 left-0 right-0 bg-[#1a1a1a] rounded-t-3xl p-4 pb-8 animate-in slide-in-from-bottom duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">送礼物</h3>
              <button onClick={() => setShowGiftPanel(false)}>
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {mockGifts.map(gift => (
                <button
                  key={gift.id}
                  onClick={() => handleSendGift(gift)}
                  className="flex flex-col items-center gap-1.5 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <span className="text-3xl">{gift.icon}</span>
                  <span className="text-white text-xs">{gift.name}</span>
                  <span className="text-[#C9A96E] text-[10px]">{gift.price}热币</span>
                </button>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-white/60 text-xs">余额：520 热币</span>
              <button className="text-[#C41E3A] text-xs">充值</button>
            </div>
          </div>
        </div>
      )}

      {/* ========== 商品列表弹窗 ========== */}
      {showProductList && (
        <div className="fixed inset-0 z-50 bg-black/60" onClick={() => setShowProductList(false)}>
          <div 
            className="absolute bottom-0 left-0 right-0 bg-[#1a1a1a] rounded-t-3xl max-h-[70vh] flex flex-col animate-in slide-in-from-bottom duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-white font-medium">直播间好物</h3>
              <button onClick={() => setShowProductList(false)}>
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {mockProducts.map((product, idx) => (
                <button
                  key={product.id}
                  onClick={() => { setSelectedProduct(product); setShowProductDetail(true); setShowProductList(false) }}
                  className="w-full flex items-center gap-3 p-3 bg-white/5 rounded-xl text-left"
                >
                  <div className="relative">
                    <span className="absolute -left-1 -top-1 w-5 h-5 bg-[#C41E3A] rounded-full flex items-center justify-center text-white text-[10px] font-bold z-10">
                      {idx + 1}
                    </span>
                    <div className="w-16 h-16 rounded-lg overflow-hidden">
                      <Image src={product.cover} alt="" fill className="object-cover" />
                    </div>
                    {product.isExplaining && (
                      <div className="absolute bottom-0 left-0 right-0 bg-[#C41E3A] text-white text-[8px] text-center py-0.5">
                        讲解中
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm line-clamp-2">{product.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[#C41E3A] font-bold">¥{product.price}</span>
                      <span className="text-white/40 text-xs line-through">¥{product.originalPrice}</span>
                    </div>
                    <div className="text-white/50 text-xs mt-0.5">已售 {product.sold}</div>
                  </div>
                  <div className="bg-[#C41E3A] text-white text-xs px-4 py-2 rounded-full font-medium">
                    立即购买
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========== 半屏确认订单 - 直播间极短购买链路 ========== */}
      <QuickBuySheet
        open={showProductDetail && !!selectedProduct}
        product={
          selectedProduct
            ? {
                id: selectedProduct.id,
                name: selectedProduct.name,
                cover: selectedProduct.cover,
                price: selectedProduct.price,
                originalPrice: selectedProduct.originalPrice,
                stock: selectedProduct.stock,
                sold: selectedProduct.sold,
                skus: ["标准装", "豪华装", "套装"],
              }
            : null
        }
        onClose={() => setShowProductDetail(false)}
      />

      {/* 飘心动画样式 */}
      <style jsx global>{`
        @keyframes floatUp {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-120px) scale(0.5);
          }
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .safe-area-pb {
          padding-bottom: max(16px, env(safe-area-inset-bottom));
        }
      `}</style>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#C41E3A] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function VerticalLivePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VerticalLiveContent />
    </Suspense>
  )
}
