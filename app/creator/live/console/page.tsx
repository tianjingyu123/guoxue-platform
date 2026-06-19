"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  DialogDescription
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { 
  ChevronLeft, Users, Eye, Heart, DollarSign, TrendingUp, ShoppingBag,
  MessageCircle, Ban, Trash2, Pin, Reply, Phone, PhoneOff, Mic, MicOff,
  Gift, Ticket, Percent, Send, Clock, AlertTriangle, Package, Tag,
  FileText, ChevronUp, ChevronDown, Settings, Volume2, VolumeX, 
  Radio, StopCircle, MoreVertical, RefreshCw, Sparkles, Crown, Zap
} from "lucide-react"

// 实时数据
const liveStats = {
  onlineCount: 1258,
  totalViews: 8560,
  newFollowers: 86,
  totalGift: 2680,
  totalSales: 12800,
  peakOnline: 1580,
  avgWatchTime: "8:32",
  interactionRate: "12.5%",
}

// 弹幕数据
const mockDanmaku = [
  { id: 1, user: "易学小白", content: "老师讲得真好！", time: "10:23:15", level: 3, isVip: false },
  { id: 2, user: "命理爱好者", content: "这个八字怎么看财运？", time: "10:23:18", level: 5, isVip: true },
  { id: 3, user: "紫微迷", content: "老师能讲讲紫微斗数吗", time: "10:23:22", level: 2, isVip: false },
  { id: 4, user: "风水先生", content: "支持老师！", time: "10:23:25", level: 8, isVip: true },
  { id: 5, user: "新用户001", content: "刚来，老师在讲什么？", time: "10:23:30", level: 1, isVip: false },
  { id: 6, user: "道法自然", content: "八字日主分析很到位", time: "10:23:35", level: 6, isVip: false },
  { id: 7, user: "学易人", content: "请问今天有抽奖吗？", time: "10:23:40", level: 4, isVip: false },
  { id: 8, user: "命理大师粉丝", content: "已购买课程，非常棒！", time: "10:23:45", level: 7, isVip: true },
]

// 连麦申请
const mockConnectRequests = [
  { id: 1, user: "命理爱好者", avatar: "", reason: "想请教老师关于日主偏弱的问题", waitTime: "2:30" },
  { id: 2, user: "紫微迷", avatar: "", reason: "我的命盘有疑问想请老师解答", waitTime: "1:15" },
  { id: 3, user: "风水先生", avatar: "", reason: "交流风水布局心得", waitTime: "0:45" },
]

// 商品数据
const mockProducts = [
  { id: 1, name: "八字命理精讲课程", price: 199, stock: 100, sold: 58, isLive: true, isHot: true },
  { id: 2, name: "紫微斗数入门到精通", price: 299, stock: 50, sold: 32, isLive: false, isHot: false },
  { id: 3, name: "开光貔貅摆件", price: 168, stock: 15, sold: 85, isLive: false, isHot: true },
  { id: 4, name: "专业罗盘（铜制）", price: 398, stock: 8, sold: 42, isLive: false, isHot: false },
  { id: 5, name: "五帝钱套装", price: 88, stock: 3, sold: 97, isLive: false, isHot: false },
]

// 提词器内容
const mockScript = [
  { id: 1, time: "00:00", content: "开场白：欢迎各位来到今天的八字命理课堂", done: true },
  { id: 2, time: "05:00", content: "第一部分：八字的基本概念和四柱含义", done: true },
  { id: 3, time: "15:00", content: "第二部分：十天干的特性与作用关系", done: false, isCurrent: true },
  { id: 4, time: "30:00", content: "第三部分：十二地支的藏干与刑冲合害", done: false },
  { id: 5, time: "45:00", content: "第四部分：日主强弱的判断方法", done: false },
  { id: 6, time: "55:00", content: "互动环节：观众提问与命盘分析", done: false },
  { id: 7, time: "58:00", content: "结尾：课程推荐和下期预告", done: false },
]

