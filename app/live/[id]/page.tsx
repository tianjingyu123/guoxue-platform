"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { BackButton } from "@/components/common/back-button"
import { 
  ChevronLeft, Heart, MessageCircle, Share2, Gift, ShoppingCart, 
  Send, X, Phone, Crown, Users, Eye, Play,
  ChevronUp, ChevronDown, Maximize2, Minimize2, FileText, Mic, MicOff,
  RotateCcw, Volume2, VolumeX, Settings, Flag
} from "lucide-react"
import { Disclaimer } from "@/components/compliance/disclaimer"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { QuickBuySheet, type QuickBuyProduct } from "@/components/live/quick-buy-sheet"
import { GiftPanel, type LiveGift } from "@/components/live/gift-panel"
import { MicConnectSheet } from "@/components/live/mic-connect-sheet"

// 模拟直播数据
const mockLiveData = {
  "1": {
    id: "1",
    title: "八字命理入门：如何快速解读四柱八字",
    type: "knowledge",
    orientation: "vertical", // 手机竖屏直播
    hostName: "易道先生",
    hostAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    hostTitle: "国学易经研究员",
    followerCount: 12800,
    viewerCount: 12580,
    likeCount: 58600,
    isFollowed: false,
  },
  "2": {
    id: "2",
    title: "开光吉祥物专场：招财貔貅、转运葫芦限时特惠",
    type: "commerce",
    orientation: "vertical",
    hostName: "福缘阁主",
    hostAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
    hostTitle: "福缘阁创始人",
    followerCount: 8500,
    viewerCount: 8920,
    likeCount: 32100,
    isFollowed: false,
  },
  "3": {
    id: "3",
    title: "紫微斗数命盘解读实战课程",
    type: "knowledge",
    orientation: "horizontal", // OBS横屏授课
    hostName: "紫微大师",
    hostAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
    hostTitle: "紫微斗数传承人",
    followerCount: 15600,
    viewerCount: 5630,
    likeCount: 28900,
    isFollowed: false,
  },
}

// 模拟课件数据（OBS横屏直播用）
const mockSlides = [
  { id: 1, title: "第一章：紫微斗数概述", thumbnail: "", isCurrent: false },
  { id: 2, title: "第二章：十二宫位详解", thumbnail: "", isCurrent: false },
  { id: 3, title: "第三章：主星特性分析", thumbnail: "", isCurrent: true },
  { id: 4, title: "第四章：四化飞星入门", thumbnail: "", isCurrent: false },
  { id: 5, title: "第五章：命盘实例解读", thumbnail: "", isCurrent: false },
]

// 模拟连麦观众
const mockConnectedUsers = [
  { id: 1, name: "易学爱好者", avatar: "", isMuted: false },
  { id: 2, name: "命理初学", avatar: "", isMuted: true },
]

// 模拟商品数据
const mockProducts = [
  {
    id: "p1",
    name: "开光招财貔貅摆件",
    price: 299,
    originalPrice: 599,
    image: "https://images.unsplash.com/photo-1555421689-491a97ff2040?w=100&h=100&fit=crop",
    sales: 1280,
    stock: 56,
    isExplaining: true,
  },
  {
    id: "p2",
    name: "天然黄水晶转运葫芦",
    price: 168,
    originalPrice: 328,
    image: "https://images.unsplash.com/photo-1509909756405-be0199881695?w=100&h=100&fit=crop",
    sales: 890,
    stock: 128,
    isExplaining: false,
  },
  {
    id: "p3",
    name: "紫檀木雕福禄寿三星",
    price: 1680,
    originalPrice: 2999,
    image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=100&h=100&fit=crop",
    sales: 156,
    stock: 23,
    isExplaining: false,
  },
]

// 模拟弹幕消息
const mockDanmaku = [
  { id: 1, user: "易学爱好者", content: "讲得太好了！", type: "normal" },
  { id: 2, user: "命理初学", content: "老师这个怎么看大运？", type: "normal" },
  { id: 3, user: "紫微门人", content: "666", type: "normal" },
  { id: 4, user: "风水小白", content: "感谢老师分享", type: "normal" },
  { id: 5, user: "国学传承", content: "受益匪浅", type: "normal" },
]

// 系统消息
const mockSystemMessages = [
  { id: 1, type: "enter", user: "玄学新人", content: "进入了直播间" },
  { id: 2, type: "gift", user: "易道弟子", content: "送出了 太极", giftIcon: "☯️" },
  { id: 3, type: "buy", user: "福气满满", content: "购买了 开光招财貔貅摆件" },
]

// 打赏榜
const mockRankList = [
  { rank: 1, user: "易道传人", avatar: "", amount: 8888 },
  { rank: 2, user: "国学守护", avatar: "", amount: 5666 },
  { rank: 3, user: "玄学爱好", avatar: "", amount: 3288 },
]

