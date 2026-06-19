"use client"

import { cn } from "@/lib/utils"

// ============================================
// 热卜国学 - 品牌装饰元素库
// 基于太极、八卦、祥云等传统纹样设计
// ============================================

// 太极图 SVG - 可用于Logo、加载、装饰
export function TaijiSymbol({ 
  className, 
  primaryColor = "#C41E3A",
  secondaryColor = "#FAF8F5",
  animate = false 
}: { 
  className?: string
  primaryColor?: string
  secondaryColor?: string
  animate?: boolean
}) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      className={cn(animate && "taiji-slow-rotate", className)}
    >
      <circle cx="50" cy="50" r="48" fill={primaryColor} />
      <path 
        d="M50 2 A24 24 0 0 1 50 50 A24 24 0 0 0 50 98 A48 48 0 0 1 50 2" 
        fill={secondaryColor} 
      />
      <circle cx="50" cy="26" r="8" fill={primaryColor} />
      <circle cx="50" cy="74" r="8" fill={secondaryColor} />
    </svg>
  )
}

// 八卦纹 - 用于背景装饰
export function BaguaPattern({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={cn("text-[#E8E0D5]", className)} fill="currentColor" opacity="0.3">
      {/* 乾 ☰ */}
      <g transform="translate(85, 10)">
        <rect x="0" y="0" width="30" height="4" />
        <rect x="0" y="8" width="30" height="4" />
        <rect x="0" y="16" width="30" height="4" />
      </g>
      {/* 坤 ☷ */}
      <g transform="translate(85, 176)">
        <rect x="0" y="0" width="12" height="4" />
        <rect x="18" y="0" width="12" height="4" />
        <rect x="0" y="8" width="12" height="4" />
        <rect x="18" y="8" width="12" height="4" />
        <rect x="0" y="16" width="12" height="4" />
        <rect x="18" y="16" width="12" height="4" />
      </g>
      {/* 离 ☲ */}
      <g transform="translate(166, 85)">
        <rect x="0" y="0" width="30" height="4" />
        <rect x="0" y="8" width="12" height="4" />
        <rect x="18" y="8" width="12" height="4" />
        <rect x="0" y="16" width="30" height="4" />
      </g>
      {/* 坎 ☵ */}
      <g transform="translate(4, 85)">
        <rect x="0" y="0" width="12" height="4" />
        <rect x="18" y="0" width="12" height="4" />
        <rect x="0" y="8" width="30" height="4" />
        <rect x="0" y="16" width="12" height="4" />
        <rect x="18" y="16" width="12" height="4" />
      </g>
    </svg>
  )
}

// 祥云纹 - 用于分割线、背景
export function CloudPattern({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 30" className={cn("text-[#E8E0D5]", className)} fill="currentColor">
      <path d="M10 25 Q5 20 10 15 Q15 10 25 12 Q30 5 40 8 Q50 3 60 8 Q70 5 80 12 Q90 10 95 15 Q100 20 95 25 Q85 30 75 25 Q65 28 55 25 Q45 30 35 25 Q25 28 15 25 Q10 27 10 25" opacity="0.4" />
    </svg>
  )
}

// 万字纹边框 - 用于卡片装饰
export function WanziCorner({ className, position = "top-left" }: { className?: string, position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" }) {
  const rotations = {
    "top-left": "rotate(0)",
    "top-right": "rotate(90)",
    "bottom-right": "rotate(180)",
    "bottom-left": "rotate(270)"
  }
  return (
    <svg viewBox="0 0 24 24" className={cn("text-[#C9A96E]/20", className)} fill="currentColor" style={{ transform: rotations[position] }}>
      <path d="M0 0 H8 V2 H2 V8 H0 Z M8 0 V6 H6 V2 H2 V0 H8 Z" />
    </svg>
  )
}

// 回形纹分割线
export function MeanderDivider({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-2 py-3", className)}>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#E8E0D5] to-transparent" />
      <svg viewBox="0 0 40 10" className="w-10 h-2.5 text-[#C9A96E]/40" fill="currentColor">
        <path d="M0 5 H8 V0 H12 V5 H20 V0 H24 V5 H32 V0 H36 V5 H40 V6 H36 V10 H32 V6 H24 V10 H20 V6 H12 V10 H8 V6 H0 Z" />
      </svg>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#E8E0D5] to-transparent" />
    </div>
  )
}

// 铜钱纹 - 用于价格、积分装饰
export function CoinPattern({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("text-[#C9A96E]", className)} fill="currentColor">
      <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="9" y="9" width="6" height="6" />
    </svg>
  )
}

// 区块标题装饰
export function SectionTitleDecoration({ 
  children, 
  className,
  icon
}: { 
  children: React.ReactNode
  className?: string
  icon?: React.ReactNode
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {icon && <div className="flex-shrink-0">{icon}</div>}
      <h2 className="text-[17px] font-bold text-[#2C2C2C] font-serif">{children}</h2>
      <div className="flex-1 h-px bg-gradient-to-r from-[#E8E0D5] to-transparent ml-2" />
    </div>
  )
}

// 页面背景装饰 - 角落纹样
export function PageBackgroundDecor({ className }: { className?: string }) {
  return (
    <div className={cn("fixed inset-0 pointer-events-none overflow-hidden", className)}>
      {/* 左上角八卦纹 */}
      <div className="absolute -top-20 -left-20 w-40 h-40 opacity-[0.03]">
        <BaguaPattern className="w-full h-full" />
      </div>
      {/* 右下角太极图 */}
      <div className="absolute -bottom-16 -right-16 w-32 h-32 opacity-[0.02]">
        <TaijiSymbol className="w-full h-full" primaryColor="#C41E3A" />
      </div>
    </div>
  )
}

// 卡片角落装饰
export function CardCornerDecor({ className }: { className?: string }) {
  return (
    <>
      <div className={cn("absolute top-0 left-0 w-6 h-6 opacity-30", className)}>
        <WanziCorner position="top-left" className="w-full h-full" />
      </div>
      <div className={cn("absolute top-0 right-0 w-6 h-6 opacity-30", className)}>
        <WanziCorner position="top-right" className="w-full h-full" />
      </div>
      <div className={cn("absolute bottom-0 left-0 w-6 h-6 opacity-30", className)}>
        <WanziCorner position="bottom-left" className="w-full h-full" />
      </div>
      <div className={cn("absolute bottom-0 right-0 w-6 h-6 opacity-30", className)}>
        <WanziCorner position="bottom-right" className="w-full h-full" />
      </div>
    </>
  )
}

// 加载中太极旋转
export function TaijiLoader({ className, size = "md" }: { className?: string, size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-16 h-16"
  }
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <TaijiSymbol className={cn(sizes[size], "taiji-rotate-fast")} animate />
    </div>
  )
}
