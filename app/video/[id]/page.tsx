"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark, 
  ShoppingBag, 
  ShoppingCart,
  ChevronLeft, 
  Plus, 
  Minus,
  Play, 
  Pause,
  Volume2,
  VolumeX,
  Music,
  X,
  Check,
  ChevronUp,
  ChevronDown,
  Star
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

// 模拟视频数据
const mockVideos = [
  {
    id: "1",
    title: "八字命理入门：教你看懂自己的命盘",
    author: {
      id: "1",
      name: "易学张老师",
      avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=teacher1",
      isFollowed: false,
      followers: 128000,
      verified: true
    },
    coverUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=700&fit=crop",
    videoUrl: "",
    likes: 12680,
    comments: 856,
    shares: 234,
    isLiked: false,
    isCollected: false,
    music: "原声 - 易学张老师",
    products: [
      {
        id: "p1",
        name: "八字命理学入门书籍",
        price: 68,
        originalPrice: 98,
        image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=100&h=100&fit=crop",
        sales: 3280
      }
    ],
    hotComments: [
      { user: "小白学易", content: "终于懂了，讲得太清楚了！", likes: 328 },
      { user: "命理爱好者", content: "老师能讲讲大运流年吗？", likes: 156 },
    ]
  },
  {
    id: "2",
    title: "紫微斗数：你的命宫主星是什么？#紫微斗数 #命理",
    author: {
      id: "2",
      name: "紫微斗数林师傅",
      avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=teacher2",
      isFollowed: true,
      followers: 86000,
      verified: true
    },
    coverUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&h=700&fit=crop",
    videoUrl: "",
    likes: 8920,
    comments: 562,
    shares: 189,
    isLiked: true,
    isCollected: false,
    music: "古风BGM - 云水禅心",
    products: [],
    hotComments: [
      { user: "紫微迷", content: "我是天府星，说得好准！", likes: 89 },
    ]
  },
  {
    id: "3",
    title: "风水布局：客厅财位怎么找？这几点要注意",
    author: {
      id: "3",
      name: "风水大师王",
      avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=master1",
      isFollowed: false,
      followers: 256000,
      verified: true
    },
    coverUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=700&fit=crop",
    videoUrl: "",
    likes: 23500,
    comments: 1280,
    shares: 567,
    isLiked: false,
    isCollected: true,
    music: "轻音乐 - 福运连连",
    products: [
      {
        id: "p2",
        name: "招财貔貅摆件 天然黑曜石",
        price: 298,
        originalPrice: 398,
        image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=100&h=100&fit=crop",
        sales: 8560
      },
      {
        id: "p3",
        name: "五帝钱挂件 真品铜钱",
        price: 128,
        originalPrice: 168,
        image: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=100&h=100&fit=crop",
        sales: 12300
      }
    ],
    hotComments: [
      { user: "装修小白", content: "正好要装修，太及时了！", likes: 256 },
    ]
  },
  {
    id: "4",
    title: "姓名学：名字里这几个字最旺运势！",
    author: {
      id: "4",
      name: "姓名学专家陈",
      avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=expert1",
      isFollowed: false,
      followers: 198000,
      verified: false
    },
    coverUrl: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=700&fit=crop",
    videoUrl: "",
    likes: 45600,
    comments: 3420,
    shares: 1890,
    isLiked: false,
    isCollected: false,
    music: "国风音乐 - 锦绣",
    products: [
      {
        id: "p4",
        name: "姓名学全解 起名改名宝典",
        price: 88,
        originalPrice: 128,
        image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=100&h=100&fit=crop",
        sales: 5680
      }
    ],
    hotComments: [
      { user: "准父母", content: "正好给宝宝起名，收藏了！", likes: 568 },
    ]
  },
  {
    id: "5",
    title: "六爻占卜实战：如何起卦断卦",
    author: {
      id: "5",
      name: "六爻研究社",
      avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=liuyao",
      isFollowed: false,
      followers: 75000,
      verified: true
    },
    coverUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=700&fit=crop",
    videoUrl: "",
    likes: 6780,
    comments: 423,
    shares: 156,
    isLiked: false,
    isCollected: false,
    music: "古琴曲 - 高山流水",
    products: [],
    hotComments: [
      { user: "易学新手", content: "请问老师，六爻和梅花易数哪个更准？", likes: 78 },
    ]
  }
]

