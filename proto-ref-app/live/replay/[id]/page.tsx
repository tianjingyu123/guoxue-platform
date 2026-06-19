"use client"

import { useState, useRef, useEffect, use } from "react"
import Link from "next/link"
import { 
  ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize, Minimize, SkipBack, SkipForward,
  Share2, Heart, MessageCircle, HelpCircle, ShoppingBag, Clock, Eye, Users,
  ChevronRight, List, Image, ChevronDown, Loader2
} from "lucide-react"
import { BackButton } from "@/components/common/back-button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { 
  getReplayDetail, 
  savePlayProgress, 
  formatSeconds, 
  PLAYBACK_SPEEDS, 
  getSpeedLabel,
  getCurrentChapter,
  getCurrentSlide
} from "@/lib/api/live"
import type { ReplayDetail, ReplayChapter, PlaybackSpeed } from "@/lib/types/live"

export default function LiveReplayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const replayId = Number(id)
  
  const [replay, setReplay] = useState<ReplayDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(9015) // 默认值
  const [speed, setSpeed] = useState<PlaybackSpeed>(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const [showChapters, setShowChapters] = useState(false)
  const [showSlides, setShowSlides] = useState(false)
  const [activeTab, setActiveTab] = useState<"discussion" | "qa" | "products" | "chapters">("chapters")
  const [isCollected, setIsCollected] = useState(false)
  const [showControls, setShowControls] = useState(true)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout>()
  
  // 加载回放数据
  useEffect(() => {
    async function loadReplay() {
      setLoading(true)
      const response = await getReplayDetail(replayId)
      if (response.code === 200 && response.data) {
        setReplay(response.data)
      }
      setLoading(false)
    }
    loadReplay()
  }, [replayId])
  
  // 自动隐藏控制栏
  useEffect(() => {
    if (isPlaying && showControls) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [isPlaying, showControls])
  
  // 定期保存播放进度
  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => {
      savePlayProgress(replayId, currentTime)
    }, 30000)
    return () => clearInterval(interval)
  }, [replayId, currentTime, isPlaying])
  
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  
  const currentChapter = replay?.chapters ? getCurrentChapter(replay.chapters, currentTime) : null
  const currentSlide = replay?.slides ? getCurrentSlide(replay.slides, currentTime) : null
  
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
    setShowControls(true)
  }
  
  const handleSeek = (time: number) => {
    setCurrentTime(Math.max(0, Math.min(time, duration)))
    setShowControls(true)
  }
  
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    handleSeek(Math.floor(percent * duration))
  }
  
  const handleSpeedChange = (newSpeed: PlaybackSpeed) => {
    setSpeed(newSpeed)
    setShowSpeedMenu(false)
  }
  
  const handleChapterClick = (chapter: ReplayChapter) => {
    handleSeek(chapter.startTime)
    setIsPlaying(true)
    setShowChapters(false)
  }
  
  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
    setIsFullscreen(!isFullscreen)
  }
  
  const handleVideoClick = () => {
    setShowControls(true)
  }
  
  // 模拟播放进度
  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => {
      setCurrentTime(t => {
        const newTime = t + speed
        if (newTime >= duration) {
          setIsPlaying(false)
          return duration
        }
        return newTime
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isPlaying, speed, duration])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!replay) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">回放不存在</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 播放器区域 */}
      <div 
        ref={containerRef}
        className="relative bg-black aspect-video"
        onClick={handleVideoClick}
      >
        {/* 返回按钮 */}
        <div className={cn(
          "absolute top-4 left-4 z-20 transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0"
        )}>
          <BackButton overlay />
        </div>
        
        {/* 视频区域 */}
        <div className="absolute inset-0 flex items-center justify-center">
          {!isPlaying ? (
            <button 
              onClick={(e) => {
                e.stopPropagation()
                handlePlayPause()
              }}
              className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <Play className="w-8 h-8 text-white fill-white ml-1" />
            </button>
          ) : (
            <div className="text-white/60 text-sm">播放中...</div>
          )}
        </div>
        
        {/* 回放+倍速标签 */}
        <div className={cn(
          "absolute top-4 right-4 flex items-center gap-2 transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0"
        )}>
          <div className="px-2 py-1 rounded bg-black/60 text-white text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" />
            回放
          </div>
          {speed !== 1 && (
            <div className="px-2 py-1 rounded bg-primary/80 text-white text-xs font-medium">
              {speed}x
            </div>
          )}
        </div>
        
        {/* 当前章节显示 */}
        {currentChapter && (
          <div className={cn(
            "absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/60 text-white text-xs transition-opacity duration-300",
            showControls ? "opacity-100" : "opacity-0"
          )}>
            {currentChapter.title}
          </div>
        )}
        
        {/* 控制栏 */}
        <div className={cn(
          "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0"
        )}>
          {/* 进度条 */}
          <div 
            className="h-1.5 bg-white/30 rounded-full mb-3 cursor-pointer relative group"
            onClick={(e) => {
              e.stopPropagation()
              handleProgressClick(e)
            }}
          >
            {/* 章节标记点 */}
            {replay.chapters.map((chapter) => (
              <div
                key={chapter.id}
                className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-accent rounded-full cursor-pointer hover:scale-150 transition-transform z-10"
                style={{ left: `${(chapter.startTime / duration) * 100}%` }}
                onClick={(e) => {
                  e.stopPropagation()
                  handleChapterClick(chapter)
                }}
                title={chapter.title}
              />
            ))}
            {/* 进度条 */}
            <div 
              className="h-full bg-primary rounded-full relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow group-hover:scale-125 transition-transform" />
            </div>
          </div>
          
          {/* 控制按钮 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={(e) => { e.stopPropagation(); handlePlayPause() }}>
                {isPlaying ? (
                  <Pause className="w-6 h-6 text-white" />
                ) : (
                  <Play className="w-6 h-6 text-white fill-white" />
                )}
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleSeek(currentTime - 10) }}>
                <SkipBack className="w-5 h-5 text-white" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleSeek(currentTime + 10) }}>
                <SkipForward className="w-5 h-5 text-white" />
              </button>
              <span className="text-white text-xs">
                {formatSeconds(currentTime)} / {replay.duration || formatSeconds(duration)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {/* 章节列表 */}
              <button 
                onClick={(e) => { e.stopPropagation(); setShowChapters(!showChapters) }}
                className="flex items-center gap-1 px-2 py-1 rounded bg-white/20 text-white text-xs hover:bg-white/30"
              >
                <List className="w-4 h-4" />
                章节
              </button>
              
              {/* 倍速选择 */}
              <div className="relative">
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowSpeedMenu(!showSpeedMenu) }}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-white/20 text-white text-xs hover:bg-white/30"
                >
                  {getSpeedLabel(speed)}
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showSpeedMenu && (
                  <div className="absolute bottom-full right-0 mb-2 bg-black/90 rounded-lg overflow-hidden">
                    {PLAYBACK_SPEEDS.map((s) => (
                      <button
                        key={s}
                        onClick={(e) => { e.stopPropagation(); handleSpeedChange(s) }}
                        className={cn(
                          "block w-full px-4 py-2 text-xs text-white hover:bg-white/20 transition-colors",
                          speed === s && "text-primary bg-white/10"
                        )}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* 课件 */}
              {replay.slides.length > 0 && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowSlides(!showSlides) }}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-white/20 text-white text-xs hover:bg-white/30"
                >
                  <Image className="w-4 h-4" />
                </button>
              )}
              
              <button onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted) }}>
                {isMuted ? (
                  <VolumeX className="w-5 h-5 text-white" />
                ) : (
                  <Volume2 className="w-5 h-5 text-white" />
                )}
              </button>
              <button onClick={(e) => { e.stopPropagation(); toggleFullscreen() }}>
                {isFullscreen ? (
                  <Minimize className="w-5 h-5 text-white" />
                ) : (
                  <Maximize className="w-5 h-5 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* 章节侧边栏 */}
        {showChapters && (
          <div 
            className="absolute top-0 right-0 bottom-0 w-72 bg-black/95 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <span className="text-white font-medium">章节列表</span>
              <button onClick={() => setShowChapters(false)} className="text-white/60">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className="divide-y divide-white/10">
              {replay.chapters.map((chapter) => (
                <button
                  key={chapter.id}
                  onClick={() => handleChapterClick(chapter)}
                  className={cn(
                    "w-full p-4 text-left hover:bg-white/10 transition-colors",
                    currentChapter?.id === chapter.id && "bg-white/10"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-accent text-xs font-mono">{chapter.timeDisplay}</span>
                    <span className={cn(
                      "text-sm",
                      currentChapter?.id === chapter.id ? "text-primary" : "text-white"
                    )}>
                      {chapter.title}
                    </span>
                  </div>
                  {chapter.description && (
                    <p className="text-xs text-white/50 mt-1 ml-14">{chapter.description}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* 课件预览 */}
        {showSlides && currentSlide && (
          <div 
            className="absolute top-0 left-0 bottom-0 w-64 bg-black/95 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <span className="text-white font-medium">课件同步</span>
              <button onClick={() => setShowSlides(false)} className="text-white/60">
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
            </div>
            <div className="p-4">
              <img 
                src={currentSlide.imageUrl} 
                alt={currentSlide.title || '课件'}
                className="w-full rounded-lg"
              />
              {currentSlide.title && (
                <p className="text-white text-sm mt-2">{currentSlide.title}</p>
              )}
              <p className="text-white/50 text-xs mt-1">{currentSlide.timeDisplay}</p>
            </div>
            <div className="px-4 pb-4 space-y-2">
              {replay.slides.map((slide) => (
                <button
                  key={slide.id}
                  onClick={() => handleSeek(slide.time)}
                  className={cn(
                    "w-full rounded-lg overflow-hidden border-2 transition-colors",
                    currentSlide.id === slide.id ? "border-primary" : "border-transparent"
                  )}
                >
                  <img src={slide.imageUrl} alt="" className="w-full aspect-video object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* 回放信息 */}
      <div className="p-4 border-b border-border">
        <h1 className="font-bold text-lg text-foreground">{replay.title}</h1>
        
        <div className="flex items-center gap-4 mt-3">
          <Link href={`/expert/${replay.host.id}`} className="flex items-center gap-2">
            <Avatar className="w-10 h-10">
              <AvatarImage src={replay.host.avatar} alt={replay.host.name} />
              <AvatarFallback className="bg-primary/20 text-primary text-sm">
                {replay.host.name[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-1">
                <span className="font-medium text-sm text-foreground">{replay.host.name}</span>
                {replay.host.isVerified && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-accent/20 text-accent border-0">V</Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{replay.host.followers.toLocaleString()} 粉丝</span>
            </div>
          </Link>
          <button className="ml-auto px-4 py-1.5 border border-primary text-primary text-xs font-medium rounded-full hover:bg-primary/10 transition-colors">
            + 关注
          </button>
        </div>
        
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {replay.startTime}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            {replay.viewerCount.toLocaleString()} 观看
          </span>
          <span className="flex items-center gap-1">
            <Heart className="w-3.5 h-3.5" />
            {replay.likeCount.toLocaleString()} 点赞
          </span>
        </div>
      </div>
      
      {/* 互动回顾Tab */}
      <div className="border-b border-border">
        <div className="flex">
          {[
            { key: "chapters", label: "章节", icon: List, count: replay.chapters.length },
            { key: "discussion", label: "讨论", icon: MessageCircle, count: replay.discussions.length },
            { key: "qa", label: "问答", icon: HelpCircle, count: replay.qaList.length },
            ...(replay.products?.length ? [{ key: "products", label: "商品", icon: ShoppingBag, count: replay.products.length }] : []),
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors relative",
                activeTab === tab.key
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              <span className="text-xs">({tab.count})</span>
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>
      
      {/* Tab内容 */}
      <div className="pb-24">
        {/* 章节Tab */}
        {activeTab === "chapters" && (
          <div className="divide-y divide-border">
            {replay.chapters.map((chapter) => (
              <button
                key={chapter.id}
                onClick={() => handleChapterClick(chapter)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 hover:bg-secondary/30 transition-colors text-left",
                  currentChapter?.id === chapter.id && "bg-secondary/50"
                )}
              >
                <span className="flex-shrink-0 px-2 py-1 bg-primary/10 text-primary text-xs font-mono rounded">
                  {chapter.timeDisplay}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-medium text-sm",
                    currentChapter?.id === chapter.id ? "text-primary" : "text-foreground"
                  )}>
                    {chapter.title}
                  </p>
                  {chapter.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{chapter.description}</p>
                  )}
                </div>
                {currentChapter?.id === chapter.id && (
                  <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary">
                    当前
                  </Badge>
                )}
              </button>
            ))}
          </div>
        )}
        
        {/* 讨论Tab */}
        {activeTab === "discussion" && (
          <div className="divide-y divide-border">
            {replay.discussions.map((item) => (
              <div 
                key={item.id} 
                className="flex gap-3 p-4 hover:bg-secondary/30 cursor-pointer transition-colors"
                onClick={() => handleSeek(item.time)}
              >
                <button className="flex-shrink-0 px-2 py-1 bg-primary/10 text-primary text-xs font-mono rounded hover:bg-primary/20">
                  {item.timeDisplay}
                </button>
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src={item.userAvatar} alt={item.userName} />
                  <AvatarFallback className={cn(
                    "text-xs",
                    item.isHost ? "bg-accent/20 text-accent" : "bg-secondary text-foreground"
                  )}>
                    {item.userName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-sm font-medium",
                      item.isHost ? "text-accent" : "text-foreground"
                    )}>
                      {item.userName}
                    </span>
                    {item.isHost && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-accent/20 text-accent border-0">
                        主播
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{item.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* 问答Tab */}
        {activeTab === "qa" && (
          <div className="p-4 space-y-4">
            {replay.qaList.map((item) => (
              <Card 
                key={item.id} 
                className="p-4 cursor-pointer hover:bg-secondary/30 transition-colors"
                onClick={() => handleSeek(item.time)}
              >
                <div className="flex items-start gap-3">
                  <button className="flex-shrink-0 px-2 py-1 bg-primary/10 text-primary text-xs font-mono rounded hover:bg-primary/20">
                    {item.timeDisplay}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <HelpCircle className="w-4 h-4 text-primary" />
                      <span className="text-xs text-muted-foreground">{item.questionerName} 提问</span>
                    </div>
                    <p className="font-medium text-sm text-foreground">{item.question}</p>
                    <div className="mt-3 p-3 bg-secondary/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar className="w-5 h-5">
                          <AvatarFallback className="bg-accent/20 text-accent text-[10px]">
                            {item.answererName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-accent font-medium">{item.answererName} 回答</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.answer}</p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
        
        {/* 商品Tab */}
        {activeTab === "products" && replay.products && (
          <div className="p-4 space-y-3">
            {replay.products.map((item) => (
              <Card key={item.id} className="flex gap-3 p-3">
                <div className="w-20 h-20 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <ShoppingBag className="w-8 h-8 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground line-clamp-2">{item.name}</p>
                  <button 
                    onClick={() => handleSeek(item.mentionTime)}
                    className="text-xs text-primary mt-1 hover:underline"
                  >
                    跳转到 {item.mentionTimeDisplay}
                  </button>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-primary font-bold">{item.price}</span>
                      <span className="text-xs text-muted-foreground line-through">{item.originalPrice}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{item.sales}人购买</span>
                  </div>
                </div>
                <Link 
                  href={`/mall/product/${item.id}`}
                  className="self-end px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-full hover:bg-primary/90"
                >
                  购买
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* 底部操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border safe-area-pb">
        <div className="flex items-center gap-3 px-4 h-16">
          <button 
            onClick={() => setIsCollected(!isCollected)}
            className="flex flex-col items-center gap-0.5"
          >
            <Heart className={cn("w-5 h-5", isCollected ? "fill-primary text-primary" : "text-muted-foreground")} />
            <span className="text-[10px] text-muted-foreground">收藏</span>
          </button>
          <button className="flex flex-col items-center gap-0.5">
            <Share2 className="w-5 h-5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">分享</span>
          </button>
          
          <div className="flex-1 flex gap-2 ml-4">
            {replay.isPaid && !replay.isPurchased ? (
              <button className="flex-1 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 transition-colors">
                购买回放 {replay.price}
              </button>
            ) : replay.circle ? (
              <Link 
                href={`/circles/${replay.circle.id}`}
                className="flex-1 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 transition-colors text-center"
              >
                加入「{replay.circle.name}」
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
