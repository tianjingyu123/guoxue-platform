"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { 
  ArrowLeft, Phone, PhoneOff, Video, VideoOff, Mic, MicOff, 
  MessageCircle, User, Clock, Coins, AlertTriangle, X, Check,
  Volume2, Sparkles
} from "lucide-react"
import { BackButton } from "@/components/common/back-button"
import { ReconnectingOverlay } from "@/components/call/reconnecting-overlay"

// 达人数据
const expertData = {
  id: 1,
  name: "周易大师",
  avatar: "",
  title: "八字命理资深讲师",
  status: "online", // online | busy | offline
  pricePerMinute: 10, // 每分钟价格
  packages: [
    { id: 1, duration: 15, price: 120, originalPrice: 150, discount: "8折" },
    { id: 2, duration: 30, price: 220, originalPrice: 300, discount: "7.3折", recommended: true },
    { id: 3, duration: 60, price: 400, originalPrice: 600, discount: "6.7折" },
  ],
  rating: 4.9,
  totalCalls: 856,
}

// 用户余额
const userBalance = 280

type CallState = "booking" | "waiting" | "connecting" | "active" | "ended" | "lowBalance"

export default function CallPage() {
  const params = useParams()
  const router = useRouter()
  
  const [callState, setCallState] = useState<CallState>("booking")
  const [callType, setCallType] = useState<"audio" | "video">("audio")
  const [selectedPackage, setSelectedPackage] = useState<number | null>(2)
  const [usePerMinute, setUsePerMinute] = useState(false)
  const [questionDescription, setQuestionDescription] = useState("")
  
  // 通话中状态
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [useVirtualAvatar, setUseVirtualAvatar] = useState(false)
  const [callDuration, setCallDuration] = useState(0) // 秒
  const [totalCost, setTotalCost] = useState(0)
  const [showLowBalanceWarning, setShowLowBalanceWarning] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  
  // 计算价格
  const getPrice = () => {
    if (usePerMinute) {
      return { type: "perMinute", price: expertData.pricePerMinute }
    }
    const pkg = expertData.packages.find(p => p.id === selectedPackage)
    return pkg ? { type: "package", price: pkg.price, duration: pkg.duration } : null
  }
  
  // 格式化时间
  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  
  // 开始通话
  const startCall = () => {
    setCallState("waiting")
    // 模拟接通
    setTimeout(() => {
      setCallState("connecting")
      setTimeout(() => {
        setCallState("active")
      }, 1500)
    }, 2000)
  }
  
  // 通话中监听网络断连：断网即进入重连态（暂停计时计费）
  useEffect(() => {
    if (callState !== "active") return
    const handleOffline = () => setIsReconnecting(true)
    window.addEventListener("offline", handleOffline)
    return () => window.removeEventListener("offline", handleOffline)
  }, [callState])

  // 通话计时和扣费（重连期间暂停）
  useEffect(() => {
    if (callState === "active" && !isReconnecting) {
      timerRef.current = setInterval(() => {
        setCallDuration(prev => {
          const newDuration = prev + 1
          // 每30秒扣费一次
          if (newDuration % 30 === 0 && usePerMinute) {
            setTotalCost(cost => cost + expertData.pricePerMinute / 2)
          }
          // 余额不足提醒（模拟剩余1分钟）
          if (newDuration === 60 && !showLowBalanceWarning) {
            setShowLowBalanceWarning(true)
          }
          return newDuration
        })
      }, 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [callState, usePerMinute, showLowBalanceWarning, isReconnecting])
  
  // 挂断
  const endCall = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setCallState("ended")
  }
  
  // 预订界面
  if (callState === "booking") {
    return (
      <div className="min-h-screen bg-background">
        {/* 顶部导航 */}
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
          <div className="flex items-center justify-between px-4 h-14">
            <BackButton />
            <h1 className="font-semibold text-base text-foreground">预约连麦</h1>
            <div className="w-9" />
          </div>
        </header>

        <div className="p-4 pb-32">
          {/* 达人信息 */}
          <Card className="p-4 mb-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={expertData.avatar} alt={expertData.name} />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {expertData.name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className={cn(
                  "absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-card",
                  expertData.status === "online" ? "bg-green-500" : 
                  expertData.status === "busy" ? "bg-yellow-500" : "bg-gray-400"
                )} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-foreground">{expertData.name}</h2>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-accent/20 text-accent border-0">V</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{expertData.title}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-accent" />
                    {expertData.rating}分
                  </span>
                  <span>{expertData.totalCalls}次连麦</span>
                </div>
              </div>
              <Badge className={cn(
                "text-xs",
                expertData.status === "online" ? "bg-green-500/20 text-green-600 border-0" :
                expertData.status === "busy" ? "bg-yellow-500/20 text-yellow-600 border-0" :
                "bg-gray-500/20 text-gray-500 border-0"
              )}>
                {expertData.status === "online" ? "在线" : 
                 expertData.status === "busy" ? "忙碌" : "离线"}
              </Badge>
            </div>
          </Card>

          {/* 通话类型选择 */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-foreground mb-3">选择通话方式</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setCallType("audio")}
                className={cn(
                  "flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all",
                  callType === "audio" 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <Phone className={cn("w-5 h-5", callType === "audio" ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("font-medium", callType === "audio" ? "text-primary" : "text-foreground")}>
                  语音连麦
                </span>
              </button>
              <button
                onClick={() => setCallType("video")}
                className={cn(
                  "flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all",
                  callType === "video" 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <Video className={cn("w-5 h-5", callType === "video" ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("font-medium", callType === "video" ? "text-primary" : "text-foreground")}>
                  视频连麦
                </span>
              </button>
            </div>
          </div>

          {/* 时长套餐 */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-foreground">选择咨询时长</h3>
              <button 
                onClick={() => { setUsePerMinute(!usePerMinute); setSelectedPackage(null) }}
                className={cn(
                  "text-xs px-3 py-1 rounded-full transition-colors",
                  usePerMinute ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                )}
              >
                按分钟计费
              </button>
            </div>
            
            {!usePerMinute ? (
              <div className="space-y-2">
                {expertData.packages.map(pkg => (
                  <button
                    key={pkg.id}
                    onClick={() => setSelectedPackage(pkg.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all",
                      selectedPackage === pkg.id 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{pkg.duration}分钟</span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-accent/20 text-accent border-0">
                            {pkg.discount}
                          </Badge>
                          {pkg.recommended && (
                            <Badge className="text-[10px] px-1.5 py-0 bg-primary text-primary-foreground border-0">
                              推荐
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          约{Math.round(pkg.price / pkg.duration)}币/分钟
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary text-lg">{pkg.price}币</p>
                      <p className="text-xs text-muted-foreground line-through">{pkg.originalPrice}币</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <Card className="p-4 border-primary bg-primary/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Coins className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">按分钟计费</p>
                      <p className="text-xs text-muted-foreground">通话结束后自动结算</p>
                    </div>
                  </div>
                  <p className="font-bold text-primary text-lg">{expertData.pricePerMinute}币/分钟</p>
                </div>
              </Card>
            )}
          </div>

          {/* 问题描述 */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-foreground mb-3">问题描述（选填）</h3>
            <textarea
              value={questionDescription}
              onChange={(e) => setQuestionDescription(e.target.value)}
              placeholder="简要描述你想咨询的问题，帮助达人更好地准备..."
              className="w-full h-24 p-3 rounded-xl bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* 余额提示 */}
          <Card className="p-3 bg-accent/5 border-accent/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-accent" />
                <span className="text-sm text-foreground">账户余额</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-accent">{userBalance}币</span>
                <Link href="/wallet/recharge" className="text-xs text-primary">充值</Link>
              </div>
            </div>
          </Card>
        </div>

        {/* 底部操作栏 */}
        <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border safe-area-pb">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">预计费用</span>
              <div className="flex items-center gap-1">
                {getPrice()?.type === "package" ? (
                  <span className="font-bold text-lg text-primary">{getPrice()?.price}币</span>
                ) : (
                  <span className="font-bold text-lg text-primary">{expertData.pricePerMinute}币/分钟</span>
                )}
              </div>
            </div>
            <button
              onClick={startCall}
              disabled={expertData.status !== "online" || (!selectedPackage && !usePerMinute)}
              className={cn(
                "w-full py-3.5 rounded-xl font-medium text-base transition-all flex items-center justify-center gap-2",
                expertData.status === "online" && (selectedPackage || usePerMinute)
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-secondary text-muted-foreground cursor-not-allowed"
              )}
            >
              {callType === "video" ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
              {expertData.status === "online" ? "开始连麦" : "达人不在线"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 等待接通界面
  if (callState === "waiting" || callState === "connecting") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/20 via-background to-background flex flex-col items-center justify-center p-6">
        {/* 达人头像 */}
        <div className="relative mb-8">
          <div className={cn(
            "absolute inset-0 rounded-full",
            callState === "connecting" ? "animate-ping bg-primary/30" : "animate-pulse bg-primary/20"
          )} style={{ transform: "scale(1.3)" }} />
          <Avatar className="w-32 h-32 border-4 border-primary/30 relative">
            <AvatarImage src={expertData.avatar} alt={expertData.name} />
            <AvatarFallback className="bg-primary/10 text-primary text-3xl">
              {expertData.name[0]}
            </AvatarFallback>
          </Avatar>
        </div>

        <h2 className="text-xl font-semibold text-foreground mb-2">{expertData.name}</h2>
        <p className="text-muted-foreground mb-8">
          {callState === "waiting" ? "正在等待对方接听..." : "正在连接中..."}
        </p>

        {/* 挂断按钮 */}
        <button
          onClick={() => setCallState("booking")}
          className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors"
        >
          <PhoneOff className="w-7 h-7 text-white" />
        </button>
        <p className="text-sm text-muted-foreground mt-3">挂断</p>
      </div>
    )
  }

  // 通话中界面
  if (callState === "active") {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        {/* 费用提示角标 */}
        <div className="absolute top-4 right-4 z-20 safe-area-pt">
          <Card className="px-3 py-2 bg-black/60 border-0 backdrop-blur">
            <div className="flex items-center gap-2 text-white">
              <Clock className="w-4 h-4" />
              <span className="font-mono text-sm">{formatDuration(callDuration)}</span>
              <span className="text-white/60">|</span>
              <Coins className="w-4 h-4 text-accent" />
              <span className="font-mono text-sm text-accent">
                {usePerMinute ? totalCost.toFixed(0) : getPrice()?.price}币
              </span>
            </div>
          </Card>
        </div>

        {/* 虚拟头像切换 */}
        <div className="absolute top-4 left-4 z-20 safe-area-pt">
          <button
            onClick={() => setUseVirtualAvatar(!useVirtualAvatar)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-full transition-colors",
              useVirtualAvatar ? "bg-accent text-white" : "bg-white/20 text-white"
            )}
          >
            <User className="w-4 h-4" />
            <span className="text-xs">{useVirtualAvatar ? "虚拟头像" : "真实画面"}</span>
          </button>
        </div>

        {/* 视频/音频区域 */}
        <div className="flex-1 flex items-center justify-center relative">
          {callType === "video" && isVideoOn && !useVirtualAvatar ? (
            // 视频画面占位
            <div className="w-full h-full bg-gradient-to-b from-gray-800 to-gray-900 flex items-center justify-center">
              <p className="text-white/40 text-sm">视频画面区域</p>
            </div>
          ) : (
            // 音频或虚拟头像模式
            <div className="flex flex-col items-center">
              {useVirtualAvatar ? (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-6">
                  <User className="w-16 h-16 text-white" />
                </div>
              ) : (
                <Avatar className="w-32 h-32 mb-6">
                  <AvatarImage src={expertData.avatar} alt={expertData.name} />
                  <AvatarFallback className="bg-primary/20 text-primary text-3xl">
                    {expertData.name[0]}
                  </AvatarFallback>
                </Avatar>
              )}
              <h2 className="text-xl font-semibold text-white mb-2">{expertData.name}</h2>
              {/* 音频波形 */}
              <div className="flex items-end gap-1 h-8 mt-4">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-primary rounded-full animate-pulse"
                    style={{
                      height: `${Math.random() * 24 + 8}px`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 小窗（自己的画面） */}
          {callType === "video" && (
            <div className="absolute top-20 right-4 w-24 h-32 rounded-xl overflow-hidden bg-gray-700 border-2 border-white/20">
              {isVideoOn ? (
                <div className="w-full h-full bg-gradient-to-b from-gray-600 to-gray-700 flex items-center justify-center">
                  <User className="w-8 h-8 text-white/40" />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <VideoOff className="w-6 h-6 text-white/40" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部控制栏 */}
        <div className="p-6 safe-area-pb">
          <div className="flex items-center justify-center gap-6">
            {/* 静音 */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center transition-colors",
                isMuted ? "bg-red-500" : "bg-white/20"
              )}
            >
              {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
            </button>

            {/* 挂断 */}
            <button
              onClick={endCall}
              className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors"
            >
              <PhoneOff className="w-7 h-7 text-white" />
            </button>

            {/* 视频开关（仅视频模式） */}
            {callType === "video" && (
              <button
                onClick={() => setIsVideoOn(!isVideoOn)}
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center transition-colors",
                  !isVideoOn ? "bg-red-500" : "bg-white/20"
                )}
              >
                {isVideoOn ? <Video className="w-6 h-6 text-white" /> : <VideoOff className="w-6 h-6 text-white" />}
              </button>
            )}

            {/* 转文字聊天 */}
            <button className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* 网络状态（点击模拟断连，便于演示重连流程） */}
          <button
            onClick={() => setIsReconnecting(true)}
            className="mx-auto mt-4 flex items-center gap-1.5 text-white/40 text-xs"
          >
            <Volume2 className="w-3.5 h-3.5" />
            网络正常 · 点此模拟断连
          </button>
        </div>

        {/* 网络断连重连浮层 */}
        <ReconnectingOverlay
          open={isReconnecting}
          onReconnected={() => setIsReconnecting(false)}
          onEndCall={endCall}
        />

        {/* 余额不足提醒弹窗 */}
        {showLowBalanceWarning && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
            <Card className="w-full max-w-sm p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">余额即将不足</h3>
                  <p className="text-sm text-muted-foreground">预计还可通话约1分钟</p>
                </div>
              </div>
              <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-secondary">
                <span className="text-sm text-muted-foreground">当前余额</span>
                <span className="font-bold text-accent">{userBalance - totalCost}币</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLowBalanceWarning(false)}
                  className="flex-1 py-2.5 rounded-xl bg-secondary text-foreground font-medium"
                >
                  稍后再说
                </button>
                <Link
                  href="/wallet/recharge"
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-center"
                >
                  立即充值
                </Link>
              </div>
            </Card>
          </div>
        )}
      </div>
    )
  }

  // 通话结束界面
  if (callState === "ended") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
          <Check className="w-10 h-10 text-green-500" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">通话已结束</h2>
        <p className="text-muted-foreground mb-6">感谢你的咨询</p>

        <Card className="w-full max-w-sm p-4 mb-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">通话时长</span>
              <span className="font-medium text-foreground">{formatDuration(callDuration)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">本次消费</span>
              <span className="font-bold text-primary">{usePerMinute ? totalCost : getPrice()?.price}币</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">咨询达人</span>
              <span className="font-medium text-foreground">{expertData.name}</span>
            </div>
          </div>
        </Card>

        <div className="flex gap-4 w-full max-w-sm">
          <button
            onClick={() => router.back()}
            className="flex-1 py-3 rounded-xl bg-secondary text-foreground font-medium"
          >
            返回
          </button>
          <button
            onClick={() => setCallState("booking")}
            className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-medium"
          >
            再次咨询
          </button>
        </div>
      </div>
    )
  }

  return null
}