export default function LiveConsolePage() {
  const router = useRouter()
  const [danmakuList, setDanmakuList] = useState(mockDanmaku)
  const [connectRequests, setConnectRequests] = useState(mockConnectRequests)
  const [products, setProducts] = useState(mockProducts)
  const [script, setScript] = useState(mockScript)
  const [isLive, setIsLive] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [showTeleprompter, setShowTeleprompter] = useState(true)
  const [activeTab, setActiveTab] = useState("danmaku")
  const [liveTime, setLiveTime] = useState(3892) // 秒
  const [showLotteryDialog, setShowLotteryDialog] = useState(false)
  const [showCouponDialog, setShowCouponDialog] = useState(false)
  const [showEndDialog, setShowEndDialog] = useState(false)
  const danmakuRef = useRef<HTMLDivElement>(null)
  
  // 直播计时
  useEffect(() => {
    if (!isLive) return
    const timer = setInterval(() => {
      setLiveTime(prev => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [isLive])
  
  // 格式化时间
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }
  
  // 模拟实时弹幕
  useEffect(() => {
    const mockMessages = [
      "老师讲得太好了！",
      "学到了很多",
      "这个知识点很重要",
      "请问老师...",
      "感谢老师分享",
      "涨知识了",
      "求老师讲讲风水",
    ]
    const mockUsers = ["易学新人", "命理迷", "国学爱好者", "道友", "学习中", "小白一枚"]
    
    const timer = setInterval(() => {
      const newDanmaku = {
        id: Date.now(),
        user: mockUsers[Math.floor(Math.random() * mockUsers.length)],
        content: mockMessages[Math.floor(Math.random() * mockMessages.length)],
        time: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
        level: Math.floor(Math.random() * 10) + 1,
        isVip: Math.random() > 0.8,
      }
      setDanmakuList(prev => [...prev.slice(-50), newDanmaku])
    }, 3000)
    
    return () => clearInterval(timer)
  }, [])
  
  // 自动滚动弹幕
  useEffect(() => {
    if (danmakuRef.current) {
      danmakuRef.current.scrollTop = danmakuRef.current.scrollHeight
    }
  }, [danmakuList])
  
  // 处理商品上架讲解
  const handleProductLive = (productId: number) => {
    setProducts(prev => prev.map(p => ({
      ...p,
      isLive: p.id === productId
    })))
  }
  
  // 接受连麦
  const handleAcceptConnect = (id: number) => {
    setConnectRequests(prev => prev.filter(r => r.id !== id))
  }
  
  // 拒绝连麦
  const handleRejectConnect = (id: number) => {
    setConnectRequests(prev => prev.filter(r => r.id !== id))
  }
  
  // 禁言用户
  const handleBanUser = (userId: number) => {
    // 实际实现禁言逻辑
  }
  
  // 删除弹幕
  const handleDeleteDanmaku = (id: number) => {
    setDanmakuList(prev => prev.filter(d => d.id !== id))
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部控制栏 */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              {isLive ? (
                <Badge className="bg-red-500 text-white border-0 animate-pulse">
                  <Radio className="w-3 h-3 mr-1" />
                  直播中
                </Badge>
              ) : (
                <Badge variant="secondary">已结束</Badge>
              )}
              <span className="text-sm font-medium">八字命理入门精讲</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* 直播时长 */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-full">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-mono font-medium">{formatTime(liveTime)}</span>
            </div>
            
            {/* 控制按钮 */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTeleprompter(!showTeleprompter)}
              >
                <FileText className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowEndDialog(true)}
              >
                <StopCircle className="w-4 h-4 mr-1" />
                结束直播
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-56px)]">
        {/* 左侧：核心数据 + 弹幕/连麦 */}
        <div className="flex-1 flex flex-col border-r border-border">
          {/* 核心数据区 */}
          <div className="p-4 border-b border-border">
            <div className="grid grid-cols-4 gap-3">
              <Card className="p-3 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground">在线人数</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-blue-600">{liveStats.onlineCount.toLocaleString()}</span>
                  <span className="text-xs text-green-500">+12</span>
                </div>
              </Card>
              
              <Card className="p-3 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <Eye className="w-4 h-4 text-purple-500" />
                  <span className="text-xs text-muted-foreground">累计观看</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-purple-600">{liveStats.totalViews.toLocaleString()}</span>
                </div>
              </Card>
              
              <Card className="p-3 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <Gift className="w-4 h-4 text-amber-500" />
                  <span className="text-xs text-muted-foreground">打赏收入</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-amber-600">¥{liveStats.totalGift.toLocaleString()}</span>
                </div>
              </Card>
              
              <Card className="p-3 bg-gradient-to-br from-red-500/10 to-pink-500/10 border-red-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <ShoppingBag className="w-4 h-4 text-red-500" />
                  <span className="text-xs text-muted-foreground">带货成交</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-red-600">¥{liveStats.totalSales.toLocaleString()}</span>
                </div>
              </Card>
            </div>
            
            {/* 次要数据 */}
            <div className="flex items-center gap-6 mt-3 text-xs text-muted-foreground">
              <span>峰值在线: <strong className="text-foreground">{liveStats.peakOnline}</strong></span>
              <span>新增粉丝: <strong className="text-foreground text-green-500">+{liveStats.newFollowers}</strong></span>
              <span>平均观看: <strong className="text-foreground">{liveStats.avgWatchTime}</strong></span>
              <span>互动率: <strong className="text-foreground">{liveStats.interactionRate}</strong></span>
            </div>
          </div>
          
          {/* 弹幕/连麦 Tab区 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <div className="px-4 border-b border-border">
                <TabsList className="h-10">
                  <TabsTrigger value="danmaku" className="text-xs">
                    <MessageCircle className="w-3.5 h-3.5 mr-1" />
                    实时弹幕
                    <Badge variant="secondary" className="ml-1.5 text-[10px] px-1">{danmakuList.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="connect" className="text-xs">
                    <Phone className="w-3.5 h-3.5 mr-1" />
                    连麦申请
                    {connectRequests.length > 0 && (
                      <Badge className="ml-1.5 text-[10px] px-1 bg-red-500 border-0">{connectRequests.length}</Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="danmaku" className="flex-1 flex flex-col m-0 overflow-hidden">
                {/* 弹幕列表 */}
                <div ref={danmakuRef} className="flex-1 overflow-y-auto p-3 space-y-1.5">
                  {danmakuList.map((item) => (
                    <div
                      key={item.id}
                      className="group flex items-start gap-2 p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold">
                        {item.level}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            "text-xs font-medium",
                            item.isVip ? "text-amber-500" : "text-muted-foreground"
                          )}>
                            {item.isVip && <Crown className="w-3 h-3 inline mr-0.5" />}
                            {item.user}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{item.time}</span>
                        </div>
                        <p className="text-sm mt-0.5">{item.content}</p>
                      </div>
                      {/* 操作按钮 */}
                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                        <Button variant="ghost" size="icon" className="w-6 h-6">
                          <Pin className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-6 h-6">
                          <Reply className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-6 h-6 text-red-500">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-6 h-6 text-red-500">
                          <Ban className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* 快捷回复 */}
                <div className="p-3 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Input placeholder="发送弹幕..." className="flex-1 h-9" />
                    <Button size="sm">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {["欢迎新朋友", "感谢关注", "稍后解答", "请耐心等待"].map((text) => (
                      <Button key={text} variant="outline" size="sm" className="h-6 text-[10px] px-2">
                        {text}
                      </Button>
                    ))}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="connect" className="flex-1 m-0 overflow-y-auto p-3">
                {connectRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Phone className="w-12 h-12 mb-2 opacity-20" />
                    <p className="text-sm">暂无连麦申请</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {connectRequests.map((request) => (
                      <Card key={request.id} className="p-3">
                        <div className="flex items-start gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback>{request.user[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{request.user}</span>
                              <span className="text-xs text-muted-foreground">等待 {request.waitTime}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{request.reason}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Button
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => handleAcceptConnect(request.id)}
                              >
                                <Phone className="w-3 h-3 mr-1" />
                                接通
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => handleRejectConnect(request.id)}
                              >
                                <PhoneOff className="w-3 h-3 mr-1" />
                                拒绝
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
        
        {/* 右侧：商品管理 + 营销工具 + 提词器 */}
        <div className="w-[380px] flex flex-col overflow-hidden">
          {/* 商品管理区 */}
          <div className="border-b border-border">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">商品管理</span>
                <Badge variant="secondary" className="text-[10px]">{products.length}件</Badge>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                <RefreshCw className="w-3 h-3 mr-1" />
                刷新库存
              </Button>
            </div>
            
            {/* 当前讲解商品 */}
            {products.find(p => p.isLive) && (
              <div className="p-3 bg-primary/5 border-b border-primary/20">
                <div className="flex items-center gap-1 mb-2">
                  <Radio className="w-3 h-3 text-primary animate-pulse" />
                  <span className="text-xs text-primary font-medium">正在讲解</span>
                </div>
                {(() => {
                  const liveProduct = products.find(p => p.isLive)!
                  return (
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center">
                        <Package className="w-6 h-6 text-muted-foreground/30" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{liveProduct.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-primary font-bold">¥{liveProduct.price}</span>
                          <span className="text-xs text-muted-foreground">已售{liveProduct.sold}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => handleProductLive(0)}
                      >
                        结束讲解
                      </Button>
                    </div>
                  )
                })()}
              </div>
            )}
            
            {/* 商品列表 */}
            <ScrollArea className="h-[180px]">
              <div className="p-2 space-y-1.5">
                {products.filter(p => !p.isLive).map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center flex-shrink-0">
                      <Package className="w-4 h-4 text-muted-foreground/30" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-medium truncate">{product.name}</p>
                        {product.isHot && (
                          <Badge className="text-[8px] px-1 py-0 bg-red-500 border-0">爆</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="text-primary font-medium">¥{product.price}</span>
                        <span>库存: {product.stock <= 10 ? (
                          <span className="text-red-500">{product.stock}</span>
                        ) : product.stock}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] px-2"
                      onClick={() => handleProductLive(product.id)}
                    >
                      上架讲解
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            {/* 库存预警 */}
            {products.some(p => p.stock <= 10) && (
              <div className="p-2 bg-amber-500/10 border-t border-amber-500/20">
                <div className="flex items-center gap-1.5 text-amber-600">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">
                    {products.filter(p => p.stock <= 10).length}件商品库存不足
                  </span>
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs text-amber-600">
                    去补货
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          {/* 营销工具 */}
          <div className="p-3 border-b border-border">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="font-medium text-sm">营销工具</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                className="h-auto py-3 flex-col gap-1"
                onClick={() => setShowLotteryDialog(true)}
              >
                <Gift className="w-5 h-5 text-purple-500" />
                <span className="text-[10px]">发起抽奖</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-3 flex-col gap-1"
                onClick={() => setShowCouponDialog(true)}
              >
                <Ticket className="w-5 h-5 text-red-500" />
                <span className="text-[10px]">发放优惠券</span>
              </Button>
              <Button variant="outline" className="h-auto py-3 flex-col gap-1">
                <Zap className="w-5 h-5 text-amber-500" />
                <span className="text-[10px]">推送秒杀</span>
              </Button>
            </div>
          </div>
          
          {/* 提词器 */}
          {showTeleprompter && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span className="font-medium text-sm">提词器</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-6 h-6"
                  onClick={() => setShowTeleprompter(false)}
                >
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </div>
              
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-2">
                  {script.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "p-2.5 rounded-lg border transition-colors",
                        item.isCurrent
                          ? "bg-primary/10 border-primary"
                          : item.done
                          ? "bg-secondary/50 border-border opacity-60"
                          : "border-border hover:bg-secondary/30"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "text-[10px] font-mono px-1.5 py-0.5 rounded",
                          item.isCurrent ? "bg-primary text-primary-foreground" : "bg-secondary"
                        )}>
                          {item.time}
                        </span>
                        {item.isCurrent && (
                          <Badge className="text-[10px] bg-primary/20 text-primary border-0">
                            当前
                          </Badge>
                        )}
                        {item.done && (
                          <Badge variant="secondary" className="text-[10px]">已完成</Badge>
                        )}
                      </div>
                      <p className={cn(
                        "text-sm",
                        item.isCurrent && "font-medium"
                      )}>{item.content}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>
      
      {/* 抽奖对话框 */}
      <Dialog open={showLotteryDialog} onOpenChange={setShowLotteryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>发起抽奖</DialogTitle>
            <DialogDescription>设置抽奖规则和奖品</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>奖品名称</Label>
              <Input placeholder="如：八字精批课程" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>中奖人数</Label>
                <Input type="number" placeholder="1" />
              </div>
              <div className="space-y-2">
                <Label>参与条件</Label>
                <Input placeholder="如：发送弹幕" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>开奖时间（分钟后）</Label>
              <Input type="number" placeholder="5" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLotteryDialog(false)}>取消</Button>
            <Button onClick={() => setShowLotteryDialog(false)}>开始抽奖</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 优惠券对话框 */}
      <Dialog open={showCouponDialog} onOpenChange={setShowCouponDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>发放优惠券</DialogTitle>
            <DialogDescription>向直播间观众发放优惠券</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>选择优惠券</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: "满100减10", count: 100 },
                  { name: "满200减30", count: 50 },
                  { name: "课程8折券", count: 30 },
                ].map((coupon) => (
                  <Card
                    key={coupon.name}
                    className="p-3 cursor-pointer hover:border-primary transition-colors"
                  >
                    <p className="font-medium text-sm">{coupon.name}</p>
                    <p className="text-xs text-muted-foreground">剩余{coupon.count}张</p>
                  </Card>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>发放数量</Label>
              <Input type="number" placeholder="10" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCouponDialog(false)}>取消</Button>
            <Button onClick={() => setShowCouponDialog(false)}>立即发放</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 结束直播确认 */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认结束直播？</DialogTitle>
            <DialogDescription>
              本场直播已进行 {formatTime(liveTime)}，累计观看 {liveStats.totalViews} 人次
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <Card className="p-3">
                <p className="text-2xl font-bold text-primary">{liveStats.newFollowers}</p>
                <p className="text-xs text-muted-foreground">新增粉丝</p>
              </Card>
              <Card className="p-3">
                <p className="text-2xl font-bold text-amber-500">¥{liveStats.totalGift + liveStats.totalSales}</p>
                <p className="text-xs text-muted-foreground">总收入</p>
              </Card>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEndDialog(false)}>继续直播</Button>
            <Button variant="destructive" onClick={() => {
              setIsLive(false)
              setShowEndDialog(false)
              router.push("/creator/live")
            }}>
              确认结束
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
