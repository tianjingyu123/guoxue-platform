"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Headphones } from "lucide-react"
import Link from "next/link"

export interface BookCardProps {
  id: string | number
  title: string
  author: string
  dynasty: string
  description?: string
  reads?: number
  rating?: number
  hasAI?: boolean
  hasAudio?: boolean
  hasTranslation?: boolean
  isFree?: boolean
  isFinePrint?: boolean
  progress?: number
  coverColor?: "cream" | "brown" | "blue" | "green" | "gray" | "red"
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}

/**
 * 古籍封面卡片 - 高度还原真实线装古书
 * 
 * 设计灵感来源：
 * - 清代内府刻本的装帧风格
 * - 四库全书的函套设计
 * - 明清善本的纸张质感
 * 
 * 多端适配策略：
 * - 移动端：紧凑尺寸，触控友好
 * - 平板：中等尺寸，双列/三列布局
 * - 桌面：大尺寸，可显示更多信息
 */
export function BookCard({
  id,
  title,
  author,
  dynasty,
  description,
  reads,
  hasAI,
  hasAudio,
  hasTranslation,
  isFree,
  isFinePrint,
  progress,
  coverColor = "cream",
  size = "md",
  className,
}: BookCardProps) {
  // 响应式尺寸配置 - 移动优先，逐级放大
  const sizeConfig = {
    sm: { 
      wrapper: "w-[68px] sm:w-[72px]", 
      aspect: "aspect-[3/4.5]",
      spineWidth: "w-2.5 sm:w-3",
      titleSize: "text-xs sm:text-sm",
      authorSize: "text-[7px] sm:text-[8px]",
      dynastySize: "text-[6px] sm:text-[7px]",
      stitchCount: 6,
    },
    md: { 
      wrapper: "w-[80px] sm:w-[88px] md:w-[96px]", 
      aspect: "aspect-[3/4.5]",
      spineWidth: "w-3 sm:w-3.5",
      titleSize: "text-sm sm:text-base md:text-lg",
      authorSize: "text-[8px] sm:text-[9px]",
      dynastySize: "text-[7px] sm:text-[8px]",
      stitchCount: 7,
    },
    lg: { 
      wrapper: "w-[96px] sm:w-[108px] md:w-[120px] lg:w-[130px]", 
      aspect: "aspect-[3/4.5]",
      spineWidth: "w-3.5 sm:w-4",
      titleSize: "text-base sm:text-lg md:text-xl",
      authorSize: "text-[9px] sm:text-[10px]",
      dynastySize: "text-[8px] sm:text-[9px]",
      stitchCount: 8,
    },
    xl: { 
      wrapper: "w-[120px] sm:w-[140px] md:w-[160px] lg:w-[180px]", 
      aspect: "aspect-[3/4.5]",
      spineWidth: "w-4 sm:w-5",
      titleSize: "text-lg sm:text-xl md:text-2xl",
      authorSize: "text-[10px] sm:text-[11px] md:text-xs",
      dynastySize: "text-[9px] sm:text-[10px]",
      stitchCount: 10,
    },
  }

  // 真实古籍封面配色 - 取自实物古籍颜色
  const colorConfig = {
    cream: {
      bg: "bg-gradient-to-br from-[#f7f3e8] via-[#f2ead8] to-[#ebe3d0]",
      spine: "bg-gradient-to-r from-[#c4b08a] via-[#d4c4a8] to-[#c8b898]",
      text: "text-[#3d3225]",
      border: "border-[#d8cbb0]",
      shadow: "shadow-[3px_4px_12px_rgba(139,119,80,0.25)]",
      hoverShadow: "group-hover:shadow-[4px_6px_16px_rgba(139,119,80,0.35)]",
    },
    brown: {
      bg: "bg-gradient-to-br from-[#e8dcc8] via-[#dfd0b8] to-[#d5c4a8]",
      spine: "bg-gradient-to-r from-[#8b7355] via-[#a08060] to-[#907050]",
      text: "text-[#2d2418]",
      border: "border-[#c4a878]",
      shadow: "shadow-[3px_4px_12px_rgba(100,80,50,0.25)]",
      hoverShadow: "group-hover:shadow-[4px_6px_16px_rgba(100,80,50,0.35)]",
    },
    blue: {
      bg: "bg-gradient-to-br from-[#dce8f0] via-[#d0e0ec] to-[#c8d8e8]",
      spine: "bg-gradient-to-r from-[#6080a0] via-[#7090b0] to-[#6888a8]",
      text: "text-[#1e3348]",
      border: "border-[#a0b8d0]",
      shadow: "shadow-[3px_4px_12px_rgba(60,90,130,0.2)]",
      hoverShadow: "group-hover:shadow-[4px_6px_16px_rgba(60,90,130,0.3)]",
    },
    green: {
      bg: "bg-gradient-to-br from-[#e0ece0] via-[#d4e4d4] to-[#c8dcc8]",
      spine: "bg-gradient-to-r from-[#5a7a5a] via-[#6a8a6a] to-[#608060]",
      text: "text-[#1e2e1e]",
      border: "border-[#a0c0a0]",
      shadow: "shadow-[3px_4px_12px_rgba(60,100,60,0.2)]",
      hoverShadow: "group-hover:shadow-[4px_6px_16px_rgba(60,100,60,0.3)]",
    },
    gray: {
      bg: "bg-gradient-to-br from-[#ececea] via-[#e4e4e0] to-[#dcdcd8]",
      spine: "bg-gradient-to-r from-[#888884] via-[#989894] to-[#909088]",
      text: "text-[#2a2a28]",
      border: "border-[#c0c0b8]",
      shadow: "shadow-[3px_4px_12px_rgba(80,80,75,0.2)]",
      hoverShadow: "group-hover:shadow-[4px_6px_16px_rgba(80,80,75,0.3)]",
    },
    red: {
      bg: "bg-gradient-to-br from-[#f0e0dc] via-[#e8d4d0] to-[#e0c8c4]",
      spine: "bg-gradient-to-r from-[#8b4040] via-[#a05050] to-[#904848]",
      text: "text-[#3d1818]",
      border: "border-[#d0a0a0]",
      shadow: "shadow-[3px_4px_12px_rgba(120,50,50,0.2)]",
      hoverShadow: "group-hover:shadow-[4px_6px_16px_rgba(120,50,50,0.3)]",
    },
  }

  const colors = colorConfig[coverColor]
  const sizes = sizeConfig[size]

  // 书名竖排处理 - 根据字数自动调整
  const titleChars = title.split("")
  const maxChars = size === "sm" ? 5 : size === "md" ? 6 : size === "lg" ? 7 : 8
  const displayChars = titleChars.slice(0, maxChars)

  return (
    <Link href={`/classics/${id}`} className={cn("group block touch-manipulation", className)}>
      <div className={cn("flex flex-col", sizes.wrapper)}>
        {/* 古籍封面 - 高仿真线装书设计 */}
        <div className={cn(
          sizes.aspect,
          "rounded-[2px] sm:rounded-[3px] overflow-hidden relative",
          colors.bg, colors.border, colors.shadow, colors.hoverShadow,
          "border group-hover:-translate-y-1 transition-all duration-300 ease-out",
          "active:scale-[0.98] sm:active:scale-100" // 移动端触摸反馈
        )}>
          {/* 纸张纹理 - 模拟宣纸/竹纸的自然纤维 */}
          <div 
            className="absolute inset-0 opacity-[0.15] pointer-events-none mix-blend-multiply"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paper'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.04' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23paper)'/%3E%3C/svg%3E")`,
            }}
          />
          
          {/* 纸张老化效果 - 边缘暗角 */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-transparent via-transparent to-black/[0.06]" />
          
          {/* 书脊 - 线装装订效果 */}
          <div className={cn(
            "absolute left-0 top-0 bottom-0",
            sizes.spineWidth,
            colors.spine
          )}>
            {/* 装订孔与线迹 */}
            <div className="absolute inset-y-3 sm:inset-y-4 left-1/2 -translate-x-1/2 flex flex-col justify-between items-center">
              {[...Array(sizes.stitchCount)].map((_, i) => (
                <div key={i} className="flex flex-col items-center">
                  {/* 装订孔 */}
                  <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-[#3d3020]/30 shadow-inner" />
                  {/* 装订线 */}
                  {i < sizes.stitchCount - 1 && (
                    <div className="w-px h-2 sm:h-3 bg-[#4a3828]/20" />
                  )}
                </div>
              ))}
            </div>
            
            {/* 书脊高光 */}
            <div className="absolute right-0 top-0 bottom-0 w-px bg-white/25" />
            {/* 书脊阴影 */}
            <div className="absolute left-0 top-0 bottom-0 w-px bg-black/10" />
          </div>
          
          {/* 主内容区 */}
          <div className={cn("absolute inset-0 flex flex-col", sizes.spineWidth.replace("w-", "left-"))}>
            {/* 顶部朝代标识 - 仿印章风格 */}
            <div className="pt-2 sm:pt-3 px-1 sm:px-2 flex justify-center">
              <span className={cn(
                sizes.dynastySize,
                "px-1 sm:px-1.5 py-0.5 rounded-[2px]",
                "bg-primary/10 text-primary/80 font-medium",
                "border border-primary/20"
              )}>
                {dynasty}
              </span>
            </div>
            
            {/* 书名 - 竖排书法风格 */}
            <div className="flex-1 flex items-center justify-center px-0.5 sm:px-1 py-1 sm:py-2">
              <div className="writing-vertical-rl flex flex-col items-center">
                {displayChars.map((char, i) => (
                  <span 
                    key={i}
                    className={cn(
                      "font-serif font-bold leading-[1.3] tracking-[0.05em]",
                      sizes.titleSize, colors.text
                    )}
                  >
                    {char}
                  </span>
                ))}
                {titleChars.length > maxChars && (
                  <span className={cn(sizes.titleSize, colors.text, "opacity-50")}>…</span>
                )}
              </div>
            </div>
            
            {/* 底部作者署名 */}
            <div className="pb-2 sm:pb-3 px-1 flex justify-center">
              <span className={cn(
                sizes.authorSize, colors.text, 
                "opacity-60 truncate max-w-full text-center leading-tight"
              )}>
                {author}
              </span>
            </div>
          </div>
          
          {/* 右上角功能标识 */}
          <div className="absolute top-1 sm:top-1.5 right-1 sm:right-1.5 flex flex-col gap-0.5 sm:gap-1">
            {hasAI && (
              <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                <Sparkles className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white" />
              </span>
            )}
            {hasAudio && (
              <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm">
                <Headphones className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white" />
              </span>
            )}
          </div>
          
          {/* 阅读进度条 */}
          {typeof progress === "number" && progress > 0 && (
            <div className={cn("absolute bottom-0 right-0 h-0.5 bg-black/5", sizes.spineWidth.replace("w-", "left-"))}>
              <div 
                className="h-full bg-primary/80 transition-all"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          )}
        </div>
        
        {/* 封面下方信息 - 仅在需要时显示 */}
        <div className="mt-1.5 sm:mt-2 space-y-0.5 sm:space-y-1">
          <p className="text-[11px] sm:text-xs font-medium truncate text-center text-foreground leading-tight">
            {title}
          </p>
          
          {/* 标签组 */}
          <div className="flex items-center justify-center gap-0.5 sm:gap-1 flex-wrap">
            {hasTranslation && (
              <Badge variant="outline" className="text-[8px] sm:text-[9px] px-1 py-0 h-3 sm:h-3.5 border-amber-400/60 text-amber-600 bg-amber-50/80">
                译文
              </Badge>
            )}
            {isFinePrint && (
              <Badge variant="outline" className="text-[8px] sm:text-[9px] px-1 py-0 h-3 sm:h-3.5 border-emerald-400/60 text-emerald-600 bg-emerald-50/80">
                精校
              </Badge>
            )}
            {isFree && (
              <Badge className="text-[8px] sm:text-[9px] px-1 py-0 h-3 sm:h-3.5 bg-green-500 text-white border-0">
                免费
              </Badge>
            )}
          </div>
          
          {/* 阅读数/进度 */}
          {reads && !progress && (
            <p className="text-[9px] sm:text-[10px] text-muted-foreground text-center">
              {reads >= 10000 ? `${(reads / 10000).toFixed(1)}万人读` : `${reads}人读`}
            </p>
          )}
          {typeof progress === "number" && progress > 0 && (
            <p className="text-[9px] sm:text-[10px] text-primary text-center font-medium">
              已读 {progress}%
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}

/**
 * 横向古籍卡片 - 列表视图使用
 * 多端适配：移动端紧凑，平板/桌面宽松
 */
export function BookCardHorizontal({
  id,
  title,
  author,
  dynasty,
  description,
  reads,
  rating,
  hasAI,
  hasAudio,
  hasTranslation,
  isFree,
  isFinePrint,
  progress,
  coverColor = "cream",
  className,
}: BookCardProps) {
  const colorConfig = {
    cream: { bg: "bg-gradient-to-br from-[#f7f3e8] to-[#ebe3d0]", spine: "bg-[#d4c4a8]", text: "text-[#3d3225]" },
    brown: { bg: "bg-gradient-to-br from-[#e8dcc8] to-[#d5c4a8]", spine: "bg-[#a08060]", text: "text-[#2d2418]" },
    blue: { bg: "bg-gradient-to-br from-[#dce8f0] to-[#c8d8e8]", spine: "bg-[#7090b0]", text: "text-[#1e3348]" },
    green: { bg: "bg-gradient-to-br from-[#e0ece0] to-[#c8dcc8]", spine: "bg-[#6a8a6a]", text: "text-[#1e2e1e]" },
    gray: { bg: "bg-gradient-to-br from-[#ececea] to-[#dcdcd8]", spine: "bg-[#989894]", text: "text-[#2a2a28]" },
    red: { bg: "bg-gradient-to-br from-[#f0e0dc] to-[#e0c8c4]", spine: "bg-[#a05050]", text: "text-[#3d1818]" },
  }
  const colors = colorConfig[coverColor]
  const displayTitle = title.length > 4 ? title.slice(0, 4) : title

  return (
    <Link href={`/classics/${id}`} className={cn("group block touch-manipulation", className)}>
      <div className={cn(
        "flex gap-3 sm:gap-4 p-3 sm:p-4",
        "bg-card rounded-xl sm:rounded-2xl",
        "border border-border/40 hover:border-border/70",
        "shadow-sm hover:shadow-md",
        "transition-all duration-200",
        "active:scale-[0.99] sm:active:scale-100"
      )}>
        {/* 小封面 - 保持线装书样式 */}
        <div className={cn(
          "w-12 h-16 sm:w-14 sm:h-[75px] md:w-16 md:h-[85px]",
          "rounded-[2px] overflow-hidden relative flex-shrink-0",
          "shadow-[2px_3px_8px_rgba(100,80,50,0.15)]",
          colors.bg, "border border-[#d0c0a0]/50"
        )}>
          {/* 纸张纹理 */}
          <div 
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.05' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            }}
          />
          
          {/* 书脊 */}
          <div className={cn("absolute left-0 top-0 bottom-0 w-2 sm:w-2.5", colors.spine)}>
            <div className="absolute inset-y-2 left-1/2 -translate-x-1/2 flex flex-col justify-between">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full bg-[#3d3020]/25" />
              ))}
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-px bg-white/20" />
          </div>
          
          {/* 竖排书名 */}
          <div className="absolute inset-0 left-2 sm:left-2.5 flex items-center justify-center p-0.5">
            <div className="writing-vertical-rl">
              {displayTitle.split("").map((char, i) => (
                <span key={i} className={cn("text-[9px] sm:text-[10px] font-serif font-bold", colors.text)}>
                  {char}
                </span>
              ))}
            </div>
          </div>
          
          {/* AI标识 */}
          {hasAI && (
            <span className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-purple-500 flex items-center justify-center">
              <Sparkles className="w-1.5 h-1.5 text-white" />
            </span>
          )}
        </div>
        
        {/* 信息区 */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div>
            <div className="flex items-start gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
              <h3 className="font-medium text-sm sm:text-base leading-snug truncate">{title}</h3>
              <div className="flex gap-0.5 sm:gap-1 flex-shrink-0 flex-wrap">
                {hasTranslation && (
                  <Badge className="text-[8px] sm:text-[9px] px-1 py-0 h-3.5 sm:h-4 bg-amber-100 text-amber-700 border-0">
                    译文
                  </Badge>
                )}
                {hasAudio && (
                  <Badge className="text-[8px] sm:text-[9px] px-1 py-0 h-3.5 sm:h-4 bg-orange-100 text-orange-700 border-0">
                    听书
                  </Badge>
                )}
                {isFinePrint && (
                  <Badge className="text-[8px] sm:text-[9px] px-1 py-0 h-3.5 sm:h-4 bg-emerald-100 text-emerald-700 border-0">
                    精校
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground">[{dynasty}] {author}</p>
            {description && (
              <p className="text-[11px] sm:text-xs text-muted-foreground/80 line-clamp-2 mt-1 leading-relaxed hidden sm:block">
                {description}
              </p>
            )}
          </div>
          
          {/* 底部统计 */}
          <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] text-muted-foreground mt-1 sm:mt-2">
            {rating && (
              <span className="flex items-center gap-0.5">
                <span className="text-amber-500">★</span>{rating.toFixed(1)}
              </span>
            )}
            {reads && (
              <span>{reads >= 10000 ? `${(reads / 10000).toFixed(1)}万人读` : `${reads}人读`}</span>
            )}
            {typeof progress === "number" && progress > 0 && (
              <span className="text-primary font-medium">已读 {progress}%</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

/**
 * 排行榜书籍卡片 - 紧凑双列布局
 */
export function BookCardRank({
  id,
  title,
  author,
  dynasty,
  description,
  coverColor = "cream",
  rank,
  className,
}: BookCardProps & { rank: number }) {
  const colorConfig = {
    cream: { bg: "bg-gradient-to-br from-[#f7f3e8] to-[#ebe3d0]", spine: "bg-[#d4c4a8]", text: "text-[#3d3225]" },
    brown: { bg: "bg-gradient-to-br from-[#e8dcc8] to-[#d5c4a8]", spine: "bg-[#a08060]", text: "text-[#2d2418]" },
    blue: { bg: "bg-gradient-to-br from-[#dce8f0] to-[#c8d8e8]", spine: "bg-[#7090b0]", text: "text-[#1e3348]" },
    green: { bg: "bg-gradient-to-br from-[#e0ece0] to-[#c8dcc8]", spine: "bg-[#6a8a6a]", text: "text-[#1e2e1e]" },
    gray: { bg: "bg-gradient-to-br from-[#ececea] to-[#dcdcd8]", spine: "bg-[#989894]", text: "text-[#2a2a28]" },
    red: { bg: "bg-gradient-to-br from-[#f0e0dc] to-[#e0c8c4]", spine: "bg-[#a05050]", text: "text-[#3d1818]" },
  }
  const colors = colorConfig[coverColor]
  const displayTitle = title.length > 3 ? title.slice(0, 3) : title
  
  const rankColors = rank <= 3 
    ? "text-primary font-bold" 
    : "text-muted-foreground"

  return (
    <Link href={`/classics/${id}`} className={cn("group flex items-center gap-1.5 sm:gap-2 touch-manipulation", className)}>
      {/* 排名数字 */}
      <span className={cn("w-4 sm:w-5 text-xs sm:text-sm tabular-nums text-center", rankColors)}>
        {rank}
      </span>
      
      {/* 小封面 */}
      <div className={cn(
        "w-8 h-11 sm:w-10 sm:h-[52px]",
        "rounded-[1px] overflow-hidden relative flex-shrink-0",
        "shadow-sm", colors.bg, "border border-[#d0c0a0]/40"
      )}>
        <div className={cn("absolute left-0 top-0 bottom-0 w-1 sm:w-1.5", colors.spine)} />
        <div className="absolute inset-0 left-1 sm:left-1.5 flex items-center justify-center">
          <div className="writing-vertical-rl">
            {displayTitle.split("").map((char, i) => (
              <span key={i} className={cn("text-[7px] sm:text-[8px] font-serif font-bold", colors.text)}>
                {char}
              </span>
            ))}
          </div>
        </div>
      </div>
      
      {/* 信息 */}
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm font-medium truncate group-hover:text-primary transition-colors">{title}</p>
        <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">{description || `${dynasty}·${author}`}</p>
      </div>
    </Link>
  )
}

/**
 * 继续阅读卡片 - 首页顶部横滑使用，带进度
 */
export function BookCardContinue({
  id,
  title,
  author,
  dynasty,
  progress = 0,
  coverColor = "cream",
  className,
}: BookCardProps) {
  const colorConfig = {
    cream: { bg: "bg-gradient-to-br from-[#f7f3e8] to-[#ebe3d0]", spine: "bg-[#d4c4a8]", text: "text-[#3d3225]" },
    brown: { bg: "bg-gradient-to-br from-[#e8dcc8] to-[#d5c4a8]", spine: "bg-[#a08060]", text: "text-[#2d2418]" },
    blue: { bg: "bg-gradient-to-br from-[#dce8f0] to-[#c8d8e8]", spine: "bg-[#7090b0]", text: "text-[#1e3348]" },
    green: { bg: "bg-gradient-to-br from-[#e0ece0] to-[#c8dcc8]", spine: "bg-[#6a8a6a]", text: "text-[#1e2e1e]" },
    gray: { bg: "bg-gradient-to-br from-[#ececea] to-[#dcdcd8]", spine: "bg-[#989894]", text: "text-[#2a2a28]" },
    red: { bg: "bg-gradient-to-br from-[#f0e0dc] to-[#e0c8c4]", spine: "bg-[#a05050]", text: "text-[#3d1818]" },
  }
  const colors = colorConfig[coverColor]
  const displayTitle = title.length > 4 ? title.slice(0, 4) : title

  return (
    <Link href={`/reader/${id}`} className={cn("group block touch-manipulation", className)}>
      <div className={cn(
        "w-[100px] sm:w-[120px] md:w-[140px]",
        "bg-card rounded-xl sm:rounded-2xl overflow-hidden",
        "border border-border/40 hover:border-border/70",
        "shadow-sm hover:shadow-md",
        "transition-all duration-200",
        "active:scale-[0.98] sm:active:scale-100"
      )}>
        {/* 封面区 */}
        <div className="p-2 sm:p-3 pb-0 flex justify-center">
          <div className={cn(
            "w-14 h-[75px] sm:w-16 sm:h-[85px]",
            "rounded-[2px] overflow-hidden relative",
            "shadow-[2px_3px_8px_rgba(100,80,50,0.2)]",
            colors.bg, "border border-[#d0c0a0]/50"
          )}>
            {/* 纸张纹理 */}
            <div 
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.05' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              }}
            />
            
            <div className={cn("absolute left-0 top-0 bottom-0 w-2 sm:w-2.5", colors.spine)}>
              <div className="absolute inset-y-2 left-1/2 -translate-x-1/2 flex flex-col justify-between">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-0.5 h-0.5 rounded-full bg-[#3d3020]/25" />
                ))}
              </div>
            </div>
            
            <div className="absolute inset-0 left-2 sm:left-2.5 flex items-center justify-center">
              <div className="writing-vertical-rl">
                {displayTitle.split("").map((char, i) => (
                  <span key={i} className={cn("text-[10px] sm:text-xs font-serif font-bold", colors.text)}>
                    {char}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* 信息区 */}
        <div className="p-2 sm:p-3 pt-2 space-y-1">
          <p className="text-xs sm:text-sm font-medium truncate text-center">{title}</p>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate text-center">{dynasty}·{author}</p>
          
          {/* 进度条 */}
          <div className="pt-1">
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[9px] sm:text-[10px] text-primary text-center mt-1">
              已读 {progress}%
            </p>
          </div>
        </div>
      </div>
    </Link>
  )
}
