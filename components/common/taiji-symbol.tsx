/**
 * 太极阴阳符号（标准几何图形，可缓慢旋转）
 * 用于注册欢迎仪式、排盘推演等需要文化仪式感的场景。
 */
import { cn } from "@/lib/utils"

interface TaijiSymbolProps {
  size?: number
  /** 是否缓慢旋转 */
  spinning?: boolean
  className?: string
}

export function TaijiSymbol({ size = 96, spinning = true, className }: TaijiSymbolProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={cn(spinning && "animate-[spin_8s_linear_infinite]", className)}
      role="img"
      aria-label="太极图"
    >
      {/* 外圈 */}
      <circle cx="50" cy="50" r="48" fill="#f7f0e3" stroke="#c9a96e" strokeWidth="2" />
      {/* 阴阳主体：左白右红（故宫红代替纯黑，契合国风） */}
      <path d="M50 2 a48 48 0 0 1 0 96 a24 24 0 0 1 0 -48 a24 24 0 0 0 0 -48" fill="#c41e3a" />
      <path d="M50 2 a48 48 0 0 0 0 96 a24 24 0 0 0 0 -48 a24 24 0 0 1 0 -48" fill="#3a3226" />
      {/* 双鱼眼 */}
      <circle cx="50" cy="26" r="7" fill="#f7f0e3" />
      <circle cx="50" cy="74" r="7" fill="#c41e3a" />
    </svg>
  )
}