// 格式化数字
function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + "万"
  }
  return num.toString()
}

// 购物车类型
interface CartItem {
  productId: string
  quantity: number
  product: typeof mockVideos[0]['products'][0]
}

export default function VideoPage() {
  const params = useParams()
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [videos, setVideos] = useState(mockVideos)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [showProducts, setShowProducts] = useState(false)
  const [showCart, setShowCart] = useState(false)
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; x: number; y: number }[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [addedToCart, setAddedToCart] = useState<string | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [slideDirection, setSlideDirection] = useState<'up' | 'down' | null>(null)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartY = useRef(0)
  const touchCurrentY = useRef(0)
  const heartIdRef = useRef(0)
  
  const currentVideo = videos[currentIndex]
  const prevVideo = currentIndex > 0 ? videos[currentIndex - 1] : null
  const nextVideo = currentIndex < videos.length - 1 ? videos[currentIndex + 1] : null
  
  // 视口高度 - SSR 安全：初始为 0，仅客户端读取 window.innerHeight
  const [viewportH, setViewportH] = useState(0)
  useEffect(() => {
    const update = () => setViewportH(window.innerHeight)
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  // 初始化当前视频索引
  useEffect(() => {
    const videoId = params.id as string
    const index = videos.findIndex(v => v.id === videoId)
    if (index !== -1) {
      setCurrentIndex(index)
    }
  }, [params.id, videos])
  
  // 处理触摸开始
  const handleTouchStart = (e: React.TouchEvent) => {
    if (showComments || showProducts || showCart) return
    touchStartY.current = e.touches[0].clientY
    touchCurrentY.current = e.touches[0].clientY
  }
  
  // 处理触摸移动 - 实时跟随
  const handleTouchMove = (e: React.TouchEvent) => {
    if (showComments || showProducts || showCart || isTransitioning) return
    touchCurrentY.current = e.touches[0].clientY
    const diff = touchStartY.current - touchCurrentY.current
    
    // 限制滑动范围
    if ((diff > 0 && nextVideo) || (diff < 0 && prevVideo)) {
      setSwipeOffset(Math.max(-150, Math.min(150, diff)))
    }
  }
  
  // 处理触摸结束
  const handleTouchEnd = () => {
    if (showComments || showProducts || showCart || isTransitioning) return
    
    const diff = touchStartY.current - touchCurrentY.current
    const threshold = 80
    
    if (Math.abs(diff) > threshold) {
      if (diff > 0 && nextVideo) {
        // 上滑 - 下一个视频
        setSlideDirection('up')
        setIsTransitioning(true)
        setSwipeOffset(window.innerHeight)
        
        setTimeout(() => {
          setCurrentIndex(prev => prev + 1)
          setSwipeOffset(0)
          setIsTransitioning(false)
          setSlideDirection(null)
          router.replace(`/video/${videos[currentIndex + 1].id}`, { scroll: false })
        }, 300)
      } else if (diff < 0 && prevVideo) {
        // 下滑 - 上一个视频
        setSlideDirection('down')
        setIsTransitioning(true)
        setSwipeOffset(-window.innerHeight)
        
        setTimeout(() => {
          setCurrentIndex(prev => prev - 1)
          setSwipeOffset(0)
          setIsTransitioning(false)
          setSlideDirection(null)
          router.replace(`/video/${videos[currentIndex - 1].id}`, { scroll: false })
        }, 300)
      }
    } else {
      // 回弹
      setSwipeOffset(0)
    }
  }
  
  // 双击点赞
  const handleDoubleTap = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const newHeart = { id: heartIdRef.current++, x, y }
    setFloatingHearts(prev => [...prev, newHeart])
    
    setTimeout(() => {
      setFloatingHearts(prev => prev.filter(h => h.id !== newHeart.id))
    }, 1000)
    
    if (!currentVideo.isLiked) {
      handleLike()
    }
  }, [currentVideo])
  
  // 点赞
  const handleLike = () => {
    setVideos(prev => prev.map((v, i) => 
      i === currentIndex 
        ? { ...v, isLiked: !v.isLiked, likes: v.isLiked ? v.likes - 1 : v.likes + 1 }
        : v
    ))
  }
  
  // 收藏
  const handleCollect = () => {
    setVideos(prev => prev.map((v, i) => 
      i === currentIndex 
        ? { ...v, isCollected: !v.isCollected }
        : v
    ))
  }
  
  // 关注
  const handleFollow = () => {
    setVideos(prev => prev.map((v, i) => 
      i === currentIndex 
        ? { ...v, author: { ...v.author, isFollowed: !v.author.isFollowed } }
        : v
    ))
  }

  // 添加到购物车
  const handleAddToCart = (product: typeof currentVideo.products[0]) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id)
      if (existing) {
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { productId: product.id, quantity: 1, product }]
    })
    setAddedToCart(product.id)
    setTimeout(() => setAddedToCart(null), 1500)
  }

  // 更新购物车数量
  const updateCartQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.productId === productId) {
          const newQty = item.quantity + delta
          if (newQty <= 0) return null as any
          return { ...item, quantity: newQty }
        }
        return item
      }).filter(Boolean)
    })
  }

  // 购物车总数和金额
  const cartTotal = cart.reduce((sum, item) => sum + item.quantity, 0)
  const cartAmount = cart.reduce((sum, item) => sum + item.quantity * item.product.price, 0)
  
  // 单击暂停/播放
  let clickTimer: NodeJS.Timeout | null = null
  const handleSingleClick = () => {
    if (clickTimer) {
      clearTimeout(clickTimer)
      clickTimer = null
      return
    }
    clickTimer = setTimeout(() => {
      setIsPlaying(prev => !prev)
      clickTimer = null
    }, 250)
  }

  // 渲染单个视频
  const renderVideo = (video: typeof mockVideos[0], offset: number) => (
    <div 
      className="absolute inset-0 w-full h-full"
      style={{ 
        transform: `translateY(${offset}px)`,
        transition: isTransitioning ? 'transform 0.3s ease-out' : 'none'
      }}
    >
      <img 
        src={video.coverUrl}
        alt={video.title}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 pointer-events-none" />
    </div>
  )

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 bg-black overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 视频容器 - 支持上下滑动 */}
      <div className="absolute inset-0 overflow-hidden">
        {/* 上一个视频预览 */}
        {prevVideo && (
          renderVideo(prevVideo, -viewportH - swipeOffset)
        )}
        
        {/* 当前视频 */}
        <div 
          className="absolute inset-0"
          style={{ 
            transform: `translateY(${-swipeOffset}px)`,
            transition: isTransitioning ? 'transform 0.3s ease-out' : 'none'
          }}
          onClick={handleSingleClick}
          onDoubleClick={handleDoubleTap}
        >
          <img 
            src={currentVideo.coverUrl}
            alt={currentVideo.title}
            className="w-full h-full object-cover"
          />
          
          {/* 暂停图标 */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Play className="w-10 h-10 text-white fill-white ml-1" />
              </div>
            </div>
          )}
          
          {/* 双击飘心 */}
          {floatingHearts.map(heart => (
            <Heart 
              key={heart.id}
              className="absolute w-12 h-12 text-primary fill-primary animate-float-heart pointer-events-none"
              style={{ left: heart.x - 24, top: heart.y - 24 }}
            />
          ))}
          
          {/* 渐变遮罩 */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 pointer-events-none" />
        </div>
        
        {/* 下一个视频预览 */}
        {nextVideo && (
          renderVideo(nextVideo, viewportH - swipeOffset)
        )}
      </div>
      
      {/* 滑动提示 */}
      {currentIndex === 0 && !isTransitioning && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 text-white/50 pointer-events-none animate-pulse">
          <ChevronUp className="w-6 h-6" />
          <span className="text-xs">上滑看下一个</span>
        </div>
      )}
      
      {/* 顶部导航 */}
      <div className="absolute top-0 left-0 right-0 z-30 safe-area-pt">
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          
          {/* 进度指示器 */}
          <div className="flex items-center gap-1">
            {videos.map((_, i) => (
              <div 
                key={i}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all",
                  i === currentIndex ? "bg-white w-4" : "bg-white/40"
                )}
              />
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            {cartTotal > 0 && (
              <button 
                onClick={() => setShowCart(true)}
                className="relative w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
              >
                <ShoppingCart className="w-5 h-5 text-white" />
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center px-1">
                  {cartTotal}
                </span>
              </button>
            )}
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
            </button>
          </div>
        </div>
      </div>
      
      {/* 右侧互动按钮 */}
      <div className="absolute right-3 bottom-40 z-30 flex flex-col items-center gap-5">
        {/* 作者头像 */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <Link href={`/user/${currentVideo.author.id}`}>
              <img 
                src={currentVideo.author.avatar}
                alt={currentVideo.author.name}
                className="w-12 h-12 rounded-full border-2 border-white object-cover"
              />
              {currentVideo.author.verified && (
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </Link>
            {!currentVideo.author.isFollowed && (
              <button 
                onClick={handleFollow}
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
              >
                <Plus className="w-3 h-3 text-white" />
              </button>
            )}
          </div>
        </div>
        
        {/* 点赞 */}
        <button onClick={handleLike} className="flex flex-col items-center gap-1">
          <div className={cn(
            "w-11 h-11 rounded-full flex items-center justify-center transition-all",
            currentVideo.isLiked ? "bg-primary/20" : "bg-black/30 backdrop-blur-sm"
          )}>
            <Heart className={cn(
              "w-7 h-7 transition-all",
              currentVideo.isLiked ? "text-primary fill-primary" : "text-white"
            )} />
          </div>
          <span className="text-white text-xs font-medium">{formatNumber(currentVideo.likes)}</span>
        </button>
        
        {/* 评论 */}
        <button onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <MessageCircle className="w-7 h-7 text-white" />
          </div>
          <span className="text-white text-xs font-medium">{formatNumber(currentVideo.comments)}</span>
        </button>
        
        {/* 收藏 */}
        <button onClick={handleCollect} className="flex flex-col items-center gap-1">
          <div className={cn(
            "w-11 h-11 rounded-full flex items-center justify-center transition-all",
            currentVideo.isCollected ? "bg-amber-500/20" : "bg-black/30 backdrop-blur-sm"
          )}>
            <Bookmark className={cn(
              "w-7 h-7 transition-all",
              currentVideo.isCollected ? "text-amber-500 fill-amber-500" : "text-white"
            )} />
          </div>
          <span className="text-white text-xs font-medium">收藏</span>
        </button>
        
        {/* 分享 */}
        <button className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <Share2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs font-medium">{formatNumber(currentVideo.shares)}</span>
        </button>
        
        {/* 音乐唱片 */}
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-gray-700 flex items-center justify-center animate-spin" style={{ animationDuration: "3s" }}>
          <div className="w-4 h-4 rounded-full bg-white/20" />
        </div>
      </div>
      
      {/* 底部信息区 */}
      <div className="absolute left-0 right-16 bottom-0 z-30 p-4 safe-area-pb">
        {/* 作者名称 */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-white font-semibold text-base">@{currentVideo.author.name}</span>
          {currentVideo.author.verified && (
            <Badge variant="secondary" className="text-[10px] bg-primary/80 text-white border-0">认证</Badge>
          )}
          {!currentVideo.author.isFollowed && (
            <button onClick={handleFollow} className="px-3 py-0.5 rounded-full bg-primary text-white text-xs font-medium">
              关注
            </button>
          )}
        </div>
        
        {/* 视频标题 */}
        <p className="text-white text-sm leading-relaxed mb-3 line-clamp-2">{currentVideo.title}</p>
        
        {/* 音乐信息 */}
        <div className="flex items-center gap-2 mb-3">
          <Music className="w-3.5 h-3.5 text-white/70" />
          <p className="text-white/70 text-xs truncate flex-1">{currentVideo.music}</p>
        </div>
        
        {/* 商品入口 - 低干扰设计：小图标+文字，用户主动点击展开 */}
        {currentVideo.products.length > 0 && (
          <button 
            onClick={() => setShowProducts(true)}
            className="flex items-center gap-2 px-3 py-2 bg-white/10 backdrop-blur-sm rounded-full"
          >
            <div className="w-6 h-6 rounded bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <ShoppingBag className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-white text-xs">
              {currentVideo.products.length}件同款好物
            </span>
            <ChevronUp className="w-4 h-4 text-white/60" />
          </button>
        )}
      </div>
      
      {/* 评论弹窗 */}
      {showComments && (
        <div className="absolute inset-0 z-40" onClick={() => setShowComments(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div 
            className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl max-h-[70vh] animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-card rounded-t-3xl border-b border-border/50 px-4 py-3 flex items-center justify-between">
              <span className="text-foreground font-semibold">{formatNumber(currentVideo.comments)} 条评论</span>
              <button onClick={() => setShowComments(false)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(70vh-60px)]">
              {currentVideo.hotComments.map((comment, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                    {comment.user[0]}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">{comment.user}</p>
                    <p className="text-sm text-foreground">{comment.content}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <button className="flex items-center gap-1 text-muted-foreground">
                        <Heart className="w-3.5 h-3.5" />
                        <span className="text-xs">{comment.likes}</span>
                      </button>
                      <button className="text-xs text-muted-foreground">回复</button>
                    </div>
                  </div>
                </div>
              ))}
              <p className="text-center text-xs text-muted-foreground py-4">— 更多评论请在App中查看 —</p>
            </div>
          </div>
        </div>
      )}
      
      {/* 商品弹窗 - 简洁设计 */}
      {showProducts && (
        <div className="absolute inset-0 z-40" onClick={() => setShowProducts(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div 
            className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl max-h-[60vh] animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-card rounded-t-3xl border-b border-border/50 px-4 py-3 flex items-center justify-between">
              <span className="text-foreground font-semibold">视频同款</span>
              <button onClick={() => setShowProducts(false)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto">
              {currentVideo.products.map(product => (
                <div key={product.id} className="flex gap-3 p-3 bg-muted/50 rounded-xl">
                  <img src={product.image} alt={product.name} className="w-20 h-20 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-foreground line-clamp-2 mb-1">{product.name}</h4>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-primary font-bold">¥{product.price}</span>
                      <span className="text-xs text-muted-foreground line-through">¥{product.originalPrice}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">已售 {formatNumber(product.sales)}</span>
                      <button 
                        onClick={() => handleAddToCart(product)}
                        className={cn(
                          "px-4 py-1.5 rounded-full text-xs font-medium transition-all",
                          addedToCart === product.id 
                            ? "bg-green-500 text-white"
                            : "bg-primary text-white"
                        )}
                      >
                        {addedToCart === product.id ? "已加入" : "加入购物车"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* 购物车弹窗 */}
      {showCart && (
        <div className="absolute inset-0 z-40" onClick={() => setShowCart(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div 
            className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl max-h-[70vh] animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-card rounded-t-3xl border-b border-border/50 px-4 py-3 flex items-center justify-between">
              <span className="text-foreground font-semibold">购物车 ({cartTotal})</span>
              <button onClick={() => setShowCart(false)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto max-h-[calc(70vh-140px)]">
              {cart.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">购物车是空的</p>
              ) : (
                cart.map(item => (
                  <div key={item.productId} className="flex gap-3 p-3 bg-muted/50 rounded-xl">
                    <img src={item.product.image} alt={item.product.name} className="w-16 h-16 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-foreground line-clamp-1 mb-1">{item.product.name}</h4>
                      <span className="text-primary font-bold">¥{item.product.price}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateCartQuantity(item.productId, -1)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                      <button onClick={() => updateCartQuantity(item.productId, 1)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            {cart.length > 0 && (
              <div className="sticky bottom-0 bg-card border-t border-border/50 p-4 flex items-center justify-between safe-area-pb">
                <div>
                  <span className="text-muted-foreground text-sm">合计：</span>
                  <span className="text-primary text-xl font-bold">¥{cartAmount}</span>
                </div>
                <button className="px-8 py-3 bg-primary text-white font-medium rounded-full">
                  去结算
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* 动画样式 */}
      <style jsx>{`
        @keyframes float-heart {
          0% { transform: scale(0) translateY(0); opacity: 1; }
          50% { transform: scale(1.2) translateY(-50px); opacity: 1; }
          100% { transform: scale(1) translateY(-100px); opacity: 0; }
        }
        .animate-float-heart {
          animation: float-heart 1s ease-out forwards;
        }
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        .safe-area-pt { padding-top: env(safe-area-inset-top, 12px); }
        .safe-area-pb { padding-bottom: env(safe-area-inset-bottom, 12px); }
      `}</style>
    </div>
  )
}