export default function LiveRoomPage() {
  const params = useParams()
  const router = useRouter()
  const liveId = params.id as string
  const live = mockLiveData[liveId as keyof typeof mockLiveData] || mockLiveData["1"]
  
  const [isFollowing, setIsFollowing] = useState(false)
  const [likeCount, setLikeCount] = useState(live.likeCount)
  const [showProducts, setShowProducts] = useState(false)
  const [buyProduct, setBuyProduct] = useState<QuickBuyProduct | null>(null)
  const [showGifts, setShowGifts] = useState(false)
  const [showRank, setShowRank] = useState(false)
  const [message, setMessage] = useState("")
  const [danmakuList, setDanmakuList] = useState<typeof mockDanmaku>([])
  const [systemMessages, setSystemMessages] = useState<typeof mockSystemMessages>([])
  const [isMuted, setIsMuted] = useState(false)
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; x: number }[]>([])
  const [headerCollapsed, setHeaderCollapsed] = useState(false)
  const [currentProduct, setCurrentProduct] = useState(mockProducts[0])
  const [salesNotifications, setSalesNotifications] = useState<{ id: number; user: string; product: string }[]>([])
  const [liveSalesCount, setLiveSalesCount] = useState(1280) // 实时销量
  const [salesAnimating, setSalesAnimating] = useState(false) // 销量变化动画
  const [giftBalance, setGiftBalance] = useState(1288) // 国学币余额
  const [showMic, setShowMic] = useState(false) // 连麦弹窗
  // 礼物飘屏队列（顶级礼物全屏特效）
  const [giftFlyers, setGiftFlyers] = useState<{ id: number; icon: string; name: string; level: number }[]>([])

  // 发送礼物：扣费 + 飘屏特效 + 公屏提示
  const handleSendGift = (gift: LiveGift) => {
    setGiftBalance((b) => b - gift.price)
    const flyerId = Date.now()
    setGiftFlyers((list) => [...list, { id: flyerId, icon: gift.icon, name: gift.name, level: gift.level }])
    setTimeout(() => setGiftFlyers((list) => list.filter((f) => f.id !== flyerId)), gift.level === 3 ? 3000 : 2000)
    setSystemMessages((prev) => [
      ...prev,
      { id: flyerId, type: "gift", user: "我", content: `送出了 ${gift.name}`, giftIcon: gift.icon },
    ])
  }
  
  // 横屏OBS模式状态
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activeTab, setActiveTab] = useState<"slides" | "chat" | "connect">("chat")
  const [isVolumeMuted, setIsVolumeMuted] = useState(false)
  
  const isKnowledge = live.type === "knowledge"
  const isCommerce = live.type === "commerce"
  const isHorizontal = live.orientation === "horizontal"

  // 模拟弹幕滚动
  useEffect(() => {
    let index = 0
    const interval = setInterval(() => {
      if (index < mockDanmaku.length) {
        setDanmakuList((prev) => [...prev.slice(-3), mockDanmaku[index]])
        index++
      } else {
        index = 0
      }
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  // 模拟系统消息
  useEffect(() => {
    let index = 0
    const interval = setInterval(() => {
      if (index < mockSystemMessages.length) {
        setSystemMessages((prev) => [...prev.slice(-1), mockSystemMessages[index]])
        index++
      } else {
        index = 0
      }
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  // 自动收起顶部栏
  useEffect(() => {
    const timer = setTimeout(() => setHeaderCollapsed(true), 5000)
    return () => clearTimeout(timer)
  }, [])

  // 模拟实时已售通知（电商直播）
  useEffect(() => {
    if (!isCommerce) return
    const names = ["福气满满", "招财进宝", "玄学新人", "易道弟子", "国学传承", "命理初学", "紫微门人"]
    const interval = setInterval(() => {
      const randomUser = names[Math.floor(Math.random() * names.length)]
      const randomProduct = mockProducts[Math.floor(Math.random() * mockProducts.length)]
      const notification = {
        id: Date.now(),
        user: randomUser,
        product: randomProduct.name.slice(0, 8)
      }
      setSalesNotifications(prev => [...prev.slice(-2), notification])
      
      // 更新销量数字并触发动画
      const increment = Math.floor(Math.random() * 3) + 1
      setLiveSalesCount(prev => prev + increment)
      setSalesAnimating(true)
      setTimeout(() => setSalesAnimating(false), 600)
      
      // 3秒后移除通知
      setTimeout(() => {
        setSalesNotifications(prev => prev.filter(n => n.id !== notification.id))
      }, 3000)
    }, 4000)
    return () => clearInterval(interval)
  }, [isCommerce])

  const handleLike = () => {
    setLikeCount((prev) => prev + 1)
    // 添加浮动爱心动画
    const newHeart = { id: Date.now(), x: Math.random() * 40 - 20 }
    setFloatingHearts((prev) => [...prev, newHeart])
    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== newHeart.id))
    }, 1500)
  }

  // 直播间极短购买链路：点击「立即购买」直接拉起半屏确认订单，不进购物车、不跳详情页
  const handleBuyNow = (product: (typeof mockProducts)[number]) => {
    setBuyProduct({
      id: product.id,
      name: product.name,
      cover: product.image,
      price: product.price,
      originalPrice: product.originalPrice,
      stock: product.stock,
      sold: product.sales,
      skus: ["标准装", "豪华装", "套装"],
    })
  }

  const handleSendMessage = () => {
    if (!message.trim()) return
    setDanmakuList((prev) => [
      ...prev.slice(-3),
      { id: Date.now(), user: "我", content: message, type: "normal" },
    ])
    setMessage("")
  }

  const formatCount = (count: number) => {
    if (count >= 10000) return `${(count / 10000).toFixed(1)}万`
    return count.toString()
  }

// ===== 横屏OBS知识授课布局（参考小鹅通/腾讯课堂风格）=====
  if (isHorizontal) {
    // 控制栏自动隐藏逻辑
    const [showControls, setShowControls] = useState(true)
    const [showChatPanel, setShowChatPanel] = useState(false)
    const controlsTimerRef = useRef<NodeJS.Timeout | null>(null)
    
    const resetControlsTimer = () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
      setShowControls(true)
      if (isFullscreen) {
        controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000)
      }
    }
    
    // 底部Tab状态
    const [bottomTab, setBottomTab] = useState<"chat" | "slides" | "qa" | "files" | "intro">("chat")
    
    // 模拟问答数据
    const mockQA = [
      { id: 1, user: "易学小白", question: "老师，命宫化忌是不是一定不好？", time: "12:35", isOnWall: true },
      { id: 2, user: "紫微迷", question: "天机星在夫妻宫怎么解读？", time: "12:38", isOnWall: false },
      { id: 3, user: "命理爱好者", question: "太�������落陷需要注意什么？", time: "12:42", isOnWall: false },
    ]
    
    // 模拟资料数据
    const mockFiles = [
      { id: 1, name: "紫微斗数入门讲义.pdf", size: "2.3MB", type: "pdf" },
      { id: 2, name: "命盘实例分析案例集.pdf", size: "5.1MB", type: "pdf" },
      { id: 3, name: "本课思维导图.png", size: "890KB", type: "image" },
    ]

    // ===== 全屏模式 =====
    if (isFullscreen) {
      return (
        <div 
          className="fixed inset-0 bg-[#1a1a2e] overflow-hidden"
          onClick={resetControlsTimer}
          onMouseMove={resetControlsTimer}
        >
          {/* 全屏视频画面 - ����满整个屏幕 */}
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            {/* 模拟16:9视频画面 */}
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center opacity-20">
                <div className="w-40 h-40 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-6xl">📊</span>
                </div>
                <p className="text-white/50 text-lg">OBS课件直播画面</p>
                <p className="text-white/30 text-sm mt-2">16:9 横屏 · 沉浸式授课</p>
              </div>
            </div>
          </div>
          
          {/* 半透明顶部控制栏（3秒无操作自动隐藏） */}
          <div className={cn(
            "absolute top-0 left-0 right-0 z-30 transition-all duration-300",
            showControls ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
          )}>
            <div className="bg-gradient-to-b from-black/80 via-black/40 to-transparent px-6 py-4">
              <div className="flex items-center justify-between">
                {/* 左侧：主播信息 */}
                <div className="flex items-center gap-4">
                  <Avatar className="w-10 h-10 border-2 border-[#C41E3A]">
                    <AvatarImage src={live.hostAvatar} alt={live.hostName} />
                    <AvatarFallback className="bg-[#C41E3A] text-white">{live.hostName[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{live.hostName}</span>
                      <Badge className="text-[10px] bg-[#C41E3A]/20 text-[#C41E3A] border-[#C41E3A]/30">直播中</Badge>
                    </div>
                    <p className="text-white/60 text-sm truncate max-w-[300px]">{live.title}</p>
                  </div>
                </div>
                
                {/* 中间：观看人数 */}
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10">
                  <Eye className="w-4 h-4 text-white/70" />
                  <span className="text-white text-sm">{formatCount(live.viewerCount)}人观看</span>
                </div>
                
                {/* 右侧：控制按钮 */}
                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                    <Share2 className="w-4 h-4 text-white" />
                    <span className="text-white text-sm">分享</span>
                  </button>
                  <button 
                    onClick={() => setIsFullscreen(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <Minimize2 className="w-4 h-4 text-white" />
                    <span className="text-white text-sm">退出全屏</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* 半透明底部控制栏（3秒无操作自动隐藏） */}
          <div className={cn(
            "absolute bottom-0 left-0 right-0 z-30 transition-all duration-300",
            showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-full pointer-events-none"
          )}>
            <div className="bg-gradient-to-t from-black/80 via-black/40 to-transparent px-6 py-4">
              <div className="flex items-center justify-between">
                {/* 左侧：播放控制 */}
                <div className="flex items-center gap-4">
                  <button className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                    <Play className="w-5 h-5 text-white fill-white" />
                  </button>
                  
                  {/* 音量控制 */}
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setIsVolumeMuted(!isVolumeMuted)}
                      className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                    >
                      {isVolumeMuted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
                    </button>
                    <div className="w-24 h-1 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-white rounded-full" style={{ width: isVolumeMuted ? "0%" : "70%" }} />
                    </div>
                  </div>
                </div>
                
                {/* 中间：弹幕开关 */}
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors",
                      isMuted ? "bg-white/10" : "bg-[#C41E3A]/80"
                    )}
                  >
                    <MessageCircle className="w-4 h-4 text-white" />
                    <span className="text-white text-sm">{isMuted ? "弹幕已关" : "弹幕已开"}</span>
                  </button>
                </div>
                
                {/* 右侧：互动入口 */}
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setShowChatPanel(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 text-white" />
                    <span className="text-white text-sm">讨论</span>
                  </button>
                  <button 
                    onClick={() => setShowGifts(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/80 to-orange-500/80 hover:from-amber-500 hover:to-orange-500 transition-colors"
                  >
                    <Gift className="w-4 h-4 text-white" />
                    <span className="text-white text-sm">打赏</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* 全屏弹幕浮层（可关闭） */}
          {!isMuted && danmakuList.length > 0 && (
            <div className="absolute left-6 bottom-24 z-20 max-w-[40%] space-y-2">
              {danmakuList.slice(-4).map((danmaku) => danmaku && (
                <div key={danmaku.id} className="animate-danmaku-in">
                  <div className="inline-block px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full">
                    <span className="text-sm">
                      <span className="text-[#C41E3A] mr-2">{danmaku.user}</span>
                      <span className="text-white/90">{danmaku.content}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* 讨论浮窗 */}
          {showChatPanel && (
            <div className="fixed inset-0 z-40" onClick={() => setShowChatPanel(false)}>
              <div 
                className="absolute right-0 top-0 bottom-0 w-80 bg-[#1a1a2e]/95 backdrop-blur-md border-l border-white/10 flex flex-col animate-in slide-in-from-right duration-300"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                  <span className="text-white font-medium">实时讨论</span>
                  <button onClick={() => setShowChatPanel(false)}>
                    <X className="w-5 h-5 text-white/60" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {danmakuList.map((danmaku) => danmaku && (
                    <div key={danmaku.id} className="flex items-start gap-2">
                      <Avatar className="w-7 h-7">
                        <AvatarFallback className="text-[10px] bg-[#C41E3A]/20 text-[#C41E3A]">{danmaku.user[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-xs text-white/50">{danmaku.user}</p>
                        <p className="text-sm text-white/90">{danmaku.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-white/10">
                  <div className="flex items-center gap-2 h-10 px-4 bg-white/10 rounded-full">
                    <input
                      type="text"
                      placeholder="发送弹幕..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                      className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
                    />
                    <button onClick={handleSendMessage} className="w-7 h-7 rounded-full bg-[#C41E3A] flex items-center justify-center">
                      <Send className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* 礼物面板与连麦统一在页面底部渲染（见文件末尾） */}

          {/* 点击任意位置提示 */}
          {!showControls && (
            <div className="absolute inset-0 z-10" onClick={resetControlsTimer} />
          )}
        </div>
      )
    }

    // ===== 非全屏模式 =====
    return (
      <div className="fixed inset-0 bg-[#1a1a2e] flex flex-col overflow-hidden">
        {/* 顶部主播信息栏（固定40px） */}
        <div className="h-10 bg-[#1a1a2e] border-b border-white/10 flex items-center justify-between px-4 flex-shrink-0">
          {/* 左侧：返回+主播信息 */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.back()} 
              className="w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center transition-colors"
              aria-label="返回"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <Avatar className="w-7 h-7 border border-[#C41E3A]">
              <AvatarImage src={live.hostAvatar} alt={live.hostName} />
              <AvatarFallback className="text-[10px] bg-[#C41E3A] text-white">{live.hostName[0]}</AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2">
              <span className="text-white text-sm font-medium">{live.hostName}</span>
              <span className="text-white/50 text-xs">|</span>
              <span className="text-white/70 text-xs truncate max-w-[200px]">{live.title}</span>
            </div>
          </div>
          
          {/* 右侧：观看人数+关注+分享 */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-white/60 text-xs">
              <Eye className="w-3.5 h-3.5" />
              <span>{formatCount(live.viewerCount)}</span>
            </div>
            <Button
              size="sm"
              className={cn(
                "h-6 text-[10px] px-3 rounded-full",
                isFollowing ? "bg-white/10 text-white hover:bg-white/20" : "bg-[#C41E3A] hover:bg-[#C41E3A]/80"
              )}
              onClick={() => setIsFollowing(!isFollowing)}
            >
              {isFollowing ? "已关注" : "关注"}
            </Button>
            <button className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors">
              <Share2 className="w-4 h-4 text-white/70" />
            </button>
            <button
              onClick={() => router.push(`/report?type=live&targetId=${live.id}`)}
              className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
              aria-label="举报直播间"
            >
              <Flag className="w-4 h-4 text-white/70" />
            </button>
          </div>
        </div>
        
        {/* 主视频播放区（16:9自动适配宽度） */}
        <div className="relative bg-black flex-shrink-0" style={{ paddingTop: "56.25%" }}>
          <div className="absolute inset-0 flex items-center justify-center">
            {/* 模拟视频画面 */}
            <div className="text-center opacity-20">
              <div className="w-24 h-24 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-4xl">📊</span>
              </div>
              <p className="text-white/50 text-sm">OBS课件直播画面</p>
            </div>
          </div>
          
          {/* 持续展示：内容仅供娱乐参考（合规要求） */}
          <div className="absolute left-3 top-3 z-10">
            <Disclaimer variant="entertainment" tone="inline" />
          </div>

          {/* 全屏按钮（右下角悬浮） */}
          <button 
            onClick={() => setIsFullscreen(true)}
            className="absolute right-3 bottom-3 w-9 h-9 rounded-lg bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
          >
            <Maximize2 className="w-5 h-5 text-white" />
          </button>
          
          {/* 视频上弹幕（60%透明度，字号14px） */}
          {!isMuted && danmakuList.length > 0 && (
            <div className="absolute left-3 bottom-14 z-10 max-w-[60%] space-y-1">
              {danmakuList.slice(-3).map((danmaku) => danmaku && (
                <div key={danmaku.id} className="animate-danmaku-in">
                  <div className="inline-block px-2 py-0.5 bg-black/40 rounded">
                    <span className="text-[14px]" style={{ opacity: 0.7 }}>
                      <span className="text-[#C41E3A] mr-1.5">{danmaku.user}</span>
                      <span className="text-white">{danmaku.content}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* 底部Tab互动区（固定约150px高） */}
        <div className="flex-1 flex flex-col min-h-0 bg-card">
          {/* Tab切换栏 */}
          <div className="flex border-b border-border flex-shrink-0">
            {[
              { key: "chat", label: "讨论" },
              { key: "slides", label: "课件" },
              { key: "qa", label: "问答" },
              { key: "files", label: "资料" },
              { key: "intro", label: "简介" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setBottomTab(tab.key as typeof bottomTab)}
                className={cn(
                  "flex-1 py-2.5 text-sm font-medium transition-colors relative",
                  bottomTab === tab.key ? "text-[#C41E3A]" : "text-muted-foreground"
                )}
              >
                {tab.label}
                {bottomTab === tab.key && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-[#C41E3A] rounded-full" />
                )}
              </button>
            ))}
          </div>
          
          {/* Tab内容区 */}
          <div className="flex-1 overflow-y-auto">
            {/* 讨论Tab */}
            {bottomTab === "chat" && (
              <div className="flex flex-col h-full">
                <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                  {danmakuList.map((danmaku) => danmaku && (
                    <div key={danmaku.id} className="flex items-start gap-2">
                      <Avatar className="w-6 h-6 flex-shrink-0">
                        <AvatarFallback className="text-[10px] bg-[#C41E3A]/10 text-[#C41E3A]">{danmaku.user[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{danmaku.user}</p>
                        <p className="text-sm break-words">{danmaku.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {/* 底部弹幕输入框 */}
                <div className="p-3 border-t border-border flex-shrink-0">
                  <div className="flex items-center gap-2 h-9 px-3 bg-secondary rounded-full">
                    <input
                      type="text"
                      placeholder="发送弹幕..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                      className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground outline-none"
                    />
                    <button 
                      onClick={() => setIsMuted(!isMuted)}
                      className={cn("w-6 h-6 rounded-full flex items-center justify-center", isMuted ? "text-muted-foreground" : "text-[#C41E3A]")}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <button onClick={handleSendMessage} className="w-6 h-6 rounded-full bg-[#C41E3A] flex items-center justify-center">
                      <Send className="w-3 h-3 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* 课件Tab */}
            {bottomTab === "slides" && (
              <div className="p-3 space-y-2">
                <p className="text-xs text-muted-foreground mb-2">当前课件进度</p>
                {mockSlides.map((slide) => (
                  <div
                    key={slide.id}
                    className={cn(
                      "flex items-center gap-3 p-2.5 rounded-lg border transition-colors",
                      slide.isCurrent ? "border-[#C41E3A] bg-[#C41E3A]/5" : "border-border"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0",
                      slide.isCurrent ? "bg-[#C41E3A] text-white" : "bg-secondary text-muted-foreground"
                    )}>
                      {slide.id}
                    </div>
                    <span className={cn("text-sm flex-1", slide.isCurrent && "font-medium")}>{slide.title}</span>
                    {slide.isCurrent && <Badge className="text-[10px] bg-[#C41E3A]/10 text-[#C41E3A] border-0">讲解中</Badge>}
                  </div>
                ))}
              </div>
            )}
            
            {/* 问答Tab */}
            {bottomTab === "qa" && (
              <div className="p-3 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">观众提问</p>
                  <Button size="sm" variant="outline" className="h-7 text-xs">
                    <MessageCircle className="w-3 h-3 mr-1" />
                    我要提问
                  </Button>
                </div>
                {mockQA.map((qa) => (
                  <div key={qa.id} className={cn(
                    "p-3 rounded-lg border",
                    qa.isOnWall ? "border-[#C41E3A] bg-[#C41E3A]/5" : "border-border"
                  )}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Avatar className="w-5 h-5">
                        <AvatarFallback className="text-[8px] bg-secondary">{qa.user[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">{qa.user}</span>
                      <span className="text-[10px] text-muted-foreground/60">{qa.time}</span>
                      {qa.isOnWall && <Badge className="text-[8px] bg-[#C41E3A] border-0 px-1">已上墙</Badge>}
                    </div>
                    <p className="text-sm">{qa.question}</p>
                  </div>
                ))}
              </div>
            )}
            
            {/* 资料Tab */}
            {bottomTab === "files" && (
              <div className="p-3 space-y-2">
                <p className="text-xs text-muted-foreground mb-2">本课资料</p>
                {mockFiles.map((file) => (
                  <div key={file.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors cursor-pointer">
                    <div className="w-10 h-10 rounded-lg bg-[#C41E3A]/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-[#C41E3A]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{file.size}</p>
                    </div>
                    <Button size="sm" variant="outline" className="h-7 text-xs">下载</Button>
                  </div>
                ))}
              </div>
            )}
            
            {/* 简介Tab */}
            {bottomTab === "intro" && (
              <div className="p-4 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold mb-2">课程介绍</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    本课程将深入讲解紫微斗数命盘的解读方法，包括十二宫位的含义、主星特性分析、四化飞星运用等核心内容。适合有一定基础的学员进阶学习。
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-2">讲师简介</h3>
                  <div className="flex items-start gap-3">
                    <Avatar className="w-12 h-12 border-2 border-[#C41E3A]">
                      <AvatarImage src={live.hostAvatar} alt={live.hostName} />
                      <AvatarFallback className="bg-[#C41E3A] text-white">{live.hostName[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{live.hostName}</p>
                      <p className="text-xs text-muted-foreground">{live.hostTitle}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatCount(live.followerCount)}粉丝</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* 横屏提示（首次进入显示） */}
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-black/80 backdrop-blur-md rounded-full flex items-center gap-2 animate-in fade-in slide-in-from-top duration-500">
          <RotateCcw className="w-4 h-4 text-white" />
          <span className="text-white text-xs">旋转手机获得最佳观看体验</span>
          <button 
            onClick={() => setIsFullscreen(true)}
            className="ml-2 px-2 py-0.5 rounded-full bg-[#C41E3A] text-white text-xs"
          >
            全屏
          </button>
        </div>
      </div>
    )
  }

  // ===== 竖屏直播布局（原有代码）=====
  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden">
      {/* 全屏视频画面区 - 竖屏9:16 */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
        {/* 模拟直播画面 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center opacity-30">
            <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">{isCommerce ? "🛍️" : "📖"}</span>
            </div>
            <p className="text-white/50 text-sm">直播画面</p>
          </div>
        </div>
      </div>

      {/* ===== 顶部信息栏 - ����透明悬浮 ===== */}
      <div 
        className={cn(
          "absolute top-0 left-0 right-0 z-30 transition-all duration-300",
          headerCollapsed ? "opacity-70" : "opacity-100"
        )}
        onClick={() => setHeaderCollapsed(false)}
      >
        <div className="bg-gradient-to-b from-black/70 via-black/40 to-transparent pt-safe">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              {/* 主播信息胶囊 */}
              <div className="flex items-center gap-2 px-1.5 py-1.5 pr-3 bg-black/40 backdrop-blur-md rounded-full">
                <Link href={`/user/${live.id}`} className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <div className="relative">
                    <Avatar className="w-10 h-10 border-2 border-red-500">
                      <AvatarImage src={live.hostAvatar} alt={live.hostName} />
                      <AvatarFallback>{live.hostName[0]}</AvatarFallback>
                    </Avatar>
                    {/* 直播中红点 */}
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-black animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-white truncate max-w-[80px]">{live.hostName}</span>
                    </div>
                    <p className="text-[10px] text-white/60">{formatCount(live.followerCount)} 粉丝</p>
                  </div>
                </Link>
                <Button
                  size="sm"
                  variant={isFollowing ? "secondary" : "default"}
                  className={cn(
                    "h-7 text-xs px-3 rounded-full ml-1 transition-all",
                    isFollowing ? "bg-white/20 text-white hover:bg-white/30 border-0 animate-follow-confirm" : "bg-red-500 hover:bg-red-600 border-0"
                  )}
                  onClick={(e) => { e.stopPropagation(); setIsFollowing(!isFollowing) }}
                >
                  {isFollowing ? "已关注" : "关注"}
                </Button>
              </div>

              {/* 右侧：在线人数 + 关闭 */}
              <div className="flex items-center gap-2">
                {/* 在线观看人数 */}
                <div className="flex items-center gap-1 px-2.5 py-1.5 bg-black/40 backdrop-blur-md rounded-full">
                  <Users className="w-3.5 h-3.5 text-white/80" />
                  <span className="text-xs text-white">{formatCount(live.viewerCount)}</span>
                </div>
                {/* 关闭按钮 */}
                <button 
                  onClick={() => router.back()}
                  className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* 直播间标题 - 1行滚动 */}
            <div className="mt-2 overflow-hidden">
              <p className="text-xs text-white/80 truncate">{live.title}</p>
            </div>

            {/* 持续展示：内容仅供娱乐参考（合规要求） */}
            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
              <Disclaimer variant="entertainment" tone="inline" />
            </div>
          </div>
        </div>
      </div>

      {/* ===== 右上角悬浮区 - 人气榜 ===== */}
      <div className="absolute top-24 right-3 z-20">
        <button
          onClick={() => setShowRank(!showRank)}
          className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-500/80 to-orange-500/80 backdrop-blur-md rounded-full animate-crown-shine"
        >
          <Crown className="w-3.5 h-3.5 text-white" />
          <span className="text-[10px] text-white font-medium">榜单</span>
          {showRank ? <ChevronUp className="w-3 h-3 text-white" /> : <ChevronDown className="w-3 h-3 text-white" />}
        </button>
        
        {/* 榜单展开 */}
        {showRank && (
          <div className="mt-2 w-36 bg-black/60 backdrop-blur-md rounded-xl p-2 space-y-1.5">
            {mockRankList.map((item) => (
              <div key={item.rank} className="flex items-center gap-2">
                <span className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                  item.rank === 1 ? "bg-amber-500 text-white" :
                  item.rank === 2 ? "bg-gray-300 text-gray-700" :
                  "bg-amber-700 text-white"
                )}>
                  {item.rank}
                </span>
                <span className="text-xs text-white truncate flex-1">{item.user}</span>
                <span className="text-[10px] text-amber-400">{item.amount}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== 左侧悬浮区 - 弹幕 + 系统消息 ===== */}
      <div className="absolute left-3 bottom-44 right-24 z-10 space-y-2 pointer-events-none">
        {/* 系统消息横幅 - 滑入滑出 */}
        {systemMessages.slice(-1).map((msg) => msg && (
          <div 
            key={msg.id}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs w-fit max-w-full animate-banner-slide",
              msg.type === "enter" ? "bg-white/10 text-white/80" :
              msg.type === "gift" ? "bg-gradient-to-r from-amber-500/30 to-orange-500/30 text-amber-200" :
              "bg-gradient-to-r from-red-500/30 to-pink-500/30 text-pink-200"
            )}
          >
            <span className="font-medium">{msg.user}</span>
            <span className="ml-1">{msg.content}</span>
            {msg.giftIcon && <span className="ml-1">{msg.giftIcon}</span>}
          </div>
        ))}

        {/* 弹幕列表 - 最多显示3条，淡入滑动 */}
        <div className="space-y-1.5">
          {danmakuList.slice(-3).map((danmaku) => danmaku && (
            <div
              key={danmaku.id}
              className="flex items-start gap-2 animate-danmaku-in"
            >
              <div className="shrink-0 px-2 py-1 bg-primary/20 rounded-full">
                <span className="text-[10px] text-primary font-medium">{danmaku.user}</span>
              </div>
              <span className="text-sm text-white/90 leading-relaxed">{danmaku.content}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ===== 右侧浮动爱心动画区 ===== */}
      <div className="absolute right-6 bottom-40 z-20 pointer-events-none">
        {floatingHearts.map((heart) => (
          <div
            key={heart.id}
            className="absolute bottom-0 animate-float-heart"
            style={{ left: `${heart.x}px` }}
          >
            <Heart className="w-6 h-6 text-red-500 fill-red-500" />
          </div>
        ))}
      </div>

      {/* ===== 商品讲解卡片 - 右下角按钮上方，带动画和已售特效 ===== */}
      {isCommerce && currentProduct && (
        <div className="absolute right-3 bottom-[72px] z-20 flex flex-col items-end gap-1.5">
          {/* 实时销量条 - 卡片顶部独立显示 */}
          <div className="flex items-center gap-2">
            {/* 已售数量 - 带数字跳动动画 */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary rounded-full shadow-lg shadow-primary/30">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              <span className="text-[11px] text-white/90">已售</span>
              <span className={`text-sm text-white font-bold tabular-nums transition-all duration-300 ${salesAnimating ? 'scale-125 text-yellow-300' : ''}`}>
                {liveSalesCount.toLocaleString()}
              </span>
              <span className="text-[11px] text-white/90">件</span>
            </div>
          </div>
          
          {/* 用户购买通知 - 滚动显示 */}
          <div className="space-y-1 overflow-hidden max-h-16">
            {salesNotifications.map((notif) => (
              <div 
                key={notif.id}
                className="flex items-center gap-1.5 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-full animate-in slide-in-from-right fade-in duration-300"
              >
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                  <span className="text-[8px] text-white font-bold">{notif.user.slice(0, 1)}</span>
                </div>
                <span className="text-[10px] text-white/80 truncate max-w-[80px]">{notif.user}</span>
                <span className="text-[10px] text-green-400">下单成功</span>
              </div>
            ))}
          </div>
          
          {/* 商品卡片 - 带脉冲动画 */}
          <div 
            className="relative cursor-pointer group"
            onClick={() => setShowProducts(true)}
          >
            {/* 外发光效果 */}
            <div className="absolute -inset-1 bg-primary/40 rounded-2xl blur-md animate-pulse" />
            
            {/* 卡片主体 */}
            <div className="relative w-[140px] rounded-xl overflow-hidden border-2 border-primary/60 bg-black/80 backdrop-blur-md shadow-lg shadow-primary/20">
              {/* 商品图片区 */}
              <div className="relative">
                <img
                  src={currentProduct.image}
                  alt={currentProduct.name}
                  className="w-full h-20 object-cover"
                />
                {/* 讲解中标签 - 带动画 */}
                <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 bg-primary rounded text-[10px] text-primary-foreground font-medium">
                  <span className="w-1.5 h-1.5 bg-primary-foreground rounded-full animate-ping" />
                  <span>讲解中</span>
                </div>
                {/* 折扣标签 */}
                <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-gold rounded text-[10px] text-gold-foreground font-bold">
                  {Math.round((1 - currentProduct.price / currentProduct.originalPrice) * 100)}%OFF
                </div>
              </div>
              
              {/* 商品信息 */}
              <div className="p-2">
                <p className="text-[11px] text-white/90 truncate">{currentProduct.name}</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-danger font-bold text-base">¥{currentProduct.price}</span>
                  <span className="text-[10px] text-white/40 line-through">¥{currentProduct.originalPrice}</span>
                </div>
              </div>
              
              {/* 底部立即购买按钮 - 直达半屏确认订单 */}
              <button 
                onClick={(e) => {
                  e.stopPropagation()
                  handleBuyNow(currentProduct)
                }}
                className="w-full py-2 bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center gap-1 transition-all active:opacity-90"
              >
                <span>立即购买</span>
              </button>
            </div>
            
            {/* 商品数量指示器 */}
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center border-2 border-black shadow-lg">
              <span className="text-[10px] text-primary-foreground font-bold">{mockProducts.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* ===== 底部互动与转化区 ===== */}
      <div className="absolute bottom-0 left-0 right-0 z-30">
        <div className="bg-gradient-to-t from-black/90 via-black/60 to-transparent pb-safe pt-4">
          <div className="px-3 pb-3">
            {/* 单行：弹幕输入框 + 功能图标 */}
            <div className="flex items-center gap-3">
              {/* 输入框 */}
              <div className="flex items-center gap-2 h-10 px-4 bg-white/10 backdrop-blur-md rounded-full border border-white/10 w-36">
                <input
                  type="text"
                  placeholder="说点什么..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-white/50 outline-none min-w-0"
                />
                <button 
                  onClick={handleSendMessage}
                  className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0 active:animate-send-pop transition-transform"
                >
                  <Send className="w-3 h-3 text-white" />
                </button>
              </div>

              {/* 点赞 */}
              <button 
                onClick={handleLike}
                className="relative w-10 h-10 rounded-full bg-white/10 flex items-center justify-center active:scale-110 transition-transform"
              >
                <Heart className="w-5 h-5 text-red-500 fill-red-500" />
              </button>

              {/* 打赏/礼物 */}
              <button 
                onClick={() => setShowGifts(true)}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-500/30 flex items-center justify-center animate-gift-glow"
              >
                <Gift className="w-5 h-5 text-amber-400" />
              </button>

              {/* 购物袋 - 仅电商直播 */}
              {isCommerce && (
                <button 
                  onClick={() => setShowProducts(!showProducts)}
                  className={cn(
                    "relative w-10 h-10 rounded-full bg-gradient-to-br from-red-500/30 to-pink-500/30 flex items-center justify-center",
                    mockProducts.length > 0 && "animate-cart-shake"
                  )}
                >
                  <ShoppingCart className="w-5 h-5 text-red-400" />
                  {mockProducts.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                      {mockProducts.length}
                    </span>
                  )}
                </button>
              )}

              {/* 连麦 - 所有竖屏直播都有 */}
              <button
                onClick={() => setShowMic(true)}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/30 to-cyan-500/30 flex items-center justify-center animate-call-pulse"
                aria-label="申请连麦"
              >
                <Phone className="w-5 h-5 text-blue-400" />
              </button>

              {/* 分享 */}
              <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:animate-share-spin">
                <Share2 className="w-5 h-5 text-white" />
              </button>

              {/* 更多：举报直播间 */}
              <button
                onClick={() => router.push(`/report?type=live&targetId=${live.id}`)}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
                aria-label="举报直播间"
              >
                <Flag className="w-5 h-5 text-white" />
              </button>
            </div>

            </div>
        </div>
      </div>

      {/* ===== 礼物面板（含选中/发送/余额校验/充值引导） ===== */}
      <GiftPanel
        open={showGifts}
        onClose={() => setShowGifts(false)}
        balance={giftBalance}
        onSend={handleSendGift}
      />

      {/* ===== 连麦弹窗（申请→等待→通话计时→挂断总结） ===== */}
      <MicConnectSheet
        open={showMic}
        onClose={() => setShowMic(false)}
        hostName={live.hostName ?? "主播"}
      />

      {/* ===== 礼物飘屏特效 ===== */}
      {giftFlyers.length > 0 && (
        <div className="pointer-events-none absolute inset-0 z-[45] overflow-hidden">
          {giftFlyers.map((f) => (
            <div
              key={f.id}
              className={cn(
                "absolute left-0 flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap animate-gift-fly",
                f.level === 3
                  ? "top-1/3 bg-gradient-to-r from-amber-500/90 to-orange-500/90 text-black font-bold text-lg shadow-2xl"
                  : "top-1/4 bg-black/50 text-white",
              )}
            >
              <span className={f.level === 3 ? "text-3xl" : "text-2xl"}>{f.icon}</span>
              <span>我 送出了 {f.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* ===== 商品列表弹窗 - 右侧滑出，不遮挡弹幕 ===== */}
      {showProducts && (
        <div className="absolute inset-0 z-50" onClick={() => setShowProducts(false)}>
          {/* 右侧商品面板 */}
          <div 
            className="absolute right-0 top-0 bottom-0 w-72 bg-black/90 backdrop-blur-md animate-in slide-in-from-right duration-300 flex flex-col" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="p-3 border-b border-white/10 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-gold" />
                <span className="text-sm font-medium text-white">本场好物</span>
                <span className="text-xs text-white/50">{mockProducts.length}件</span>
              </div>
              <button onClick={() => setShowProducts(false)}>
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>
            
            {/* 商品列表 */}
            <div className="flex-1 overflow-y-auto">
              {mockProducts.map((product, index) => (
                <div 
                  key={product.id} 
                  className={cn(
                    "p-3 border-b border-white/5 transition-all",
                    product.isExplaining && "bg-primary/10"
                  )}
                >
                  <div className="flex gap-3">
                    {/* 商品图片 */}
                    <div className="relative flex-shrink-0">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      {product.isExplaining && (
                        <div className="absolute -top-1 -left-1 px-1.5 py-0.5 bg-primary rounded text-[8px] text-primary-foreground font-medium animate-pulse">
                          讲解中
                        </div>
                      )}
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center">
                        <span className="text-[10px] text-white font-medium">{index + 1}</span>
                      </div>
                    </div>
                    
                    {/* 商品信息 */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs text-white/90 line-clamp-2 leading-tight">{product.name}</h4>
                      <div className="flex items-baseline gap-1.5 mt-1.5">
                        <span className="text-danger font-bold text-base">¥{product.price}</span>
                        <span className="text-[10px] text-white/40 line-through">¥{product.originalPrice}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] text-white/40">已售{product.sales}</span>
                        <button
                          onClick={() => { handleBuyNow(product); setShowProducts(false) }}
                          className="px-4 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground transition-opacity active:opacity-90"
                        >
                          立即购买
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* 底部提示：点击商品即可一键下单，无需购物车 */}
            <div className="p-3 border-t border-white/10 flex-shrink-0">
              <p className="text-center text-[11px] text-white/40">点击「立即购买」即可极速下单，无需离开直播间</p>
            </div>
          </div>
        </div>
      )}

      {/* 半屏确认订单 - 直播间极短购买链路 */}
      <QuickBuySheet
        open={!!buyProduct}
        product={buyProduct}
        onClose={() => setBuyProduct(null)}
        onPaid={() => setLiveSalesCount((c) => c + 1)}
      />

      {/* CSS动画样式 */}
      <style jsx global>{`
        @keyframes float-heart {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-100px) scale(0.5);
          }
        }
        .animate-float-heart {
          animation: float-heart 1.5s ease-out forwards;
        }
        @keyframes gift-fly {
          0% { transform: translateX(-110%); opacity: 0; }
          15% { transform: translateX(8%); opacity: 1; }
          80% { transform: translateX(8%); opacity: 1; }
          100% { transform: translateX(120%); opacity: 0; }
        }
        .animate-gift-fly {
          animation: gift-fly 2.4s ease-in-out forwards;
        }
        .pt-safe {
          padding-top: env(safe-area-inset-top, 0px);
        }
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
      `}</style>
    </div>
  )
}
