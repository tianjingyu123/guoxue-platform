"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Play, Users, BookOpen, ShoppingBag, FileText, Video, Bot, Radio, 
  Heart, MessageCircle, Clock, Star, Flame, Bell, Eye, Zap, Gift,
  Bookmark, Share2, X, MoreHorizontal, TrendingUp, Award, Sparkles
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

// 长按快捷菜单
function QuickActionMenu({ 
  isOpen, 
  onClose, 
  onCollect, 
  onShare, 
  onNotInterested 
}: { 
  isOpen: boolean
  onClose: () => void
  onCollect?: () => void
  onShare?: () => void
  onNotInterested?: () => void
}) {
  if (!isOpen) return null
  
  return (
    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm rounded-lg flex items-center justify-center animate-in fade-in duration-150">
      <div className="flex items-center gap-6">
        <button 
          onClick={(e) => { e.stopPropagation(); onCollect?.(); onClose(); }}
          className="flex flex-col items-center gap-1 text-white"
        >
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Bookmark className="w-5 h-5" />
          </div>
          <span className="text-xs">收藏</span>
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onShare?.(); onClose(); }}
          className="flex flex-col items-center gap-1 text-white"
        >
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Share2 className="w-5 h-5" />
          </div>
          <span className="text-xs">分享</span>
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onNotInterested?.(); onClose(); }}
          className="flex flex-col items-center gap-1 text-white"
        >
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <X className="w-5 h-5" />
          </div>
          <span className="text-xs">不感兴趣</span>
        </button>
      </div>
    </div>
  )
}

// 倒计时组件
function CountdownBadge({ endTime, label }: { endTime: Date; label: string }) {
  const [timeLeft, setTimeLeft] = useState(() => {
    const diff = endTime.getTime() - Date.now()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}:${minutes.toString().padStart(2, '0')}`
  })
  
  return (
    <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 animate-pulse">
      <Clock className="w-3 h-3 mr-1" />
      {label} {timeLeft}
    </Badge>
  )
}

// 圈子卡片 - 增加今日新增、限时免费
export function CircleCard({ 
  data 
}: { 
  data: { 
    id?: number
    title: string
    avatar: string
    members: number
    isPaid: boolean
    price?: number
    todayJoined?: number
    isLimited?: boolean
    limitEndTime?: Date
    activeRate?: number
  } 
}) {
  const [showMenu, setShowMenu] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  
  return (
    <Link href={`/circles/${data.id || 1}`}>
      <Card 
        className={cn(
          "p-3 bg-card hover:bg-secondary/50 transition-all cursor-pointer relative overflow-hidden",
          isPressed && "scale-[0.98]"
        )}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
        onTouchStart={() => setIsPressed(true)}
        onTouchEnd={() => setIsPressed(false)}
        onContextMenu={(e) => { e.preventDefault(); setShowMenu(true); }}
      >
        <QuickActionMenu isOpen={showMenu} onClose={() => setShowMenu(false)} />
        
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12 rounded-lg">
            <AvatarImage src={data.avatar} alt={data.title} />
            <AvatarFallback className="rounded-lg bg-secondary text-foreground">{data.title[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm text-foreground truncate">{data.title}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="w-3 h-3" />
                {data.members}人
              </span>
              {data.todayJoined && data.todayJoined > 0 && (
                <span className="text-xs text-accent flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" />
                  今日+{data.todayJoined}
                </span>
              )}
              {data.isPaid ? (
                data.isLimited ? (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-destructive/10 text-destructive border-0">
                    限免
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-0">
                    ¥{data.price}
                  </Badge>
                )
              ) : (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-accent/10 text-accent border-0">
                  免费
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        {/* 限时角标 */}
        {data.isLimited && data.limitEndTime && (
          <div className="absolute top-0 right-0">
            <div className="bg-destructive text-destructive-foreground text-[10px] px-2 py-0.5 rounded-bl-lg">
              限时免费
            </div>
          </div>
        )}
      </Card>
    </Link>
  )
}

// 课程卡片 - 增加学习人数、好评率、试看标签
export function CourseCard({ 
  data 
}: { 
  data: { 
    id?: number
    title: string
    cover: string
    author: string
    price: number
    originalPrice?: number
    isFree: boolean
    type: 'video' | 'audio' | 'article'
    learners?: number
    rating?: number
    hasPreview?: boolean
    isHot?: boolean
    discount?: number
    discountEndTime?: Date
  } 
}) {
  const [showMenu, setShowMenu] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  const typeIcons = { video: Play, audio: Radio, article: FileText }
  const TypeIcon = typeIcons[data.type]
  
  return (
    <Link href={`/course/${data.id || 1}`}>
      <Card 
        className={cn(
          "overflow-hidden bg-card hover:bg-secondary/50 transition-all cursor-pointer relative",
          isPressed && "scale-[0.98]"
        )}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => { setIsPressed(false); setShowMenu(false); }}
        onTouchStart={() => setIsPressed(true)}
        onTouchEnd={() => setIsPressed(false)}
        onContextMenu={(e) => { e.preventDefault(); setShowMenu(true); }}
      >
        <QuickActionMenu isOpen={showMenu} onClose={() => setShowMenu(false)} />
        
        <div className="aspect-[4/3] relative bg-secondary">
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-2 left-2 right-2">
            <h3 className="font-medium text-sm text-white line-clamp-2">{data.title}</h3>
          </div>
          
          {/* 顶部标签区 */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
            <div className="flex items-center gap-1">
              {data.isHot && (
                <Badge className="text-[10px] bg-destructive text-destructive-foreground border-0 flex items-center gap-0.5 px-1.5 py-0">
                  <Flame className="w-3 h-3" />
                  热门
                </Badge>
              )}
              {data.hasPreview && (
                <Badge className="text-[10px] bg-accent text-accent-foreground border-0 px-1.5 py-0">
                  试看
                </Badge>
              )}
            </div>
            <Badge variant="secondary" className="text-[10px] bg-black/50 text-white border-0 flex items-center gap-1">
              <TypeIcon className="w-3 h-3" />
              {data.type === 'video' ? '视频' : data.type === 'audio' ? '音频' : '图文'}
            </Badge>
          </div>
          
          {/* 折扣倒计时角标 */}
          {data.discount && data.discountEndTime && (
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] px-2 py-1 rounded-bl-lg">
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {data.discount}折
              </div>
            </div>
          )}
        </div>
        
        <div className="p-2.5">
          {/* 学习数据 */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
            {data.learners && (
              <span className="flex items-center gap-0.5">
                <Users className="w-3 h-3" />
                {data.learners > 1000 ? `${(data.learners/1000).toFixed(1)}k` : data.learners}人已学
              </span>
            )}
            {data.rating && (
              <span className="flex items-center gap-0.5 text-accent">
                <Star className="w-3 h-3 fill-accent" />
                {data.rating}%好评
              </span>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{data.author}</span>
            <div className="flex items-center gap-1.5">
              {data.originalPrice && data.originalPrice > data.price && (
                <span className="text-xs text-muted-foreground line-through">¥{data.originalPrice}</span>
              )}
              <span className={cn("text-sm font-medium", data.isFree ? "text-accent" : "text-primary")}>
                {data.isFree ? '会员免费' : `¥${data.price}`}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}

// 商品卡片 - 增加销量、库存、会员价、满减、包邮标签
export function ProductCard({ 
  data 
}: { 
  data: { 
    id?: number
    title: string
    cover: string
    price: number
    originalPrice: number
    vipPrice?: number
    sales?: number
    stock?: number
    isFreeShipping?: boolean
    discount?: string
    isHot?: boolean
  } 
}) {
  const [showMenu, setShowMenu] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  const isLowStock = data.stock && data.stock < 20
  
  return (
    <Link href={`/mall/product/${data.id || 1}`}>
      <Card 
        className={cn(
          "overflow-hidden bg-card hover:bg-secondary/50 transition-all cursor-pointer relative",
          isPressed && "scale-[0.98]"
        )}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => { setIsPressed(false); setShowMenu(false); }}
        onTouchStart={() => setIsPressed(true)}
        onTouchEnd={() => setIsPressed(false)}
        onContextMenu={(e) => { e.preventDefault(); setShowMenu(true); }}
      >
        <QuickActionMenu isOpen={showMenu} onClose={() => setShowMenu(false)} />
        
        <div className="aspect-square relative bg-secondary">
          <ShoppingBag className="w-8 h-8 text-muted-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          
          {/* 角标 */}
          {data.isHot && (
            <div className="absolute top-0 left-0 bg-destructive text-destructive-foreground text-[10px] px-2 py-0.5 rounded-br-lg flex items-center gap-0.5">
              <Flame className="w-3 h-3" />
              热卖
            </div>
          )}
          
          {/* 库存预警 */}
          {isLowStock && (
            <div className="absolute bottom-2 left-2 right-2">
              <div className="bg-destructive/90 text-destructive-foreground text-[10px] px-2 py-1 rounded text-center">
                仅剩{data.stock}件
              </div>
            </div>
          )}
        </div>
        
        <div className="p-2.5">
          <h3 className="font-medium text-sm text-foreground line-clamp-2 min-h-[2.5rem]">{data.title}</h3>
          
          {/* 标签区 */}
          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
            {data.isFreeShipping && (
              <Badge variant="outline" className="text-[10px] px-1 py-0 border-accent text-accent">
                包邮
              </Badge>
            )}
            {data.discount && (
              <Badge variant="outline" className="text-[10px] px-1 py-0 border-primary text-primary">
                {data.discount}
              </Badge>
            )}
            {data.vipPrice && (
              <Badge className="text-[10px] px-1 py-0 bg-accent/10 text-accent border-0">
                会员¥{data.vipPrice}
              </Badge>
            )}
          </div>
          
          {/* 价格和销量 */}
          <div className="flex items-center justify-between mt-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-primary font-semibold">¥{data.price}</span>
              <span className="text-xs text-muted-foreground line-through">¥{data.originalPrice}</span>
            </div>
            {data.sales && (
              <span className="text-xs text-muted-foreground">已售{data.sales > 1000 ? `${(data.sales/1000).toFixed(1)}k` : data.sales}</span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  )
}

// 文章卡片 - 增加阅读时长预估
export function ArticleCard({ 
  data 
}: { 
  data: { 
    id?: number
    title: string
    excerpt: string
    author: string
    avatar: string
    circleName: string
    readTime?: number
    likes?: number
    comments?: number
    isTop?: boolean
  } 
}) {
  const [showMenu, setShowMenu] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  
  return (
    <Link href={`/articles/${data.id || 1}`}>
      <Card 
        className={cn(
          "p-3 bg-card hover:bg-secondary/50 transition-all cursor-pointer relative",
          isPressed && "scale-[0.98]"
        )}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => { setIsPressed(false); setShowMenu(false); }}
        onTouchStart={() => setIsPressed(true)}
        onTouchEnd={() => setIsPressed(false)}
        onContextMenu={(e) => { e.preventDefault(); setShowMenu(true); }}
      >
        <QuickActionMenu isOpen={showMenu} onClose={() => setShowMenu(false)} />
        
        <div className="flex items-start gap-2">
          {data.isTop && (
            <Badge className="text-[10px] bg-primary text-primary-foreground border-0 px-1.5 py-0 shrink-0">
              置顶
            </Badge>
          )}
          <h3 className="font-medium text-sm text-foreground line-clamp-2 flex-1">{data.title}</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{data.excerpt}</p>
        
        <div className="flex items-center justify-between mt-2.5">
          <div className="flex items-center gap-2">
            <Avatar className="w-5 h-5">
              <AvatarImage src={data.avatar} alt={data.author} />
              <AvatarFallback className="text-[10px]">{data.author[0]}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">{data.author}</span>
            {data.readTime && (
              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                <Clock className="w-3 h-3" />
                {data.readTime}分钟
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {data.likes !== undefined && (
              <span className="flex items-center gap-0.5">
                <Heart className="w-3 h-3" />
                {data.likes}
              </span>
            )}
            {data.comments !== undefined && (
              <span className="flex items-center gap-0.5">
                <MessageCircle className="w-3 h-3" />
                {data.comments}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  )
}

// 直播卡片 - 增加呼吸动效、预约人数、预约按钮
export function LiveCard({ 
  data 
}: { 
  data: { 
    id?: number
    title: string
    cover: string
    host: string
    hostAvatar?: string
    viewers: number
    isLive: boolean
    scheduledTime?: string
    reserveCount?: number
    isReserved?: boolean
  } 
}) {
  const [showMenu, setShowMenu] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  const [reserved, setReserved] = useState(data.isReserved || false)
  const [viewerCount, setViewerCount] = useState(data.viewers)
  
  // 模拟观看人数跳动
  useState(() => {
    if (data.isLive) {
      const interval = setInterval(() => {
        setViewerCount(prev => prev + Math.floor(Math.random() * 3) - 1)
      }, 3000)
      return () => clearInterval(interval)
    }
  })
  
  return (
    <Link href={`/live/${data.id || 1}`}>
      <Card 
        className={cn(
          "overflow-hidden bg-card hover:bg-secondary/50 transition-all cursor-pointer relative",
          isPressed && "scale-[0.98]"
        )}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => { setIsPressed(false); setShowMenu(false); }}
        onTouchStart={() => setIsPressed(true)}
        onTouchEnd={() => setIsPressed(false)}
        onContextMenu={(e) => { e.preventDefault(); setShowMenu(true); }}
      >
        <QuickActionMenu isOpen={showMenu} onClose={() => setShowMenu(false)} />
        
        <div className="aspect-video relative bg-secondary">
          <Radio className="w-8 h-8 text-muted-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          
          {/* 直播状态 */}
          {data.isLive ? (
            <div className="absolute top-2 left-2 flex items-center gap-1.5">
              <div className="live-indicator flex items-center gap-1 bg-destructive text-destructive-foreground text-[10px] px-2 py-0.5 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                直播中
              </div>
            </div>
          ) : data.scheduledTime && (
            <div className="absolute top-2 left-2">
              <Badge className="text-[10px] bg-accent text-accent-foreground border-0 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {data.scheduledTime}
              </Badge>
            </div>
          )}
          
          {/* 观看人数 */}
          <div className="absolute bottom-2 right-2 bg-black/60 rounded px-1.5 py-0.5">
            <span className="text-[10px] text-white flex items-center gap-1">
              <Eye className="w-3 h-3" />
              <span className={data.isLive ? "tabular-nums" : ""}>{viewerCount}</span>
            </span>
          </div>
          
          {/* 预约人数（未开播时） */}
          {!data.isLive && data.reserveCount && (
            <div className="absolute bottom-2 left-2 bg-black/60 rounded px-1.5 py-0.5">
              <span className="text-[10px] text-white flex items-center gap-1">
                <Bell className="w-3 h-3" />
                {data.reserveCount}人预约
              </span>
            </div>
          )}
        </div>
        
        <div className="p-2.5">
          <h3 className="font-medium text-sm text-foreground line-clamp-1">{data.title}</h3>
          <div className="flex items-center justify-between mt-1.5">
            <div className="flex items-center gap-1.5">
              {data.hostAvatar && (
                <Avatar className="w-4 h-4">
                  <AvatarImage src={data.hostAvatar} />
                  <AvatarFallback className="text-[8px]">{data.host[0]}</AvatarFallback>
                </Avatar>
              )}
              <span className="text-xs text-muted-foreground">{data.host}</span>
            </div>
            
            {/* 预约按钮（未开播时） */}
            {!data.isLive && (
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setReserved(!reserved)
                }}
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full transition-colors flex items-center gap-1",
                  reserved 
                    ? "bg-secondary text-muted-foreground" 
                    : "bg-primary text-primary-foreground"
                )}
              >
                <Bell className="w-3 h-3" />
                {reserved ? "已预约" : "预约"}
              </button>
            )}
          </div>
        </div>
      </Card>
    </Link>
  )
}

// 短视频卡片
export function ShortVideoCard({ 
  data 
}: { 
  data: { 
    id?: number
    title: string
    cover: string
    author: string
    authorAvatar?: string
    likes: number
    duration?: string
  } 
}) {
  const [showMenu, setShowMenu] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  
  return (
    <Link href={`/video/${data.id || 1}`}>
      <Card 
        className={cn(
          "overflow-hidden bg-card hover:bg-secondary/50 transition-all cursor-pointer relative",
          isPressed && "scale-[0.98]"
        )}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => { setIsPressed(false); setShowMenu(false); }}
        onTouchStart={() => setIsPressed(true)}
        onTouchEnd={() => setIsPressed(false)}
        onContextMenu={(e) => { e.preventDefault(); setShowMenu(true); }}
      >
        <QuickActionMenu isOpen={showMenu} onClose={() => setShowMenu(false)} />
        
        <div className="aspect-[3/4] relative bg-secondary">
          <Video className="w-8 h-8 text-muted-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="absolute bottom-2 left-2 right-2">
            <p className="text-xs text-white line-clamp-2">{data.title}</p>
            <div className="flex items-center gap-1.5 mt-1">
              {data.authorAvatar && (
                <Avatar className="w-4 h-4">
                  <AvatarImage src={data.authorAvatar} />
                  <AvatarFallback className="text-[8px]">{data.author[0]}</AvatarFallback>
                </Avatar>
              )}
              <span className="text-[10px] text-white/80">@{data.author}</span>
            </div>
          </div>
          
          {/* 播放图标 */}
          <div className="absolute top-2 left-2">
            <Play className="w-6 h-6 text-white drop-shadow-lg" />
          </div>
          
          {/* 时长 */}
          {data.duration && (
            <div className="absolute top-2 right-2 bg-black/60 rounded px-1.5 py-0.5">
              <span className="text-[10px] text-white">{data.duration}</span>
            </div>
          )}
          
          {/* 点赞数 */}
          <div className="absolute bottom-2 right-2 flex items-center gap-1 text-white">
            <Heart className="w-4 h-4" />
            <span className="text-xs">{data.likes > 1000 ? `${(data.likes/1000).toFixed(1)}k` : data.likes}</span>
          </div>
        </div>
      </Card>
    </Link>
  )
}

// 电子书卡片
export function EbookCard({ 
  data 
}: { 
  data: { 
    id?: number
    title: string
    author: string
    cover: string
    readCount?: number
    isFree?: boolean
  } 
}) {
  const [showMenu, setShowMenu] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  
  return (
    <Link href={`/reader/${data.id || 1}`}>
      <Card 
        className={cn(
          "overflow-hidden bg-card hover:bg-secondary/50 transition-all cursor-pointer relative",
          isPressed && "scale-[0.98]"
        )}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => { setIsPressed(false); setShowMenu(false); }}
        onTouchStart={() => setIsPressed(true)}
        onTouchEnd={() => setIsPressed(false)}
        onContextMenu={(e) => { e.preventDefault(); setShowMenu(true); }}
      >
        <QuickActionMenu isOpen={showMenu} onClose={() => setShowMenu(false)} />
        
        <div className="aspect-[3/4] relative bg-secondary flex items-center justify-center">
          <BookOpen className="w-10 h-10 text-accent/60" />
          <div className="absolute inset-0 border-l-4 border-accent/30" />
          
          {data.isFree && (
            <div className="absolute top-0 right-0 bg-accent text-accent-foreground text-[10px] px-2 py-0.5 rounded-bl-lg">
              免费
            </div>
          )}
        </div>
        <div className="p-2.5">
          <h3 className="font-medium text-sm text-foreground line-clamp-1">{data.title}</h3>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-xs text-muted-foreground">{data.author}</span>
            {data.readCount && (
              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                <Eye className="w-3 h-3" />
                {data.readCount > 1000 ? `${(data.readCount/1000).toFixed(1)}k` : data.readCount}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  )
}

// 智能体卡片 - 增加免费次数、对话量
export function AgentCard({ 
  data 
}: { 
  data: { 
    id?: number
    name: string
    description: string
    avatar: string
    isFree: boolean
    freeQuota?: number
    totalChats?: number
    rating?: number
  } 
}) {
  const [showMenu, setShowMenu] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  
  return (
    <Link href={`/agent/${data.id || 1}`}>
      <Card 
        className={cn(
          "p-3 bg-card hover:bg-secondary/50 transition-all cursor-pointer relative",
          isPressed && "scale-[0.98]"
        )}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => { setIsPressed(false); setShowMenu(false); }}
        onTouchStart={() => setIsPressed(true)}
        onTouchEnd={() => setIsPressed(false)}
        onContextMenu={(e) => { e.preventDefault(); setShowMenu(true); }}
      >
        <QuickActionMenu isOpen={showMenu} onClose={() => setShowMenu(false)} />
        
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center relative">
            <Bot className="w-6 h-6 text-primary" />
            {data.rating && data.rating >= 4.8 && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full flex items-center justify-center">
                <Award className="w-3 h-3 text-accent-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-sm text-foreground">{data.name}</h3>
              {data.isFree ? (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 border-0 bg-accent/10 text-accent">
                  {data.freeQuota ? `${data.freeQuota}次免费` : "免费"}
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 border-0 bg-primary/10 text-primary">
                  付费
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{data.description}</p>
            {data.totalChats && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <MessageCircle className="w-3 h-3" />
                  {data.totalChats > 10000 ? `${(data.totalChats/10000).toFixed(1)}万` : data.totalChats}次对话
                </span>
                {data.rating && (
                  <span className="text-[10px] text-accent flex items-center gap-0.5">
                    <Star className="w-3 h-3 fill-accent" />
                    {data.rating}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  )
}

// 排盘工具引导卡片（跨双列）- 太极八卦风格
export function PaipanGuideCard() {
  const [isPressed, setIsPressed] = useState(false)
  
  return (
    <Card 
      className={cn(
        "col-span-2 p-5 bg-gradient-to-br from-primary/15 via-background to-accent/10 border-primary/30 cursor-pointer hover:border-primary/50 transition-all overflow-hidden relative",
        isPressed && "scale-[0.99]"
      )}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
    >
      {/* 背景装饰 */}
      <div className="absolute -right-8 -top-8 w-32 h-32 opacity-5">
        <svg viewBox="0 0 100 100" className="w-full h-full fill-current text-foreground">
          <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="2"/>
          <path d="M50 2 A48 48 0 0 1 50 98 A24 24 0 0 1 50 50 A24 24 0 0 0 50 2" />
          <circle cx="50" cy="26" r="6" fill="currentColor"/>
          <circle cx="50" cy="74" r="6" fill="none" stroke="currentColor" strokeWidth="2"/>
        </svg>
      </div>
      
      <div className="flex flex-col gap-4 relative z-10">
        {/* 主内容区 */}
        <div className="flex items-center gap-4">
          {/* 太极图标 */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/30 relative">
            <svg viewBox="0 0 100 100" className="w-10 h-10">
              <circle cx="50" cy="50" r="48" fill="none" stroke="white" strokeWidth="2" opacity="0.3"/>
              <path d="M50 2 A48 48 0 0 1 50 98 A24 24 0 0 1 50 50 A24 24 0 0 0 50 2" fill="white"/>
              <circle cx="50" cy="26" r="6" fill="white" opacity="0.3"/>
              <circle cx="50" cy="74" r="6" fill="white"/>
            </svg>
          </div>
          
          <div className="flex-1">
            <h3 className="font-bold text-lg text-foreground">八字排盘</h3>
            <p className="text-sm text-muted-foreground mt-1">��费测算你的命盘</p>
            <button className="mt-2 px-4 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 transition-colors shadow-md shadow-primary/20 active:scale-95">
              立即排盘
            </button>
          </div>
        </div>
        
        {/* 快捷入口 */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          {["八字", "紫微", "风水", "姓名"].map((item, index) => (
            <button 
              key={item}
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-secondary/50 transition-colors active:scale-95"
            >
              <span className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                <span className="text-sm text-foreground">{["命", "紫", "宅", "名"][index]}</span>
              </span>
              <span className="text-xs text-muted-foreground">{item}</span>
            </button>
          ))}
        </div>
      </div>
    </Card>
  )
}
